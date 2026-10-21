import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirInstagram, sincronizar, renovarSiHaceFalta } from "../conectores/instagram.js";
import { resumirYouTube } from "../conectores/youtube.js";

const perfil = { user_id: "1", username: "braian", followers_count: 1500, follows_count: 300, media_count: 40 };

test("resumirInstagram: comentarios de la semana (sin los propios) y chats", () => {
  const [e] = resumirInstagram(perfil, [
    { timestamp: "2026-10-19T10:00:00+0000", caption: "Hola", like_count: 40, comments_count: 3, comentarios: [
      { username: "ana", text: "Genial", timestamp: "2026-10-20T10:00:00+0000" },
      { username: "braian", text: "gracias", timestamp: "2026-10-20T11:00:00+0000" },
      { username: "x", text: "viejo", timestamp: "2026-09-02T10:00:00+0000" },
    ] },
  ], [{ updated_time: "2026-10-20T00:00:00+0000" }, { updated_time: "2026-08-01T00:00:00+0000" }], "2026-10-21");
  assert.match(e.titulo, /@braian · 1\.500 seguidores/);
  assert.equal(e.prioridad, "alta");
  assert.match(e.nota, /1 conversaciones con mensajes/);
  assert.match(e.nota, /1 comentarios nuevos/);
  assert.match(e.nota, /@ana: Genial/);
  assert.ok(!/gracias/.test(e.nota));
  const [tranquilo] = resumirInstagram(perfil, [], null, "2026-10-21");
  assert.equal(tranquilo.prioridad, "baja");
  assert.ok(!/conversaciones/.test(tranquilo.nota));
});

test("sincronizar Instagram: token como parámetro y mensajes opcionales", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opciones) => {
    const u = new URL(url);
    assert.equal(u.hostname, "graph.instagram.com");
    assert.equal(u.searchParams.get("access_token"), "IGTOKEN");
    assert.equal(opciones.headers, undefined);
    const r = (c, s = 200) => new Response(JSON.stringify(c), { status: s });
    if (u.pathname.endsWith("/me")) return r(perfil);
    if (u.pathname.endsWith("/me/media")) return r({ data: [{ id: "m1", timestamp: "2026-10-20T00:00:00+0000", like_count: 3, comments_count: 1 }] });
    if (u.pathname.endsWith("/comments")) return r({ data: [{ username: "z", text: "hola", timestamp: "2026-10-20T01:00:00+0000" }] });
    if (u.pathname.endsWith("/conversations")) return r({ error: { message: "sin permiso", code: 10 } }, 403);
    return r({}, 404);
  };
  try {
    const [e] = await sincronizar("IGTOKEN", "2026-10-21");
    assert.match(e.nota, /@z: hola/);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 190, message: "expired" } }), { status: 400 });
    await assert.rejects(sincronizar("IGTOKEN"), /venció/);
  } finally {
    globalThis.fetch = original;
  }
});

test("renovarSiHaceFalta renueva cada 7 días y no falla si no se puede", async () => {
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async (url) => {
    llamadas++;
    assert.match(String(url), /refresh_access_token\?grant_type=ig_refresh_token/);
    return new Response(JSON.stringify({ access_token: "NUEVO", expires_in: 5184000 }));
  };
  try {
    assert.equal(await renovarSiHaceFalta("T", Date.now() - 1000), null);
    assert.equal(llamadas, 0);
    assert.deepEqual(await renovarSiHaceFalta("T", 0, 10 * 86400000), { token: "NUEVO", renovado: 10 * 86400000 });
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "too new" } }), { status: 400 });
    assert.equal(await renovarSiHaceFalta("T", null), null);
  } finally {
    globalThis.fetch = original;
  }
});

test("resumirYouTube", () => {
  assert.deepEqual(resumirYouTube(null, []), []);
  const [e] = resumirYouTube({ id: "UC1", snippet: { title: "Canal" }, statistics: { subscriberCount: "2500", viewCount: "10000", videoCount: "12" } },
    [{ authorDisplayName: "Ana", textOriginal: "Buen video", publishedAt: "2026-10-20T00:00:00Z" }], "2026-10-21");
  assert.match(e.titulo, /Canal · 2\.500 suscriptores/);
  assert.match(e.nota, /Ana: Buen video/);
});
