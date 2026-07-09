const CACHE_PREFIX = 'scorm-content-';
const sessions = new Map();

function sanitizeSegment(segment) {
  const normalized = segment
    .normalize('NFKC')
    .replace(/[\u00A0\u202F\u2007\uFEFF\u200B-\u200D\u2060]/g, ' ')
    .trim();
  const cleaned = normalized
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'file';
}

function sanitizePath(path) {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map(sanitizeSegment)
    .join('/');
}

function encodeStoragePath(path) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function resolveStoragePath(session, zipPath) {
  const normalized = zipPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const map = session.pathMap || {};
  if (map[normalized]) return map[normalized];
  if (map[encodeURI(normalized)]) return map[encodeURI(normalized)];
  try {
    if (map[decodeURIComponent(normalized)]) return map[decodeURIComponent(normalized)];
  } catch {
    // ignore malformed URI sequences
  }
  return sanitizePath(normalized);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCORM_SESSION') {
    sessions.set(event.data.sessionId, event.data);
    return;
  }

  if (event.data.type === 'SCORM_CLEANUP') {
    const cacheName = CACHE_PREFIX + event.data.sessionId;
    sessions.delete(event.data.sessionId);
    await caches.delete(cacheName);
    if (event.source) {
      event.source.postMessage({ type: 'SCORM_CLEANUP_DONE', sessionId: event.data.sessionId });
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/scorm-content/')) return;

  event.respondWith((async () => {
    const parts = url.pathname.split('/');
    const sessionId = parts[2];
    const zipPath = decodeURIComponent(parts.slice(3).join('/'));
    const cacheName = CACHE_PREFIX + sessionId;
    const cache = await caches.open(cacheName);

    const cached = await cache.match(event.request);
    if (cached) return cached;

    const session = sessions.get(sessionId);
    if (session?.supabaseUrl && session?.storagePrefix) {
      const storageRelative = resolveStoragePath(session, zipPath);
      const remoteUrl = `${session.supabaseUrl}/storage/v1/object/public/${session.bucket}/${encodeStoragePath(`${session.storagePrefix}/${storageRelative}`)}`;
      const remote = await fetch(remoteUrl);
      if (remote.ok) {
        await cache.put(event.request, remote.clone());
        return remote;
      }
    }

    return new Response('Not Found', { status: 404, statusText: 'Not Found' });
  })());
});
