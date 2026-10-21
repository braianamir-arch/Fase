// Conector de Meta (Facebook + Instagram) con la Graph API oficial.
// Instagram tiene que ser una cuenta profesional (creador o empresa, es gratis) vinculada a
// una página de Facebook: Meta no da acceso a cuentas personales desde 2024.
// Login con redirección (funciona igual en la app instalada del celular): el token vuelve en
// el "#" de la URL, se lee al cargar, se borra de la barra y vive solo en memoria.
import { hoyISO } from "../core.js";

const VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;
export const PERMISOS = [
  "pages_show_list", "pages_read_engagement",
  "instagram_basic", "instagram_manage_comments", "instagram_manage_messages",
];
const CLAVE_ESTADO = "todo-en-uno:meta-estado";

// Dirección exacta a la que vuelve Meta (hay que cargarla en la app de Meta).
export function urlRetorno(loc = location) {
  return `${loc.origin}${loc.pathname.replace(/index\.html$/, "")}`;
}

export function urlLogin(appId, retorno, estado) {
  const q = new URLSearchParams({
    client_id: appId, redirect_uri: retorno, response_type: "token",
    scope: PERMISOS.join(","), state: estado,
  });
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${q}`;
}

// Interpreta el "#..." de vuelta del login: { token, vence } | { error } | null.
export function parsearRetorno(hash, estadoEsperado, ahora = Date.now()) {
  if (!hash || hash.length < 2) return null;
  const p = new URLSearchParams(hash.slice(1));
  if (!p.has("access_token") && !p.has("error") && !p.has("error_reason")) return null;
  if (!estadoEsperado || p.get("state") !== estadoEsperado) return { error: "La respuesta de Meta no coincide con el pedido (probá conectar de nuevo)" };
  if (p.has("error") || p.has("error_reason")) return { error: `Meta: ${p.get("error_description") || p.get("error_reason") || p.get("error")}` };
  return { token: p.get("access_token"), vence: ahora + Number(p.get("expires_in") || 3600) * 1000 };
}

// Se llama una vez al abrir la app: toma el token del "#" y lo borra de la URL.
export function leerRetorno(win = window) {
  const estado = win.sessionStorage.getItem(CLAVE_ESTADO);
  const r = parsearRetorno(win.location.hash, estado);
  if (r) {
    win.sessionStorage.removeItem(CLAVE_ESTADO);
    win.history.replaceState(null, "", win.location.pathname + win.location.search);
  }
  return r;
}

export function irALogin(appId, win = window) {
  if (!/^\d{6,20}$/.test(appId || "")) throw new Error("Falta el ID de la app de Meta (solo números, ver Conexiones → Meta)");
  const estado = Array.from(win.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  win.sessionStorage.setItem(CLAVE_ESTADO, estado);
  win.location.assign(urlLogin(appId, urlRetorno(win.location), estado));
}

// ---- Resumen (puro) ----
const fechaCorta = (iso) => String(iso).slice(5, 10).split("-").reverse().join("/");
const num = (n) => (n == null ? "?" : Number(n).toLocaleString("es-AR"));

// paginas: [{ id, name, fan_count, followers_count, mensajesSinLeer, instagram: { username, followers_count,
//   media_count, posts: [{ timestamp, caption, like_count, comments_count, permalink, comentarios: [{username, text, timestamp}] }],
//   mensajesSinLeer } }]
export function resumirMeta(paginas, hoy = hoyISO()) {
  if (!paginas.length) {
    return [{
      externoId: "meta:sin-paginas", categoria: "redes", prioridad: "media", frecuencia: "diario", fecha: hoy,
      titulo: "Meta conectado, pero sin página ni Instagram profesional",
      nota: "Para ver Instagram: pasá tu cuenta a profesional (Configuración → Tipo de cuenta) y vinculala a una página de Facebook. Después volvé a sincronizar.",
    }];
  }
  const desde = new Date(`${hoy}T12:00`);
  desde.setDate(desde.getDate() - 7);
  const haceUnaSemana = hoyISO(desde);
  const entradas = [];
  for (const pg of paginas) {
    const ig = pg.instagram;
    if (ig) {
      const comentariosNuevos = ig.posts.flatMap((p) => p.comentarios || []).filter((c) => String(c.timestamp).slice(0, 10) >= haceUnaSemana);
      const pendiente = (ig.mensajesSinLeer || 0) > 0 || comentariosNuevos.length > 0;
      entradas.push({
        externoId: `meta:ig:${ig.id || ig.username}`,
        categoria: "redes",
        titulo: `Instagram @${ig.username} · ${num(ig.followers_count)} seguidores`,
        prioridad: pendiente ? "alta" : "baja",
        frecuencia: "diario",
        fecha: hoy,
        enlace: `https://www.instagram.com/${encodeURIComponent(ig.username)}/`,
        nota: [
          ig.mensajesSinLeer != null ? `💬 ${ig.mensajesSinLeer} conversaciones sin leer` : null,
          comentariosNuevos.length ? `🗨️ ${comentariosNuevos.length} comentarios en la última semana:` : "Sin comentarios nuevos esta semana.",
          ...comentariosNuevos.slice(0, 5).map((c) => `• @${c.username}: ${String(c.text).slice(0, 80)}`),
          ig.posts.length ? "Últimas publicaciones:" : null,
          ...ig.posts.slice(0, 5).map((p) => `• ${fechaCorta(p.timestamp)} ❤️ ${num(p.like_count)} 💬 ${num(p.comments_count)} ${String(p.caption || "").slice(0, 50)}`),
        ].filter(Boolean).join("\n"),
      });
    }
    entradas.push({
      externoId: `meta:fb:${pg.id}`,
      categoria: "redes",
      titulo: `Facebook · ${pg.name} · ${num(pg.followers_count ?? pg.fan_count)} seguidores`,
      prioridad: (pg.mensajesSinLeer || 0) > 0 ? "alta" : "baja",
      frecuencia: "diario",
      fecha: hoy,
      enlace: `https://www.facebook.com/${encodeURIComponent(pg.id)}`,
      nota: pg.mensajesSinLeer != null ? `💬 ${pg.mensajesSinLeer} conversaciones de Messenger sin leer` : "Página de Facebook conectada.",
    });
  }
  return entradas;
}

// ---- Red ----
// access_token como parámetro: pedido simple, sin consulta previa de CORS.
async function graph(token, ruta, campos = {}) {
  const url = new URL(`${GRAPH}${ruta}`);
  for (const [k, v] of Object.entries(campos)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const r = await fetch(url, { referrerPolicy: "no-referrer", cache: "no-store" });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || json.error) {
    if (json.error?.code === 190) throw new Error("La sesión de Meta venció: tocá Conectar de nuevo");
    throw new Error(`Meta: ${json.error?.message || r.status}`);
  }
  return json;
}

// Suma conversaciones sin leer; si falta el permiso de mensajes devuelve null (no es fatal).
async function sinLeer(tokenPagina, idPagina, plataforma) {
  try {
    const r = await graph(tokenPagina, `/${idPagina}/conversations`, { platform: plataforma, fields: "unread_count", limit: "50" });
    return (r.data || []).filter((c) => c.unread_count > 0).length;
  } catch {
    return null;
  }
}

export async function sincronizar(token, hoy = hoyISO()) {
  const cuentas = await graph(token, "/me/accounts", {
    fields: "id,name,access_token,fan_count,followers_count,instagram_business_account{id,username,followers_count,media_count}",
    limit: "25",
  });
  const paginas = [];
  for (const pg of cuentas.data || []) {
    const pagina = { id: pg.id, name: pg.name, fan_count: pg.fan_count, followers_count: pg.followers_count };
    pagina.mensajesSinLeer = await sinLeer(pg.access_token, pg.id, "messenger");
    const igb = pg.instagram_business_account;
    if (igb) {
      const media = await graph(token, `/${igb.id}/media`, { fields: "id,caption,timestamp,like_count,comments_count,permalink", limit: "10" })
        .catch(() => ({ data: [] }));
      const posts = media.data || [];
      for (const p of posts.slice(0, 5).filter((x) => x.comments_count > 0)) {
        p.comentarios = (await graph(token, `/${p.id}/comments`, { fields: "username,text,timestamp", limit: "10" }).catch(() => ({ data: [] }))).data;
      }
      pagina.instagram = { ...igb, posts, mensajesSinLeer: await sinLeer(pg.access_token, pg.id, "instagram") };
    }
    paginas.push(pagina);
  }
  return resumirMeta(paginas, hoy);
}
