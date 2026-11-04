import { test } from "node:test";
import assert from "node:assert/strict";
import { fusionar3, igual, sincronizables, sinContenido } from "../sync.js";

const g = (id, monto, extra = {}) => ({ id, concepto: id, monto, ...extra });

test("cambios de un solo lado se toman de ese lado", () => {
  const base = { gastos: [g("a", 1), g("b", 2)] };
  const local = { gastos: [g("a", 10), g("b", 2)] };
  const remoto = { gastos: [g("a", 1), g("b", 20)] };
  assert.deepEqual(fusionar3(base, local, remoto), { gastos: [g("a", 10), g("b", 20)] });
});

test("altas en los dos lados se suman; bajas se respetan", () => {
  const base = { gastos: [g("a", 1), g("b", 2)] };
  const local = { gastos: [g("a", 1), g("c", 3)] }; // borró b, agregó c
  const remoto = { gastos: [g("a", 1), g("b", 2), g("d", 4)] }; // agregó d
  assert.deepEqual(fusionar3(base, local, remoto).gastos.map((x) => x.id), ["a", "c", "d"]);
});

test("borrado en un lado pero editado en el otro: se conserva lo editado", () => {
  const base = { gastos: [g("a", 1)] };
  assert.deepEqual(fusionar3(base, { gastos: [] }, { gastos: [g("a", 5)] }), { gastos: [g("a", 5)] });
});

test("mismo campo cambiado en los dos: gana este dispositivo; mapas de pagos se mezclan", () => {
  const base = { sueldo: { monto: 100 }, x: { pagos: { "2026-10": 5 } } };
  const local = { sueldo: { monto: 200 }, x: { pagos: { "2026-10": 5, "2026-11": 7 } } };
  const remoto = { sueldo: { monto: 300 }, x: { pagos: { "2026-10": 5, "2026-12": 9 } } };
  assert.deepEqual(fusionar3(base, local, remoto), { sueldo: { monto: 200 }, x: { pagos: { "2026-10": 5, "2026-11": 7, "2026-12": 9 } } });
});

test("primera vez sin base: se juntan las dos cosas", () => {
  const r = fusionar3(null, { gastos: [g("a", 1)], nombre: "R" }, { gastos: [g("b", 2)] });
  assert.deepEqual(r, { gastos: [g("a", 1), g("b", 2)], nombre: "R" });
});

test("no se sube la sesión de la nube y se detecta perfil vacío", () => {
  const s = sincronizables({ entradas: [], config: { a: 1, syncDispositivo: { sesion: "x" } }, finanzas: { gastos: [] } });
  assert.equal("syncDispositivo" in s.config, false);
  assert.equal(sinContenido(s), true);
  assert.equal(sinContenido({ entradas: [{ id: 1 }] }), false);
  assert.equal(igual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
});
