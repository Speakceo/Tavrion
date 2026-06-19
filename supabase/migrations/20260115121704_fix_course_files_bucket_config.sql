/*
  # Fix Course Files Bucket Configuration
  
  1. Changes
    - Update course-files bucket with proper file size limit
    - Set allowed MIME types for PDF and PowerPoint files
    - Ensure bucket is properly configured for uploads
    
  2. Security
    - Set reasonable file size limit (100MB)
    - Restrict to PDF and Office formats only
*/

-- Update bucket configuration
UPDATE storage.buckets
SET 
  file_size_limit = 104857600, -- 100MB in bytes
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
WHERE id = 'course-files';
