import { supabase } from '../lib/supabase';

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export async function uploadLargeFile({
  bucket,
  path,
  file,
  onProgress,
}: UploadOptions): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log('Starting upload...');
    console.log('File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Bucket:', bucket);
    console.log('Path:', path);

    // Supabase client automatically uses TUS resumable uploads for files > 6MB
    // This is the recommended way to upload large files
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload failed:', error);
      return { success: false, error };
    }

    console.log('Upload completed successfully');
    if (onProgress) {
      onProgress(100);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Upload exception:', error);
    return { success: false, error };
  }
}
