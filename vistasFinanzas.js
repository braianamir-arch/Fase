// Pantallas del perfil "Solo finanzas": inicio con aura, gastos (todos, variables, fijos y
// suscripciones), tarjetas con cuotas y calendario, próximos meses y ajustes.
// Recibe de app.js las utilidades comunes (ctx).
import {
  CATEGORIAS_GASTO, SUSCRIPCIONES_COMUNES, PRESTAMOS_COMUNES, nuevoIdF, mesDe, sumarMeses, fijosDelMes, variablesDelMes,
  suscripcionesDelMes, prestamosDelMes, cuotaPrestamo, montoDelMes, comisionDelMes, estadoFijo, resumenTarjeta,
  resumenMes, proyeccion, calendarioCuotas, consejo, primerMesPago, aPesos, monedasSinCotizar,
} from "./finanzas.js";
import { anilloCategorias } from "./graficos.js";
import { CASAS_DOLAR } from "./conectores/cotizaciones.js";

export const VISTAS_FINANZAS = [
  ["inicio", "Inicio", "inicio"],
  ["gastos", "Gastos", "billetera"],
  ["tarjetas", "Tarjetas", "tarjeta"],
  ["meses", "Meses", "mes"],
  ["ajustes", "Ajustes", "ajustes"],
];

const AURAS = ["lavanda", "rosa", "lima", "naranja", "azul"];
const MONEDAS = [["ARS", "Pesos (ARS)"], ["USD", "Dólares (USD)"], ["EUR", "Euros (EUR)"], ["BRL", "Reales (BRL)"]];
const catF = (id) => CATEGORIAS_GASTO.find((c) => c.id === id) || CATEGORIAS_GASTO.at(-1);
const nombreMes = (mes, largo = true) => new Date(`${mes}-15T12:00`).toLocaleDateString("es-AR", largo ? { month: "long", year: "numeric" } : { month: "long" });
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const diaCorto = (iso) => new Date(`${iso}T12:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function crearVistasFinanzas(ctx) {
  const { estado, el, fmt, icono, boton, guardar, render, toast, pedirDatos, irA, hoyISO } = ctx;
  const f = () => estado.finanzas;
  const hoy = () => hoyISO();
  const mesActual = () => mesDe(hoyISO());
  const tasas = () => estado.config.cotizacion?.tasas || {};
  const cambio = (msj) => { guardar(); render(); if (msj) toast(msj); };
  // Monto en su moneda y, si no es en pesos, su equivalente.
  const fmtM = (monto, moneda = "ARS") => {
    if (moneda === "ARS") return fmt(monto);
    const pesos = aPesos(monto, moneda, tasas());
    return `${fmt(monto, moneda)}${pesos ? ` ≈ ${fmt(pesos)}` : ""}`;
  };
  const opcionesCategoria = CATEGORIAS_GASTO.filter((c) => !["suscripciones", "prestamos"].includes(c.id)).map((c) => [c.id, `${c.icono} ${c.nombre}`]);
  const editarBoton = (accion, etiqueta) => {
    const b = boton("", (ev) => { ev.stopPropagation(); accion(); }, "redondo editar", "lapiz");
    b.title = etiqueta;
    b.setAttribute("aria-label", etiqueta);
    return b;
  };

  // ---- Formularios (hoja que sube desde abajo) ----
  async function editarGasto(g = null, tipo = "variable") {
    if ((g?.tipo || tipo) === "suscripcion") return editarSuscripcion(g);
    if ((g?.tipo || tipo) === "prestamo") return editarPrestamo(g);
    const t = g?.tipo || (tipo === "todos" ? "variable" : tipo);
    const datos = await pedirDatos({
      titulo: g ? "Editar gasto" : t === "fijo" ? "Nuevo gasto fijo" : "Nuevo gasto",
      texto: t === "fijo" ? "Se repite solo todos los meses." : "",
      campos: [
        { nombre: "concepto", etiqueta: "Concepto", valor: g?.concepto || "", requerido: true, placeholder: t === "fijo" ? "Alquiler, celular, cuota del auto…" : "Súper, nafta, salida…" },
        { nombre: "monto", etiqueta: "Monto", tipo: "number", valor: g?.monto ?? "", requerido: true },
        { nombre: "moneda", etiqueta: "Moneda", tipo: "select", opciones: MONEDAS, valor: g?.moneda || "ARS" },
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
      id: g?.id || nuevoIdF(), concepto: datos.concepto.trim(), monto: Number(datos.monto), moneda: datos.moneda, categoria: datos.categoria,
      tipo: datos.tipo, fecha: datos.fecha || hoy(), dia: Number(datos.dia) || Number((datos.fecha || hoy()).slice(8, 10)),
      hasta: datos.hasta || null, pagos: g?.pagos || {},
    };
    f().gastos = g ? f().gastos.map((x) => (x.id === g.id ? nuevo : x)) : [...f().gastos, nuevo];
    cambio(g ? "Gasto actualizado" : "Gasto agregado");
  }

  // Suscripción: se carga una vez y se suma sola todos los meses (y se cobra sola en su día).
  async function editarSuscripcion(g = null) {
    const datos = await pedirDatos({
      titulo: g ? "Editar suscripción" : "Nueva suscripción",
      texto: g ? "" : "La cargás una vez y se suma sola todos los meses que siguen.",
      campos: [
        ...(g ? [] : [{ nombre: "comun", etiqueta: "¿Cuál?", tipo: "select", opciones: [["", "Elegí o escribí abajo"], ...SUSCRIPCIONES_COMUNES.map(([n]) => [n, n])], valor: "" }]),
        { nombre: "concepto", etiqueta: g ? "Nombre" : "Otra (si no está en la lista)", valor: g?.concepto || "", placeholder: "Ej: Duolingo" },
        { nombre: "monto", etiqueta: "Monto por mes", tipo: "number", valor: g?.monto ?? "", requerido: true },
        { nombre: "moneda", etiqueta: "Moneda", tipo: "select", opciones: MONEDAS, valor: g?.moneda || "ARS" },
        { nombre: "dia", etiqueta: "Día que se cobra", tipo: "number", valor: g?.dia ?? Number(hoy().slice(8, 10)), min: 1, max: 31 },
        { nombre: "tarjetaId", etiqueta: "Cómo se paga", tipo: "select", opciones: [["", "Débito / efectivo"], ...f().tarjetas.map((t) => [t.id, `Con ${t.nombre} (va en el resumen)`])], valor: g?.tarjetaId || "" },
        { nombre: "fecha", etiqueta: "Desde", tipo: "date", valor: g?.fecha || hoy() },
        ...(g ? [{ nombre: "hasta", etiqueta: "La di de baja: último mes que se cobra", tipo: "month", valor: g?.hasta || "" }] : []),
      ],
      borrar: Boolean(g),
    });
    if (!datos) return;
    if (datos.borrar) {
      f().gastos = f().gastos.filter((x) => x.id !== g.id);
      return cambio("Suscripción borrada");
    }
    const nombre = (datos.concepto || "").trim() || datos.comun;
    if (!nombre) return toast("Elegí una de la lista o escribí el nombre");
    const nueva = {
      id: g?.id || nuevoIdF(), concepto: nombre, monto: Number(datos.monto), moneda: datos.moneda, tipo: "suscripcion",
      categoria: "suscripciones", dia: Math.min(31, Math.max(1, Number(datos.dia) || 1)), tarjetaId: datos.tarjetaId || null,
      fecha: datos.fecha || hoy(), hasta: datos.hasta || null, pagos: g?.pagos || {},
    };
    f().gastos = g ? f().gastos.map((x) => (x.id === g.id ? nueva : x)) : [...f().gastos, nueva];
    cambio(g ? "Suscripción actualizada" : `${nombre}: se va a sumar sola todos los meses`);
  }

  // Préstamo (Mercado Crédito, Naranja X…): cuota mensual que puede cambiar cada mes.
  async function editarPrestamo(g = null) {
    const actual = g ? cuotaPrestamo(g, mesActual()) : null;
    const datos = await pedirDatos({
      titulo: g ? "Editar préstamo" : "Nuevo préstamo",
      texto: g ? "" : "Se suma solo cada mes hasta la última cuota. Si un mes la cuota viene distinta, usá “Poner monto”.",
      campos: [
        ...(g ? [] : [{ nombre: "comun", etiqueta: "¿Cuál?", tipo: "select", opciones: [["", "Elegí o escribí abajo"], ...PRESTAMOS_COMUNES.map((n) => [n, n])], valor: "" }]),
        { nombre: "concepto", etiqueta: g ? "Nombre" : "Otro (si no está en la lista)", valor: g?.concepto || "", placeholder: "Ej: Préstamo de la moto" },
        { nombre: "monto", etiqueta: "Cuota por mes", tipo: "number", valor: g?.monto ?? "", requerido: true },
        { nombre: "moneda", etiqueta: "Moneda", tipo: "select", opciones: MONEDAS, valor: g?.moneda || "ARS" },
        { nombre: "dia", etiqueta: "Día que vence la cuota", tipo: "number", valor: g?.dia ?? 10, min: 1, max: 31 },
        { nombre: "cuotaActual", etiqueta: "¿Qué número de cuota pagás este mes?", tipo: "number", valor: actual?.numero ?? 1, min: 1, max: 240 },
        { nombre: "cuotas", etiqueta: "¿Cuántas cuotas son en total? (opcional)", tipo: "number", valor: g?.cuotas ?? "", min: 1, max: 240 },
      ],
      borrar: Boolean(g),
    });
    if (!datos) return;
    if (datos.borrar) {
      f().gastos = f().gastos.filter((x) => x.id !== g.id);
      return cambio("Préstamo borrado");
    }
    const nombre = (datos.concepto || "").trim() || datos.comun;
    if (!nombre) return toast("Elegí uno de la lista o escribí el nombre");
    // La primera cuota fue hace (número de cuota actual − 1) meses.
    const desde = `${sumarMeses(mesActual(), -(Math.max(1, Number(datos.cuotaActual) || 1) - 1))}-01`;
    const nuevo = {
      id: g?.id || nuevoIdF(), concepto: nombre, monto: Number(datos.monto), moneda: datos.moneda, tipo: "prestamo", categoria: "prestamos",
      dia: Math.min(31, Math.max(1, Number(datos.dia) || 10)), fecha: desde, cuotas: datos.cuotas ? Number(datos.cuotas) : null,
      hasta: null, pagos: g?.pagos || {}, montosMes: g?.montosMes || {},
    };
    f().gastos = g ? f().gastos.map((x) => (x.id === g.id ? nuevo : x)) : [...f().gastos, nuevo];
    cambio(g ? "Préstamo actualizado" : `${nombre}: se suma solo cada mes`);
  }

  // Botón rápido: el monto de este mes (la cuota de un préstamo cambió, la luz vino más cara…).
  async function ponerMonto(g, mes = mesActual()) {
    const datos = await pedirDatos({
      titulo: `${g.concepto}: monto de ${nombreMes(mes, false)}`,
      campos: [
        { nombre: "monto", etiqueta: `Monto (${g.moneda})`, tipo: "number", valor: montoDelMes(g, mes), requerido: true },
        { nombre: "alcance", etiqueta: "¿Para cuándo?", tipo: "select", opciones: [["mes", `Solo ${nombreMes(mes, false)}`], ["siempre", "Este mes y los que siguen"]], valor: "mes" },
      ],
    });
    if (!datos) return;
    const monto = Number(datos.monto);
    if (datos.alcance === "siempre") {
      g.monto = monto;
      for (const m of Object.keys(g.montosMes)) if (m >= mes) delete g.montosMes[m];
    } else if (monto === g.monto) delete g.montosMes[mes];
    else g.montosMes[mes] = monto;
    cambio(`${g.concepto}: ${fmt(monto, g.moneda)}${datos.alcance === "siempre" ? " desde ahora" : ` en ${nombreMes(mes, false)}`}`);
  }

  async function editarTarjeta(t = null) {
    const datos = await pedirDatos({
      titulo: t ? "Editar tarjeta" : "Nueva tarjeta",
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", valor: t?.nombre || "", requerido: true, placeholder: "Visa, Naranja X, Mastercard…" },
        { nombre: "limite", etiqueta: "Límite de compra en pesos (opcional)", tipo: "number", valor: t?.limite ?? "" },
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
      f().gastos = f().gastos.map((g) => (g.tarjetaId === t.id ? { ...g, tarjetaId: null } : g));
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
        { nombre: "moneda", etiqueta: "Moneda", tipo: "select", opciones: MONEDAS, valor: c?.moneda || "ARS" },
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
    const nueva = { id: c?.id || nuevoIdF(), concepto: datos.concepto.trim(), monto: Number(datos.monto), moneda: datos.moneda, cuotas: Math.max(1, Math.round(Number(datos.cuotas) || 1)), tarjetaId: datos.tarjetaId, categoria: datos.categoria, fecha: datos.fecha || hoy() };
    f().compras = c ? f().compras.map((x) => (x.id === c.id ? nueva : x)) : [...f().compras, nueva];
    const t = f().tarjetas.find((x) => x.id === nueva.tarjetaId);
    cambio(`Compra agregada: ${nueva.cuotas > 1 ? `${nueva.cuotas} cuotas de ${fmt(nueva.monto / nueva.cuotas, nueva.moneda)}` : fmt(nueva.monto, nueva.moneda)} desde ${nombreMes(primerMesPago(nueva, t), false)}`);
  }

  function pagarFijo(g, mes = mesActual()) {
    const e = estadoFijo(g, mes, hoy());
    if (e.estado === "pagado") { delete g.pagos[mes]; return cambio("Marcado como no pagado"); }
    g.pagos[mes] = montoDelMes(g, mes);
    cambio(`${g.concepto}: pagado`);
  }

  async function pagarParcialFijo(g, mes = mesActual()) {
    const e = estadoFijo(g, mes, hoy());
    const datos = await pedirDatos({ titulo: `¿Cuánto pagaste de ${g.concepto}?`, campos: [{ nombre: "monto", etiqueta: `Faltan ${fmt(e.resta, g.moneda)}`, tipo: "number", requerido: true }] });
    if (!datos) return;
    g.pagos[mes] = (g.pagos[mes] || 0) + Number(datos.monto);
    cambio(`Anotado: ${fmt(Number(datos.monto), g.moneda)}`);
  }

  async function pagarResumen(t, mes = mesActual()) {
    const r = resumenTarjeta(f(), t.id, mes, hoy(), tasas());
    const datos = await pedirDatos({
      titulo: `Pagar resumen de ${t.nombre}`,
      campos: [{ nombre: "monto", etiqueta: `En pesos. Este mes: ${fmt(r.total)} · ya pagaste ${fmt(r.pagado)}`, tipo: "number", valor: r.debe, requerido: true }],
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

  function avisoCotizacion() {
    const faltan = monedasSinCotizar(f(), tasas());
    return faltan.length ? el("p", { className: "estado-sync error", textContent: `Sin cotización para ${faltan.join(", ")}: esos montos no se están sumando. Revisá tu conexión.` }) : null;
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

  // Fichas de colores apiladas (como el seguidor de hábitos): cada una lleva a su detalle.
  function pilaMes(r) {
    const pieza = (clase, titulo, monto, detalle, alTocar) => {
      const n = el("button", { type: "button", className: `ficha ficha-${clase}` },
        el("div", { className: "ficha-arriba" }, el("span", { textContent: titulo }), el("strong", { textContent: fmt(monto) })),
        el("div", { className: "ficha-det", textContent: detalle }),
        el("span", { className: "ficha-forma" }));
      n.onclick = alTocar;
      return n;
    };
    const verGastos = (filtro) => () => { estado.filtroGastos = filtro; irA("gastos"); };
    return el("div", { className: "fichas" },
      pieza("lima", "Gastos fijos", r.fijos.total, `${fmt(r.fijos.pagado)} pagado · ${plural(r.fijos.cantidad, "gasto", "gastos")}`, verGastos("fijo")),
      pieza("naranja", "Suscripciones", r.suscripciones.total, `${plural(r.suscripciones.cantidad, "activa", "activas")}${r.suscripciones.enTarjeta ? ` · ${r.suscripciones.enTarjeta} en tarjeta` : ""}`, verGastos("suscripcion")),
      r.prestamos.cantidad ? pieza("azul", "Préstamos", r.prestamos.total, `${fmt(r.prestamos.pagado)} pagado · ${plural(r.prestamos.cantidad, "préstamo", "préstamos")}`, verGastos("prestamo")) : null,
      pieza("rosa", "Gastos variables", r.variables.total, `${plural(r.variables.cantidad, "gasto", "gastos")} este mes`, verGastos("variable")),
      pieza("lavanda", "Tarjetas", r.tarjetas.total, `${fmt(r.tarjetas.pagado)} pagado · ${plural(r.tarjetas.cantidad, "cuota", "cuotas")}`, () => irA("tarjetas")));
  }

  // ---- Pantallas ----
  function inicio() {
    const mes = mesActual();
    const r = resumenMes(f(), mes, hoy(), tasas());
    const c = consejo(f(), hoy(), tasas());
    const segmentos = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]).map(([id, valor]) => ({ valor, color: catF(id).color, icono: catF(id).icono, nombre: catF(id).nombre }));
    const accion = (ico, titulo, fn) => { const b = boton("", fn, "redondo claro", ico); b.title = titulo; b.setAttribute("aria-label", titulo); return b; };
    const acciones = el("div", { className: "acciones-aura" },
      boton("Gasto", () => editarGasto(), "pastilla-oscura", "mas"),
      accion("tele", "Suscripción", () => editarSuscripcion()),
      accion("tarjeta", "Compra con tarjeta", () => editarCompra()),
      accion("repetir", "Gasto fijo", () => editarGasto(null, "fijo")));
    const faltaComision = f().sueldo.conComision && f().sueldo.comisiones[mes] == null;
    return [
      avisoCotizacion(),
      faltaComision ? el("div", { className: "recordatorio" }, el("span", { textContent: `💸 ¿Cuánto cobraste de comisión en ${nombreMes(mes, false)}?` }), boton("Cargar", () => cargarComision(mes), "pastilla-oscura")) : null,
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
          boton("Ver gastos", () => { estado.filtroGastos = "todos"; irA("gastos"); }, "pastilla-oscura"),
          el("span", { className: "asistente-forma" })),
        tarjetaPrestamos(mes),
        el("section", { className: "tarjeta ancho-2" },
          el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Este mes" }), el("p", { className: "sub", textContent: "Tocá cada una para ver el detalle" }))),
          pilaMes(r)),
        el("section", { className: "tarjeta ancho-4" },
          el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "En qué se va la plata" }), el("p", { className: "sub", textContent: "Fijos, variables, suscripciones y cuotas del mes" }))),
          Object.keys(r.porCategoria).length ? filaCategorias(r.porCategoria) : el("p", { className: "sub", textContent: "Todavía no cargaste gastos este mes." }))),
    ];
  }

  // Préstamos del mes con el botón rápido para poner el monto.
  function tarjetaPrestamos(mes) {
    const lista = prestamosDelMes(f(), mes);
    if (!lista.length) return null;
    return el("section", { className: "tarjeta ancho-2 prestamos-rapidos" },
      el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Tus préstamos" }), el("p", { className: "sub", textContent: "Si la cuota cambió, tocá “Poner monto”" }))),
      el("ul", { className: "gastos" }, ...lista.map((g) => {
        const q = cuotaPrestamo(g, mes);
        const e = estadoFijo(g, mes, hoy());
        return el("li", { className: `gasto${e.estado === "pagado" ? " pagado" : ""}` },
          el("span", { className: "cat-ico", style: `background:${catF("prestamos").color}`, textContent: "🏦" }),
          el("div", { className: "gasto-cuerpo" }, el("strong", { textContent: g.concepto }),
            el("span", { className: "gasto-estado", textContent: `${q ? `Cuota ${q.numero} de ${q.de} · ` : ""}${e.estado === "pagado" ? "✓ Pagada" : `vence el ${Number(e.vence.slice(8))}`}` })),
          el("span", { className: "gasto-monto", textContent: fmtM(montoDelMes(g, mes), g.moneda) }),
          boton("Poner monto", () => ponerMonto(g, mes), "rapido"));
      })));
  }

  async function cargarComision(mes = mesActual()) {
    const d = await pedirDatos({
      titulo: `Comisión de ${nombreMes(mes, false)}`,
      campos: [{ nombre: "monto", etiqueta: "Monto en pesos", tipo: "number", valor: f().sueldo.comisiones[mes] ?? "", requerido: true }],
    });
    if (!d) return;
    f().sueldo.comisiones[mes] = Number(d.monto);
    cambio(`Comisión de ${nombreMes(mes, false)}: ${fmt(Number(d.monto))}`);
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

  // Una fila de gasto. No se abre al tocarla (era muy fácil abrirla sin querer al deslizar):
  // se edita con el lápiz.
  function filaGasto(g, mes) {
    const c = catF(g.categoria);
    const e = g.tipo === "variable" ? null : estadoFijo(g, mes, hoy());
    const tarjeta = g.tarjetaId && f().tarjetas.find((t) => t.id === g.tarjetaId);
    let check = null;
    if (g.tipo === "fijo" || g.tipo === "prestamo") {
      check = el("button", { type: "button", className: "check", title: e.estado === "pagado" ? "Desmarcar" : "Marcar como pagado" }, icono("check"));
      check.setAttribute("aria-pressed", String(e.estado === "pagado"));
      check.setAttribute("aria-label", `${e.estado === "pagado" ? "Desmarcar" : "Marcar como pagado"}: ${g.concepto}`);
      check.onclick = () => pagarFijo(g, mes);
    }
    const estadoTxt = g.tipo === "variable" ? diaCorto(g.fecha)
      : g.tipo === "suscripcion" ? (tarjeta ? `Va en el resumen de ${tarjeta.nombre} · día ${g.dia}` : e.estado === "cobrada" ? `✓ Cobrada el ${Number(e.vence.slice(8))}` : `Se cobra el ${Number(e.vence.slice(8))}`)
      : e.estado === "pagado" ? "✓ Pagado" : e.estado === "parcial" ? `Faltan ${fmt(e.resta, g.moneda)}` : e.estado === "vencido" ? `Venció el ${Number(e.vence.slice(8))}` : `Vence el ${Number(e.vence.slice(8))}`;
    const q = g.tipo === "prestamo" ? cuotaPrestamo(g, mes) : null;
    const tipoTxt = { fijo: "Fijo", suscripcion: "Suscripción", prestamo: q ? `Cuota ${q.numero} de ${q.de}` : "Préstamo", variable: c.nombre }[g.tipo];
    const cuerpo = el("div", { className: "gasto-cuerpo" },
      el("strong", { textContent: g.concepto }),
      el("span", { className: `gasto-estado ${e?.estado || ""}`, textContent: `${tipoTxt} · ${estadoTxt}` }));
    const acciones = el("div", { className: "gasto-acciones" });
    if (g.tipo === "prestamo" || g.tipo === "fijo") acciones.append(boton("Poner monto", () => ponerMonto(g, mes), g.tipo === "prestamo" ? "rapido" : "mini"));
    if (e && (g.tipo === "fijo" || g.tipo === "prestamo") && ["pendiente", "vencido", "parcial"].includes(e.estado)) acciones.append(boton("Pagué una parte", () => pagarParcialFijo(g, mes), "mini"));
    if (acciones.children.length) cuerpo.append(acciones);
    return el("li", { className: `gasto${["pagado", "cobrada"].includes(e?.estado) ? " pagado" : ""}${e?.estado === "vencido" ? " vencido" : ""}` },
      check || el("span", { className: "cat-ico", style: `background:${c.color}`, textContent: c.icono }),
      cuerpo,
      el("span", { className: "gasto-monto", textContent: fmtM(montoDelMes(g, mes), g.moneda) }),
      editarBoton(() => editarGasto(g), `Editar ${g.concepto}`));
  }

  const PESTANAS = [["todos", "Todos"], ["variable", "Variables"], ["fijo", "Fijos"], ["prestamo", "Préstamos"], ["suscripcion", "Suscripciones"]];

  function gastos() {
    const mes = estado.mesF || mesActual();
    const filtro = PESTANAS.some(([id]) => id === estado.filtroGastos) ? estado.filtroGastos : "todos";
    const r = resumenMes(f(), mes, hoy(), tasas());
    const seg = el("div", { className: "segmentado", role: "tablist" }, ...PESTANAS.map(([id, txt]) => {
      const b = el("button", { type: "button", className: filtro === id ? "activo" : "", textContent: txt });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(filtro === id));
      b.onclick = () => { estado.filtroGastos = id; render(); };
      return b;
    }));
    const mesInput = el("input", { type: "month", value: mes });
    mesInput.onchange = () => { estado.mesF = mesInput.value || mesActual(); estado.diaF = null; render(); };
    let lista;
    if (filtro === "fijo") lista = fijosDelMes(f(), mes).sort((a, b) => a.dia - b.dia);
    else if (filtro === "prestamo") lista = prestamosDelMes(f(), mes).sort((a, b) => a.dia - b.dia);
    else if (filtro === "suscripcion") lista = suscripcionesDelMes(f(), mes, { conTarjeta: true }).sort((a, b) => a.dia - b.dia);
    else if (filtro === "variable") {
      lista = variablesDelMes(f(), mes).sort((a, b) => b.fecha.localeCompare(a.fecha));
      if (estado.diaF?.startsWith(mes)) lista = lista.filter((g) => g.fecha === estado.diaF);
    } else {
      lista = [...fijosDelMes(f(), mes), ...prestamosDelMes(f(), mes), ...suscripcionesDelMes(f(), mes), ...variablesDelMes(f(), mes)];
    }
    const total = filtro === "todos" ? r.todos : filtro === "fijo" ? r.fijos.total : filtro === "prestamo" ? r.prestamos.total : filtro === "variable" && !estado.diaF ? r.variables.total
      : lista.reduce((s, g) => s + aPesos(montoDelMes(g, mes), g.moneda, tasas()), 0);
    const titulo = {
      todos: `Todos los gastos de ${nombreMes(mes, false)}`,
      fijo: `Gastos fijos de ${nombreMes(mes, false)}`,
      prestamo: `Cuotas de préstamos de ${nombreMes(mes, false)}`,
      suscripcion: "Suscripciones por mes",
      variable: estado.diaF ? `Gastado el ${Number(estado.diaF.slice(8))}` : `Gastos variables de ${nombreMes(mes, false)}`,
    }[filtro];
    const detalle = filtro === "todos" ? `Fijos ${fmt(r.fijos.total)} + préstamos ${fmt(r.prestamos.total)} + variables ${fmt(r.variables.total)} + suscripciones ${fmt(r.suscripciones.total)}`
      : filtro === "prestamo" ? `${fmt(r.prestamos.pagado)} pagado · ${plural(lista.length, "préstamo", "préstamos")}`
      : filtro === "suscripcion" ? `${plural(lista.length, "activa", "activas")} · se suman solas cada mes`
      : plural(lista.length, "gasto", "gastos");
    const agregar = { todos: ["Agregar gasto", () => editarGasto()], variable: ["Agregar gasto", () => editarGasto()], fijo: ["Agregar fijo", () => editarGasto(null, "fijo")], prestamo: ["Agregar préstamo", () => editarPrestamo()], suscripcion: ["Agregar suscripción", () => editarSuscripcion()] }[filtro];
    const vacio = {
      todos: "No hay gastos este mes. Tocá “Agregar gasto”.",
      variable: "No hay gastos acá. Tocá “Agregar gasto”.",
      fijo: "Cargá alquiler, servicios, cuotas fijas… se repiten solos cada mes.",
      prestamo: "Agregá Mercado Crédito, préstamo Naranja X… y cada mes ponés el monto con un toque.",
      suscripcion: "Agregá Netflix, Spotify, ChatGPT… en pesos o en dólares. Se suman solas todos los meses.",
    }[filtro];
    return [
      avisoCotizacion(),
      el("div", { className: "segmentado-scroll" }, seg),
      el("div", { className: "barra-filtros" }, el("span"), el("div", { className: "selector-fecha" }, mesInput)),
      filtro === "variable" ? filaDias(mes) : null,
      aura({ todos: "lavanda", fijo: "lima", variable: "rosa", prestamo: "azul", suscripcion: "naranja" }[filtro],
        el("p", { className: "aura-etq", textContent: titulo }),
        el("div", { className: "aura-monto", textContent: fmt(total) }),
        el("p", { className: "aura-sub", textContent: detalle })),
      el("div", { className: "titulo-seccion" }, el("h2", { textContent: "Detalle" }), boton(agregar[0], agregar[1], "pastilla-oscura", "mas")),
      lista.length ? el("ul", { className: "gastos tarjeta" }, ...lista.map((g) => filaGasto(g, mes))) : el("p", { className: "vacio", textContent: vacio }),
    ];
  }

  function filaCuota(q) {
    const c = catF(q.compra.categoria);
    const texto = q.numero == null ? "Suscripción" : q.de > 1 ? `Cuota ${q.numero} de ${q.de} · total ${fmt(q.compra.monto, q.compra.moneda)}` : "Un pago";
    return el("li", { className: "gasto" },
      el("span", { className: "cat-ico", style: `background:${c.color}`, textContent: c.icono }),
      el("div", { className: "gasto-cuerpo" }, el("strong", { textContent: q.compra.concepto }), el("span", { className: "gasto-estado", textContent: texto })),
      el("span", { className: "gasto-monto", textContent: fmtM(q.monto, q.compra.moneda) }),
      editarBoton(() => (q.numero == null ? editarSuscripcion(q.compra) : editarCompra(q.compra)), `Editar ${q.compra.concepto}`));
  }

  function tarjetaVisual(t, mes) {
    const r = resumenTarjeta(f(), t.id, mes, hoy(), tasas());
    const usado = t.limite ? Math.min(1, r.deuda / t.limite) : null;
    const estadoTxt = { "sin-consumos": "Sin cuotas este mes", pagado: "✓ Resumen pagado", parcial: `Pagaste ${fmt(r.pagado)} · faltan ${fmt(r.debe)}`, vencido: `Venció el ${Number(r.vence.slice(8))} · debés ${fmt(r.debe)}`, pendiente: `Vence el ${Number(r.vence.slice(8))}` }[r.estado];
    const visual = aura(`${t.color} tarjeta-credito`,
      el("div", { className: "tc-arriba" }, el("strong", { textContent: t.nombre }), el("span", { className: "tp-chip" })),
      el("p", { className: "aura-etq", textContent: `A pagar en ${nombreMes(mes, false)}` }),
      el("div", { className: "aura-monto", textContent: fmt(r.total) }),
      el("p", { className: "aura-sub", textContent: estadoTxt }),
      usado != null ? el("div", { className: "limite" }, el("div", { className: "barra clara" }, el("span", { style: `width:${(usado * 100).toFixed(1)}%` })),
        el("span", { textContent: `Disponible ${fmt(r.disponible)} de ${fmt(t.limite)}` })) : null);
    const datos = el("div", { className: "tc-datos" },
      el("div", {}, el("span", { textContent: "Gastaste este mes" }), el("strong", { textContent: fmt(r.gastadoMes) })),
      el("div", {}, el("span", { textContent: "Pagaste" }), el("strong", { textContent: fmt(r.pagado) })),
      el("div", {}, el("span", { textContent: "Debés este mes" }), el("strong", { textContent: fmt(r.debe) })),
      el("div", {}, el("span", { textContent: "Deuda total en cuotas" }), el("strong", { textContent: fmt(r.deuda) })));
    return el("div", { className: "tarjeta-bloque" }, visual,
      el("div", { className: "botones" }, boton("Compra", () => editarCompra(null, t.id), "pastilla-oscura", "mas"),
        r.debe > 0 ? boton("Pagar resumen", () => pagarResumen(t, mes), "sec") : null,
        boton("Editar tarjeta", () => editarTarjeta(t), "sec", "lapiz")),
      datos,
      r.cuotas.length ? el("ul", { className: "gastos tarjeta" }, ...r.cuotas.map(filaCuota)) : null);
  }

  // Calendario de cuotas: mes por mes, sin tener que cambiar de mes.
  function calendario() {
    const meses = calendarioCuotas(f(), mesActual(), 12, tasas());
    if (!meses.length) return null;
    return el("section", { className: "tarjeta calendario" },
      el("div", { className: "cab-tarjeta" }, el("div", {}, el("h2", { textContent: "Cuotas mes a mes" }), el("p", { className: "sub", textContent: "Lo que pagás en cada resumen de los próximos meses" }))),
      el("ol", { className: "linea-tiempo" }, ...meses.map((m) => el("li", {},
        el("div", { className: "lt-mes" }, el("strong", { textContent: capital(nombreMes(m.mes, false)) }), el("span", { textContent: m.mes.slice(0, 4) })),
        el("div", { className: "lt-cuerpo" },
          el("div", { className: "lt-total", textContent: fmt(m.total) }),
          ...m.cuotas.map((q) => el("div", { className: "lt-cuota" },
            el("span", { textContent: `${q.compra.concepto}${q.numero != null ? ` · cuota ${q.numero}/${q.de}` : " · suscripción"}` }),
            el("span", { textContent: fmt(q.monto, q.compra.moneda) }))))))));
  }

  function tarjetas() {
    const mes = estado.mesF || mesActual();
    const mesInput = el("input", { type: "month", value: mes });
    mesInput.onchange = () => { estado.mesF = mesInput.value || mesActual(); render(); };
    const totales = f().tarjetas.map((t) => resumenTarjeta(f(), t.id, mes, hoy(), tasas()));
    const suma = (k) => totales.reduce((s, r) => s + r[k], 0);
    return [
      avisoCotizacion(),
      el("div", { className: "barra-filtros" }, el("h2", { className: "titulo-vista", textContent: "Tus tarjetas" }), el("div", { className: "selector-fecha" }, mesInput)),
      f().tarjetas.length ? el("div", { className: "resumen-tarjetas tarjeta" },
        el("div", {}, el("span", { textContent: "A pagar" }), el("strong", { textContent: fmt(suma("total")) })),
        el("div", {}, el("span", { textContent: "Pagado" }), el("strong", { textContent: fmt(suma("pagado")) })),
        el("div", {}, el("span", { textContent: "Debés" }), el("strong", { textContent: fmt(suma("debe")) })),
        el("div", {}, el("span", { textContent: "Deuda total" }), el("strong", { textContent: fmt(suma("deuda")) }))) : null,
      calendario(),
      ...f().tarjetas.map((t) => tarjetaVisual(t, mes)),
      el("div", { className: "botones centrados" }, boton("Agregar tarjeta", () => editarTarjeta(), f().tarjetas.length ? "sec" : "pastilla-oscura", "tarjeta")),
      f().tarjetas.length ? null : el("p", { className: "vacio", textContent: "Agregá tus tarjetas con su día de cierre y vencimiento. Después cargás cada compra con sus cuotas y la app calcula cuánto pagás cada mes." }),
    ];
  }

  // Próximos meses: cada ficha se abre para ver qué hay adentro.
  function meses() {
    const p = proyeccion(f(), mesActual(), 6, tasas());
    const colores = ["lima", "rosa", "lavanda", "naranja", "azul", "lima"];
    const linea = (texto, monto) => el("li", {}, el("span", { textContent: texto }), el("strong", { textContent: monto }));
    const grupo = (titulo, items) => (items.length ? [el("li", { className: "md-titulo", textContent: titulo }), ...items] : []);
    return [
      el("h2", { className: "titulo-vista", textContent: "Lo que viene" }),
      el("p", { className: "sub intro", textContent: "Tocá un mes para ver qué vas a pagar." }),
      el("div", { className: "fichas meses" }, ...p.map((m, i) => {
        const d = el("details", { className: `ficha ficha-${colores[i]}`, open: estado.mesAbierto === m.mes },
          el("summary", {},
            el("div", { className: "ficha-arriba" }, el("span", { textContent: capital(nombreMes(m.mes)) }), el("strong", { textContent: fmt(m.total) })),
            el("div", { className: "ficha-det", textContent: `Fijos ${fmt(m.fijos)}${m.prestamos ? ` · préstamos ${fmt(m.prestamos)}` : ""} · suscripciones ${fmt(m.suscripciones)} · tarjetas ${fmt(m.tarjetas)}${m.variables ? ` · otros ${fmt(m.variables)}` : ""}` }),
            m.ingresos ? el("div", { className: `ficha-sobra ${m.sobra < 0 ? "mal" : ""}`, textContent: `${m.sobra >= 0 ? `Te sobran ${fmt(m.sobra)}` : `Te faltan ${fmt(-m.sobra)}`}${m.comision.estimada ? " (con comisión estimada)" : ""}` }) : null,
            m.ultimasCuotas.length ? el("div", { className: "ficha-det", textContent: `🎉 Última cuota: ${m.ultimasCuotas.join(", ")}` }) : null),
          el("ul", { className: "mes-detalle" },
            ...grupo("Fijos", m.detalle.fijos.map((g) => linea(g.concepto, fmtM(montoDelMes(g, m.mes), g.moneda)))),
            ...grupo("Préstamos", m.detalle.prestamos.map((g) => { const q = cuotaPrestamo(g, m.mes); return linea(`${g.concepto}${q ? ` (${q.numero}/${q.de})` : ""}`, fmtM(montoDelMes(g, m.mes), g.moneda)); })),
            ...grupo("Suscripciones", m.detalle.suscripciones.map((g) => linea(g.concepto, fmtM(g.monto, g.moneda)))),
            ...grupo("Tarjetas", m.detalle.cuotas.map((q) => linea(`${q.compra.concepto}${q.numero != null && q.de > 1 ? ` (${q.numero}/${q.de})` : ""} · ${q.tarjeta.nombre}`, fmtM(q.monto, q.compra.moneda)))),
            ...grupo("Otros", m.detalle.variables.map((g) => linea(g.concepto, fmtM(g.monto, g.moneda)))),
            m.total ? null : el("li", { className: "md-titulo", textContent: "Nada cargado para este mes" })),
          el("span", { className: "ficha-forma" }));
        d.ontoggle = () => { estado.mesAbierto = d.open ? m.mes : estado.mesAbierto === m.mes ? null : estado.mesAbierto; };
        return d;
      })),
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
    sueldo.append(el("div", { className: "fila" }, el("label", { className: "campo" }, s.conComision ? "Sueldo base" : "Sueldo mensual", monto), el("label", { className: "campo" }, "Día de cobro", diaInput)));
    // Opción "con comisión": cada mes se carga lo que se cobró de comisión.
    const conComision = el("input", { type: "checkbox", checked: s.conComision });
    conComision.onchange = () => { s.conComision = conComision.checked; cambio(conComision.checked ? "Sueldo con comisión activado" : "Sin comisión"); };
    sueldo.append(el("label", { className: "interruptor" }, conComision, el("span", { textContent: "Cobro con comisión" })));
    if (s.conComision) {
      const mes = mesActual();
      const prox = comisionDelMes(f(), sumarMeses(mes, 1), true);
      const ultimas = Object.entries(s.comisiones).sort(([a], [b]) => b.localeCompare(a)).slice(0, 4);
      sueldo.append(
        el("div", { className: "comision" },
          el("div", {}, el("span", { textContent: `Comisión de ${nombreMes(mes, false)}` }), el("strong", { textContent: s.comisiones[mes] != null ? fmt(s.comisiones[mes]) : "Sin cargar" })),
          boton(s.comisiones[mes] != null ? "Cambiar" : "Cargar", () => cargarComision(mes), "pastilla-oscura")),
        ultimas.length ? el("p", { className: "aviso", textContent: `Anteriores: ${ultimas.map(([m, v]) => `${nombreMes(m, false)} ${fmt(v)}`).join(" · ")}` }) : null,
        prox.estimada ? el("p", { className: "aviso", textContent: `Para los próximos meses se calcula con el promedio: ${fmt(prox.monto)}.` }) : null);
    }
    const extras = f().ingresos.filter((i) => mesDe(i.fecha) >= sumarMeses(mesActual(), -2)).sort((a, b) => b.fecha.localeCompare(a.fecha));
    sueldo.append(
      extras.length ? el("ul", { className: "gastos" }, ...extras.map((i) => el("li", { className: "gasto" },
        el("span", { className: "cat-ico", style: "background:#B9E3A0", textContent: "➕" }),
        el("div", { className: "gasto-cuerpo" }, el("strong", { textContent: i.concepto }), el("span", { className: "gasto-estado", textContent: diaCorto(i.fecha) })),
        el("span", { className: "gasto-monto", textContent: fmt(i.monto) }),
        editarBoton(() => { if (confirm(`¿Borrar ${i.concepto}?`)) { f().ingresos = f().ingresos.filter((x) => x.id !== i.id); cambio("Ingreso borrado"); } }, `Borrar ${i.concepto}`)))) : null,
      el("div", { className: "botones" }, boton("Ingreso extra", async () => {
        const d = await pedirDatos({ titulo: "Ingreso extra", campos: [
          { nombre: "concepto", etiqueta: "Concepto", requerido: true, placeholder: "Aguinaldo, changa, venta…" },
          { nombre: "monto", etiqueta: "Monto", tipo: "number", requerido: true },
          { nombre: "fecha", etiqueta: "Fecha", tipo: "date", valor: hoy() }] });
        if (!d) return;
        f().ingresos.push({ id: nuevoIdF(), concepto: d.concepto.trim(), monto: Number(d.monto), fecha: d.fecha || hoy() });
        cambio("Ingreso agregado");
      }, "sec", "mas")));
    const casa = el("select", {}, ...CASAS_DOLAR.map((c) => el("option", { value: c, textContent: `Dólar ${c}`, selected: c === (estado.config.casaDolar || "tarjeta") })));
    casa.onchange = () => { estado.config.casaDolar = casa.value; ctx.actualizarCotizacion(); };
    const cot = estado.config.cotizacion;
    const monedas = el("section", { className: "tarjeta conexion" },
      el("h3", { textContent: "💱 Dólares y otras monedas" }),
      el("p", { textContent: "Lo que cargás en dólares, euros o reales se pasa a pesos con esta cotización (se actualiza sola)." }),
      el("label", { className: "campo" }, "Cotización a usar", casa),
      cot?.tasas?.USD ? el("p", { className: "aviso", textContent: `Hoy: 1 USD = ${fmt(cot.tasas.USD)}` }) : null);
    return [el("div", { className: "conexiones" }, sueldo, monedas, ...extra)];
  }

  // Botón "+" de la cabecera: según la pantalla, agrega lo que corresponde.
  function nuevo() {
    if (estado.vista === "tarjetas") return editarCompra();
    if (estado.vista === "gastos") return estado.filtroGastos === "suscripcion" ? editarSuscripcion() : editarGasto(null, estado.filtroGastos || "variable");
    return editarGasto();
  }

  return { inicio, gastos, tarjetas, meses, ajustes, nuevo };
}
