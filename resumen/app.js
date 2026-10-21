import {
  CATEGORIAS, normalizar, nuevoId, hoyISO, ordenarPorPrioridad, delDia, delMes,
  buscar, totales, proximosVencimientos, proximoCobro, exportar, importar,
} from "./core.js";

const CLAVE = "todo-en-uno:v1";
const $ = (s) => document.querySelector(s);

const estado = {
  entradas: cargar(),
  vista: "inicio",
  categoria: null,
  texto: "",
  dia: hoyISO(),
  mes: hoyISO().slice(0, 7),
};

function cargar() {
  try {
    return (JSON.parse(localStorage.getItem(CLAVE)) || []).map(normalizar);
  } catch {
    return [];
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado.entradas));
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
const cat = (id) => CATEGORIAS.find((c) => c.id === id);

function render() {
  document.querySelectorAll(".pestanas button").forEach((b) => b.classList.toggle("activa", b.dataset.vista === estado.vista));
  $("#selector-dia").hidden = estado.vista !== "hoy";
  $("#selector-mes").hidden = estado.vista !== "mes";
  renderTotales();
  renderVencimientos();
  renderChips();
  renderLista();
}

function renderTotales() {
  const caja = $("#resumen-totales");
  caja.hidden = estado.vista === "hoy";
  const t = totales(estado.entradas);
  const tarjeta = (etq, val) => el("div", { className: "tarjeta" }, el("div", { className: "etq", textContent: etq }), el("div", { className: "val", textContent: val }));
  caja.replaceChildren(
    tarjeta("💰 Disponible total", fmtMonedas(t.disponible)),
    tarjeta("🏦 En bancos", fmtMonedas(t.bancos)),
    tarjeta("💵 Efectivo", fmtMonedas(t.efectivo)),
    tarjeta("🔁 Suscripciones / mes", fmtMonedas(t.suscripcionesMes)),
  );
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
    cuerpo.push(el("p", { className: "vacio", textContent: estado.entradas.length ? "No hay entradas para mostrar acá." : "Todavía no cargaste nada. Tocá “+ Nuevo”." }));
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
    extra,
  ].filter(Boolean).join(" · ");

  const fila = el("article", { className: `item ${e.prioridad}${e.hecho ? " hecho" : ""}` },
    check,
    el("div", {},
      el("div", { className: "tit", textContent: e.titulo }),
      el("div", { className: "meta", textContent: meta }),
      e.nota ? el("div", { className: "nota", textContent: e.nota }) : null),
    e.monto != null ? el("div", { className: "monto", textContent: fmt(e.monto, e.moneda) }) : el("span"),
  );
  fila.onclick = () => abrirFormulario(e);
  return fila;
}

// ---- Formulario ----
const form = $("#formulario");
form.elements.categoria.replaceChildren(...CATEGORIAS.map((c) => el("option", { value: c.id, textContent: `${c.icono} ${c.nombre}` })));

function abrirFormulario(e) {
  form.reset();
  $("#titulo-form").textContent = e ? "Editar entrada" : "Nueva entrada";
  $("#btn-borrar").hidden = !e;
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
  const entrada = normalizar({ ...datos, id: datos.id || nuevoId(), hecho: previa?.hecho });
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
