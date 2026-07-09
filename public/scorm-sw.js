const CACHE_PREFIX = 'scorm-content-';
const sessions = new Map();
const MEDIA_EXT = /\.(mp4|webm|mov|m4v|m4a|mp3|wav|ogg|oga|aac|avi)(\?|#|$)/i;

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

function isStreamableMedia(path) {
  return MEDIA_EXT.test(path);
}

function buildRemoteUrl(session, zipPath) {
  const storageRelative = resolveStoragePath(session, zipPath);
  return `${session.supabaseUrl}/storage/v1/object/public/${session.bucket}/${encodeStoragePath(`${session.storagePrefix}/${storageRelative}`)}`;
}

async function fetchRemoteAsset(session, zipPath, request) {
  const remoteUrl = buildRemoteUrl(session, zipPath);
  const headers = new Headers();
  const range = request.headers.get('Range');
  if (range) headers.set('Range', range);
  return fetch(remoteUrl, { headers });
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
    const session = sessions.get(sessionId);
    const streamable = isStreamableMedia(zipPath);

    if (session?.supabaseUrl && session?.storagePrefix && streamable) {
      const remote = await fetchRemoteAsset(session, zipPath, event.request);
      if (remote.ok || remote.status === 206) {
        return remote;
      }
    }

    const cacheName = CACHE_PREFIX + sessionId;
    const cache = await caches.open(cacheName);
    const cached = await cache.match(event.request);
    if (cached) {
      if (streamable && event.request.headers.get('Range')) {
        const remote = session ? await fetchRemoteAsset(session, zipPath, event.request) : null;
        if (remote && (remote.ok || remote.status === 206)) return remote;
      }
      return cached;
    }

    if (session?.supabaseUrl && session?.storagePrefix) {
      const remote = await fetchRemoteAsset(session, zipPath, event.request);
      if (remote.ok || remote.status === 206) {
        if (!streamable) {
          await cache.put(event.request, remote.clone());
        }
        return remote;
      }
    }

    return new Response('Not Found', { status: 404, statusText: 'Not Found' });
  })());
});
