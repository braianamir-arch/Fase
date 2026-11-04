// Cotizaciones públicas (sin login): dólar y otras monedas en pesos (dolarapi.com) y
// cripto en dólares (CoinGecko). Devuelve tasas en ARS por unidad.
export const CASAS_DOLAR = ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta", "cripto", "mayorista"];
const CRIPTO = { BTC: "bitcoin", ETH: "ethereum", USDT: "tether", USDC: "usd-coin", SOL: "solana", DAI: "dai" };

export function armarTasas(dolares, otras, cripto, casa = "blue") {
  const usd = dolares.find((d) => d.casa === casa) || dolares.find((d) => d.casa === "oficial");
  const tasas = {};
  if (usd?.venta) tasas.USD = usd.venta;
  for (const c of otras) if (c.moneda !== "USD" && c.venta) tasas[c.moneda] = c.venta;
  if (tasas.USD) {
    for (const [sim, id] of Object.entries(CRIPTO)) if (cripto?.[id]?.usd) tasas[sim] = cripto[id].usd * tasas.USD;
  }
  return { tasas, dolares, casa: usd?.casa || null, actualizado: usd?.fechaActualizacion || null };
}

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

export async function sincronizar(casa) {
  const [dolares, otras, cripto] = await Promise.all([
    json("https://dolarapi.com/v1/dolares"),
    json("https://dolarapi.com/v1/cotizaciones").catch(() => []),
    json(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(CRIPTO).join(",")}&vs_currencies=usd`).catch(() => ({})),
  ]);
  return armarTasas(dolares, otras, cripto, casa);
}
