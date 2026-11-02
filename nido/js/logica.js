// Lógica pura de NIDO (sin DOM ni red): fechas, turnos, tareas, pagos, gym.
// Todas las fechas son "YYYY-MM-DD" en la hora local del celular (Argentina), nunca UTC.

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const TOQUES = [
  { id: "te_extrano", emoji: "❤️", texto: "Te extraño" },
  { id: "que_haces", emoji: "👋", texto: "¿Qué hacés?" },
  { id: "llegaste", emoji: "🏠", texto: "¿Llegaste?" },
  { id: "comemos", emoji: "🍽️", texto: "¿Comemos?" },
  { id: "te_amo", emoji: "💋", texto: "Te amo" },
  { id: "mira_esto", emoji: "😂", texto: "Mirá esto" },
  { id: "salgo", emoji: "🚶", texto: "Ya salgo" },
  { id: "abrazo", emoji: "🫂", texto: "Abrazo" },
];
export const toque = (id) => TOQUES.find((t) => t.id === id) || { id, emoji: "💌", texto: "Toque" };

export const FRECUENCIAS = { once: "Una vez", daily: "Todos los días", weekly: "Cada semana", monthly: "Cada mes" };
export const ESTADOS_INV = ["verde", "amarillo", "rojo"];
export const SIGUIENTE_ESTADO = { verde: "amarillo", amarillo: "rojo", rojo: "verde" };

const dos = (n) => String(n).padStart(2, "0");

export function fechaISO(d = new Date()) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}
export const deISO = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d, 12);
};
export const sumarDias = (iso, n) => {
  const d = deISO(iso);
  d.setDate(d.getDate() + n);
  return fechaISO(d);
};
export const diferenciaDias = (desde, hasta) => Math.round((deISO(hasta) - deISO(desde)) / 86400000);
// 1 = lunes … 7 = domingo
export const diaSemana = (iso) => ((deISO(iso).getDay() + 6) % 7) + 1;
export const inicioSemana = (iso) => sumarDias(iso, 1 - diaSemana(iso));
export const semana = (iso) => Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana(iso), i));
export const mesISO = (iso) => iso.slice(0, 7);
export const diasDelMes = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m, 0).getDate();
};

export const hora = (t) => (t ? String(t).slice(0, 5) : "");
export const aMinutos = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};
export const deMinutos = (min) => `${dos(Math.floor(min / 60) % 24)}:${dos(min % 60)}`;
export const minutosAhora = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export function duracionTexto(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// Turno de una persona en un día: primero lo cargado para esa fecha, si no la plantilla
// que tenga ese día de la semana por defecto. null = no hay nada cargado.
export function turnoDelDia(userId, iso, shifts = [], plantillas = []) {
  const dia = shifts.find((s) => s.user_id === userId && s.date === iso);
  if (dia) {
    if (dia.off) return { off: true, fuente: "dia" };
    return { off: false, inicio: hora(dia.start_time), fin: hora(dia.end_time), lugar: dia.place || "", fuente: "dia" };
  }
  const ds = diaSemana(iso);
  const p = plantillas.find((t) => t.user_id === userId && (t.weekdays || []).includes(ds));
  if (p) return { off: false, inicio: hora(p.start_time), fin: hora(p.end_time), lugar: p.place || "", etiqueta: p.label, fuente: "plantilla" };
  return null;
}

// Intervalo de trabajo en minutos; si termina "antes" de empezar, cruza la medianoche.
function intervalo(turno) {
  if (!turno || turno.off) return null;
  const a = aMinutos(turno.inicio);
  let b = aMinutos(turno.fin);
  if (a == null || b == null) return null;
  if (b <= a) b += 1440;
  return [a, b];
}

// Qué está haciendo ahora: libre / antes de entrar / trabajando / ya salió.
export function estadoAhora(turno, ahora) {
  if (!turno) return { clave: "sin", texto: "Sin horario cargado" };
  if (turno.off) return { clave: "libre", texto: "Franco hoy" };
  const [a, b] = intervalo(turno);
  if (ahora < a) return { clave: "antes", texto: `Entra a las ${turno.inicio}`, falta: a - ahora };
  if (ahora < b) return { clave: "trabajando", texto: `Trabajando hasta las ${turno.fin}`, falta: b - ahora };
  return { clave: "salio", texto: `Salió a las ${turno.fin}` };
}

// Ratos libres de los dos al mismo tiempo, entre las 8 y la medianoche (de 30 min o más).
export function ratosJuntos(turnoA, turnoB, desde = 8 * 60, hasta = 24 * 60) {
  let libres = [[desde, hasta]];
  for (const t of [turnoA, turnoB]) {
    const iv = intervalo(t);
    if (!iv) continue;
    libres = libres.flatMap(([a, b]) => {
      const partes = [];
      if (iv[0] > a) partes.push([a, Math.min(b, iv[0])]);
      if (iv[1] < b) partes.push([Math.max(a, iv[1]), b]);
      return partes.filter(([x, y]) => y > x);
    });
  }
  return libres.filter(([a, b]) => b - a >= 30).map(([a, b]) => ({ desde: deMinutos(a), hasta: b >= 1440 ? "00:00" : deMinutos(b), minutos: b - a }));
}

export function textoJuntos(turnoA, turnoB) {
  if (!turnoA || !turnoB) return "";
  if (turnoA.off && turnoB.off) return "Hoy tienen franco los dos 🎉";
  const ratos = ratosJuntos(turnoA, turnoB);
  if (!ratos.length) return "Hoy casi no coinciden 😕";
  return ratos.map((r) => (r.hasta === "00:00" ? `desde las ${r.desde}` : `de ${r.desde} a ${r.hasta}`)).join(" y ");
}

// Tareas que se repiten: vuelven a aparecer cuando arranca el día/semana/mes siguiente.
export function estadoTarea(t, hoy) {
  const hecha = (() => {
    if (!t.last_done) return false;
    switch (t.frequency) {
      case "daily": return t.last_done === hoy;
      case "weekly": return t.last_done >= inicioSemana(hoy);
      case "monthly": return mesISO(t.last_done) === mesISO(hoy);
      default: return true;
    }
  })();
  const atrasada = !hecha && t.frequency === "once" && t.due_date && t.due_date < hoy;
  const paraHoy = !hecha && (t.frequency === "daily" || (t.due_date && t.due_date <= hoy));
  return { hecha, atrasada: Boolean(atrasada), paraHoy: Boolean(paraHoy) };
}

export function ordenarTareas(tareas, hoy) {
  const peso = (t) => {
    const e = estadoTarea(t, hoy);
    return e.hecha ? 3 : e.atrasada ? 0 : e.paraHoy ? 1 : 2;
  };
  return [...tareas].sort((a, b) => peso(a) - peso(b) || String(a.title).localeCompare(b.title, "es"));
}

// Pagos mensuales: vencimiento en este mes (si el día no existe, el último del mes).
export function estadoPago(b, hoy) {
  const mes = mesISO(hoy);
  const dia = Math.min(Number(b.due_day) || 1, diasDelMes(mes));
  const vence = `${mes}-${dos(dia)}`;
  const dias = diferenciaDias(hoy, vence);
  if (b.paid_month === mes) return { clave: "pagado", texto: "Pagado este mes", vence, dias };
  if (dias < 0) return { clave: "vencido", texto: dias === -1 ? "Venció ayer" : `Venció hace ${-dias} días`, vence, dias };
  if (dias === 0) return { clave: "hoy", texto: "Vence hoy", vence, dias };
  if (dias <= 5) return { clave: "pronto", texto: dias === 1 ? "Vence mañana" : `Vence en ${dias} días`, vence, dias };
  return { clave: "pendiente", texto: `Vence el ${dia}`, vence, dias };
}

export function ordenarPagos(bills, hoy) {
  const peso = { vencido: 0, hoy: 1, pronto: 2, pendiente: 3, pagado: 4 };
  return [...bills].sort((a, b) => {
    const ea = estadoPago(a, hoy);
    const eb = estadoPago(b, hoy);
    return peso[ea.clave] - peso[eb.clave] || ea.dias - eb.dias;
  });
}

export const totalPendiente = (bills, hoy) =>
  bills.filter((b) => estadoPago(b, hoy).clave !== "pagado").reduce((s, b) => s + (Number(b.amount) || 0), 0);

export const gymSemana = (sesiones, userId, hoy) => {
  const ini = inicioSemana(hoy);
  const fin = sumarDias(ini, 6);
  return sesiones.filter((s) => s.user_id === userId && s.date >= ini && s.date <= fin).length;
};

// Racha de semanas seguidas cumpliendo el objetivo (sin contar la actual si todavía no llegó).
export function rachaGym(sesiones, userId, objetivo, hoy) {
  if (!objetivo) return 0;
  let racha = 0;
  let ini = inicioSemana(hoy);
  if (gymSemana(sesiones, userId, hoy) >= objetivo) racha++;
  for (let i = 0; i < 52; i++) {
    ini = sumarDias(ini, -7);
    if (gymSemana(sesiones, userId, ini) >= objetivo) racha++;
    else break;
  }
  return racha;
}

export function agruparInventario(items) {
  const grupos = { rojo: [], amarillo: [], verde: [] };
  for (const i of items) (grupos[i.status] || grupos.verde).push(i);
  for (const k of Object.keys(grupos)) grupos[k].sort((a, b) => a.category.localeCompare(b.category, "es") || a.name.localeCompare(b.name, "es"));
  return grupos;
}

export function textoListaCompras(items) {
  const g = agruparInventario(items);
  const lineas = [];
  if (g.rojo.length) lineas.push("🔴 Se terminó:", ...g.rojo.map((i) => `• ${i.name}`));
  if (g.amarillo.length) lineas.push(...(lineas.length ? [""] : []), "🟡 Queda poco:", ...g.amarillo.map((i) => `• ${i.name}`));
  return lineas.length ? `🛒 Lista de NIDO\n${lineas.join("\n")}` : "";
}

export const categorias = (items) => [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

// Comidas de una semana indexadas por fecha y momento.
export function menuSemana(meals, iso) {
  const dias = semana(iso);
  return dias.map((d) => ({
    fecha: d,
    almuerzo: meals.find((m) => m.date === d && m.slot === "almuerzo") || null,
    cena: meals.find((m) => m.date === d && m.slot === "cena") || null,
  }));
}

export function diasJuntos(desde, hoy) {
  if (!desde) return null;
  const n = diferenciaDias(desde, hoy);
  return n >= 0 ? n : null;
}

export function saludo(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Buen día";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function haceCuanto(isoTs, ahora = new Date()) {
  const min = Math.round((ahora - new Date(isoTs)) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export const fmtPlata = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtFecha = (iso, opciones = { weekday: "long", day: "numeric", month: "long" }) => {
  const t = deISO(iso).toLocaleDateString("es-AR", opciones);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function cuandoTexto(iso, hoy) {
  const n = diferenciaDias(hoy, iso);
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  if (n === -1) return "Ayer";
  if (n > 1 && n < 7) return DIAS[diaSemana(iso) - 1];
  return fmtFecha(iso, { weekday: "short", day: "numeric", month: "short" });
}
