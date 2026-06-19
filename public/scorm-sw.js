const CACHE_PREFIX = 'scorm-content-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SCORM_CLEANUP') {
    const cacheName = CACHE_PREFIX + event.data.sessionId;
    await caches.delete(cacheName);
    event.source.postMessage({ type: 'SCORM_CLEANUP_DONE', sessionId: event.data.sessionId });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.pathname.startsWith('/scorm-content/')) return;

  event.respondWith(
    (async () => {
      const parts = url.pathname.split('/');
      const sessionId = parts[2];
      const cacheName = CACHE_PREFIX + sessionId;
      const cache = await caches.open(cacheName);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      return new Response('Not Found', { status: 404, statusText: 'Not Found' });
    })()
  );
});
