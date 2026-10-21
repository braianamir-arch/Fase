// Gráficos en SVG sin librerías: línea con área y tooltip, mini barras, sparkline y medidor.
// Las marcas usan el color de datos; los textos, los tonos de texto (nunca el color de la serie).
const NS = "http://www.w3.org/2000/svg";
export const COLOR_DATO = "#3D8B5E";
const COLOR_SUAVE = "#C9D3CB";
const COLOR_GRILLA = "#ECEAE5";
const COLOR_PISTA = "#DCE8DE";

function svg(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export function compacto(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",")} M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)} K`;
  return String(Math.round(n));
}

// puntos: [{ fecha: "YYYY-MM-DD", valor }]. Devuelve un contenedor con el SVG y el tooltip.
export function lineaTiempo(puntos, { formato = (v) => v, alto = 150 } = {}) {
  const ancho = 340, mi = 34, md = 10, ms = 10, mb = 22;
  const caja = document.createElement("div");
  caja.className = "grafico";
  if (puntos.length < 2) {
    caja.append(Object.assign(document.createElement("p"), {
      className: "grafico-vacio",
      textContent: "El gráfico se arma solo: cada día que abras la app suma un punto.",
    }));
    return caja;
  }
  const valores = puntos.map((p) => p.valor);
  let min = Math.min(...valores), max = Math.max(...valores);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min = Math.max(0, min - pad); max += pad;
  const x = (i) => mi + (i / (puntos.length - 1)) * (ancho - mi - md);
  const y = (v) => ms + (1 - (v - min) / (max - min)) * (alto - ms - mb);
  const s = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, role: "img", "aria-label": `Evolución: de ${formato(valores[0])} a ${formato(valores.at(-1))}` });

  for (let k = 0; k <= 2; k++) {
    const v = min + ((max - min) * k) / 2;
    s.append(svg("line", { x1: mi, x2: ancho - md, y1: y(v), y2: y(v), stroke: COLOR_GRILLA, "stroke-width": 1 }));
    const t = svg("text", { x: mi - 6, y: y(v) + 3, "text-anchor": "end", class: "eje" });
    t.textContent = compacto(v);
    s.append(t);
  }
  for (const i of [0, puntos.length - 1]) {
    const t = svg("text", { x: x(i), y: alto - 6, "text-anchor": i ? "end" : "start", class: "eje" });
    t.textContent = puntos[i].fecha.slice(5).split("-").reverse().join("/");
    s.append(t);
  }
  const d = puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join("");
  s.append(svg("path", { d: `${d}L${x(puntos.length - 1)},${alto - mb}L${x(0)},${alto - mb}Z`, fill: COLOR_DATO, "fill-opacity": 0.1 }));
  s.append(svg("path", { d, fill: "none", stroke: COLOR_DATO, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
  const ult = puntos.length - 1;
  s.append(svg("circle", { cx: x(ult), cy: y(valores[ult]), r: 4, fill: COLOR_DATO, stroke: "#fff", "stroke-width": 2 }));

  // Capa de hover: cruz + punto + tooltip con el valor del día más cercano.
  const cruz = svg("line", { y1: ms, y2: alto - mb, stroke: "#B8BDB9", "stroke-width": 1, visibility: "hidden" });
  const marca = svg("circle", { r: 5, fill: COLOR_DATO, stroke: "#fff", "stroke-width": 2, visibility: "hidden" });
  s.append(cruz, marca);
  const tip = Object.assign(document.createElement("div"), { className: "tooltip" });
  tip.hidden = true;
  const mover = (ev) => {
    const r = s.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * ancho;
    const i = Math.max(0, Math.min(ult, Math.round(((px - mi) / (ancho - mi - md)) * ult)));
    cruz.setAttribute("x1", x(i)); cruz.setAttribute("x2", x(i));
    marca.setAttribute("cx", x(i)); marca.setAttribute("cy", y(valores[i]));
    cruz.setAttribute("visibility", "visible"); marca.setAttribute("visibility", "visible");
    tip.hidden = false;
    tip.textContent = `${puntos[i].fecha.split("-").reverse().join("/")} · ${formato(valores[i])}`;
    tip.style.left = `${Math.min(Math.max((x(i) / ancho) * 100, 15), 85)}%`;
  };
  const salir = () => { cruz.setAttribute("visibility", "hidden"); marca.setAttribute("visibility", "hidden"); tip.hidden = true; };
  s.addEventListener("pointermove", mover);
  s.addEventListener("pointerdown", mover);
  s.addEventListener("pointerleave", salir);
  caja.append(s, tip);
  return caja;
}

// Mini barras de una tarjeta KPI: la última (período actual) en color de dato.
export function miniBarras(valores, { ancho = 58, alto = 28 } = {}) {
  const s = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: "mini", "aria-hidden": "true" });
  const n = valores.length || 1, max = Math.max(...valores, 1);
  const paso = ancho / n, w = Math.min(5, paso - 2);
  valores.forEach((v, i) => {
    const h = Math.max(3, (v / max) * alto);
    const bx = i * paso + (paso - w) / 2;
    s.append(svg("path", {
      d: `M${bx},${alto}V${alto - h + 1.5}Q${bx},${alto - h} ${bx + 1.5},${alto - h}H${bx + w - 1.5}Q${bx + w},${alto - h} ${bx + w},${alto - h + 1.5}V${alto}Z`,
      fill: i === n - 1 ? COLOR_DATO : COLOR_SUAVE,
    }));
  });
  return s;
}

export function sparkline(valores, { ancho = 64, alto = 26, color = COLOR_DATO } = {}) {
  const s = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: "mini", "aria-hidden": "true" });
  if (valores.length < 2) return s;
  const min = Math.min(...valores), max = Math.max(...valores), r = max - min || 1;
  const pts = valores.map((v, i) => `${((i / (valores.length - 1)) * (ancho - 4) + 2).toFixed(1)},${(alto - 3 - ((v - min) / r) * (alto - 6)).toFixed(1)}`);
  s.append(svg("polyline", { points: pts.join(" "), fill: "none", stroke: color, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return s;
}

// Medidor semicircular: pista en un tono claro de la misma rampa, valor al centro.
export function medidor(pct, { etiqueta = "" } = {}) {
  const p = Math.max(0, Math.min(1, pct));
  const s = svg("svg", { viewBox: "0 0 120 70", class: "medidor", role: "img", "aria-label": `${Math.round(p * 100)}% ${etiqueta}` });
  const arco = (desde, hasta) => {
    const a0 = Math.PI * (1 - desde), a1 = Math.PI * (1 - hasta);
    const p0 = [60 + 48 * Math.cos(a0), 62 - 48 * Math.sin(a0)];
    const p1 = [60 + 48 * Math.cos(a1), 62 - 48 * Math.sin(a1)];
    return `M${p0[0].toFixed(2)},${p0[1].toFixed(2)}A48,48 0 0 1 ${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
  };
  s.append(svg("path", { d: arco(0, 1), fill: "none", stroke: COLOR_PISTA, "stroke-width": 12, "stroke-linecap": "round" }));
  if (p > 0.001) s.append(svg("path", { d: arco(0, p), fill: "none", stroke: COLOR_DATO, "stroke-width": 12, "stroke-linecap": "round" }));
  const t = svg("text", { x: 60, y: 60, "text-anchor": "middle", class: "medidor-valor" });
  t.textContent = `${Math.round(p * 100)}%`;
  s.append(t);
  return s;
}
