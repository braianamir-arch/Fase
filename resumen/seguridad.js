// Bóveda cifrada: todos los datos (entradas, tokens, configuración) se guardan cifrados
// con AES-GCM 256 usando una clave derivada del PIN con PBKDF2-SHA256.
// Sin el PIN los datos guardados en el dispositivo o en una copia son ilegibles.

const ITERACIONES = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const aB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const PIN_MINIMO = 6;

export function validarPin(pin) {
  if (typeof pin !== "string" || pin.length < PIN_MINIMO) return `El PIN debe tener al menos ${PIN_MINIMO} caracteres`;
  if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) return "Elegí un PIN menos obvio";
  return null;
}

async function derivar(pin, sal, iteraciones) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: iteraciones, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

// Una "llave" abierta: clave en memoria + su sal, para volver a cifrar sin pedir el PIN.
export async function crearLlave(pin) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return { clave: await derivar(pin, sal, ITERACIONES), sal: aB64(sal), iteraciones: ITERACIONES };
}

export async function cifrar(llave, datos) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, llave.clave, enc.encode(JSON.stringify(datos)));
  return { tipo: "todo-en-uno-cifrado", v: 1, sal: llave.sal, iteraciones: llave.iteraciones, iv: aB64(iv), datos: aB64(ct) };
}

export function esBoveda(x) {
  return x && x.tipo === "todo-en-uno-cifrado" && x.v === 1 && typeof x.datos === "string";
}

// Abre una bóveda con el PIN. Devuelve { llave, datos }; tira error si el PIN es incorrecto.
export async function abrir(pin, boveda) {
  if (!esBoveda(boveda)) throw new Error("Formato de datos cifrados desconocido");
  const llave = { clave: await derivar(pin, deB64(boveda.sal), boveda.iteraciones), sal: boveda.sal, iteraciones: boveda.iteraciones };
  try {
    const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(boveda.iv) }, llave.clave, deB64(boveda.datos));
    return { llave, datos: JSON.parse(dec.decode(claro)) };
  } catch {
    throw new Error("PIN incorrecto");
  }
}

// Espera creciente después de varios intentos fallidos (en ms).
export function esperaPorIntentos(fallidos) {
  return fallidos < 3 ? 0 : Math.min(5 * 60000, 1000 * 2 ** (fallidos - 3));
}
