// Pantallas del perfil "Solo finanzas": inicio con aura, gastos fijos y variables, tarjetas
// con cuotas, próximos meses y ajustes. Recibe de app.js las utilidades comunes (ctx).
import {
  CATEGORIAS_GASTO, nuevoIdF, mesDe, sumarMeses, fijosDelMes, variablesDelMes, estadoFijo,
  cuotasDelMes, resumenTarjeta, resumenMes, proyeccion, consejo, primerMesPago,
} from "./finanzas.js";
import { anilloCategorias } from "./graficos.js";

export const VISTAS_FINANZAS = [
  ["inicio", "Inicio", "inicio"],
  ["gastos", "Gastos", "billetera"],
  ["tarjetas", "Tarjetas", "tarjeta"],
  ["meses", "Meses", "mes"],
  ["ajustes", "Ajustes", "ajustes"],
];

const AURAS = ["lavanda", "rosa", "lima", "naranja", "azul"];
const catF = (id) => CATEGORIAS_GASTO.find((c) => c.id === id) || CATEGORIAS_GASTO.at(-1);
const nombreMes = (mes, largo = true) => new Date(`${mes}-15T12:00`).toLocaleDateString("es-AR", largo ? { month: "long", year: "numeric" } : { month: "long" });
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function crearVistasFinanzas(ctx) {
  const { estado, el, fmt, icono, boton, guardar, render, toast, pedirDatos, irA, hoyISO } = ctx;
  const f = () => estado.finanzas;
  const hoy = () => hoyISO();
  const mesActual = () => mesDe(hoyISO());
  const cambio = (msj) => { guardar(); render(); if (msj) toast(msj); };

  const opcionesCategoria = CATEGORIAS_GASTO.map((c) => [c.id, `${c.icono} ${c.nombre}`]);

  // ---- Formularios (hoja que sube desde abajo) ----
  async function editarGasto(g = null, tipo = "variable") {
    const t = g?.tipo || tipo;
    const datos = await pedirDatos({
      titulo: g ? "Editar gasto" : t === "fijo" ? "Nuevo gasto fijo" : "Nuevo gasto",
      campos: [
        { nombre: "concepto", etiqueta: "Concepto", valor: g?.concepto || "", requerido: true, placeholder: t === "fijo" ? "Alquiler, gimnasio, celular…" : "Súper, nafta, salida…" },
        { nombre: "monto", etiqueta: "Monto", tipo: "number", valor: g?.monto ?? "", requerido: true },
        { nombre: "categoria", etiqueta: "Categoría", tipo: "select", opciones: opcionesCategoria, valor: g?.categoria || "otros" },
        { nombre: "tipo", etiqueta: "Tipo", tipo: "select", opciones: [["variable", "Variable (una vez)"], ["fijo", "Fijo (todos los meses)"]], valor: t },
        { nombre: "fecha", etiqueta: t === "fijo" ? "Desde" : "Fecha", tipo: "date", valor: g?.fecha || (t === "variable" && estado.diaF ? estado.diaF : hoy()) },
        { nombre: "dia", etiqueta: "Día que vence (si es fijo)", tipo: "number", valor: g?.dia ?? "", min: 1, max: 31 },
        { nombre: "hasta", etiqueta: "Hasta (si es fijo y termina)", tipo: "month", valor: g?.hasta || "" },
      ],
      borrar: Boolean(g),
    });
    if (!datos) return;
    if (datos.borrar) {
      f().gastos = f().gastos.filter((x) => x.id !== g.id);
      return cambio("Gasto borrado");
    }
    const nuevo = {
      id: g?.id || nuevoIdF(), concepto: datos.concepto.trim(), monto: Number(datos.monto), categoria: datos.categoria,
      tipo: datos.tipo, fecha: datos.fecha || hoy(), dia: Number(datos.dia) || Number((datos.fecha || hoy()).slice(8, 10)),
      hasta: datos.hasta || null, pagos: g?.pagos || {},
    };
    f().gastos = g ? f().gastos.map((x) => (x.id === g.id ? nuevo : x)) : [...f().gastos, nuevo];
    cambio(g ? "Gasto actualizado" : "Gasto agregado");
  }

  async function editarTarjeta(t = null) {
    const datos = await pedirDatos({
      titulo: t ? "Editar tarjeta" : "Nueva tarjeta",
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", valor: t?.nombre || "", requerido: true, placeholder: "Visa, Naranja X, Mastercard…" },
        { nombre: "limite", etiqueta: "Límite de compra (opcional)", tipo: "number", valor: t?.limite ?? "" },
        { nombre: "cierre", etiqueta: "Día de cierre", tipo: "number", valor: t?.cierre ?? 25, min: 1, max: 31 },
        { nombre: "vence", etiqueta: "Día de vencimiento", tipo: "number", valor: t?.vence ?? 5, min: 1, max: 31 },
        { nombre: "color", etiqueta: "Color", tipo: "select", opciones: [["lavanda", "Lavanda"], ["rosa", "Rosa"], ["lima", "Lima"], ["naranja", "Naranja"], ["azul", "Azul"]], valor: t?.color || AURAS[f().tarjetas.length % AURAS.length] },
      ],
      borrar: Boolean(t),
    });
    if (!datos) return;
    if (datos.borrar) {
      if (!confirm(`¿Borrar ${t.nombre} y todas sus compras?`)) return;
      f().tarjetas = f().tarjetas.filter((x) => x.id !== t.id);
      f().compras = f().compras.filter((c) => c.tarjetaId !== t.id);
      return cambio("Tarjeta borrada");
    }
    const nueva = { id: t?.id || nuevoIdF(), nombre: datos.nombre.trim(), limite: datos.limite === "" ? null : Number(datos.limite), cierre: Number(datos.cierre) || 25, vence: Number(datos.vence) || 5, color: datos.color };
    f().tarjetas = t ? f().tarjetas.map((x) => (x.id === t.id ? nueva : x)) : [...f().tarjetas, nueva];
    cambio(t ? "Tarjeta actualizada" : "Tarjeta agregada");
  }

  async function editarCompra(c = null, tarjetaId = null) {
    if (!f().tarjetas.length) { toast("Primero agregá una tarjeta"); return editarTarjeta(); }
    const datos = await pedirDatos({
      titulo: c ? "Editar compra" : "Nueva compra con tarjeta",
      campos: [
        { nombre: "concepto", etiqueta: "Concepto", valor: c?.concepto || "", requerido: true, placeholder: "Heladera, zapatillas, súper…" },
        { nombre: "monto", etiqueta: "Monto total", tipo: "number", valor: c?.monto ?? "", requerido: true },
        { nombre: "cuotas", etiqueta: "Cuotas", tipo: "number", valor: c?.cuotas ?? 1, min: 1, max: 60 },
        { nombre: "tarjetaId", etiqueta: "Tarjeta", tipo: "select", opciones: f().tarjetas.map((t) => [t.id, t.nombre]), valor: c?.tarjetaId || tarjetaId || f().tarjetas[0].id },
        { nombre: "categoria", etiqueta: "Categoría", tipo: "select", opciones: opcionesCategoria, valor: c?.categoria || "otros" },
        { nombre: "fecha", etiqueta: "Fecha de compra", tipo: "date", valor: c?.fecha || hoy() },
      ],
      borrar: Boolean(c),
    });
    if (!datos) return;
    if (datos.borrar) {
      f().compras = f().compras.filter((x) => x.id !== c.id);
      return cambio("Compra borrada");
    }
    const nueva = { id: c?.id || nuevoIdF(), concepto: datos.concepto.trim(), monto: Number(datos.monto), cuotas: Math.max(1, Math.round(Number(datos.cuotas) || 1)), tarjetaId: datos.tarjetaId, categoria: datos.categoria, fecha: datos.fecha || hoy() };
    f().compras = c ? f().compras.map((x) => (x.id === c.id ? nueva : x)) : [...f().compras, nueva];
    const t = f().tarjetas.find((x) => x.id === nueva.tarjetaId);
    cambio(`Compra agregada: ${nueva.cuotas > 1 ? `${nueva.cuotas} cuotas de ${fmt(nueva.monto / nueva.cuotas)}` : fmt(nueva.monto)} desde ${nombreMes(primerMesPago(nueva, t), false)}`);
  }

  async function pagarFijo(g, mes = mesActual()) {
    const e = estadoFijo(g, mes, hoy());
    if (e.estado === "pagado") { delete g.pagos[mes]; return cambio("Marcado como no pagado"); }
    g.pagos[mes] = g.monto;
    cambio(`${g.concepto}: pagado`);
  }

  async function pagarParcialFijo(g, mes = mesActual()) {
    const e = estadoFijo(g, mes, hoy());
    const datos = await pedirDatos({ titulo: `¿Cuánto pagaste de ${g.concepto}?`, campos: [{ nombre: "monto", etiqueta: `Faltan ${fmt(e.resta)}`, tipo: "number", requerido: true }] });
    if (!datos) return;
    g.pagos[mes] = (g.pagos[mes] || 0) + Number(datos.monto);
    cambio(`Anotado: ${fmt(Number(datos.monto))}`);
  }

  async function pagarResumen(t, mes = mesActual()) {
    const r = resumenTarjeta(f(), t.id, mes, hoy());
    const datos = await pedirDatos({
      titulo: `Pagar resumen de ${t.nombre}`,
      campos: [{ nombre: "monto", etiqueta: `Este mes: ${fmt(r.total)} · ya pagaste ${fmt(r.pagado)}`, tipo: "number", valor: r.debe, requerido: true }],
    });
    if (!datos) return;
    const clave = `${t.id}:${mes}`;
    f().pagosTarjeta[clave] = (f().pagosTarjeta[clave] || 0) + Number(datos.monto);
    cambio(`Pagaste ${fmt(Number(datos.monto))} de ${t.nombre}`);
  }

  // ---- Piezas visuales ----
  const aura = (clase, ...hijos) => el("section", { className: `tarjeta aura aura-${clase}` }, el("div", { className: "aura-brillo" }), ...hijos);

  function textoConsejo(c) {
    if (c.clave === "mas") return `Gastaste ${c.pct}% más que el mes pasado a esta altura. ¿Lo revisamos?`;
    if (c.clave === "menos") return `Gastaste ${c.pct}% menos que el mes pasado a esta altura. ¡Vas muy bien!`;
    if (c.clave === "excedido") return `Ojo: este mes los gastos superan tus ingresos por ${fmt(c.monto)}.`;
    if (c.clave === "disponible") return `Te quedan ${fmt(c.monto)} para este mes: unos ${fmt(c.porDia)} por día.`;
    return "Cargá tu sueldo y tus gastos y te digo cuánto podés gastar por día.";
  }

  function filaCategorias(porCategoria) {
    const total = Object.values(porCategoria).reduce((a, b) => a + b, 0);
    const filas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([id, monto]) => {
      const c = catF(id);
      const pct = total ? monto / total : 0;
      return el("li", {},
        el("span", { className: "cat-ico", style: `background:${c.color}`, textContent: c.icono }),
        el("div", { className: "cat-cuerpo" },
          el("div", { className: "cat-fila" }, el("span", { textContent: c.nombre }), el("strong", { textContent: fmt(monto) })),
          el("div", { className: "barra" }, el("span", { style: `width:${Math.max(3, pct * 100).toFixed(1)}%;background:${c.color}` })),
        ),
        el("span", { className: "cat-pct", textContent: `${Math.round(pct * 100)}%` }));
    });
    return el("ul", { className: "categorias" }, ...filas);
  }

  // Pila de tarjetas de colores (como el seguidor de hábitos): fijos, variables y tarjetas.
  function pilaMes(r) {
    const pieza = (clase, titulo, monto, detalle, alTocar) => {
      const n = el("button", { type: "button", className: `ficha ficha-${clase}` },
        el("div", { className: "ficha-arriba" }, el("span", { textContent: titulo }), el("strong", { textContent: fmt(monto) })),
        el("div", { className: "ficha-det", textContent: detalle }),
        el("span", { className: "ficha-forma" }));
      n.onclick = alTocar;
      return n;
    };
    return el("div", { className: "fichas" },
      pieza("lima", "Gastos fijos", r.fijos.total, `${fmt(r.fijos.pagado)} pagado de ${r.fijos.cantidad} ${r.fijos.cantidad === 1 ? "gasto" : "gastos"}`, () => { estado.filtroGastos = "fijo"; irA("gastos"); }),
      pieza("rosa", "Gastos variables", r.variables.total, `${r.variables.cantidad} ${r.variables.cantidad === 1 ? "gasto" : "gastos"} este mes`, () => { estado.filtroGastos = "variable"; irA("gastos"); }),
      pieza("lavanda", "Tarjetas", r.tarjetas.total, `${fmt(r.tarjetas.pagado)} pagado · ${r.tarjetas.cantidad} ${r.tarjetas.cantidad === 1 ? "cuota" : "cuotas"}`, () => irA("tarjetas")));
  }

  // ---- Pantallas ----
  function inicio() {
    const mes = mesActual();
    const r = resumenMes(f(), mes, hoy());
    const c = consejo(f(), hoy());
    const segmentos = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]).map(([id, valor]) => ({ valor, color: catF(id).color, icono: catF(id).icono, nombre: catF(id).nombre }));
    const acciones = el("div", { className: "acciones-aura" },
      boton("Gasto", () => editarGasto(), "pastilla-oscura", "mas"),
      Object.assign(boton("", () => editarCompra(), "redondo claro", "tarjeta"), { title: "Compra con tarjeta" }),
      Object.assign(boton("", () => editarGasto(null, "fijo"), "redondo claro", "repetir"), { title: "Gasto fijo" }),
      Object.assign(boton("", () => irA("ajustes"), "redondo claro", "dinero"), { title: "Sueldo" }));
    return [
      el("div", { className: "tablero aura-tablero" },
        aura("lavanda ancho-2",
          el("p", { className: "aura-etq", textContent: `Te queda para gastar en ${nombreMes(mes, false)}` }),
          el("div", { className: "aura-monto", textContent: fmt(r.puedeGastar) }),
          el("p", { className: "aura-sub", textContent: `Ingresos ${fmt(r.ingresos)} · gastos ${fmt(r.gastos)} · por pagar ${fmt(r.porPagar)}` })),
        el("section", { className: "tarjeta anillo-tarjeta ancho-2" },
          anilloCategorias(segmentos, { centro: fmt(r.gastos), etiqueta: `gastado en ${nombreMes(mes, false)}` }),
          acciones),
        el("section", { className: `tarjeta asistente ancho-2 ${c.clave === "mas" || c.clave === "excedido" ? "alerta" : ""}` },
          el("p", { className: "asistente-etq", textContent: "Tu asistente" }),
          el("p", { className: "asistente-txt", textContent: textoConsejo(c) }),
          boton("Ver gastos", () => irA("gastos"), "pastilla-oscura"),
          el("span", { className: "asistente-forma" })),
        el("section", { className: "tarjeta ancho-2" },
          el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Este mes" }), el("p", { className: "sub", textContent: "Tocá cada una para ver el detalle" }))),
          pilaMes(r)),
        el("section", { className: "tarjeta ancho-4" },
          el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "En qué se va la plata" }), el("p", { className: "sub", textContent: "Fijos, variables y cuotas del mes" }))),
          Object.keys(r.porCategoria).length ? filaCategorias(r.porCategoria) : el("p", { className: "sub", textContent: "Todavía no cargaste gastos este mes." }))),
    ];
  }

  // Fila de días del mes (como la del seguidor de hábitos): tocás un día y ves sus gastos.
  function filaDias(mes) {
    const [y, m] = mes.split("-").map(Number);
    const total = new Date(y, m, 0).getDate();
    const fila = el("div", { className: "dias", role: "tablist" });
    const conGasto = new Set(variablesDelMes(f(), mes).map((g) => g.fecha));
    for (let d = 1; d <= total; d++) {
      const iso = `${mes}-${String(d).padStart(2, "0")}`;
      const b = el("button", { type: "button", className: `dia${estado.diaF === iso ? " activo" : ""}${iso === hoy() ? " hoy" : ""}${conGasto.has(iso) ? " con-gasto" : ""}` },
        el("strong", { textContent: String(d) }),
        el("span", { textContent: new Date(`${iso}T12:00`).toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "") }));
      b.onclick = () => { estado.diaF = estado.diaF === iso ? null : iso; render(); };
      fila.append(b);
    }
    requestAnimationFrame(() => fila.querySelector(".activo, .hoy")?.scrollIntoView({ inline: "center", block: "nearest" }));
    return fila;
  }

  function filaGasto(g, mes) {
    const c = catF(g.categoria);
    const e = g.tipo === "fijo" ? estadoFijo(g, mes, hoy()) : null;
    const check = e ? el("button", { type: "button", className: "check", title: e.estado === "pagado" ? "Desmarcar" : "Marcar como pagado" }, icono("check")) : null;
    if (check) {
      check.setAttribute("aria-pressed", String(e.estado === "pagado"));
      check.setAttribute("aria-label", `${e.estado === "pagado" ? "Desmarcar" : "Marcar como pagado"}: ${g.concepto}`);
      check.onclick = (ev) => { ev.stopPropagation(); pagarFijo(g, mes); };
    }
    const estadoTxt = !e ? new Date(`${g.fecha}T12:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
      : e.estado === "pagado" ? "✓ Pagado" : e.estado === "parcial" ? `Faltan ${fmt(e.resta)}` : e.estado === "vencido" ? `Venció el ${Number(e.vence.slice(8))}` : `Vence el ${Number(e.vence.slice(8))}`;
    const fila = el("li", { className: `gasto${e?.estado === "pagado" ? " pagado" : ""}${e?.estado === "vencido" ? " vencido" : ""}` },
      check || el("span", { className: "cat-ico", style: `background:${c.color}`, textContent: c.icono }),
      el("div", { className: "gasto-cuerpo" },
        el("strong", { textContent: g.concepto }),
        el("span", { className: `gasto-estado ${e?.estado || ""}`, textContent: `${c.nombre} · ${estadoTxt}` })),
      el("span", { className: "gasto-monto", textContent: fmt(g.monto) }));
    fila.onclick = () => editarGasto(g);
    if (e && ["pendiente", "vencido", "parcial"].includes(e.estado)) {
      const parcial = boton("Pagué una parte", (ev) => { ev.stopPropagation(); pagarParcialFijo(g, mes); }, "mini");
      fila.querySelector(".gasto-cuerpo").append(parcial);
    }
    return fila;
  }

  function gastos() {
    const mes = estado.mesF || mesActual();
    const filtro = estado.filtroGastos || "variable";
    const seg = el("div", { className: "segmentado", role: "tablist" }, ...[["variable", "Variables"], ["fijo", "Fijos"]].map(([id, txt]) => {
      const b = el("button", { type: "button", className: filtro === id ? "activo" : "", textContent: txt });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(filtro === id));
      b.onclick = () => { estado.filtroGastos = id; render(); };
      return b;
    }));
    const mesInput = el("input", { type: "month", value: mes });
    mesInput.onchange = () => { estado.mesF = mesInput.value || mesActual(); estado.diaF = null; render(); };
    let lista = filtro === "fijo" ? fijosDelMes(f(), mes) : variablesDelMes(f(), mes);
    if (filtro === "variable" && estado.diaF?.startsWith(mes)) lista = lista.filter((g) => g.fecha === estado.diaF);
    lista = [...lista].sort((a, b) => (filtro === "fijo" ? a.dia - b.dia : b.fecha.localeCompare(a.fecha)));
    const total = lista.reduce((s, g) => s + g.monto, 0);
    return [
      el("div", { className: "barra-filtros" }, seg, el("div", { className: "selector-fecha" }, mesInput)),
      filtro === "variable" ? filaDias(mes) : null,
      aura(filtro === "fijo" ? "lima" : "rosa",
        el("p", { className: "aura-etq", textContent: filtro === "fijo" ? `Gastos fijos de ${nombreMes(mes, false)}` : estado.diaF ? `Gastado el ${Number(estado.diaF.slice(8))}` : `Gastos variables de ${nombreMes(mes, false)}` }),
        el("div", { className: "aura-monto", textContent: fmt(total) }),
        el("p", { className: "aura-sub", textContent: `${lista.length} ${lista.length === 1 ? "gasto" : "gastos"}` })),
      el("div", { className: "titulo-seccion" }, el("h2", { textContent: filtro === "fijo" ? "Todos los meses" : "Detalle" }),
        boton(filtro === "fijo" ? "Agregar fijo" : "Agregar gasto", () => editarGasto(null, filtro), "pastilla-oscura", "mas")),
      lista.length ? el("ul", { className: "gastos tarjeta" }, ...lista.map((g) => filaGasto(g, mes)))
        : el("p", { className: "vacio", textContent: filtro === "fijo" ? "Cargá alquiler, servicios, cuotas fijas… se repiten solos cada mes." : "No hay gastos acá. Tocá “Agregar gasto”." }),
    ];
  }

  function tarjetaVisual(t, mes) {
    const r = resumenTarjeta(f(), t.id, mes, hoy());
    const usado = t.limite ? Math.min(1, r.deuda / t.limite) : null;
    const estadoTxt = { "sin-consumos": "Sin cuotas este mes", pagado: "✓ Resumen pagado", parcial: `Pagaste ${fmt(r.pagado)} · faltan ${fmt(r.debe)}`, vencido: `Venció el ${Number(r.vence.slice(8))} · debés ${fmt(r.debe)}`, pendiente: `Vence el ${Number(r.vence.slice(8))}` }[r.estado];
    const visual = aura(`${t.color} tarjeta-credito`,
      el("div", { className: "tc-arriba" }, el("strong", { textContent: t.nombre }), el("span", { className: "tp-chip" })),
      el("p", { className: "aura-etq", textContent: `A pagar en ${nombreMes(mes, false)}` }),
      el("div", { className: "aura-monto", textContent: fmt(r.total) }),
      el("p", { className: "aura-sub", textContent: estadoTxt }),
      usado != null ? el("div", { className: "limite" }, el("div", { className: "barra clara" }, el("span", { style: `width:${(usado * 100).toFixed(1)}%` })),
        el("span", { textContent: `Disponible ${fmt(r.disponible)} de ${fmt(t.limite)}` })) : null);
    visual.onclick = (ev) => { if (!ev.target.closest("button")) editarTarjeta(t); };
    const datos = el("div", { className: "tc-datos" },
      el("div", {}, el("span", { textContent: "Gastaste este mes" }), el("strong", { textContent: fmt(r.gastadoMes) })),
      el("div", {}, el("span", { textContent: "Pagaste" }), el("strong", { textContent: fmt(r.pagado) })),
      el("div", {}, el("span", { textContent: "Debés este mes" }), el("strong", { textContent: fmt(r.debe) })),
      el("div", {}, el("span", { textContent: "Deuda total en cuotas" }), el("strong", { textContent: fmt(r.deuda) })));
    const cuotas = r.cuotas.length ? el("ul", { className: "gastos" }, ...r.cuotas.map((q) => {
      const c = catF(q.compra.categoria);
      const li = el("li", { className: "gasto" },
        el("span", { className: "cat-ico", style: `background:${c.color}`, textContent: c.icono }),
        el("div", { className: "gasto-cuerpo" }, el("strong", { textContent: q.compra.concepto }),
          el("span", { className: "gasto-estado", textContent: q.de > 1 ? `Cuota ${q.numero} de ${q.de} · total ${fmt(q.compra.monto)}` : "Un pago" })),
        el("span", { className: "gasto-monto", textContent: fmt(q.monto) }));
      li.onclick = () => editarCompra(q.compra);
      return li;
    })) : null;
    return el("div", { className: "tarjeta-bloque" }, visual,
      el("div", { className: "botones" }, boton("Compra", () => editarCompra(null, t.id), "pastilla-oscura", "mas"),
        r.debe > 0 ? boton("Pagar resumen", () => pagarResumen(t, mes), "sec") : null),
      datos, cuotas);
  }

  function tarjetas() {
    const mes = estado.mesF || mesActual();
    const mesInput = el("input", { type: "month", value: mes });
    mesInput.onchange = () => { estado.mesF = mesInput.value || mesActual(); render(); };
    const totales = f().tarjetas.map((t) => resumenTarjeta(f(), t.id, mes, hoy()));
    const suma = (k) => totales.reduce((s, r) => s + r[k], 0);
    return [
      el("div", { className: "barra-filtros" }, el("h2", { className: "titulo-vista", textContent: "Tus tarjetas" }), el("div", { className: "selector-fecha" }, mesInput)),
      f().tarjetas.length ? el("div", { className: "resumen-tarjetas tarjeta" },
        el("div", {}, el("span", { textContent: "A pagar" }), el("strong", { textContent: fmt(suma("total")) })),
        el("div", {}, el("span", { textContent: "Pagado" }), el("strong", { textContent: fmt(suma("pagado")) })),
        el("div", {}, el("span", { textContent: "Debés" }), el("strong", { textContent: fmt(suma("debe")) })),
        el("div", {}, el("span", { textContent: "Deuda total" }), el("strong", { textContent: fmt(suma("deuda")) }))) : null,
      ...f().tarjetas.map((t) => tarjetaVisual(t, mes)),
      el("div", { className: "botones centrados" }, boton("Agregar tarjeta", () => editarTarjeta(), f().tarjetas.length ? "sec" : "pastilla-oscura", "tarjeta")),
      f().tarjetas.length ? null : el("p", { className: "vacio", textContent: "Agregá tus tarjetas con su día de cierre y vencimiento. Después cargás cada compra con sus cuotas y la app calcula cuánto pagás cada mes." }),
    ];
  }

  function meses() {
    const p = proyeccion(f(), mesActual(), 6);
    const colores = ["lima", "rosa", "lavanda", "naranja", "azul", "lima"];
    return [
      el("h2", { className: "titulo-vista", textContent: "Lo que viene" }),
      el("p", { className: "sub intro", textContent: "Fijos y cuotas de tarjeta que ya sabés que vas a pagar, contra tu sueldo." }),
      el("div", { className: "fichas meses" }, ...p.map((m, i) => el("div", { className: `ficha ficha-${colores[i]}` },
        el("div", { className: "ficha-arriba" }, el("span", { textContent: capital(nombreMes(m.mes)) }), el("strong", { textContent: fmt(m.total) })),
        el("div", { className: "ficha-det", textContent: `Fijos ${fmt(m.fijos)} · tarjetas ${fmt(m.tarjetas)}${m.variables ? ` · otros ${fmt(m.variables)}` : ""}` }),
        m.ingresos ? el("div", { className: `ficha-sobra ${m.sobra < 0 ? "mal" : ""}`, textContent: m.sobra >= 0 ? `Te sobran ${fmt(m.sobra)}` : `Te faltan ${fmt(-m.sobra)}` }) : null,
        m.ultimasCuotas.length ? el("div", { className: "ficha-det", textContent: `🎉 Última cuota: ${m.ultimasCuotas.join(", ")}` }) : null,
        el("span", { className: "ficha-forma" })))),
    ];
  }

  function ajustes(extra) {
    const s = f().sueldo;
    const sueldo = el("section", { className: "tarjeta conexion" },
      el("h3", { textContent: "💰 Sueldo" }),
      el("p", { textContent: "Se suma solo todos los meses. Los ingresos extra los agregás abajo." }));
    const monto = el("input", { type: "number", inputMode: "decimal", value: s.monto ?? "", placeholder: "Monto en mano" });
    const diaInput = el("input", { type: "number", min: 1, max: 31, value: s.dia ?? 1 });
    monto.onchange = () => { s.monto = monto.value === "" ? null : Number(monto.value); cambio("Sueldo guardado"); };
    diaInput.onchange = () => { s.dia = Math.min(31, Math.max(1, Number(diaInput.value) || 1)); cambio(); };
    sueldo.append(el("div", { className: "fila" }, el("label", { className: "campo" }, "Sueldo mensual", monto), el("label", { className: "campo" }, "Día de cobro", diaInput)));
    const extras = f().ingresos.filter((i) => mesDe(i.fecha) >= sumarMeses(mesActual(), -2)).sort((a, b) => b.fecha.localeCompare(a.fecha));
    sueldo.append(
      extras.length ? el("ul", { className: "gastos" }, ...extras.map((i) => {
        const li = el("li", { className: "gasto" }, el("span", { className: "cat-ico", style: "background:#B9E3A0", textContent: "➕" }),
          el("div", { className: "gasto-cuerpo" }, el("strong", { textContent: i.concepto }), el("span", { className: "gasto-estado", textContent: new Date(`${i.fecha}T12:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" }) })),
          el("span", { className: "gasto-monto", textContent: fmt(i.monto) }));
        li.onclick = async () => { if (confirm(`¿Borrar ${i.concepto}?`)) { f().ingresos = f().ingresos.filter((x) => x.id !== i.id); cambio("Ingreso borrado"); } };
        return li;
      })) : null,
      el("div", { className: "botones" }, boton("Ingreso extra", async () => {
        const d = await pedirDatos({ titulo: "Ingreso extra", campos: [
          { nombre: "concepto", etiqueta: "Concepto", requerido: true, placeholder: "Aguinaldo, changa, venta…" },
          { nombre: "monto", etiqueta: "Monto", tipo: "number", requerido: true },
          { nombre: "fecha", etiqueta: "Fecha", tipo: "date", valor: hoy() }] });
        if (!d) return;
        f().ingresos.push({ id: nuevoIdF(), concepto: d.concepto.trim(), monto: Number(d.monto), fecha: d.fecha || hoy() });
        cambio("Ingreso agregado");
      }, "sec", "mas")));
    return [el("div", { className: "conexiones" }, sueldo, ...extra)];
  }

  // Botón "+" de la cabecera: según la pantalla, agrega lo que corresponde.
  function nuevo() {
    if (estado.vista === "tarjetas") return editarCompra();
    if (estado.vista === "gastos") return editarGasto(null, estado.filtroGastos || "variable");
    return editarGasto();
  }

  return { inicio, gastos, tarjetas, meses, ajustes, nuevo };
}
