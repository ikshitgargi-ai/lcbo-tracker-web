// Simple service worker: stale-while-revalidate for GET /api/* (cache API reads)
// + precache of the app shell.
//
// This is intentionally minimal (no build step needed). On upgrade, bump VERSION.

const VERSION = 'anu-lcbo-v1';
const APP_SHELL = [
  '/',
  '/sod',
  '/oos',
  '/opportunities',
  '/territories',
  '/goals',
  '/horeca',
  '/reports',
  '/reps',
  '/map',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache backend mutations, CORS preflights, or POST-ish endpoints.
  if (url.pathname.startsWith('/api/sod/sync') || url.pathname.includes('/refresh-')) return;

  // API GETs: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((r) => {
            if (r.ok) cache.put(req, r.clone());
            return r;
          })
          .catch(() => cached ?? new Response('{"offline":true}', { headers: { 'Content-Type': 'application/json' }, status: 503 }));
        return cached ?? network;
      }),
    );
    return;
  }

  // App navigations: cache-first with network fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req).then((cached) => cached ?? fetch(req).catch(() => caches.match('/'))),
    );
  }
});
