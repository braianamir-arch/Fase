import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarFinanzas, primerMesPago, cuotasDelMes, resumenTarjeta, resumenMes, proyeccion, consejo,
  estadoFijo, estadoVariable, sumarMeses, mesesEntre, fijosDelMes,
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

test("suscripciones: se repiten solas, se cobran solas y pueden ser en dólares", async () => {
  const { suscripcionesDelMes, aPesos } = await import("../finanzas.js");
  const f = normalizarFinanzas({
    sueldo: { monto: 800000 },
    gastos: [
      { concepto: "Netflix", monto: 9000, tipo: "suscripcion", fecha: "2026-10-01", dia: 8 },
      { concepto: "ChatGPT", monto: 20, moneda: "usd", tipo: "suscripcion", fecha: "2026-11-01", dia: 15 },
      { concepto: "Alquiler", monto: 300000, tipo: "fijo", fecha: "2026-09-01", dia: 10 },
      { concepto: "Súper", monto: 40000, tipo: "variable", fecha: "2026-11-02" },
    ],
  });
  const tasas = { USD: 1500 };
  assert.equal(f.gastos[1].moneda, "USD");
  assert.equal(f.gastos[0].categoria, "suscripciones");
  assert.equal(aPesos(20, "USD", tasas), 30000);
  assert.equal(aPesos(20, "EUR", tasas), 0);
  // Siguen apareciendo los meses que vienen sin cargarlas de nuevo.
  assert.equal(suscripcionesDelMes(f, "2027-03").length, 2);
  assert.equal(estadoFijo(f.gastos[0], "2026-11", "2026-11-10").estado, "cobrada");
  assert.equal(estadoFijo(f.gastos[1], "2026-11", "2026-11-10").estado, "pendiente");
  const r = resumenMes(f, "2026-11", "2026-11-10", tasas);
  assert.deepEqual([r.suscripciones.total, r.suscripciones.cobrado, r.todos], [39000, 9000, 379000]);
  assert.equal(r.gastos, 379000);
  assert.equal(r.porCategoria.suscripciones, 39000);
});

test("suscripción cargada a una tarjeta: va al resumen de cada mes, no se cuenta dos veces", async () => {
  const f = normalizarFinanzas({
    tarjetas: [{ id: "visa", nombre: "Visa", cierre: 25, vence: 5 }],
    gastos: [{ concepto: "Spotify", monto: 4000, tipo: "suscripcion", fecha: "2026-10-01", dia: 12, tarjetaId: "visa" }],
  });
  // Se cobra el 12 de octubre → cierra el 25/10 → se paga en noviembre.
  assert.deepEqual(cuotasDelMes(f, "2026-11").map((c) => [c.compra.concepto, c.numero, c.monto]), [["Spotify", null, 4000]]);
  assert.equal(cuotasDelMes(f, "2026-10").length, 0);
  const r = resumenMes(f, "2026-11", "2026-11-01");
  assert.deepEqual([r.suscripciones.total, r.suscripciones.enTarjeta, r.tarjetas.total, r.gastos], [0, 1, 4000, 4000]);
  assert.equal(resumenTarjeta(f, "visa", "2026-11", "2026-11-01").deuda, 4000);
});

test("compras en dólares, calendario de cuotas y monedas sin cotizar", async () => {
  const { calendarioCuotas, monedasSinCotizar } = await import("../finanzas.js");
  const f = normalizarFinanzas({
    tarjetas: [{ id: "visa", nombre: "Visa", limite: 2000000, cierre: 25, vence: 5 }],
    compras: [
      { tarjetaId: "visa", concepto: "Notebook", monto: 600, moneda: "USD", cuotas: 3, fecha: "2026-10-20" },
      { tarjetaId: "visa", concepto: "Zapatillas", monto: 90000, cuotas: 2, fecha: "2026-11-02" },
    ],
  });
  const tasas = { USD: 1500 };
  const nov = resumenTarjeta(f, "visa", "2026-11", "2026-11-03", tasas);
  assert.equal(nov.total, 300000);
  assert.equal(nov.deuda, 990000);
  const cal = calendarioCuotas(f, "2026-11", 12, tasas);
  assert.deepEqual(cal.map((m) => [m.mes, m.total, m.cuotas.map((c) => `${c.compra.concepto} ${c.numero}/${c.de}`).join(", ")]), [
    ["2026-11", 300000, "Notebook 1/3"],
    ["2026-12", 345000, "Notebook 2/3, Zapatillas 1/2"],
    ["2027-01", 345000, "Notebook 3/3, Zapatillas 2/2"],
  ]);
  assert.deepEqual(monedasSinCotizar(f, {}), ["USD"]);
  assert.deepEqual(monedasSinCotizar(f, tasas), []);
  const p = proyeccion(f, "2026-11", 3, tasas);
  assert.deepEqual(p[1].detalle.cuotas.map((c) => c.compra.concepto), ["Notebook", "Zapatillas"]);
});

test("sueldo con comisión: se suma la del mes y se estima el promedio para los que vienen", async () => {
  const { comisionDelMes, ingresosDelMes } = await import("../finanzas.js");
  const f = normalizarFinanzas({ sueldo: { monto: 500000, conComision: true, comisiones: { "2026-08": 90000, "2026-09": 120000, "2026-10": 150000 } } });
  assert.deepEqual(comisionDelMes(f, "2026-10"), { monto: 150000, estimada: false });
  assert.deepEqual(comisionDelMes(f, "2026-11"), { monto: 0, estimada: false });
  assert.deepEqual(comisionDelMes(f, "2026-11", true), { monto: 120000, estimada: true });
  assert.equal(ingresosDelMes(f, "2026-10"), 650000);
  const p = proyeccion(f, "2026-11", 2);
  assert.deepEqual([p[0].ingresos, p[1].ingresos, p[1].comision.estimada], [500000, 620000, true]);
  // Sin la opción activada no se suma nada.
  f.sueldo.conComision = false;
  assert.equal(ingresosDelMes(f, "2026-10"), 500000);
});

test("préstamos: número de cuota, monto distinto un mes, pago y fin solo", async () => {
  const { prestamosDelMes, cuotaPrestamo, montoDelMes } = await import("../finanzas.js");
  const f = normalizarFinanzas({
    sueldo: { monto: 800000 },
    gastos: [
      { concepto: "Mercado Crédito", monto: 45000, tipo: "prestamo", fecha: "2026-09-01", dia: 10, cuotas: 6 },
      { concepto: "Préstamo Naranja X", monto: 30000, tipo: "prestamo", fecha: "2026-11-01", dia: 15 },
    ],
  });
  const mc = f.gastos[0];
  assert.equal(mc.categoria, "prestamos");
  assert.equal(mc.hasta, "2027-02");
  assert.deepEqual(cuotaPrestamo(mc, "2026-11"), { numero: 3, de: 6 });
  assert.equal(prestamosDelMes(f, "2027-03").map((g) => g.concepto).join(), "Préstamo Naranja X");
  // Botón rápido: este mes la cuota vino distinta.
  mc.montosMes["2026-11"] = 52000;
  assert.equal(montoDelMes(mc, "2026-11"), 52000);
  assert.equal(montoDelMes(mc, "2026-12"), 45000);
  assert.deepEqual([estadoFijo(mc, "2026-11", "2026-11-12").estado, estadoFijo(mc, "2026-11", "2026-11-12").resta], ["vencido", 52000]);
  mc.pagos["2026-11"] = 52000;
  assert.equal(estadoFijo(mc, "2026-11", "2026-11-12").estado, "pagado");
  const r = resumenMes(f, "2026-11", "2026-11-12");
  assert.deepEqual([r.prestamos.total, r.prestamos.pagado, r.todos, r.gastos], [82000, 52000, 82000, 82000]);
  assert.equal(r.porCategoria.prestamos, 82000);
  const p = proyeccion(f, "2026-11", 4);
  assert.deepEqual(p.map((m) => m.prestamos), [82000, 75000, 75000, 75000]);
  assert.deepEqual(p[3].ultimasCuotas, ["Mercado Crédito"]);
});

test("préstamo recién cargado (sin normalizar) también termina en su última cuota", async () => {
  const { prestamosDelMes } = await import("../finanzas.js");
  const f = normalizarFinanzas({});
  f.gastos.push({ id: "x", concepto: "MC", monto: 10, moneda: "ARS", tipo: "prestamo", categoria: "prestamos", dia: 10, fecha: "2026-09-01", cuotas: 6, hasta: null, pagos: {}, montosMes: {} });
  assert.equal(prestamosDelMes(f, "2027-02").length, 1);
  assert.equal(prestamosDelMes(f, "2027-03").length, 0);
});

test("sueldo de meses futuros y medio de pago de suscripciones", async () => {
  const { sueldoDelMes, ingresosDelMes } = await import("../finanzas.js");
  const f = normalizarFinanzas({
    sueldo: { monto: 600000, sueldos: { "2027-01": 700000 } },
    tarjetas: [{ id: "visa", nombre: "Visa" }],
    gastos: [
      { concepto: "Netflix", monto: 9000, tipo: "suscripcion", fecha: "2026-11-01", dia: 5, medio: "efectivo" },
      { concepto: "Spotify", monto: 4000, tipo: "suscripcion", fecha: "2026-11-01", dia: 5 },
      { concepto: "iCloud", monto: 2, moneda: "USD", tipo: "suscripcion", fecha: "2026-11-01", dia: 5, medio: "credito", tarjetaId: "visa" },
      { concepto: "Gym", monto: 1, tipo: "suscripcion", fecha: "2026-11-01", dia: 5, medio: "credito", tarjetaId: "borrada" },
    ],
  });
  assert.equal(sueldoDelMes(f, "2026-12"), 600000);
  assert.equal(sueldoDelMes(f, "2027-01"), 700000);
  assert.equal(ingresosDelMes(f, "2027-01"), 700000);
  assert.deepEqual(proyeccion(f, "2026-12", 2).map((m) => m.ingresos), [600000, 700000]);
  assert.deepEqual(f.gastos.map((g) => g.medio), ["efectivo", "debito", "credito", "debito"]);
});

test("las notas de gastos y compras se guardan y se recortan", () => {
  const f = normalizarFinanzas({
    tarjetas: [{ id: "v" }],
    gastos: [{ concepto: "Luz", monto: 1, fecha: "2026-11-01", nota: "  pagado por homebanking  " }, { concepto: "x", monto: 1, fecha: "2026-11-01" }],
    compras: [{ tarjetaId: "v", monto: 1, fecha: "2026-11-01", nota: "a".repeat(2000) }],
  });
  assert.equal(f.gastos[0].nota, "pagado por homebanking");
  assert.equal(f.gastos[1].nota, "");
  assert.equal(f.compras[0].nota.length, 1000);
});

test("gasto variable: sin pagar, parcial y pagado en su mes", () => {
  const f = normalizarFinanzas({ gastos: [{ concepto: "Super", monto: 20000, tipo: "variable", categoria: "comida", fecha: "2026-11-03" }] });
  const g = f.gastos[0];
  assert.equal(estadoVariable(g).estado, "sinpagar");
  g.pagos["2026-11"] = 5000;
  assert.deepEqual([estadoVariable(g).estado, estadoVariable(g).resta], ["parcial", 15000]);
  g.pagos["2026-11"] = 20000;
  assert.equal(estadoVariable(g).estado, "pagado");
  assert.equal(normalizarFinanzas(f).gastos[0].pagos["2026-11"], 20000); // se conserva al guardar
});
