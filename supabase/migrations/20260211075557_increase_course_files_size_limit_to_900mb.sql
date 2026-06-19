/*
  # Increase Course Files Size Limit to 900MB

  1. Changes
    - Update course-files bucket file size limit from 100MB to 900MB
    - This allows users to upload larger SCORM packages and video files

  2. Notes
    - Sets limit to 943718400 bytes (900 MB)
    - All MIME types remain allowed as configured in previous migrations
*/

-- Update bucket configuration to allow 900MB files
UPDATE storage.buckets
SET file_size_limit = 943718400
WHERE id = 'course-files';
