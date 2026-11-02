import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../js/logica.js";

const A = "a", B = "b";

test("fechas locales y semana lunes-domingo", () => {
  assert.equal(L.diaSemana("2026-11-02"), 1); // lunes
  assert.equal(L.diaSemana("2026-11-08"), 7);
  assert.equal(L.inicioSemana("2026-11-08"), "2026-11-02");
  assert.deepEqual(L.semana("2026-11-04").slice(0, 2), ["2026-11-02", "2026-11-03"]);
  assert.equal(L.sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(L.diasDelMes("2026-02"), 28);
  assert.equal(L.fechaISO(new Date(2026, 10, 2, 23, 30)), "2026-11-02"); // de noche sigue siendo hoy
});

test("turno: el día cargado gana a la plantilla", () => {
  const plantillas = [{ user_id: A, start_time: "12:00:00", end_time: "20:00:00", weekdays: [1, 2, 3, 4, 5], place: "Trabajo" }];
  const lunes = L.turnoDelDia(A, "2026-11-02", [], plantillas);
  assert.equal(lunes.inicio, "12:00");
  assert.equal(lunes.fuente, "plantilla");
  assert.equal(L.turnoDelDia(A, "2026-11-08", [], plantillas), null); // domingo sin plantilla
  const franco = L.turnoDelDia(A, "2026-11-02", [{ user_id: A, date: "2026-11-02", off: true }], plantillas);
  assert.equal(franco.off, true);
});

test("estado ahora y turnos que cruzan medianoche", () => {
  const t = { off: false, inicio: "14:00", fin: "22:00" };
  assert.equal(L.estadoAhora(t, 13 * 60).clave, "antes");
  assert.equal(L.estadoAhora(t, 15 * 60).clave, "trabajando");
  assert.equal(L.estadoAhora(t, 23 * 60).clave, "salio");
  assert.equal(L.estadoAhora({ off: false, inicio: "22:00", fin: "06:00" }, 23 * 60).clave, "trabajando");
  assert.equal(L.estadoAhora(null, 0).clave, "sin");
});

test("ratos juntos", () => {
  const braian = { off: false, inicio: "12:00", fin: "20:00" };
  const rocioM = { off: false, inicio: "10:00", fin: "18:00" };
  const rocioT = { off: false, inicio: "14:00", fin: "22:00" };
  assert.deepEqual(L.ratosJuntos(braian, rocioM).map((r) => [r.desde, r.hasta]), [["08:00", "10:00"], ["20:00", "00:00"]]);
  assert.equal(L.textoJuntos(braian, rocioT), "de 08:00 a 12:00 y desde las 22:00");
  assert.equal(L.textoJuntos({ off: true }, { off: true }), "Hoy tienen franco los dos 🎉");
  assert.equal(L.textoJuntos(braian, null), "");
});

test("tareas repetidas vuelven a aparecer", () => {
  const hoy = "2026-11-04";
  assert.equal(L.estadoTarea({ frequency: "daily", last_done: "2026-11-03" }, hoy).hecha, false);
  assert.equal(L.estadoTarea({ frequency: "weekly", last_done: "2026-11-02" }, hoy).hecha, true);
  assert.equal(L.estadoTarea({ frequency: "weekly", last_done: "2026-11-01" }, hoy).hecha, false);
  assert.equal(L.estadoTarea({ frequency: "monthly", last_done: "2026-10-31" }, hoy).hecha, false);
  assert.equal(L.estadoTarea({ frequency: "once", due_date: "2026-11-01" }, hoy).atrasada, true);
  const orden = L.ordenarTareas([
    { title: "z hecha", frequency: "once", last_done: "2026-11-01" },
    { title: "atrasada", frequency: "once", due_date: "2026-11-01" },
    { title: "diaria", frequency: "daily" },
  ], hoy).map((t) => t.title);
  assert.deepEqual(orden, ["atrasada", "diaria", "z hecha"]);
});

test("pagos por mes", () => {
  const hoy = "2026-11-10";
  assert.equal(L.estadoPago({ due_day: 5 }, hoy).clave, "vencido");
  assert.equal(L.estadoPago({ due_day: 10 }, hoy).clave, "hoy");
  assert.equal(L.estadoPago({ due_day: 13 }, hoy).texto, "Vence en 3 días");
  assert.equal(L.estadoPago({ due_day: 5, paid_month: "2026-11" }, hoy).clave, "pagado");
  assert.equal(L.estadoPago({ due_day: 5, paid_month: "2026-10" }, hoy).clave, "vencido"); // nuevo mes
  assert.equal(L.estadoPago({ due_day: 31 }, "2026-02-01").vence, "2026-02-28");
  assert.equal(L.totalPendiente([{ due_day: 5, amount: "1000" }, { due_day: 5, amount: 50, paid_month: "2026-11" }], hoy), 1000);
});

test("gym por semana y racha", () => {
  const s = ["2026-10-20", "2026-10-22", "2026-10-27", "2026-10-29", "2026-11-03"].map((date) => ({ user_id: A, date }));
  assert.equal(L.gymSemana(s, A, "2026-11-04"), 1);
  assert.equal(L.rachaGym(s, A, 2, "2026-11-04"), 2);
  assert.equal(L.gymSemana(s, B, "2026-11-04"), 0);
});

test("inventario y lista para compartir", () => {
  const items = [
    { name: "Pan", category: "Cocina", status: "rojo" },
    { name: "Leche", category: "Cocina", status: "amarillo" },
    { name: "Jabón", category: "Baño", status: "verde" },
  ];
  const g = L.agruparInventario(items);
  assert.equal(g.rojo.length, 1);
  assert.match(L.textoListaCompras(items), /Se terminó:\n• Pan\n\n🟡 Queda poco:\n• Leche/);
  assert.equal(L.textoListaCompras([items[2]]), "");
  assert.deepEqual(L.categorias(items), ["Baño", "Cocina"]);
});

test("menú semanal y textos", () => {
  const m = L.menuSemana([{ date: "2026-11-03", slot: "cena", title: "Pizza" }], "2026-11-05");
  assert.equal(m.length, 7);
  assert.equal(m[1].cena.title, "Pizza");
  assert.equal(m[1].almuerzo, null);
  assert.equal(L.cuandoTexto("2026-11-03", "2026-11-02"), "Mañana");
  assert.equal(L.diasJuntos("2026-05-01", "2026-05-11"), 10);
  assert.equal(L.duracionTexto(150), "2 h 30 min");
});
