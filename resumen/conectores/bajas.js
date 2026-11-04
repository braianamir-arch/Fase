// Páginas oficiales para dar de baja cada suscripción. Ninguna empresa permite cancelar
// desde otra app: el botón abre directo la pantalla de baja y vos confirmás ahí.
export const PAGINAS_BAJA = {
  netflix: "https://www.netflix.com/cancelplan",
  spotify: "https://www.spotify.com/account/subscription/",
  disney: "https://www.disneyplus.com/account/subscription",
  max: "https://auth.max.com/subscription",
  prime: "https://www.primevideo.com/settings/your-account",
  "youtube-premium": "https://www.youtube.com/paid_memberships",
  apple: "https://apps.apple.com/account/subscriptions",
  "google-play": "https://play.google.com/store/account/subscriptions",
  openai: "https://chatgpt.com/#settings/Account",
  paramount: "https://www.paramountplus.com/account/",
  crunchyroll: "https://www.crunchyroll.com/account/membership",
  microsoft: "https://account.microsoft.com/services",
  adobe: "https://account.adobe.com/plans",
  canva: "https://www.canva.com/settings/billing-and-teams",
  dropbox: "https://www.dropbox.com/account/plan",
  claude: "https://claude.ai/settings/billing",
};

// Débitos automáticos de Mercado Pago: sirve para cualquier suscripción que pagues con MP.
export const BAJA_MERCADOPAGO = "https://www.mercadopago.com.ar/subscriptions";

// externoId de Gmail: "gmail:suscripciones:<servicio>".
export function paginaBaja(entrada) {
  if (entrada.categoria !== "suscripciones") return null;
  const id = String(entrada.externoId || "").split(":").pop();
  if (PAGINAS_BAJA[id]) return PAGINAS_BAJA[id];
  const t = entrada.titulo.toLowerCase();
  const porTitulo = Object.keys(PAGINAS_BAJA).find((k) => t.includes(k.split("-")[0]));
  return porTitulo ? PAGINAS_BAJA[porTitulo] : BAJA_MERCADOPAGO;
}
