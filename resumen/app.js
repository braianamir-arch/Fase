import {
  CATEGORIAS, normalizar, nuevoId, hoyISO, ordenarPorPrioridad, delDia, delMes,
  buscar, totales, proximosVencimientos, proximoCobro, importar, fusionar, combinar, enPesos,
} from "./core.js";
import * as gmail from "./conectores/gmail.js";
import * as googleAuth from "./conectores/google.js";
import * as mercadopago from "./conectores/mercadopago.js";
import * as cotizaciones from "./conectores/cotizaciones.js";
import * as instagram from "./conectores/instagram.js";
import * as youtube from "./conectores/youtube.js";
import { leerExtracto, extractoAEntradas } from "./conectores/extracto.js";
import { crearLlave, cifrar, abrir, esBoveda, validarPin, esperaPorIntentos } from "./seguridad.js";

const CLAVE_BOVEDA = "todo-en-uno:boveda";
// Versiones viejas guardaban en texto plano: se migran a la bóveda y se borran.
const CLAVES_VIEJAS = ["todo-en-uno:v1", "todo-en-uno:config"];
const BLOQUEO_INACTIVO_MS = 5 * 60000;
const BLOQUEO_OCULTO_MS = 60000;
// En el APK de Android existe el puente nativo window.Android.
const EN_APK = typeof window.Android?.guardarArchivo === "function";
const $ = (s) => document.querySelector(s);

const configInicial = () => ({ googleClientId: "", igToken: "", igRenovadoEn: 0, mpToken: "", casaDolar: "blue", cotizacion: null, conexiones: {} });

const estado = {
  llave: null, // clave AES en memoria mientras la app está desbloqueada
  entradas: [],
  config: configInicial(),
  vista: "inicio",
  categoria: null,
  texto: "",
  dia: hoyISO(),
  mes: hoyISO().slice(0, 7),
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
  const datos = { entradas: estado.entradas, config: estado.config };
  cola = cola
    .then(async () => localStorage.setItem(CLAVE_BOVEDA, JSON.stringify(await cifrar(llave, datos))))
    .catch((err) => alert(`No se pudo guardar: ${err.message}. Exportá una copia.`));
  return cola;
}

// ---- PIN, bloqueo y desbloqueo ----
const dialogoPin = $("#dialogo-pin");
const formPin = $("#form-pin");

// Muestra el diálogo de PIN. `confirmar` pide repetirlo; `cancelable` permite cerrarlo;
// `verificar(pin)` puede tirar error para pedirlo de nuevo.
function pedirPin({ titulo, texto = "", confirmar = false, cancelable = false, verificar }) {
  return new Promise((resolver) => {
    $("#pin-titulo").textContent = titulo;
    $("#pin-texto").textContent = texto;
    $("#pin-error").textContent = "";
    formPin.reset();
    formPin.elements.pin2.hidden = !confirmar;
    formPin.elements.pin2.required = confirmar;
    $("#pin-cancelar").hidden = !cancelable;
    let fallidos = 0, bloqueadoHasta = 0;
    formPin.onsubmit = async (ev) => {
      ev.preventDefault();
      const pin = formPin.elements.pin.value;
      const error = (t) => { $("#pin-error").textContent = t; formPin.elements.pin.select(); };
      if (Date.now() < bloqueadoHasta) return error(`Esperá ${Math.ceil((bloqueadoHasta - Date.now()) / 1000)} s`);
      if (confirmar) {
        const problema = validarPin(pin);
        if (problema) return error(problema);
        if (pin !== formPin.elements.pin2.value) return error("Los PIN no coinciden");
      }
      if (verificar) {
        $("#pin-error").textContent = "Verificando…";
        try {
          const r = await verificar(pin);
          dialogoPin.close();
          return resolver(r);
        } catch (err) {
          fallidos++;
          bloqueadoHasta = Date.now() + esperaPorIntentos(fallidos);
          return error(err.message);
        }
      }
      dialogoPin.close();
      resolver(pin);
    };
    $("#pin-cancelar").onclick = () => { dialogoPin.close(); resolver(null); };
    dialogoPin.oncancel = (ev) => { ev.preventDefault(); if (cancelable) { dialogoPin.close(); resolver(null); } };
    dialogoPin.showModal();
  });
}

async function desbloquear() {
  document.body.classList.add("bloqueada");
  const boveda = leerLocal(CLAVE_BOVEDA);
  let datos;
  if (esBoveda(boveda)) {
    const r = await pedirPin({ titulo: "🔒 Todo en uno", texto: "Ingresá tu PIN", verificar: (pin) => abrir(pin, boveda) });
    estado.llave = r.llave;
    datos = r.datos;
  } else {
    const pin = await pedirPin({
      titulo: "Creá tu PIN",
      texto: "Cifra todos tus datos en este dispositivo. Si lo olvidás no hay forma de recuperarlos (solo con una copia exportada y su PIN).",
      confirmar: true,
    });
    estado.llave = await crearLlave(pin);
    datos = { entradas: leerLocal(CLAVES_VIEJAS[0]) || [], config: leerLocal(CLAVES_VIEJAS[1]) || {} };
  }
  estado.entradas = (datos.entradas || []).map(normalizar);
  estado.config = { ...configInicial(), ...datos.config };
  await guardar();
  CLAVES_VIEJAS.forEach((k) => localStorage.removeItem(k));
  document.body.classList.remove("bloqueada");
  render();
  reiniciarInactividad();
  // Al abrir: cotizaciones y Mercado Pago se actualizan solos (Google necesita un clic por el login).
  sincronizarCotizaciones()
    .then(() => estado.llave && estado.config.mpToken && sincronizarMP())
    .then(() => estado.llave && estado.config.igToken && sincronizarInstagram());
}

function bloquear() {
  if (!estado.llave) return;
  estado.llave = null;
  estado.entradas = [];
  estado.config = configInicial();
  googleAuth.cerrarSesion();
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  ["#lista", "#conexiones", "#resumen-totales", "#vencimientos"].forEach((sel) => $(sel).replaceChildren());
  mostrarEstado("");
  desbloquear();
}

let temporizador = null;
function reiniciarInactividad() {
  clearTimeout(temporizador);
  if (estado.llave) temporizador = setTimeout(bloquear, BLOQUEO_INACTIVO_MS);
}
["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, reiniciarInactividad, { passive: true }));
let ocultaDesde = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ocultaDesde = Date.now();
  else if (ocultaDesde && Date.now() - ocultaDesde > BLOQUEO_OCULTO_MS) bloquear();
});

async function cambiarPin() {
  const ok = await pedirPin({ titulo: "Cambiar PIN", texto: "Ingresá el PIN actual", cancelable: true,
    verificar: (pin) => abrir(pin, leerLocal(CLAVE_BOVEDA)) });
  if (!ok) return;
  const nuevo = await pedirPin({ titulo: "Nuevo PIN", confirmar: true, cancelable: true });
  if (!nuevo) return;
  estado.llave = await crearLlave(nuevo);
  await guardar();
  mostrarEstado("PIN cambiado. Las copias exportadas antes siguen usando el PIN viejo.");
}

function borrarTodo() {
  if (!confirm("¿Borrar TODOS los datos de este dispositivo? No se puede deshacer.")) return;
  if (!confirm("Última confirmación: se borran entradas, tokens y PIN.")) return;
  estado.llave = null;
  localStorage.removeItem(CLAVE_BOVEDA);
  CLAVES_VIEJAS.forEach((k) => localStorage.removeItem(k));
  location.reload();
}

// Construye un elemento con texto seguro (nunca innerHTML con datos del usuario).
function el(tag, props = {}, ...hijos) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const h of hijos) if (h != null) n.append(h);
  return n;
}

const fmt = (monto, moneda) => {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda }).format(monto);
  } catch {
    return `${moneda} ${monto.toLocaleString("es-AR")}`;
  }
};
const fmtMonedas = (obj) => Object.entries(obj).map(([m, v]) => fmt(v, m)).join(" · ") || "—";
const fmtFecha = (iso) => new Date(`${iso}T12:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
const fmtHace = (iso) => (iso ? new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "nunca");
const cat = (id) => CATEGORIAS.find((c) => c.id === id);

function render() {
  document.querySelectorAll(".pestanas button").forEach((b) => b.classList.toggle("activa", b.dataset.vista === estado.vista));
  const enConexiones = estado.vista === "conexiones";
  $("#conexiones").hidden = !enConexiones;
  $("#filtros").hidden = enConexiones;
  $("#lista").hidden = enConexiones;
  $("#selector-dia").hidden = estado.vista !== "hoy";
  $("#selector-mes").hidden = estado.vista !== "mes";
  renderTotales();
  renderVencimientos();
  if (enConexiones) return renderConexiones();
  renderChips();
  renderLista();
}

function renderTotales() {
  const caja = $("#resumen-totales");
  caja.hidden = estado.vista === "hoy" || estado.vista === "conexiones";
  const t = totales(estado.entradas);
  const cot = estado.config.cotizacion;
  const tarjeta = (etq, val, sub) => el("div", { className: "tarjeta" },
    el("div", { className: "etq", textContent: etq }),
    el("div", { className: "val", textContent: val }),
    sub ? el("div", { className: "etq", textContent: sub }) : null);
  const tarjetas = [];
  if (cot) {
    const { total, sinTasa } = enPesos(t.disponible, cot.tasas);
    tarjetas.push(tarjeta("🧮 Todo en pesos", fmt(total, "ARS"),
      `dólar ${cot.casa} ${fmt(cot.tasas.USD, "ARS")}${sinTasa.length ? ` · sin cotizar: ${sinTasa.join(", ")}` : ""}`));
  }
  tarjetas.push(
    tarjeta("💰 Disponible total", fmtMonedas(t.disponible)),
    tarjeta("🏦 En bancos", fmtMonedas(t.bancos)),
    tarjeta("💵 Efectivo", fmtMonedas(t.efectivo)),
    tarjeta("🔁 Suscripciones / mes", fmtMonedas(t.suscripcionesMes)),
  );
  caja.replaceChildren(...tarjetas);
}

function renderVencimientos() {
  const caja = $("#vencimientos");
  if (estado.vista !== "inicio") return caja.replaceChildren();
  const prox = proximosVencimientos(estado.entradas, hoyISO(), 7);
  caja.replaceChildren(
    el("h2", { textContent: "Próximos 7 días" }),
    prox.length
      ? el("div", {}, ...prox.map(({ entrada, enDias }) => item(entrada, enDias === 0 ? "hoy" : enDias === 1 ? "mañana" : `en ${enDias} días`)))
      : el("p", { className: "vacio", textContent: "Nada vence esta semana." }),
  );
}

function renderChips() {
  const chip = (id, texto) => {
    const b = el("button", { textContent: texto, className: estado.categoria === id ? "activa" : "" });
    b.onclick = () => { estado.categoria = id; render(); };
    return b;
  };
  $("#chips").replaceChildren(chip(null, "Todas"), ...CATEGORIAS.map((c) => chip(c.id, `${c.icono} ${c.nombre}`)));
}

function entradasDeVista() {
  let lista = estado.entradas;
  if (estado.vista === "inicio") lista = lista.filter((e) => !e.hecho && e.prioridad === "alta");
  if (estado.vista === "hoy") lista = delDia(lista, estado.dia);
  if (estado.vista === "mes") lista = delMes(lista, estado.mes);
  if (estado.categoria) lista = lista.filter((e) => e.categoria === estado.categoria);
  return ordenarPorPrioridad(buscar(lista, estado.texto), estado.vista === "hoy" ? estado.dia : hoyISO());
}

function renderLista() {
  const lista = entradasDeVista();
  const titulos = {
    inicio: "Prioridad alta pendiente",
    hoy: `Resumen del día · ${fmtFecha(estado.dia)}`,
    mes: `Resumen del mes · ${new Date(`${estado.mes}-15T12:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`,
    todo: "Todo, por prioridad",
  };
  const cuerpo = [];
  if (!lista.length) {
    cuerpo.push(el("p", { className: "vacio", textContent: estado.entradas.length ? "No hay entradas para mostrar acá." : "Todavía no hay nada. Tocá “+ Nuevo” o conectá tus cuentas en “Conexiones”." }));
  } else if (estado.vista === "todo" && !estado.categoria) {
    for (const c of CATEGORIAS) {
      const deCat = lista.filter((e) => e.categoria === c.id);
      if (deCat.length) cuerpo.push(el("h2", { textContent: `${c.icono} ${c.nombre} (${deCat.length})` }), ...deCat.map((e) => item(e)));
    }
  } else {
    cuerpo.push(...lista.map((e) => item(e)));
  }
  $("#lista").replaceChildren(el("h2", { textContent: titulos[estado.vista] }), ...cuerpo);
}

const NOMBRE_FREC = { unico: "", diario: "diaria", semanal: "semanal", mensual: "mensual", anual: "anual" };
const NOMBRES_ORIGEN = { gmail: "Gmail", gcal: "Calendar", mp: "Mercado Pago", instagram: "Instagram", youtube: "YouTube" };
const NOMBRE_ORIGEN = (o) => NOMBRES_ORIGEN[o] || (o?.startsWith("extracto:") ? "extracto" : o);

function item(e, extra) {
  const c = cat(e.categoria);
  const check = el("input", { type: "checkbox", checked: e.hecho, title: "Marcar como hecho" });
  check.onclick = (ev) => ev.stopPropagation();
  check.onchange = () => { e.hecho = check.checked; guardar(); render(); };

  const cobro = proximoCobro(e);
  const meta = [
    `${c.icono} ${c.nombre}`,
    `prioridad ${e.prioridad}`,
    NOMBRE_FREC[e.frecuencia],
    cobro ? `cobra ${fmtFecha(cobro)}` : e.frecuencia === "unico" ? fmtFecha(e.fecha) : null,
    e.origen ? `🔄 ${NOMBRE_ORIGEN(e.origen)}` : null,
    extra,
  ].filter(Boolean).join(" · ");

  let abrir = null;
  if (e.enlace) {
    abrir = el("a", { className: "abrir", href: e.enlace, target: "_blank", rel: "noopener noreferrer", textContent: "Abrir ↗" });
    abrir.onclick = (ev) => ev.stopPropagation();
  }
  const fila = el("article", { className: `item ${e.prioridad}${e.hecho ? " hecho" : ""}` },
    check,
    el("div", {},
      el("div", { className: "tit", textContent: e.titulo }),
      el("div", { className: "meta", textContent: meta }),
      e.nota ? el("div", { className: "nota", textContent: e.nota }) : null,
      abrir),
    e.monto != null ? el("div", { className: "monto", textContent: fmt(e.monto, e.moneda) }) : el("span"),
  );
  fila.onclick = () => abrirFormulario(e);
  return fila;
}

// ---- Conexiones ----
function marcar(id, ok, detalle) {
  estado.config.conexiones[id] = { ok, detalle, cuando: new Date().toISOString() };
  guardar();
}

function mostrarEstado(texto, error = false) {
  const p = $("#estado-sync");
  p.hidden = !texto;
  p.textContent = texto || "";
  p.classList.toggle("error", error);
}

async function correr(id, nombre, fn) {
  mostrarEstado(`Sincronizando ${nombre}…`);
  try {
    const detalle = await fn();
    marcar(id, true, detalle);
    mostrarEstado(`${nombre}: ${detalle}`);
  } catch (err) {
    marcar(id, false, err.message);
    mostrarEstado(`${nombre}: ${err.message}`, true);
  }
  render();
}

function aplicar(origen, nuevas) {
  estado.entradas = fusionar(estado.entradas, nuevas, origen);
  guardar();
  return `${nuevas.length} entradas actualizadas`;
}

const sincronizarGoogle = () => correr("google", "Google", async () => {
  const token = await googleAuth.obtenerToken(estado.config.googleClientId);
  const [deGmail, deCal, deYT] = await Promise.allSettled([
    gmail.sincronizar(token), googleAuth.sincronizarCalendar(token), youtube.sincronizar(token),
  ]);
  if (deGmail.status === "rejected") throw deGmail.reason;
  aplicar("gmail", deGmail.value);
  const partes = [`${deGmail.value.length} resúmenes de Gmail`];
  if (deCal.status === "fulfilled") {
    aplicar("gcal", deCal.value);
    partes.push(`${deCal.value.length} eventos`);
  } else partes.push(`Calendar: ${deCal.reason.message}`);
  if (deYT.status === "fulfilled") {
    aplicar("youtube", deYT.value);
    if (deYT.value.length) partes.push("YouTube");
  } else partes.push(deYT.reason.message);
  return partes.join(" · ");
});

const sincronizarInstagram = () => correr("instagram", "Instagram", async () => {
  const cfg = estado.config;
  const nuevo = await instagram.renovarSiHaceFalta(cfg.igToken, cfg.igRenovadoEn);
  if (nuevo) {
    cfg.igToken = nuevo.token;
    cfg.igRenovadoEn = nuevo.renovado;
  }
  return aplicar("instagram", await instagram.sincronizar(cfg.igToken));
});

const sincronizarMP = () => correr("mp", "Mercado Pago", async () => aplicar("mp", await mercadopago.sincronizar(estado.config.mpToken)));

const sincronizarCotizaciones = () => correr("cotizaciones", "Cotizaciones", async () => {
  estado.config.cotizacion = await cotizaciones.sincronizar(estado.config.casaDolar);
  guardar();
  return `dólar ${estado.config.cotizacion.casa} ${fmt(estado.config.cotizacion.tasas.USD, "ARS")}`;
});

async function sincronizarTodo() {
  await sincronizarCotizaciones();
  if (estado.config.mpToken) await sincronizarMP();
  if (estado.config.googleClientId) await sincronizarGoogle();
  if (estado.config.igToken) await sincronizarInstagram();
}

function estadoConexion(id) {
  const c = estado.config.conexiones[id];
  if (!c) return el("span", { className: "estado", textContent: "sin sincronizar" });
  return el("span", { className: `estado ${c.ok ? "ok" : "error"}`, textContent: `${c.ok ? "✓" : "✗"} ${fmtHace(c.cuando)} — ${c.detalle}` });
}

function boton(texto, fn, clase = "") {
  const b = el("button", { type: "button", textContent: texto, className: clase });
  b.onclick = fn;
  return b;
}

function tarjetaConexion(titulo, id, descripcion, ...cuerpo) {
  return el("div", { className: "conexion" },
    el("h3", {}, titulo, id ? estadoConexion(id) : null),
    el("p", { textContent: descripcion }),
    ...cuerpo);
}

function pasos(resumen, lista) {
  return el("details", {}, el("summary", { textContent: resumen }), el("ol", {}, ...lista.map((t) => el("li", { textContent: t }))));
}

function tarjetaGoogle(cfg) {
  const clientId = el("input", { placeholder: "ID de cliente OAuth (….apps.googleusercontent.com)", value: cfg.googleClientId });
  clientId.onchange = () => { cfg.googleClientId = clientId.value.trim(); guardar(); };
  return tarjetaConexion("✉️ Gmail + 📅 Google Calendar", "google",
    "Lee (solo lectura) los mails de los últimos 30 días y arma resúmenes de bancos, suscripciones, facturas a pagar, redes sociales y mails importantes sin leer. Suma los eventos del calendario de hoy al mes que viene y tu canal de YouTube (si tenés). El acceso dura 1 hora y no se guarda.",
    clientId,
    el("div", { className: "botones" },
      boton("Conectar y sincronizar", sincronizarGoogle),
      boton("Desconectar", () => { googleAuth.cerrarSesion(); estado.entradas = estado.entradas.filter((e) => e.origen !== "gmail" && e.origen !== "gcal"); delete cfg.conexiones.google; guardar(); render(); }, "sec")),
    pasos("Cómo conseguir el ID de cliente (una sola vez, gratis)", [
      "Entrá a console.cloud.google.com y creá un proyecto.",
      "APIs y servicios → Biblioteca: habilitá “Gmail API”, “Google Calendar API” y “YouTube Data API v3”.",
      "Pantalla de consentimiento OAuth: tipo Externo, y agregá tu mail como usuario de prueba.",
      `Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web. En “Orígenes de JavaScript autorizados” poné esta dirección: ${location.origin}`,
      "Copiá el ID de cliente y pegalo arriba.",
    ]),
  );
}

function renderConexiones() {
  const cfg = estado.config;

  const google = EN_APK ? tarjetaConexion("✉️ Gmail + 📅 Google Calendar", null,
    "Google no permite iniciar sesión dentro de apps instaladas como esta. Para traer Gmail y Calendar: abrí la versión web en tu computadora (ver README), conectala, tocá Exportar y después Importá esa copia acá con su PIN.")
    : tarjetaGoogle(cfg);

  const mpToken = el("input", { type: "password", placeholder: "Access Token de producción (APP_USR-…)", value: cfg.mpToken, autocomplete: "off" });
  mpToken.onchange = () => { cfg.mpToken = mpToken.value.trim(); guardar(); };
  const mp = tarjetaConexion("💙 Mercado Pago", "mp",
    "Saldo disponible (si tu cuenta lo permite) y cobros de los últimos 30 días, con la API oficial.",
    mpToken,
    el("div", { className: "botones" },
      boton("Sincronizar", sincronizarMP),
      boton("Olvidar token", () => { cfg.mpToken = ""; estado.entradas = estado.entradas.filter((e) => e.origen !== "mp"); delete cfg.conexiones.mp; guardar(); render(); }, "sec")),
    el("p", { className: "aviso", textContent: "⚠️ El token da acceso completo a tu cuenta de Mercado Pago y queda guardado en este navegador. Usalo solo en un dispositivo tuyo; si lo perdés, revocalo desde Tus integraciones." }),
    pasos("Cómo conseguir el token", [
      "Entrá a mercadopago.com.ar/developers → Tus integraciones → Crear aplicación.",
      "En la aplicación, abrí “Credenciales de producción” y copiá el Access Token.",
    ]),
  );

  const banco = el("input", { placeholder: "Nombre de la cuenta (ej: Galicia caja de ahorro)" });
  const archivo = el("input", { type: "file", accept: ".csv,.txt,.ofx,.qfx" });
  archivo.onchange = async () => {
    const f = archivo.files[0];
    archivo.value = "";
    if (!f) return;
    const nombre = banco.value.trim() || f.name.replace(/\.[^.]+$/, "");
    const origen = `extracto:${nombre.toLowerCase()}`;
    await correr(origen, `Extracto ${nombre}`, async () => aplicar(origen, extractoAEntradas(nombre, leerExtracto(f.name, await f.text()))));
  };
  const importados = Object.keys(cfg.conexiones).filter((k) => k.startsWith("extracto:"));
  const extractos = tarjetaConexion("🏦 Cualquier banco o billetera (extractos)", null,
    "Galicia, Santander, BBVA, Nación, Provincia, Macro, Brubank, Ualá, Naranja X, Binance, etc.: descargá los movimientos desde el home banking en CSV, Excel guardado como CSV u OFX, e importalos. Toma el saldo, arma el resumen de cada mes y detecta suscripciones.",
    banco, archivo,
    ...importados.map((k) => el("div", { className: "botones" },
      el("span", { textContent: k.slice(9) }), estadoConexion(k),
      boton("Quitar", () => { estado.entradas = estado.entradas.filter((e) => e.origen !== k); delete cfg.conexiones[k]; guardar(); render(); }, "sec"))),
  );

  const casa = el("select", {}, ...cotizaciones.CASAS_DOLAR.map((c) => el("option", { value: c, textContent: `Dólar ${c}`, selected: c === cfg.casaDolar })));
  casa.onchange = () => { cfg.casaDolar = casa.value; sincronizarCotizaciones(); };
  const cot = tarjetaConexion("💱 Cotizaciones (dólar, euro, cripto)", "cotizaciones",
    "Se actualizan solas al abrir la app. Pasa a pesos todo lo que tengas en USD, EUR, BRL, BTC, ETH, USDT, USDC, SOL o DAI (cargá el monto con esa moneda).",
    casa,
    el("div", { className: "botones" }, boton("Actualizar", sincronizarCotizaciones)),
  );

  const igToken = el("input", { type: "password", placeholder: "Token de Instagram (IGAA…)", value: cfg.igToken, autocomplete: "off" });
  igToken.onchange = () => { cfg.igToken = igToken.value.trim(); cfg.igRenovadoEn = 0; guardar(); };
  const redesIg = tarjetaConexion("📸 Instagram", "instagram",
    "Sin Facebook: seguidores, comentarios nuevos, conversaciones con mensajes y tus últimas publicaciones. Necesita cuenta profesional (creador, gratis). El token dura 60 días y la app lo renueva sola mientras la abras.",
    igToken,
    el("div", { className: "botones" },
      boton("Sincronizar", sincronizarInstagram),
      boton("Olvidar token", () => { cfg.igToken = ""; cfg.igRenovadoEn = 0; estado.entradas = estado.entradas.filter((e) => e.origen !== "instagram"); delete cfg.conexiones.instagram; guardar(); render(); }, "sec")),
    el("p", { className: "aviso", textContent: "⚠️ El token da acceso a tu Instagram (puede leer y responder mensajes). Pegalo solo acá: queda cifrado con tu PIN. Si se filtra, quitá la app en Instagram → Configuración → Apps y sitios web." }),
    pasos("Cómo conseguir el token (una sola vez, gratis)", [
      "En Instagram: Configuración → Tipo de cuenta y herramientas → Cambiar a cuenta profesional → Creador (tu perfil se ve igual).",
      "Entrá a developers.facebook.com → Mis apps → Crear app → caso de uso “Administrar mensajes y contenido en Instagram”. No hace falta página de Facebook.",
      "En la app: Roles de la app → Roles → Agregar personas → Evaluador de Instagram → tu usuario. Aceptá la invitación en Instagram → Configuración → Apps y sitios web → Invitaciones de evaluador.",
      "Volvé a Instagram API → “Configuración de la API con inicio de sesión de Instagram” → Generar tokens de acceso → Agregar cuenta → entrá con tu Instagram.",
      "Tocá “Generar token”, copialo y pegalo arriba.",
    ]),
  );

  const redes = tarjetaConexion("📱 Facebook, X, TikTok, WhatsApp y otras", null,
    "Facebook, X, TikTok, WhatsApp y LinkedIn: no dan acceso gratis a tus datos personales (la API de X es paga; TikTok, WhatsApp y LinkedIn solo para empresas aprobadas). La app las resume con los mails de aviso que llegan a Gmail: activá las notificaciones por correo en cada una (Configuración → Notificaciones → Correo electrónico). YouTube se conecta solo con Google.");

  const seguridad = tarjetaConexion("🔐 Seguridad", null,
    "Todo se guarda cifrado con tu PIN (AES-256) solo en este dispositivo; nada se sube a ningún servidor propio. La app se bloquea sola a los 5 minutos sin uso o al salir de ella más de 1 minuto. Las copias exportadas también van cifradas con el PIN.",
    el("div", { className: "botones" },
      boton("Bloquear ahora", bloquear),
      boton("Cambiar PIN", cambiarPin, "sec"),
      boton("Borrar todos los datos", borrarTodo, "peligro")),
  );

  $("#conexiones").replaceChildren(el("h2", { textContent: "Conexiones" }), seguridad, google, redesIg, mp, extractos, cot, redes);
}

// ---- Formulario ----
const form = $("#formulario");
form.elements.categoria.replaceChildren(...CATEGORIAS.map((c) => el("option", { value: c.id, textContent: `${c.icono} ${c.nombre}` })));

function abrirFormulario(e) {
  form.reset();
  $("#titulo-form").textContent = e ? "Editar entrada" : "Nueva entrada";
  $("#btn-borrar").hidden = !e;
  $("#aviso-sync").hidden = !e?.origen;
  $("#aviso-sync").textContent = e?.origen ? `Viene de ${NOMBRE_ORIGEN(e.origen)}: la próxima sincronización va a reemplazar tus cambios.` : "";
  const base = e || {
    id: "", categoria: estado.categoria || "otros", prioridad: "media", moneda: "ARS",
    frecuencia: estado.vista === "hoy" ? "diario" : estado.vista === "mes" ? "mensual" : "unico",
    fecha: estado.vista === "hoy" ? estado.dia : hoyISO(),
  };
  for (const [k, v] of Object.entries(base)) if (form.elements[k] && typeof v !== "boolean") form.elements[k].value = v ?? "";
  $("#dialogo").showModal();
}

form.onsubmit = (ev) => {
  ev.preventDefault();
  const datos = Object.fromEntries(new FormData(form));
  const previa = estado.entradas.find((x) => x.id === datos.id);
  const entrada = normalizar({ ...previa, ...datos, id: datos.id || nuevoId() });
  estado.entradas = previa ? estado.entradas.map((x) => (x.id === entrada.id ? entrada : x)) : [...estado.entradas, entrada];
  guardar();
  $("#dialogo").close();
  render();
};

$("#btn-cancelar").onclick = () => $("#dialogo").close();
$("#btn-borrar").onclick = () => {
  if (!confirm("¿Borrar esta entrada?")) return;
  estado.entradas = estado.entradas.filter((x) => x.id !== form.elements.id.value);
  guardar();
  $("#dialogo").close();
  render();
};

// ---- Controles ----
$("#btn-nuevo").onclick = () => abrirFormulario(null);
$("#btn-sync").onclick = sincronizarTodo;
document.querySelectorAll(".pestanas button").forEach((b) => (b.onclick = () => { estado.vista = b.dataset.vista; render(); }));
$("#buscar").oninput = (ev) => { estado.texto = ev.target.value; renderLista(); };
$("#selector-dia").value = estado.dia;
$("#selector-dia").onchange = (ev) => { estado.dia = ev.target.value || hoyISO(); render(); };
$("#selector-mes").value = estado.mes;
$("#selector-mes").onchange = (ev) => { estado.mes = ev.target.value || hoyISO().slice(0, 7); render(); };

// La copia de seguridad va cifrada con el PIN actual (incluye entradas y conexiones).
$("#btn-exportar").onclick = async () => {
  const texto = JSON.stringify(await cifrar(estado.llave, { entradas: estado.entradas, config: estado.config }));
  const nombre = `todo-en-uno-${hoyISO()}.cifrado.json`;
  if (EN_APK) return window.Android.guardarArchivo(nombre, texto);
  const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  el("a", { href: url, download: nombre }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Combina una copia (cifrada o vieja en texto plano) con lo que ya hay en este dispositivo.
$("#input-importar").onchange = async (ev) => {
  const archivo = ev.target.files[0];
  ev.target.value = "";
  if (!archivo) return;
  try {
    const texto = await archivo.text();
    const json = JSON.parse(texto);
    let nuevas, config = {};
    if (esBoveda(json)) {
      const r = await pedirPin({ titulo: "Importar copia", texto: "PIN con el que se exportó la copia", cancelable: true,
        verificar: (pin) => abrir(pin, json) });
      if (!r) return;
      nuevas = (r.datos.entradas || []).map(normalizar);
      config = r.datos.config || {};
    } else {
      nuevas = importar(texto);
    }
    if (!confirm(`Importar ${nuevas.length} entradas? Se combinan con las ${estado.entradas.length} de este dispositivo.`)) return;
    estado.entradas = combinar(estado.entradas, nuevas);
    // Los tokens/IDs de este dispositivo tienen prioridad; solo se completan los vacíos.
    for (const k of ["googleClientId", "igToken", "mpToken"]) if (!estado.config[k] && config[k]) estado.config[k] = config[k];
    estado.config.conexiones = { ...config.conexiones, ...estado.config.conexiones };
    await guardar();
    render();
    mostrarEstado(`Importadas ${nuevas.length} entradas.`);
  } catch (err) {
    alert(`No se pudo importar: ${err.message}`);
  }
};

desbloquear();

// ---- Instalar como app ----
const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let pedidoInstalar = null;
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
  // Si en unos segundos Chrome no ofreció el botón, mostramos cómo hacerlo a mano.
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
