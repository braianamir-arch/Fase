// Lógica pura (sin DOM) de "Todo en uno": orden por prioridad, filtros y totales.

export const CATEGORIAS = [
  { id: "bancos", nombre: "Plata en bancos", icono: "🏦" },
  { id: "efectivo", nombre: "Efectivo", icono: "💵" },
  { id: "suscripciones", nombre: "Suscripciones", icono: "🔁" },
  { id: "cuentas", nombre: "Cuentas", icono: "🧾" },
  { id: "gmail", nombre: "Gmail", icono: "✉️" },
  { id: "redes", nombre: "Redes", icono: "📱" },
  { id: "otros", nombre: "Otros", icono: "📌" },
];

export const PRIORIDADES = { alta: 1, media: 2, baja: 3 };
export const FRECUENCIAS = ["unico", "diario", "semanal", "mensual", "anual"];

// Categorías cuyo monto cuenta como plata disponible.
const CATS_DINERO = new Set(["bancos", "efectivo"]);

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
  const frecuencia = FRECUENCIAS.includes(e.frecuencia) ? e.frecuencia : "unico";
  const categoria = CATEGORIAS.some((c) => c.id === e.categoria) ? e.categoria : "otros";
  const monto = e.monto === "" || e.monto == null ? null : Number(e.monto);
  const diaCobro = e.diaCobro ? Math.min(31, Math.max(1, Number(e.diaCobro))) : null;
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
    hecho: Boolean(e.hecho),
    // Entradas creadas por un conector: se reemplazan en cada sincronización.
    origen: e.origen ? String(e.origen) : null,
    externoId: e.externoId ? String(e.externoId) : null,
    enlace: typeof e.enlace === "string" && /^https:\/\//.test(e.enlace) ? e.enlace : null,
  };
}

// Reemplaza las entradas de un conector por las recién sincronizadas, conservando lo
// que el usuario marcó como hecho y sin tocar las entradas cargadas a mano.
export function fusionar(entradas, nuevas, origen) {
  const hechas = new Set(entradas.filter((e) => e.origen === origen && e.hecho).map((e) => e.externoId));
  const sincronizadas = nuevas.map((n) =>
    normalizar({ ...n, origen, hecho: n.externoId != null && hechas.has(n.externoId) })
  );
  return [...entradas.filter((e) => e.origen !== origen), ...sincronizadas];
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

// Fecha que se usa para ordenar dentro de la misma prioridad.
function fechaClave(e, hoy) {
  return proximoCobro(e, hoy) || e.fecha || "9999-12-31";
}

export function ordenarPorPrioridad(entradas, hoy = hoyISO()) {
  return [...entradas].sort(
    (a, b) =>
      Number(a.hecho) - Number(b.hecho) ||
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

export function totales(entradas) {
  const res = { bancos: {}, efectivo: {}, disponible: {}, suscripcionesMes: {} };
  for (const e of entradas) {
    if (e.monto == null) continue;
    if (CATS_DINERO.has(e.categoria)) {
      sumarPorMoneda(res[e.categoria], e.moneda, e.monto);
      sumarPorMoneda(res.disponible, e.moneda, e.monto);
    } else if (e.categoria === "suscripciones" && !e.hecho) {
      sumarPorMoneda(res.suscripcionesMes, e.moneda, costoMensual(e));
    }
  }
  return res;
}

// Suscripciones/cuentas con cobro o vencimiento dentro de los próximos `dias`.
export function proximosVencimientos(entradas, hoy = hoyISO(), dias = 7) {
  return entradas
    .filter((e) => !e.hecho)
    .map((e) => {
      const fecha = proximoCobro(e, hoy) || (e.categoria === "cuentas" ? e.fecha : null);
      return fecha ? { entrada: e, fecha, enDias: diasEntre(hoy, fecha) } : null;
    })
    .filter((x) => x && x.enDias >= 0 && x.enDias <= dias)
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
