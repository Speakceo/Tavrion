import { supabase } from '../lib/supabase';

const BUCKET = 'course-files';
const THUMB_MAX_BYTES = 2 * 1024 * 1024;
const THUMB_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validateThumbnailFile(file: File): string | null {
  if (!THUMB_TYPES.has(file.type)) {
    return 'Thumbnail must be JPG, PNG, WebP, or GIF.';
  }
  if (file.size > THUMB_MAX_BYTES) {
    return 'Thumbnail must be 2 MB or smaller.';
  }
  return null;
}

function thumbnailExtension(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[file.type] || 'jpg';
}

export async function uploadCourseThumbnail(file: File, courseId: string): Promise<string> {
  const validationError = validateThumbnailFile(file);
  if (validationError) throw new Error(validationError);

  const path = `thumbnails/${courseId}_${Date.now()}.${thumbnailExtension(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) throw error;
  return path;
}

export async function getUploadedCourseSignedUrl(
  filePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!filePath) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, expiresIn);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
}

export async function removeCourseStoragePaths(paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!unique.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(unique);
  if (error) console.error('Storage cleanup error:', error);
}
