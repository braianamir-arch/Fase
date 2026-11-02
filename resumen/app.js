import {
  CATEGORIAS, CATS_DINERO, TIPOS_DINERO, normalizar, nuevoId, hoyISO, ordenarPorPrioridad, delDia, delMes,
  buscar, totales, proximosVencimientos, proximoCobro, importar, fusionar, combinar, enPesos,
  estadoPago, resuelta, registrarPago, deshacerPago,
} from "./core.js";
import * as gmail from "./conectores/gmail.js";
import * as googleAuth from "./conectores/google.js";
import * as mercadopago from "./conectores/mercadopago.js";
import * as cotizaciones from "./conectores/cotizaciones.js";
import * as instagram from "./conectores/instagram.js";
import * as youtube from "./conectores/youtube.js";
import * as ia from "./conectores/ia.js";
import { PROVEEDORES, entradasServicios, validarNumero, proveedorDe } from "./conectores/servicios.js";
import { paginaBaja } from "./conectores/bajas.js";
import { GRUPOS, NOMBRE_METODO } from "./conectores/catalogo.js";
import { crearLlave, cifrar, abrir, abrirConLlave, esBoveda, validarPin, esperaPorIntentos } from "./seguridad.js";
import * as huella from "./huella.js";
import * as perfiles from "./perfiles.js";
import { finanzasVacias, normalizarFinanzas } from "./finanzas.js";
import { VISTAS_FINANZAS, crearVistasFinanzas } from "./vistasFinanzas.js";
import { lineaTiempo, miniBarras, medidor } from "./graficos.js";
import { icono } from "./iconos.js";

// Versiones viejas guardaban en texto plano: se migran a la bóveda y se borran.
const CLAVES_VIEJAS = ["todo-en-uno:v1", "todo-en-uno:config"];
const OPCIONES_BLOQUEO = [0, 5, 15, 30, 60];
const MAX_HISTORIAL = 90;
// En el APK de Android existe el puente nativo window.Android.
const EN_APK = typeof window.Android?.guardarArchivo === "function";
const SIN_MOVIMIENTO = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s) => document.querySelector(s);

const configInicial = () => ({
  nombre: "", googleClientId: "", igToken: "", igRenovadoEn: 0, mpToken: "", claudeKey: "",
  casaDolar: "blue", cotizacion: null, conexiones: {}, numerosServicios: {},
  historial: [], mpMovimientos: [], ia: null, bloqueoMin: 0,
});

const estado = {
  perfil: null, // { id, nombre, tipo } del perfil abierto
  llave: null, // clave AES en memoria mientras la app está desbloqueada
  finanzas: finanzasVacias(), // datos del perfil "Solo finanzas"
  mesF: null, diaF: null, filtroGastos: null,
  entradas: [],
  config: configInicial(),
  vista: "inicio",
  vistaPintada: null,
  categoria: null,
  texto: "",
  dia: hoyISO(),
  mes: hoyISO().slice(0, 7),
  abiertos: new Set(), // grupos y apps desplegados en Conexiones
  tarjetaFrente: 0, // billetera al frente en la pila de tarjetas
};

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave));
  } catch {
    return null;
  }
}

let cola = Promise.resolve();
function guardar() {
  if (!estado.llave) return cola;
  const llave = estado.llave;
  const datos = { entradas: estado.entradas, config: estado.config, finanzas: estado.finanzas };
  const clave = perfiles.claveBoveda(estado.perfil.id);
  cola = cola
    .then(async () => localStorage.setItem(clave, JSON.stringify(await cifrar(llave, datos))))
    .catch((err) => alert(`No se pudo guardar: ${err.message}. Exportá una copia.`));
  return cola;
}

// ---- Utilidades de interfaz ----
// Construye un elemento con texto seguro (nunca innerHTML con datos del usuario).
function el(tag, props = {}, ...hijos) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const h of hijos) if (h != null && h !== false) n.append(h);
  return n;
}

const fmt = (monto, moneda = "ARS") => {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda, minimumFractionDigits: 0, maximumFractionDigits: Math.abs(monto) >= 1000 ? 0 : 2 }).format(monto);
  } catch {
    return `${moneda} ${Number(monto).toLocaleString("es-AR")}`;
  }
};
const fmtMonedas = (obj) => Object.entries(obj).map(([m, v]) => fmt(v, m)).join(" · ") || "—";
const fmtFecha = (iso) => new Date(`${iso}T12:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
const fmtCorta = (iso) => new Date(`${iso}T12:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
const fmtHace = (iso) => (iso ? new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "nunca");
const cat = (id) => CATEGORIAS.find((c) => c.id === id);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const enDiasTexto = (n) => (n === 0 ? "hoy" : n === 1 ? "mañana" : n === -1 ? "ayer" : n < 0 ? `hace ${-n} días` : `en ${n} días`);

function boton(texto, fn, clase = "", ico = null) {
  const b = el("button", { type: "button", className: clase }, ico ? icono(ico) : null, texto);
  b.onclick = fn;
  return b;
}

let temporizadorToast = null;
function toast(texto) {
  const t = $("#toast");
  t.textContent = texto;
  t.hidden = false;
  t.classList.remove("visible");
  void t.offsetWidth; // reinicia la animación de entrada
  t.classList.add("visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => (t.hidden = true), 2800);
}

function mostrarEstado(texto, error = false) {
  const p = $("#estado-sync");
  p.hidden = !texto;
  p.textContent = texto || "";
  p.classList.toggle("error", error);
}

// ---- Perfiles, PIN, huella, sesión y bloqueo ----
const dialogoPin = $("#dialogo-pin");
const formPin = $("#form-pin");
$("#pin-logo").append(icono("candado"));
$("#pin-huella").prepend(icono("huella"));
// La sesión del perfil abierto queda recordada en el teléfono: solo se pide la contraseña
// al cambiar de perfil o al bloquear a mano.
const sesion = globalThis.indexedDB ? perfiles.sesionIndexedDB() : perfiles.sesionEnMemoria();
const CLAVE_ULTIMO = "todo-en-uno:ultimo-perfil";
const huellaDe = (id) => ({ clave: perfiles.claveHuella(id) });
const conHuellaDe = (id) => huella.disponible() && huella.activada(localStorage, perfiles.claveHuella(id));

// Muestra el diálogo de contraseña. `confirmar` pide repetirla; `cancelable` permite cerrarlo;
// `verificar(pin)` puede tirar error para pedirla de nuevo; `perfilHuella` ofrece la huella de
// ese perfil; `elegirPerfil` muestra los otros perfiles para cambiar (resuelve { cambiarA }).
function pedirPin({ titulo, texto = "", confirmar = false, cancelable = false, verificar, perfilHuella = null, elegirPerfil = null }) {
  return new Promise((resolver) => {
    $("#pin-titulo").textContent = titulo;
    $("#pin-texto").textContent = texto;
    $("#pin-error").textContent = "";
    formPin.reset();
    formPin.elements.pin2.hidden = !confirmar;
    formPin.elements.pin2.required = confirmar;
    $("#pin-cancelar").hidden = !cancelable;
    $("#pin-huella").hidden = !perfilHuella;
    const otros = elegirPerfil?.lista.filter((p) => p.id !== elegirPerfil.actual) || [];
    $("#pin-perfiles").hidden = !otros.length;
    $("#pin-perfiles").replaceChildren(...(otros.length ? [el("span", { textContent: "¿Sos otra persona?" }), ...otros.map((p) => {
      const b = el("button", { type: "button", className: "chip-perfil" }, el("span", { className: "avatar mini", textContent: p.nombre[0].toUpperCase() }), p.nombre);
      b.onclick = () => { dialogoPin.close(); resolver({ cambiarA: p.id }); };
      return b;
    })] : []));
    let fallidos = 0, bloqueadoHasta = 0;
    const error = (t) => { $("#pin-error").textContent = t; formPin.elements.pin.select(); };
    const probar = async (pin) => {
      if (verificar) {
        $("#pin-error").textContent = "Verificando…";
        try {
          const r = await verificar(pin);
          dialogoPin.close();
          return resolver(r);
        } catch (err) {
          fallidos++;
          bloqueadoHasta = Date.now() + esperaPorIntentos(fallidos);
          return error(err.message.replace("PIN incorrecto", "Contraseña incorrecta"));
        }
      }
      dialogoPin.close();
      resolver(pin);
    };
    formPin.onsubmit = async (ev) => {
      ev.preventDefault();
      const pin = formPin.elements.pin.value;
      if (Date.now() < bloqueadoHasta) return error(`Esperá ${Math.ceil((bloqueadoHasta - Date.now()) / 1000)} s`);
      if (confirmar) {
        const problema = validarPin(pin);
        if (problema) return error(problema.replace("El PIN", "La contraseña").replace("un PIN", "una contraseña"));
        if (pin !== formPin.elements.pin2.value) return error("Las contraseñas no coinciden");
      }
      probar(pin);
    };
    const usarHuella = async () => {
      $("#pin-error").textContent = "Apoyá el dedo…";
      try {
        probar(await huella.recuperarPin(huellaDe(perfilHuella)));
      } catch (err) {
        $("#pin-error").textContent = err.name === "NotAllowedError" ? "" : err.message;
      }
    };
    $("#pin-huella").onclick = usarHuella;
    $("#pin-cancelar").onclick = () => { dialogoPin.close(); resolver(null); };
    dialogoPin.oncancel = (ev) => { ev.preventDefault(); if (cancelable) { dialogoPin.close(); resolver(null); } };
    dialogoPin.showModal();
    if (perfilHuella) usarHuella();
  });
}

const abrirPerfil = (p) => (pin) => abrir(pin, leerLocal(perfiles.claveBoveda(p.id)));

// Colores del perfil (tema y barra de estado). Antes de entrar se usan los del último perfil.
function aplicarTema(tipo) {
  document.body.classList.toggle("tema-aura", tipo === "finanzas");
  document.querySelector('meta[name="theme-color"]').content = tipo === "finanzas" ? "#FFE3D4" : "#E7E5E0";
}

async function desbloquear() {
  document.body.classList.add("bloqueada");
  const lista = perfiles.listar();
  aplicarTema(lista.find((p) => p.id === localStorage.getItem(CLAVE_ULTIMO))?.tipo);
  // 1) Sesión recordada: entra directo, sin contraseña.
  const s = await sesion.leer();
  const recordado = s && lista.find((p) => p.id === s.perfilId);
  if (recordado) {
    try {
      const r = await abrirConLlave(s, leerLocal(perfiles.claveBoveda(recordado.id)));
      return entrar(recordado, r.llave, r.datos);
    } catch {
      await sesion.borrar();
    }
  }
  // 2) Primera vez: se crea el perfil principal (y se migran los datos viejos sin cifrar).
  if (!lista.length) {
    // Quien venía usando la app sin perfiles sigue con "Todo en uno"; en un teléfono nuevo se elige.
    const migrando = Boolean(leerLocal(CLAVES_VIEJAS[0]) || leerLocal(CLAVES_VIEJAS[1]));
    let inicial = { nombre: "Principal", tipo: "completo" };
    while (!migrando) {
      const d = await pedirDatos({
        titulo: "¡Bienvenida/o!", texto: "Creá tu perfil. Después podés sumar otros, cada uno con su contraseña.",
        campos: [
          { nombre: "nombre", etiqueta: "Tu nombre", requerido: true, placeholder: "Ej: Sofi" },
          { nombre: "tipo", etiqueta: "¿Qué querés usar?", tipo: "select", opciones: [["completo", "Todo en uno (mails, servicios, cuentas, redes…)"], ["finanzas", "Solo finanzas (sueldo, gastos, tarjetas)"]], valor: "completo" },
        ],
      });
      if (d) { inicial = { nombre: d.nombre, tipo: d.tipo }; break; }
    }
    const pin = await pedirPin({
      titulo: "Creá tu contraseña",
      texto: "Cifra todos tus datos en este teléfono. Si la olvidás no hay forma de recuperarlos (solo con una copia exportada).",
      confirmar: true,
    });
    const perfil = perfiles.agregar(inicial);
    return entrar(perfil, await crearLlave(pin), { entradas: leerLocal(CLAVES_VIEJAS[0]) || [], config: { nombre: inicial.nombre === "Principal" ? "" : inicial.nombre, ...leerLocal(CLAVES_VIEJAS[1]) }, finanzas: finanzasVacias() });
  }
  // 3) Contraseña del último perfil usado, con opción de elegir otro.
  let objetivo = lista.find((p) => p.id === localStorage.getItem(CLAVE_ULTIMO)) || lista[0];
  for (;;) {
    const r = await pedirPin({
      titulo: lista.length > 1 ? `Hola, ${objetivo.nombre}` : "Todo en uno",
      texto: conHuellaDe(objetivo.id) ? "Usá tu huella o ingresá tu contraseña" : "Ingresá tu contraseña",
      verificar: abrirPerfil(objetivo), perfilHuella: conHuellaDe(objetivo.id) ? objetivo.id : null,
      elegirPerfil: { lista, actual: objetivo.id },
    });
    if (r.cambiarA) { objetivo = lista.find((p) => p.id === r.cambiarA); continue; }
    return entrar(objetivo, r.llave, r.datos);
  }
}

// Carga los datos del perfil y deja la sesión recordada en este teléfono.
async function entrar(perfil, llave, datos) {
  estado.perfil = perfil;
  estado.llave = llave;
  localStorage.setItem(CLAVE_ULTIMO, perfil.id);
  // Los extractos bancarios ya no existen: se descartan sus entradas.
  estado.entradas = (datos.entradas || []).filter((e) => !String(e.origen || "").startsWith("extracto:")).map(normalizar);
  estado.config = { ...configInicial(), ...datos.config };
  estado.finanzas = normalizarFinanzas(datos.finanzas || finanzasVacias());
  for (const k of Object.keys(estado.config.conexiones)) if (k.startsWith("extracto:")) delete estado.config.conexiones[k];
  if (esCompleto()) {
    actualizarServicios();
    registrarHistorial();
  }
  await guardar();
  await sesion.guardar(perfil.id, llave);
  CLAVES_VIEJAS.forEach((k) => localStorage.removeItem(k));
  document.body.classList.remove("bloqueada");
  // La barra de estado del teléfono (hora, batería) toma el color de arriba de la app.
  aplicarTema(perfil.tipo);
  estado.vista = "inicio";
  estado.vistaPintada = null;
  estado.categoria = null;
  armarRiel();
  render();
  reiniciarInactividad();
  if (!esCompleto()) {
    // Cotizaciones para pasar a pesos lo cargado en dólares u otras monedas.
    if (!datos.config?.casaDolar) estado.config.casaDolar = "tarjeta";
    sincronizarCotizaciones({ silencioso: true });
    return;
  }
  // Google primero: el login necesita el gesto de haber desbloqueado recién.
  (async () => {
    if (estado.config.googleClientId && !EN_APK) await sincronizarGoogle({ alAbrir: true });
    if (!estado.llave || !esCompleto()) return;
    await sincronizarCotizaciones({ silencioso: true });
    if (estado.llave && esCompleto() && estado.config.mpToken) await sincronizarMP();
    if (estado.llave && esCompleto() && estado.config.igToken) await sincronizarInstagram();
    if (estado.llave && esCompleto()) await resumirIA();
  })();
}

function cerrarEstado() {
  estado.llave = null;
  estado.entradas = [];
  estado.config = configInicial();
  estado.finanzas = finanzasVacias();
  googleAuth.cerrarSesion();
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  $("#vista").replaceChildren();
  mostrarEstado("");
}

// Bloquear a mano olvida la sesión: la próxima vez pide la contraseña.
async function bloquear() {
  if (!estado.llave) return;
  await sesion.borrar();
  cerrarEstado();
  desbloquear();
}

// Cambiar de perfil: pide la contraseña del otro antes de soltar el actual.
async function cambiarDePerfil(destino) {
  const r = await pedirPin({
    titulo: `Entrar como ${destino.nombre}`, texto: "Ingresá su contraseña", cancelable: true,
    verificar: abrirPerfil(destino), perfilHuella: conHuellaDe(destino.id) ? destino.id : null,
  });
  if (!r) return;
  await guardar();
  cerrarEstado();
  await entrar(destino, r.llave, r.datos);
  toast(`Hola, ${destino.nombre}`);
}

async function crearPerfil() {
  const d = await pedirDatos({
    titulo: "Nuevo perfil",
    texto: "Cada perfil tiene su propia contraseña: nadie puede ver los datos del otro.",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true, placeholder: "Ej: Sofi" },
      { nombre: "tipo", etiqueta: "Tipo", tipo: "select", opciones: Object.entries(perfiles.TIPOS_PERFIL), valor: "finanzas" },
    ],
  });
  if (!d) return;
  let perfil;
  try {
    perfil = perfiles.agregar({ nombre: d.nombre, tipo: d.tipo });
  } catch (err) {
    return toast(err.message);
  }
  const pin = await pedirPin({ titulo: `Contraseña de ${perfil.nombre}`, texto: "Que la elija esa persona: es la única forma de entrar a su perfil.", confirmar: true, cancelable: true });
  if (!pin) { perfiles.eliminar(perfil.id); return; }
  const llave = await crearLlave(pin);
  const datos = { entradas: [], config: { nombre: perfil.nombre }, finanzas: finanzasVacias() };
  localStorage.setItem(perfiles.claveBoveda(perfil.id), JSON.stringify(await cifrar(llave, datos)));
  await guardar();
  cerrarEstado();
  await entrar(perfil, llave, datos);
  toast(`Perfil ${perfil.nombre} creado`);
}

// Cierra un diálogo y recién cuando terminó de cerrarse sigue con lo próximo.
function cerrarYLuego(dialogo, siguiente) {
  if (siguiente) dialogo.addEventListener("close", () => siguiente(), { once: true });
  dialogo.close();
}

async function elegirPerfil() {
  const lista = perfiles.listar();
  const hoja = $("#hoja");
  const filas = lista.map((p) => {
    const actual = p.id === estado.perfil.id;
    const b = el("button", { type: "button", className: `fila-perfil${actual ? " actual" : ""}` },
      el("span", { className: "avatar", textContent: p.nombre[0].toUpperCase() }),
      el("span", { className: "fila-perfil-txt" }, el("strong", { textContent: p.nombre }), el("span", { textContent: perfiles.TIPOS_PERFIL[p.tipo] })),
      actual ? el("span", { className: "pildora ok", textContent: "Abierto" }) : icono("candado"));
    b.onclick = () => cerrarYLuego(hoja, actual ? null : () => cambiarDePerfil(p));
    return b;
  });
  $("#hoja-titulo").textContent = "Perfiles";
  $("#hoja-texto").textContent = "Cada perfil tiene su contraseña. Para entrar a otro se la pide.";
  $("#hoja-texto").hidden = false;
  $("#hoja-campos").replaceChildren(...filas,
    el("div", { className: "botones" },
      boton("Agregar perfil", () => cerrarYLuego(hoja, crearPerfil), "sec", "persona"),
      boton("Bloquear", () => cerrarYLuego(hoja, bloquear), "sec", "candado")));
  $("#hoja-pie").hidden = true;
  hoja.onclose = () => ($("#hoja-pie").hidden = false);
  hoja.showModal();
}

// Bloqueo automático opcional (0 = nunca: la sesión queda abierta hasta bloquear a mano).
const minutosBloqueo = () => (OPCIONES_BLOQUEO.includes(estado.config.bloqueoMin) ? estado.config.bloqueoMin : 0);
let temporizador = null;
function reiniciarInactividad() {
  clearTimeout(temporizador);
  if (estado.llave && minutosBloqueo()) temporizador = setTimeout(bloquear, minutosBloqueo() * 60000);
}
["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, reiniciarInactividad, { passive: true }));
let ocultaDesde = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ocultaDesde = Date.now();
  else if (minutosBloqueo() && ocultaDesde && Date.now() - ocultaDesde > minutosBloqueo() * 60000) bloquear();
});

async function cambiarPin() {
  const ok = await pedirPin({ titulo: "Cambiar contraseña", texto: "Ingresá la contraseña actual", cancelable: true, verificar: abrirPerfil(estado.perfil) });
  if (!ok) return;
  const nuevo = await pedirPin({ titulo: "Nueva contraseña", confirmar: true, cancelable: true });
  if (!nuevo) return;
  estado.llave = await crearLlave(nuevo);
  await guardar();
  await sesion.guardar(estado.perfil.id, estado.llave);
  // La huella guardaba la contraseña vieja: hay que volver a activarla.
  if (huella.activada(localStorage, perfiles.claveHuella(estado.perfil.id))) {
    huella.desactivar(localStorage, perfiles.claveHuella(estado.perfil.id));
    toast("Contraseña cambiada. Volvé a activar la huella.");
  } else toast("Contraseña cambiada");
  render();
}

async function activarHuella() {
  const pin = await pedirPin({ titulo: "Activar huella", texto: "Confirmá tu contraseña para guardarla protegida con tu huella", cancelable: true,
    verificar: async (p) => { await abrirPerfil(estado.perfil)(p); return p; } });
  if (!pin) return;
  try {
    await huella.activar(pin, { ...huellaDe(estado.perfil.id), nombre: `Todo en uno · ${estado.perfil.nombre}` });
    toast("Listo: para entrar a este perfil podés usar la huella");
  } catch (err) {
    huella.desactivar(localStorage, perfiles.claveHuella(estado.perfil.id));
    toast(err.name === "NotAllowedError" ? "Cancelado" : err.message);
  }
  render();
}

// Borra el perfil abierto y todos sus datos de este teléfono.
async function borrarPerfil() {
  const nombre = estado.perfil.nombre;
  if (!confirm(`¿Borrar el perfil ${nombre} y TODOS sus datos de este teléfono? No se puede deshacer.`)) return;
  if (!confirm("Última confirmación: se borran sus datos, contraseña y huella.")) return;
  const id = estado.perfil.id;
  estado.llave = null; // evita que un guardado pendiente vuelva a escribir la bóveda
  await sesion.borrar();
  perfiles.eliminar(id);
  CLAVES_VIEJAS.forEach((k) => localStorage.removeItem(k));
  if (!perfiles.listar().length) localStorage.removeItem(CLAVE_ULTIMO);
  location.reload();
}

// ---- Datos derivados ----
function dinero() {
  const t = totales(estado.entradas);
  const tasas = estado.config.cotizacion?.tasas || {};
  const disp = enPesos(t.disponible, tasas);
  const apartado = enPesos(t.apartado, tasas);
  return { t, disponible: disp.total, apartado: apartado.total, sinTasa: [...new Set([...disp.sinTasa, ...apartado.sinTasa])] };
}

// Un punto por día con todo tu dinero en pesos (disponible + apartado), para el gráfico.
function registrarHistorial() {
  const { disponible, apartado } = dinero();
  const total = disponible + apartado;
  const hoy = hoyISO();
  const h = (estado.config.historial || []).filter((p) => p.fecha !== hoy);
  if (total > 0 || h.length) h.push({ fecha: hoy, valor: total });
  estado.config.historial = h.slice(-MAX_HISTORIAL);
}

function actualizarServicios() {
  const nuevas = entradasServicios(estado.config.numerosServicios, estado.entradas, hoyISO());
  estado.entradas = fusionar(estado.entradas, nuevas, "servicio");
}

const pendientes = () => estado.entradas.filter((e) => !resuelta(e));
const esCompleto = () => estado.perfil?.tipo !== "finanzas";

// ---- Navegación ----
const VISTAS = [
  ["inicio", "Inicio", "inicio"],
  ["hoy", "Hoy", "hoy"],
  ["mes", "Mes", "mes"],
  ["todo", "Todo", "todo"],
  ["conexiones", "Conexiones", "conexiones"],
];
const vistasDelPerfil = () => (esCompleto() ? VISTAS : VISTAS_FINANZAS);

// El riel se arma al entrar a un perfil; al navegar solo se mueve el indicador (con transición).
function armarRiel() {
  const riel = $("#riel");
  const indicador = el("span", { className: "indicador" });
  const botones = vistasDelPerfil().map(([id, nombre, ico]) => {
    const b = el("button", { type: "button", title: nombre }, icono(ico), el("span", { className: "rotulo", textContent: nombre }));
    b.dataset.vista = id;
    b.setAttribute("aria-label", nombre);
    b.onclick = () => irA(id);
    return b;
  });
  const candado = el("button", { type: "button", title: "Bloquear", className: "candado" }, icono("candado"));
  candado.setAttribute("aria-label", "Bloquear");
  candado.onclick = bloquear;
  riel.replaceChildren(indicador, el("div", { className: "logo" }, icono("hoy")), ...botones, el("span", { className: "separador" }), candado);
}
addEventListener("resize", moverIndicador);

function moverIndicador() {
  const activo = $(`#riel button[data-vista="${estado.vista}"]`);
  const ind = $("#riel .indicador");
  if (!activo || !ind) return;
  ind.style.width = `${activo.offsetWidth}px`;
  ind.style.height = `${activo.offsetHeight}px`;
  ind.style.transform = `translate(${activo.offsetLeft}px, ${activo.offsetTop}px)`;
}

function irA(vista) {
  if (vista === estado.vista) return scrollTo({ top: 0, behavior: SIN_MOVIMIENTO.matches ? "auto" : "smooth" });
  const cambiar = () => {
    estado.vista = vista;
    estado.categoria = null;
    render();
    scrollTo(0, 0);
  };
  // Transición nativa entre pantallas cuando el navegador la soporta.
  if (document.startViewTransition && !SIN_MOVIMIENTO.matches) document.startViewTransition(cambiar);
  else cambiar();
}

function renderRiel() {
  document.querySelectorAll("#riel button[data-vista]").forEach((b) => {
    const activo = b.dataset.vista === estado.vista;
    b.classList.toggle("activa", activo);
    if (activo) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  requestAnimationFrame(moverIndicador);
}

function renderCabecera() {
  const nombre = (estado.config.nombre || (estado.perfil.nombre !== "Principal" ? estado.perfil.nombre : "")).trim();
  $("#saludo").textContent = `¡Hola${nombre ? `, ${nombre}` : ""}!`;
  const subs = {
    inicio: esCompleto() ? "Así viene tu día: lo importante primero" : "Así vienen tus finanzas este mes",
    hoy: `Resumen del ${fmtFecha(estado.dia)}`,
    mes: `Resumen de ${new Date(`${estado.mes}-15T12:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`,
    todo: "Todo, ordenado por prioridad",
    conexiones: "Tus cuentas, servicios y seguridad",
    gastos: "Fijos y variables, día por día",
    tarjetas: "Compras, cuotas y resúmenes",
    meses: "Lo que vas a pagar los próximos meses",
    ajustes: "Sueldo, perfil y seguridad",
  };
  $("#subtitulo").textContent = subs[estado.vista];
  $(".buscador").hidden = !esCompleto() || estado.vista === "conexiones" || estado.vista === "inicio";
  $("#btn-sync").hidden = !esCompleto();
  $("#btn-perfil").textContent = estado.perfil.nombre[0].toUpperCase();
  $("#btn-perfil").title = `Perfil: ${estado.perfil.nombre}`;
}

// Repinta la pantalla actual. Las tarjetas entran animadas solo al cambiar de pantalla;
// al actualizar datos se mantiene la posición y no se repite la animación.
function render() {
  if (!estado.llave) return;
  renderRiel();
  renderCabecera();
  const vista = esCompleto()
    ? { inicio: vistaInicio, hoy: vistaHoy, mes: vistaMes, todo: vistaTodo, conexiones: vistaConexiones }[estado.vista]
    : { ...vistasF, ajustes: () => vistasF.ajustes([grupoSeguridad()]) }[estado.vista];
  const cont = $("#vista");
  const nueva = estado.vistaPintada !== estado.vista;
  const alto = cont.offsetHeight;
  cont.style.minHeight = nueva ? "" : `${alto}px`; // evita saltos de scroll al repintar
  cont.replaceChildren(...vista().filter(Boolean)); // las vistas devuelven null para lo que no aplica
  cont.classList.toggle("entrando", nueva && !SIN_MOVIMIENTO.matches);
  if (nueva) cont.querySelectorAll(".tarjeta, .item, .titulo-seccion, .grupo").forEach((n, i) => n.style.setProperty("--i", Math.min(i, 12)));
  estado.vistaPintada = estado.vista;
  requestAnimationFrame(() => (cont.style.minHeight = ""));
}

// ---- Tarjetas del inicio ----
function kpi(etq, val, det, grafico, { destacada = false, ico = null } = {}) {
  return el("div", { className: `tarjeta kpi${destacada ? " destacada" : ""}` },
    el("div", { className: "txt" },
      el("div", { className: "etq", textContent: etq }),
      el("div", { className: "val", textContent: val }),
      det ? el("div", { className: "det", textContent: det }) : null),
    grafico,
    // Con gráfico, el ícono solo se ve en el celular (donde el gráfico chico se oculta).
    ico ? el("div", { className: `ico-kpi${grafico ? " solo-movil" : ""}` }, icono(ico)) : null);
}

function filaKpis() {
  const { t, disponible, apartado, sinTasa } = dinero();
  const cot = estado.config.cotizacion;
  const hist = estado.config.historial.slice(-7).map((p) => p.valor);
  const porPagar = estado.entradas.filter((e) => ["pendiente", "vencido", "parcial"].includes(estadoPago(e)?.estado) && e.origen !== "servicio");
  const vencidos = porPagar.filter((e) => estadoPago(e).estado === "vencido" || estadoPago(e).atrasado);
  const subs = estado.entradas.filter((e) => e.categoria === "suscripciones" && !e.cancelada);
  const urgentes = pendientes().filter((e) => e.prioridad === "alta" || estadoPago(e)?.estado === "vencido");
  return [
    kpi("Disponible", fmt(disponible),
      apartado > 0 ? `+ ${fmt(apartado)} ahorrado/invertido` : cot ? `dólar ${cot.casa} ${fmt(cot.tasas.USD)}${sinTasa.length ? ` · sin cotizar ${sinTasa.join(", ")}` : ""}` : "en pesos",
      hist.length > 1 ? miniBarras(hist) : null, { ico: "billetera" }),
    kpi("A pagar este mes", fmtMonedas(t.serviciosPendientes),
      vencidos.length ? `${plural(vencidos.length, "vencido", "vencidos")} · ${fmtMonedas(t.vencido)}` : plural(porPagar.length, "pendiente", "pendientes"),
      null, { ico: "rayo" }),
    kpi("Suscripciones / mes", fmtMonedas(t.suscripcionesMes), plural(subs.length, "activa", "activas"), null, { ico: "repetir" }),
    kpi("Para hacer hoy", String(urgentes.length), urgentes.length ? "urgente o vencido" : "todo al día", null, { destacada: true, ico: "campana" }),
  ];
}

function tarjetaResumenIA(clase = "ancho-2") {
  const cfg = estado.config;
  const cab = el("div", { className: "cab-tarjeta" },
    el("div", {}, el("h2", {}, el("span", { className: "chispa" }, icono("chispa")), "Resumen del día"),
      el("p", { className: "sub", textContent: cfg.ia ? `Actualizado ${fmtHace(cfg.ia.fecha)} · con Claude` : "Lo importante en pocas líneas" })));
  const t = el("section", { className: `tarjeta resumen-ia ${clase}` }, cab);
  if (!cfg.claudeKey) {
    t.append(el("p", { className: "vacio-ia", textContent: "Conectá Claude y la app te dice de qué se trata cada mail, factura y aviso, sin leer todo." }),
      boton("Configurar resúmenes", () => { estado.abiertos.add("ia"); irA("conexiones"); }));
  } else if (!cfg.ia) {
    t.append(el("p", { className: "vacio-ia", textContent: "Todavía no hay resumen." }), boton("Resumir ahora", () => resumirIA({ forzar: true }), "", "chispa"));
  } else {
    t.append(el("ul", {}, ...cfg.ia.resumen.map((r) => el("li", { textContent: r }))));
    const b = boton("", () => resumirIA({ forzar: true }), "redondo", "sync");
    b.title = "Volver a resumir";
    b.setAttribute("aria-label", "Volver a resumir");
    cab.append(b);
  }
  return t;
}

// Pila de tarjetas con tu plata: billeteras, efectivo y ahorros. Tocá para pasar a la siguiente.
const ESTILO_TARJETA = [
  [/mercado ?pago/i, "mp"], [/naranja/i, "naranja"], [/modo/i, "modo"], [/ual[aá]/i, "uala"],
  [/brubank/i, "brubank"], [/lemon|belo|binance|cripto|usdt|btc/i, "cripto"],
];
function claseTarjeta(e) {
  if (e.categoria === "efectivo") return "efectivo";
  if (e.categoria === "ahorros") return "ahorro";
  return ESTILO_TARJETA.find(([re]) => re.test(e.titulo))?.[1] || "generica";
}

function tarjetaBilleteras() {
  const plata = estado.entradas.filter((e) => CATS_DINERO.has(e.categoria) && e.monto != null).sort((a, b) => b.monto - a.monto);
  const { t } = dinero();
  const sec = el("section", { className: "tarjeta billeteras ancho-2" },
    el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Tu plata" }),
      el("p", { className: "sub", textContent: plata.length ? "Tocá la tarjeta para ver la siguiente" : "Cargá billeteras, efectivo o ahorros con +" }))));
  if (!plata.length) return sec;
  const frente = estado.tarjetaFrente % plata.length;
  const orden = [...plata.slice(frente), ...plata.slice(0, frente)].slice(0, 4);
  const pila = el("div", { className: "pila" }, ...orden.map((e, i) => el("div", {
    className: `tarjeta-plata ${claseTarjeta(e)}`, style: `--pos:${i}`,
  },
    el("div", { className: "tp-arriba" }, el("span", { className: "tp-nombre", textContent: e.titulo }), el("span", { className: "tp-chip" })),
    el("div", { className: "tp-monto", textContent: fmt(e.monto, e.moneda) }),
    el("div", { className: "tp-abajo" }, el("span", { textContent: TIPOS_DINERO[e.tipoDinero] || "" }), el("span", { textContent: "•••• " + String(e.id).slice(-4).toUpperCase() })))).reverse());
  pila.onclick = () => { estado.tarjetaFrente = frente + 1; render(); };
  pila.setAttribute("role", "button");
  pila.setAttribute("aria-label", "Ver la siguiente tarjeta");
  const desglose = el("ul", { className: "desglose" }, ...Object.entries(t.porTipo).map(([tipo, montos]) =>
    el("li", {}, el("span", { textContent: TIPOS_DINERO[tipo] }), el("strong", { textContent: fmtMonedas(montos) }))));
  sec.append(el("div", { className: "billeteras-cuerpo" }, pila, desglose));
  return sec;
}

function tarjetaBalance() {
  const puntos = estado.config.historial.slice(-30);
  const ult = puntos.at(-1)?.valor ?? 0, prev = puntos.at(-2)?.valor;
  const delta = prev ? ((ult - prev) / prev) * 100 : null;
  return el("section", { className: "tarjeta ancho-2" },
    el("div", { className: "cab-tarjeta" },
      el("div", {}, el("h2", { textContent: "Balance" }), el("p", { className: "sub", textContent: "Todo tu dinero en pesos, últimos 30 días" })),
      delta != null && Math.abs(delta) >= 0.05 ? el("span", { className: `pildora ${delta >= 0 ? "ok" : "mal"}`, textContent: `${delta >= 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")}%` }) : null),
    lineaTiempo(puntos, { formato: (v) => fmt(v) }));
}

function tarjetaMedidor() {
  const facturas = estado.entradas.filter((e) => e.categoria === "servicios" && e.origen !== "servicio" && estadoPago(e));
  const pagadas = facturas.filter((e) => estadoPago(e).estado === "pagado").length;
  const pct = facturas.length ? pagadas / facturas.length : 0;
  return el("section", { className: "tarjeta" },
    el("h2", { textContent: "Servicios del mes" }),
    el("p", { className: "sub", textContent: "Agua, luz, gas y demás" }),
    medidor(pct, { etiqueta: "pagados" }),
    el("p", { className: "pie-medidor", textContent: facturas.length ? `${pagadas} de ${facturas.length} pagados` : "Cuando lleguen tus facturas a Gmail aparecen acá" }));
}

function tarjetaMovimientos() {
  const movs = estado.config.mpMovimientos || [];
  return el("section", { className: "tarjeta" },
    el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Movimientos" }), el("p", { className: "sub", textContent: "Mercado Pago" }))),
    movs.length
      ? el("ul", { className: "lista-mini" }, ...movs.slice(0, 5).map((m) => el("li", {},
          el("div", { className: "txt" }, el("div", { className: "t1", textContent: m.descripcion }), el("div", { className: "t2", textContent: fmtFecha(m.fecha) })),
          el("span", { className: `pildora ${m.estado === "aprobado" ? "ok" : m.estado === "rechazado" ? "mal" : "neutra"}`, textContent: `${m.estado === "aprobado" ? "+" : ""}${fmt(m.monto)}` }))))
      : el("p", { className: "sub", textContent: "Conectá Mercado Pago para ver tus cobros." }));
}

function tarjetaVencimientos() {
  const prox = proximosVencimientos(estado.entradas, hoyISO(), 7);
  return el("section", { className: "tarjeta" },
    el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Vencimientos" }), el("p", { className: "sub", textContent: "Vencidos y próximos 7 días" }))),
    prox.length
      ? el("ul", { className: "lista-mini" }, ...prox.slice(0, 6).map(({ entrada, enDias, estado: est, resta }) => el("li", { className: est === "vencido" || enDias < 0 ? "vencida" : "" },
          el("div", { className: "txt" }, el("div", { className: "t1", textContent: entrada.titulo }),
            el("div", { className: "t2", textContent: enDias < 0 ? `venció ${enDiasTexto(enDias)}` : `vence ${enDiasTexto(enDias)}` })),
          resta ? el("span", { className: `pildora ${enDias < 0 ? "mal" : "neutra"}`, textContent: fmt(resta, entrada.moneda) }) : null)))
      : el("p", { className: "sub", textContent: "Nada vencido ni por vencer esta semana. 🎉" }));
}

function tarjetaSeguridad() {
  const c = estado.config.conexiones;
  const fila = (nombre, id, activo) => {
    const s = c[id];
    return el("li", {}, el("span", {}, el("span", { className: `punto ${s ? (s.ok ? "ok" : "mal") : ""}` }), nombre),
      el("span", { textContent: !activo ? "sin conectar" : s ? (s.ok ? "al día" : "con error") : "pendiente" }));
  };
  return el("section", { className: "tarjeta seguridad" },
    el("div", { className: "huella" }, icono("huella")),
    el("h3", { textContent: "Tus datos están a salvo" }),
    el("p", { textContent: `Cifrados con tu contraseña${conHuellaDe(estado.perfil.id) ? " y tu huella" : ""}, solo en este teléfono.` }),
    el("ul", { className: "estado-conexiones" },
      fila("Gmail", "google", !!estado.config.googleClientId),
      fila("Mercado Pago", "mp", !!estado.config.mpToken),
      fila("Instagram", "instagram", !!estado.config.igToken),
      fila("Resúmenes IA", "ia", !!estado.config.claudeKey)),
    boton("Bloquear ahora", bloquear, "", "candado"));
}

function vistaInicio() {
  const lista = ordenarPorPrioridad(pendientes().filter((e) => e.prioridad === "alta" || estadoPago(e)?.estado === "vencido"));
  return [
    el("div", { className: "tablero" },
      ...filaKpis(),
      tarjetaResumenIA(),
      tarjetaBilleteras(),
      tarjetaVencimientos(),
      tarjetaMedidor(),
      tarjetaBalance(),
      tarjetaMovimientos(),
      tarjetaSeguridad()),
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Urgente" })),
    listaItems(lista, "Nada urgente. 🎉"),
  ];
}

// ---- Listas de entradas ----
// Los chips filtran sin repintar la pantalla: solo cambia la lista (y no se pierde el scroll).
let repintarLista = null;
function chipsCategorias() {
  const fila = el("div", { className: "chips", role: "tablist" });
  const chip = (id, texto) => {
    const b = el("button", { type: "button", textContent: texto, className: estado.categoria === id ? "activa" : "" });
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(estado.categoria === id));
    b.onclick = () => {
      estado.categoria = id;
      fila.querySelectorAll("button").forEach((x) => { x.classList.toggle("activa", x === b); x.setAttribute("aria-selected", String(x === b)); });
      b.scrollIntoView({ behavior: SIN_MOVIMIENTO.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
      repintarLista?.();
    };
    return b;
  };
  fila.append(chip(null, "Todas"), ...CATEGORIAS.map((c) => chip(c.id, `${c.icono} ${c.nombre}`)));
  return fila;
}

function zonaLista(armar) {
  const zona = el("div", { className: "zona-lista" });
  const pintar = () => {
    zona.replaceChildren(...armar());
    zona.classList.remove("cambio");
    void zona.offsetWidth;
    zona.classList.add("cambio");
  };
  zona.replaceChildren(...armar());
  repintarLista = pintar;
  return zona;
}

function filtrar(lista) {
  if (estado.categoria) lista = lista.filter((e) => e.categoria === estado.categoria);
  return ordenarPorPrioridad(buscar(lista, estado.texto), estado.vista === "hoy" ? estado.dia : hoyISO());
}

function listaItems(lista, vacio = "No hay nada para mostrar acá.") {
  if (!lista.length) return el("p", { className: "vacio", textContent: estado.entradas.length ? vacio : "Todavía no hay nada. Tocá + o conectá tus cuentas en Conexiones." });
  return el("div", { className: "items" }, ...lista.map((e) => item(e)));
}

function seccion(titulo, lista, vacio) {
  if (!lista.length && !vacio) return [];
  return [el("div", { className: "titulo-seccion" }, el("h2", { textContent: `${titulo} · ${lista.length}` })), listaItems(lista, vacio)];
}

function vistaHoy() {
  const fecha = el("input", { type: "date", value: estado.dia });
  fecha.onchange = () => { estado.dia = fecha.value || hoyISO(); render(); };
  const armar = () => {
    const delDiaFiltrado = filtrar(delDia(estado.entradas, estado.dia));
    const nuevos = delDiaFiltrado.filter((e) => String(e.externoId || "").startsWith("gmail:msg:"));
    const resto = delDiaFiltrado.filter((e) => !nuevos.includes(e));
    if (!delDiaFiltrado.length) return [listaItems([], "No pasó nada este día.")];
    return [...seccion("📩 Llegó hoy", nuevos), ...seccion("Del día", resto)];
  };
  return [
    el("div", { className: "tablero" }, tarjetaResumenIA("ancho-4")),
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Filtrar" }), el("div", { className: "selector-fecha" }, fecha)),
    chipsCategorias(),
    zonaLista(armar),
  ];
}

function vistaMes() {
  const mes = el("input", { type: "month", value: estado.mes });
  mes.onchange = () => { estado.mes = mes.value || hoyISO().slice(0, 7); render(); };
  // Al mirar otro mes, los estados se calculan como si fuera ese mes.
  const ref = estado.mes === hoyISO().slice(0, 7) ? hoyISO() : `${estado.mes}-28`;
  const armar = () => {
    const lista = filtrar(delMes(estado.entradas, estado.mes));
    const est = (e) => estadoPago(e, ref)?.estado;
    const vencidos = lista.filter((e) => est(e) === "vencido" || (est(e) === "parcial" && estadoPago(e, ref).atrasado));
    const porPagar = lista.filter((e) => ["pendiente", "parcial"].includes(est(e)) && !vencidos.includes(e));
    const pagados = lista.filter((e) => ["pagado", "cobrada"].includes(est(e)));
    const otros = lista.filter((e) => !vencidos.includes(e) && !porPagar.includes(e) && !pagados.includes(e));
    if (!lista.length) return [listaItems([])];
    return [
      ...seccion("🔴 Vencidos", vencidos),
      ...seccion("🟡 Por pagar", porPagar),
      ...seccion("🟢 Pagados", pagados),
      ...seccion("Otros", otros),
    ];
  };
  return [
    el("div", { className: "tablero" }, ...filaKpis()),
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Filtrar" }), el("div", { className: "selector-fecha" }, mes)),
    chipsCategorias(),
    zonaLista(armar),
  ];
}

function vistaTodo() {
  const armar = () => {
    const lista = filtrar(estado.entradas);
    if (estado.categoria || !lista.length) return [listaItems(lista)];
    return CATEGORIAS.map((c) => [c, lista.filter((e) => e.categoria === c.id)]).filter(([, l]) => l.length)
      .flatMap(([c, l]) => seccion(`${c.icono} ${c.nombre}`, l));
  };
  return [chipsCategorias(), zonaLista(armar)];
}

const NOMBRE_FREC = { unico: "", diario: "diaria", semanal: "semanal", mensual: "mensual", anual: "anual" };
const NOMBRES_ORIGEN = { gmail: "Gmail", gcal: "Calendar", mp: "Mercado Pago", instagram: "Instagram", youtube: "YouTube", servicio: "Servicios" };

// Etiqueta del estado de pago: qué pasa con esto este mes.
function chipPago(e, p) {
  const cls = { pagado: "ok", cobrada: "ok", cancelada: "neutra", parcial: "aviso", pendiente: "aviso", vencido: "mal" }[p.estado];
  let texto;
  if (p.estado === "pagado") texto = "✓ Pagado este mes";
  else if (p.estado === "cobrada") texto = `✓ Cobrada${p.vence ? ` el ${fmtCorta(p.vence)}` : ""}`;
  else if (p.estado === "cancelada") texto = "Dada de baja";
  else if (p.estado === "parcial") texto = `Pagado en parte · faltan ${fmt(p.resta, e.moneda)}${p.atrasado ? " · vencida" : ""}`;
  else if (p.estado === "vencido") texto = `Vencida ${enDiasTexto(p.enDias)}`;
  else texto = p.vence ? `Vence ${enDiasTexto(p.enDias)}` : "Por pagar";
  return el("span", { className: `estado-pago ${cls}`, textContent: texto });
}

function item(e) {
  const c = cat(e.categoria);
  const p = estadoPago(e);
  const resuelto = resuelta(e);
  const resumenIA = estado.config.ia?.items?.[ia.clave(e)]?.resumen;
  const check = el("button", { type: "button", className: "check", title: resuelto ? "Desmarcar" : p ? "Marcar como pagado" : "Marcar como hecho" }, icono("check"));
  check.setAttribute("aria-pressed", String(resuelto));
  check.setAttribute("aria-label", `${resuelto ? "Desmarcar" : p ? "Marcar como pagado" : "Marcar como hecho"}: ${e.titulo}`);
  check.onclick = () => {
    reemplazar(e, resuelto ? deshacerPago(e) : registrarPago(e));
    if (!resuelto) toast(p ? `${e.titulo}: pagado` : "Hecho");
  };

  const cobro = !p && proximoCobro(e);
  const meta = el("div", { className: "meta" },
    p ? chipPago(e, p) : null,
    el("span", { textContent: `${c.icono} ${c.nombre}` }),
    e.tipoDinero && e.tipoDinero !== "disponible" ? el("span", { textContent: TIPOS_DINERO[e.tipoDinero] }) : null,
    el("span", { className: `prio-${e.prioridad}`, textContent: `Prioridad ${e.prioridad}` }),
    !p && NOMBRE_FREC[e.frecuencia] ? el("span", { textContent: NOMBRE_FREC[e.frecuencia] }) : null,
    cobro ? el("span", { textContent: `cobra ${fmtFecha(cobro)}` }) : !p && e.frecuencia === "unico" ? el("span", { textContent: fmtFecha(e.fecha) }) : null,
    e.origen ? el("span", { textContent: `🔄 ${NOMBRES_ORIGEN[e.origen] || e.origen}` }) : null);

  // Primero el resumen de la IA; si no hay, la primera línea de la nota.
  const primera = (e.nota || "").split("\n").find((l) => l.trim()) || "";
  const resumen = resumenIA
    ? el("p", { className: "resumen" }, el("span", { className: "chispa" }, icono("chispa")), resumenIA)
    : primera ? el("p", { className: "resumen", textContent: primera.length > 140 ? `${primera.slice(0, 140)}…` : primera }) : null;

  const acciones = el("div", { className: "acciones" });
  if (p && ["pendiente", "vencido", "parcial"].includes(p.estado)) acciones.append(boton("Pagué una parte", () => pagoParcial(e, p), "sec"));
  const baja = paginaBaja(e);
  if (baja && !e.cancelada) acciones.append(boton("Dar de baja", () => darDeBaja(e, baja), "baja"));
  const prov = proveedorDe(e.externoId);
  const numero = prov && validarNumero(estado.config.numerosServicios?.[prov.id]);
  if (prov && numero) acciones.append(boton("Ver factura", () => verFactura(prov, numero), "sec", "externo"));
  if (e.enlace && !(prov && numero)) acciones.append(el("a", { href: e.enlace, target: "_blank", rel: "noopener noreferrer" }, icono("externo"), "Abrir"));
  acciones.append(boton("Editar", () => abrirFormulario(e), "sec"));

  const montoVisible = p?.estado === "parcial" ? p.resta : p?.total ?? e.monto;
  return el("article", { className: `item${resuelto ? " hecho" : ""}${p?.estado === "vencido" ? " vencido" : ""}` },
    check,
    el("div", { className: "cuerpo" },
      el("div", { className: "fila-tit" },
        el("span", { className: "tit", textContent: e.titulo }),
        montoVisible != null ? el("span", { className: "monto", textContent: fmt(montoVisible, e.moneda) }) : null),
      resumen,
      meta,
      e.nota && (resumenIA || e.nota.includes("\n")) ? el("details", {}, el("summary", { textContent: "Ver detalle" }), el("p", { className: "nota", textContent: e.nota })) : null,
      acciones));
}

function reemplazar(vieja, nueva) {
  estado.entradas = estado.entradas.map((x) => (x === vieja ? nueva : x));
  registrarHistorial();
  guardar();
  if (repintarLista && estado.vista !== "inicio") repintarLista(); else render();
}

function pagoParcial(e, p) {
  const texto = prompt(`¿Cuánto pagaste de ${e.titulo}?${p.resta ? ` (faltan ${fmt(p.resta, e.moneda)})` : ""}`);
  if (texto == null) return;
  const monto = Number(String(texto).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  if (!monto) return toast("Ese monto no es válido");
  reemplazar(e, registrarPago(e, hoyISO(), monto));
  toast(`Anotado: pagaste ${fmt(monto, e.moneda)}`);
}

function darDeBaja(e, url) {
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => {
    if (!confirm(`¿Pudiste dar de baja ${e.titulo}? Si decís que sí, la marco como dada de baja.`)) return;
    reemplazar(e, { ...e, cancelada: true, nota: `Dada de baja el ${new Date().toLocaleDateString("es-AR")}.\n${e.nota}`.trim() });
  }, 800);
}

async function verFactura(prov, numero) {
  try {
    await navigator.clipboard.writeText(numero);
    toast(`Número ${numero} copiado: pegalo en ${prov.nombre}`);
  } catch {
    toast(`Tu número es ${numero}`);
  }
  window.open(prov.url, "_blank", "noopener,noreferrer");
}

// ---- Sincronización ----
function marcar(id, ok, detalle) {
  estado.config.conexiones[id] = { ok, detalle, cuando: new Date().toISOString() };
  guardar();
}

let enCurso = 0;
async function correr(id, nombre, fn, { silencioso = false } = {}) {
  enCurso++;
  $("#btn-sync").classList.add("girando");
  if (!silencioso) mostrarEstado(`Actualizando ${nombre}…`);
  try {
    const detalle = await fn();
    marcar(id, true, detalle);
    mostrarEstado("");
    if (!silencioso) toast(`${nombre}: ${detalle}`);
  } catch (err) {
    marcar(id, false, err.message);
    mostrarEstado(`${nombre}: ${err.message}`, true);
  } finally {
    if (--enCurso === 0) $("#btn-sync").classList.remove("girando");
  }
  if (!estado.llave) return;
  registrarHistorial();
  guardar();
  render();
}

function aplicar(origen, nuevas) {
  estado.entradas = ia.aplicarPrioridades(fusionar(estado.entradas, nuevas, origen), estado.config.ia, hoyISO());
  return `${nuevas.length} al día`;
}

const sincronizarGoogle = ({ alAbrir = false } = {}) => correr("google", "Google", async () => {
  const token = await googleAuth.obtenerToken(estado.config.googleClientId);
  const [deGmail, deCal, deYT] = await Promise.allSettled([
    gmail.sincronizar(token), googleAuth.sincronizarCalendar(token), youtube.sincronizar(token),
  ]);
  if (deGmail.status === "rejected") throw deGmail.reason;
  aplicar("gmail", deGmail.value);
  actualizarServicios();
  const hoyN = deGmail.value.filter((e) => String(e.externoId).startsWith("gmail:msg:")).length;
  const partes = [hoyN ? plural(hoyN, "mail nuevo hoy", "mails nuevos hoy") : "sin mails nuevos hoy"];
  if (deCal.status === "fulfilled") {
    aplicar("gcal", deCal.value);
    partes.push(plural(deCal.value.length, "evento", "eventos"));
  } else partes.push(`Calendar: ${deCal.reason.message}`);
  if (deYT.status === "fulfilled") aplicar("youtube", deYT.value);
  else partes.push(deYT.reason.message);
  return partes.join(" · ");
}, { silencioso: alAbrir });

const sincronizarMP = () => correr("mp", "Mercado Pago", async () => {
  const r = await mercadopago.sincronizar(estado.config.mpToken);
  estado.config.mpMovimientos = r.movimientos;
  return aplicar("mp", r.entradas);
}, { silencioso: true });

const sincronizarInstagram = () => correr("instagram", "Instagram", async () => {
  const cfg = estado.config;
  const nuevo = await instagram.renovarSiHaceFalta(cfg.igToken, cfg.igRenovadoEn);
  if (nuevo) {
    cfg.igToken = nuevo.token;
    cfg.igRenovadoEn = nuevo.renovado;
  }
  return aplicar("instagram", await instagram.sincronizar(cfg.igToken));
}, { silencioso: true });

const sincronizarCotizaciones = (opc) => correr("cotizaciones", "Cotizaciones", async () => {
  estado.config.cotizacion = await cotizaciones.sincronizar(estado.config.casaDolar);
  return `dólar ${estado.config.cotizacion.casa} ${fmt(estado.config.cotizacion.tasas.USD)}`;
}, opc);

// Resume solo si cambió algo desde el último resumen (cada resumen usa tu crédito de Claude).
async function resumirIA({ forzar = false } = {}) {
  const cfg = estado.config;
  if (!cfg.claudeKey) return;
  const lista = ordenarPorPrioridad(estado.entradas);
  const h = ia.huella(lista, hoyISO());
  if (!forzar && cfg.ia?.huella === h && cfg.ia.fecha?.slice(0, 10) === hoyISO()) return;
  await correr("ia", "Resumen", async () => {
    const r = await ia.resumir(cfg.claudeKey, lista, hoyISO());
    cfg.ia = { ...r, huella: h };
    estado.entradas = ia.aplicarPrioridades(estado.entradas, cfg.ia, hoyISO());
    return `${plural(r.resumen.length, "punto clave", "puntos clave")}`;
  });
}

async function sincronizarTodo() {
  if (estado.config.googleClientId && !EN_APK) await sincronizarGoogle();
  await sincronizarCotizaciones({ silencioso: true });
  if (estado.config.mpToken) await sincronizarMP();
  if (estado.config.igToken) await sincronizarInstagram();
  await resumirIA();
}

// ---- Conexiones: grupos desplegables con un mini tutorial por app ----
function estadoConexion(id) {
  const c = estado.config.conexiones[id];
  if (!c) return { clase: "", texto: "sin conectar" };
  return { clase: c.ok ? "ok" : "mal", texto: c.ok ? `al día · ${fmtHace(c.cuando)}` : "con error" };
}

// Campo de texto que guarda en la configuración al cambiar.
function campo(etiqueta, clave, props = {}, alCambiar) {
  const input = el("input", { value: estado.config[clave] || "", autocomplete: "off", ...props });
  input.onchange = () => { estado.config[clave] = input.value.trim(); guardar(); alCambiar?.(); };
  return el("label", { className: "campo" }, etiqueta, input);
}

function olvidar(origenes, claves, idConexion) {
  for (const k of claves) estado.config[k] = configInicial()[k];
  estado.entradas = estado.entradas.filter((e) => !origenes.includes(e.origen));
  delete estado.config.conexiones[idConexion];
  guardar();
  render();
}

// <details> que recuerda si estaba abierto entre repintadas.
function desplegable(clave, clase, resumen, ...cuerpo) {
  const d = el("details", { className: clase, open: estado.abiertos.has(clave) },
    el("summary", {}, ...resumen), el("div", { className: "desplegable-cuerpo" }, ...cuerpo));
  d.ontoggle = () => (d.open ? estado.abiertos.add(clave) : estado.abiertos.delete(clave));
  return d;
}

function detectadoEnGmail(id) {
  return estado.entradas.filter((e) => e.origen === "gmail" && String(e.externoId).split(":").pop() === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
}

// Lo propio de cada app con conexión directa (campos y botones).
function controlesApp(app) {
  const cfg = estado.config;
  switch (app.id) {
    case "claude":
      return [campo("Clave de API de Claude", "claudeKey", { type: "password", placeholder: "sk-ant-…" }),
        el("div", { className: "botones" }, boton("Resumir ahora", () => resumirIA({ forzar: true }), "", "chispa"),
          boton("Olvidar clave", () => { cfg.ia = null; olvidar([], ["claudeKey"], "ia"); }, "sec")),
        el("p", { className: "aviso", textContent: "Usa Claude Opus 5.5. Cada resumen cuesta unos centavos de dólar y solo se rehace cuando entra algo nuevo. Se manda el título y el texto de cada aviso; Anthropic no entrena con datos de la API." })];
    case "google":
      if (EN_APK) return [el("p", { textContent: "Google no permite iniciar sesión dentro de apps instaladas como esta: usá la versión web." })];
      return [campo("ID de cliente de Google", "googleClientId", { placeholder: "….apps.googleusercontent.com" }),
        el("div", { className: "botones" }, boton("Conectar y sincronizar", () => sincronizarGoogle()),
          boton("Desconectar", () => { googleAuth.cerrarSesion(); olvidar(["gmail", "gcal", "youtube"], [], "google"); }, "sec")),
        el("p", { className: "aviso", textContent: `Origen autorizado de esta app: ${location.origin}. Se actualiza solo cada vez que entrás.` })];
    case "mercadopago":
      return [campo("Access Token de producción", "mpToken", { type: "password", placeholder: "APP_USR-…" }),
        el("div", { className: "botones" }, boton("Sincronizar", sincronizarMP),
          boton("Olvidar token", () => { cfg.mpMovimientos = []; olvidar(["mp"], ["mpToken"], "mp"); }, "sec")),
        el("p", { className: "aviso", textContent: "⚠️ El token da acceso a tu cuenta: queda cifrado acá y no se lo pases a nadie." })];
    case "instagram":
      return [campo("Token de Instagram", "igToken", { type: "password", placeholder: "IGAA…" }, () => (cfg.igRenovadoEn = 0)),
        el("div", { className: "botones" }, boton("Sincronizar", sincronizarInstagram),
          boton("Olvidar token", () => olvidar(["instagram"], ["igToken", "igRenovadoEn"], "instagram"), "sec"))];
    case "cotizaciones": {
      const casa = el("select", {}, ...cotizaciones.CASAS_DOLAR.map((c) => el("option", { value: c, textContent: `Dólar ${c}`, selected: c === cfg.casaDolar })));
      casa.onchange = () => { cfg.casaDolar = casa.value; sincronizarCotizaciones(); };
      return [el("label", { className: "campo" }, "Dólar para pasar todo a pesos", casa)];
    }
    default: {
      const prov = PROVEEDORES.find((p) => p.id === app.id);
      if (!prov) return [];
      const input = el("input", { value: cfg.numerosServicios?.[prov.id] || "", inputMode: "numeric", placeholder: "Número de cuenta / suministro", autocomplete: "off" });
      input.onchange = () => {
        cfg.numerosServicios = { ...cfg.numerosServicios, [prov.id]: validarNumero(input.value) || "" };
        if (input.value && !validarNumero(input.value)) toast("Ese número no parece válido");
        actualizarServicios();
        guardar();
        render();
      };
      const numero = validarNumero(cfg.numerosServicios?.[prov.id]);
      return [el("label", { className: "campo" }, `Tu número en ${prov.nombre}`, input),
        numero ? el("div", { className: "botones" }, boton("Ver factura", () => verFactura(prov, numero), "sec", "externo")) : null];
    }
  }
}

function filaApp(app) {
  const conexion = app.conexion ? estadoConexion(app.conexion) : null;
  const detectado = app.metodo === "gmail" ? detectadoEnGmail(app.id) : null;
  const numero = app.metodo === "numero" ? validarNumero(estado.config.numerosServicios?.[app.id]) : null;
  const st = conexion
    || (detectado ? { clase: "ok", texto: `en Gmail · ${fmtCorta(detectado.fecha)}` } : null)
    || (numero ? { clase: "ok", texto: "número cargado" } : { clase: "", texto: app.metodo === "gmail" ? "sin avisos todavía" : "sin configurar" });
  return desplegable(`app:${app.id}`, "app-conexion", [
    el("span", { className: "app-nombre", textContent: app.nombre }),
    el("span", { className: `metodo ${app.metodo}`, textContent: NOMBRE_METODO[app.metodo] }),
    el("span", { className: "app-estado" }, el("span", { className: `punto ${st.clase}` }), st.texto),
  ],
  ...controlesApp(app),
  el("div", { className: "tutorial" }, el("strong", { textContent: "Cómo conectarlo" }), el("ol", {}, ...app.pasos.map((t) => el("li", { textContent: t })))));
}

function grupoSeguridad() {
  const cfg = estado.config;
  const bloqueo = el("select", {}, ...OPCIONES_BLOQUEO.map((m) => el("option", { value: m, textContent: m ? `A los ${m} minutos sin uso` : "Nunca (solo al bloquear a mano)", selected: m === minutosBloqueo() })));
  bloqueo.onchange = () => { cfg.bloqueoMin = Number(bloqueo.value); guardar(); reiniciarInactividad(); toast(cfg.bloqueoMin ? `Se bloquea a los ${cfg.bloqueoMin} minutos sin uso` : "La sesión queda abierta hasta que bloquees"); };
  const claveH = perfiles.claveHuella(estado.perfil.id);
  const conHuella = huella.activada(localStorage, claveH);
  const otros = perfiles.listar().filter((p) => p.id !== estado.perfil.id);
  return desplegable("seguridad", "tarjeta grupo", [
    el("span", { className: "grupo-ico", textContent: "🔐" }), el("span", { className: "grupo-nombre", textContent: "Perfil y seguridad" }),
    el("span", { className: "grupo-cant", textContent: estado.perfil.nombre }),
  ],
  el("p", { className: "aviso", textContent: "Tus datos se guardan cifrados con tu contraseña (AES-256) solo en este teléfono. La sesión queda abierta: la contraseña se pide al cambiar de perfil o después de bloquear." }),
  el("div", { className: "botones" },
    boton("Cambiar de perfil", elegirPerfil, "sec", "persona"),
    boton("Agregar perfil", crearPerfil, "sec", "mas")),
  otros.length ? el("p", { className: "aviso", textContent: `Otros perfiles en este teléfono: ${otros.map((p) => p.nombre).join(", ")}. Cada uno con su contraseña: no ven tus datos.` }) : null,
  huella.disponible()
    ? el("div", { className: "botones" }, conHuella
      ? boton("Desactivar huella", () => { huella.desactivar(localStorage, claveH); toast("Huella desactivada"); render(); }, "sec", "huella")
      : boton("Activar huella", activarHuella, "", "huella"))
    : el("p", { className: "aviso", textContent: "Este navegador no permite usar la huella." }),
  el("label", { className: "campo" }, "Bloquear la app", bloqueo),
  campo("Tu nombre (para el saludo)", "nombre", { placeholder: "Ej: Braian" }, () => {
    if (cfg.nombre) perfiles.renombrar(estado.perfil.id, cfg.nombre);
    estado.perfil = perfiles.listar().find((p) => p.id === estado.perfil.id) || estado.perfil;
    renderCabecera();
  }),
  el("div", { className: "botones" },
    boton("Exportar copia", exportarCopia, "sec"),
    boton("Importar copia", () => $("#input-importar").click(), "sec"),
    boton("Cambiar contraseña", cambiarPin, "sec"),
    boton("Borrar este perfil", borrarPerfil, "peligro")));
}

function vistaConexiones() {
  const grupos = GRUPOS.map((g) => {
    const conectadas = g.apps.filter((a) => (a.conexion && estado.config.conexiones[a.conexion]?.ok)
      || (a.metodo === "gmail" && detectadoEnGmail(a.id)) || (a.metodo === "numero" && validarNumero(estado.config.numerosServicios?.[a.id]))).length;
    return desplegable(`grupo:${g.id}`, "tarjeta grupo", [
      el("span", { className: "grupo-ico", textContent: g.icono }),
      el("span", { className: "grupo-nombre", textContent: g.nombre }),
      el("span", { className: "grupo-cant", textContent: `${conectadas}/${g.apps.length}` }),
    ], ...g.apps.map(filaApp));
  });
  return [el("div", { className: "conexiones" }, grupoSeguridad(), ...grupos)];
}

// ---- Formulario ----
const form = $("#formulario");
form.elements.categoria.replaceChildren(...CATEGORIAS.map((c) => el("option", { value: c.id, textContent: `${c.icono} ${c.nombre}` })));
form.elements.tipoDinero.replaceChildren(...Object.entries(TIPOS_DINERO).map(([id, nombre]) => el("option", { value: id, textContent: nombre })));
const mostrarTipoDinero = () => ($("#campo-tipo-dinero").hidden = !CATS_DINERO.has(form.elements.categoria.value));
form.elements.categoria.onchange = () => {
  mostrarTipoDinero();
  if (form.elements.categoria.value === "ahorros" && form.elements.tipoDinero.value === "disponible") form.elements.tipoDinero.value = "ahorro";
};

function abrirFormulario(e) {
  form.reset();
  $("#titulo-form").textContent = e ? "Editar entrada" : "Nueva entrada";
  $("#btn-borrar").hidden = !e;
  $("#aviso-sync").hidden = !e?.origen;
  $("#aviso-sync").textContent = e?.origen ? `Viene de ${NOMBRES_ORIGEN[e.origen] || e.origen}: la próxima sincronización puede reemplazar tus cambios.` : "";
  const base = e || {
    id: "", categoria: estado.categoria || "otros", prioridad: "media", moneda: "ARS", tipoDinero: "disponible",
    frecuencia: estado.vista === "mes" ? "mensual" : "unico",
    fecha: estado.vista === "hoy" ? estado.dia : hoyISO(),
  };
  for (const [k, v] of Object.entries(base)) if (form.elements[k] && typeof v !== "boolean" && typeof v !== "object") form.elements[k].value = v ?? "";
  if (!form.elements.tipoDinero.value) form.elements.tipoDinero.value = "disponible";
  mostrarTipoDinero();
  $("#dialogo").showModal();
}

form.onsubmit = (ev) => {
  ev.preventDefault();
  const datos = Object.fromEntries(new FormData(form));
  const previa = estado.entradas.find((x) => x.id === datos.id);
  const entrada = normalizar({ ...previa, ...datos, id: datos.id || nuevoId() });
  estado.entradas = previa ? estado.entradas.map((x) => (x.id === entrada.id ? entrada : x)) : [...estado.entradas, entrada];
  registrarHistorial();
  guardar();
  $("#dialogo").close();
  render();
};

$("#btn-cancelar").onclick = () => $("#dialogo").close();
$("#btn-borrar").onclick = () => {
  if (!confirm("¿Borrar esta entrada?")) return;
  estado.entradas = estado.entradas.filter((x) => x.id !== form.elements.id.value);
  registrarHistorial();
  guardar();
  $("#dialogo").close();
  render();
};

// ---- Copias ----
// La copia de seguridad va cifrada con el PIN actual (incluye entradas y conexiones).
async function exportarCopia() {
  const texto = JSON.stringify(await cifrar(estado.llave, { entradas: estado.entradas, config: estado.config, finanzas: estado.finanzas }));
  const nombre = `todo-en-uno-${estado.perfil.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${hoyISO()}.cifrado.json`;
  if (EN_APK) return window.Android.guardarArchivo(nombre, texto);
  const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  el("a", { href: url, download: nombre }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Combina una copia (cifrada o vieja en texto plano) con lo que ya hay en este dispositivo.
$("#input-importar").onchange = async (ev) => {
  const archivo = ev.target.files[0];
  ev.target.value = "";
  if (!archivo) return;
  try {
    const texto = await archivo.text();
    const json = JSON.parse(texto);
    let nuevas, config = {}, finanzasCopia = null;
    if (esBoveda(json)) {
      const r = await pedirPin({ titulo: "Importar copia", texto: "PIN con el que se exportó la copia", cancelable: true,
        verificar: (pin) => abrir(pin, json) });
      if (!r) return;
      nuevas = (r.datos.entradas || []).map(normalizar);
      config = r.datos.config || {};
      finanzasCopia = r.datos.finanzas || null;
    } else {
      nuevas = importar(texto);
    }
    if (!confirm(`Importar ${nuevas.length} entradas? Se combinan con las ${estado.entradas.length} de este dispositivo.`)) return;
    estado.entradas = combinar(estado.entradas, nuevas);
    // Los tokens/IDs de este dispositivo tienen prioridad; solo se completan los vacíos.
    for (const k of ["googleClientId", "igToken", "mpToken", "claudeKey", "nombre"]) if (!estado.config[k] && config[k]) estado.config[k] = config[k];
    estado.config.numerosServicios = { ...config.numerosServicios, ...estado.config.numerosServicios };
    estado.config.conexiones = { ...config.conexiones, ...estado.config.conexiones };
    // Finanzas: si la copia trae y este perfil no tiene nada cargado, se toman las de la copia.
    if (finanzasCopia && !estado.finanzas.gastos.length && !estado.finanzas.compras.length) estado.finanzas = normalizarFinanzas(finanzasCopia);
    actualizarServicios();
    await guardar();
    render();
    toast(`Importadas ${nuevas.length} entradas`);
  } catch (err) {
    alert(`No se pudo importar: ${err.message}`);
  }
};

// ---- Hoja de formulario genérica (sube desde abajo) ----
// campos: [{ nombre, etiqueta, tipo, opciones: [[valor, texto]], valor, requerido, placeholder, min, max }]
// Resuelve con los valores, con { borrar: true } si se tocó "Borrar", o null si se canceló.
function pedirDatos({ titulo, texto = "", campos, borrar = false }) {
  return new Promise((resolver) => {
    const hoja = $("#hoja");
    const form = $("#hoja-form");
    $("#hoja-titulo").textContent = titulo;
    $("#hoja-texto").textContent = texto;
    $("#hoja-texto").hidden = !texto;
    $("#hoja-pie").hidden = false;
    $("#hoja-campos").replaceChildren(...campos.map((c) => {
      const props = { name: c.nombre, required: Boolean(c.requerido), placeholder: c.placeholder || "", autocomplete: "off" };
      let input;
      if (c.tipo === "textarea") {
        input = el("textarea", { ...props, rows: 3, value: c.valor ?? "" });
      } else if (c.tipo === "select") {
        input = el("select", props, ...c.opciones.map(([v, t]) => el("option", { value: v, textContent: t, selected: String(v) === String(c.valor) })));
      } else {
        input = el("input", { ...props, type: c.tipo || "text", value: c.valor ?? "" });
        if (c.tipo === "number") { input.step = "any"; input.inputMode = "decimal"; }
        if (c.min != null) input.min = c.min;
        if (c.max != null) input.max = c.max;
      }
      return el("label", {}, c.etiqueta, input);
    }));
    $("#hoja-borrar").hidden = !borrar;
    let resuelto = false;
    const terminar = (v) => { if (resuelto) return; resuelto = true; hoja.close(); resolver(v); };
    form.onsubmit = (ev) => { ev.preventDefault(); terminar(Object.fromEntries(new FormData(form))); };
    $("#hoja-cancelar").onclick = () => terminar(null);
    $("#hoja-borrar").onclick = () => { if (confirm("¿Seguro que querés borrarlo?")) terminar({ borrar: true }); };
    // El evento "close" llega después: si la hoja se volvió a abrir (otra pantalla la reusó
    // enseguida), ese aviso viejo no tiene que cerrar el formulario nuevo.
    hoja.onclose = () => { if (!hoja.open) terminar(null); };
    hoja.showModal();
    // Foco al primer campo, salvo que ya se esté escribiendo en otro.
    setTimeout(() => { if (!form.contains(document.activeElement)) form.querySelector("input, select")?.focus(); }, 50);
  });
}

// Hojas que se cierran deslizando hacia abajo (como en las apps del iPhone): se arrastra
// desde la manija o desde cualquier lado si la hoja está arriba de todo. Pasado un tramo
// (o con un tirón rápido) se cierra; si no, vuelve a su lugar.
function deslizarParaCerrar(d) {
  let y0 = null, dy = 0, t0 = 0, arrastrando = false;
  d.addEventListener("touchstart", (ev) => {
    if (!matchMedia("(max-width: 899px)").matches || ev.touches.length > 1) return;
    if (!ev.target.closest(".agarre, h2") && d.scrollTop > 0) return;
    y0 = ev.touches[0].clientY; dy = 0; t0 = Date.now(); arrastrando = false;
  }, { passive: true });
  d.addEventListener("touchmove", (ev) => {
    if (y0 == null) return;
    dy = ev.touches[0].clientY - y0;
    if (!arrastrando) {
      if (dy < -4) { y0 = null; return; } // va para arriba: es scroll normal
      if (dy > 10 && d.scrollTop <= 0) arrastrando = true; else return;
    }
    ev.preventDefault();
    d.style.transition = "none";
    d.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  const soltar = () => {
    if (y0 == null) return;
    y0 = null;
    if (!arrastrando) return;
    const rapido = dy / Math.max(1, Date.now() - t0) > 0.6;
    d.style.transition = "transform .25s cubic-bezier(.2, .8, .2, 1)";
    if (dy > 120 || (dy > 50 && rapido)) {
      d.style.transform = "translateY(110%)";
      setTimeout(() => { d.close(); d.style.transform = ""; d.style.transition = ""; }, 230);
    } else {
      d.style.transform = "";
      setTimeout(() => (d.style.transition = ""), 260);
    }
  };
  d.addEventListener("touchend", soltar);
  d.addEventListener("touchcancel", soltar);
}
deslizarParaCerrar($("#hoja"));
deslizarParaCerrar($("#dialogo"));

const vistasF = crearVistasFinanzas({ estado, el, fmt, icono, boton, guardar, render, toast, pedirDatos, irA, hoyISO, actualizarCotizacion: () => sincronizarCotizaciones() });

// ---- Controles de la cabecera ----
armarRiel();
$("#btn-perfil").onclick = elegirPerfil;
$("#lupa").append(icono("buscar"));
$("#btn-sync").append(icono("sync"));
$("#btn-sync").setAttribute("aria-label", "Sincronizar todo");
$("#btn-sync").onclick = sincronizarTodo;
$("#btn-nuevo").append(icono("mas"));
$("#btn-nuevo").setAttribute("aria-label", "Nueva entrada");
$("#btn-nuevo").onclick = () => (esCompleto() ? abrirFormulario(null) : vistasF.nuevo());
$("#buscar").oninput = (ev) => {
  estado.texto = ev.target.value;
  if (repintarLista) repintarLista(); else render();
};

// ---- Instalar como app ----
const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let pedidoInstalar = null;
$("#btn-instalar").append(icono("instalar"));
$("#btn-instalar").setAttribute("aria-label", "Instalar app");
addEventListener("beforeinstallprompt", (ev) => {
  ev.preventDefault();
  pedidoInstalar = ev;
  $("#btn-instalar").hidden = false;
  $("#aviso-instalar").hidden = true;
});
$("#btn-instalar").onclick = async () => {
  if (!pedidoInstalar) return;
  pedidoInstalar.prompt();
  await pedidoInstalar.userChoice;
  pedidoInstalar = null;
  $("#btn-instalar").hidden = true;
};
addEventListener("appinstalled", () => { $("#btn-instalar").hidden = true; $("#aviso-instalar").hidden = true; });

// Navegadores internos (abrir un enlace desde Claude, WhatsApp, Instagram, Gmail…) no dejan instalar.
function textoAvisoInstalar(ua = navigator.userAgent) {
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return /CriOS|FxiOS|Instagram|FBAN|FBAV|Line|wv/i.test(ua) || !/Safari/i.test(ua)
      ? "Para instalarla, abrí este enlace en Safari y tocá Compartir → “Agregar a inicio”."
      : "Para instalarla: tocá Compartir (cuadrado con flecha) → “Agregar a inicio”.";
  }
  if (/Android/i.test(ua)) {
    return /; wv\)|Instagram|FBAN|FBAV|WhatsApp|GSA\//i.test(ua)
      ? "Estás en el navegador interno de otra app y desde acá no se puede instalar. Tocá ⋮ → “Abrir en Chrome” (o copiá el enlace y pegalo en Chrome) y ahí tocá ⋮ → “Agregar a pantalla principal”."
      : "Para instalarla: en Chrome tocá ⋮ → “Agregar a pantalla principal” → “Instalar”.";
  }
  return "Para instalarla: en Chrome o Edge usá el ícono de instalar de la barra de direcciones o ⋮ → “Instalar Todo en uno”.";
}
if (!instalada && !EN_APK) {
  // Si en unos segundos el navegador no ofreció instalar, mostramos cómo hacerlo a mano.
  setTimeout(() => {
    if (pedidoInstalar || instalada) return;
    $("#aviso-instalar").textContent = `📲 ${textoAvisoInstalar()}`;
    $("#aviso-instalar").hidden = false;
  }, 4000);
}

// Instalable como app (PWA) cuando se sirve por HTTPS o localhost; el APK no lo necesita.
if (!EN_APK && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

desbloquear();
