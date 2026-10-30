/* Public static offline shell only. Never cache listing HTML, account data or API responses. */
const CACHE_NAME = 'kipper-public-shell-v1';
const STATIC_PATHS = ['/offline.html', '/icons/kipper-192.png', '/icons/kipper-512.png', '/icons/kipper-180.png'];
const PUBLIC_NAVIGATION_PATHS = ['/', '/properties', '/properties/casa-pacifica', '/properties/casa-pacifica-san-diego'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const path of STATIC_PATHS) {
      const response = await fetch(new Request(path, { credentials: 'omit', cache: 'reload' }));
      if (!response.ok || response.redirected) throw new Error('Offline shell could not be installed');
      await cache.put(path, response);
    }
  })());
  // No skipWaiting: never force a worker update during an active checkout.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('kipper-public-shell-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // All mutations, API, admin, checkout, booking/access links, RSC requests,
  // token/query URLs and third-party payment resources remain network-only.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search || request.headers.get('RSC')) return;
  const isStaticShell = STATIC_PATHS.includes(url.pathname);
  const isPublicNavigation = request.mode === 'navigate' && PUBLIC_NAVIGATION_PATHS.includes(url.pathname);
  if (!isStaticShell && !isPublicNavigation) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    const fallback = await cache.match(isStaticShell ? url.pathname : '/offline.html');
    return fallback || Response.error();
  }));
});
