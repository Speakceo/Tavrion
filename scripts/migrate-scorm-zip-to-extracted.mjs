/**
 * One-off migration: extract legacy SCORM ZIPs in storage into per-file extracted layout.
 * Usage: node scripts/migrate-scorm-zip-to-extracted.mjs [courseId]
 */
import { createClient } from '@supabase/supabase-js';
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const BUCKET = 'course-files';
const EXTRACTED_PREFIX = 'extracted/scorm';
const SCORM_INDEX_FILE = '_scorm_index.json';
const SAFE_FILE_LIMIT_BYTES = 48 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 4;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function sanitizeStoragePathSegment(segment) {
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

function normalizeZipEntryPath(entryPath) {
  const normalized = entryPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) throw new Error(`Invalid path: ${entryPath}`);
  return normalized;
}

function toStorageRelativePath(zipRelativePath) {
  return normalizeZipEntryPath(zipRelativePath)
    .split('/')
    .map(sanitizeStoragePathSegment)
    .join('/');
}

function guessContentType(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap = {
    html: 'text/html', htm: 'text/html', js: 'application/javascript', css: 'text/css',
    json: 'application/json', xml: 'application/xml', png: 'image/png', jpg: 'image/jpeg',
    jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4',
    webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', mp3: 'audio/mpeg',
    m4a: 'audio/mp4', ogg: 'audio/ogg', woff: 'font/woff', woff2: 'font/woff2',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function shouldIncludeZipEntry(entryPath) {
  const normalized = entryPath.replace(/\\/g, '/');
  if (normalized.includes('__MACOSX')) return false;
  if (normalized.split('/').some((segment) => segment.startsWith('.'))) return false;
  return true;
}

function buildStoragePathMap(zipPaths) {
  const used = new Set();
  const map = new Map();
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

async function readManifestLaunchFile(manifestBlob, manifestPath) {
  const manifestContent = await manifestBlob.text();
  const match = manifestContent.match(/<resource[^>]*\shref=["']([^"']+)["']/i);
  const launchHref = match?.[1];
  if (!launchHref) throw new Error('No launch page found in imsmanifest.xml');
  const baseDir = manifestPath.includes('/')
    ? manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1)
    : '';
  return normalizeZipEntryPath(`${baseDir}${launchHref}`);
}

async function uploadBlob(storagePath, blob, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
}

async function migrateCourse(course) {
  console.log(`\nMigrating: ${course.title} (${course.id})`);
  console.log(`  From: ${course.file_path}`);

  const { data: zipBlob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(course.file_path);
  if (downloadError) throw downloadError;

  const reader = new ZipReader(new BlobReader(zipBlob));
  const uploadedPaths = [];

  try {
    const entries = await reader.getEntries();
    const fileEntries = entries
      .filter((entry) => !entry.directory && shouldIncludeZipEntry(entry.filename))
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    const oversized = fileEntries.find((entry) => entry.uncompressedSize > SAFE_FILE_LIMIT_BYTES);
    if (oversized) {
      throw new Error(`Oversized entry: ${oversized.filename} (${oversized.uncompressedSize} bytes)`);
    }

    const manifestEntry = fileEntries.find((entry) =>
      normalizeZipEntryPath(entry.filename).toLowerCase().endsWith('imsmanifest.xml'),
    );
    if (!manifestEntry) throw new Error('imsmanifest.xml not found');

    const manifestPath = normalizeZipEntryPath(manifestEntry.filename);
    const manifestBlob = await manifestEntry.getData(new BlobWriter('application/xml'));
    const launchFile = await readManifestLaunchFile(manifestBlob, manifestPath);

    const zipPaths = fileEntries.map((entry) => normalizeZipEntryPath(entry.filename));
    const storagePathMap = buildStoragePathMap(zipPaths);
    const timestamp = Date.now();
    const stem = path.basename(course.file_path, path.extname(course.file_path)).replace(/^\d+_/, '');
    const storagePrefix = `${EXTRACTED_PREFIX}/${timestamp}_${stem}`;
    const fileManifest = [];

    const uploadOne = async (entry, index) => {
      const zipPath = normalizeZipEntryPath(entry.filename);
      const storageRelativePath = storagePathMap.get(zipPath) || toStorageRelativePath(zipPath);
      fileManifest[index] = { zipPath, storagePath: storageRelativePath };
      const storagePath = `${storagePrefix}/${storageRelativePath}`;
      const name = zipPath.split('/').pop() || zipPath;
      const blob = await entry.getData(new BlobWriter(guessContentType(name)));
      await uploadBlob(storagePath, blob, guessContentType(name));
      uploadedPaths.push(storagePath);
      if ((index + 1) % 10 === 0 || index + 1 === fileEntries.length) {
        console.log(`  Uploaded ${index + 1}/${fileEntries.length}`);
      }
    };

    for (let i = 0; i < fileEntries.length; i += UPLOAD_CONCURRENCY) {
      const batch = fileEntries.slice(i, i + UPLOAD_CONCURRENCY);
      await Promise.all(batch.map((entry, batchIndex) => uploadOne(entry, i + batchIndex)));
    }

    const index = {
      version: 2,
      originalFileName: course.file_name,
      originalZipSize: zipBlob.size,
      manifestPath,
      launchFile,
      files: fileManifest.filter(Boolean).sort((a, b) => a.zipPath.localeCompare(b.zipPath, undefined, { numeric: true })),
    };

    const indexPath = `${storagePrefix}/${SCORM_INDEX_FILE}`;
    await uploadBlob(indexPath, new Blob([JSON.stringify(index)], { type: 'application/json' }), 'application/json');
    uploadedPaths.push(indexPath);

    const { error: updateError } = await supabase
      .from('uploaded_courses')
      .update({
        file_path: storagePrefix,
        file_type: 'scorm',
      })
      .eq('id', course.id);
    if (updateError) throw updateError;

    const { error: removeError } = await supabase.storage.from(BUCKET).remove([course.file_path]);
    if (removeError) {
      console.warn(`  Warning: could not delete old zip: ${removeError.message}`);
    }

    console.log(`  Done -> ${storagePrefix}`);
    return storagePrefix;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      console.log(`  Rolling back ${uploadedPaths.length} uploaded files...`);
      for (let i = 0; i < uploadedPaths.length; i += 100) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths.slice(i, i + 100));
      }
    }
    throw error;
  } finally {
    await reader.close();
  }
}

async function main() {
  const courseId = process.argv[2];
  let query = supabase
    .from('uploaded_courses')
    .select('id,title,file_path,file_name,file_type')
    .eq('file_type', 'zip');

  if (courseId) query = query.eq('id', courseId);

  const { data: courses, error } = await query;
  if (error) throw error;
  if (!courses?.length) {
    console.log('No legacy zip SCORM courses found.');
    return;
  }

  for (const course of courses) {
    if (!course.file_path.endsWith('.zip')) {
      console.log(`Skipping ${course.title}: not a zip path`);
      continue;
    }
    await migrateCourse(course);
  }

  console.log('\nMigration complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
