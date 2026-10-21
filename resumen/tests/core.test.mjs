import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizar, ordenarPorPrioridad, delDia, delMes, totales,
  proximoCobro, proximosVencimientos, exportar, importar, buscar,
} from "../core.js";

const e = (x) => normalizar(x);

test("ordena por prioridad, luego fecha, y deja lo hecho al final", () => {
  const lista = [
    e({ titulo: "baja", prioridad: "baja", fecha: "2026-10-01" }),
    e({ titulo: "alta tarde", prioridad: "alta", fecha: "2026-10-20" }),
    e({ titulo: "alta hecha", prioridad: "alta", fecha: "2026-10-01", hecho: true }),
    e({ titulo: "alta temprano", prioridad: "alta", fecha: "2026-10-05" }),
    e({ titulo: "media", prioridad: "media", fecha: "2026-10-01" }),
  ];
  assert.deepEqual(
    ordenarPorPrioridad(lista, "2026-10-21").map((x) => x.titulo),
    ["alta temprano", "alta tarde", "media", "baja", "alta hecha"]
  );
});

test("normalizar corrige valores inválidos", () => {
  const n = normalizar({ titulo: "  ", prioridad: "urgente", categoria: "x", monto: "12.5", diaCobro: 40 });
  assert.equal(n.titulo, "(sin título)");
  assert.equal(n.prioridad, "media");
  assert.equal(n.categoria, "otros");
  assert.equal(n.monto, 12.5);
  assert.equal(n.diaCobro, 31);
});

test("proximoCobro respeta meses cortos y pasa al mes siguiente", () => {
  assert.equal(proximoCobro({ diaCobro: 31 }, "2026-02-10"), "2026-02-28");
  assert.equal(proximoCobro({ diaCobro: 5 }, "2026-10-21"), "2026-11-05");
  assert.equal(proximoCobro({ diaCobro: 21 }, "2026-10-21"), "2026-10-21");
  assert.equal(proximoCobro({ diaCobro: 10 }, "2026-12-15"), "2027-01-10");
});

test("delDia y delMes filtran lo que corresponde", () => {
  const lista = [
    e({ titulo: "diaria", frecuencia: "diario", fecha: "2026-01-01" }),
    e({ titulo: "hoy", fecha: "2026-10-21" }),
    e({ titulo: "netflix", categoria: "suscripciones", diaCobro: 21, fecha: "2026-01-01" }),
    e({ titulo: "vieja", fecha: "2026-09-01" }),
  ];
  assert.deepEqual(delDia(lista, "2026-10-21").map((x) => x.titulo), ["diaria", "hoy", "netflix"]);
  assert.deepEqual(delMes(lista, "2026-10").map((x) => x.titulo), ["diaria", "hoy", "netflix"]);
});

test("totales suma billeteras, efectivo, suscripciones y servicios pendientes", () => {
  const t = totales([
    e({ categoria: "billeteras", monto: 1000, moneda: "ARS" }),
    e({ categoria: "billeteras", monto: 50, moneda: "usd" }),
    e({ categoria: "servicios", monto: 300, moneda: "ARS" }),
    e({ categoria: "efectivo", monto: 200.5, moneda: "ARS" }),
    e({ categoria: "suscripciones", monto: 120, frecuencia: "anual", moneda: "USD" }),
    e({ categoria: "suscripciones", monto: 10, frecuencia: "mensual", moneda: "USD" }),
    e({ categoria: "suscripciones", monto: 99, frecuencia: "mensual", moneda: "USD", hecho: true }),
  ]);
  assert.deepEqual(t.billeteras, { ARS: 1000, USD: 50 });
  assert.deepEqual(t.serviciosPendientes, { ARS: 300 });
  assert.deepEqual(t.efectivo, { ARS: 200.5 });
  assert.deepEqual(t.disponible, { ARS: 1200.5, USD: 50 });
  assert.deepEqual(t.suscripcionesMes, { USD: 20 });
});

test("proximosVencimientos lista cobros en la ventana de días", () => {
  const lista = [
    e({ titulo: "spotify", categoria: "suscripciones", diaCobro: 25 }),
    e({ titulo: "luz", categoria: "servicios", fecha: "2026-10-22", prioridad: "alta" }),
    e({ titulo: "lejos", categoria: "suscripciones", diaCobro: 15 }),
  ];
  const r = proximosVencimientos(lista, "2026-10-21", 7);
  assert.deepEqual(r.map((x) => [x.entrada.titulo, x.enDias]), [["luz", 1], ["spotify", 4]]);
});

test("exportar/importar ida y vuelta, y buscar", () => {
  const lista = [e({ titulo: "Banco Galicia", nota: "caja de ahorro", categoria: "billeteras", monto: 5 })];
  const vuelta = importar(exportar(lista));
  assert.deepEqual(vuelta, lista);
  assert.equal(buscar(vuelta, "ahorro").length, 1);
  assert.equal(buscar(vuelta, "nada").length, 0);
  assert.throws(() => importar('{"x":1}'));
});

test("normalizar migra las categorías viejas", () => {
  assert.equal(normalizar({ categoria: "cuentas" }).categoria, "servicios");
  assert.equal(normalizar({ categoria: "bancos", origen: "mp" }).categoria, "billeteras");
  assert.equal(normalizar({ categoria: "bancos" }).categoria, "otros");
});

test("los accesos directos de servicios no figuran como vencimientos", async () => {
  const { proximosVencimientos } = await import("../core.js");
  const r = proximosVencimientos([
    normalizar({ titulo: "Agua", categoria: "servicios", origen: "servicio", externoId: "servicio:osse", fecha: "2026-10-21" }),
    normalizar({ titulo: "Luz", categoria: "servicios", origen: "gmail", externoId: "gmail:servicios:x", fecha: "2026-10-23" }),
  ], "2026-10-21", 7);
  assert.deepEqual(r.map((x) => x.entrada.titulo), ["Luz"]);
});
