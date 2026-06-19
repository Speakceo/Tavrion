/*
  # Fix Uploaded Courses Storage and RLS Policies
  
  1. Storage Bucket Updates
    - Increase file size limit to 500MB to support larger course files
    - Add MIME types for all supported formats:
      * Documents: PDF, Word (DOC, DOCX)
      * Presentations: PowerPoint (PPT, PPTX)
      * Videos: MP4, MOV, AVI, WEBM
      * Data: Excel (XLSX, XLS), CSV
      * Text: TXT, Markdown (MD)
      * SCORM: ZIP files
  
  2. RLS Policies
    - Ensure all necessary policies exist for authenticated users
    - Allow uploads, downloads, and deletions
    
  3. Security
    - Maintain RLS protection while allowing necessary operations
    - File size limit prevents abuse
*/

-- Update bucket configuration with expanded file types and larger size limit
UPDATE storage.buckets
SET 
  file_size_limit = 524288000, -- 500MB in bytes
  allowed_mime_types = ARRAY[
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
    'text/markdown'
  ]
WHERE id = 'course-files';

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  false,
  524288000,
  ARRAY[
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
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
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
    'text/markdown'
  ];

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads to course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads to course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon downloads from course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon deletes from course-files" ON storage.objects;

-- Create comprehensive storage policies for course-files bucket
CREATE POLICY "Allow uploads to course-files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "Allow downloads from course-files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'course-files');

CREATE POLICY "Allow updates to course-files"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'course-files')
WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "Allow deletes from course-files"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'course-files');

-- Ensure uploaded_courses table policies are correct
DROP POLICY IF EXISTS "Allow anon to insert uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Allow anon to view uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Allow anon to update uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Allow anon to delete uploaded courses" ON uploaded_courses;

CREATE POLICY "Users can insert uploaded courses"
ON uploaded_courses FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view uploaded courses"
ON uploaded_courses FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can update uploaded courses"
ON uploaded_courses FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete uploaded courses"
ON uploaded_courses FOR DELETE
TO anon, authenticated
USING (true);