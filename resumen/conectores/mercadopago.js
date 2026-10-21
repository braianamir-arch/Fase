// Conector de Mercado Pago con tu Access Token (API oficial).
import { hoyISO } from "../core.js";

const API = "https://api.mercadopago.com";

// El token va como parámetro y no en el encabezado Authorization: con ese encabezado el
// navegador hace una consulta previa (CORS) que Mercado Pago rechaza en /users/me y en el
// saldo, y el pedido falla con "Failed to fetch". Viaja igual cifrado por HTTPS.
async function api(token, ruta) {
  const url = new URL(`${API}${ruta}`);
  url.searchParams.set("access_token", token);
  let r;
  try {
    r = await fetch(url, { referrerPolicy: "no-referrer", cache: "no-store" });
  } catch {
    throw new Error("No se pudo conectar con Mercado Pago (revisá tu conexión)");
  }
  if (r.status === 401) throw new Error("Token inválido o vencido: copiá de nuevo el Access Token de producción (APP_USR-…)");
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
  if (!/^APP_USR-/.test(token)) throw new Error("Ese no es el Access Token de producción: tiene que empezar con APP_USR-");
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
