const CACHE_NAME = 'tj-codex-v1';

// File da cachare per funzionamento offline
const STATIC_ASSETS = [
  './tj_codex_v1beta.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: cacha i file statici
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Se alcune icone non esistono ancora, ignora l'errore
      });
    })
  );
  self.skipWaiting();
});

// Activate: pulisce cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first per Firebase, cache-first per asset statici
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase e API esterne — sempre network, mai cache
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis')
  ) {
    return; // lascia passare senza intercettare
  }

  // Asset statici — cache-first con fallback network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cacha solo risposte valide
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: restituisce l'HTML principale
        if (event.request.destination === 'document') {
          return caches.match('./tj_codex_v1beta.html');
        }
      });
    })
  );
});
