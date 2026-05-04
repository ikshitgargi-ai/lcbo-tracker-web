// Service worker: NETWORK-FIRST for page navigations (so new code always wins),
// stale-while-revalidate for /api/* GETs (snappy data).
//
// On upgrade: bump VERSION to invalidate ALL old caches and force fresh HTML.

const VERSION = 'anu-lcbo-v3-rep-and-search-fix';

self.addEventListener('install', (e) => {
  // Take over immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Drop ALL old caches (any name not matching current VERSION)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      // Take control of any open tabs immediately
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept backend mutations or refresh endpoints
  if (url.pathname.startsWith('/api/sod/sync') || url.pathname.includes('/refresh-')) return;

  // API GETs: stale-while-revalidate (snappy + fresh in background)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((r) => {
            if (r.ok) cache.put(req, r.clone());
            return r;
          })
          .catch(
            () =>
              cached ??
              new Response('{"offline":true}', {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }),
          );
        return cached ?? network;
      }),
    );
    return;
  }

  // Page navigations: NETWORK-FIRST (was cache-first — that's what kept users
  // on stale builds). On network failure, fall back to cache.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          // Update cache with the fresh response in the background
          if (r.ok) {
            caches.open(VERSION).then((cache) => cache.put(req, r.clone()));
          }
          return r;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/')),
        ),
    );
  }
});
