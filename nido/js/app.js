// NIDO: la casa de los dos. Controlador principal y pantallas.
import { SUPABASE_URL, SUPABASE_CLAVE, VERSION } from "./config.js";
import { crearCliente } from "./supabase.js";
import * as L from "./logica.js";
import { $, el, boton, icono, toast, pedirDatos, elegir, deslizarParaCerrar, vibrar } from "./ui.js";

const db = crearCliente({ url: SUPABASE_URL, clave: SUPABASE_CLAVE });

const TABLAS = ["profiles", "settings", "work_templates", "shifts", "plans", "tasks", "inventory", "meals", "bills", "touches", "gym_sessions"];
const TITULOS = { hoy: "Hoy", comprar: "Comprar", comida: "Comida", casa: "Casa", nosotros: "Nosotros" };
const EMOJIS_PERFIL = ["🙂", "😎", "🦊", "🐻", "🐱", "🐶", "🌻", "🌙", "⭐", "🍀", "🔥", "🦋"];
const COLORES = [["#E2725B", "Terracota"], ["#5B8DEF", "Azul"], ["#E86A9E", "Rosa"], ["#3FA672", "Verde"], ["#9B6BDF", "Violeta"], ["#E9A23B", "Mostaza"]];
const ICONOS_PAGO = ["💡", "💧", "🔥", "🏠", "📶", "📱", "📺", "🚗", "🏋️", "💳", "🧾"];
const ICONOS_TAREA = ["🧹", "🧺", "🍽️", "🗑️", "🛏️", "🪴", "🐾", "🧽", "🛒", "🔧"];
const ICONOS_PLAN = ["📌", "🎬", "🍕", "🎂", "✈️", "🏖️", "🎉", "🛍️", "🩺", "☕"];
const CATEGORIAS_BASE = ["Almacén", "Baño", "Cocina", "Limpieza", "Verdulería", "Bebidas", "Mascotas", "Otros"];

const estado = {
  yo: null,
  datos: Object.fromEntries(TABLAS.map((t) => [t, []])),
  vista: "hoy",
  casaTab: "tareas",
  comprarFiltro: "comprar",
  semanaComida: L.fechaISO(),
  enLinea: navigator.onLine,
  tiempoReal: false,
  toquesVistos: new Set(),
};
let canal = null;
let cicloRecarga = null;

const hoy = () => L.fechaISO();
const D = (t) => estado.datos[t];
const ajustes = () => Object.fromEntries(D("settings").map((s) => [s.key, s.value]));
const perfil = (id) => D("profiles").find((p) => p.id === id) || null;
const miPerfil = () => perfil(estado.yo?.id);
const pareja = () => D("profiles").find((p) => p.id !== estado.yo?.id) || null;
const nombreDe = (id) => (id === estado.yo?.id ? "Vos" : perfil(id)?.name || "—");
const nombreReal = (id) => perfil(id)?.name || "—";

// ---------- Arranque y sesión ----------
async function iniciar() {
  aplicarTema();
  deslizarParaCerrar($("#hoja"));
  armarTabs();
  registrarSW();
  addEventListener("online", () => { estado.enLinea = true; $("#sin-red").hidden = true; recargar(); });
  addEventListener("offline", () => { estado.enLinea = false; $("#sin-red").hidden = false; });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && estado.yo) recargar(); });
  db.alSalir(() => mostrarLogin("La sesión se cerró. Volvé a entrar."));

  if (!db.sesion) return mostrarLogin();
  estado.yo = db.usuario;
  const cache = leerCache();
  if (cache) {
    estado.datos = { ...estado.datos, ...cache };
    mostrarApp();
  }
  try {
    await abrirSesion();
  } catch (err) {
    if (err.estado === 401 || err.codigo === "sin_sesion") return mostrarLogin(err.message);
    if (!cache) mostrarLogin(err.message);
    else toast(err.message, { tipo: "error" });
  }
}

async function abrirSesion() {
  const habilitado = await db.leer("members", `user_id=eq.${estado.yo.id}`);
  if (!habilitado?.length) {
    await db.salir();
    mostrarLogin("Esta cuenta no está habilitada en NIDO. Falta correr el paso 2 del SQL.");
    return;
  }
  await cargarTodo();
  mostrarApp();
  if (!miPerfil()) await bienvenida();
  conectarVivo();
}

function mostrarLogin(mensaje = "") {
  canal?.cerrar();
  canal = null;
  clearInterval(cicloRecarga);
  estado.yo = null;
  $("#arranque").hidden = true;
  $("#app").hidden = true;
  $("#login").hidden = false;
  const err = $("#login-error");
  err.textContent = mensaje;
  err.hidden = !mensaje;
  colorBarra();
}

function mostrarApp() {
  $("#arranque").hidden = true;
  $("#login").hidden = true;
  $("#app").hidden = false;
  colorBarra();
  render();
}

$("#form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Entrando…";
  $("#login-error").hidden = true;
  try {
    estado.yo = await db.entrar(f.email.value, f.clave.value);
    f.clave.value = "";
    await abrirSesion();
  } catch (err) {
    $("#login-error").textContent = err.message;
    $("#login-error").hidden = false;
    vibrar(40);
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});
$("#ver-clave").addEventListener("click", () => {
  const i = $("#form-login").clave;
  i.type = i.type === "password" ? "text" : "password";
  $("#ver-clave").textContent = i.type === "password" ? "Ver" : "Ocultar";
});

async function bienvenida() {
  const datos = await pedirDatos({
    titulo: "¡Bienvenido/a a NIDO!",
    texto: "Contanos cómo te llamás. Lo ve solo tu pareja.",
    ok: "Empezar",
    cancelar: "Después",
    campos: [
      { nombre: "name", etiqueta: "Tu nombre", requerido: true, placeholder: "Ej: Sol" },
      { nombre: "emoji", etiqueta: "Tu emoji", tipo: "chips", opciones: EMOJIS_PERFIL.map((e) => [e, e]), valor: "🙂" },
      { nombre: "color", etiqueta: "Tu color", tipo: "chips", opciones: COLORES, valor: COLORES[estado.datos.profiles.length ? 2 : 1][0] },
    ],
  });
  if (!datos) return;
  await guardarPerfil(datos);
  toast("¡Listo! Ahora cargá tus horarios en Nosotros 💛");
}

// ---------- Datos ----------
function consultas() {
  const h = hoy();
  const desde = L.sumarDias(L.inicioSemana(estado.semanaComida < h ? estado.semanaComida : h), -7);
  const hasta = L.sumarDias(L.inicioSemana(estado.semanaComida > h ? estado.semanaComida : h), 27);
  return {
    profiles: "",
    settings: "",
    work_templates: "order=start_time",
    shifts: `date=gte.${L.sumarDias(h, -7)}&date=lte.${L.sumarDias(h, 30)}`,
    plans: `date=gte.${L.sumarDias(h, -2)}&order=date,time.nullsfirst`,
    tasks: "order=created_at",
    inventory: "order=name",
    meals: `date=gte.${desde}&date=lte.${hasta}`,
    bills: "order=due_day",
    touches: "order=created_at.desc&limit=30",
    gym_sessions: `date=gte.${L.sumarDias(h, -400)}&order=date.desc,time.desc`,
  };
}

async function cargarTodo() {
  const q = consultas();
  const resultados = await Promise.all(TABLAS.map((t) => db.leer(t, q[t])));
  TABLAS.forEach((t, i) => (estado.datos[t] = resultados[i] || []));
  guardarCache();
  revisarToques();
}

let recargando = null;
async function recargar(tablas = TABLAS) {
  if (!estado.yo) return;
  if (recargando) {
    await recargando.catch(() => {});
    return recargar(tablas);
  }
  const q = consultas();
  recargando = Promise.all(tablas.map(async (t) => (estado.datos[t] = (await db.leer(t, q[t])) || [])))
    .then(() => {
      guardarCache();
      revisarToques();
      $("#sin-red").hidden = true;
      render({ suave: true });
    })
    .catch((err) => {
      if (err.codigo === "red") $("#sin-red").hidden = false;
    })
    .finally(() => (recargando = null));
  return recargando;
}

// Cambios en vivo: se recarga solo la tabla que cambió (agrupando ráfagas).
const pendientes = new Set();
let temporizadorVivo = null;
function conectarVivo() {
  canal?.cerrar();
  canal = db.tiempoReal(({ tabla }) => {
    if (!TABLAS.includes(tabla)) return;
    pendientes.add(tabla);
    clearTimeout(temporizadorVivo);
    temporizadorVivo = setTimeout(() => {
      const ts = [...pendientes];
      pendientes.clear();
      recargar(ts);
    }, 350);
  }, (ok) => {
    estado.tiempoReal = ok;
    $("#estado-vivo").classList.toggle("ok", ok);
    $("#estado-vivo").title = ok ? "En vivo" : "Actualizando cada 30 s";
  });
  clearInterval(cicloRecarga);
  // Respaldo: si el tiempo real no está conectado, se actualiza cada 30 segundos.
  cicloRecarga = setInterval(() => { if (!estado.tiempoReal && !document.hidden) recargar(); }, 30000);
}

function guardarCache() {
  try {
    localStorage.setItem(`nido-cache-${estado.yo.id}`, JSON.stringify(estado.datos));
  } catch { /* lleno o privado */ }
}
function leerCache() {
  try {
    return JSON.parse(localStorage.getItem(`nido-cache-${estado.yo.id}`) || "null");
  } catch {
    return null;
  }
}

// Ejecuta un cambio en la base; si falla, avisa y vuelve a traer lo real.
async function cambiar(tabla, accion, { mensaje = "", deshacer = null } = {}) {
  try {
    const r = await accion();
    await recargar([tabla]);
    if (mensaje) toast(mensaje, { deshacer });
    return r ?? true;
  } catch (err) {
    toast(err.message, { tipo: "error" });
    recargar([tabla]);
    return null;
  }
}

// Cambio optimista: se ve al instante y después se confirma con la base.
function alInstante(tabla, id, cambios) {
  const fila = D(tabla).find((f) => f.id === id);
  if (fila) Object.assign(fila, cambios);
  render({ suave: true });
}

// ---------- Toques ----------
function revisarToques() {
  const nuevos = D("touches").filter((t) => t.to_user === estado.yo?.id && !t.seen_at && !estado.toquesVistos.has(t.id));
  if (!nuevos.length) return;
  const t = nuevos[0];
  if (!perfil(t.from_user) && !revisarToques.pidioPerfiles) {
    // Llegó un toque de alguien que todavía no tenemos cargado: primero traer los perfiles.
    revisarToques.pidioPerfiles = true;
    recargar(["profiles"]).finally(() => { revisarToques.pidioPerfiles = false; });
    return;
  }
  for (const n of nuevos) estado.toquesVistos.add(n.id);
  const info = L.toque(t.kind);
  const de = perfil(t.from_user);
  const aviso = $("#aviso-toque");
  aviso.replaceChildren(
    el("span", { className: "aviso-emoji" }, info.emoji),
    el("span", {}, el("strong", {}, `${de?.name || "Tu pareja"}`), el("small", {}, nuevos.length > 1 ? `${info.texto} y ${nuevos.length - 1} más` : info.texto)));
  aviso.hidden = false;
  aviso.classList.remove("sale");
  vibrar([30, 60, 30]);
  setTimeout(() => {
    aviso.classList.add("sale");
    setTimeout(() => (aviso.hidden = true), 300);
  }, 4500);
  aviso.onclick = () => { aviso.hidden = true; irA("hoy"); };
  const ids = nuevos.map((n) => n.id).join(",");
  db.actualizar("touches", { consulta: `id=in.(${ids})` }, { seen_at: new Date().toISOString() }).catch(() => {});
}

async function mandarToque(kind) {
  const otro = pareja();
  if (!otro) return toast("Tu pareja todavía no entró a NIDO.", { tipo: "error" });
  vibrar(15);
  const info = L.toque(kind);
  await cambiar("touches", () => db.insertar("touches", { to_user: otro.id, kind }), { mensaje: `${info.emoji} Enviado a ${otro.name}` });
}

// ---------- Navegación ----------
function armarTabs() {
  for (const b of document.querySelectorAll(".tab")) {
    b.querySelector(".tab-ico").append(icono(b.dataset.ico || b.dataset.vista));
    b.addEventListener("click", () => {
      vibrar(6);
      if (estado.vista === b.dataset.vista) {
        $("#vista").scrollTo({ top: 0, behavior: "smooth" });
        scrollTo({ top: 0, behavior: "smooth" });
      }
      irA(b.dataset.vista);
    });
  }
  $("#btn-pareja").addEventListener("click", () => irA("nosotros"));
}

function irA(vista) {
  if (estado.vista === vista) return;
  estado.vista = vista;
  scrollTo({ top: 0 });
  render();
}

const VISTAS = { hoy: vistaHoy, comprar: vistaComprar, comida: vistaComida, casa: vistaCasa, nosotros: vistaNosotros };

function render({ suave = false } = {}) {
  if (!estado.yo || $("#app").hidden) return;
  const h = hoy();
  $("#fecha-hoy").textContent = L.fmtFecha(h);
  $("#titulo-vista").textContent = estado.vista === "hoy" ? `${L.saludo()}${miPerfil() ? `, ${miPerfil().name}` : ""}` : TITULOS[estado.vista];
  for (const b of document.querySelectorAll(".tab")) b.classList.toggle("activa", b.dataset.vista === estado.vista);
  const yo = miPerfil();
  $("#btn-pareja").replaceChildren(avatar(yo, "chico"));

  const faltan = D("inventory").filter((i) => i.status === "rojo").length;
  $("#badge-comprar").textContent = faltan;
  $("#badge-comprar").hidden = !faltan;
  const urgentes = D("bills").filter((b) => ["vencido", "hoy"].includes(L.estadoPago(b, h).clave)).length
    + D("tasks").filter((t) => L.estadoTarea(t, h).atrasada).length;
  $("#badge-casa").textContent = urgentes;
  $("#badge-casa").hidden = !urgentes;

  const vista = $("#vista");
  const y = scrollY;
  const contenido = VISTAS[estado.vista]();
  vista.replaceChildren(...contenido.filter(Boolean));
  vista.classList.toggle("entrar", !suave);
  if (!suave) {
    void vista.offsetWidth;
    vista.querySelectorAll(":scope > *").forEach((n, i) => n.style.setProperty("--i", Math.min(i, 8)));
  } else {
    scrollTo({ top: y });
  }
}

// ---------- Piezas comunes ----------
function avatar(p, tam = "") {
  const a = el("span", { className: `avatar ${tam}` }, p?.emoji || "🙂");
  a.style.setProperty("--color", p?.color || "#E2725B");
  return a;
}

function tarjeta(titulo, { accion = null, clase = "", sub = "" } = {}, ...hijos) {
  return el("section", { className: `tarjeta ${clase}` },
    titulo ? el("header", { className: "tarjeta-cab" },
      el("div", {}, el("h2", {}, titulo), sub ? el("p", { className: "tarjeta-sub" }, sub) : null),
      accion) : null,
    ...hijos);
}

function vacio(texto, emoji = "✨") {
  return el("div", { className: "vacio" }, el("span", {}, emoji), el("p", {}, texto));
}

const botonMas = (texto, fn) => boton([icono("mas", "ico ico-chico"), texto], fn, "btn-mini");
const botonEditar = (fn, etiqueta = "Editar") => boton(icono("lapiz"), fn, "redondo", { ariaLabel: etiqueta });

function pildora(texto, clase = "") {
  return el("span", { className: `pildora ${clase}` }, texto);
}

function cocineroTexto(cook) {
  if (!cook) return "";
  if (cook === "ambos") return "Cocinan los dos";
  if (cook === "nadie") return "Nadie cocina 😎";
  return `Cocina ${nombreReal(cook)}`;
}

// ---------- HOY ----------
function vistaHoy() {
  const h = hoy();
  const ahora = L.minutosAhora();
  const yo = miPerfil();
  const otro = pareja();
  const personas = [yo, otro].filter(Boolean);
  const turnos = personas.map((p) => L.turnoDelDia(p.id, h, D("shifts"), D("work_templates")));

  // Ustedes
  const filas = personas.map((p, i) => {
    const t = turnos[i];
    const e = L.estadoAhora(t, ahora);
    const fila = el("button", { type: "button", className: `persona estado-${e.clave}` },
      avatar(p),
      el("span", { className: "persona-txt" },
        el("strong", {}, p.id === estado.yo.id ? `${p.name} (vos)` : p.name),
        el("span", {}, e.texto, t && !t.off && t.lugar ? ` · ${t.lugar}` : "")),
      t && !t.off ? el("span", { className: "persona-hora" }, `${t.inicio}–${t.fin}`) : pildora(t?.off ? "Franco" : "Cargar", t?.off ? "ok" : "suave"));
    if (e.clave === "trabajando" && t) {
      const [a, b] = [L.aMinutos(t.inicio), L.aMinutos(t.fin) <= L.aMinutos(t.inicio) ? L.aMinutos(t.fin) + 1440 : L.aMinutos(t.fin)];
      const barra = el("span", { className: "progreso" }, el("span", {}));
      barra.firstChild.style.width = `${Math.round(((ahora - a) / (b - a)) * 100)}%`;
      fila.append(barra);
    }
    fila.addEventListener("click", () => editarDia(p.id, h));
    return fila;
  });
  const juntos = personas.length === 2 ? L.textoJuntos(turnos[0], turnos[1]) : "";
  const ustedes = tarjeta("Ustedes hoy", { clase: "tarjeta-ustedes" },
    ...filas,
    !otro ? el("p", { className: "nota" }, "Cuando tu pareja entre con su cuenta, aparece acá.") : null,
    juntos ? el("p", { className: "juntos" }, "💞 Juntos ", juntos) : null);

  // Toques
  const recibidos = D("touches").filter((t) => t.to_user === estado.yo.id).slice(0, 3);
  const toques = tarjeta("Toques", { sub: otro ? `Mandale algo a ${otro.name}` : "" },
    recibidos.length ? el("div", { className: "toques-recibidos" }, ...recibidos.map((t) => {
      const info = L.toque(t.kind);
      return el("div", { className: "toque-recibido" }, el("span", {}, info.emoji), el("span", {}, el("strong", {}, info.texto), el("small", {}, L.haceCuanto(t.created_at))));
    })) : null,
    el("div", { className: "toques" }, ...L.TOQUES.map((t) =>
      boton([el("span", { className: "toque-emoji" }, t.emoji), el("span", {}, t.texto)], () => mandarToque(t.id), "toque"))));

  // Alertas de pagos
  const pagosUrgentes = L.ordenarPagos(D("bills"), h).filter((b) => ["vencido", "hoy", "pronto"].includes(L.estadoPago(b, h).clave));
  const pagos = pagosUrgentes.length ? tarjeta("Pagos que se vienen", { accion: boton("Ver", () => { estado.casaTab = "pagos"; irA("casa"); }, "btn-mini") },
    ...pagosUrgentes.slice(0, 4).map(filaPago)) : null;

  // Comida de hoy
  const comidaHoy = ["almuerzo", "cena"].map((slot) => D("meals").find((m) => m.date === h && m.slot === slot));
  const comida = tarjeta("Comida de hoy", { accion: boton("Semana", () => irA("comida"), "btn-mini") },
    ...["almuerzo", "cena"].map((slot, i) => filaComida(h, slot, comidaHoy[i])));

  // Falta en casa
  const faltan = L.agruparInventario(D("inventory")).rojo;
  const falta = tarjeta("Falta en casa", { accion: boton("Lista", () => irA("comprar"), "btn-mini") },
    faltan.length
      ? el("div", { className: "chips-falta" }, ...faltan.map((i) => boton([el("span", { className: "punto rojo" }), i.name], () => marcarComprado(i), "chip-falta", { title: "Tocá cuando lo compres" })))
      : vacio("No falta nada. ¡Bien ahí!", "🎉"),
    faltan.length ? el("p", { className: "nota" }, "Tocá un producto cuando lo compres.") : null);

  // Para hacer
  const tareasHoy = L.ordenarTareas(D("tasks"), h).filter((t) => {
    const e = L.estadoTarea(t, h);
    return !e.hecha && (e.paraHoy || e.atrasada) && (!t.assigned_to || t.assigned_to === estado.yo.id);
  });
  const tareas = tarjeta("Para hacer hoy", { accion: boton("Todas", () => { estado.casaTab = "tareas"; irA("casa"); }, "btn-mini") },
    tareasHoy.length ? el("div", { className: "lista" }, ...tareasHoy.slice(0, 5).map(filaTarea)) : vacio("Nada pendiente para hoy.", "🧘"));

  // Planes
  const proximos = D("plans").filter((p) => !p.done && p.date >= h && p.date <= L.sumarDias(h, 14));
  const planes = tarjeta("Planes", { accion: botonMas("Plan", () => editarPlan(null)) },
    proximos.length ? el("div", { className: "lista" }, ...proximos.slice(0, 6).map(filaPlan)) : vacio("Sin planes. ¿Salimos a algún lado?", "📅"));

  // Gym
  const gym = tarjetaGym(true);

  return [ustedes, toques, pagos, comida, falta, tareas, planes, gym];
}

// ---------- Turnos ----------
async function editarDia(userId, fecha) {
  if (userId !== estado.yo.id) {
    const t = L.turnoDelDia(userId, fecha, D("shifts"), D("work_templates"));
    toast(t ? (t.off ? `${nombreReal(userId)} tiene franco` : `${nombreReal(userId)}: ${t.inicio} a ${t.fin}${t.lugar ? ` en ${t.lugar}` : ""}`) : `${nombreReal(userId)} no cargó su horario`);
    return;
  }
  const plantillas = D("work_templates").filter((p) => p.user_id === userId);
  const actual = D("shifts").find((s) => s.user_id === userId && s.date === fecha);
  const opciones = [
    ...plantillas.map((p) => ({ valor: `p${p.id}`, emoji: "💼", texto: p.label || `${L.hora(p.start_time)} a ${L.hora(p.end_time)}`, detalle: `${L.hora(p.start_time)}–${L.hora(p.end_time)}${p.place ? ` · ${p.place}` : ""}` })),
    { valor: "franco", emoji: "🌴", texto: "Franco / libre" },
    { valor: "otro", emoji: "🕐", texto: "Otro horario", detalle: "Elegís la hora de entrada y salida" },
  ];
  if (actual) opciones.push({ valor: "quitar", emoji: "↩️", texto: "Volver a mi horario de siempre", detalle: "Borra lo cargado para este día" });
  if (!plantillas.length) opciones.push({ valor: "plantillas", emoji: "⚙️", texto: "Configurar mis horarios", detalle: "Así después lo elegís con un toque" });
  const v = await elegir({ titulo: `Tu horario · ${L.cuandoTexto(fecha, hoy())}`, opciones });
  if (!v) return;
  if (v === "plantillas") { irA("nosotros"); return editarPlantilla(null); }
  if (v === "quitar") return cambiar("shifts", () => db.borrar("shifts", actual.id), { mensaje: "Listo" });
  let fila = { date: fecha, off: false, start_time: null, end_time: null, place: "" };
  if (v === "franco") fila.off = true;
  else if (v === "otro") {
    const d = await pedirDatos({
      titulo: "Otro horario",
      campos: [
        { nombre: "start_time", etiqueta: "Entrada", tipo: "time", valor: actual?.start_time ? L.hora(actual.start_time) : "", requerido: true },
        { nombre: "end_time", etiqueta: "Salida", tipo: "time", valor: actual?.end_time ? L.hora(actual.end_time) : "", requerido: true },
        { nombre: "place", etiqueta: "Lugar (opcional)", valor: actual?.place || "", lista: [...new Set(plantillas.map((p) => p.place).filter(Boolean))] },
      ],
    });
    if (!d) return;
    fila = { ...fila, start_time: d.start_time, end_time: d.end_time, place: d.place.trim() };
  } else {
    const p = plantillas.find((x) => `p${x.id}` === v);
    fila = { ...fila, start_time: p.start_time, end_time: p.end_time, place: p.place };
  }
  await cambiar("shifts", () => db.insertar("shifts", { ...fila, user_id: estado.yo.id }, { conflicto: "user_id,date" }), { mensaje: "Horario guardado" });
}

async function editarPlantilla(p) {
  const d = await pedirDatos({
    titulo: p ? "Editar horario" : "Nuevo horario de trabajo",
    texto: "Marcá los días que lo hacés siempre. Si cambia (como los turnos rotativos), dejalo sin días y elegilo día por día.",
    borrar: Boolean(p),
    campos: [
      { nombre: "label", etiqueta: "Nombre", valor: p?.label || "", placeholder: "Ej: Turno mañana", requerido: true },
      { nombre: "place", etiqueta: "Lugar", valor: p?.place || "", placeholder: "Ej: Trabajo" },
      { nombre: "start_time", etiqueta: "Entrada", tipo: "time", valor: L.hora(p?.start_time), requerido: true },
      { nombre: "end_time", etiqueta: "Salida", tipo: "time", valor: L.hora(p?.end_time), requerido: true },
      { nombre: "weekdays", etiqueta: "Días fijos", tipo: "chips", multiple: true, opciones: L.DIAS_CORTOS.map((d, i) => [i + 1, d]), valor: p?.weekdays || [] },
    ],
  });
  if (!d) return;
  if (d.borrar) return cambiar("work_templates", () => db.borrar("work_templates", p.id), { mensaje: "Horario borrado" });
  const fila = { label: d.label.trim(), place: d.place.trim(), start_time: d.start_time, end_time: d.end_time, weekdays: d.weekdays.map(Number).sort() };
  await cambiar("work_templates", () => (p ? db.actualizar("work_templates", p.id, fila) : db.insertar("work_templates", fila)), { mensaje: "Horario guardado" });
}

// ---------- COMPRAR ----------
async function marcarComprado(i) {
  const antes = i.status;
  alInstante("inventory", i.id, { status: "verde" });
  vibrar(12);
  await cambiar("inventory", () => db.actualizar("inventory", i.id, { status: "verde", updated_by: estado.yo.id, updated_at: new Date().toISOString() }), {
    mensaje: `✓ ${i.name} comprado`,
    deshacer: () => cambiar("inventory", () => db.actualizar("inventory", i.id, { status: antes })),
  });
}

async function cambiarEstadoInv(i, nuevo = L.SIGUIENTE_ESTADO[i.status]) {
  alInstante("inventory", i.id, { status: nuevo });
  vibrar(8);
  await cambiar("inventory", () => db.actualizar("inventory", i.id, { status: nuevo, updated_by: estado.yo.id, updated_at: new Date().toISOString() }));
}

function vistaComprar() {
  const items = D("inventory");
  const g = L.agruparInventario(items);
  const cats = [...new Set([...L.categorias(items), ...CATEGORIAS_BASE])];

  const form = el("form", { className: "agregar" },
    el("input", { name: "nombre", placeholder: "Agregar algo que falta…", autocomplete: "off", maxLength: 60, enterKeyHint: "done", ariaLabel: "Producto" }),
    el("button", { type: "submit", className: "btn btn-icono", ariaLabel: "Agregar" }, icono("mas")));
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const nombre = form.nombre.value.trim();
    if (!nombre) return;
    const existe = items.find((i) => i.name.toLowerCase() === nombre.toLowerCase());
    form.nombre.value = "";
    if (existe) {
      if (existe.status !== "rojo") await cambiarEstadoInv(existe, "rojo");
      toast(`${existe.name} pasó a "Se terminó"`);
      return;
    }
    await cambiar("inventory", () => db.insertar("inventory", { name: nombre, category: adivinarCategoria(nombre, items), status: "rojo" }), { mensaje: `${nombre} agregado a la lista` });
  });

  const filtro = el("div", { className: "segmentado" },
    ...[["comprar", `Para comprar (${g.rojo.length + g.amarillo.length})`], ["todo", `Todo (${items.length})`]].map(([v, t]) =>
      boton(t, () => { estado.comprarFiltro = v; render({ suave: true }); }, `segmento${estado.comprarFiltro === v ? " activo" : ""}`)));

  const compartir = boton([icono("compartir", "ico ico-chico"), "Compartir"], async () => {
    const texto = L.textoListaCompras(items);
    if (!texto) return toast("No hay nada para comprar 🎉");
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); toast("Lista copiada. Pegala en WhatsApp."); }
    } catch { /* canceló */ }
  }, "btn-mini");

  const grupo = (clave, titulo, lista, vacioTxt) => tarjeta(titulo, { clase: `grupo-${clave}`, sub: `${lista.length} ${lista.length === 1 ? "producto" : "productos"}` },
    lista.length ? el("div", { className: "lista" }, ...lista.map((i) => filaInventario(i, cats))) : vacio(vacioTxt, clave === "rojo" ? "🎉" : "🫙"));

  return [
    form,
    el("div", { className: "fila-acciones" }, filtro, compartir),
    grupo("rojo", "🔴 Se terminó", g.rojo, "Nada que comprar"),
    grupo("amarillo", "🟡 Queda poco", g.amarillo, "Nada por terminarse"),
    estado.comprarFiltro === "todo" ? grupo("verde", "🟢 Hay en casa", g.verde, "Todavía no cargaron productos") : null,
    estado.comprarFiltro === "comprar" ? el("p", { className: "nota centro" }, "Tocá el circulito para cambiar: 🟢 hay → 🟡 queda poco → 🔴 se terminó.") : null,
  ];
}

function adivinarCategoria(nombre, items) {
  const n = nombre.toLowerCase();
  const parecido = items.find((i) => i.name.toLowerCase().split(" ")[0] === n.split(" ")[0]);
  if (parecido) return parecido.category;
  const reglas = [
    [/shamp|jab[oó]n|dent|cepillo|papel hig|desodor|crema|algod/, "Baño"],
    [/lavandina|detergente|esponja|trapo|lavarr|suaviz|bolsa|limpi|escoba/, "Limpieza"],
    [/tomate|papa|cebolla|lechuga|fruta|banana|manzana|zanahoria|verdura|palta|lim[oó]n/, "Verdulería"],
    [/agua|gaseosa|coca|cerveza|vino|jugo|soda/, "Bebidas"],
    [/perro|gato|alimento balanceado|piedritas/, "Mascotas"],
    [/leche|pan|arroz|fideo|az[uú]car|yerba|caf[eé]|aceite|harina|sal|huevo|queso|manteca|galleta|at[uú]n/, "Almacén"],
  ];
  return reglas.find(([r]) => r.test(n))?.[1] || "Otros";
}

function filaInventario(i, cats) {
  const fila = el("div", { className: `fila inv ${i.status}` },
    boton(el("span", { className: `punto ${i.status}` }), () => cambiarEstadoInv(i), "punto-btn", { ariaLabel: `Cambiar estado de ${i.name}` }),
    el("div", { className: "fila-txt" }, el("strong", {}, i.name), el("small", {}, i.category)),
    i.status !== "verde" ? boton([icono("check", "ico ico-chico"), "Compré"], () => marcarComprado(i), "btn-mini ok") : null,
    botonEditar(() => editarProducto(i, cats), `Editar ${i.name}`));
  return fila;
}

async function editarProducto(i, cats) {
  const d = await pedirDatos({
    titulo: i ? "Editar producto" : "Nuevo producto",
    borrar: Boolean(i),
    campos: [
      { nombre: "name", etiqueta: "Producto", valor: i?.name || "", requerido: true },
      { nombre: "category", etiqueta: "Categoría", valor: i?.category || "Otros", lista: cats },
      { nombre: "status", etiqueta: "Estado", tipo: "chips", opciones: [["verde", "🟢 Hay"], ["amarillo", "🟡 Queda poco"], ["rojo", "🔴 Se terminó"]], valor: i?.status || "rojo" },
    ],
  });
  if (!d) return;
  if (d.borrar) {
    return cambiar("inventory", () => db.borrar("inventory", i.id), {
      mensaje: `${i.name} borrado`,
      deshacer: () => cambiar("inventory", () => db.insertar("inventory", { name: i.name, category: i.category, status: i.status })),
    });
  }
  const fila = { name: d.name.trim(), category: d.category.trim() || "Otros", status: d.status, updated_by: estado.yo.id, updated_at: new Date().toISOString() };
  await cambiar("inventory", () => (i ? db.actualizar("inventory", i.id, fila) : db.insertar("inventory", fila)), { mensaje: "Guardado" });
}

// ---------- COMIDA ----------
function filaComida(fecha, slot, m) {
  const cocinero = m?.cook && m.cook !== "ambos" && m.cook !== "nadie" ? perfil(m.cook) : null;
  const b = el("button", { type: "button", className: `fila comida${m?.title ? "" : " vacia"}` },
    el("span", { className: "comida-slot" }, slot === "almuerzo" ? "☀️" : "🌙"),
    el("span", { className: "fila-txt" },
      el("strong", {}, m?.title || (slot === "almuerzo" ? "¿Qué almorzamos?" : "¿Qué cenamos?")),
      el("small", {}, `${slot === "almuerzo" ? "Almuerzo" : "Cena"}${m?.cook ? ` · ${cocineroTexto(m.cook)}` : ""}`)),
    cocinero ? avatar(cocinero, "chico") : m?.cook === "ambos" ? el("span", { className: "avatar chico neutro" }, "👫") : m?.cook === "nadie" ? el("span", { className: "avatar chico neutro" }, "😎") : null);
  b.addEventListener("click", () => editarComida(fecha, slot, m));
  return b;
}

function opcionesCocinero() {
  return [...D("profiles").map((p) => [p.id, `${p.emoji} ${p.name}`]), ["ambos", "👫 Los dos"], ["nadie", "😎 Nadie (pedimos)"], ["", "Sin definir"]];
}

async function editarComida(fecha, slot, m) {
  const anteriores = [...new Set(D("meals").map((x) => x.title).filter(Boolean))].slice(0, 30);
  const d = await pedirDatos({
    titulo: `${slot === "almuerzo" ? "Almuerzo" : "Cena"} · ${L.cuandoTexto(fecha, hoy())}`,
    borrar: Boolean(m),
    campos: [
      { nombre: "title", etiqueta: "¿Qué comen?", valor: m?.title || "", placeholder: "Ej: Milanesas con puré", lista: anteriores },
      { nombre: "cook", etiqueta: "¿Quién cocina?", tipo: "chips", opciones: opcionesCocinero(), valor: m?.cook ?? "" },
    ],
  });
  if (!d) return;
  if (d.borrar) return cambiar("meals", () => db.borrar("meals", m.id), { mensaje: "Borrado" });
  await cambiar("meals", () => db.insertar("meals", { date: fecha, slot, title: d.title.trim(), cook: d.cook }, { conflicto: "date,slot" }), { mensaje: "Guardado" });
}

async function quienCocinaHoy(cook) {
  const h = hoy();
  const m = D("meals").find((x) => x.date === h && x.slot === "cena");
  vibrar(10);
  await cambiar("meals", () => db.insertar("meals", { date: h, slot: "cena", title: m?.title || "", cook }, { conflicto: "date,slot" }), { mensaje: cocineroTexto(cook) || "Listo" });
}

function vistaComida() {
  const h = hoy();
  const sem = L.menuSemana(D("meals"), estado.semanaComida);
  const ini = sem[0].fecha;
  const fin = sem[6].fecha;
  const esEsta = ini === L.inicioSemana(h);
  const cenaHoy = D("meals").find((x) => x.date === h && x.slot === "cena");

  const cambiarSemana = async (n) => {
    estado.semanaComida = L.sumarDias(estado.semanaComida, n * 7);
    render({ suave: true });
    await recargar(["meals"]);
  };
  const nav = el("div", { className: "nav-semana" },
    boton(icono("izquierda"), () => cambiarSemana(-1), "redondo", { ariaLabel: "Semana anterior" }),
    el("div", { className: "nav-semana-txt" },
      el("strong", {}, esEsta ? "Esta semana" : ini > h ? "Semana que viene" : "Semana pasada"),
      el("small", {}, `${L.fmtFecha(ini, { day: "numeric", month: "short" })} al ${L.fmtFecha(fin, { day: "numeric", month: "short" })}`)),
    boton(icono("derecha"), () => cambiarSemana(1), "redondo", { ariaLabel: "Semana siguiente" }));

  const quien = tarjeta("¿Quién cocina hoy?", { sub: cenaHoy?.title ? `Cena: ${cenaHoy.title}` : "Para la cena" },
    el("div", { className: "chips chips-grandes" }, ...opcionesCocinero().filter(([v]) => v !== "").map(([v, t]) =>
      boton(t, () => quienCocinaHoy(v), `chip${cenaHoy?.cook === v ? " activo" : ""}`))));

  // Quién cocinó más esta semana (para repartir)
  const cuenta = {};
  for (const d of sem) for (const m of [d.almuerzo, d.cena]) if (m?.cook) cuenta[m.cook] = (cuenta[m.cook] || 0) + 1;
  const reparto = D("profiles").filter((p) => cuenta[p.id]).map((p) => `${p.emoji} ${p.name}: ${cuenta[p.id]}`);
  if (cuenta.ambos) reparto.push(`👫 Juntos: ${cuenta.ambos}`);

  const dias = sem.map((d) => el("section", { className: `dia${d.fecha === h ? " hoy" : ""}${d.fecha < h ? " pasado" : ""}` },
    el("header", {}, el("strong", {}, L.DIAS[L.diaSemana(d.fecha) - 1]), el("small", {}, d.fecha === h ? "Hoy" : L.fmtFecha(d.fecha, { day: "numeric", month: "short" }))),
    filaComida(d.fecha, "almuerzo", d.almuerzo),
    filaComida(d.fecha, "cena", d.cena)));

  const vacia = sem.every((d) => !d.almuerzo?.title && !d.cena?.title);
  const copiar = vacia ? boton("Copiar el menú de la semana anterior", async () => {
    const previa = L.menuSemana(D("meals"), L.sumarDias(ini, -7));
    const filas = previa.flatMap((d, i) => [d.almuerzo, d.cena].filter((m) => m?.title).map((m) => ({ date: sem[i].fecha, slot: m.slot, title: m.title, cook: m.cook })));
    if (!filas.length) return toast("La semana anterior también está vacía");
    await cambiar("meals", () => db.insertar("meals", filas, { conflicto: "date,slot" }), { mensaje: "Menú copiado" });
  }, "btn btn-suave ancho") : null;

  return [
    esEsta ? quien : null,
    nav,
    reparto.length ? el("p", { className: "nota centro" }, `Esta semana cocinaron · ${reparto.join(" · ")}`) : null,
    copiar,
    el("div", { className: "dias" }, ...dias),
  ];
}

// ---------- CASA ----------
function vistaCasa() {
  const tabs = el("div", { className: "segmentado" },
    ...[["tareas", "Tareas"], ["pagos", "Pagos"], ["gym", ajustes().gym_name || "Gym"]].map(([v, t]) =>
      boton(t, () => { estado.casaTab = v; render({ suave: true }); }, `segmento${estado.casaTab === v ? " activo" : ""}`)));
  const contenido = { tareas: casaTareas, pagos: casaPagos, gym: casaGym }[estado.casaTab]();
  return [tabs, ...contenido];
}

function filaTarea(t) {
  const h = hoy();
  const e = L.estadoTarea(t, h);
  const sub = [L.FRECUENCIAS[t.frequency]];
  if (t.assigned_to) sub.push(t.assigned_to === estado.yo.id ? "Te toca a vos" : `Le toca a ${nombreReal(t.assigned_to)}`);
  if (e.hecha && t.done_by) sub.push(`Hecha por ${nombreDe(t.done_by)}`);
  else if (t.due_date) sub.push(e.atrasada ? `Atrasada (${L.cuandoTexto(t.due_date, h)})` : `Para ${L.cuandoTexto(t.due_date, h).toLowerCase()}`);
  const check = boton(icono("check"), () => marcarTarea(t), `check${e.hecha ? " hecho" : ""}`, { ariaLabel: e.hecha ? "Desmarcar" : "Marcar hecha", ariaPressed: String(e.hecha) });
  return el("div", { className: `fila tarea${e.hecha ? " hecha" : ""}${e.atrasada ? " atrasada" : ""}` },
    check,
    el("span", { className: "fila-emoji" }, t.icon),
    el("div", { className: "fila-txt" }, el("strong", {}, t.title), el("small", {}, sub.join(" · "))),
    botonEditar(() => editarTarea(t), `Editar ${t.title}`));
}

async function marcarTarea(t) {
  const h = hoy();
  const e = L.estadoTarea(t, h);
  const antes = { last_done: t.last_done, done_by: t.done_by };
  const nuevo = e.hecha ? { last_done: null, done_by: null } : { last_done: h, done_by: estado.yo.id };
  alInstante("tasks", t.id, nuevo);
  vibrar(e.hecha ? 6 : [10, 40, 10]);
  await cambiar("tasks", () => db.actualizar("tasks", t.id, nuevo), {
    mensaje: e.hecha ? "" : `✓ ${t.title}`,
    deshacer: e.hecha ? null : () => cambiar("tasks", () => db.actualizar("tasks", t.id, antes)),
  });
}

function casaTareas() {
  const h = hoy();
  const lista = L.ordenarTareas(D("tasks"), h);
  const pendientes = lista.filter((t) => !L.estadoTarea(t, h).hecha);
  const hechas = lista.filter((t) => L.estadoTarea(t, h).hecha);
  return [
    tarjeta("Pendientes", { accion: botonMas("Tarea", () => editarTarea(null)), sub: pendientes.length ? `${pendientes.length} por hacer` : "" },
      pendientes.length ? el("div", { className: "lista" }, ...pendientes.map(filaTarea)) : vacio(D("tasks").length ? "Todo hecho. ¡Casa impecable!" : "Cargá las tareas de la casa: lavar ropa, sacar la basura, limpiar el baño…", "🧹")),
    hechas.length ? tarjeta("Hechas", { sub: "Las que se repiten vuelven a aparecer solas" }, el("div", { className: "lista" }, ...hechas.map(filaTarea))) : null,
  ];
}

async function editarTarea(t) {
  const d = await pedirDatos({
    titulo: t ? "Editar tarea" : "Nueva tarea",
    borrar: Boolean(t),
    campos: [
      { nombre: "title", etiqueta: "Tarea", valor: t?.title || "", placeholder: "Ej: Sacar la basura", requerido: true },
      { nombre: "icon", etiqueta: "Ícono", tipo: "chips", opciones: ICONOS_TAREA.map((e) => [e, e]), valor: t?.icon || "🧹" },
      { nombre: "frequency", etiqueta: "¿Cada cuánto?", tipo: "chips", opciones: Object.entries(L.FRECUENCIAS), valor: t?.frequency || "weekly" },
      { nombre: "due_date", etiqueta: "¿Para cuándo?", tipo: "date", valor: t?.due_date || "", visibleSi: { campo: "frequency", valores: ["once"] } },
      { nombre: "assigned_to", etiqueta: "¿A quién le toca?", tipo: "chips", opciones: [...D("profiles").map((p) => [p.id, `${p.emoji} ${p.name}`]), ["", "Cualquiera"]], valor: t?.assigned_to || "" },
    ],
  });
  if (!d) return;
  if (d.borrar) return cambiar("tasks", () => db.borrar("tasks", t.id), { mensaje: "Tarea borrada" });
  const fila = { title: d.title.trim(), icon: d.icon, frequency: d.frequency, due_date: d.frequency === "once" && d.due_date ? d.due_date : null, assigned_to: d.assigned_to || null };
  await cambiar("tasks", () => (t ? db.actualizar("tasks", t.id, fila) : db.insertar("tasks", fila)), { mensaje: "Tarea guardada" });
}

function filaPago(b) {
  const h = hoy();
  const e = L.estadoPago(b, h);
  return el("div", { className: `fila pago ${e.clave}` },
    el("span", { className: "fila-emoji" }, b.icon),
    el("div", { className: "fila-txt" },
      el("strong", {}, b.title),
      el("small", {}, [b.amount ? L.fmtPlata(b.amount) : null, e.clave === "pagado" && b.paid_by ? `${e.texto} (${nombreDe(b.paid_by)})` : e.texto].filter(Boolean).join(" · ")),
      b.note ? el("details", { className: "nota-oculta" }, el("summary", {}, "📝 Nota"), el("p", {}, b.note)) : null),
    e.clave === "pagado"
      ? boton(icono("check", "ico ico-chico"), () => marcarPago(b), "btn-mini ok activo", { ariaLabel: "Desmarcar pago" })
      : boton("Pagar", () => marcarPago(b), "btn-mini"),
    botonEditar(() => editarPago(b), `Editar ${b.title}`));
}

async function marcarPago(b) {
  const mes = L.mesISO(hoy());
  const pagado = b.paid_month === mes;
  const antes = { paid_month: b.paid_month, paid_by: b.paid_by };
  const nuevo = pagado ? { paid_month: null, paid_by: null } : { paid_month: mes, paid_by: estado.yo.id };
  alInstante("bills", b.id, nuevo);
  vibrar(10);
  await cambiar("bills", () => db.actualizar("bills", b.id, nuevo), {
    mensaje: pagado ? "" : `✓ ${b.title} pagado`,
    deshacer: pagado ? null : () => cambiar("bills", () => db.actualizar("bills", b.id, antes)),
  });
}

function casaPagos() {
  const h = hoy();
  const lista = L.ordenarPagos(D("bills"), h);
  const falta = L.totalPendiente(D("bills"), h);
  const pagados = lista.filter((b) => L.estadoPago(b, h).clave === "pagado").length;
  const mesNombre = L.deISO(h).toLocaleDateString("es-AR", { month: "long" });
  return [
    D("bills").length ? el("section", { className: "resumen-pagos" },
      el("div", {}, el("small", {}, `Falta pagar en ${mesNombre}`), el("strong", {}, L.fmtPlata(falta))),
      el("div", {}, el("small", {}, "Pagados"), el("strong", {}, `${pagados} de ${lista.length}`))) : null,
    tarjeta("Pagos del mes", { accion: botonMas("Pago", () => editarPago(null)), sub: "Se renuevan solos cada mes" },
      lista.length ? el("div", { className: "lista" }, ...lista.map(filaPago)) : vacio("Cargá los pagos fijos: alquiler, luz, agua, gas, internet…", "🧾")),
  ];
}

async function editarPago(b) {
  const d = await pedirDatos({
    titulo: b ? "Editar pago" : "Nuevo pago mensual",
    borrar: Boolean(b),
    campos: [
      { nombre: "title", etiqueta: "Qué es", valor: b?.title || "", placeholder: "Ej: Alquiler", requerido: true },
      { nombre: "icon", etiqueta: "Ícono", tipo: "chips", opciones: ICONOS_PAGO.map((e) => [e, e]), valor: b?.icon || "💡" },
      { nombre: "amount", etiqueta: "Monto aproximado (opcional)", tipo: "number", valor: b?.amount ?? "", placeholder: "$" },
      { nombre: "due_day", etiqueta: "Día que vence", tipo: "number", valor: b?.due_day ?? 10, requerido: true, min: 1 },
      { nombre: "note", etiqueta: "Nota (opcional, se ve solo al tocarla)", tipo: "textarea", valor: b?.note || "", placeholder: "Ej: se paga por Mercado Pago, alias…" },
    ],
  });
  if (!d) return;
  if (d.borrar) return cambiar("bills", () => db.borrar("bills", b.id), { mensaje: "Pago borrado" });
  const dia = Math.min(31, Math.max(1, Math.round(Number(d.due_day) || 1)));
  const fila = { title: d.title.trim(), icon: d.icon, amount: d.amount === "" ? null : Math.max(0, Number(d.amount) || 0), due_day: dia, note: d.note.trim() };
  await cambiar("bills", () => (b ? db.actualizar("bills", b.id, fila) : db.insertar("bills", fila)), { mensaje: "Pago guardado" });
}

function tarjetaGym(compacta = false) {
  const h = hoy();
  const nombre = ajustes().gym_name || "Gym";
  const personas = [miPerfil(), pareja()].filter(Boolean);
  if (!personas.length) return null;
  const fuiHoy = D("gym_sessions").some((s) => s.user_id === estado.yo.id && s.date === h);
  const filas = personas.map((p) => {
    const n = L.gymSemana(D("gym_sessions"), p.id, h);
    const objetivo = p.gym_goal || 0;
    const racha = L.rachaGym(D("gym_sessions"), p.id, objetivo, h);
    const puntos = el("span", { className: "puntos-gym" }, ...Array.from({ length: Math.max(objetivo, n) }, (_, i) => el("span", { className: i < n ? "lleno" : "" })));
    return el("div", { className: "fila gym" }, avatar(p, "chico"),
      el("div", { className: "fila-txt" }, el("strong", {}, p.id === estado.yo.id ? "Vos" : p.name),
        el("small", {}, `${n} de ${objetivo} esta semana${racha > 1 ? ` · 🔥 ${racha} semanas seguidas` : ""}`)),
      puntos);
  });
  return tarjeta(`🏋️ ${nombre}`, { accion: compacta ? boton("Ver", () => { estado.casaTab = "gym"; irA("casa"); }, "btn-mini") : null },
    ...filas,
    fuiHoy
      ? el("p", { className: "nota ok" }, "✓ Hoy ya entrenaste. ¡Bien!")
      : boton("💪 Fui hoy", () => registrarGym(h), "btn ancho"));
}

async function registrarGym(fecha, hora = null) {
  vibrar([10, 40, 10]);
  const ahora = new Date();
  const h = hora || `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  await cambiar("gym_sessions", () => db.insertar("gym_sessions", { date: fecha, time: h }), { mensaje: "💪 Entrenamiento registrado" });
}

function casaGym() {
  const mias = D("gym_sessions").filter((s) => s.user_id === estado.yo.id).slice(0, 12);
  return [
    tarjetaGym(false),
    tarjeta("Tus últimos entrenamientos", {
      accion: botonMas("Otro día", async () => {
        const d = await pedirDatos({
          titulo: "Registrar otro día",
          campos: [
            { nombre: "date", etiqueta: "Día", tipo: "date", valor: L.sumarDias(hoy(), -1), requerido: true },
            { nombre: "time", etiqueta: "Hora", tipo: "time", valor: "" },
          ],
        });
        if (d) await registrarGym(d.date, d.time || null);
      }),
    },
    mias.length ? el("div", { className: "lista" }, ...mias.map((s) => el("div", { className: "fila" },
      el("span", { className: "fila-emoji" }, "💪"),
      el("div", { className: "fila-txt" }, el("strong", {}, L.cuandoTexto(s.date, hoy())), el("small", {}, s.time ? `a las ${L.hora(s.time)}` : "")),
      boton(icono("basura"), () => cambiar("gym_sessions", () => db.borrar("gym_sessions", s.id), { mensaje: "Borrado" }), "redondo", { ariaLabel: "Borrar" }))))
      : vacio("Todavía no registraste entrenamientos.", "🏋️")),
  ];
}

// ---------- Planes ----------
function filaPlan(p) {
  const h = hoy();
  const b = el("button", { type: "button", className: "fila plan" },
    el("span", { className: "fila-emoji" }, p.icon),
    el("span", { className: "fila-txt" }, el("strong", {}, p.title),
      el("small", {}, `${L.cuandoTexto(p.date, h)}${p.time ? ` · ${L.hora(p.time)}` : ""}`)),
    p.note ? el("span", { className: "pildora suave" }, "📝") : null);
  b.addEventListener("click", () => editarPlan(p));
  return b;
}

async function editarPlan(p) {
  const d = await pedirDatos({
    titulo: p ? "Editar plan" : "Nuevo plan",
    borrar: Boolean(p),
    campos: [
      { nombre: "title", etiqueta: "¿Qué hacemos?", valor: p?.title || "", placeholder: "Ej: Cine, cumple de Juli…", requerido: true },
      { nombre: "icon", etiqueta: "Ícono", tipo: "chips", opciones: ICONOS_PLAN.map((e) => [e, e]), valor: p?.icon || "📌" },
      { nombre: "date", etiqueta: "Día", tipo: "date", valor: p?.date || hoy(), requerido: true },
      { nombre: "time", etiqueta: "Hora (opcional)", tipo: "time", valor: L.hora(p?.time) },
      { nombre: "note", etiqueta: "Nota (opcional)", tipo: "textarea", valor: p?.note || "" },
    ],
  });
  if (!d) return;
  if (d.borrar) return cambiar("plans", () => db.borrar("plans", p.id), { mensaje: "Plan borrado" });
  const fila = { title: d.title.trim(), icon: d.icon, date: d.date, time: d.time || null, note: d.note.trim() };
  await cambiar("plans", () => (p ? db.actualizar("plans", p.id, fila) : db.insertar("plans", fila)), { mensaje: "Plan guardado" });
}

// ---------- NOSOTROS ----------
function vistaNosotros() {
  const h = hoy();
  const yo = miPerfil();
  const otro = pareja();
  const aj = ajustes();
  const dias = L.diasJuntos(aj.couple_since, h);

  const pareja1 = el("section", { className: "tarjeta tarjeta-pareja" },
    el("div", { className: "pareja-avatares" }, avatar(yo, "grande"), el("span", { className: "corazon" }, "❤️"), avatar(otro, "grande")),
    el("h2", {}, `${yo?.name || "Vos"} & ${otro?.name || "…"}`),
    el("p", {}, aj.couple_since ? `Juntos desde ${L.deISO(aj.couple_since).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}` : "¿Desde cuándo están juntos?"),
    dias != null ? el("p", { className: "dias-juntos" }, el("strong", {}, dias.toLocaleString("es-AR")), " días en el nido") : null,
    boton(aj.couple_since ? "Cambiar fecha" : "Poner fecha", () => editarAjuste("couple_since", "¿Desde cuándo están juntos?", "date", aj.couple_since || "2026-05-01"), "btn-mini"));

  // Semana de los dos
  const grilla = el("div", { className: "grilla-semana" },
      el("span", {}), ...[yo, otro].filter(Boolean).map((p) => el("span", { className: "grilla-cab" }, avatar(p, "chico"))),
      ...L.semana(h).flatMap((f) => [
        el("span", { className: `grilla-dia${f === h ? " hoy" : ""}` }, `${L.DIAS_CORTOS[L.diaSemana(f) - 1]} ${Number(f.slice(8))}`),
        ...[yo, otro].filter(Boolean).map((p) => {
          const t = L.turnoDelDia(p.id, f, D("shifts"), D("work_templates"));
          const b = el("button", { type: "button", className: `grilla-turno${t?.off ? " franco" : ""}${!t ? " nada" : ""}${p.id === estado.yo.id ? " mio" : ""}` },
            t ? (t.off ? "Franco" : `${t.inicio}–${t.fin}`) : "—");
          b.addEventListener("click", () => editarDia(p.id, f));
          return b;
        }),
      ]));
  grilla.style.setProperty("--cols", String([yo, otro].filter(Boolean).length || 1));
  const semanaDos = tarjeta("Horarios de la semana", { sub: "Tocá un día tuyo para cambiarlo" }, grilla);

  const plantillas = D("work_templates").filter((p) => p.user_id === estado.yo.id);
  const misHorarios = tarjeta("Mis horarios de trabajo", { accion: botonMas("Horario", () => editarPlantilla(null)), sub: "Para elegirlos con un toque" },
    plantillas.length ? el("div", { className: "lista" }, ...plantillas.map((p) => {
      const b = el("button", { type: "button", className: "fila" },
        el("span", { className: "fila-emoji" }, "💼"),
        el("span", { className: "fila-txt" }, el("strong", {}, p.label || "Horario"),
          el("small", {}, `${L.hora(p.start_time)}–${L.hora(p.end_time)}${p.place ? ` · ${p.place}` : ""} · ${p.weekdays?.length ? p.weekdays.map((d) => L.DIAS_CORTOS[d - 1]).join(", ") : "días variables"}`)),
        icono("lapiz"));
      b.addEventListener("click", () => editarPlantilla(p));
      return b;
    })) : vacio("Cargá tu horario de trabajo (o tus turnos) y NIDO calcula cuándo se ven.", "💼"));

  const perfilCard = tarjeta("Mi perfil", {},
    el("div", { className: "fila" }, avatar(yo),
      el("div", { className: "fila-txt" }, el("strong", {}, yo?.name || "Sin nombre"), el("small", {}, db.usuario?.email || "")),
      botonEditar(editarPerfil, "Editar perfil")));

  const temaActual = leerTema();
  const opciones = tarjeta("Ajustes", {},
    el("div", { className: "ajuste" }, el("span", {}, "Tema"),
      el("div", { className: "segmentado chico" }, ...[["auto", "Auto"], ["claro", "Claro"], ["oscuro", "Oscuro"]].map(([v, t]) =>
        boton(t, () => { guardarTema(v); render({ suave: true }); }, `segmento${temaActual === v ? " activo" : ""}`)))),
    boton(["🏋️ Nombre del gym", el("small", {}, aj.gym_name || "Gym")], () => editarAjuste("gym_name", "Nombre del gym", "text", aj.gym_name || ""), "fila-ajuste"),
    boton(["📲 Instalar en el celular", el("small", {}, "Cómo agregarla a la pantalla de inicio")], ayudaInstalar, "fila-ajuste"),
    boton([icono("salir"), "Cerrar sesión"], async () => {
      if (!confirm("¿Cerrar sesión en este celular?")) return;
      try { localStorage.removeItem(`nido-cache-${estado.yo.id}`); } catch { /* nada */ }
      await db.salir();
    }, "fila-ajuste peligro"));

  return [pareja1, semanaDos, misHorarios, perfilCard, opciones, el("p", { className: "version" }, `NIDO ${VERSION} · ${estado.tiempoReal ? "en vivo" : "actualiza cada 30 s"}`)];
}

async function guardarPerfil(datos) {
  const fila = { id: estado.yo.id, name: datos.name.trim().slice(0, 30), emoji: datos.emoji || "🙂", color: datos.color || "#E2725B", gym_goal: Math.min(7, Math.max(0, Number(datos.gym_goal ?? miPerfil()?.gym_goal ?? 3))), updated_at: new Date().toISOString() };
  await cambiar("profiles", () => (miPerfil() ? db.actualizar("profiles", { consulta: `id=eq.${estado.yo.id}` }, fila) : db.insertar("profiles", fila)));
}

async function editarPerfil() {
  const yo = miPerfil();
  const d = await pedirDatos({
    titulo: "Mi perfil",
    campos: [
      { nombre: "name", etiqueta: "Nombre", valor: yo?.name || "", requerido: true },
      { nombre: "emoji", etiqueta: "Emoji", tipo: "chips", opciones: EMOJIS_PERFIL.map((e) => [e, e]), valor: yo?.emoji || "🙂" },
      { nombre: "color", etiqueta: "Color", tipo: "chips", opciones: COLORES, valor: yo?.color || COLORES[0][0] },
      { nombre: "gym_goal", etiqueta: "Días de gym por semana (objetivo)", tipo: "chips", opciones: [0, 1, 2, 3, 4, 5, 6, 7].map((n) => [n, String(n)]), valor: String(yo?.gym_goal ?? 3) },
    ],
  });
  if (!d) return;
  await guardarPerfil(d);
  toast("Perfil guardado");
}

async function editarAjuste(clave, titulo, tipo, valor) {
  const d = await pedirDatos({ titulo, campos: [{ nombre: "v", etiqueta: titulo, tipo, valor, requerido: tipo === "date" }] });
  if (!d) return;
  await cambiar("settings", () => db.insertar("settings", { key: clave, value: d.v.trim() || null }, { conflicto: "key" }), { mensaje: "Guardado" });
}

function ayudaInstalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  pedirDatos({
    titulo: "Instalar NIDO",
    texto: ios
      ? "En Safari: tocá el botón Compartir (el cuadrado con la flecha) → «Agregar a inicio» → Agregar. Se abre como una app, sin barras."
      : "En Chrome: tocá los tres puntitos → «Agregar a la pantalla principal» o «Instalar app».",
    ok: "",
    cancelar: "Entendido",
  });
}

// ---------- Tema ----------
function leerTema() {
  try { return localStorage.getItem("nido-tema") || "auto"; } catch { return "auto"; }
}
function guardarTema(v) {
  try { localStorage.setItem("nido-tema", v); } catch { /* nada */ }
  aplicarTema();
}
function aplicarTema() {
  const t = leerTema();
  if (t === "auto") delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = t === "oscuro" ? "oscuro" : "claro";
  colorBarra();
}
function colorBarra() {
  const fondo = getComputedStyle(document.body).getPropertyValue("--fondo").trim() || "#F6F1EA";
  $("#color-tema").setAttribute("content", fondo);
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", colorBarra);

// ---------- Service worker ----------
function registrarSW() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Al pasar la medianoche o volver a la app, "hoy" cambia: se repinta cada minuto.
setInterval(() => { if (estado.yo && !document.hidden && !$("#hoja").open) render({ suave: true }); }, 60000);

iniciar();
