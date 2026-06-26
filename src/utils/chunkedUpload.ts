import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const TUS_THRESHOLD_BYTES = 6 * 1024 * 1024;

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: number) => void;
  contentType?: string;
}

function formatUploadError(error: unknown): string {
  const msg = (error as { message?: string })?.message || String(error);
  if (msg.includes('413') || /too large|exceeded|maximum/i.test(msg)) {
    return 'File exceeds the maximum allowed size (2GB). Try a smaller archive or split the library.';
  }
  if (/mime|invalid file type|not allowed/i.test(msg)) {
    return `Upload rejected by storage: ${msg}`;
  }
  if (/timeout|network|failed to fetch/i.test(msg)) {
    return 'Upload timed out or lost connection. Large files need a stable connection — please retry.';
  }
  return msg;
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
): Promise<{ success: boolean; data?: { path: string }; error?: { message: string } }> {
  return new Promise((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${supabaseAnonKey}`,
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
        resolve({ success: false, error: { message: formatUploadError(error) } });
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
}: UploadOptions): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    console.log(`Uploading ${sizeMb} MB to ${bucket}/${path}`);

    if (file.size >= TUS_THRESHOLD_BYTES) {
      return uploadWithTus(bucket, path, file, onProgress, contentType);
    }

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: guessContentType(file, contentType),
    });

    if (error) {
      console.error('Upload failed:', error);
      return { success: false, error: { message: formatUploadError(error) } };
    }

    onProgress?.(100);
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Upload exception:', error);
    return { success: false, error: { message: formatUploadError(error) } };
  }
}
