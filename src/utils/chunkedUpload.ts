import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const TUS_THRESHOLD_BYTES = 6 * 1024 * 1024;

/** Prefer direct storage hostname for resumable uploads (Supabase recommendation). */
function getTusEndpoint() {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match?.[1]) {
    return `https://${match[1]}.storage.supabase.co/storage/v1/upload/resumable`;
  }
  return `${supabaseUrl}/storage/v1/upload/resumable`;
}

type UploadContext = 'course' | 'scorm' | 'book' | 'generic';

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: number) => void;
  contentType?: string;
  context?: UploadContext;
}

function isFileSizeError(msg: string) {
  return (
    msg.includes('413') ||
    /payload too large/i.test(msg) ||
    /object exceeded the maximum allowed size/i.test(msg) ||
    /file size.*limit/i.test(msg) ||
    /entity too large/i.test(msg)
  );
}

function formatUploadError(error: unknown, context: UploadContext = 'generic'): string {
  const raw = error as { message?: string; originalResponse?: { getBody?: () => unknown } };
  let msg = raw?.message || String(error);

  // TUS sometimes nests the real response body in the message
  if (msg.startsWith('tus: ')) {
    msg = msg.slice(5);
  }

  if (isFileSizeError(msg)) {
    if (context === 'scorm') {
      return `Upload blocked: Supabase allows max 50 MB per stored file on the current plan. Large SCORM ZIPs are extracted and uploaded file-by-file automatically — if you still see this, one asset inside the package exceeds 50 MB.`;
    }
    if (context === 'book') {
      return `Upload blocked: Supabase allows max 50 MB per file on the current plan. Books uploads extract PDFs from the ZIP individually — each PDF must be under 50 MB. Upgrade Supabase to Pro for larger single-file uploads.`;
    }
    if (context === 'course') {
      return `Upload blocked: Supabase allows max 50 MB per file on the current plan. For SCORM packages, use a ZIP — we extract and upload contents individually. For other formats, compress or split the file, or upgrade Supabase to Pro.`;
    }
    return `Upload blocked: Supabase allows max 50 MB per file on the current plan. Upgrade Supabase to Pro for larger single-file uploads. (${msg})`;
  }
  if (/mime|invalid file type|not allowed/i.test(msg)) {
    return `Upload rejected by storage: ${msg}`;
  }
  if (/unauthorized|401|403|jwt|apikey|invalid key/i.test(msg)) {
    if (context === 'scorm' && /invalid key/i.test(msg)) {
      return `Upload rejected: storage path contains unsupported characters. Retrying with sanitized file names — please upload again after refreshing. (${msg})`;
    }
    return `Upload authentication failed. Please refresh the page and try again. (${msg})`;
  }
  if (/timeout|network|failed to fetch|retry/i.test(msg)) {
    return `Upload interrupted: ${msg}. Keep this tab open and try again — resumable upload will continue where it left off.`;
  }
  return msg || 'Upload failed for an unknown reason';
}

function guessContentType(file: File, override?: string) {
  if (override) return override;
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

async function uploadWithTus(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
  contentType?: string,
  context: UploadContext = 'generic',
): Promise<{ success: boolean; data?: { path: string }; error?: { message: string } }> {
  return new Promise((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint: getTusEndpoint(),
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: guessContentType(file, contentType),
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      onError(error) {
        console.error('TUS upload failed:', error);
        resolve({ success: false, error: { message: formatUploadError(error, context) } });
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (bytesTotal > 0) {
          onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess() {
        resolve({ success: true, data: { path } });
      },
    });

    upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length) {
          upload.resumeFromPreviousUpload(previous[0]);
        }
        upload.start();
      })
      .catch(() => upload.start());
  });
}

export async function uploadLargeFile({
  bucket,
  path,
  file,
  onProgress,
  contentType,
  context = 'generic',
}: UploadOptions): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    console.log(`Uploading ${sizeMb} MB to ${bucket}/${path} via ${file.size >= TUS_THRESHOLD_BYTES ? 'TUS' : 'standard'}`);

    if (file.size >= TUS_THRESHOLD_BYTES) {
      return uploadWithTus(bucket, path, file, onProgress, contentType, context);
    }

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: guessContentType(file, contentType),
    });

    if (error) {
      console.error('Upload failed:', error);
      return { success: false, error: { message: formatUploadError(error, context) } };
    }

    onProgress?.(100);
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Upload exception:', error);
    return { success: false, error: { message: formatUploadError(error, context) } };
  }
}
