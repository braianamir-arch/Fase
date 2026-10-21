// YouTube con el mismo login de Google: tu canal (si tenés) y los últimos comentarios.
import { hoyISO } from "../core.js";

export function resumirYouTube(canal, comentarios, hoy = hoyISO()) {
  if (!canal) return [];
  const s = canal.statistics || {};
  const desde = new Date(`${hoy}T12:00`);
  desde.setDate(desde.getDate() - 7);
  const semana = hoyISO(desde);
  const nuevos = comentarios.filter((c) => String(c.publishedAt).slice(0, 10) >= semana);
  return [{
    externoId: `youtube:${canal.id}`,
    categoria: "redes",
    titulo: `YouTube · ${canal.snippet?.title || "tu canal"} · ${Number(s.subscriberCount || 0).toLocaleString("es-AR")} suscriptores`,
    prioridad: nuevos.length ? "media" : "baja",
    frecuencia: "diario",
    fecha: hoy,
    enlace: `https://studio.youtube.com/channel/${encodeURIComponent(canal.id)}/comments/inbox`,
    nota: [
      `${Number(s.viewCount || 0).toLocaleString("es-AR")} vistas · ${s.videoCount || 0} videos`,
      nuevos.length ? `🗨️ ${nuevos.length} comentarios en la última semana:` : "Sin comentarios nuevos esta semana.",
      ...nuevos.slice(0, 5).map((c) => `• ${c.authorDisplayName}: ${String(c.textOriginal || "").slice(0, 80)}`),
    ].join("\n"),
  }];
}

async function api(token, ruta) {
  const r = await fetch(`https://www.googleapis.com/youtube/v3${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 403) throw new Error("YouTube: habilitá “YouTube Data API v3” en Google Cloud");
  if (!r.ok) throw new Error(`YouTube ${r.status}`);
  return r.json();
}

export async function sincronizar(token, hoy = hoyISO()) {
  const canales = await api(token, "/channels?part=snippet,statistics&mine=true");
  const canal = canales.items?.[0];
  if (!canal) return [];
  const hilos = await api(token, `/commentThreads?part=snippet&allThreadsRelatedToChannelId=${encodeURIComponent(canal.id)}&maxResults=20&order=time`)
    .catch(() => ({ items: [] }));
  const comentarios = (hilos.items || []).map((h) => h.snippet?.topLevelComment?.snippet).filter(Boolean);
  return resumirYouTube(canal, comentarios, hoy);
}
