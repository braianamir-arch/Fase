import { test } from "node:test";
import assert from "node:assert/strict";
import { urlLogin, urlRetorno, parsearRetorno, resumirMeta, sincronizar as sincronizarMeta } from "../conectores/meta.js";
import { resumirYouTube } from "../conectores/youtube.js";

test("login de Meta: URL, retorno y validación del state", () => {
  const u = new URL(urlLogin("123456789", "https://x.github.io/Fase/", "abc"));
  assert.equal(u.hostname, "www.facebook.com");
  assert.equal(u.searchParams.get("response_type"), "token");
  assert.equal(u.searchParams.get("redirect_uri"), "https://x.github.io/Fase/");
  assert.match(u.searchParams.get("scope"), /instagram_basic/);
  assert.equal(urlRetorno({ origin: "https://x.github.io", pathname: "/Fase/index.html" }), "https://x.github.io/Fase/");
  assert.deepEqual(parsearRetorno("#access_token=TOK&expires_in=100&state=abc", "abc", 0), { token: "TOK", vence: 100000 });
  assert.match(parsearRetorno("#access_token=TOK&state=otro", "abc").error, /no coincide/);
  assert.match(parsearRetorno("#error=access_denied&error_description=Cancelado&state=abc", "abc").error, /Cancelado/);
  assert.equal(parsearRetorno("", "abc"), null);
  assert.equal(parsearRetorno("#seccion", "abc"), null);
});

test("resumirMeta arma Instagram y Facebook con prioridad según pendientes", () => {
  const e = resumirMeta([{
    id: "p1", name: "Mi página", followers_count: 120, mensajesSinLeer: 0,
    instagram: {
      id: "ig1", username: "braian", followers_count: 1500, mensajesSinLeer: 2,
      posts: [
        { timestamp: "2026-10-19T10:00:00+0000", caption: "Hola", like_count: 40, comments_count: 1,
          comentarios: [{ username: "ana", text: "Genial", timestamp: "2026-10-20T10:00:00+0000" }] },
        { timestamp: "2026-09-01T10:00:00+0000", caption: "Vieja", like_count: 5, comments_count: 1,
          comentarios: [{ username: "x", text: "viejo", timestamp: "2026-09-02T10:00:00+0000" }] },
      ],
    },
  }], "2026-10-21");
  const ig = e.find((x) => x.externoId === "meta:ig:ig1");
  assert.equal(ig.prioridad, "alta");
  assert.match(ig.titulo, /@braian · 1\.500 seguidores/);
  assert.match(ig.nota, /2 conversaciones sin leer/);
  assert.match(ig.nota, /1 comentarios en la última semana/);
  assert.match(ig.nota, /@ana: Genial/);
  assert.equal(ig.enlace, "https://www.instagram.com/braian/");
  const fb = e.find((x) => x.externoId === "meta:fb:p1");
  assert.equal(fb.prioridad, "baja");
  assert.match(resumirMeta([], "2026-10-21")[0].titulo, /sin página/);
});

test("sincronizar Meta pide la Graph API con el token como parámetro y tolera permisos faltantes", async () => {
  const original = globalThis.fetch;
  const rutas = [];
  globalThis.fetch = async (url, opciones) => {
    const u = new URL(url);
    rutas.push(u.pathname);
    assert.equal(opciones.headers, undefined);
    assert.ok(u.searchParams.get("access_token"));
    const r = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });
    if (u.pathname.endsWith("/me/accounts")) return r({ data: [{ id: "p1", name: "Pág", access_token: "PT", instagram_business_account: { id: "ig1", username: "yo", followers_count: 10 } }] });
    if (u.pathname.endsWith("/conversations")) return r({ error: { message: "Falta permiso", code: 10 } }, 403);
    if (u.pathname.endsWith("/media")) return r({ data: [{ id: "m1", timestamp: "2026-10-20T00:00:00+0000", like_count: 3, comments_count: 1 }] });
    if (u.pathname.endsWith("/comments")) return r({ data: [{ username: "z", text: "hola", timestamp: "2026-10-20T01:00:00+0000" }] });
    return r({}, 404);
  };
  try {
    const e = await sincronizarMeta("TOKEN", "2026-10-21");
    assert.equal(e.length, 2);
    assert.match(e[0].nota, /@z: hola/);
    assert.ok(!/conversaciones sin leer/.test(e[0].nota));
  } finally {
    globalThis.fetch = original;
  }
});

test("resumirYouTube", () => {
  assert.deepEqual(resumirYouTube(null, []), []);
  const [e] = resumirYouTube({ id: "UC1", snippet: { title: "Canal" }, statistics: { subscriberCount: "2500", viewCount: "10000", videoCount: "12" } },
    [{ authorDisplayName: "Ana", textOriginal: "Buen video", publishedAt: "2026-10-20T00:00:00Z" }], "2026-10-21");
  assert.match(e.titulo, /Canal · 2\.500 suscriptores/);
  assert.equal(e.prioridad, "media");
  assert.match(e.nota, /Ana: Buen video/);
});
