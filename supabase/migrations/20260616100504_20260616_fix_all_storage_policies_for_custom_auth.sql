/*
  # Fix All Storage Policies for Custom Authentication

  The app uses custom auth (anon Supabase role for all users).
  This migration drops every known conflicting policy across all 4 buckets
  and replaces them with a single clean set that works with the anon role.

  Buckets covered:
    - course-files      (SCORM, PDFs, videos, etc.)
    - vault-files       (user personal file vault)
    - social-media      (social post images/videos)
    - call-recordings   (best-call audio files)
*/

-- ─────────────────────────────────────────────
-- 1. course-files  (drop every known policy name)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "course_files_upload"                       ON storage.objects;
DROP POLICY IF EXISTS "course_files_read"                         ON storage.objects;
DROP POLICY IF EXISTS "course_files_update_admin"                 ON storage.objects;
DROP POLICY IF EXISTS "course_files_delete_admin"                 ON storage.objects;
DROP POLICY IF EXISTS "course_files_insert_policy"                ON storage.objects;
DROP POLICY IF EXISTS "course_files_select_policy"                ON storage.objects;
DROP POLICY IF EXISTS "course_files_update_policy"                ON storage.objects;
DROP POLICY IF EXISTS "course_files_delete_policy"                ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to course-files"             ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from course-files"         ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to course-files"             ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from course-files"           ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to course-files"   ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from course-files"  ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads to course-files"        ON storage.objects;
DROP POLICY IF EXISTS "Allow anon downloads from course-files"    ON storage.objects;
DROP POLICY IF EXISTS "Allow anon deletes from course-files"      ON storage.objects;
DROP POLICY IF EXISTS "Admins and trainers can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and trainers can delete course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all course files"        ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course files"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view assigned course files"       ON storage.objects;

CREATE POLICY "course_files_all_anon"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "course_files_select_anon"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'course-files');

CREATE POLICY "course_files_update_anon"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'course-files')
  WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "course_files_delete_anon"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'course-files');

-- ─────────────────────────────────────────────
-- 2. vault-files
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anon users to view vault files"   ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to upload vault files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to delete vault files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to update vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own vault files"         ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own vault files"       ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vault files"       ON storage.objects;

CREATE POLICY "vault_files_insert_anon"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'vault-files');

CREATE POLICY "vault_files_select_anon"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vault-files');

CREATE POLICY "vault_files_update_anon"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'vault-files')
  WITH CHECK (bucket_id = 'vault-files');

CREATE POLICY "vault_files_delete_anon"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'vault-files');

-- ─────────────────────────────────────────────
-- 3. social-media
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow upload to social media bucket"          ON storage.objects;
DROP POLICY IF EXISTS "Public can view social media files"           ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from social media bucket"        ON storage.objects;
DROP POLICY IF EXISTS "Allow update to social media bucket"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload social media"  ON storage.objects;
DROP POLICY IF EXISTS "Public can view social media"                 ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own social media"            ON storage.objects;

CREATE POLICY "social_media_insert_anon"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'social-media');

CREATE POLICY "social_media_select_anon"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'social-media');

CREATE POLICY "social_media_update_anon"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'social-media')
  WITH CHECK (bucket_id = 'social-media');

CREATE POLICY "social_media_delete_anon"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'social-media');

-- ─────────────────────────────────────────────
-- 4. call-recordings
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view call recordings"    ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload call recordings"  ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete call recordings"  ON storage.objects;

CREATE POLICY "call_recordings_insert_anon"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'call-recordings');

CREATE POLICY "call_recordings_select_anon"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'call-recordings');

CREATE POLICY "call_recordings_update_anon"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'call-recordings')
  WITH CHECK (bucket_id = 'call-recordings');

CREATE POLICY "call_recordings_delete_anon"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'call-recordings');

-- ─────────────────────────────────────────────
-- 5. Ensure all buckets exist and are public
--    (reads work without auth, writes go through
--     the RLS policies above)
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('course-files',    'course-files',    true),
  ('vault-files',     'vault-files',     true),
  ('social-media',    'social-media',    true),
  ('call-recordings', 'call-recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;
