// (Copia del cliente de NIDO.) Cliente mínimo de Supabase con fetch directo (sin supabase-js):
// login con email y contraseña, sesión que se renueva sola, REST y tiempo real.

const CLAVE_SESION = "sesion-nube";

export class ErrorNido extends Error {
  constructor(mensaje, { estado = 0, codigo = "" } = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

export function crearCliente({ url, clave, almacen = globalThis.localStorage, fetch: f = globalThis.fetch.bind(globalThis) }) {
  let sesion = leerSesion();
  let renovando = null;
  const alSalir = new Set();

  function leerSesion() {
    try {
      const s = JSON.parse(almacen?.getItem(CLAVE_SESION) || "null");
      return s?.refresh_token ? s : null;
    } catch {
      return null;
    }
  }
  function guardarSesion(s) {
    sesion = s;
    try {
      if (s) almacen?.setItem(CLAVE_SESION, JSON.stringify(s));
      else almacen?.removeItem(CLAVE_SESION);
    } catch { /* modo privado: la sesión dura lo que dure la pestaña */ }
  }
  function aSesion(r) {
    return {
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
      user: { id: r.user?.id, email: r.user?.email },
    };
  }

  async function llamar(ruta, opciones = {}) {
    let r;
    try {
      r = await f(`${url}${ruta}`, opciones);
    } catch {
      throw new ErrorNido("Sin conexión. Revisá internet y probá de nuevo.", { codigo: "red" });
    }
    const texto = await r.text();
    let cuerpo = null;
    try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }
    if (!r.ok) {
      const msg = cuerpo?.msg || cuerpo?.message || cuerpo?.error_description || cuerpo?.error || `Error ${r.status}`;
      throw new ErrorNido(traducir(msg, r.status), { estado: r.status, codigo: cuerpo?.code || cuerpo?.error_code || "" });
    }
    return cuerpo;
  }

  async function auth(tipo, cuerpo) {
    return llamar(`/auth/v1/token?grant_type=${tipo}`, {
      method: "POST",
      headers: { apikey: clave, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  }

  async function entrar(email, contrasena) {
    const r = await auth("password", { email: email.trim().toLowerCase(), password: contrasena });
    guardarSesion(aSesion(r));
    return sesion.user;
  }

  async function renovar() {
    if (!sesion) throw new ErrorNido("Tenés que iniciar sesión.", { estado: 401, codigo: "sin_sesion" });
    if (!renovando) {
      renovando = auth("refresh_token", { refresh_token: sesion.refresh_token })
        .then((r) => guardarSesion(aSesion(r)))
        .catch((err) => {
          if (err.estado === 400 || err.estado === 401) cerrarLocal();
          throw err;
        })
        .finally(() => { renovando = null; });
    }
    await renovando;
  }

  async function token() {
    if (!sesion) throw new ErrorNido("Tenés que iniciar sesión.", { estado: 401, codigo: "sin_sesion" });
    if (sesion.expires_at - Date.now() / 1000 < 90) await renovar();
    return sesion.access_token;
  }

  function cerrarLocal() {
    guardarSesion(null);
    for (const fn of alSalir) fn();
  }

  async function salir() {
    const t = sesion?.access_token;
    cerrarLocal();
    if (t) {
      try {
        await f(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: clave, Authorization: `Bearer ${t}` } });
      } catch { /* sin internet: igual se borró la sesión del celu */ }
    }
  }

  async function rest(ruta, { method = "GET", body, prefer } = {}, reintento = true) {
    const headers = { apikey: clave, Authorization: `Bearer ${await token()}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    try {
      return await llamar(`/rest/v1/${ruta}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (err) {
      if (err.estado === 401 && reintento) {
        await renovar();
        return rest(ruta, { method, body, prefer }, false);
      }
      throw err;
    }
  }

  const filtro = (f) => (typeof f === "number" || typeof f === "string" ? `id=eq.${encodeURIComponent(f)}` : f.consulta);

  return {
    get sesion() { return sesion; },
    get usuario() { return sesion?.user || null; },
    entrar,
    salir,
    token,
    alSalir: (fn) => alSalir.add(fn),
    leer: (tabla, consulta = "") => rest(`${tabla}?select=*${consulta ? `&${consulta}` : ""}`),
    insertar: (tabla, filas, { conflicto } = {}) =>
      rest(`${tabla}${conflicto ? `?on_conflict=${conflicto}` : ""}`, {
        method: "POST",
        body: filas,
        prefer: `return=representation${conflicto ? ",resolution=merge-duplicates" : ""}`,
      }),
    actualizar: (tabla, f, cambios) => rest(`${tabla}?${filtro(f)}`, { method: "PATCH", body: cambios, prefer: "return=representation" }),
    borrar: (tabla, f) => rest(`${tabla}?${filtro(f)}`, { method: "DELETE", prefer: "return=minimal" }),
    tiempoReal: (alCambiar, alEstado) => conectarTiempoReal({ url, clave, token, alCambiar, alEstado }),
  };
}

function traducir(msg, estado) {
  const m = String(msg).toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "La cuenta todavía no está confirmada en Supabase.";
  if (m.includes("row-level security") || estado === 403) return "Tu cuenta no tiene permiso para esto.";
  if (m.includes("refresh token")) return "La sesión venció. Volvé a entrar.";
  if (m.includes("could not find the table")) return "Falta crear la tabla de sincronización en Supabase (el SQL de bovedas).";
  if (estado === 429) return "Demasiados intentos. Esperá un minuto.";
  if (estado >= 500) return "Supabase no responde. Probá en un rato.";
  return msg;
}

// Tiempo real de Supabase (protocolo Phoenix sobre WebSocket). Avisa qué tabla cambió.
// Si se corta, reintenta con espera creciente; la app igual se actualiza sola cada tanto.
function conectarTiempoReal({ url, clave, token, alCambiar, alEstado = () => {} }) {
  if (typeof WebSocket === "undefined") return { cerrar() {} };
  const wsUrl = `${url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(clave)}&vsn=1.0.0`;
  let ws = null;
  let ref = 0;
  let latido = null;
  let reintento = null;
  let espera = 1000;
  let cerrado = false;
  let tokenActual = null;
  const topico = "realtime:todo-en-uno";

  const enviar = (event, payload, topic = topico) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref), join_ref: topic === topico ? "1" : undefined }));
  };

  async function abrir() {
    if (cerrado) return;
    try {
      tokenActual = await token();
    } catch {
      programar();
      return;
    }
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      espera = 1000;
      ref = 0;
      enviar("phx_join", {
        config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public" }] },
        access_token: tokenActual,
      });
      latido = setInterval(async () => {
        enviar("heartbeat", {}, "phoenix");
        try {
          const t = await token();
          if (t !== tokenActual) {
            tokenActual = t;
            enviar("access_token", { access_token: t });
          }
        } catch { /* se renueva en el próximo intento */ }
      }, 25000);
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.event === "phx_reply" && m.payload?.status === "ok" && m.ref === "1") alEstado(true);
      if (m.event === "phx_reply" && m.payload?.status === "error") alEstado(false);
      if (m.event === "postgres_changes") {
        const d = m.payload?.data || {};
        alCambiar({ tabla: d.table, tipo: d.type, fila: d.record || null, vieja: d.old_record || null });
      }
    };
    ws.onclose = () => {
      clearInterval(latido);
      alEstado(false);
      programar();
    };
    ws.onerror = () => ws?.close();
  }

  function programar() {
    if (cerrado) return;
    clearTimeout(reintento);
    reintento = setTimeout(abrir, espera);
    espera = Math.min(espera * 2, 60000);
  }

  abrir();
  return {
    cerrar() {
      cerrado = true;
      clearTimeout(reintento);
      clearInterval(latido);
      ws?.close();
    },
  };
}
