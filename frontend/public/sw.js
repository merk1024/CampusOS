const CACHE_PREFIX = 'campusos-shell-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX))
        .map((cacheName) => caches.delete(cacheName))
    );

    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});

self.addEventListener('fetch', () => {
  // Recovery worker: intentionally do nothing so requests go straight to the network.
});
