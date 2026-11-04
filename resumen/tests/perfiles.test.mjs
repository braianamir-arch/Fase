import { test } from "node:test";
import assert from "node:assert/strict";
import { listar, agregar, eliminar, renombrar, claveBoveda, claveHuella, PRINCIPAL, sesionEnMemoria } from "../perfiles.js";
import { crearLlave, cifrar, abrir, abrirConLlave } from "../seguridad.js";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

test("el usuario de antes pasa a ser el perfil principal", () => {
  const a = memoria();
  assert.deepEqual(listar(a), []);
  a.setItem("todo-en-uno:boveda", "{}");
  assert.deepEqual(listar(a), [{ id: PRINCIPAL, nombre: "Principal", tipo: "completo" }]);
});

test("agregar, renombrar y eliminar perfiles; cada uno con su bóveda y su huella", () => {
  const a = memoria();
  const yo = agregar({ nombre: "Braian", tipo: "completo" }, a);
  assert.equal(yo.id, PRINCIPAL);
  const ella = agregar({ nombre: "Ella", tipo: "finanzas" }, a);
  assert.notEqual(ella.id, PRINCIPAL);
  assert.throws(() => agregar({ nombre: "ella", tipo: "finanzas" }, a), /Ya hay/);
  assert.throws(() => agregar({ nombre: "  " }, a), /nombre/);
  assert.notEqual(claveBoveda(ella.id), claveBoveda(yo.id));
  assert.notEqual(claveHuella(ella.id), claveHuella(yo.id));
  renombrar(ella.id, "Sofi", a);
  assert.equal(listar(a).find((p) => p.id === ella.id).nombre, "Sofi");
  a.setItem(claveBoveda(ella.id), "x");
  eliminar(ella.id, a);
  assert.deepEqual(listar(a).map((p) => p.nombre), ["Braian"]);
  assert.equal(a.getItem(claveBoveda(ella.id)), null);
});

test("cada perfil se abre solo con su contraseña; la sesión recordada abre sin pedirla", async () => {
  const llaveYo = await crearLlave("gato-azul-7");
  const llaveElla = await crearLlave("luna-roja-3");
  const bovedaYo = await cifrar(llaveYo, { secreto: "mío" });
  const bovedaElla = await cifrar(llaveElla, { secreto: "de ella" });
  await assert.rejects(abrir("gato-azul-7", bovedaElla), /PIN incorrecto/);
  await assert.rejects(abrirConLlave(llaveYo, bovedaElla), /no corresponde/);
  const sesion = sesionEnMemoria();
  await sesion.guardar("ella", llaveElla);
  const s = await sesion.leer();
  assert.equal(s.perfilId, "ella");
  assert.deepEqual((await abrirConLlave(s, bovedaElla)).datos, { secreto: "de ella" });
  await sesion.borrar();
  assert.equal(await sesion.leer(), null);
  assert.deepEqual((await abrir("gato-azul-7", bovedaYo)).datos, { secreto: "mío" });
});
