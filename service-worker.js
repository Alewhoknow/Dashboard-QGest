// Service worker: mette in cache solo la "shell" dell'app (HTML/CSS/JS/icone)
// così l'app si apre istantaneamente anche con rete lenta.
// Le chiamate ai dati (script.google.com) vanno SEMPRE in rete, mai in cache,
// altrimenti vedresti numeri vecchi.

const CACHE_NAME = 'qgest-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // mai cache per le chiamate dati (Apps Script / Google)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    return; // lascia passare la richiesta normale, senza intercettarla
  }

  // per tutto il resto (shell dell'app): cache-first, con aggiornamento in background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (event.request.method === 'GET' && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
