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

// Mails que confirman un pago (no una factura nueva).
const CONFIRMA_PAGO = /recibimos (tu|su) pago|pago (acreditado|recibido|registrado|confirmado|aprobado)|gracias por (tu|su) pago|comprobante de pago|pagaste/i;

const cuerpoDe = (m, max = 1200) => (m.cuerpo ? m.cuerpo.slice(0, max) : m.snippet || "");

// Agrupa los mensajes clasificados en una entrada por servicio, fechada con su último mail,
// y además arma una entrada por cada mail que llegó hoy (lo nuevo del día).
export function resumir(mensajes, hoy = hoyISO()) {
  const grupos = new Map();
  const deHoy = [];
  for (const m of mensajes) {
    const c = clasificar(m);
    if (m.fecha === hoy && (c || m.bandeja)) deHoy.push({ m, categoria: c?.categoria || "gmail" });
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
    const nuevosHoy = ms.filter((m) => m.fecha === hoy).length;
    const base = {
      externoId: `gmail:${clave}`,
      categoria: g.categoria,
      fecha: ultimo.fecha,
      enlace: enlace(ultimo),
      nota: ms.slice(0, 5).map(linea).join("\n"),
    };
    const hoyTxt = nuevosHoy ? ` · ${nuevosHoy} hoy` : "";
    if (g.categoria === "suscripciones") {
      const monto = ms.map((m) => extraerMonto(`${m.subject} ${m.snippet} ${cuerpoDe(m, 600)}`)).find(Boolean);
      // Un recibo es un cobro hecho: ese mes la suscripción está pagada.
      entradas.push({ ...base, titulo: g.servicio[1], prioridad: "media", frecuencia: "mensual",
        monto: monto?.monto ?? null, moneda: monto?.moneda || "ARS",
        diaCobro: Number(ultimo.fecha.slice(8, 10)),
        deteccion: { estado: "pagado", periodo: ultimo.fecha.slice(0, 7), montoTotal: monto?.monto, montoPagado: monto?.monto, vence: ultimo.fecha },
        nota: `Último cobro: ${ultimo.fecha}\n${base.nota}\n\nÚltimo mail:\n${cuerpoDe(ultimo)}` });
    } else if (g.categoria === "servicios") {
      // La última factura y, si llegó después, la confirmación de pago.
      const factura = ms.find((m) => !CONFIRMA_PAGO.test(`${m.subject} ${m.snippet}`)) || ultimo;
      const pago = ms.find((m) => CONFIRMA_PAGO.test(`${m.subject} ${m.snippet}`) && m.fecha >= factura.fecha);
      const texto = `${factura.subject} ${factura.snippet} ${cuerpoDe(factura, 2000)}`;
      const vence = extraerVencimiento(texto, Number(factura.fecha.slice(0, 4)));
      const monto = extraerMonto(texto);
      const pronto = vence && vence <= sumarDias(hoy, 7);
      entradas.push({ ...base, titulo: g.servicio[1], prioridad: pago ? "baja" : pronto ? "alta" : "media",
        frecuencia: "mensual", fecha: vence || factura.fecha, monto: monto?.monto ?? null, moneda: monto?.moneda || "ARS",
        deteccion: {
          estado: pago ? "pagado" : vence && vence < hoy ? "vencido" : "pendiente",
          periodo: factura.fecha.slice(0, 7), vence, montoTotal: monto?.monto, montoPagado: pago ? monto?.monto : null,
        },
        nota: `${vence ? `Vence ${vence}\n` : ""}${pago ? `Pago confirmado el ${pago.fecha}\n` : ""}${base.nota}\n\nÚltima factura:\n${cuerpoDe(factura)}` });
    } else if (g.categoria === "billeteras") {
      // Sin monto: los mails informan movimientos, no el saldo.
      entradas.push({ ...base, titulo: `${g.servicio[1]} · ${ms.length} avisos${hoyTxt}`, prioridad: nuevosHoy ? "media" : "baja",
        nota: `${base.nota}\n\nÚltimo aviso:\n${cuerpoDe(ultimo, 600)}` });
    } else if (g.categoria === "redes") {
      entradas.push({ ...base, titulo: `${g.servicio[1]} · ${noLeidos} sin leer${hoyTxt}`, prioridad: "baja" });
    } else {
      entradas.push({ ...base, titulo: `Gmail · ${ms.length} importantes sin leer`, prioridad: "alta",
        enlace: "https://mail.google.com/mail/u/0/#search/is%3Aimportant+is%3Aunread" });
    }
  }
  // Lo que llegó hoy, uno por uno (máximo 25), para el resumen del día.
  for (const { m, categoria } of deHoy.slice(0, 25)) {
    entradas.push({
      externoId: `gmail:msg:${m.id}`,
      categoria,
      titulo: `📩 ${m.subject}`,
      prioridad: m.importante ? "alta" : "media",
      fecha: hoy,
      enlace: enlace(m),
      nota: `De: ${m.from}\n${cuerpoDe(m, 900)}`,
    });
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
      bandeja: (m.labelIds || []).includes("INBOX"),
    };
  });
  // Se lee el cuerpo completo solo de lo que importa: el último mail de cada factura,
  // suscripción y billetera, y lo que llegó hoy (máximo 40 mails).
  const hoy = hoyISO();
  const aLeer = new Map();
  const ultimos = new Map();
  for (const m of mensajes) {
    const c = clasificar(m);
    if (m.fecha === hoy && (c || m.bandeja)) aLeer.set(m.id, m);
    if (!c || !["servicios", "suscripciones", "billeteras"].includes(c.categoria)) continue;
    const clave = `${c.categoria}:${c.servicio[0]}`;
    const lista = ultimos.get(clave) || [];
    lista.push(m);
    ultimos.set(clave, lista);
  }
  for (const lista of ultimos.values()) {
    lista.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 2).forEach((m) => aLeer.set(m.id, m));
  }
  await enParalelo([...aLeer.values()].slice(0, 40), 6, async (m) => {
    try {
      m.cuerpo = textoDe((await api(token, `/messages/${m.id}?format=full`)).payload);
    } catch {
      // Sin cuerpo se resume con el fragmento.
    }
  });
  return resumir(mensajes, hoy);
}

// ---- Cuerpo del mail ----
function base64url(datos) {
  const bin = atob(datos.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Texto plano del mail (o el HTML sin etiquetas), sin espacios de más y recortado.
export function textoDe(payload, max = 2500) {
  const partes = [];
  const recorrer = (p) => {
    if (!p) return;
    if (p.body?.data && /^text\/(plain|html)/.test(p.mimeType || "")) partes.push({ tipo: p.mimeType, texto: base64url(p.body.data) });
    (p.parts || []).forEach(recorrer);
  };
  recorrer(payload);
  const plano = partes.find((p) => p.tipo.startsWith("text/plain"));
  let texto = plano ? plano.texto : partes[0] ? htmlATexto(partes[0].texto) : "";
  texto = texto.replace(/\r/g, "").replace(/[ \t\u00a0]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();
  return texto.slice(0, max);
}

function htmlATexto(html) {
  return decodeHTML(html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " "));
}

function decodeHTML(s) {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
