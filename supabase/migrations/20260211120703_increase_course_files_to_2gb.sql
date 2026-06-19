/*
  # Increase Course Files Size Limit to 2GB

  1. Changes
    - Update course-files bucket file size limit from 1GB to 2GB (2048MB)
    - This allows users to upload files up to ~1.8GB with buffer for overhead
    - Accommodates large SCORM packages and video files

  2. Notes
    - Sets limit to 2147483648 bytes (2 GB)
    - Provides sufficient headroom for HTTP upload overhead
*/

-- Update bucket configuration to allow 2GB files
UPDATE storage.buckets
SET file_size_limit = 2147483648
WHERE id = 'course-files';
