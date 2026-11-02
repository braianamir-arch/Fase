// Service worker de NIDO: guarda solo los archivos de la app para que abra sin internet.
// Nunca guarda datos de Supabase.
const VERSION = "nido-v2";
const ARCHIVOS = [
  "./", "index.html", "estilos.css", "manifest.webmanifest",
  "js/app.js", "js/config.js", "js/logica.js", "js/supabase.js", "js/ui.js",
  "iconos/icono-192.png", "iconos/icono-512.png", "iconos/apple-touch-icon.png", "iconos/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("nido-") && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Red primero (así llegan las actualizaciones), caché si no hay conexión.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
