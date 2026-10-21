import { test } from "node:test";
import assert from "node:assert/strict";
import { entradasServicios, validarNumero, proveedorDe } from "../conectores/servicios.js";
import { paginaBaja, BAJA_MERCADOPAGO } from "../conectores/bajas.js";
import { normalizar } from "../core.js";

test("validarNumero acepta números de cuenta con o sin separadores", () => {
  assert.equal(validarNumero("1000-0000 000001"), "10000000000001");
  assert.equal(validarNumero("123"), null);
  assert.equal(validarNumero(""), null);
});

test("entradasServicios crea accesos para los configurados y cede a la factura de Gmail", () => {
  const numeros = { osse: "10000000000001", naturgysj: "30000000002", ecogas: "40000003" };
  const gmail = [normalizar({ origen: "gmail", externoId: "gmail:servicios:ecogas", titulo: "Ecogas" })];
  const e = entradasServicios(numeros, gmail, "2026-10-21");
  assert.deepEqual(e.map((x) => x.externoId), ["servicio:osse", "servicio:naturgysj"]);
  assert.match(e[0].nota, /10000000000001/);
  assert.equal(e[1].enlace, "https://oficinavirtual.naturgysj.com.ar/pagos");
  assert.equal(proveedorDe("gmail:servicios:ecogas").tipo, "Gas");
  assert.deepEqual(entradasServicios({}, [], "2026-10-21"), []);
});

test("paginaBaja abre la baja de cada servicio o los débitos de Mercado Pago", () => {
  const sub = (externoId, titulo) => normalizar({ categoria: "suscripciones", externoId, titulo });
  assert.equal(paginaBaja(sub("gmail:suscripciones:netflix", "Netflix")), "https://www.netflix.com/cancelplan");
  assert.equal(paginaBaja(sub(null, "Spotify Familiar")), "https://www.spotify.com/account/subscription/");
  assert.equal(paginaBaja(sub(null, "Gimnasio")), BAJA_MERCADOPAGO);
  assert.equal(paginaBaja(normalizar({ categoria: "otros", titulo: "Netflix" })), null);
});
