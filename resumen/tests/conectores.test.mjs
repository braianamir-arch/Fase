import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNumero, extraerMonto, parseFecha, extraerVencimiento } from "../conectores/texto.js";
import { clasificar, resumir } from "../conectores/gmail.js";
import { resumirPagos, movimientosDe } from "../conectores/mercadopago.js";
import { armarTasas } from "../conectores/cotizaciones.js";
import { eventosAEntradas } from "../conectores/google.js";
import { fusionar, enPesos, normalizar } from "../core.js";

test("parseNumero entiende formatos argentinos e ingleses", () => {
  assert.equal(parseNumero("1.234,56"), 1234.56);
  assert.equal(parseNumero("1,234.56"), 1234.56);
  assert.equal(parseNumero("1.234"), 1234);
  assert.equal(parseNumero("9,99"), 9.99);
  assert.equal(parseNumero("-$ 1.500,00"), -1500);
  assert.equal(parseNumero("(250,5)"), -250.5);
  assert.equal(parseNumero("1.234.567"), 1234567);
  assert.equal(parseNumero(""), null);
});

test("extraerMonto, parseFecha y extraerVencimiento", () => {
  assert.deepEqual(extraerMonto("Tu pago de $ 8.999,00 fue aprobado"), { monto: 8999, moneda: "ARS" });
  assert.deepEqual(extraerMonto("Receipt: USD 9.99 charged"), { monto: 9.99, moneda: "USD" });
  assert.deepEqual(extraerMonto("Total U$S 20"), { monto: 20, moneda: "USD" });
  assert.equal(extraerMonto("sin plata"), null);
  assert.equal(parseFecha("25/10/26"), "2026-10-25");
  assert.equal(parseFecha("2026-10-25"), "2026-10-25");
  assert.equal(parseFecha("25/10", 2027), "2027-10-25");
  assert.equal(parseFecha("40/10/2026"), null);
  assert.equal(extraerVencimiento("Tu factura vence el 28/10. Total $ 12.000", 2026), "2026-10-28");
});

const msg = (from, subject, extra = {}) => ({ id: subject, threadId: subject, from, subject, snippet: "", fecha: "2026-10-20", noLeido: true, importante: false, ...extra });

test("clasificar ubica cada mail en su categoría", () => {
  assert.equal(clasificar(msg("Netflix <info@netflix.com>", "Tu recibo de pago")).categoria, "suscripciones");
  assert.equal(clasificar(msg("Netflix <info@netflix.com>", "Nuevos estrenos")), null);
  assert.equal(clasificar(msg("Naranja X <avisos@naranjax.com>", "Transferencia recibida")).categoria, "billeteras");
  assert.equal(clasificar(msg("MODO <hola@modo.com.ar>", "Pagaste con QR")).categoria, "billeteras");
  assert.equal(clasificar(msg("Naranja X <avisos@naranjax.com>", "Tu resumen está disponible")).categoria, "servicios");
  assert.equal(clasificar(msg("Galicia <avisos@galicia.com.ar>", "Transferencia recibida")), null);
  assert.equal(clasificar(msg("Edenor <no-reply@edenor.com>", "Factura")).categoria, "servicios");
  assert.equal(clasificar(msg("OSSE <facturas@osse.gob.ar>", "Tu factura digital")).servicio[0], "osse");
  assert.equal(clasificar(msg("Ecogas <factura@ecogas.com.ar>", "Factura")).servicio[0], "ecogas");
  assert.equal(clasificar(msg("Naturgy San Juan <no-reply@naturgysj.com.ar>", "Factura")).servicio[0], "naturgysj");
  assert.equal(clasificar(msg("Instagram <no-reply@mail.instagram.com>", "Nuevo seguidor")).categoria, "redes");
  assert.equal(clasificar(msg("Jefe <jefe@empresa.com>", "Reunión", { importante: true })).categoria, "gmail");
  assert.equal(clasificar(msg("Random <x@y.com>", "Hola")), null);
});

test("resumir arma una entrada por servicio con monto, día de cobro y vencimiento", () => {
  const r = resumir([
    msg("Spotify <no-reply@spotify.com>", "Tu recibo de Spotify", { snippet: "Cobramos $ 2.999,00", fecha: "2026-10-05" }),
    msg("Spotify <no-reply@spotify.com>", "Tu recibo de Spotify", { snippet: "Cobramos $ 2.499,00", fecha: "2026-09-05" }),
    msg("Edesur <f@edesur.com.ar>", "Tu factura", { snippet: "Vence el 25/10/2026. Total $ 15.300,50" }),
    msg("Instagram <x@mail.instagram.com>", "a", { noLeido: false }),
    msg("Instagram <x@mail.instagram.com>", "b"),
  ], "2026-10-21");
  const spotify = r.find((e) => e.externoId === "gmail:suscripciones:spotify");
  assert.equal(spotify.monto, 2999);
  assert.equal(spotify.diaCobro, 5);
  const luz = r.find((e) => e.externoId === "gmail:servicios:edesur");
  assert.equal(luz.fecha, "2026-10-25");
  assert.equal(luz.monto, 15300.5);
  assert.equal(luz.prioridad, "alta");
  assert.equal(r.find((e) => e.categoria === "redes").titulo, "Instagram · 1 sin leer de 2");
  assert.ok(spotify.enlace.startsWith("https://mail.google.com/"));
});

test("Mercado Pago resume pagos y saldo", () => {
  const [e] = resumirPagos([
    { status: "approved", transaction_amount: 1000, description: "Venta", date_created: "2026-10-10T10:00:00" },
    { status: "pending", transaction_amount: 50, date_created: "2026-10-11T10:00:00" },
  ], 12345.6, "2026-10-21");
  assert.equal(e.monto, 12345.6);
  assert.equal(e.prioridad, "alta");
  assert.match(e.nota, /1 cobros aprobados por \$ 1000/);
});

test("cotizaciones y conversión a pesos", () => {
  const { tasas } = armarTasas(
    [{ casa: "oficial", venta: 1500 }, { casa: "blue", venta: 1600 }],
    [{ moneda: "USD", venta: 1500 }, { moneda: "EUR", venta: 1700 }],
    { bitcoin: { usd: 100000 }, tether: { usd: 1 } },
    "blue",
  );
  assert.deepEqual(tasas, { USD: 1600, EUR: 1700, BTC: 160000000, USDT: 1600 });
  assert.deepEqual(enPesos({ ARS: 1000, USD: 10, BTC: 0.001, XYZ: 5 }, tasas), { total: 177000, sinTasa: ["XYZ"] });
});

test("eventos de Calendar a entradas", () => {
  const [e] = eventosAEntradas([
    { id: "1", summary: "Turno médico", start: { dateTime: "2026-10-22T10:00:00-03:00" }, htmlLink: "https://calendar.google.com/x" },
    { id: "2", summary: "Cancelado", status: "cancelled", start: { date: "2026-10-23" } },
  ]);
  assert.equal(e.fecha, "2026-10-22");
  assert.equal(e.prioridad, "alta");
  assert.equal(e.externoId, "gcal:1");
});

test("fusionar reemplaza lo del conector, conserva lo hecho y lo manual", () => {
  const actuales = [
    normalizar({ titulo: "manual" }),
    normalizar({ titulo: "viejo", origen: "gmail", externoId: "a", hecho: true }),
    normalizar({ titulo: "borrado", origen: "gmail", externoId: "b" }),
    normalizar({ titulo: "otro conector", origen: "mp", externoId: "a" }),
  ];
  const r = fusionar(actuales, [{ titulo: "nuevo a", externoId: "a" }, { titulo: "c", externoId: "c" }], "gmail");
  assert.deepEqual(r.map((e) => [e.titulo, e.origen, e.hecho]), [
    ["manual", null, false], ["otro conector", "mp", false], ["nuevo a", "gmail", true], ["c", "gmail", false],
  ]);
  assert.equal(normalizar({ enlace: "javascript:alert(1)" }).enlace, null);
});

test("combinar une copia importada con lo local", async () => {
  const { combinar } = await import("../core.js");
  const local = [
    normalizar({ id: "m1", titulo: "manual local" }),
    normalizar({ id: "g1", titulo: "gmail viejo", origen: "gmail", externoId: "x" }),
    normalizar({ id: "p1", titulo: "mp local", origen: "mp", externoId: "mp:cuenta" }),
  ];
  const copia = [
    normalizar({ id: "m1", titulo: "manual de la copia" }),
    normalizar({ id: "m2", titulo: "manual nuevo" }),
    normalizar({ id: "g2", titulo: "gmail nuevo", origen: "gmail", externoId: "y" }),
  ];
  assert.deepEqual(combinar(local, copia).map((e) => e.titulo), ["manual local", "mp local", "gmail nuevo", "manual nuevo"]);
});

test("Mercado Pago manda el token en la URL (sin encabezados que disparen CORS)", async () => {
  const { sincronizar } = await import("../conectores/mercadopago.js");
  const pedidos = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opciones) => {
    pedidos.push({ url: String(url), opciones });
    const u = new URL(url);
    const cuerpo = u.pathname === "/users/me" ? { id: 99 } : u.pathname.endsWith("/balance") ? { available_balance: 500 } : { results: [] };
    return new Response(JSON.stringify(cuerpo), { status: 200 });
  };
  try {
    const { entradas: [e], movimientos, saldo } = await sincronizar("APP_USR-1-2-3-99", "2026-10-21");
    assert.equal(e.monto, 500);
    assert.equal(saldo, 500);
    assert.deepEqual(movimientos, []);
    for (const p of pedidos) {
      assert.equal(new URL(p.url).searchParams.get("access_token"), "APP_USR-1-2-3-99");
      assert.equal(p.opciones.headers, undefined);
    }
    assert.deepEqual(pedidos.map((p) => new URL(p.url).pathname), ["/users/me", "/users/99/mercadopago_account/balance", "/v1/payments/search"]);
    await assert.rejects(sincronizar("TEST-123"), /APP_USR-/);
  } finally {
    globalThis.fetch = original;
  }
});

test("movimientosDe resume estado y descripción", () => {
  const m = movimientosDe([
    { status: "approved", transaction_amount: 1500, description: "Venta", date_created: "2026-10-10T10:00:00" },
    { status: "rejected", transaction_amount: 80, operation_type: "money_transfer", date_created: "2026-10-09T10:00:00" },
  ]);
  assert.deepEqual(m, [
    { fecha: "2026-10-10", descripcion: "Venta", monto: 1500, estado: "aprobado" },
    { fecha: "2026-10-09", descripcion: "Transferencia", monto: 80, estado: "rechazado" },
  ]);
});
