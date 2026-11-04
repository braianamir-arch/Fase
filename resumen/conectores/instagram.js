// Conector de Instagram sin Facebook ("Instagram API con inicio de sesión de Instagram").
// Necesita una cuenta profesional (creador, gratis) y un token generado en el panel de Meta.
// El token dura 60 días: la app lo renueva sola mientras la uses.
import { hoyISO } from "../core.js";

const API = "https://graph.instagram.com/v21.0";
const RENOVAR_CADA_MS = 7 * 86400000;

// access_token como parámetro: pedido simple, sin consulta previa de CORS.
async function api(token, ruta, campos = {}, base = API) {
  const url = new URL(`${base}${ruta}`);
  for (const [k, v] of Object.entries(campos)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  let r;
  try {
    r = await fetch(url, { referrerPolicy: "no-referrer", cache: "no-store" });
  } catch {
    throw new Error("No se pudo conectar con Instagram (revisá tu conexión)");
  }
  const json = await r.json().catch(() => ({}));
  if (!r.ok || json.error) {
    if (json.error?.code === 190) throw new Error("El token de Instagram venció o es inválido: generá uno nuevo en el panel de Meta");
    throw new Error(`Instagram: ${json.error?.message || r.status}`);
  }
  return json;
}

// Renueva el token si pasó una semana desde la última vez. Devuelve { token, renovado } o null.
export async function renovarSiHaceFalta(token, renovadoEn, ahora = Date.now()) {
  if (renovadoEn && ahora - renovadoEn < RENOVAR_CADA_MS) return null;
  try {
    const r = await api(token, "/refresh_access_token", { grant_type: "ig_refresh_token" }, "https://graph.instagram.com");
    return r.access_token ? { token: r.access_token, renovado: ahora } : null;
  } catch {
    return null; // un token de menos de 24 h no se puede renovar todavía: no es un error
  }
}

const fechaCorta = (iso) => String(iso).slice(5, 10).split("-").reverse().join("/");
const num = (n) => (n == null ? "?" : Number(n).toLocaleString("es-AR"));

// perfil: /me; posts: /me/media con .comentarios; conversaciones: lista con updated_time o null.
export function resumirInstagram(perfil, posts, conversaciones, hoy = hoyISO()) {
  const desde = new Date(`${hoy}T12:00`);
  desde.setDate(desde.getDate() - 7);
  const semana = hoyISO(desde);
  const comentarios = posts.flatMap((p) => p.comentarios || [])
    .filter((c) => String(c.timestamp).slice(0, 10) >= semana && c.username !== perfil.username);
  const chats = conversaciones?.filter((c) => String(c.updated_time).slice(0, 10) >= semana).length ?? null;
  return [{
    externoId: `instagram:${perfil.user_id || perfil.id}`,
    categoria: "redes",
    titulo: `Instagram @${perfil.username} · ${num(perfil.followers_count)} seguidores`,
    prioridad: comentarios.length || chats ? "alta" : "baja",
    frecuencia: "diario",
    fecha: hoy,
    enlace: `https://www.instagram.com/${encodeURIComponent(perfil.username)}/`,
    nota: [
      `Seguís a ${num(perfil.follows_count)} · ${num(perfil.media_count)} publicaciones`,
      chats != null ? `💬 ${chats} conversaciones con mensajes esta semana` : null,
      comentarios.length ? `🗨️ ${comentarios.length} comentarios nuevos esta semana:` : "Sin comentarios nuevos esta semana.",
      ...comentarios.slice(0, 5).map((c) => `• @${c.username}: ${String(c.text).slice(0, 80)}`),
      posts.length ? "Últimas publicaciones:" : null,
      ...posts.slice(0, 5).map((p) => `• ${fechaCorta(p.timestamp)} ❤️ ${num(p.like_count)} 💬 ${num(p.comments_count)} ${String(p.caption || "").slice(0, 50)}`),
    ].filter(Boolean).join("\n"),
  }];
}

export async function sincronizar(token, hoy = hoyISO()) {
  if (!token) throw new Error("Falta el token de Instagram");
  const perfil = await api(token, "/me", { fields: "user_id,username,name,account_type,followers_count,follows_count,media_count" });
  const media = await api(token, "/me/media", { fields: "id,caption,timestamp,like_count,comments_count,permalink", limit: "10" })
    .catch(() => ({ data: [] }));
  const posts = media.data || [];
  for (const p of posts.slice(0, 5).filter((x) => x.comments_count > 0)) {
    p.comentarios = (await api(token, `/${p.id}/comments`, { fields: "username,text,timestamp", limit: "10" }).catch(() => ({ data: [] }))).data;
  }
  // Mensajes: solo si se dio el permiso de mensajes; si no, se omite.
  const conversaciones = await api(token, "/me/conversations", { platform: "instagram", fields: "updated_time", limit: "50" })
    .then((r) => r.data || []).catch(() => null);
  return resumirInstagram(perfil, posts, conversaciones, hoy);
}
