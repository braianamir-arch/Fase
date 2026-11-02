// Finanzas personales (perfil "Solo finanzas"): sueldo, gastos fijos y variables, tarjetas
// con cuotas y proyección de los próximos meses. Lógica pura, sin DOM.

export const CATEGORIAS_GASTO = [
  { id: "casa", nombre: "Casa", icono: "🏠", color: "#F4D35E" },
  { id: "comida", nombre: "Comida", icono: "🛒", color: "#9DBF6B" },
  { id: "servicios", nombre: "Servicios", icono: "💡", color: "#A9BDF2" },
  { id: "transporte", nombre: "Transporte", icono: "🚌", color: "#F2A7D8" },
  { id: "salud", nombre: "Salud", icono: "💊", color: "#7FD1C3" },
  { id: "ropa", nombre: "Ropa", icono: "👗", color: "#C9A7F2" },
  { id: "salidas", nombre: "Salidas", icono: "🍸", color: "#F5A65B" },
  { id: "educacion", nombre: "Educación", icono: "📚", color: "#8EC5F5" },
  { id: "otros", nombre: "Otros", icono: "✨", color: "#D9D4C7" },
];
const IDS_CATEGORIA = new Set(CATEGORIAS_GASTO.map((c) => c.id));

const r2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const dia = (v, def) => Math.min(31, Math.max(1, Number(v) || def));
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const esMes = (s) => /^\d{4}-\d{2}$/.test(s || "");

let contador = 0;
export const nuevoIdF = () => `${Date.now().toString(36)}-${++contador}-${Math.random().toString(36).slice(2, 6)}`;

export const mesDe = (iso) => iso.slice(0, 7);
export function sumarMeses(mes, n) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function mesesEntre(desde, hasta) {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}
const diasDelMes = (mes) => { const [y, m] = mes.split("-").map(Number); return new Date(y, m, 0).getDate(); };

export function finanzasVacias() {
  return { sueldo: { monto: null, dia: 1 }, ingresos: [], gastos: [], tarjetas: [], compras: [], pagosTarjeta: {} };
}

// Normaliza lo guardado (o importado) para que los cálculos no fallen con datos raros.
export function normalizarFinanzas(f = {}) {
  const pagos = (p) => Object.fromEntries(Object.entries(p || {}).filter(([k, v]) => esMes(k) && num(v) != null).map(([k, v]) => [k, num(v)]));
  const tarjetas = (f.tarjetas || []).map((t) => ({
    id: t.id || nuevoIdF(),
    nombre: String(t.nombre || "Tarjeta").trim().slice(0, 40),
    limite: num(t.limite),
    cierre: dia(t.cierre, 25),
    vence: dia(t.vence, 5),
    color: ["lima", "rosa", "lavanda", "naranja", "azul"].includes(t.color) ? t.color : "lavanda",
  }));
  const idsTarjeta = new Set(tarjetas.map((t) => t.id));
  return {
    sueldo: { monto: num(f.sueldo?.monto), dia: dia(f.sueldo?.dia, 1) },
    ingresos: (f.ingresos || []).filter((i) => num(i.monto) && esFecha(i.fecha)).map((i) => ({
      id: i.id || nuevoIdF(), concepto: String(i.concepto || "Ingreso").slice(0, 80), monto: num(i.monto), fecha: i.fecha,
    })),
    gastos: (f.gastos || []).filter((g) => num(g.monto) != null && esFecha(g.fecha)).map((g) => ({
      id: g.id || nuevoIdF(),
      concepto: String(g.concepto || "Gasto").trim().slice(0, 80) || "Gasto",
      monto: num(g.monto),
      tipo: g.tipo === "fijo" ? "fijo" : "variable",
      categoria: IDS_CATEGORIA.has(g.categoria) ? g.categoria : "otros",
      fecha: g.fecha, // variable: el día del gasto; fijo: desde cuándo corre
      dia: dia(g.dia, Number(g.fecha.slice(8, 10))), // fijo: día de vencimiento de cada mes
      hasta: esMes(g.hasta) ? g.hasta : null,
      pagos: pagos(g.pagos),
    })),
    tarjetas,
    compras: (f.compras || []).filter((c) => idsTarjeta.has(c.tarjetaId) && num(c.monto) && esFecha(c.fecha)).map((c) => ({
      id: c.id || nuevoIdF(),
      tarjetaId: c.tarjetaId,
      concepto: String(c.concepto || "Compra").trim().slice(0, 80) || "Compra",
      monto: num(c.monto),
      cuotas: Math.min(60, Math.max(1, Math.round(num(c.cuotas) || 1))),
      fecha: c.fecha,
      categoria: IDS_CATEGORIA.has(c.categoria) ? c.categoria : "otros",
    })),
    pagosTarjeta: Object.fromEntries(Object.entries(f.pagosTarjeta || {}).filter(([k, v]) => /^.+:\d{4}-\d{2}$/.test(k) && num(v) != null).map(([k, v]) => [k, num(v)])),
  };
}

// ---- Gastos fijos y variables ----
export const fijosDelMes = (f, mes) =>
  f.gastos.filter((g) => g.tipo === "fijo" && mesDe(g.fecha) <= mes && (!g.hasta || g.hasta >= mes));
export const variablesDelMes = (f, mes) => f.gastos.filter((g) => g.tipo === "variable" && mesDe(g.fecha) === mes);

export function estadoFijo(g, mes, hoy) {
  const pagado = g.pagos[mes] || 0;
  const vence = `${mes}-${String(Math.min(g.dia, diasDelMes(mes))).padStart(2, "0")}`;
  if (pagado >= g.monto - 0.5) return { estado: "pagado", pagado, resta: 0, vence };
  return { estado: pagado > 0 ? "parcial" : vence < hoy ? "vencido" : "pendiente", pagado, resta: r2(g.monto - pagado), vence };
}

// ---- Tarjetas y cuotas ----
// Mes en que se paga la primera cuota: la compra entra en el resumen que cierra el día
// `cierre` (este mes o el siguiente) y ese resumen vence el día `vence`.
export function primerMesPago(compra, tarjeta) {
  const mesCompra = mesDe(compra.fecha);
  const cierraEn = Number(compra.fecha.slice(8, 10)) <= tarjeta.cierre ? mesCompra : sumarMeses(mesCompra, 1);
  return tarjeta.vence > tarjeta.cierre ? cierraEn : sumarMeses(cierraEn, 1);
}

const tarjetaDe = (f, id) => f.tarjetas.find((t) => t.id === id);

// Cuotas que se pagan en un mes: [{ compra, tarjeta, numero, de, monto }].
export function cuotasDelMes(f, mes, tarjetaId = null) {
  const lista = [];
  for (const c of f.compras) {
    if (tarjetaId && c.tarjetaId !== tarjetaId) continue;
    const t = tarjetaDe(f, c.tarjetaId);
    const k = mesesEntre(primerMesPago(c, t), mes);
    if (k < 0 || k >= c.cuotas) continue;
    // La última cuota absorbe el redondeo para que la suma dé el total exacto.
    const cuota = r2(c.monto / c.cuotas);
    lista.push({ compra: c, tarjeta: t, numero: k + 1, de: c.cuotas, monto: k === c.cuotas - 1 ? r2(c.monto - cuota * (c.cuotas - 1)) : cuota });
  }
  return lista;
}

export function resumenTarjeta(f, tarjetaId, mes, hoy) {
  const t = tarjetaDe(f, tarjetaId);
  const cuotas = cuotasDelMes(f, mes, tarjetaId);
  const total = r2(cuotas.reduce((s, c) => s + c.monto, 0));
  const pagado = f.pagosTarjeta[`${tarjetaId}:${mes}`] || 0;
  // Lo que falta de todas las cuotas desde este mes en adelante (lo que todavía se debe).
  let deuda = 0;
  for (const c of f.compras.filter((x) => x.tarjetaId === tarjetaId)) {
    const desde = primerMesPago(c, t);
    for (let k = 0; k < c.cuotas; k++) if (sumarMeses(desde, k) >= mes) deuda += c.monto / c.cuotas;
  }
  deuda = r2(Math.max(0, deuda - pagado));
  const vence = `${mes}-${String(Math.min(t.vence, diasDelMes(mes))).padStart(2, "0")}`;
  const gastadoMes = r2(f.compras.filter((c) => c.tarjetaId === tarjetaId && mesDe(c.fecha) === mesDe(hoy)).reduce((s, c) => s + c.monto, 0));
  return {
    tarjeta: t, cuotas, total, pagado, vence,
    debe: r2(Math.max(0, total - pagado)),
    estado: total === 0 ? "sin-consumos" : pagado >= total - 0.5 ? "pagado" : pagado > 0 ? "parcial" : vence < hoy ? "vencido" : "pendiente",
    deuda,
    gastadoMes,
    disponible: t.limite != null ? r2(t.limite - deuda) : null,
  };
}

// ---- Mes y proyección ----
export function ingresosDelMes(f, mes) {
  const extras = f.ingresos.filter((i) => mesDe(i.fecha) === mes).reduce((s, i) => s + i.monto, 0);
  return r2((f.sueldo.monto || 0) + extras);
}

export function resumenMes(f, mes, hoy) {
  const fijos = fijosDelMes(f, mes);
  const variables = variablesDelMes(f, mes);
  const cuotas = cuotasDelMes(f, mes);
  const porCategoria = {};
  const sumar = (cat, m) => (porCategoria[cat] = r2((porCategoria[cat] || 0) + m));
  fijos.forEach((g) => sumar(g.categoria, g.monto));
  variables.forEach((g) => sumar(g.categoria, g.monto));
  cuotas.forEach((c) => sumar(c.compra.categoria, c.monto));
  const totalFijos = r2(fijos.reduce((s, g) => s + g.monto, 0));
  const pagadoFijos = r2(fijos.reduce((s, g) => s + Math.min(g.monto, g.pagos[mes] || 0), 0));
  const totalVariables = r2(variables.reduce((s, g) => s + g.monto, 0));
  const totalTarjetas = r2(cuotas.reduce((s, c) => s + c.monto, 0));
  const pagadoTarjetas = r2(f.tarjetas.reduce((s, t) => s + Math.min(resumenTarjeta(f, t.id, mes, hoy).total, f.pagosTarjeta[`${t.id}:${mes}`] || 0), 0));
  const ingresos = ingresosDelMes(f, mes);
  const gastos = r2(totalFijos + totalVariables + totalTarjetas);
  // Pagado: lo variable ya está gastado; de fijos y tarjetas, lo marcado como pagado.
  const pagado = r2(totalVariables + pagadoFijos + pagadoTarjetas);
  return {
    mes, ingresos, gastos, pagado,
    porPagar: r2(gastos - pagado),
    puedeGastar: r2(ingresos - gastos),
    fijos: { total: totalFijos, pagado: pagadoFijos, cantidad: fijos.length },
    variables: { total: totalVariables, cantidad: variables.length },
    tarjetas: { total: totalTarjetas, pagado: pagadoTarjetas, cantidad: cuotas.length },
    porCategoria,
  };
}

// Lo que hay que pagar en los próximos `n` meses (desde `desde`), contra el sueldo.
export function proyeccion(f, desde, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const mes = sumarMeses(desde, i);
    const fijos = r2(fijosDelMes(f, mes).reduce((s, g) => s + g.monto, 0));
    const tarjetas = r2(cuotasDelMes(f, mes).reduce((s, c) => s + c.monto, 0));
    const variables = r2(variablesDelMes(f, mes).reduce((s, g) => s + g.monto, 0));
    const ingresos = ingresosDelMes(f, mes);
    const total = r2(fijos + tarjetas + variables);
    const ultimasCuotas = cuotasDelMes(f, mes).filter((c) => c.numero === c.de).map((c) => c.compra.concepto);
    return { mes, fijos, tarjetas, variables, total, ingresos, sobra: r2(ingresos - total), ultimasCuotas };
  });
}

// Un consejo corto, como el asistente de la captura: compara con el mes pasado o dice
// cuánto queda por día. Devuelve datos; el texto con montos lo arma la interfaz.
export function consejo(f, hoy) {
  const mes = mesDe(hoy);
  const diaHoy = Number(hoy.slice(8, 10));
  const hastaHoy = (m) => f.gastos.filter((g) => g.tipo === "variable" && mesDe(g.fecha) === m && Number(g.fecha.slice(8, 10)) <= diaHoy)
    .reduce((s, g) => s + g.monto, 0);
  const ahora = hastaHoy(mes), antes = hastaHoy(sumarMeses(mes, -1));
  const r = resumenMes(f, mes, hoy);
  const restan = diasDelMes(mes) - diaHoy + 1;
  if (antes > 0 && ahora > 0 && Math.abs(ahora - antes) / antes >= 0.1) {
    const pct = Math.round(((ahora - antes) / antes) * 100);
    return { clave: pct > 0 ? "mas" : "menos", pct: Math.abs(pct) };
  }
  if (r.ingresos > 0) {
    if (r.puedeGastar < 0) return { clave: "excedido", monto: -r.puedeGastar };
    return { clave: "disponible", monto: r.puedeGastar, porDia: r2(r.puedeGastar / restan) };
  }
  return { clave: "vacio" };
}
