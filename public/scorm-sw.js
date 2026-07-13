const CACHE_PREFIX = 'scorm-content-';
const SESSION_CONFIG_FILE = '__tavrion_session.json';
const sessions = new Map();
const MEDIA_EXT = /\.(mp4|webm|mov|m4v|m4a|mp3|wav|ogg|oga|aac|avi)(\?|#|$)/i;

/**
 * Supabase Storage serves HTML/XML/SVG as text/plain + CSP sandbox by design.
 * That makes Articulate Rise (and similar) show raw source in the iframe.
 * Always normalize Content-Type when serving through this worker.
 */
const MIME_BY_EXT = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  xsd: 'application/xml; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
};

function guessMime(path) {
  const clean = String(path || '').split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXT[ext] || null;
}

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
  const basename = normalized.split('/').pop() || normalized;
  const candidates = [
    normalized,
    encodeURI(normalized),
    basename,
    `assets/${basename}`,
    `scormcontent/assets/${basename}`,
  ];

  if (!normalized.startsWith('scormcontent/')) candidates.push(`scormcontent/${normalized}`);
  if (normalized.startsWith('scormcontent/')) candidates.push(normalized.slice('scormcontent/'.length));

  for (const candidate of candidates) {
    if (map[candidate]) return map[candidate];
    try {
      const decoded = decodeURIComponent(candidate);
      if (map[decoded]) return map[decoded];
    } catch {
      // ignore malformed URI sequences
    }
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

async function withCorrectMime(response, zipPath) {
  const mime = guessMime(zipPath);
  if (!mime || !response || !(response.ok || response.status === 206)) {
    return response;
  }

  const current = (response.headers.get('Content-Type') || '').toLowerCase();
  const alreadyOk =
    (mime.startsWith('text/html') && current.includes('text/html')) ||
    (mime.startsWith('application/javascript') && (current.includes('javascript') || current.includes('ecmascript'))) ||
    (mime.startsWith('text/css') && current.includes('text/css')) ||
    (mime.startsWith('application/json') && current.includes('json')) ||
    (mime.startsWith('application/xml') && current.includes('xml')) ||
    (mime.startsWith('image/') && current.startsWith('image/')) ||
    (mime.startsWith('font/') && current.includes('font')) ||
    (mime.startsWith('video/') && current.startsWith('video/')) ||
    (mime.startsWith('audio/') && current.startsWith('audio/'));

  // Always strip Supabase's sandbox CSP for document/script assets even if MIME looks fine.
  const needsCspStrip = /text\/html|javascript|text\/css|application\/xml|image\/svg/i.test(mime);
  if (alreadyOk && !needsCspStrip) return response;
  if (alreadyOk && !response.headers.get('Content-Security-Policy')) return response;

  const headers = new Headers(response.headers);
  headers.set('Content-Type', mime);
  headers.delete('Content-Security-Policy');
  headers.delete('X-Content-Type-Options');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveCachedWithRange(cached, request, zipPath) {
  const range = request.headers.get('Range');
  if (!range) return withCorrectMime(cached, zipPath);

  const blob = await cached.blob();
  const size = blob.size;
  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) return withCorrectMime(cached, zipPath);

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : size - 1;
  if (start >= size || end >= size) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${size}` },
    });
  }

  const sliced = blob.slice(start, end + 1);
  const mime = guessMime(zipPath) || cached.headers.get('Content-Type') || 'application/octet-stream';
  return new Response(sliced, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': mime,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
    },
  });
}

async function fetchRemoteAsset(session, zipPath, request) {
  const remoteUrl = buildRemoteUrl(session, zipPath);
  const headers = new Headers();
  const range = request.headers.get('Range');
  if (range) headers.set('Range', range);
  const remote = await fetch(remoteUrl, { headers });
  return withCorrectMime(remote, zipPath);
}

async function loadSession(sessionId, cache, origin) {
  if (sessions.has(sessionId)) return sessions.get(sessionId);

  const configUrl = `${origin}/scorm-content/${sessionId}/${SESSION_CONFIG_FILE}`;
  const cachedConfig = await cache.match(configUrl);
  if (!cachedConfig) return null;

  const session = await cachedConfig.json();
  sessions.set(sessionId, session);
  return session;
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
    const session = await loadSession(sessionId, cache, url.origin);
    const streamable = isStreamableMedia(zipPath);

    if (session?.supabaseUrl && session?.storagePrefix && streamable) {
      const remote = await fetchRemoteAsset(session, zipPath, event.request);
      if (remote.ok || remote.status === 206) {
        return remote;
      }
    }

    const cached = await cache.match(event.request);
    if (cached) {
      if (streamable && event.request.headers.get('Range')) {
        return serveCachedWithRange(cached, event.request, zipPath);
      }
      return withCorrectMime(cached, zipPath);
    }

    // Also try cache without query string / alternate encodings
    const altCached =
      (await cache.match(`${url.origin}/scorm-content/${sessionId}/${zipPath}`)) ||
      (await cache.match(`${url.origin}/scorm-content/${sessionId}/${encodeURI(zipPath)}`));
    if (altCached) {
      return withCorrectMime(altCached, zipPath);
    }

    if (session?.supabaseUrl && session?.storagePrefix) {
      const remote = await fetchRemoteAsset(session, zipPath, event.request);
      if (remote.ok || remote.status === 206) {
        if (!streamable) {
          // Store the MIME-corrected response so later hits stay playable.
          await cache.put(event.request, remote.clone());
        }
        return remote;
      }
    }

    return new Response('Not Found', { status: 404, statusText: 'Not Found' });
  })());
});
