// Importa extractos bancarios descargados del home banking (CSV u OFX), de cualquier banco.
import { parseNumero, parseFecha } from "./texto.js";
import { SERVICIOS } from "./gmail.js";

function separador(lineas) {
  const muestra = lineas.slice(0, 20).join("\n");
  return [";", "\t", ","].map((s) => [s, muestra.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
}

// CSV con comillas, sin dependencias.
export function parseCSV(texto) {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const sep = separador(lineas);
  return lineas.map((l) => {
    const campos = [];
    let actual = "", comillas = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"' && l[i + 1] === '"' && comillas) { actual += '"'; i++; }
      else if (c === '"') comillas = !comillas;
      else if (c === sep && !comillas) { campos.push(actual.trim()); actual = ""; }
      else actual += c;
    }
    campos.push(actual.trim());
    return campos;
  });
}

const COLUMNAS = {
  fecha: /^fecha|date|f\.? ?(de )?(operaci|mov)/i,
  descripcion: /descrip|concepto|detalle|movimiento|referencia|description|leyenda/i,
  monto: /^(importe|monto|amount|valor)/i,
  debito: /d[eé]bito|egreso|retiro|debe/i,
  credito: /cr[eé]dito|ingreso|dep[oó]sito|haber/i,
  saldo: /saldo|balance/i,
};

function normalizarTexto(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// -> { movimientos: [{fecha, descripcion, monto}], saldo, moneda }
export function leerCSV(texto) {
  const filas = parseCSV(texto);
  const iHeader = filas.findIndex((f) => {
    const h = f.map(normalizarTexto);
    return h.some((c) => COLUMNAS.fecha.test(c)) && h.some((c) => COLUMNAS.monto.test(c) || COLUMNAS.debito.test(c) || COLUMNAS.credito.test(c));
  });
  if (iHeader < 0) throw new Error("No encontré columnas de fecha e importe en el CSV");
  const header = filas[iHeader].map(normalizarTexto);
  const col = {};
  const usadas = new Set();
  for (const [k, re] of Object.entries(COLUMNAS)) {
    col[k] = header.findIndex((h, i) => re.test(h) && !usadas.has(i));
    usadas.add(col[k]);
  }
  const movimientos = [];
  let saldo = null, fechaSaldo = "";
  for (const f of filas.slice(iHeader + 1)) {
    const fecha = parseFecha(f[col.fecha]);
    if (!fecha) continue;
    let monto = col.monto >= 0 ? parseNumero(f[col.monto]) : null;
    if (monto == null) {
      const deb = col.debito >= 0 ? parseNumero(f[col.debito]) : null;
      const cred = col.credito >= 0 ? parseNumero(f[col.credito]) : null;
      if (deb == null && cred == null) continue;
      monto = (cred || 0) - Math.abs(deb || 0);
    }
    movimientos.push({ fecha, descripcion: col.descripcion >= 0 ? f[col.descripcion] : "", monto });
    const s = col.saldo >= 0 ? parseNumero(f[col.saldo]) : null;
    if (s != null && fecha >= fechaSaldo) { saldo = s; fechaSaldo = fecha; }
  }
  if (!movimientos.length) throw new Error("El CSV no tiene movimientos reconocibles");
  return { movimientos, saldo, moneda: /u\$s|usd|dolar/i.test(texto.slice(0, 2000)) ? "USD" : "ARS" };
}

// OFX/QFX (SGML o XML).
export function leerOFX(texto) {
  const tag = (bloque, t) => new RegExp(`<${t}>([^<\\r\\n]+)`, "i").exec(bloque)?.[1]?.trim();
  const fechaOFX = (s) => (s ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);
  const movimientos = [...texto.matchAll(/<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi)].map(([, b]) => ({
    fecha: fechaOFX(tag(b, "DTPOSTED")),
    descripcion: tag(b, "NAME") || tag(b, "MEMO") || "",
    monto: Number(tag(b, "TRNAMT")),
  })).filter((m) => m.fecha && Number.isFinite(m.monto));
  const bal = /<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|$)/i.exec(texto)?.[1];
  const saldo = bal ? Number(tag(bal, "BALAMT")) : null;
  if (!movimientos.length && saldo == null) throw new Error("El OFX no tiene movimientos ni saldo");
  return { movimientos, saldo: Number.isFinite(saldo) ? saldo : null, moneda: tag(texto, "CURDEF") || "ARS" };
}

export function leerExtracto(nombreArchivo, texto) {
  return /\.(ofx|qfx)$/i.test(nombreArchivo) || /<OFX>/i.test(texto) ? leerOFX(texto) : leerCSV(texto);
}

const r2 = (n) => Math.round(n * 100) / 100;
const slug = (s) => normalizarTexto(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Convierte un extracto leído en entradas: saldo de la cuenta, resumen por mes y
// suscripciones detectadas en los débitos.
export function extractoAEntradas(banco, { movimientos, saldo, moneda }) {
  const id = slug(banco) || "banco";
  const entradas = [{
    externoId: `extracto:${id}:saldo`,
    categoria: "bancos",
    titulo: banco,
    monto: saldo,
    moneda,
    prioridad: "media",
    frecuencia: "diario",
    fecha: movimientos.map((m) => m.fecha).sort().at(-1),
    nota: saldo == null ? "El extracto no trae saldo: cargalo a mano para que sume." : "Saldo según el último extracto importado.",
  }];

  const porMes = new Map();
  for (const m of movimientos) {
    const k = m.fecha.slice(0, 7);
    if (!porMes.has(k)) porMes.set(k, []);
    porMes.get(k).push(m);
  }
  for (const [mes, ms] of porMes) {
    const ingresos = r2(ms.filter((m) => m.monto > 0).reduce((s, m) => s + m.monto, 0));
    const egresos = r2(ms.filter((m) => m.monto < 0).reduce((s, m) => s - m.monto, 0));
    const top = ms.filter((m) => m.monto < 0).sort((a, b) => a.monto - b.monto).slice(0, 5);
    const [y, mm] = mes.split("-").map(Number);
    entradas.push({
      externoId: `extracto:${id}:${mes}`,
      categoria: "bancos",
      titulo: `${banco} · resumen ${mes}`,
      prioridad: egresos > ingresos ? "alta" : "baja",
      frecuencia: "unico",
      fecha: `${mes}-${String(new Date(y, mm, 0).getDate()).padStart(2, "0")}`,
      moneda,
      nota: [
        `Ingresos: ${moneda} ${ingresos} · Egresos: ${moneda} ${egresos} · Neto: ${moneda} ${r2(ingresos - egresos)}`,
        `${ms.length} movimientos. Mayores gastos:`,
        ...top.map((m) => `• ${m.fecha.slice(8)}/${m.fecha.slice(5, 7)} ${m.descripcion} — ${moneda} ${-m.monto}`),
      ].join("\n"),
    });
  }

  const subs = new Map();
  for (const m of movimientos.filter((x) => x.monto < 0)) {
    const s = SERVICIOS.suscripciones.find(([, , re]) => re.test(m.descripcion.replace(/\s/g, "")));
    if (s && (!subs.has(s[0]) || subs.get(s[0]).fecha < m.fecha)) subs.set(s[0], { ...m, nombre: s[1] });
  }
  for (const [sid, m] of subs) {
    entradas.push({
      externoId: `extracto:${id}:sub:${sid}`,
      categoria: "suscripciones",
      titulo: m.nombre,
      monto: -m.monto,
      moneda,
      prioridad: "media",
      frecuencia: "mensual",
      diaCobro: Number(m.fecha.slice(8)),
      fecha: m.fecha,
      nota: `Detectada en el extracto de ${banco}: ${m.descripcion}`,
    });
  }
  return entradas;
}
