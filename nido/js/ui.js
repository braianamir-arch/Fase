// Piezas de interfaz: elementos seguros, íconos, hoja deslizable, avisos y vibración.

export const $ = (s, raiz = document) => raiz.querySelector(s);

// Crea un elemento con texto seguro (nunca innerHTML con datos de la base).
export function el(tag, props = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "dataset") Object.assign(n.dataset, v);
    else if (k === "style") Object.assign(n.style, v);
    else if (k.startsWith("aria") || k === "role") n.setAttribute(k.replace(/^aria([A-Z])/, (_, c) => `aria-${c.toLowerCase()}`), v);
    else n[k] = v;
  }
  for (const h of hijos.flat()) if (h != null && h !== false) n.append(h);
  return n;
}

export function boton(texto, alTocar, clase = "btn", extra = {}) {
  const b = el("button", { type: "button", className: clase, ...extra }, texto);
  b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    vibrar(8);
    alTocar(ev);
  });
  return b;
}

export function vibrar(ms = 10) {
  try { navigator.vibrate?.(ms); } catch { /* iPhone no vibra desde la web */ }
}

const TRAZOS = {
  hoy: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path d="M10 18.5v-4.5h4v4.5"/>',
  comprar: '<path d="M4 5h2l2 10h9.5l2-7H7.2"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>',
  comida: '<path d="M5 12h14a7 7 0 0 1-14 0Z"/><path d="M3.5 12h17"/><path d="M9 8c0-1.5 1-1.5 1-3M13 8c0-1.5 1-1.5 1-3"/>',
  casa: '<path d="M5 20V9.5L12 4l7 5.5V20"/><path d="M3.5 20h17"/><rect x="9.5" y="13" width="5" height="7" rx="1"/>',
  nosotros: '<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  lapiz: '<path d="m14.5 5.5 4 4L8 20H4v-4Z"/><path d="m12.5 7.5 4 4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  compartir: '<path d="M12 4v11"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M6 12.5V19h12v-6.5"/>',
  izquierda: '<path d="m14.5 6-6 6 6 6"/>',
  derecha: '<path d="m9.5 6 6 6-6 6"/>',
  basura: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>',
  salir: '<path d="M14 5h4v14h-4"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
};

export function icono(nombre, clase = "ico") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", clase);
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = TRAZOS[nombre] || ""; // trazos fijos del código, nunca datos
  return s;
}

// ---- Aviso de abajo (con "Deshacer" opcional) ----
let temporizadorToast = null;
export function toast(texto, { tipo = "", deshacer = null, ms = 3200 } = {}) {
  const t = $("#toast");
  t.className = `toast ${tipo}`;
  t.replaceChildren(el("span", {}, texto));
  if (deshacer) {
    t.append(boton("Deshacer", () => {
      t.hidden = true;
      deshacer();
    }, "toast-accion"));
  }
  t.hidden = false;
  t.classList.remove("sale");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    t.classList.add("sale");
    setTimeout(() => (t.hidden = true), 220);
  }, deshacer ? Math.max(ms, 5000) : ms);
}

// ---- Hoja de formulario ----
// campos: [{ nombre, etiqueta, tipo, valor, opciones: [[valor, texto]], requerido, placeholder,
//            multiple (chips), visibleSi: { campo, valores: [...] }, ayuda }]
// Tipos: text, number, date, time, textarea, select, chips.
// Resuelve con los valores, { borrar: true } si se tocó "Borrar", o null si se cerró.
export function pedirDatos({ titulo, texto = "", campos = [], borrar = false, ok = "Guardar", cancelar = "Cancelar" }) {
  return new Promise((resolver) => {
    const hoja = $("#hoja");
    const form = $("#hoja-form");
    $("#hoja-titulo").textContent = titulo;
    $("#hoja-texto").textContent = texto;
    $("#hoja-texto").hidden = !texto;
    $("#hoja-ok").textContent = ok;
    $("#hoja-ok").hidden = !ok;
    $("#hoja-cancelar").textContent = cancelar;
    $("#hoja-borrar").hidden = !borrar;

    const valoresChips = {};
    const filas = campos.map((c) => {
      let control;
      if (c.tipo === "chips") {
        const inicial = c.multiple ? new Set((c.valor || []).map(String)) : String(c.valor ?? "");
        valoresChips[c.nombre] = inicial;
        control = el("div", { className: `chips${c.grande ? " chips-grandes" : ""}`, role: c.multiple ? "group" : "radiogroup" },
          ...c.opciones.map(([v, t]) => {
            const activo = c.multiple ? inicial.has(String(v)) : inicial === String(v);
            const b = el("button", { type: "button", className: `chip${activo ? " activo" : ""}`, ariaPressed: String(activo) }, t);
            b.dataset.valor = String(v);
            b.addEventListener("click", () => {
              vibrar(6);
              if (c.multiple) {
                const set = valoresChips[c.nombre];
                set.has(b.dataset.valor) ? set.delete(b.dataset.valor) : set.add(b.dataset.valor);
                b.classList.toggle("activo");
                b.setAttribute("aria-pressed", String(b.classList.contains("activo")));
              } else {
                valoresChips[c.nombre] = b.dataset.valor;
                for (const otro of control.children) {
                  otro.classList.toggle("activo", otro === b);
                  otro.setAttribute("aria-pressed", String(otro === b));
                }
              }
              actualizarVisibles();
            });
            return b;
          }));
      } else if (c.tipo === "textarea") {
        control = el("textarea", { name: c.nombre, rows: 3, value: c.valor ?? "", placeholder: c.placeholder || "", maxLength: c.max || 500 });
      } else if (c.tipo === "select") {
        control = el("select", { name: c.nombre },
          ...c.opciones.map(([v, t]) => el("option", { value: v, textContent: t, selected: String(v) === String(c.valor ?? "") })));
      } else {
        control = el("input", {
          name: c.nombre,
          type: c.tipo || "text",
          value: c.valor ?? "",
          placeholder: c.placeholder || "",
          autocomplete: "off",
          maxLength: c.tipo === "text" || !c.tipo ? c.max || 80 : undefined,
        });
        if (c.tipo === "number") {
          control.inputMode = "decimal";
          control.step = "any";
          control.min = c.min ?? 0;
        }
        if (c.lista) control.setAttribute("list", `lista-${c.nombre}`);
      }
      const fila = el(c.tipo === "chips" ? "div" : "label", { className: "campo" },
        el("span", { className: "campo-etiqueta" }, c.etiqueta), control,
        c.ayuda ? el("span", { className: "campo-ayuda" }, c.ayuda) : null);
      if (c.lista) fila.append(el("datalist", { id: `lista-${c.nombre}` }, ...c.lista.map((v) => el("option", { value: v }))));
      fila.dataset.campo = c.nombre;
      return fila;
    });
    $("#hoja-campos").replaceChildren(...filas);

    const valores = () => {
      const datos = Object.fromEntries(new FormData(form));
      for (const [k, v] of Object.entries(valoresChips)) datos[k] = v instanceof Set ? [...v] : v;
      return datos;
    };
    function actualizarVisibles() {
      const datos = valores();
      campos.forEach((c, i) => {
        if (!c.visibleSi) return;
        const visible = c.visibleSi.valores.includes(String(datos[c.visibleSi.campo] ?? ""));
        filas[i].hidden = !visible;
      });
    }
    actualizarVisibles();
    form.oninput = actualizarVisibles;

    let resuelto = false;
    const terminar = (v) => {
      if (resuelto) return;
      resuelto = true;
      if (hoja.open) hoja.close();
      resolver(v);
    };
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const datos = valores();
      const falta = campos.find((c, i) => c.requerido && !filas[i].hidden && !String(Array.isArray(datos[c.nombre]) ? datos[c.nombre].join("") : datos[c.nombre] ?? "").trim());
      if (falta) {
        const f = filas[campos.indexOf(falta)];
        f.classList.remove("error");
        void f.offsetWidth;
        f.classList.add("error");
        f.querySelector("input, textarea, select, .chip")?.focus();
        vibrar(30);
        return;
      }
      terminar(datos);
    };
    $("#hoja-cancelar").onclick = () => terminar(null);
    $("#hoja-borrar").onclick = () => {
      if (confirm("¿Seguro que querés borrarlo?")) terminar({ borrar: true });
    };
    hoja.onclose = () => { if (!hoja.open) terminar(null); };
    hoja.showModal();
    hoja.scrollTop = 0;
  });
}

// Hoja de opciones (lista de botones). Resuelve con el valor elegido o null.
export function elegir({ titulo, texto = "", opciones }) {
  return new Promise((resolver) => {
    const hoja = $("#hoja");
    $("#hoja-titulo").textContent = titulo;
    $("#hoja-texto").textContent = texto;
    $("#hoja-texto").hidden = !texto;
    $("#hoja-ok").hidden = true;
    $("#hoja-borrar").hidden = true;
    $("#hoja-cancelar").textContent = "Cerrar";
    let resuelto = false;
    const terminar = (v) => {
      if (resuelto) return;
      resuelto = true;
      if (hoja.open) hoja.close();
      resolver(v);
    };
    $("#hoja-campos").replaceChildren(el("div", { className: "opciones" },
      ...opciones.map((o) => {
        const b = el("button", { type: "button", className: `opcion${o.peligro ? " peligro" : ""}${o.activa ? " activa" : ""}` },
          o.emoji ? el("span", { className: "opcion-emoji" }, o.emoji) : null,
          el("span", { className: "opcion-txt" }, el("strong", {}, o.texto), o.detalle ? el("small", {}, o.detalle) : null));
        b.addEventListener("click", () => { vibrar(8); terminar(o.valor); });
        return b;
      })));
    $("#hoja-form").onsubmit = (ev) => ev.preventDefault();
    $("#hoja-cancelar").onclick = () => terminar(null);
    hoja.onclose = () => { if (!hoja.open) terminar(null); };
    hoja.showModal();
    hoja.scrollTop = 0;
  });
}

// Cerrar la hoja deslizando hacia abajo, como en el iPhone.
export function deslizarParaCerrar(d) {
  let y0 = null, dy = 0, t0 = 0, arrastrando = false;
  d.addEventListener("touchstart", (ev) => {
    if (ev.touches.length > 1) return;
    if (!ev.target.closest(".agarre, h2")) return; // desde el contenido se desplaza, nunca cierra
    if (ev.target.closest("input, textarea, select")) return;
    y0 = ev.touches[0].clientY; dy = 0; t0 = Date.now(); arrastrando = false;
  }, { passive: true });
  d.addEventListener("touchmove", (ev) => {
    if (y0 == null) return;
    dy = ev.touches[0].clientY - y0;
    if (!arrastrando) {
      if (dy < -4) { y0 = null; return; }
      if (dy > 10) arrastrando = true; else return;
    }
    ev.preventDefault();
    d.style.transition = "none";
    d.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  const soltar = () => {
    if (y0 == null) return;
    y0 = null;
    if (!arrastrando) return;
    const rapido = dy / Math.max(1, Date.now() - t0) > 0.6;
    d.style.transition = "transform .25s cubic-bezier(.2, .8, .2, 1)";
    if (dy > 120 || (dy > 50 && rapido)) {
      d.style.transform = "translateY(110%)";
      setTimeout(() => { d.close(); d.style.transform = ""; d.style.transition = ""; }, 230);
    } else {
      d.style.transform = "";
      setTimeout(() => (d.style.transition = ""), 260);
    }
  };
  d.addEventListener("touchend", soltar);
  d.addEventListener("touchcancel", soltar);
  // Tocar el fondo oscuro también cierra.
  d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); });
}
