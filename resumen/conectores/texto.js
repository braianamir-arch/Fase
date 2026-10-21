// Utilidades puras para sacar montos y fechas de textos en formato argentino o inglés.

// "1.234,56" | "1,234.56" | "1234" | "(1.234,56)" | "-$ 1.234,56" -> número
export function parseNumero(txt) {
  if (txt == null) return null;
  let s = String(txt).trim();
  if (!s) return null;
  const negativo = /^\(.*\)$/.test(s) || /^-|-$/.test(s.replace(/[^\d\-().,]/g, ""));
  s = s.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;
  const ultPunto = s.lastIndexOf(".");
  const ultComa = s.lastIndexOf(",");
  if (ultPunto >= 0 && ultComa >= 0) {
    const dec = ultPunto > ultComa ? "." : ",";
    const mil = dec === "." ? "," : ".";
    s = s.split(mil).join("").replace(dec, ".");
  } else if (ultComa >= 0) {
    const tras = s.length - ultComa - 1;
    s = (s.split(",").length === 2 && tras !== 3) ? s.replace(",", ".") : s.split(",").join("");
  } else if (ultPunto >= 0) {
    const tras = s.length - ultPunto - 1;
    if (s.split(".").length > 2 || tras === 3) s = s.split(".").join("");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

const SIMBOLOS = [
  [/^(US\$|U\$S|USD|U\$D)$/i, "USD"],
  [/^(€|EUR)$/i, "EUR"],
  [/^(R\$|BRL)$/i, "BRL"],
  [/^(\$|ARS|AR\$)$/i, "ARS"],
];

// Primer monto con moneda que aparezca en el texto: { monto, moneda } o null.
export function extraerMonto(texto) {
  const re = /(US\$|U\$S|U\$D|USD|ARS|AR\$|EUR|BRL|R\$|€|\$)\s?(\d[\d.,]*\d|\d)/i;
  const m = re.exec(texto || "");
  if (!m) return null;
  const moneda = SIMBOLOS.find(([r]) => r.test(m[1]))?.[1] || "ARS";
  const monto = parseNumero(m[2]);
  return monto == null ? null : { monto, moneda };
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// "25/10/2026" | "25-10-26" | "2026-10-25" | "25/10" (usa el año de referencia) -> ISO
export function parseFecha(txt, anioRef = new Date().getFullYear()) {
  const s = String(txt || "").trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/.exec(s);
  if (!m) return null;
  let y = m[3] ? +m[3] : anioRef;
  if (y < 100) y += 2000;
  const d = +m[1], mes = +m[2];
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
  return iso(y, mes, d);
}

// Busca "vence el 25/10", "vencimiento: 25/10/2026", "fecha de vencimiento 25-10".
export function extraerVencimiento(texto, anioRef) {
  const m = /venc\w*\D{0,25}?(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/i.exec(texto || "");
  return m ? parseFecha(m[1], anioRef) : null;
}
