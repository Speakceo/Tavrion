/*
  # Increase Course Files Size Limit to 950MB

  1. Changes
    - Update course-files bucket file size limit from 900MB to 950MB
    - This allows users to upload files up to 890MB with buffer for overhead

  2. Notes
    - Sets limit to 996147200 bytes (950 MB)
    - All MIME types remain allowed as configured in previous migrations
*/

-- Update bucket configuration to allow 950MB files
UPDATE storage.buckets
SET file_size_limit = 996147200
WHERE id = 'course-files';
