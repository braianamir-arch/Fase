import { test } from "node:test";
import assert from "node:assert/strict";
import { crearLlave, cifrar, abrir, esBoveda, validarPin, esperaPorIntentos } from "../seguridad.js";

test("cifra y descifra con el PIN correcto, falla con otro", async () => {
  const llave = await crearLlave("clave-segura-1");
  const datos = { entradas: [{ titulo: "Galicia", monto: 1000 }], config: { mpToken: "APP_USR-secreto" } };
  const b = await cifrar(llave, datos);
  assert.ok(esBoveda(b));
  const texto = JSON.stringify(b);
  assert.ok(!texto.includes("Galicia") && !texto.includes("APP_USR"), "no debe quedar texto plano");
  const { datos: vuelta, llave: l2 } = await abrir("clave-segura-1", b);
  assert.deepEqual(vuelta, datos);
  // La llave reabierta sirve para volver a cifrar y el IV cambia cada vez.
  const b2 = await cifrar(l2, datos);
  assert.notEqual(b2.iv, b.iv);
  assert.deepEqual((await abrir("clave-segura-1", b2)).datos, datos);
  await assert.rejects(abrir("otra-clave", b), /PIN incorrecto/);
});

test("rechaza datos manipulados", async () => {
  const llave = await crearLlave("clave-segura-1");
  const b = await cifrar(llave, { a: 1 });
  const bytes = Buffer.from(b.datos, "base64");
  bytes[0] ^= 1;
  await assert.rejects(abrir("clave-segura-1", { ...b, datos: bytes.toString("base64") }), /PIN incorrecto/);
});

test("validarPin y espera por intentos", () => {
  assert.match(validarPin("123"), /al menos/);
  assert.match(validarPin("111111"), /obvio/);
  assert.match(validarPin("123456"), /obvio/);
  assert.equal(validarPin("gato-azul-7"), null);
  assert.equal(esperaPorIntentos(2), 0);
  assert.equal(esperaPorIntentos(3), 1000);
  assert.equal(esperaPorIntentos(50), 300000);
});
