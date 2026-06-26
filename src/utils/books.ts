import JSZip from 'jszip';

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

export function isBooksFeatureEnabled(features?: Record<string, boolean> | null) {
  return Boolean(features?.books);
}

export function getBookFileUrl(filePath: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/book-files/${filePath}`;
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

export async function extractPdfsFromZip(file: File) {
  const zip = await JSZip.loadAsync(file);
  const pdfs: { name: string; blob: Blob }[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (path.includes('__MACOSX') || path.split('/').some((p) => p.startsWith('.'))) continue;
    if (!path.toLowerCase().endsWith('.pdf')) continue;

    const blob = await entry.async('blob');
    const filename = path.split('/').pop() || path;
    pdfs.push({ name: filename, blob });
  }

  pdfs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return pdfs;
}

export function sanitizeStorageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
