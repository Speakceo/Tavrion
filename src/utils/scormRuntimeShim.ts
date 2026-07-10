export function buildScormRuntimeShim(
  storagePrefix: string,
  pathMap: Record<string, string>,
  supabaseUrl: string,
) {
  const publicRoot = `${supabaseUrl}/storage/v1/object/public/course-files/`;

  return `<script data-tavrion-scorm-shim>
(function() {
  var PATH_MAP = ${JSON.stringify(pathMap)};
  var STORAGE_PREFIX = ${JSON.stringify(storagePrefix)};
  var PUBLIC_ROOT = ${JSON.stringify(publicRoot)};

  function encodePath(path) {
    return path.split('/').map(function(segment) { return encodeURIComponent(segment); }).join('/');
  }

  function normalizeZipPath(path) {
    return String(path || '').replace(/\\\\/g, '/').replace(/^\\/+/, '').split('?')[0].split('#')[0];
  }

  function toPublicUrl(storageRelative) {
    return PUBLIC_ROOT + encodePath(STORAGE_PREFIX + '/' + storageRelative);
  }

  function lookup(path) {
    if (!path) return null;
    if (PATH_MAP[path]) return PATH_MAP[path];
    try {
      var decoded = decodeURIComponent(path);
      if (PATH_MAP[decoded]) return PATH_MAP[decoded];
    } catch (error) {}
    return null;
  }

  function absolutize(url) {
    if (!url) return null;
    if (url.indexOf(PUBLIC_ROOT) === 0) return null;
    if (/^https?:\\/\\//i.test(url) || url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) {
      return null;
    }

    var pageDir = location.pathname.replace(/\\/[^/]*$/, '');
    if (url.charAt(0) === '/') {
      return normalizeZipPath(url.slice(1));
    }

    try {
      var parsed = new URL(url, location.origin + pageDir + '/');
      var marker = '/scorm-content/';
      var idx = parsed.pathname.indexOf(marker);
      if (idx === -1) return normalizeZipPath(url);
      var tail = parsed.pathname.slice(idx + marker.length);
      var slash = tail.indexOf('/');
      if (slash === -1) return normalizeZipPath(url);
      return normalizeZipPath(decodeURIComponent(tail.slice(slash + 1)));
    } catch (error) {
      return normalizeZipPath(url);
    }
  }

  function resolveZipPath(url) {
    var zipPath = absolutize(url);
    if (!zipPath) return url;

    var basename = zipPath.split('/').pop() || zipPath;
    var candidates = [
      zipPath,
      basename,
      'assets/' + basename,
      'scormcontent/assets/' + basename,
    ];

    if (zipPath.indexOf('scormcontent/') !== 0) candidates.push('scormcontent/' + zipPath);
    if (zipPath.indexOf('scormcontent/') === 0) candidates.push(zipPath.slice('scormcontent/'.length));

    for (var i = 0; i < candidates.length; i++) {
      var mapped = lookup(candidates[i]);
      if (mapped) return toPublicUrl(mapped);
    }

    return url;
  }

  function maybeRewrite(input) {
    if (typeof input === 'string') return resolveZipPath(input);
    if (input && typeof input.url === 'string') return new Request(resolveZipPath(input.url), input);
    return input;
  }

  var originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(input, init) {
      return originalFetch.call(this, maybeRewrite(input), init);
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') args[1] = resolveZipPath(url);
    return originalOpen.apply(this, args);
  };

  function patchSrc(proto) {
    var descriptor = Object.getOwnPropertyDescriptor(proto, 'src');
    if (!descriptor || !descriptor.set) return;
    Object.defineProperty(proto, 'src', {
      get: descriptor.get,
      set: function(value) { return descriptor.set.call(this, resolveZipPath(value)); },
      configurable: true,
    });
  }

  if (typeof HTMLMediaElement !== 'undefined') {
    patchSrc(HTMLMediaElement.prototype);
  }
  if (typeof HTMLSourceElement !== 'undefined') {
    patchSrc(HTMLSourceElement.prototype);
  }

  var originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if ((name === 'src' || name === 'poster' || name === 'data') && typeof value === 'string') {
      value = resolveZipPath(value);
    }
    return originalSetAttribute.call(this, name, value);
  };
})();
</script>`;
}

export const SCORM_SESSION_CONFIG_FILE = '__tavrion_session.json';

export function buildScormCacheRuntimeShim(sessionId: string) {
  const cacheRoot = `/scorm-content/${sessionId}/`;

  return `<script data-tavrion-scorm-shim>
(function() {
  var CACHE_ROOT = ${JSON.stringify(cacheRoot)};

  function encodePath(path) {
    return path.split('/').map(function(segment) { return encodeURIComponent(segment); }).join('/');
  }

  function normalizeZipPath(path) {
    return String(path || '').replace(/\\\\/g, '/').replace(/^\\/+/, '').split('?')[0].split('#')[0];
  }

  function absolutize(url) {
    if (!url || /^https?:\\/\\//i.test(url) || url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) {
      return null;
    }

    var pageDir = location.pathname.replace(/\\/[^/]*$/, '');
    if (url.charAt(0) === '/') {
      return normalizeZipPath(url.slice(1));
    }

    try {
      var parsed = new URL(url, location.origin + pageDir + '/');
      var marker = '/scorm-content/';
      var idx = parsed.pathname.indexOf(marker);
      if (idx === -1) return normalizeZipPath(url);
      var tail = parsed.pathname.slice(idx + marker.length);
      var slash = tail.indexOf('/');
      if (slash === -1) return normalizeZipPath(url);
      return normalizeZipPath(decodeURIComponent(tail.slice(slash + 1)));
    } catch (error) {
      return normalizeZipPath(url);
    }
  }

  function resolveZipPath(url) {
    var zipPath = absolutize(url);
    if (!zipPath) return url;
    return CACHE_ROOT + encodePath(zipPath);
  }

  function maybeRewrite(input) {
    if (typeof input === 'string') return resolveZipPath(input);
    if (input && typeof input.url === 'string') return new Request(resolveZipPath(input.url), input);
    return input;
  }

  var originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(input, init) {
      return originalFetch.call(this, maybeRewrite(input), init);
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') args[1] = resolveZipPath(url);
    return originalOpen.apply(this, args);
  };

  function patchSrc(proto) {
    var descriptor = Object.getOwnPropertyDescriptor(proto, 'src');
    if (!descriptor || !descriptor.set) return;
    Object.defineProperty(proto, 'src', {
      get: descriptor.get,
      set: function(value) { return descriptor.set.call(this, resolveZipPath(value)); },
      configurable: true,
    });
  }

  if (typeof HTMLMediaElement !== 'undefined') {
    patchSrc(HTMLMediaElement.prototype);
  }
  if (typeof HTMLSourceElement !== 'undefined') {
    patchSrc(HTMLSourceElement.prototype);
  }

  var originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if ((name === 'src' || name === 'poster' || name === 'data') && typeof value === 'string') {
      value = resolveZipPath(value);
    }
    return originalSetAttribute.call(this, name, value);
  };
})();
</script>`;
}
