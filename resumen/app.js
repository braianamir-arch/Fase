import {
  CATEGORIAS, normalizar, nuevoId, hoyISO, ordenarPorPrioridad, delDia, delMes,
  buscar, totales, proximosVencimientos, proximoCobro, exportar, importar, fusionar, enPesos,
} from "./core.js";
import * as gmail from "./conectores/gmail.js";
import * as googleAuth from "./conectores/google.js";
import * as mercadopago from "./conectores/mercadopago.js";
import * as cotizaciones from "./conectores/cotizaciones.js";
import { leerExtracto, extractoAEntradas } from "./conectores/extracto.js";

const CLAVE = "todo-en-uno:v1";
const CLAVE_CONFIG = "todo-en-uno:config";
const $ = (s) => document.querySelector(s);

const estado = {
  entradas: cargar(CLAVE, []).map(normalizar),
  config: { googleClientId: "", mpToken: "", casaDolar: "blue", cotizacion: null, conexiones: {}, ...cargar(CLAVE_CONFIG, {}) },
  vista: "inicio",
  categoria: null,
  texto: "",
  dia: hoyISO(),
  mes: hoyISO().slice(0, 7),
};

function cargar(clave, defecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? defecto;
  } catch {
    return defecto;
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado.entradas));
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify(estado.config));
  } catch (err) {
    alert(`No se pudo guardar: ${err.message}. Exportá una copia.`);
  }
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
const NOMBRE_ORIGEN = (o) => (o === "gmail" ? "Gmail" : o === "gcal" ? "Calendar" : o === "mp" ? "Mercado Pago" : o?.startsWith("extracto:") ? "extracto" : o);

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
  const [deGmail, deCal] = await Promise.all([gmail.sincronizar(token), googleAuth.sincronizarCalendar(token)]);
  aplicar("gmail", deGmail);
  aplicar("gcal", deCal);
  return `${deGmail.length} resúmenes de Gmail y ${deCal.length} eventos`;
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

function renderConexiones() {
  const cfg = estado.config;

  const clientId = el("input", { placeholder: "ID de cliente OAuth (….apps.googleusercontent.com)", value: cfg.googleClientId });
  clientId.onchange = () => { cfg.googleClientId = clientId.value.trim(); guardar(); };
  const google = tarjetaConexion("✉️ Gmail + 📅 Google Calendar", "google",
    "Lee (solo lectura) los mails de los últimos 30 días y arma resúmenes de bancos, suscripciones, facturas a pagar, redes sociales y mails importantes sin leer. Suma los eventos del calendario de hoy al mes que viene. El acceso dura 1 hora y no se guarda.",
    clientId,
    el("div", { className: "botones" },
      boton("Conectar y sincronizar", sincronizarGoogle),
      boton("Desconectar", () => { googleAuth.cerrarSesion(); estado.entradas = estado.entradas.filter((e) => e.origen !== "gmail" && e.origen !== "gcal"); delete cfg.conexiones.google; guardar(); render(); }, "sec")),
    pasos("Cómo conseguir el ID de cliente (una sola vez, gratis)", [
      "Entrá a console.cloud.google.com y creá un proyecto.",
      "APIs y servicios → Biblioteca: habilitá “Gmail API” y “Google Calendar API”.",
      "Pantalla de consentimiento OAuth: tipo Externo, y agregá tu mail como usuario de prueba.",
      `Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web. En “Orígenes de JavaScript autorizados” poné esta dirección: ${location.origin}`,
      "Copiá el ID de cliente y pegalo arriba.",
    ]),
  );

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

  const redes = tarjetaConexion("📱 Redes sociales", null,
    "Instagram, Facebook, X, TikTok, YouTube, LinkedIn, WhatsApp, Discord, Reddit, Twitch y Pinterest no dejan leer tus notificaciones personales con su API. La app las resume a partir de los mails de aviso que te mandan a Gmail (activá esos avisos en cada red).");

  $("#conexiones").replaceChildren(el("h2", { textContent: "Conexiones" }), google, mp, extractos, cot, redes);
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

$("#btn-exportar").onclick = () => {
  const url = URL.createObjectURL(new Blob([exportar(estado.entradas)], { type: "application/json" }));
  el("a", { href: url, download: `todo-en-uno-${hoyISO()}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$("#input-importar").onchange = async (ev) => {
  const archivo = ev.target.files[0];
  ev.target.value = "";
  if (!archivo) return;
  try {
    const nuevas = importar(await archivo.text());
    if (!confirm(`Importar ${nuevas.length} entradas? Reemplaza las actuales (${estado.entradas.length}).`)) return;
    estado.entradas = nuevas;
    guardar();
    render();
  } catch (err) {
    alert(`No se pudo importar: ${err.message}`);
  }
};

render();
// Al abrir: cotizaciones y Mercado Pago se actualizan solos (Google necesita un clic por el login).
sincronizarCotizaciones().then(() => estado.config.mpToken && sincronizarMP());
