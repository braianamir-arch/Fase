import { test } from "node:test";
import assert from "node:assert/strict";
import { activar, recuperarPin, activada, desactivar } from "../huella.js";

// Autenticador falso: PRF = HMAC(secreto del dispositivo, sal), como hace una passkey real.
function autenticador({ conPrf = true, secreto = "dispositivo-1" } = {}) {
  const pedidos = [];
  return {
    pedidos,
    async create(o) { pedidos.push(o); return { rawId: new Uint8Array([1, 2, 3]).buffer }; },
    async get(o) {
      pedidos.push(o);
      const sal = o.publicKey.extensions.prf.eval.first;
      const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const first = await crypto.subtle.sign("HMAC", k, sal);
      return { getClientExtensionResults: () => (conPrf ? { prf: { results: { first } } } : {}) };
    },
  };
}
const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }; };

test("activar guarda el PIN cifrado y la huella lo recupera", async () => {
  const cred = autenticador(), almacen = memoria();
  await activar("gato-azul-7", { cred, almacen, rpId: "ejemplo.github.io" });
  assert.ok(activada(almacen));
  assert.ok(![...almacen.m.values()].join().includes("gato-azul-7"), "el PIN no queda en texto plano");
  assert.equal(cred.pedidos[0].publicKey.authenticatorSelection.userVerification, "required");
  assert.equal(await recuperarPin({ cred, almacen, rpId: "ejemplo.github.io" }), "gato-azul-7");
  desactivar(almacen);
  assert.ok(!activada(almacen));
});

test("sin PRF no se activa, y otro dispositivo no descifra", async () => {
  await assert.rejects(activar("gato-azul-7", { cred: autenticador({ conPrf: false }), almacen: memoria(), rpId: "x" }), /no permite usar la huella/);
  const almacen = memoria();
  await activar("gato-azul-7", { cred: autenticador(), almacen, rpId: "x" });
  await assert.rejects(recuperarPin({ cred: autenticador({ secreto: "otro" }), almacen, rpId: "x" }), /no coincide/);
});
