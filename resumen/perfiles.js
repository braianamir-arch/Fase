// Perfiles: cada uno con su propia bóveda cifrada con su propia contraseña, así nadie ve
// lo del otro. La lista solo guarda nombre y tipo (sin datos) para poder elegir perfil.
// La sesión del perfil abierto se recuerda en el teléfono (IndexedDB) con una clave AES no
// exportable: no hace falta poner la contraseña cada vez, solo al cambiar de perfil.
const CLAVE_LISTA = "todo-en-uno:perfiles";
export const PRINCIPAL = "principal";
export const TIPOS_PERFIL = { completo: "Todo en uno", finanzas: "Solo finanzas" };

export const claveBoveda = (id) => (id === PRINCIPAL ? "todo-en-uno:boveda" : `todo-en-uno:boveda:${id}`);
export const claveHuella = (id) => (id === PRINCIPAL ? "todo-en-uno:huella" : `todo-en-uno:huella:${id}`);

function leer(almacen) {
  try {
    const l = JSON.parse(almacen.getItem(CLAVE_LISTA));
    return Array.isArray(l) ? l : null;
  } catch {
    return null;
  }
}

// Perfiles existentes. Si solo existe la bóveda de antes (de cuando había un solo usuario),
// se la toma como el perfil principal.
export function listar(almacen = localStorage) {
  const l = leer(almacen);
  if (l?.length) return l.filter((p) => p && p.id && TIPOS_PERFIL[p.tipo]);
  return almacen.getItem(claveBoveda(PRINCIPAL)) ? [{ id: PRINCIPAL, nombre: "Principal", tipo: "completo" }] : [];
}

export function guardarLista(lista, almacen = localStorage) {
  almacen.setItem(CLAVE_LISTA, JSON.stringify(lista.map(({ id, nombre, tipo }) => ({ id, nombre, tipo }))));
}

export function agregar({ nombre, tipo }, almacen = localStorage) {
  const lista = listar(almacen);
  const limpio = String(nombre || "").trim().slice(0, 30);
  if (!limpio) throw new Error("Poné un nombre para el perfil");
  if (lista.some((p) => p.nombre.toLowerCase() === limpio.toLowerCase())) throw new Error("Ya hay un perfil con ese nombre");
  const id = lista.length ? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` : PRINCIPAL;
  const perfil = { id, nombre: limpio, tipo: TIPOS_PERFIL[tipo] ? tipo : "completo" };
  guardarLista([...lista, perfil], almacen);
  return perfil;
}

export function renombrar(id, nombre, almacen = localStorage) {
  const limpio = String(nombre || "").trim().slice(0, 30);
  if (!limpio) return;
  guardarLista(listar(almacen).map((p) => (p.id === id ? { ...p, nombre: limpio } : p)), almacen);
}

// Borra el perfil y todos sus datos de este teléfono.
export function eliminar(id, almacen = localStorage) {
  guardarLista(listar(almacen).filter((p) => p.id !== id), almacen);
  almacen.removeItem(claveBoveda(id));
  almacen.removeItem(claveHuella(id));
}

// ---- Sesión recordada ----
// Interfaz { leer(), guardar(perfilId, llave), borrar() }. La llave tiene una CryptoKey no
// exportable: IndexedDB la guarda tal cual y ningún script puede leer sus bytes.
export function sesionIndexedDB(idb = globalThis.indexedDB) {
  const abrirDB = () => new Promise((ok, mal) => {
    const r = idb.open("todo-en-uno", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("sesion");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
  const operar = async (modo, fn) => {
    const db = await abrirDB();
    try {
      return await new Promise((ok, mal) => {
        const tx = db.transaction("sesion", modo);
        const req = fn(tx.objectStore("sesion"));
        tx.oncomplete = () => ok(req?.result);
        tx.onerror = () => mal(tx.error);
      });
    } finally {
      db.close();
    }
  };
  return {
    leer: () => operar("readonly", (s) => s.get("actual")).catch(() => null),
    guardar: (perfilId, llave) => operar("readwrite", (s) => s.put({ perfilId, ...llave }, "actual")),
    borrar: () => operar("readwrite", (s) => s.delete("actual")).catch(() => {}),
  };
}

// Para pruebas o navegadores sin IndexedDB: la sesión vive solo mientras la página está abierta.
export function sesionEnMemoria() {
  let actual = null;
  return {
    leer: async () => actual,
    guardar: async (perfilId, llave) => { actual = { perfilId, ...llave }; },
    borrar: async () => { actual = null; },
  };
}
