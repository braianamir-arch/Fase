// Conector de Gmail: lee (solo lectura) los mails recientes y los convierte en resúmenes
// por categoría. La clasificación es pura y se prueba sin red.
import { extraerMonto, extraerVencimiento } from "./texto.js";
import { hoyISO } from "../core.js";

const PAGO = /recibo|factura|pago|cobro|receipt|payment|invoice|renova|renewal|suscrip|subscription|membres|cargo/i;

// [id, nombre, regex sobre el remitente]
export const SERVICIOS = {
  suscripciones: [
    ["netflix", "Netflix", /netflix/i],
    ["spotify", "Spotify", /spotify/i],
    ["disney", "Disney+", /disney/i],
    ["max", "Max / HBO", /hbomax|@max\.com|hbo/i],
    ["prime", "Amazon Prime", /primevideo|amazon/i],
    ["youtube-premium", "YouTube Premium", /youtube/i],
    ["apple", "Apple / iCloud", /apple\.com|itunes|icloud/i],
    ["google-play", "Google Play / One", /googleplay|google\.com/i],
    ["openai", "ChatGPT", /openai/i],
    ["paramount", "Paramount+", /paramount/i],
    ["crunchyroll", "Crunchyroll", /crunchyroll/i],
    ["microsoft", "Microsoft / Xbox", /microsoft|xbox/i],
    ["adobe", "Adobe", /adobe/i],
    ["canva", "Canva", /canva/i],
    ["dropbox", "Dropbox", /dropbox/i],
    ["claude", "Claude", /anthropic/i],
  ],
  // Billeteras: Mercado Pago tiene API propia; Naranja X y MODO solo avisan por mail.
  billeteras: [
    ["mercadopago", "Mercado Pago", /mercadopago|mercadolibre/i],
    ["naranjax", "Naranja X", /naranja/i],
    ["modo", "MODO", /modo\.com\.ar|@modo/i],
  ],
  servicios: [
    ["osse", "OSSE (agua)", /osse|obras ?sanitarias/i],
    ["naturgysj", "Naturgy San Juan (luz)", /naturgysj|naturgy ?san ?juan/i],
    ["ecogas", "Ecogas (gas)", /ecogas/i],
    ["edenor", "Edenor (luz)", /edenor/i],
    ["edesur", "Edesur (luz)", /edesur/i],
    ["metrogas", "Metrogas", /metrogas/i],
    ["naturgy", "Naturgy", /naturgy/i],
    ["camuzzi", "Camuzzi (gas)", /camuzzi/i],
    ["aysa", "AySA (agua)", /aysa/i],
    ["personal", "Personal", /personal\.com\.ar/i],
    ["movistar", "Movistar", /movistar/i],
    ["claro", "Claro", /claro/i],
    ["telecentro", "Telecentro", /telecentro/i],
    ["fibertel", "Fibertel / Flow", /fibertel|telecom|flow/i],
    ["directv", "DirecTV", /directv/i],
    ["arba", "ARBA", /arba/i],
    ["agip", "AGIP / ABL", /agip|abl/i],
    ["arca", "ARCA / AFIP", /afip|arca\.gob/i],
  ],
  redes: [
    ["instagram", "Instagram", /instagram/i],
    ["facebook", "Facebook", /facebookmail|facebook/i],
    ["x", "X / Twitter", /@x\.com|twitter/i],
    ["tiktok", "TikTok", /tiktok/i],
    ["linkedin", "LinkedIn", /linkedin/i],
    ["youtube", "YouTube", /youtube/i],
    ["threads", "Threads", /threads/i],
    ["whatsapp", "WhatsApp", /whatsapp/i],
    ["discord", "Discord", /discord/i],
    ["reddit", "Reddit", /reddit/i],
    ["twitch", "Twitch", /twitch/i],
    ["pinterest", "Pinterest", /pinterest/i],
  ],
};

function buscarServicio(categoria, remitente) {
  return SERVICIOS[categoria].find(([, , re]) => re.test(remitente));
}

// mensaje: { id, threadId, from, subject, snippet, fecha (ISO), noLeido, importante }
// -> { categoria, servicio: [id, nombre], mensaje } | null (si no interesa)
export function clasificar(m) {
  const texto = `${m.subject} ${m.snippet}`;
  // Resumen de tarjeta / vencimientos de billeteras van a "servicios" (hay que pagarlos).
  const billetera = buscarServicio("billeteras", m.from);
  if (billetera && /resumen|vencimiento|vence/i.test(m.subject)) return { categoria: "servicios", servicio: [`${billetera[0]}-tarjeta`, `Tarjeta ${billetera[1]}`], mensaje: m };
  if (billetera) return { categoria: "billeteras", servicio: billetera, mensaje: m };
  const servicio = buscarServicio("servicios", m.from);
  if (servicio) return { categoria: "servicios", servicio, mensaje: m };
  const sub = buscarServicio("suscripciones", m.from);
  if (sub && PAGO.test(texto)) return { categoria: "suscripciones", servicio: sub, mensaje: m };
  const red = buscarServicio("redes", m.from);
  if (red) return { categoria: "redes", servicio: red, mensaje: m };
  if (m.noLeido && m.importante) return { categoria: "gmail", servicio: ["importantes", "Importantes sin leer"], mensaje: m };
  return null;
}

const enlace = (m) => `https://mail.google.com/mail/u/0/#all/${m.threadId || m.id}`;
const linea = (m) => {
  const monto = extraerMonto(`${m.subject} ${m.snippet}`);
  // El fragmento del mail va recortado: sirve para que el resumen con IA diga de qué se trata.
  const fragmento = m.snippet ? ` — ${m.snippet.slice(0, 160)}` : "";
  return `• ${m.fecha.slice(5).split("-").reverse().join("/")} ${m.subject}${monto ? ` (${monto.moneda} ${monto.monto})` : ""}${fragmento}`;
};

// Agrupa los mensajes clasificados en una entrada por servicio.
export function resumir(mensajes, hoy = hoyISO()) {
  const grupos = new Map();
  for (const m of mensajes) {
    const c = clasificar(m);
    if (!c) continue;
    const clave = `${c.categoria}:${c.servicio[0]}`;
    if (!grupos.has(clave)) grupos.set(clave, { ...c, mensajes: [] });
    grupos.get(clave).mensajes.push(m);
  }
  const entradas = [];
  for (const [clave, g] of grupos) {
    const ms = g.mensajes.sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultimo = ms[0];
    const noLeidos = ms.filter((m) => m.noLeido).length;
    const base = {
      externoId: `gmail:${clave}`,
      categoria: g.categoria,
      fecha: hoy,
      enlace: enlace(ultimo),
      nota: ms.slice(0, 5).map(linea).join("\n"),
    };
    if (g.categoria === "suscripciones") {
      const monto = ms.map((m) => extraerMonto(`${m.subject} ${m.snippet}`)).find(Boolean);
      entradas.push({ ...base, titulo: g.servicio[1], prioridad: "media", frecuencia: "mensual",
        monto: monto?.monto ?? null, moneda: monto?.moneda || "ARS",
        diaCobro: Number(ultimo.fecha.slice(8, 10)), fecha: ultimo.fecha,
        nota: `Último cobro detectado en Gmail: ${ultimo.fecha}\n${base.nota}` });
    } else if (g.categoria === "servicios") {
      const texto = `${ultimo.subject} ${ultimo.snippet}`;
      const vence = extraerVencimiento(texto, Number(ultimo.fecha.slice(0, 4)));
      const monto = extraerMonto(texto);
      const pronto = vence && vence >= hoy && vence <= sumarDias(hoy, 7);
      entradas.push({ ...base, titulo: g.servicio[1], prioridad: pronto ? "alta" : "media",
        fecha: vence || ultimo.fecha, monto: monto?.monto ?? null, moneda: monto?.moneda || "ARS",
        nota: `${vence ? `Vence ${vence}\n` : ""}${base.nota}` });
    } else if (g.categoria === "billeteras") {
      // Sin monto: los mails informan movimientos, no el saldo.
      entradas.push({ ...base, titulo: `${g.servicio[1]} · ${ms.length} avisos`, prioridad: noLeidos ? "media" : "baja",
        frecuencia: "diario" });
    } else if (g.categoria === "redes") {
      entradas.push({ ...base, titulo: `${g.servicio[1]} · ${noLeidos} sin leer de ${ms.length}`, prioridad: "baja",
        frecuencia: "diario" });
    } else {
      entradas.push({ ...base, titulo: `Gmail · ${ms.length} importantes sin leer`, prioridad: "alta",
        frecuencia: "diario", enlace: "https://mail.google.com/mail/u/0/#search/is%3Aimportant+is%3Aunread" });
    }
  }
  return entradas;
}

function sumarDias(iso, n) {
  const d = new Date(`${iso}T12:00`);
  d.setDate(d.getDate() + n);
  return hoyISO(d);
}

// ---- Red ----
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function api(token, ruta) {
  const r = await fetch(`${API}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Ejecuta tareas con un máximo de `n` en paralelo.
async function enParalelo(items, n, fn) {
  const res = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      res[idx] = await fn(items[idx]);
    }
  }));
  return res;
}

export async function sincronizar(token, { dias = 30, maximo = 300 } = {}) {
  const ids = new Set();
  let pageToken = "";
  const q = encodeURIComponent(`newer_than:${dias}d -in:spam -in:trash -category:promotions`);
  do {
    const r = await api(token, `/messages?q=${q}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
    (r.messages || []).forEach((m) => ids.add(m.id));
    pageToken = r.nextPageToken;
  } while (pageToken && ids.size < maximo);
  const mensajes = await enParalelo([...ids].slice(0, maximo), 8, async (id) => {
    const m = await api(token, `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`);
    const h = Object.fromEntries((m.payload?.headers || []).map((x) => [x.name.toLowerCase(), x.value]));
    return {
      id: m.id, threadId: m.threadId,
      from: h.from || "", subject: h.subject || "(sin asunto)", snippet: decodeHTML(m.snippet || ""),
      fecha: hoyISO(new Date(Number(m.internalDate))),
      noLeido: (m.labelIds || []).includes("UNREAD"),
      importante: (m.labelIds || []).includes("IMPORTANT"),
    };
  });
  return resumir(mensajes);
}

function decodeHTML(s) {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
