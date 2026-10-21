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
import * as ia from "./conectores/ia.js";
import { PROVEEDORES, entradasServicios, validarNumero, proveedorDe } from "./conectores/servicios.js";
import { paginaBaja } from "./conectores/bajas.js";
import { crearLlave, cifrar, abrir, esBoveda, validarPin, esperaPorIntentos } from "./seguridad.js";
import { lineaTiempo, miniBarras, medidor } from "./graficos.js";
import { icono } from "./iconos.js";

const CLAVE_BOVEDA = "todo-en-uno:boveda";
// Versiones viejas guardaban en texto plano: se migran a la bóveda y se borran.
const CLAVES_VIEJAS = ["todo-en-uno:v1", "todo-en-uno:config"];
const BLOQUEO_INACTIVO_MS = 5 * 60000;
const BLOQUEO_OCULTO_MS = 60000;
const MAX_HISTORIAL = 90;
// En el APK de Android existe el puente nativo window.Android.
const EN_APK = typeof window.Android?.guardarArchivo === "function";
const $ = (s) => document.querySelector(s);

const configInicial = () => ({
  nombre: "", googleClientId: "", igToken: "", igRenovadoEn: 0, mpToken: "", claudeKey: "",
  casaDolar: "blue", cotizacion: null, conexiones: {}, numerosServicios: {},
  historial: [], mpMovimientos: [], ia: null,
});

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
const fmtHace = (iso) => (iso ? new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "nunca");
const cat = (id) => CATEGORIAS.find((c) => c.id === id);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

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
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => (t.hidden = true), 2600);
}

function mostrarEstado(texto, error = false) {
  const p = $("#estado-sync");
  p.hidden = !texto;
  p.textContent = texto || "";
  p.classList.toggle("error", error);
}

// ---- PIN, bloqueo y desbloqueo ----
const dialogoPin = $("#dialogo-pin");
const formPin = $("#form-pin");
$("#pin-logo").append(icono("candado"));

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
    const r = await pedirPin({ titulo: "Todo en uno", texto: "Ingresá tu PIN", verificar: (pin) => abrir(pin, boveda) });
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
  // Los extractos bancarios ya no existen: se descartan sus entradas.
  estado.entradas = (datos.entradas || []).filter((e) => !String(e.origen || "").startsWith("extracto:")).map(normalizar);
  estado.config = { ...configInicial(), ...datos.config };
  for (const k of Object.keys(estado.config.conexiones)) if (k.startsWith("extracto:")) delete estado.config.conexiones[k];
  actualizarServicios();
  registrarHistorial();
  await guardar();
  CLAVES_VIEJAS.forEach((k) => localStorage.removeItem(k));
  document.body.classList.remove("bloqueada");
  render();
  reiniciarInactividad();
  // Al abrir se actualiza solo lo que no necesita un clic (Google pide login).
  (async () => {
    await sincronizarCotizaciones();
    if (estado.llave && estado.config.mpToken) await sincronizarMP();
    if (estado.llave && estado.config.igToken) await sincronizarInstagram();
    if (estado.llave) await resumirIA();
  })();
}

function bloquear() {
  if (!estado.llave) return;
  estado.llave = null;
  estado.entradas = [];
  estado.config = configInicial();
  googleAuth.cerrarSesion();
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  $("#vista").replaceChildren();
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
  toast("PIN cambiado");
}

function borrarTodo() {
  if (!confirm("¿Borrar TODOS los datos de este dispositivo? No se puede deshacer.")) return;
  if (!confirm("Última confirmación: se borran entradas, tokens y PIN.")) return;
  estado.llave = null;
  localStorage.removeItem(CLAVE_BOVEDA);
  CLAVES_VIEJAS.forEach((k) => localStorage.removeItem(k));
  location.reload();
}

// ---- Datos derivados ----
function totalEnPesos() {
  const t = totales(estado.entradas);
  const tasas = estado.config.cotizacion?.tasas || {};
  return { t, ...enPesos(t.disponible, tasas) };
}

// Un punto por día con el total disponible en pesos, para el gráfico del inicio.
function registrarHistorial() {
  const { total } = totalEnPesos();
  const hoy = hoyISO();
  const h = (estado.config.historial || []).filter((p) => p.fecha !== hoy);
  if (total > 0 || h.length) h.push({ fecha: hoy, valor: total });
  estado.config.historial = h.slice(-MAX_HISTORIAL);
}

function actualizarServicios() {
  const nuevas = entradasServicios(estado.config.numerosServicios, estado.entradas, hoyISO());
  estado.entradas = fusionar(estado.entradas, nuevas, "servicio");
}

// ---- Render ----
const VISTAS = [
  ["inicio", "Inicio", "inicio"],
  ["hoy", "Hoy", "hoy"],
  ["mes", "Mes", "mes"],
  ["todo", "Todo", "todo"],
  ["conexiones", "Conexiones", "conexiones"],
];

function renderRiel() {
  const riel = $("#riel");
  const botones = VISTAS.map(([id, nombre, ico]) => {
    const b = el("button", { type: "button", title: nombre, className: estado.vista === id ? "activa" : "" }, icono(ico));
    b.setAttribute("aria-label", nombre);
    if (estado.vista === id) b.setAttribute("aria-current", "page");
    b.onclick = () => { estado.vista = id; estado.categoria = null; render(); scrollTo(0, 0); };
    return b;
  });
  const candado = el("button", { type: "button", title: "Bloquear" }, icono("candado"));
  candado.setAttribute("aria-label", "Bloquear");
  candado.onclick = bloquear;
  riel.replaceChildren(el("div", { className: "logo" }, icono("hoy")), ...botones, el("span", { className: "separador" }), candado);
}

function renderCabecera() {
  const nombre = estado.config.nombre?.trim();
  $("#saludo").textContent = `¡Hola${nombre ? `, ${nombre}` : ""}!`;
  const subs = {
    inicio: "Así viene tu día: lo importante primero",
    hoy: `Resumen del ${fmtFecha(estado.dia)}`,
    mes: `Resumen de ${new Date(`${estado.mes}-15T12:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`,
    todo: "Todo, ordenado por prioridad",
    conexiones: "Tus cuentas, servicios y seguridad",
  };
  $("#subtitulo").textContent = subs[estado.vista];
  $(".buscador").hidden = estado.vista === "conexiones" || estado.vista === "inicio";
}

function render() {
  if (!estado.llave) return;
  renderRiel();
  renderCabecera();
  const vista = { inicio: vistaInicio, hoy: vistaHoy, mes: vistaMes, todo: vistaTodo, conexiones: vistaConexiones }[estado.vista];
  $("#vista").replaceChildren(...vista());
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
  const { t, total, sinTasa } = totalEnPesos();
  const cot = estado.config.cotizacion;
  const hist = estado.config.historial.slice(-7).map((p) => p.valor);
  // Los accesos directos (origen "servicio") no son facturas: no cuentan como pendientes.
  const servicios = estado.entradas.filter((e) => e.categoria === "servicios" && !e.hecho && e.origen !== "servicio");
  const subs = estado.entradas.filter((e) => e.categoria === "suscripciones" && !e.hecho);
  const urgentes = estado.entradas.filter((e) => !e.hecho && e.prioridad === "alta");
  return [
    kpi("Disponible", fmt(total), cot ? `dólar ${cot.casa} ${fmt(cot.tasas.USD)}${sinTasa.length ? ` · sin cotizar ${sinTasa.join(", ")}` : ""}` : "en pesos",
      hist.length > 1 ? miniBarras(hist) : null, { ico: "billetera" }),
    kpi("Servicios a pagar", fmtMonedas(t.serviciosPendientes), plural(servicios.length, "pendiente", "pendientes"), null, { ico: "rayo" }),
    kpi("Suscripciones / mes", fmtMonedas(t.suscripcionesMes), plural(subs.length, "activa", "activas"), null, { ico: "repetir" }),
    kpi("Para hacer hoy", String(urgentes.length), urgentes.length ? "con prioridad alta" : "todo al día", null, { destacada: true, ico: "campana" }),
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
      boton("Configurar resúmenes", () => { estado.vista = "conexiones"; render(); }));
  } else if (!cfg.ia) {
    t.append(el("p", { className: "vacio-ia", textContent: "Todavía no hay resumen." }), boton("Resumir ahora", () => resumirIA({ forzar: true }), "", "chispa"));
  } else {
    t.append(el("ul", {}, ...cfg.ia.resumen.map((r) => el("li", { textContent: r }))));
    cab.append(boton("", () => resumirIA({ forzar: true }), "redondo", "sync"));
    cab.lastChild.title = "Volver a resumir";
    cab.lastChild.setAttribute("aria-label", "Volver a resumir");
  }
  return t;
}

function tarjetaBalance() {
  const puntos = estado.config.historial.slice(-30);
  const ult = puntos.at(-1)?.valor ?? 0, prev = puntos.at(-2)?.valor;
  const delta = prev ? ((ult - prev) / prev) * 100 : null;
  return el("section", { className: "tarjeta ancho-2" },
    el("div", { className: "cab-tarjeta" },
      el("div", {}, el("h2", { textContent: "Balance" }), el("p", { className: "sub", textContent: "Disponible en pesos, últimos 30 días" })),
      delta != null && Math.abs(delta) >= 0.05 ? el("span", { className: `pildora ${delta >= 0 ? "ok" : "mal"}`, textContent: `${delta >= 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")}%` }) : null),
    lineaTiempo(puntos, { formato: (v) => fmt(v) }));
}

function tarjetaMedidor() {
  const delMesActual = estado.entradas.filter((e) => e.categoria === "servicios" && e.origen !== "servicio");
  const pagados = delMesActual.filter((e) => e.hecho).length;
  const pct = delMesActual.length ? pagados / delMesActual.length : 0;
  return el("section", { className: "tarjeta" },
    el("h2", { textContent: "Servicios" }),
    el("p", { className: "sub", textContent: "Agua, luz y gas del mes" }),
    medidor(pct, { etiqueta: "pagados" }),
    el("p", { className: "pie-medidor", textContent: delMesActual.length ? `${pagados} de ${delMesActual.length} pagados` : "Cargá tus números en Conexiones" }));
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
    el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Próximos 7 días" }), el("p", { className: "sub", textContent: "Vencimientos y cobros" }))),
    prox.length
      ? el("ul", { className: "lista-mini" }, ...prox.slice(0, 5).map(({ entrada, enDias }) => el("li", {},
          el("div", { className: "txt" }, el("div", { className: "t1", textContent: entrada.titulo }),
            el("div", { className: "t2", textContent: enDias === 0 ? "hoy" : enDias === 1 ? "mañana" : `en ${enDias} días` })),
          entrada.monto != null ? el("span", { className: "pildora neutra", textContent: fmt(entrada.monto, entrada.moneda) }) : null)))
      : el("p", { className: "sub", textContent: "Nada vence esta semana." }));
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
    el("p", { textContent: "Cifrados con tu PIN, solo en este teléfono." }),
    el("ul", { className: "estado-conexiones" },
      fila("Gmail", "google", !!estado.config.googleClientId),
      fila("Mercado Pago", "mp", !!estado.config.mpToken),
      fila("Instagram", "instagram", !!estado.config.igToken),
      fila("Resúmenes IA", "ia", !!estado.config.claudeKey)),
    boton("Bloquear ahora", bloquear, "", "candado"));
}

function vistaInicio() {
  const urgentes = ordenarPorPrioridad(buscar(estado.entradas.filter((e) => !e.hecho && e.prioridad === "alta"), estado.texto));
  return [
    el("div", { className: "tablero" },
      ...filaKpis(),
      tarjetaResumenIA(),
      tarjetaBalance(),
      tarjetaMedidor(),
      tarjetaMovimientos(),
      tarjetaVencimientos(),
      tarjetaSeguridad()),
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Prioridad alta" })),
    listaItems(urgentes, "Nada urgente. 🎉"),
  ];
}

// ---- Listas de entradas ----
function chipsCategorias() {
  const chip = (id, texto) => {
    const b = el("button", { type: "button", textContent: texto, className: estado.categoria === id ? "activa" : "" });
    b.onclick = () => { estado.categoria = id; render(); };
    return b;
  };
  return el("div", { className: "chips" }, chip(null, "Todas"), ...CATEGORIAS.map((c) => chip(c.id, `${c.icono} ${c.nombre}`)));
}

function filtrar(lista) {
  if (estado.categoria) lista = lista.filter((e) => e.categoria === estado.categoria);
  return ordenarPorPrioridad(buscar(lista, estado.texto), estado.vista === "hoy" ? estado.dia : hoyISO());
}

function listaItems(lista, vacio = "No hay nada para mostrar acá.") {
  if (!lista.length) return el("p", { className: "vacio", textContent: estado.entradas.length ? vacio : "Todavía no hay nada. Tocá + o conectá tus cuentas en Conexiones." });
  return el("div", { className: "items" }, ...lista.map((e) => item(e)));
}

function vistaHoy() {
  const fecha = el("input", { type: "date", value: estado.dia });
  fecha.onchange = () => { estado.dia = fecha.value || hoyISO(); render(); };
  return [
    el("div", { className: "tablero" }, tarjetaResumenIA("ancho-4")),
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Del día" }), el("div", { className: "selector-fecha" }, fecha)),
    chipsCategorias(),
    listaItems(filtrar(delDia(estado.entradas, estado.dia))),
  ];
}

function vistaMes() {
  const mes = el("input", { type: "month", value: estado.mes });
  mes.onchange = () => { estado.mes = mes.value || hoyISO().slice(0, 7); render(); };
  return [
    el("div", { className: "tablero" }, ...filaKpis()),
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Del mes" }), el("div", { className: "selector-fecha" }, mes)),
    chipsCategorias(),
    listaItems(filtrar(delMes(estado.entradas, estado.mes))),
  ];
}

function vistaTodo() {
  const lista = filtrar(estado.entradas);
  if (estado.categoria || !lista.length) return [chipsCategorias(), listaItems(lista)];
  const grupos = CATEGORIAS.map((c) => [c, lista.filter((e) => e.categoria === c.id)]).filter(([, l]) => l.length);
  return [chipsCategorias(), ...grupos.flatMap(([c, l]) => [
    el("div", { className: "titulo-seccion" }, el("h2", { textContent: `${c.icono} ${c.nombre} · ${l.length}` })),
    listaItems(l),
  ])];
}

const NOMBRE_FREC = { unico: "", diario: "diaria", semanal: "semanal", mensual: "mensual", anual: "anual" };
const NOMBRES_ORIGEN = { gmail: "Gmail", gcal: "Calendar", mp: "Mercado Pago", instagram: "Instagram", youtube: "YouTube", servicio: "Servicios" };

function item(e) {
  const c = cat(e.categoria);
  const resumenIA = estado.config.ia?.items?.[ia.clave(e)]?.resumen;
  const check = el("button", { type: "button", className: "check", title: e.hecho ? "Marcar como pendiente" : "Marcar como hecho" }, icono("check"));
  check.setAttribute("aria-pressed", String(e.hecho));
  check.setAttribute("aria-label", `${e.hecho ? "Desmarcar" : "Marcar"} ${e.titulo}`);
  check.onclick = () => { e.hecho = !e.hecho; registrarHistorial(); guardar(); render(); };

  const cobro = proximoCobro(e);
  const meta = el("div", { className: "meta" },
    el("span", { textContent: `${c.icono} ${c.nombre}` }),
    el("span", { className: `prio-${e.prioridad}`, textContent: `Prioridad ${e.prioridad}` }),
    NOMBRE_FREC[e.frecuencia] ? el("span", { textContent: NOMBRE_FREC[e.frecuencia] }) : null,
    cobro ? el("span", { textContent: `cobra ${fmtFecha(cobro)}` }) : e.frecuencia === "unico" ? el("span", { textContent: fmtFecha(e.fecha) }) : null,
    e.origen ? el("span", { textContent: `🔄 ${NOMBRES_ORIGEN[e.origen] || e.origen}` }) : null);

  // Primero el resumen de la IA; si no hay, la primera línea de la nota.
  const primera = (e.nota || "").split("\n").find((l) => l.trim()) || "";
  const resumen = resumenIA
    ? el("p", { className: "resumen" }, el("span", { className: "chispa" }, icono("chispa")), resumenIA)
    : primera ? el("p", { className: "resumen", textContent: primera.length > 140 ? `${primera.slice(0, 140)}…` : primera }) : null;

  const acciones = el("div", { className: "acciones" });
  const baja = paginaBaja(e);
  if (baja && !e.hecho) acciones.append(boton("Dar de baja", () => darDeBaja(e, baja), "baja"));
  const prov = proveedorDe(e.externoId);
  const numero = prov && validarNumero(estado.config.numerosServicios?.[prov.id]);
  if (prov && numero) acciones.append(boton("Ver factura", () => verFactura(prov, numero), "sec", "externo"));
  if (e.enlace && !(prov && numero)) {
    const a = el("a", { href: e.enlace, target: "_blank", rel: "noopener noreferrer" }, icono("externo"), "Abrir");
    acciones.append(a);
  }
  acciones.append(boton("Editar", () => abrirFormulario(e), "sec"));

  return el("article", { className: `item${e.hecho ? " hecho" : ""}` },
    check,
    el("div", { className: "cuerpo" },
      el("div", { className: "fila-tit" },
        el("span", { className: "tit", textContent: e.titulo }),
        e.monto != null ? el("span", { className: "monto", textContent: fmt(e.monto, e.moneda) }) : null),
      resumen,
      meta,
      e.nota && (resumenIA || e.nota.includes("\n")) ? el("details", {}, el("summary", { textContent: "Ver detalle" }), el("p", { className: "nota", textContent: e.nota })) : null,
      acciones));
}

function darDeBaja(e, url) {
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => {
    if (!confirm(`¿Pudiste dar de baja ${e.titulo}? Si decís que sí, la marco como dada de baja.`)) return;
    e.hecho = true;
    e.nota = `Dada de baja el ${new Date().toLocaleDateString("es-AR")}.\n${e.nota}`.trim();
    guardar();
    render();
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

async function correr(id, nombre, fn) {
  mostrarEstado(`Actualizando ${nombre}…`);
  $("#btn-sync").classList.add("girando");
  try {
    const detalle = await fn();
    marcar(id, true, detalle);
    mostrarEstado("");
    toast(`${nombre}: ${detalle}`);
  } catch (err) {
    marcar(id, false, err.message);
    mostrarEstado(`${nombre}: ${err.message}`, true);
  } finally {
    $("#btn-sync").classList.remove("girando");
  }
  registrarHistorial();
  guardar();
  render();
}

function aplicar(origen, nuevas) {
  estado.entradas = ia.aplicarPrioridades(fusionar(estado.entradas, nuevas, origen), estado.config.ia);
  return `${nuevas.length} al día`;
}

const sincronizarGoogle = () => correr("google", "Google", async () => {
  const token = await googleAuth.obtenerToken(estado.config.googleClientId);
  const [deGmail, deCal, deYT] = await Promise.allSettled([
    gmail.sincronizar(token), googleAuth.sincronizarCalendar(token), youtube.sincronizar(token),
  ]);
  if (deGmail.status === "rejected") throw deGmail.reason;
  aplicar("gmail", deGmail.value);
  actualizarServicios();
  const partes = [`${deGmail.value.length} de Gmail`];
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

const sincronizarMP = () => correr("mp", "Mercado Pago", async () => {
  const r = await mercadopago.sincronizar(estado.config.mpToken);
  estado.config.mpMovimientos = r.movimientos;
  return aplicar("mp", r.entradas);
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

const sincronizarCotizaciones = () => correr("cotizaciones", "Cotizaciones", async () => {
  estado.config.cotizacion = await cotizaciones.sincronizar(estado.config.casaDolar);
  return `dólar ${estado.config.cotizacion.casa} ${fmt(estado.config.cotizacion.tasas.USD)}`;
});

// Resume solo si cambió algo desde el último resumen (cada resumen usa tu crédito de Claude).
async function resumirIA({ forzar = false } = {}) {
  const cfg = estado.config;
  if (!cfg.claudeKey) return;
  const pendientes = ordenarPorPrioridad(estado.entradas);
  const h = ia.huella(pendientes, hoyISO());
  if (!forzar && cfg.ia?.huella === h && cfg.ia.fecha?.slice(0, 10) === hoyISO()) return;
  await correr("ia", "Resumen", async () => {
    const r = await ia.resumir(cfg.claudeKey, pendientes, hoyISO());
    cfg.ia = { ...r, huella: h };
    estado.entradas = ia.aplicarPrioridades(estado.entradas, cfg.ia);
    return `${r.resumen.length} puntos clave`;
  });
}

async function sincronizarTodo() {
  await sincronizarCotizaciones();
  if (estado.config.mpToken) await sincronizarMP();
  if (estado.config.igToken) await sincronizarInstagram();
  if (estado.config.googleClientId) await sincronizarGoogle();
  await resumirIA();
}

// ---- Conexiones ----
function estadoConexion(id) {
  const c = estado.config.conexiones[id];
  if (!c) return el("span", { className: "estado", textContent: "sin sincronizar" });
  return el("span", { className: `estado ${c.ok ? "ok" : "error"}`, textContent: `${c.ok ? "✓" : "✗"} ${fmtHace(c.cuando)} — ${c.detalle}` });
}

function tarjetaConexion(titulo, id, descripcion, ...cuerpo) {
  return el("section", { className: "tarjeta conexion" },
    el("h3", {}, titulo, id ? estadoConexion(id) : null),
    descripcion ? el("p", { textContent: descripcion }) : null,
    ...cuerpo);
}

function pasos(resumen, lista) {
  return el("details", {}, el("summary", { textContent: resumen }), el("ol", {}, ...lista.map((t) => el("li", { textContent: t }))));
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

function vistaConexiones() {
  const cfg = estado.config;

  const seguridad = tarjetaConexion("🔐 Seguridad y copias", null,
    "Todo se guarda cifrado con tu PIN (AES-256) solo en este dispositivo. Se bloquea sola a los 5 minutos sin uso. Las copias exportadas también van cifradas.",
    campo("Tu nombre (para el saludo)", "nombre", { placeholder: "Ej: Braian" }, renderCabecera),
    el("div", { className: "botones" },
      boton("Exportar copia", exportarCopia, "sec"),
      boton("Importar copia", () => $("#input-importar").click(), "sec"),
      boton("Cambiar PIN", cambiarPin, "sec"),
      boton("Borrar todo", borrarTodo, "peligro")));

  const resumenes = tarjetaConexion("✨ Resúmenes con IA (Claude)", "ia",
    "Lee lo que traen tus conexiones y te dice en pocas líneas de qué se trata cada cosa y qué hacer. Usa el modelo Claude Opus 5.5 con tu clave: solo se manda el título y un fragmento de cada entrada, y Anthropic no usa los datos de la API para entrenar.",
    campo("Clave de API de Claude", "claudeKey", { type: "password", placeholder: "sk-ant-…" }),
    el("div", { className: "botones" }, boton("Resumir ahora", () => resumirIA({ forzar: true }), "", "chispa"),
      boton("Olvidar clave", () => { cfg.ia = null; olvidar([], ["claudeKey"], "ia"); }, "sec")),
    el("p", { className: "aviso", textContent: "Cada resumen cuesta unos pocos centavos de dólar de tu crédito. Solo se vuelve a resumir cuando entra algo nuevo." }),
    pasos("Cómo conseguir la clave", [
      "Entrá a console.anthropic.com y creá una cuenta.",
      "En Billing cargá un poco de crédito (con 5 USD alcanza para meses).",
      "En API Keys tocá “Create Key”, copiala y pegala arriba. No la compartas con nadie.",
    ]));

  const google = EN_APK ? tarjetaConexion("✉️ Gmail, 📅 Calendar y ▶️ YouTube", null,
    "Google no permite iniciar sesión dentro de apps instaladas como esta. Usá la versión web (braianamir-arch.github.io/Fase) para conectar Google.")
    : tarjetaConexion("✉️ Gmail, 📅 Calendar y ▶️ YouTube", "google",
      "Solo lectura: facturas de servicios, recibos de suscripciones, avisos de Mercado Pago, Naranja X y MODO, redes y mails importantes. Más tus eventos y tu canal de YouTube.",
      campo("ID de cliente de Google", "googleClientId", { placeholder: "….apps.googleusercontent.com" }),
      el("div", { className: "botones" }, boton("Conectar y sincronizar", sincronizarGoogle),
        boton("Desconectar", () => { googleAuth.cerrarSesion(); olvidar(["gmail", "gcal", "youtube"], [], "google"); }, "sec")),
      pasos("Cómo conseguir el ID (una sola vez)", [
        "console.cloud.google.com → APIs y servicios → Biblioteca: habilitá Gmail API, Google Calendar API y YouTube Data API v3.",
        "Google Auth Platform → Público: modo Prueba y tu mail como usuario de prueba.",
        `Clientes → Crear cliente → Aplicación web, con este origen autorizado: ${location.origin}`,
      ]));

  const servicios = tarjetaConexion("💡 Servicios: agua, luz y gas", null,
    "Las empresas no tienen API: la app trae las facturas que llegan a tu Gmail (activá la factura digital en cada una) y con tu número abre la página de la factura con el número ya copiado.",
    ...PROVEEDORES.map((p) => {
      const input = el("input", { value: cfg.numerosServicios?.[p.id] || "", inputMode: "numeric", placeholder: "Número de cuenta / suministro", autocomplete: "off" });
      input.onchange = () => {
        cfg.numerosServicios = { ...cfg.numerosServicios, [p.id]: validarNumero(input.value) || "" };
        if (input.value && !validarNumero(input.value)) toast("Ese número no parece válido");
        actualizarServicios();
        guardar();
        render();
      };
      return el("label", { className: "campo" }, `${p.icono} ${p.tipo} · ${p.nombre}`, input);
    }));

  const ig = tarjetaConexion("📸 Instagram", "instagram",
    "Seguidores, comentarios nuevos, mensajes y tus últimas publicaciones, sin Facebook. El token se renueva solo.",
    campo("Token de Instagram", "igToken", { type: "password", placeholder: "IGAA…" }, () => (cfg.igRenovadoEn = 0)),
    el("div", { className: "botones" }, boton("Sincronizar", sincronizarInstagram),
      boton("Olvidar token", () => olvidar(["instagram"], ["igToken", "igRenovadoEn"], "instagram"), "sec")),
    pasos("Cómo conseguir el token", [
      "Instagram → Configuración → Tipo de cuenta → Cambiar a cuenta profesional → Creador.",
      "developers.facebook.com → Crear app → caso de uso “Administrar mensajes y contenido en Instagram”.",
      "Roles de la app → Evaluador de Instagram → tu usuario; aceptá la invitación en Instagram.",
      "Instagram API → Generar tokens de acceso → Agregar cuenta → Generar token → pegalo arriba.",
    ]));

  const mp = tarjetaConexion("💙 Mercado Pago", "mp",
    "Saldo disponible y cobros de los últimos 30 días, con la API oficial. Se actualiza sola al abrir la app.",
    campo("Access Token de producción", "mpToken", { type: "password", placeholder: "APP_USR-…" }),
    el("div", { className: "botones" }, boton("Sincronizar", sincronizarMP),
      boton("Olvidar token", () => { cfg.mpMovimientos = []; olvidar(["mp"], ["mpToken"], "mp"); }, "sec")),
    el("p", { className: "aviso", textContent: "⚠️ El token da acceso a tu cuenta: queda cifrado acá y no se lo pases a nadie." }));

  const casa = el("select", {}, ...cotizaciones.CASAS_DOLAR.map((c) => el("option", { value: c, textContent: `Dólar ${c}`, selected: c === cfg.casaDolar })));
  casa.onchange = () => { cfg.casaDolar = casa.value; sincronizarCotizaciones(); };
  const cot = tarjetaConexion("💱 Cotizaciones", "cotizaciones",
    "Pasa a pesos lo que tengas en USD, EUR, BRL o cripto (BTC, ETH, USDT, USDC, SOL, DAI).",
    el("label", { className: "campo" }, "Dólar para convertir", casa));

  const otras = tarjetaConexion("📱 Naranja X, MODO, Facebook, X, TikTok…", null,
    "No tienen API para clientes. La app las resume con los mails de aviso que llegan a Gmail: activá las notificaciones por correo en cada una.");

  return [el("div", { className: "conexiones" }, resumenes, google, servicios, mp, ig, cot, seguridad, otras)];
}

// ---- Formulario ----
const form = $("#formulario");
form.elements.categoria.replaceChildren(...CATEGORIAS.map((c) => el("option", { value: c.id, textContent: `${c.icono} ${c.nombre}` })));

function abrirFormulario(e) {
  form.reset();
  $("#titulo-form").textContent = e ? "Editar entrada" : "Nueva entrada";
  $("#btn-borrar").hidden = !e;
  $("#aviso-sync").hidden = !e?.origen;
  $("#aviso-sync").textContent = e?.origen ? `Viene de ${NOMBRES_ORIGEN[e.origen] || e.origen}: la próxima sincronización puede reemplazar tus cambios.` : "";
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
  const texto = JSON.stringify(await cifrar(estado.llave, { entradas: estado.entradas, config: estado.config }));
  const nombre = `todo-en-uno-${hoyISO()}.cifrado.json`;
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
    for (const k of ["googleClientId", "igToken", "mpToken", "claudeKey", "nombre"]) if (!estado.config[k] && config[k]) estado.config[k] = config[k];
    estado.config.numerosServicios = { ...config.numerosServicios, ...estado.config.numerosServicios };
    estado.config.conexiones = { ...config.conexiones, ...estado.config.conexiones };
    actualizarServicios();
    await guardar();
    render();
    toast(`Importadas ${nuevas.length} entradas`);
  } catch (err) {
    alert(`No se pudo importar: ${err.message}`);
  }
};

// ---- Controles de la cabecera ----
$("#lupa").append(icono("buscar"));
$("#btn-sync").append(icono("sync"));
$("#btn-sync").setAttribute("aria-label", "Sincronizar todo");
$("#btn-sync").onclick = sincronizarTodo;
$("#btn-nuevo").append(icono("mas"));
$("#btn-nuevo").setAttribute("aria-label", "Nueva entrada");
$("#btn-nuevo").onclick = () => abrirFormulario(null);
$("#buscar").oninput = (ev) => {
  estado.texto = ev.target.value;
  if (estado.vista === "inicio" && estado.texto) estado.vista = "todo";
  render();
  $("#buscar").focus();
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
