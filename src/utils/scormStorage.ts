import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import { supabase } from '../lib/supabase';
import { formatBookSize, SUPABASE_PER_FILE_LIMIT_BYTES } from './books';
import { uploadLargeFile } from './chunkedUpload';

const BUCKET = 'course-files';
const SAFE_FILE_LIMIT_BYTES = 48 * 1024 * 1024;
const EXTRACTED_UPLOAD_ZIP_THRESHOLD = 45 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 4;

export const EXTRACTED_SCORM_PREFIX = 'extracted/scorm';
export const SCORM_INDEX_FILE = '_scorm_index.json';

export interface ScormStorageFileEntry {
  zipPath: string;
  storagePath: string;
}

export interface ScormStorageIndex {
  version: 2;
  originalFileName: string;
  originalZipSize: number;
  manifestPath: string;
  launchFile: string;
  files: ScormStorageFileEntry[];
}

export interface ScormZipScan {
  fileCount: number;
  totalUncompressedSize: number;
  oversizedEntry: { path: string; size: number } | null;
}

export function isExtractedScormPath(path: string) {
  return path.startsWith(`${EXTRACTED_SCORM_PREFIX}/`);
}

export function getCourseFilePublicUrl(filePath: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const encodedPath = filePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return `${base}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

export function normalizeScormFileEntries(index: ScormStorageIndex | Record<string, unknown>): ScormStorageFileEntry[] {
  const files = (index as ScormStorageIndex).files;
  if (!Array.isArray(files) || files.length === 0) return [];

  if (typeof files[0] === 'object' && files[0] !== null && 'zipPath' in files[0]) {
    return files as ScormStorageFileEntry[];
  }

  return (files as string[]).map((zipPath) => ({
    zipPath: normalizeZipEntryPath(zipPath),
    storagePath: toStorageRelativePath(zipPath),
  }));
}

function sanitizeStoragePathSegment(segment: string) {
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

function toStorageRelativePath(zipRelativePath: string) {
  return normalizeZipEntryPath(zipRelativePath)
    .split('/')
    .map(sanitizeStoragePathSegment)
    .join('/');
}

export function zipPathToStoragePath(zipPath: string) {
  return toStorageRelativePath(zipPath);
}

export function resolveStorageRelativePath(index: ScormStorageIndex, zipPath: string) {
  const normalized = normalizeZipEntryPath(zipPath);
  const entry = normalizeScormFileEntries(index).find(
    (file) => file.zipPath === normalized || file.zipPath === zipPath,
  );
  if (entry && entry.storagePath && entry.storagePath !== entry.zipPath) {
    return entry.storagePath;
  }
  return toStorageRelativePath(normalized);
}

export interface ScormPlaybackResolver {
  entries: ScormStorageFileEntry[];
  pathMap: Record<string, string>;
  resolveStoragePath: (zipPath: string) => string;
}

export async function buildScormPlaybackResolver(
  index: ScormStorageIndex,
  storagePrefix: string,
): Promise<ScormPlaybackResolver> {
  const normalizedEntries = normalizeScormFileEntries(index).map((entry) => ({
    zipPath: normalizeZipEntryPath(entry.zipPath),
    storagePath: entry.storagePath && entry.storagePath !== entry.zipPath
      ? entry.storagePath
      : toStorageRelativePath(entry.zipPath),
  }));

  const pathMap = new Map<string, string>();
  const remember = (zipPath: string, storagePath: string) => {
    const normalizedZip = normalizeZipEntryPath(zipPath);
    pathMap.set(normalizedZip, storagePath);
    pathMap.set(encodeURI(normalizedZip), storagePath);
    try {
      pathMap.set(decodeURIComponent(normalizedZip), storagePath);
    } catch {
      // ignore malformed URI sequences
    }
  };

  for (const entry of normalizedEntries) {
    remember(entry.zipPath, entry.storagePath);
  }

  try {
    const storedFiles = await listStorageFiles(storagePrefix);
    for (const fullPath of storedFiles) {
      const storageRelative = fullPath.startsWith(`${storagePrefix}/`)
        ? fullPath.slice(storagePrefix.length + 1)
        : fullPath;
      if (!storageRelative || storageRelative === SCORM_INDEX_FILE) continue;

      for (const entry of normalizedEntries) {
        if (
          entry.storagePath === storageRelative
          || toStorageRelativePath(entry.zipPath) === storageRelative
        ) {
          remember(entry.zipPath, storageRelative);
        }
      }

      const storageBase = storageRelative.split('/').pop() || storageRelative;
      for (const entry of normalizedEntries) {
        const zipBase = entry.zipPath.split('/').pop() || entry.zipPath;
        if (
          zipBase === storageBase
          || sanitizeStoragePathSegment(zipBase) === storageBase
          || toStorageRelativePath(zipBase) === storageBase
        ) {
          remember(entry.zipPath, storageRelative);
        }
      }
    }
  } catch (error) {
    console.warn('[SCORM] Could not list storage files for playback resolver:', error);
  }

  const resolveStoragePath = (zipPath: string) => {
    const normalized = normalizeZipEntryPath(zipPath);
    return pathMap.get(normalized)
      || pathMap.get(encodeURI(normalized))
      || pathMap.get(zipPath)
      || toStorageRelativePath(normalized);
  };

  const entries = normalizedEntries.map((entry) => ({
    zipPath: entry.zipPath,
    storagePath: resolveStoragePath(entry.zipPath),
  }));

  return {
    entries,
    pathMap: Object.fromEntries(pathMap.entries()),
    resolveStoragePath,
  };
}

async function fetchStorageObject(storagePrefix: string, storageRelativePath: string) {
  const url = getCourseFilePublicUrl(`${storagePrefix}/${storageRelativePath}`);
  return fetch(url);
}

export async function fetchScormAsset(
  storagePrefix: string,
  zipPath: string,
  resolver: ScormPlaybackResolver,
) {
  const candidates = [
    resolver.resolveStoragePath(zipPath),
    toStorageRelativePath(zipPath),
    normalizeZipEntryPath(zipPath),
  ];

  const tried = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    const response = await fetchStorageObject(storagePrefix, candidate);
    if (response.ok) return response;
  }

  throw new Error(`Failed to fetch ${normalizeZipEntryPath(zipPath)}`);
}

function buildStoragePathMap(zipPaths: string[]) {
  const used = new Set<string>();
  const map = new Map<string, string>();

  for (const zipPath of zipPaths) {
    let candidate = toStorageRelativePath(zipPath);
    if (!candidate) candidate = 'file';

    if (used.has(candidate)) {
      const dot = candidate.lastIndexOf('.');
      const stem = dot > 0 ? candidate.slice(0, dot) : candidate;
      const ext = dot > 0 ? candidate.slice(dot) : '';
      let suffix = 2;
      while (used.has(`${stem}_${suffix}${ext}`)) suffix += 1;
      candidate = `${stem}_${suffix}${ext}`;
    }

    used.add(candidate);
    map.set(zipPath, candidate);
  }

  return map;
}

function shouldIncludeZipEntry(path: string) {
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('__MACOSX')) return false;
  if (normalized.split('/').some((segment) => segment.startsWith('.'))) return false;
  return true;
}

export function normalizeZipEntryPath(path: string) {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new Error(`Invalid path in SCORM package: ${path}`);
  }
  return normalized;
}

function guessContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    xml: 'application/xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
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
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    swf: 'application/x-shockwave-flash',
    zip: 'application/zip',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

async function openZipReader(file: File | Blob) {
  return new ZipReader(new BlobReader(file));
}

export function shouldExtractScormZip(file: File) {
  return file.size > EXTRACTED_UPLOAD_ZIP_THRESHOLD;
}

export async function scanScormZip(file: File): Promise<ScormZipScan> {
  const reader = await openZipReader(file);
  try {
    const entries = await reader.getEntries();
    const files = entries.filter((entry) => !entry.directory && shouldIncludeZipEntry(entry.filename));
    let oversizedEntry: ScormZipScan['oversizedEntry'] = null;

    for (const entry of files) {
      if (entry.uncompressedSize > SAFE_FILE_LIMIT_BYTES) {
        oversizedEntry = { path: entry.filename, size: entry.uncompressedSize };
        break;
      }
    }

    return {
      fileCount: files.length,
      totalUncompressedSize: files.reduce((sum, entry) => sum + entry.uncompressedSize, 0),
      oversizedEntry,
    };
  } finally {
    await reader.close();
  }
}

async function findManifestPath(reader: ZipReader<BlobReader>) {
  const entries = await reader.getEntries();
  const manifest = entries.find((entry) => !entry.directory && entry.filename.toLowerCase().endsWith('imsmanifest.xml'));
  if (!manifest) {
    throw new Error('imsmanifest.xml not found in SCORM package');
  }
  return normalizeZipEntryPath(manifest.filename);
}

async function readManifestLaunchFile(manifestBlob: Blob, manifestPath: string) {
  const manifestContent = await manifestBlob.text();
  const xmlDoc = new DOMParser().parseFromString(manifestContent, 'text/xml');
  const resource = xmlDoc.querySelector('resource[href]');
  const launchHref = resource?.getAttribute('href');
  if (!launchHref) {
    throw new Error('No launch page found in imsmanifest.xml');
  }

  const baseDir = manifestPath.includes('/')
    ? manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1)
    : '';
  return normalizeZipEntryPath(`${baseDir}${launchHref}`);
}

async function uploadEntry(
  storagePath: string,
  blob: Blob,
  fileName: string,
  onFileProgress?: (pct: number) => void,
) {
  const file = new File([blob], fileName, { type: guessContentType(fileName) });
  const result = await uploadLargeFile({
    bucket: BUCKET,
    path: storagePath,
    file,
    contentType: guessContentType(fileName),
    context: 'scorm',
    onProgress: onFileProgress,
  });

  if (!result.success) {
    throw new Error(result.error?.message || `Failed to upload ${fileName}`);
  }
}

export async function uploadScormZipExtracted(
  file: File,
  storagePrefix: string,
  onProgress?: (pct: number, message: string) => void,
): Promise<ScormStorageIndex> {
  const reader = await openZipReader(file);
  const uploadedPaths: string[] = [];

  try {
    const entries = await reader.getEntries();
    const fileEntries = entries
      .filter((entry) => !entry.directory && shouldIncludeZipEntry(entry.filename))
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    if (fileEntries.length === 0) {
      throw new Error('SCORM ZIP contains no usable files');
    }

    const oversized = fileEntries.find((entry) => entry.uncompressedSize > SAFE_FILE_LIMIT_BYTES);
    if (oversized) {
      const name = oversized.filename.split('/').pop() || oversized.filename;
      throw new Error(
        `"${name}" is ${formatBookSize(oversized.uncompressedSize)}. Each file inside a SCORM package must be under ${formatBookSize(SUPABASE_PER_FILE_LIMIT_BYTES)} on the current Supabase plan.`,
      );
    }

    const manifestPath = await findManifestPath(reader);
    const manifestEntry = fileEntries.find((entry) => normalizeZipEntryPath(entry.filename) === manifestPath);
    if (!manifestEntry) {
      throw new Error('Could not read imsmanifest.xml from SCORM package');
    }

    const manifestBlob = await manifestEntry.getData(new BlobWriter('application/xml'));
    const launchFile = await readManifestLaunchFile(manifestBlob, manifestPath);
    const zipPaths = fileEntries.map((entry) => normalizeZipEntryPath(entry.filename));
    const storagePathMap = buildStoragePathMap(zipPaths);
    const fileManifest: ScormStorageFileEntry[] = [];

    const uploadOne = async (entry: (typeof fileEntries)[number], index: number) => {
      const zipPath = normalizeZipEntryPath(entry.filename);
      const storageRelativePath = storagePathMap.get(zipPath) || toStorageRelativePath(zipPath);
      fileManifest[index] = { zipPath, storagePath: storageRelativePath };
      const storagePath = `${storagePrefix}/${storageRelativePath}`;
      const name = zipPath.split('/').pop() || zipPath;
      onProgress?.(
        Math.round((index / fileEntries.length) * 100),
        `Uploading ${index + 1} of ${fileEntries.length}: ${name}`,
      );

      const blob = await entry.getData(new BlobWriter(guessContentType(name)));
      await uploadEntry(storagePath, blob, name, (pct) => {
        const overall = Math.round(((index + pct / 100) / fileEntries.length) * 100);
        onProgress?.(overall, `Uploading ${index + 1} of ${fileEntries.length}: ${name} (${pct}%)`);
      });

      uploadedPaths.push(storagePath);
      onProgress?.(
        Math.round(((index + 1) / fileEntries.length) * 100),
        `Uploaded ${index + 1} of ${fileEntries.length}`,
      );
    };

    for (let i = 0; i < fileEntries.length; i += UPLOAD_CONCURRENCY) {
      const batch = fileEntries.slice(i, i + UPLOAD_CONCURRENCY);
      await Promise.all(batch.map((entry, batchIndex) => uploadOne(entry, i + batchIndex)));
    }

    const index: ScormStorageIndex = {
      version: 2,
      originalFileName: file.name,
      originalZipSize: file.size,
      manifestPath,
      launchFile,
      files: fileManifest.filter(Boolean).sort((a, b) => a.zipPath.localeCompare(b.zipPath, undefined, { numeric: true })),
    };

    const indexPath = `${storagePrefix}/${SCORM_INDEX_FILE}`;
    const indexBlob = new Blob([JSON.stringify(index)], { type: 'application/json' });
    await uploadEntry(indexPath, indexBlob, SCORM_INDEX_FILE);
    uploadedPaths.push(indexPath);

    onProgress?.(100, 'SCORM package uploaded');
    return index;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < uploadedPaths.length; i += batchSize) {
        const batch = uploadedPaths.slice(i, i + batchSize);
        await supabase.storage.from(BUCKET).remove(batch);
      }
    }
    throw error;
  } finally {
    await reader.close();
  }
}

export async function listStorageFiles(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const queue = [prefix.replace(/\/$/, '')];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(BUCKET).list(current, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) throw error;
      if (!data?.length) break;

      for (const item of data) {
        const fullPath = `${current}/${item.name}`;
        if (item.id) {
          paths.push(fullPath);
        } else {
          queue.push(fullPath);
        }
      }

      if (data.length < 100) break;
      offset += data.length;
    }
  }

  return paths;
}
