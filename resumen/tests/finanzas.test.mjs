import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarFinanzas, primerMesPago, cuotasDelMes, resumenTarjeta, resumenMes, proyeccion, consejo,
  estadoFijo, sumarMeses, mesesEntre, fijosDelMes,
} from "../finanzas.js";

const base = () => normalizarFinanzas({
  sueldo: { monto: 800000, dia: 5 },
  ingresos: [{ concepto: "Changa", monto: 50000, fecha: "2026-11-10" }],
  gastos: [
    { concepto: "Alquiler", monto: 300000, tipo: "fijo", categoria: "casa", fecha: "2026-09-01", dia: 10 },
    { concepto: "Gimnasio", monto: 25000, tipo: "fijo", categoria: "salud", fecha: "2026-09-01", dia: 15, hasta: "2026-12" },
    { concepto: "Súper", monto: 40000, tipo: "variable", categoria: "comida", fecha: "2026-11-02" },
    { concepto: "Cine", monto: 12000, tipo: "variable", categoria: "salidas", fecha: "2026-10-01" },
  ],
  tarjetas: [{ id: "visa", nombre: "Visa", limite: 1000000, cierre: 25, vence: 5 }],
  compras: [
    { tarjetaId: "visa", concepto: "Heladera", monto: 600000, cuotas: 6, fecha: "2026-10-20", categoria: "casa" },
    { tarjetaId: "visa", concepto: "Zapatillas", monto: 90000, cuotas: 3, fecha: "2026-10-28", categoria: "ropa" },
  ],
});

test("meses: sumar y distancia", () => {
  assert.equal(sumarMeses("2026-11", 2), "2027-01");
  assert.equal(sumarMeses("2026-01", -1), "2025-12");
  assert.equal(mesesEntre("2026-11", "2027-02"), 3);
});

test("primera cuota según cierre y vencimiento de la tarjeta", () => {
  const t = { cierre: 25, vence: 5 };
  assert.equal(primerMesPago({ fecha: "2026-10-20" }, t), "2026-11"); // cierra en oct, vence 5/11
  assert.equal(primerMesPago({ fecha: "2026-10-28" }, t), "2026-12"); // después del cierre
  assert.equal(primerMesPago({ fecha: "2026-10-03" }, { cierre: 5, vence: 20 }), "2026-10"); // vence el mismo mes
});

test("cuotas del mes: número de cuota y redondeo exacto", () => {
  const f = base();
  const nov = cuotasDelMes(f, "2026-11");
  assert.deepEqual(nov.map((c) => [c.compra.concepto, c.numero, c.de, c.monto]), [["Heladera", 1, 6, 100000]]);
  const dic = cuotasDelMes(f, "2026-12");
  assert.deepEqual(dic.map((c) => [c.compra.concepto, c.numero, c.monto]), [["Heladera", 2, 100000], ["Zapatillas", 1, 30000]]);
  const raro = normalizarFinanzas({ tarjetas: [{ id: "t" }], compras: [{ tarjetaId: "t", monto: 100, cuotas: 3, fecha: "2026-01-01" }] });
  const suma = [0, 1, 2].map((k) => cuotasDelMes(raro, sumarMeses("2026-02", k))[0].monto).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(suma * 100) / 100, 100);
});

test("resumen de tarjeta: cuánto debe, pagó, deuda total y disponible", () => {
  const f = base();
  let r = resumenTarjeta(f, "visa", "2026-12", "2026-12-01");
  assert.equal(r.total, 130000);
  assert.equal(r.estado, "pendiente");
  assert.equal(r.deuda, 590000); // 5 cuotas de heladera + 3 de zapatillas
  assert.equal(r.disponible, 410000);
  f.pagosTarjeta["visa:2026-12"] = 50000;
  r = resumenTarjeta(f, "visa", "2026-12", "2026-12-10");
  assert.deepEqual([r.estado, r.pagado, r.debe, r.deuda], ["parcial", 50000, 80000, 540000]);
  assert.equal(resumenTarjeta(f, "visa", "2026-11", "2026-11-06").estado, "vencido");
  assert.equal(resumenTarjeta(f, "visa", "2026-10", "2026-10-28").gastadoMes, 690000);
});

test("resumen del mes: ingresos, gastos por tipo y categoría, cuánto puede gastar", () => {
  const f = base();
  f.gastos[0].pagos["2026-11"] = 300000;
  const r = resumenMes(f, "2026-11", "2026-11-12");
  assert.equal(r.ingresos, 850000);
  assert.deepEqual([r.fijos.total, r.fijos.pagado, r.variables.total, r.tarjetas.total], [325000, 300000, 40000, 100000]);
  assert.equal(r.gastos, 465000);
  assert.equal(r.pagado, 340000);
  assert.equal(r.porPagar, 125000);
  assert.equal(r.puedeGastar, 385000);
  assert.deepEqual(r.porCategoria, { casa: 400000, salud: 25000, comida: 40000 });
});

test("fijos: vigencia, estado y vencimiento", () => {
  const f = base();
  assert.equal(fijosDelMes(f, "2027-01").length, 1); // el gimnasio termina en diciembre
  const alquiler = f.gastos[0];
  assert.equal(estadoFijo(alquiler, "2026-11", "2026-11-05").estado, "pendiente");
  assert.equal(estadoFijo(alquiler, "2026-11", "2026-11-11").estado, "vencido");
  alquiler.pagos["2026-11"] = 100000;
  assert.deepEqual([estadoFijo(alquiler, "2026-11", "2026-11-11").estado, estadoFijo(alquiler, "2026-11", "2026-11-11").resta], ["parcial", 200000]);
});

test("proyección de los próximos meses y últimas cuotas", () => {
  const p = proyeccion(base(), "2026-11", 6);
  assert.deepEqual(p.map((m) => [m.mes, m.total]), [
    ["2026-11", 465000], ["2026-12", 455000], ["2027-01", 430000], ["2027-02", 430000], ["2027-03", 400000], ["2027-04", 400000],
  ]);
  assert.deepEqual(p.find((m) => m.mes === "2027-02").ultimasCuotas, ["Zapatillas"]);
  assert.equal(p[0].sobra, 385000);
});

test("consejo compara con el mes pasado o calcula cuánto queda por día", () => {
  const f = base();
  // Hasta el día 12: octubre 12.000 (cine), noviembre 40.000 → 233% más.
  assert.deepEqual(consejo(f, "2026-11-12"), { clave: "mas", pct: 233 });
  const sinOctubre = base();
  sinOctubre.gastos = sinOctubre.gastos.filter((g) => g.concepto !== "Cine");
  assert.deepEqual(consejo(sinOctubre, "2026-11-12"), { clave: "disponible", monto: 385000, porDia: 20263.16 });
  f.gastos.push(...normalizarFinanzas({ gastos: [{ concepto: "x", monto: 20000, tipo: "variable", fecha: "2026-10-01" }] }).gastos);
  // Octubre al día 2: 32.000; noviembre al día 2: 40.000 → 25% más.
  assert.deepEqual(consejo(f, "2026-11-02"), { clave: "mas", pct: 25 });
  assert.deepEqual(consejo(normalizarFinanzas({}), "2026-11-02"), { clave: "vacio" });
});

test("normalizar descarta datos inválidos y compras de tarjetas inexistentes", () => {
  const f = normalizarFinanzas({
    gastos: [{ monto: "abc", fecha: "2026-11-01" }, { monto: 10, fecha: "mal" }, { monto: 5, fecha: "2026-11-01", categoria: "xx" }],
    compras: [{ tarjetaId: "no-existe", monto: 10, fecha: "2026-11-01" }],
  });
  assert.equal(f.gastos.length, 1);
  assert.equal(f.gastos[0].categoria, "otros");
  assert.equal(f.compras.length, 0);
});
