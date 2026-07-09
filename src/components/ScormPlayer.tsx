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
  isStreamableMedia,
  rewriteScormCssAssets,
  rewriteScormHtmlAssets,
} from '../utils/scormHtmlRewrite';
import { X, AlertCircle } from 'lucide-react';

interface ScormPlayerProps {
  courseId: string;
  courseTitle: string;
  filePath: string;
  fileName: string;
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

  const registration = await navigator.serviceWorker.register('/scorm-sw.js?v=3', { scope: '/' });

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
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
    bucket: 'course-files',
    pathMap: resolver.pathMap,
  };

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
        let body: BodyInit = await response.arrayBuffer();

        if (isHtml) {
          let text = new TextDecoder().decode(body as ArrayBuffer);
          if (text.includes('<head>')) {
            text = text.replace('<head>', '<head>' + SCORM_API_SHIM);
          } else if (text.includes('<head ')) {
            text = text.replace(/<head\s[^>]*>/, (m) => m + SCORM_API_SHIM);
          } else if (text.includes('<html>') || text.includes('<html ')) {
            text = text.replace(/<html[^>]*>/, (m) => m + '<head>' + SCORM_API_SHIM + '</head>');
          } else {
            text = '<head>' + SCORM_API_SHIM + '</head>' + text;
          }
          text = rewriteScormHtmlAssets(text, zipPath, storagePrefix, resolver);
          body = new Blob([text], { type: mimeType });
        } else if (isCss) {
          const text = rewriteScormCssAssets(new TextDecoder().decode(body as ArrayBuffer), zipPath, storagePrefix, resolver);
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

export function ScormPlayer({ courseId, courseTitle, filePath, fileName, onClose, onComplete }: ScormPlayerProps) {
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

        addDebug(`Caching ${fileNames.length} files for playback...`);
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
            let body: BodyInit;

            if (isHtml) {
              let text = await file.async('text');
              if (text.includes('<head>')) {
                text = text.replace('<head>', '<head>' + SCORM_API_SHIM);
              } else if (text.includes('<head ')) {
                text = text.replace(/<head\s[^>]*>/, (m) => m + SCORM_API_SHIM);
              } else if (text.includes('<html>') || text.includes('<html ')) {
                text = text.replace(/<html[^>]*>/, (m) => m + '<head>' + SCORM_API_SHIM + '</head>');
              } else {
                text = '<head>' + SCORM_API_SHIM + '</head>' + text;
              }
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

            cached++;
            if (mounted) {
              setProgress(`${cached}/${fileNames.length}`);
            }
          }));
        }

        addDebug(`Cached ${cached} files`);

        if (!mounted || !iframeRef.current) return;

        const launchUrl = `${basePath}/${launchHref}`;
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
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{courseTitle}</h2>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showDebug && (
          <div className="bg-gray-900 text-gray-100 p-4 max-h-48 overflow-y-auto font-mono text-xs">
            <div className="font-bold mb-2">Debug Log:</div>
            {debugInfo.map((info, i) => (
              <div key={i} className="mb-1">{info}</div>
            ))}
          </div>
        )}

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading SCORM content...</p>
                {progress && (
                  <p className="text-sm text-gray-500 mt-2">Preparing files: {progress}</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Content</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={courseTitle}
            allow="autoplay; fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
