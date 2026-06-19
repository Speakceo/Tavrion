/*
  # Increase Course Files Size Limit to 1GB

  1. Changes
    - Update course-files bucket file size limit from 950MB to 1GB (1024MB)
    - This allows users to upload files up to ~950MB with buffer for overhead

  2. Notes
    - Sets limit to 1073741824 bytes (1 GB)
    - All MIME types remain allowed as configured in previous migrations
    - Provides sufficient headroom for large SCORM packages and video files
*/

-- Update bucket configuration to allow 1GB files
UPDATE storage.buckets
SET file_size_limit = 1073741824
WHERE id = 'course-files';
