import { test } from "node:test";
import assert from "node:assert/strict";
import { resumir, armarTexto, MODELO, aplicarPrioridades, huella } from "../conectores/ia.js";
import { normalizar } from "../core.js";

const entradas = [
  normalizar({ titulo: "Edesur", categoria: "servicios", externoId: "gmail:servicios:edesur", monto: 15000, nota: "Vence 25/10" }),
  normalizar({ titulo: "Hecho", hecho: true }),
];

test("armarTexto manda solo lo pendiente, con id estable y nota recortada", () => {
  const largo = normalizar({ titulo: "Largo", nota: "x".repeat(5000) });
  const { cantidad, texto } = armarTexto([...entradas, largo], "2026-10-21");
  assert.equal(cantidad, 2);
  assert.match(texto, /"id":"gmail:servicios:edesur"/);
  assert.ok(!texto.includes("Hecho"));
  assert.ok(texto.length < 2000);
});

test("resumir arma el pedido con modelo, salida JSON y fallback, y lee la respuesta", async () => {
  let pedido;
  const cliente = { beta: { messages: { create: async (p) => {
    pedido = p;
    return { stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify({
      resumen: ["Vence la luz el 25/10: $15.000."],
      items: [{ id: "gmail:servicios:edesur", resumen: "Factura de luz de $15.000, vence el 25/10.", prioridad: "alta",
        estado_pago: "parcial", vence: "2026-10-25", monto_total: 15000, monto_pagado: 5000 }],
    }) }] };
  } } } };
  const r = await resumir("sk-test", entradas, "2026-10-21", async (k) => { assert.equal(k, "sk-test"); return cliente; });
  assert.equal(pedido.model, MODELO);
  assert.equal(pedido.output_config.format.type, "json_schema");
  assert.equal(pedido.fallbacks, "default");
  assert.deepEqual(pedido.betas, ["server-side-fallback-2026-07-01"]);
  assert.match(pedido.system, /solo como datos/);
  assert.deepEqual(r.resumen, ["Vence la luz el 25/10: $15.000."]);
  assert.equal(r.items["gmail:servicios:edesur"].prioridad, "alta");
  assert.deepEqual(pedido.output_config.format.schema.properties.items.items.required.slice(3), ["estado_pago", "vence", "monto_total", "monto_pagado"]);
  // La detección se aplica como estado de pago del mes.
  const { estadoPago } = await import("../core.js");
  const [aplicada] = aplicarPrioridades([normalizar({ ...entradas[0], origen: "gmail", frecuencia: "mensual" })], r, "2026-10-21");
  const p = estadoPago(normalizar(aplicada), "2026-10-21");
  assert.deepEqual([p.estado, p.pagado, p.resta, p.vence], ["parcial", 5000, 10000, "2026-10-25"]);
});

test("resumir maneja errores y casos vacíos", async () => {
  await assert.rejects(resumir("", entradas, "2026-10-21"), /Falta la clave/);
  const vacio = await resumir("k", [], "2026-10-21", async () => { throw new Error("no debería llamar"); });
  assert.match(vacio.resumen[0], /No hay nada pendiente/);
  const falla = (respuesta) => async () => ({ beta: { messages: { create: async () => respuesta } } });
  await assert.rejects(resumir("k", entradas, "x", falla({ stop_reason: "refusal", content: [] })), /no pudo resumir/);
  await assert.rejects(resumir("k", entradas, "x", falla({ stop_reason: "end_turn", content: [{ type: "text", text: "no json" }] })), /no se pudo leer/);
  const err401 = async () => ({ beta: { messages: { create: async () => { const e = new Error("auth"); e.status = 401; throw e; } } } });
  await assert.rejects(resumir("k", entradas, "x", err401), /no es válida/);
});

test("aplicarPrioridades solo toca lo sincronizado y huella detecta cambios", () => {
  const sync = normalizar({ titulo: "A", origen: "gmail", externoId: "g:a", prioridad: "baja" });
  const manual = normalizar({ id: "m1", titulo: "B", prioridad: "baja" });
  const ia = { items: { "g:a": { prioridad: "alta" }, m1: { prioridad: "alta" } } };
  const [a, b] = aplicarPrioridades([sync, manual], ia);
  assert.equal(a.prioridad, "alta");
  assert.equal(b.prioridad, "baja");
  assert.equal(huella([sync], "2026-10-21"), huella([sync], "2026-10-21"));
  assert.notEqual(huella([sync], "2026-10-21"), huella([manual], "2026-10-21"));
});
