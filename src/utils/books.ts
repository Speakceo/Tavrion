import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import { getSupabaseUrl } from '../lib/supabaseEnv';

export interface BookCollection {
  id: string;
  title: string;
  description: string;
  zip_file_path: string | null;
  cover_hue: number;
  is_published: boolean;
  document_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookDocument {
  id: string;
  collection_id: string;
  title: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  sort_order: number;
  created_at: string;
}

export interface ZipPdfPreview {
  path: string;
  name: string;
  uncompressedSize: number;
  tooLarge: boolean;
}

import { isOrgFeatureEnabled } from './orgFeatures';

export function isBooksFeatureEnabled(features?: Record<string, boolean> | null) {
  return isOrgFeatureEnabled(features, 'books');
}

export function getBookFileUrl(filePath: string) {
  return `${getSupabaseUrl()}/storage/v1/object/public/book-files/${filePath}`;
}

export function humanizePdfName(filename: string) {
  const base = filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
  if (!base) return filename;
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function coverHueFromTitle(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function formatBookSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Supabase free plan global per-object limit (confirmed via project storage config). */
export const SUPABASE_PER_FILE_LIMIT_BYTES = 50 * 1024 * 1024;
const SAFE_PDF_LIMIT_BYTES = 48 * 1024 * 1024;

function isPdfZipPath(path: string) {
  if (!path.toLowerCase().endsWith('.pdf')) return false;
  if (path.includes('__MACOSX')) return false;
  if (path.split('/').some((p) => p.startsWith('.'))) return false;
  return true;
}

async function openZipReader(file: File) {
  return new ZipReader(new BlobReader(file));
}

export async function scanZipForPdfs(file: File): Promise<ZipPdfPreview[]> {
  const reader = await openZipReader(file);
  try {
    const entries = await reader.getEntries();
    return entries
      .filter((entry) => !entry.directory && isPdfZipPath(entry.filename))
      .map((entry) => ({
        path: entry.filename,
        name: entry.filename.split('/').pop() || entry.filename,
        uncompressedSize: entry.uncompressedSize,
        tooLarge: entry.uncompressedSize > SAFE_PDF_LIMIT_BYTES,
      }))
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  } finally {
    await reader.close();
  }
}

export async function forEachPdfInZip(
  file: File,
  onPdf: (pdf: { name: string; blob: Blob }, index: number, total: number) => Promise<void>,
  onStage?: (message: string) => void,
) {
  const reader = await openZipReader(file);
  try {
    const entries = await reader.getEntries();
    const pdfEntries = entries
      .filter((entry) => !entry.directory && isPdfZipPath(entry.filename))
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    if (pdfEntries.length === 0) {
      throw new Error('No PDF files found in this ZIP. Add .pdf files and try again.');
    }

    const oversized = pdfEntries.find((entry) => entry.uncompressedSize > SAFE_PDF_LIMIT_BYTES);
    if (oversized) {
      const name = oversized.filename.split('/').pop() || oversized.filename;
      throw new Error(
        `"${name}" is ${formatBookSize(oversized.uncompressedSize)}. Each PDF must be under 50 MB on the current Supabase plan.`,
      );
    }

    for (let i = 0; i < pdfEntries.length; i += 1) {
      const entry = pdfEntries[i];
      const name = entry.filename.split('/').pop() || entry.filename;
      onStage?.(`Extracting ${i + 1} of ${pdfEntries.length}: ${name}`);
      const blob = await entry.getData(new BlobWriter('application/pdf'));
      await onPdf({ name, blob }, i, pdfEntries.length);
    }
  } finally {
    await reader.close();
  }
}

export function sanitizeStorageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
