// Lógica pura (sin DOM) de "Todo en uno": orden por prioridad, filtros y totales.

export const CATEGORIAS = [
  { id: "billeteras", nombre: "Billeteras", icono: "💳" },
  { id: "efectivo", nombre: "Efectivo", icono: "💵" },
  { id: "ahorros", nombre: "Ahorros e inversiones", icono: "🐷" },
  { id: "servicios", nombre: "Servicios", icono: "💡" },
  { id: "suscripciones", nombre: "Suscripciones", icono: "🔁" },
  { id: "gmail", nombre: "Gmail", icono: "✉️" },
  { id: "redes", nombre: "Redes", icono: "📱" },
  { id: "otros", nombre: "Otros", icono: "📌" },
];

export const PRIORIDADES = { alta: 1, media: 2, baja: 3 };
export const FRECUENCIAS = ["unico", "diario", "semanal", "mensual", "anual"];

// Categorías cuyo monto es plata tuya. Dentro de ellas, `tipoDinero` dice si está
// disponible para gastar o apartada (plazo fijo, ahorro, inversión, guardada).
export const CATS_DINERO = new Set(["billeteras", "efectivo", "ahorros"]);
export const TIPOS_DINERO = {
  disponible: "Disponible",
  plazo_fijo: "Plazo fijo",
  ahorro: "Ahorro",
  inversion: "Inversión",
  guardado: "Guardado / escondido",
};
// Lo que se paga cada período (mes o año) y puede estar vencido, pendiente o pagado.
export const CATS_PAGABLES = new Set(["servicios", "suscripciones"]);
const RECURRENTES = new Set(["diario", "semanal", "mensual", "anual"]);
const ESTADOS_DETECTADOS = new Set(["pagado", "parcial", "pendiente", "vencido"]);
// Versiones anteriores tenían "bancos" y "cuentas".
const CATEGORIAS_VIEJAS = { cuentas: "servicios" };

let contador = 0;
export function nuevoId() {
  contador += 1;
  return `${Date.now().toString(36)}-${contador}-${Math.random().toString(36).slice(2, 7)}`;
}

export function hoyISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function diasEntre(desdeISO, hastaISO) {
  return Math.round((parseISO(hastaISO) - parseISO(desdeISO)) / 86400000);
}

// Normaliza una entrada cargada (de localStorage o de un JSON importado).
export function normalizar(e) {
  const prioridad = e.prioridad in PRIORIDADES ? e.prioridad : "media";
  const cat = e.categoria === "bancos" ? (e.origen === "mp" ? "billeteras" : "otros") : CATEGORIAS_VIEJAS[e.categoria] || e.categoria;
  const categoria = CATEGORIAS.some((c) => c.id === cat) ? cat : "otros";
  let frecuencia = FRECUENCIAS.includes(e.frecuencia) ? e.frecuencia : "unico";
  // Una suscripción con día de cobro se cobra todos los meses.
  if (categoria === "suscripciones" && e.diaCobro && frecuencia === "unico") frecuencia = "mensual";
  const monto = e.monto === "" || e.monto == null ? null : Number(e.monto);
  const diaCobro = e.diaCobro ? Math.min(31, Math.max(1, Number(e.diaCobro))) : null;
  const pagable = CATS_PAGABLES.has(categoria) && RECURRENTES.has(frecuencia);
  // Pagos por período ("2026-10" o "2026" si es anual) → monto pagado.
  const pagos = {};
  for (const [k, v] of Object.entries(e.pagos || {})) if (/^\d{4}(-\d{2})?$/.test(k) && Number.isFinite(Number(v))) pagos[k] = Number(v);
  const tipoDinero = CATS_DINERO.has(categoria)
    ? (e.tipoDinero in TIPOS_DINERO ? e.tipoDinero : categoria === "ahorros" ? "ahorro" : "disponible")
    : null;
  return {
    id: e.id || nuevoId(),
    categoria,
    titulo: String(e.titulo || "").trim() || "(sin título)",
    nota: String(e.nota || ""),
    monto: Number.isFinite(monto) ? monto : null,
    moneda: String(e.moneda || "ARS").toUpperCase(),
    prioridad,
    frecuencia,
    fecha: e.fecha || hoyISO(),
    diaCobro,
    // En lo recurrente que se paga, "hecho" no sirve (cada mes hay que volver a pagar):
    // se usan `pagos` por período. Versiones anteriores lo marcaban con hecho.
    hecho: pagable ? false : Boolean(e.hecho),
    pagos,
    cancelada: Boolean(e.cancelada),
    tipoDinero,
    // Lo que la IA detectó en los mails del período (monto, vencimiento, si ya se pagó).
    deteccion: normalizarDeteccion(e.deteccion),
    // Entradas creadas por un conector: se reemplazan en cada sincronización.
    origen: e.origen ? String(e.origen) : null,
    externoId: e.externoId ? String(e.externoId) : null,
    enlace: typeof e.enlace === "string" && /^https:\/\//.test(e.enlace) ? e.enlace : null,
  };
}

function normalizarDeteccion(d) {
  if (!d || !ESTADOS_DETECTADOS.has(d.estado) || !/^\d{4}(-\d{2})?$/.test(d.periodo || "")) return null;
  const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  return {
    estado: d.estado,
    periodo: d.periodo,
    vence: /^\d{4}-\d{2}-\d{2}$/.test(d.vence || "") ? d.vence : null,
    montoTotal: num(d.montoTotal),
    montoPagado: num(d.montoPagado),
  };
}

// Reemplaza las entradas de un conector por las recién sincronizadas, conservando lo
// que el usuario marcó como hecho y sin tocar las entradas cargadas a mano.
export function fusionar(entradas, nuevas, origen) {
  // Lo que el usuario decidió sobre cada entrada sincronizada sobrevive a la sincronización.
  const previas = new Map(entradas.filter((e) => e.origen === origen && e.externoId).map((e) => [e.externoId, e]));
  const sincronizadas = nuevas.map((n) => {
    const p = n.externoId != null ? previas.get(n.externoId) : null;
    return normalizar({
      ...n, origen,
      hecho: Boolean(p?.hecho),
      pagos: p?.pagos,
      cancelada: p?.cancelada,
      deteccion: n.deteccion ?? p?.deteccion,
      tipoDinero: p?.tipoDinero ?? n.tipoDinero,
    });
  });
  return [...entradas.filter((e) => e.origen !== origen), ...sincronizadas];
}

// Une entradas importadas con las locales: lo sincronizado de cada conector presente en la
// copia reemplaza al local; lo cargado a mano se agrega si no existe (gana la versión local).
export function combinar(locales, importadas) {
  const origenes = new Set(importadas.map((e) => e.origen).filter(Boolean));
  const ids = new Set(locales.map((e) => e.id));
  return [
    ...locales.filter((e) => !origenes.has(e.origen)),
    ...importadas.filter((e) => e.origen && origenes.has(e.origen)),
    ...importadas.filter((e) => !e.origen && !ids.has(e.id)),
  ];
}

// Convierte montos por moneda a pesos con `tasas` = { USD: 1545, EUR: 1715, BTC: ... }.
// Devuelve { total, sinTasa: [monedas que no se pudieron convertir] }.
export function enPesos(porMoneda, tasas = {}) {
  let total = 0;
  const sinTasa = [];
  for (const [moneda, monto] of Object.entries(porMoneda)) {
    const tasa = moneda === "ARS" ? 1 : tasas[moneda];
    if (tasa) total += monto * tasa;
    else sinTasa.push(moneda);
  }
  return { total: Math.round(total * 100) / 100, sinTasa };
}

// Próxima fecha de cobro de una suscripción con día de cobro fijo (ajusta meses cortos).
export function proximoCobro(entrada, hoy = hoyISO()) {
  if (!entrada.diaCobro) return null;
  const h = parseISO(hoy);
  for (let i = 0; i < 2; i++) {
    const y = h.getFullYear();
    const m = h.getMonth() + i;
    const ultimo = new Date(y, m + 1, 0).getDate();
    const fecha = new Date(y, m, Math.min(entrada.diaCobro, ultimo));
    if (fecha >= h) return hoyISO(fecha);
  }
  return null;
}

// ---- Pagos por período ----
export function periodoDe(e, hoy = hoyISO()) {
  return e.frecuencia === "anual" ? hoy.slice(0, 4) : hoy.slice(0, 7);
}

export const esPagable = (e) => CATS_PAGABLES.has(e.categoria) && RECURRENTES.has(e.frecuencia);

// Fecha de vencimiento (o de cobro) dentro del período actual, si se conoce.
export function venceEnPeriodo(e, hoy = hoyISO()) {
  const periodo = periodoDe(e, hoy);
  if (e.deteccion?.periodo === periodo && e.deteccion.vence) return e.deteccion.vence;
  if (e.diaCobro && e.frecuencia !== "anual") {
    const [y, m] = hoy.split("-").map(Number);
    const ultimo = new Date(y, m, 0).getDate();
    return `${periodo}-${String(Math.min(e.diaCobro, ultimo)).padStart(2, "0")}`;
  }
  return e.fecha?.startsWith(periodo) ? e.fecha : null;
}

// Estado de pago en el período actual. null si la entrada no es algo que se paga.
// estado: "pagado" | "parcial" | "vencido" | "pendiente" | "cobrada" (débito automático ya pasado).
export function estadoPago(e, hoy = hoyISO()) {
  if (!CATS_PAGABLES.has(e.categoria)) return null;
  if (e.cancelada) return { estado: "cancelada", periodo: periodoDe(e, hoy), vence: null, total: null, pagado: 0, resta: 0, enDias: null };
  if (!esPagable(e)) {
    const vence = e.fecha || null;
    if (e.hecho) return { estado: "pagado", periodo: null, vence, total: e.monto, pagado: e.monto || 0, resta: 0, enDias: null };
    return { estado: vence && vence < hoy ? "vencido" : "pendiente", periodo: null, vence, total: e.monto, pagado: 0, resta: e.monto || 0, enDias: vence ? diasEntre(hoy, vence) : null };
  }
  const periodo = periodoDe(e, hoy);
  const det = e.deteccion?.periodo === periodo ? e.deteccion : null;
  const total = det?.montoTotal ?? e.monto;
  const manual = e.pagos[periodo];
  const pagado = manual ?? det?.montoPagado ?? (det?.estado === "pagado" ? total ?? 0 : 0);
  const vence = venceEnPeriodo(e, hoy);
  const enDias = vence ? diasEntre(hoy, vence) : null;
  const atrasado = Boolean(vence && vence < hoy);
  const base = { periodo, vence, total, pagado, enDias, atrasado, resta: total != null ? Math.max(0, Math.round((total - pagado) * 100) / 100) : null };
  if (manual != null || det?.estado === "pagado" || det?.estado === "parcial" || pagado > 0) {
    if (total == null || pagado >= total - 0.5) return { ...base, estado: "pagado", resta: 0 };
    if (pagado > 0) return { ...base, estado: "parcial" };
  }
  // Las suscripciones se debitan solas: pasado el día de cobro, ya están cobradas.
  if (e.categoria === "suscripciones" && vence && vence <= hoy) return { ...base, estado: "cobrada", resta: 0 };
  return { ...base, estado: vence && vence < hoy ? "vencido" : "pendiente" };
}

// Ya no requiere acción: hecho, pagado, cobrado o cancelado.
export function resuelta(e, hoy = hoyISO()) {
  const p = estadoPago(e, hoy);
  return p ? ["pagado", "cobrada", "cancelada"].includes(p.estado) : e.hecho;
}

// Registra un pago del período actual (monto null = el total).
export function registrarPago(e, hoy = hoyISO(), monto = null) {
  const p = estadoPago(e, hoy);
  const periodo = periodoDe(e, hoy);
  const valor = monto ?? p?.total ?? e.monto ?? 1;
  if (!esPagable(e)) return { ...e, hecho: true };
  return { ...e, pagos: { ...e.pagos, [periodo]: Math.round(((e.pagos[periodo] || 0) + valor) * 100) / 100 } };
}

export function deshacerPago(e, hoy = hoyISO()) {
  if (!esPagable(e)) return { ...e, hecho: false };
  const pagos = { ...e.pagos };
  delete pagos[periodoDe(e, hoy)];
  // Si la IA lo había detectado como pagado, deshacer lo deja pendiente a mano.
  return { ...e, pagos: e.deteccion?.periodo === periodoDe(e, hoy) && e.deteccion.estado === "pagado" ? { ...pagos, [periodoDe(e, hoy)]: 0 } : pagos };
}

// Fecha que se usa para ordenar dentro de la misma prioridad.
function fechaClave(e, hoy) {
  return (esPagable(e) ? venceEnPeriodo(e, hoy) : null) || proximoCobro(e, hoy) || e.fecha || "9999-12-31";
}

export function ordenarPorPrioridad(entradas, hoy = hoyISO()) {
  // Lo vencido va arriba de todo: es lo más urgente aunque tenga prioridad media.
  const vencida = (e) => estadoPago(e, hoy)?.estado === "vencido";
  return [...entradas].sort(
    (a, b) =>
      Number(resuelta(a, hoy)) - Number(resuelta(b, hoy)) ||
      Number(vencida(b)) - Number(vencida(a)) ||
      PRIORIDADES[a.prioridad] - PRIORIDADES[b.prioridad] ||
      fechaClave(a, hoy).localeCompare(fechaClave(b, hoy)) ||
      a.titulo.localeCompare(b.titulo, "es")
  );
}

// Lo que corresponde leer en el resumen de un día.
export function delDia(entradas, dia = hoyISO()) {
  return entradas.filter(
    (e) => e.frecuencia === "diario" || e.fecha === dia || proximoCobro(e, dia) === dia
  );
}

// Lo que corresponde al resumen de un mes ("YYYY-MM").
export function delMes(entradas, mes = hoyISO().slice(0, 7)) {
  return entradas.filter(
    (e) =>
      e.frecuencia === "mensual" ||
      e.frecuencia === "diario" ||
      e.frecuencia === "semanal" ||
      (e.fecha && e.fecha.startsWith(mes)) ||
      e.diaCobro != null
  );
}

export function buscar(entradas, texto) {
  const q = texto.trim().toLowerCase();
  if (!q) return entradas;
  return entradas.filter((e) => `${e.titulo} ${e.nota}`.toLowerCase().includes(q));
}

// Costo mensual equivalente de una entrada recurrente.
export function costoMensual(e) {
  if (e.monto == null) return 0;
  switch (e.frecuencia) {
    case "diario": return (e.monto * 365) / 12;
    case "semanal": return (e.monto * 52) / 12;
    case "anual": return e.monto / 12;
    default: return e.monto; // mensual o único con día de cobro
  }
}

function sumarPorMoneda(acc, moneda, monto) {
  acc[moneda] = Math.round(((acc[moneda] || 0) + monto) * 100) / 100;
  return acc;
}

export function totales(entradas, hoy = hoyISO()) {
  const res = {
    billeteras: {}, efectivo: {}, ahorros: {},
    disponible: {}, apartado: {}, porTipo: {},
    suscripcionesMes: {}, serviciosPendientes: {}, vencido: {},
  };
  for (const e of entradas) {
    if (CATS_DINERO.has(e.categoria)) {
      if (e.monto == null) continue;
      sumarPorMoneda(res[e.categoria], e.moneda, e.monto);
      sumarPorMoneda(e.tipoDinero === "disponible" ? res.disponible : res.apartado, e.moneda, e.monto);
      res.porTipo[e.tipoDinero] ??= {};
      sumarPorMoneda(res.porTipo[e.tipoDinero], e.moneda, e.monto);
    } else if (e.categoria === "suscripciones" && !e.cancelada && e.monto != null) {
      sumarPorMoneda(res.suscripcionesMes, e.moneda, costoMensual(e));
    } else if (e.categoria === "servicios") {
      const p = estadoPago(e, hoy);
      if (p?.resta > 0 && ["pendiente", "vencido", "parcial"].includes(p.estado)) {
        sumarPorMoneda(res.serviciosPendientes, e.moneda, p.resta);
        if (p.estado === "vencido" || (p.estado === "parcial" && p.atrasado)) sumarPorMoneda(res.vencido, e.moneda, p.resta);
      }
    }
  }
  return res;
}

// Lo vencido sin pagar y lo que vence o se cobra dentro de los próximos `dias`.
// Los accesos directos de servicios (origen "servicio") no son facturas: no cuentan.
export function proximosVencimientos(entradas, hoy = hoyISO(), dias = 7) {
  return entradas
    .filter((e) => e.origen !== "servicio")
    .map((e) => {
      const p = estadoPago(e, hoy);
      if (p) {
        if (!["pendiente", "vencido", "parcial"].includes(p.estado) || !p.vence) return null;
        return { entrada: e, fecha: p.vence, enDias: p.enDias, estado: p.estado, resta: p.resta };
      }
      const fecha = !e.hecho && proximoCobro(e, hoy);
      return fecha ? { entrada: e, fecha, enDias: diasEntre(hoy, fecha), estado: "pendiente", resta: e.monto } : null;
    })
    // Lo pagable con fecha pasada está vencido (o pagado en parte): siempre se muestra.
    .filter((x) => x && x.enDias <= dias)
    .sort((a, b) => a.enDias - b.enDias || PRIORIDADES[a.entrada.prioridad] - PRIORIDADES[b.entrada.prioridad]);
}

export function exportar(entradas) {
  return JSON.stringify({ version: 1, exportado: new Date().toISOString(), entradas }, null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  const lista = Array.isArray(datos) ? datos : datos.entradas;
  if (!Array.isArray(lista)) throw new Error("El archivo no tiene una lista de entradas");
  return lista.map(normalizar);
}
