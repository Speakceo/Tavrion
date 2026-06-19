/*
  # Allow SCORM file types in course-files bucket

  1. Updates
    - Add HTML, CSS, JavaScript, and image MIME types to course-files bucket
    - Required for SCORM packages which contain these file types
    - Preserves existing allowed types

  2. Allowed MIME Types Added
    - text/html
    - text/css
    - application/javascript
    - text/javascript
    - application/json
    - application/xml
    - text/xml
    - image/png
    - image/jpeg
    - image/gif
    - image/svg+xml
    - audio/mpeg
    - audio/wav
*/

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'application/javascript',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'audio/mpeg',
  'audio/wav',
  'application/octet-stream'
]
WHERE id = 'course-files';
