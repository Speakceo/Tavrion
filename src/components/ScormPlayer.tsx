import { useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import {
  buildScormPlaybackResolver,
  fetchScormAsset,
  getCourseFilePublicUrl,
  isExtractedScormPath,
  normalizeZipEntryPath,
  SCORM_INDEX_FILE,
  type ScormPlaybackResolver,
  type ScormStorageIndex,
} from '../utils/scormStorage';
import {
  assetPathToPublicUrl,
  isStreamableMedia,
  rewriteScormCssAssets,
  rewriteScormHtmlAssets,
  rewriteScormHtmlAssetsForSession,
  rewriteScormJsAssets,
  rewriteScormJsAssetsForSession,
} from '../utils/scormHtmlRewrite';
import { buildScormCacheRuntimeShim, buildScormRuntimeShim, SCORM_SESSION_CONFIG_FILE } from '../utils/scormRuntimeShim';
import { getSupabaseUrl } from '../lib/supabaseEnv';
import { X, AlertCircle, Maximize2 } from 'lucide-react';

interface ScormPlayerProps {
  courseId: string;
  courseTitle: string;
  filePath: string;
  /** @deprecated Not shown in the player UI — use subtitle instead */
  fileName?: string;
  subtitle?: string;
  /** Enables the debug toggle in the player header (panel stays closed until clicked). */
  showDebug?: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const SCORM_API_SHIM = `
<script>
(function() {
  if (window.API && window.API._isShim) return;
  if (window.API_1484_11 && window.API_1484_11._isShim) return;

  var _data = {};
  var _initialized = false;

  function postToParent(type, detail) {
    try {
      window.parent.postMessage({ type: 'scorm-event', event: type, detail: detail }, '*');
    } catch(e) {}
    try {
      window.top.postMessage({ type: 'scorm-event', event: type, detail: detail }, '*');
    } catch(e) {}
  }

  var api12 = {
    _isShim: true,
    LMSInitialize: function() {
      _initialized = true;
      _data['cmi.core.lesson_status'] = 'not attempted';
      _data['cmi.core.lesson_location'] = '';
      _data['cmi.core.score.raw'] = '';
      _data['cmi.suspend_data'] = '';
      _data['cmi.core.student_name'] = 'Learner';
      _data['cmi.core.student_id'] = '1';
      postToParent('LMSInitialize', {});
      return "true";
    },
    LMSFinish: function() {
      _initialized = false;
      postToParent('LMSFinish', { data: _data });
      return "true";
    },
    LMSGetValue: function(key) {
      var val = _data[key] || '';
      return val;
    },
    LMSSetValue: function(key, value) {
      _data[key] = value;
      postToParent('LMSSetValue', { key: key, value: value });
      if (key === 'cmi.core.lesson_status' && (value === 'completed' || value === 'passed')) {
        postToParent('LMSComplete', {});
      }
      return "true";
    },
    LMSCommit: function() {
      postToParent('LMSCommit', { data: _data });
      return "true";
    },
    LMSGetLastError: function() { return "0"; },
    LMSGetErrorString: function(code) { return "No Error"; },
    LMSGetDiagnostic: function(code) { return ""; }
  };

  var api2004 = {
    _isShim: true,
    Initialize: function() { return api12.LMSInitialize(); },
    Terminate: function() { return api12.LMSFinish(); },
    GetValue: function(key) { return api12.LMSGetValue(key); },
    SetValue: function(key, value) { return api12.LMSSetValue(key, value); },
    Commit: function() { return api12.LMSCommit(); },
    GetLastError: function() { return "0"; },
    GetErrorString: function(code) { return "No Error"; },
    GetDiagnostic: function(code) { return ""; }
  };

  window.API = api12;
  window.API_1484_11 = api2004;
})();
</script>
`;

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    xml: 'application/xml',
    png: 'image/png',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    aac: 'audio/aac',
    wav: 'audio/wav',
    pdf: 'application/pdf',
    xsd: 'application/xml',
    dtd: 'application/xml-dtd',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    swf: 'application/x-shockwave-flash',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

async function registerScormServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers not supported in this browser');
  }

  const registration = await navigator.serviceWorker.register('/scorm-sw.js?v=6', { scope: '/' });

  if (registration.active) return registration;

  return new Promise((resolve, reject) => {
    const worker = registration.installing || registration.waiting;
    if (!worker) {
      reject(new Error('Service worker failed to install'));
      return;
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve(registration);
      if (worker.state === 'redundant') reject(new Error('Service worker became redundant'));
    });
    setTimeout(() => reject(new Error('Service worker activation timeout')), 10000);
  });
}

function isRequiredScormAsset(zipPath: string) {
  return /\.(html?|js|css|xml|json)$/i.test(zipPath) || /imsmanifest\.xml$/i.test(zipPath);
}

async function registerScormSession(
  sessionId: string,
  storagePrefix: string,
  resolver: ScormPlaybackResolver,
) {
  const payload = {
    type: 'SCORM_SESSION',
    sessionId,
    storagePrefix,
    supabaseUrl: getSupabaseUrl(),
    bucket: 'course-files',
    pathMap: resolver.pathMap,
  };

  const cache = await caches.open(`scorm-content-${sessionId}`);
  await cache.put(
    `${location.origin}/scorm-content/${sessionId}/${SCORM_SESSION_CONFIG_FILE}`,
    new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }),
  );

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(payload);
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage(payload);
}

async function cacheStorageFiles(
  sessionId: string,
  storagePrefix: string,
  resolver: ScormPlaybackResolver,
  onProgress?: (current: number, total: number) => void,
  mounted?: () => boolean,
  onDebug?: (message: string) => void,
) {
  const runtimeShim = buildScormRuntimeShim(
    storagePrefix,
    resolver.pathMap,
    getSupabaseUrl(),
  );
  const cache = await caches.open(`scorm-content-${sessionId}`);
  const basePath = `/scorm-content/${sessionId}`;
  let cached = 0;
  const failures: string[] = [];

  for (let i = 0; i < resolver.entries.length; i += 10) {
    if (mounted && !mounted()) return { launchBasePath: basePath, cached, failures };
    const batch = resolver.entries.slice(i, i + 10);
    await Promise.all(batch.map(async ({ zipPath, storagePath }) => {
      try {
        if (isStreamableMedia(zipPath)) {
          onDebug?.(`Skipping cache for streamable media: ${zipPath} (direct storage URL in HTML / SW stream)`);
          return;
        }

        const response = await fetchScormAsset(storagePrefix, zipPath, resolver);
        const mimeType = getMimeType(zipPath);
        const isHtml = /\.html?$/i.test(zipPath);
        const isCss = /\.css$/i.test(zipPath);
        const isJs = /\.js$/i.test(zipPath);
        let body: BodyInit = await response.arrayBuffer();

        if (isHtml) {
          let text = new TextDecoder().decode(body as ArrayBuffer);
          if (text.includes('<head>')) {
            text = text.replace('<head>', '<head>' + runtimeShim + SCORM_API_SHIM);
          } else if (text.includes('<head ')) {
            text = text.replace(/<head\s[^>]*>/, (m) => m + runtimeShim + SCORM_API_SHIM);
          } else if (text.includes('<html>') || text.includes('<html ')) {
            text = text.replace(/<html[^>]*>/, (m) => m + '<head>' + runtimeShim + SCORM_API_SHIM + '</head>');
          } else {
            text = runtimeShim + SCORM_API_SHIM + text;
          }
          text = rewriteScormHtmlAssets(text, zipPath, storagePrefix, resolver);
          body = new Blob([text], { type: mimeType });
        } else if (isCss) {
          const text = rewriteScormCssAssets(new TextDecoder().decode(body as ArrayBuffer), zipPath, storagePrefix, resolver);
          body = new Blob([text], { type: mimeType });
        } else if (isJs) {
          const text = rewriteScormJsAssets(new TextDecoder().decode(body as ArrayBuffer), zipPath, storagePrefix, resolver);
          body = new Blob([text], { type: mimeType });
        } else {
          body = new Blob([body], { type: mimeType });
        }

        const responseToCache = new Response(body, { headers: { 'Content-Type': mimeType } });
        const cacheUrls = [
          `${location.origin}${basePath}/${zipPath}`,
          `${location.origin}${basePath}/${encodeURI(zipPath)}`,
        ];
        for (const cacheUrl of cacheUrls) {
          await cache.put(cacheUrl, responseToCache.clone());
        }
        cached += 1;
        onProgress?.(cached, resolver.entries.length);
        onDebug?.(`Cached ${zipPath} as ${storagePath}`);
      } catch (error: any) {
        const message = error?.message || `Failed to cache ${zipPath}`;
        failures.push(message);
        onDebug?.(message);
        if (isRequiredScormAsset(zipPath)) {
          throw error;
        }
      }
    }));
  }

  return { launchBasePath: basePath, cached, failures };
}

export function ScormPlayer({
  courseId,
  courseTitle,
  filePath,
  subtitle = 'Interactive course',
  showDebug: showDebugProp,
  onClose,
  onComplete,
}: ScormPlayerProps) {
  const debugAllowed = showDebugProp ?? import.meta.env.DEV;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [progress, setProgress] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  const addDebug = (message: string) => {
    console.log(`[SCORM] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        addDebug('Starting SCORM initialization...');
        const sessionId = `${courseId}-${Date.now()}`;
        sessionIdRef.current = sessionId;

        addDebug('Registering service worker...');
        await registerScormServiceWorker();
        addDebug('Service worker ready');

        if (isExtractedScormPath(filePath)) {
          addDebug('Loading extracted SCORM package from storage...');
          const indexUrl = getCourseFilePublicUrl(`${filePath}/${SCORM_INDEX_FILE}`);
          const indexResponse = await fetch(indexUrl);
          if (!indexResponse.ok) {
            throw new Error('SCORM index file not found for this course');
          }
          const index = await indexResponse.json() as ScormStorageIndex;
          const resolver = await buildScormPlaybackResolver(index, filePath);
          addDebug(`Indexed ${resolver.entries.length} files from extracted package`);
          await registerScormSession(sessionId, filePath, resolver);

          const { launchBasePath, cached, failures } = await cacheStorageFiles(
            sessionId,
            filePath,
            resolver,
            (current, total) => {
              if (mounted) setProgress(`${current}/${total}`);
            },
            () => mounted,
            addDebug,
          );
          addDebug(`Cached ${cached} extracted files`);
          if (failures.length > 0) {
            addDebug(`Skipped ${failures.length} optional assets; service worker will retry on demand`);
          }

          if (!mounted || !iframeRef.current) return;
          const launchUrl = `${launchBasePath}/${normalizeZipEntryPath(index.launchFile)}`;
          addDebug(`Launching: ${launchUrl}`);
          iframeRef.current.src = launchUrl;
          iframeRef.current.onload = () => {
            addDebug('Iframe loaded');
            setLoading(false);
            addDebug('SCORM content ready');
          };
          iframeRef.current.onerror = (e) => {
            addDebug('Iframe error: ' + e);
            setError('Failed to load SCORM content');
            setLoading(false);
          };
          return;
        }

        const { data: urlData, error: urlError } = await supabase.storage
          .from('course-files')
          .createSignedUrl(filePath, 3600);

        if (urlError || !urlData) {
          throw new Error(`Failed to get download URL: ${urlError?.message}`);
        }

        addDebug('Downloading SCORM package...');
        const response = await fetch(urlData.signedUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        addDebug(`Downloaded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

        const zip = new JSZip();
        const zipContent = await zip.loadAsync(arrayBuffer);
        const fileNames = Object.keys(zipContent.files).filter(n => !zipContent.files[n].dir);
        addDebug(`ZIP extracted: ${fileNames.length} files`);

        let manifestFile = zipContent.files['imsmanifest.xml'];
        if (!manifestFile) {
          const manifestKey = fileNames.find(k => k.toLowerCase().endsWith('imsmanifest.xml'));
          if (manifestKey) manifestFile = zipContent.files[manifestKey];
        }
        if (!manifestFile) throw new Error('imsmanifest.xml not found');

        const manifestContent = await manifestFile.async('text');
        addDebug('Manifest loaded');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(manifestContent, 'text/xml');

        let scormVersion: '1.2' | '2004' = '1.2';
        const schemaVersion = xmlDoc.querySelector('schemaversion')?.textContent?.trim();
        if (schemaVersion && (schemaVersion.startsWith('2004') || schemaVersion.startsWith('CAM'))) {
          scormVersion = '2004';
        }
        addDebug(`SCORM version: ${scormVersion}`);

        const resource = xmlDoc.querySelector('resource[href]');
        if (!resource) throw new Error('No launch page found in manifest');
        const launchHref = resource.getAttribute('href') || '';
        addDebug(`Launch page: ${launchHref}`);

        if (!mounted) return;

        const cacheShim = buildScormCacheRuntimeShim(sessionId);
        addDebug(`Caching ${fileNames.length} files for legacy ZIP playback...`);
        const cache = await caches.open(`scorm-content-${sessionId}`);
        const basePath = `/scorm-content/${sessionId}`;
        let cached = 0;
        const batchSize = 10;

        for (let i = 0; i < fileNames.length; i += batchSize) {
          if (!mounted) return;
          const batch = fileNames.slice(i, i + batchSize);
          await Promise.all(batch.map(async (name) => {
            const file = zipContent.files[name];
            const mimeType = getMimeType(name);
            const isHtml = /\.html?$/i.test(name);
            const isCss = /\.css$/i.test(name);
            const isJs = /\.js$/i.test(name);
            let body: BodyInit;

            if (isHtml) {
              let text = await file.async('text');
              if (text.includes('<head>')) {
                text = text.replace('<head>', '<head>' + cacheShim + SCORM_API_SHIM);
              } else if (text.includes('<head ')) {
                text = text.replace(/<head\s[^>]*>/, (m) => m + cacheShim + SCORM_API_SHIM);
              } else if (text.includes('<html>') || text.includes('<html ')) {
                text = text.replace(/<html[^>]*>/, (m) => m + '<head>' + cacheShim + SCORM_API_SHIM + '</head>');
              } else {
                text = cacheShim + SCORM_API_SHIM + text;
              }
              text = rewriteScormHtmlAssetsForSession(text, name, sessionId);
              body = new Blob([text], { type: mimeType });
            } else if (isCss) {
              const text = await file.async('text');
              body = new Blob([text], { type: mimeType });
            } else if (isJs) {
              let text = await file.async('text');
              text = rewriteScormJsAssetsForSession(text, sessionId, fileNames);
              body = new Blob([text], { type: mimeType });
            } else {
              const raw = await file.async('arraybuffer');
              body = new Blob([raw], { type: mimeType });
            }

            const cacheUrl = `${location.origin}${basePath}/${name}`;
            const cacheResponse = new Response(body, {
              headers: { 'Content-Type': mimeType },
            });
            await cache.put(cacheUrl, cacheResponse);
            if (name !== encodeURI(name)) {
              await cache.put(`${location.origin}${basePath}/${encodeURI(name)}`, cacheResponse.clone());
            }

            cached++;
            if (mounted) {
              setProgress(`${cached}/${fileNames.length}`);
            }
          }));
        }

        addDebug(`Cached ${cached} files`);

        if (!mounted || !iframeRef.current) return;

        const launchUrl = `${basePath}/${normalizeZipEntryPath(launchHref)}`;
        addDebug(`Launching: ${launchUrl}`);

        iframeRef.current.src = launchUrl;

        iframeRef.current.onload = () => {
          addDebug('Iframe loaded');
          setLoading(false);
          addDebug('SCORM content ready');
        };

        iframeRef.current.onerror = (e) => {
          addDebug('Iframe error: ' + e);
          setError('Failed to load SCORM content');
          setLoading(false);
        };

      } catch (err: any) {
        console.error('[SCORM] Error:', err);
        addDebug('Error: ' + err.message);
        if (mounted) {
          setError(err.message || 'Failed to load SCORM content');
          setLoading(false);
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'scorm-event') {
        const { event: scormEvent, detail } = event.data;
        addDebug(`API: ${scormEvent} ${detail?.key ? `${detail.key} = ${detail.value}` : ''}`);
        if (scormEvent === 'LMSComplete') {
          onComplete?.();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    init();

    return () => {
      mounted = false;
      window.removeEventListener('message', handleMessage);

      if (sessionIdRef.current) {
        const sid = sessionIdRef.current;
        caches.delete(`scorm-content-${sid}`).catch(() => {});
        navigator.serviceWorker?.controller?.postMessage({
          type: 'SCORM_CLEANUP',
          sessionId: sid,
        });
      }
    };
  }, [courseId, filePath, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div
        className="flex h-full w-full max-h-[94vh] max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-5"
          style={{ borderColor: '#ebebeb', background: '#fafafa' }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-lg">
              {courseTitle}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
              <span>{subtitle}</span>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Maximize2 className="h-3 w-3" />
                Use fullscreen for the best experience
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {debugAllowed && (
              <button
                type="button"
                onClick={() => setShowDebug(!showDebug)}
                className="hidden rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 sm:block"
              >
                {showDebug ? 'Hide debug' : 'Debug'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
              aria-label="Close course"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showDebug && (
          <div className="max-h-40 shrink-0 overflow-y-auto bg-gray-900 p-3 font-mono text-xs text-gray-100">
            <div className="mb-2 font-bold">Debug log</div>
            {debugInfo.map((info, i) => (
              <div key={i} className="mb-1">{info}</div>
            ))}
          </div>
        )}

        <div className="relative min-h-0 flex-1 bg-white">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="w-full max-w-sm px-6 text-center">
                <div
                  className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"
                  role="status"
                  aria-label="Loading"
                />
                <p className="text-sm font-semibold text-gray-900">Preparing your course</p>
                <p className="mt-1 text-xs text-gray-500">This may take a moment on first launch</p>
                {progress && (
                  <>
                    <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all duration-300"
                        style={{
                          width: progress.includes('/')
                            ? `${Math.min(100, (parseInt(progress.split('/')[0], 10) / parseInt(progress.split('/')[1], 10)) * 100)}%`
                            : '30%',
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">{progress} files ready</p>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white px-6">
              <div className="max-w-md text-center">
                <AlertCircle className="mx-auto mb-4 h-11 w-11 text-red-500" />
                <h3 className="mb-2 text-base font-semibold text-gray-900">Couldn&apos;t load this course</h3>
                <p className="mb-5 text-sm text-gray-600">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Go back
                </button>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            className="h-full w-full border-0"
            title={courseTitle}
            allow="autoplay; fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
