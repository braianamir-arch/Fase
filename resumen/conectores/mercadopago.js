// Conector de Mercado Pago con tu Access Token (API oficial).
import { hoyISO } from "../core.js";

const API = "https://api.mercadopago.com";

async function api(token, ruta) {
  const r = await fetch(`${API}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// pagos: resultados de /v1/payments/search -> resumen de los últimos 30 días.
export function resumirPagos(pagos, saldo, hoy = hoyISO()) {
  const aprobados = pagos.filter((p) => p.status === "approved");
  const total = aprobados.reduce((s, p) => s + (p.transaction_amount || 0), 0);
  const pendientes = pagos.filter((p) => p.status === "pending" || p.status === "in_process");
  const lineas = aprobados.slice(0, 8).map((p) =>
    `• ${String(p.date_created).slice(5, 10).split("-").reverse().join("/")} ${p.description || p.operation_type || "pago"} — $ ${p.transaction_amount}`);
  const entradas = [{
    externoId: "mp:cuenta",
    categoria: "bancos",
    titulo: "Mercado Pago",
    monto: saldo,
    moneda: "ARS",
    prioridad: pendientes.length ? "alta" : "media",
    frecuencia: "diario",
    fecha: hoy,
    enlace: "https://www.mercadopago.com.ar/activities",
    nota: [
      saldo == null ? "Saldo no disponible con este token (cargalo a mano si querés que sume)." : null,
      `Últimos 30 días: ${aprobados.length} cobros aprobados por $ ${Math.round(total * 100) / 100}`,
      pendientes.length ? `${pendientes.length} pagos pendientes / en proceso` : null,
      ...lineas,
    ].filter(Boolean).join("\n"),
  }];
  return entradas;
}

export async function sincronizar(token, hoy = hoyISO()) {
  if (!token) throw new Error("Falta el Access Token de Mercado Pago");
  const yo = await api(token, "/users/me");
  let saldo = null;
  try {
    const b = await api(token, `/users/${yo.id}/mercadopago_account/balance`);
    saldo = b.available_balance ?? b.total_amount ?? null;
  } catch {
    // Endpoint no habilitado para todas las cuentas: seguimos sin saldo.
  }
  const q = new URLSearchParams({
    sort: "date_created", criteria: "desc", limit: "100",
    range: "date_created", begin_date: "NOW-30DAYS", end_date: "NOW",
  });
  const pagos = await api(token, `/v1/payments/search?${q}`);
  return resumirPagos(pagos.results || [], saldo, hoy);
}
