// Sincronización entre dispositivos: mezcla de tres vías (lo último sincronizado, lo de este
// dispositivo y lo de la nube). Lo que cambió de un solo lado se toma de ese lado; lo borrado
// en un lado se borra; si cambió lo mismo en los dos, gana este dispositivo.
// Los datos viajan cifrados con la contraseña del perfil: la nube nunca los ve en claro.

export function igual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => igual(x, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && igual(a[k], b[k]));
}

const esObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const todosConId = (arr) => arr.every((x) => esObj(x) && x.id != null);

// base, local o remoto en undefined = "no existe de ese lado".
export function fusionar3(base, local, remoto) {
  if (igual(local, remoto)) return local;
  if (igual(base, local)) return remoto;
  if (igual(base, remoto)) return local;
  if (Array.isArray(local) && Array.isArray(remoto) && todosConId(local) && todosConId(remoto)) {
    const b = new Map((Array.isArray(base) ? base : []).filter((x) => esObj(x) && x.id != null).map((x) => [x.id, x]));
    const l = new Map(local.map((x) => [x.id, x]));
    const r = new Map(remoto.map((x) => [x.id, x]));
    const out = [];
    for (const id of new Set([...l.keys(), ...r.keys()])) {
      const v = fusionar3(b.get(id), l.get(id), r.get(id));
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  if (esObj(local) && esObj(remoto)) {
    const bo = esObj(base) ? base : {};
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remoto)])) {
      const v = fusionar3(bo[k], local[k], remoto[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local === undefined ? remoto : local;
}

// Lo que se sube: todo menos lo propio de este dispositivo (la sesión de la nube).
export function sincronizables({ entradas = [], config = {}, finanzas = null }) {
  const { syncDispositivo, ...resto } = config;
  return { entradas, config: resto, finanzas };
}

export function sinContenido(d) {
  const f = d.finanzas || {};
  return !(d.entradas?.length || f.gastos?.length || f.compras?.length || f.tarjetas?.length || f.ingresos?.length || f.sueldo?.monto);
}

export function nombreDispositivo(ua = globalThis.navigator?.userAgent || "") {
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && globalThis.navigator?.maxTouchPoints > 1)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Celular Android" : "Tablet Android";
  return "Computadora";
}
