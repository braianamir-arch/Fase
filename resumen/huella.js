// Desbloqueo con huella (o cara) usando una passkey del teléfono con la extensión PRF de
// WebAuthn: la huella libera un secreto que solo existe en el teléfono; con ese secreto se
// cifra el PIN. Sin la huella el PIN guardado es ilegible; la bóveda sigue cifrada con el PIN.
const CLAVE = "todo-en-uno:huella";
const enc = new TextEncoder();
const dec = new TextDecoder();
const aB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const azar = (n) => crypto.getRandomValues(new Uint8Array(n));

export function disponible(win = globalThis) {
  return Boolean(win.PublicKeyCredential && win.navigator?.credentials && win.isSecureContext !== false);
}

export const activada = (almacen = localStorage) => Boolean(almacen.getItem(CLAVE));
export const desactivar = (almacen = localStorage) => almacen.removeItem(CLAVE);

async function claveDeSecreto(secreto) {
  const base = await crypto.subtle.importKey("raw", secreto, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("todo-en-uno"), info: enc.encode("huella-v1") },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

async function secretoPrf(cred, rpId, idCredencial, sal) {
  const a = await cred.get({
    publicKey: {
      challenge: azar(32), rpId, userVerification: "required", timeout: 60000,
      allowCredentials: [{ type: "public-key", id: idCredencial }],
      extensions: { prf: { eval: { first: sal } } },
    },
  });
  const r = a?.getClientExtensionResults?.().prf?.results?.first;
  if (!r) throw new Error("Este teléfono o navegador no permite usar la huella para proteger datos. Seguí con el PIN.");
  return r;
}

// Crea la passkey y guarda el PIN cifrado con el secreto que libera la huella.
export async function activar(pin, { cred = navigator.credentials, almacen = localStorage, rpId = location.hostname } = {}) {
  const c = await cred.create({
    publicKey: {
      rp: { name: "Todo en uno", id: rpId },
      user: { id: azar(16), name: "todo-en-uno", displayName: "Todo en uno" },
      challenge: azar(32),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000,
      extensions: { prf: {} },
    },
  });
  if (!c) throw new Error("No se creó la llave de huella");
  const sal = azar(32);
  const clave = await claveDeSecreto(await secretoPrf(cred, rpId, c.rawId, sal));
  const iv = azar(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clave, enc.encode(pin));
  almacen.setItem(CLAVE, JSON.stringify({ v: 1, id: aB64(c.rawId), sal: aB64(sal), iv: aB64(iv), ct: aB64(ct) }));
}

// Pide la huella y devuelve el PIN guardado.
export async function recuperarPin({ cred = navigator.credentials, almacen = localStorage, rpId = location.hostname } = {}) {
  const datos = JSON.parse(almacen.getItem(CLAVE) || "null");
  if (!datos) throw new Error("La huella no está activada");
  const clave = await claveDeSecreto(await secretoPrf(cred, rpId, deB64(datos.id), deB64(datos.sal)));
  try {
    return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(datos.iv) }, clave, deB64(datos.ct)));
  } catch {
    throw new Error("La huella no coincide con la guardada: entrá con el PIN y volvé a activarla");
  }
}
