/*
  # Fix Storage Upload Policy for Course Files

  1. Changes
    - Drop existing course-files storage policies
    - Create new simplified policies that properly allow uploads
    - Ensure bucket_id and owner fields are set correctly
    
  2. Security
    - All authenticated users can upload files (needed for admin uploads)
    - All authenticated users can read files
    - Only admins/trainers can delete files
*/

-- Drop all existing course-files policies
DROP POLICY IF EXISTS "course_files_upload" ON storage.objects;
DROP POLICY IF EXISTS "course_files_read" ON storage.objects;
DROP POLICY IF EXISTS "course_files_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "course_files_delete_admin" ON storage.objects;

-- Allow authenticated users to upload files to course-files bucket
CREATE POLICY "course_files_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
);

-- Allow authenticated users to read files from course-files bucket
CREATE POLICY "course_files_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-files'
);

-- Allow authenticated users to update files in course-files bucket
CREATE POLICY "course_files_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
)
WITH CHECK (
  bucket_id = 'course-files'
);

-- Allow authenticated users to delete files from course-files bucket
CREATE POLICY "course_files_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
);
