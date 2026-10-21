// Login con Google (Google Identity Services, sin servidor) y conector de Calendar.
// Necesita un "ID de cliente OAuth" de tipo Aplicación web (ver README).
import { hoyISO } from "../core.js";

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

let gisCargado = null;
function cargarGIS() {
  gisCargado ??= new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = ok;
    s.onerror = () => mal(new Error("No se pudo cargar el login de Google"));
    document.head.append(s);
  });
  return gisCargado;
}

let token = null; // { valor, vence } — solo en memoria, nunca en localStorage

export async function obtenerToken(clientId, { forzar = false } = {}) {
  if (!clientId) throw new Error("Falta el ID de cliente de Google (ver Conexiones → Google)");
  if (!forzar && token && token.vence > Date.now() + 60000) return token.valor;
  await cargarGIS();
  return new Promise((ok, mal) => {
    const cliente = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (r) => {
        if (r.error) return mal(new Error(`Google: ${r.error_description || r.error}`));
        token = { valor: r.access_token, vence: Date.now() + Number(r.expires_in) * 1000 };
        ok(token.valor);
      },
      error_callback: (e) => mal(new Error(`Google: ${e.message || e.type}`)),
    });
    cliente.requestAccessToken({ prompt: token ? "" : "consent" });
  });
}

export function cerrarSesion() {
  if (token && window.google?.accounts) google.accounts.oauth2.revoke(token.valor, () => {});
  token = null;
}

// Eventos del calendario principal -> entradas (desde hoy hasta fin del mes siguiente).
export function eventosAEntradas(eventos) {
  return eventos
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const fecha = (e.start?.date || e.start?.dateTime || "").slice(0, 10);
      const hora = e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "todo el día";
      return {
        externoId: `gcal:${e.id}`,
        categoria: "otros",
        titulo: `📅 ${e.summary || "(sin título)"}`,
        nota: [hora, e.location, e.description?.slice(0, 300)].filter(Boolean).join(" · "),
        prioridad: /urgente|importante|turno|médic|vence|pago/i.test(e.summary || "") ? "alta" : "media",
        frecuencia: "unico",
        fecha,
        enlace: e.htmlLink,
      };
    })
    .filter((e) => e.fecha);
}

export async function sincronizarCalendar(tok, hoy = hoyISO()) {
  const desde = new Date(`${hoy}T00:00`);
  const hasta = new Date(desde.getFullYear(), desde.getMonth() + 2, 1);
  const q = new URLSearchParams({
    timeMin: desde.toISOString(), timeMax: hasta.toISOString(),
    singleEvents: "true", orderBy: "startTime", maxResults: "250",
  });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  if (!r.ok) throw new Error(`Calendar ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return eventosAEntradas((await r.json()).items || []);
}
