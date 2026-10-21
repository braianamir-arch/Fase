// Service worker: guarda solo los archivos de la app para que abra sin conexión.
// Nunca guarda respuestas de APIs (datos personales).
const VERSION = "todo-en-uno-v7";
const ARCHIVOS = [
  "./", "index.html", "styles.css", "app.js", "core.js", "seguridad.js", "manifest.webmanifest",
  "icono-192.png", "icono-512.png",
  "conectores/texto.js", "conectores/gmail.js", "conectores/google.js",
  "conectores/mercadopago.js", "conectores/cotizaciones.js", "conectores/extracto.js",
  "conectores/instagram.js", "conectores/youtube.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Red primero (para recibir actualizaciones), caché si no hay conexión.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request)),
  );
});
