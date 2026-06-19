/*
  # Add public access for extracted SCORM files

  1. Storage Policies
    - Add policy to allow public read access to files under `extracted/` prefix in course-files bucket
    - This is needed for SCORM player to load resources with relative paths

  2. Important Notes
    - Only the `extracted/` folder is made publicly readable
    - Original uploaded course files remain private
    - SCORM packages are extracted to temporary folders with unique IDs
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public read access for extracted SCORM files" ON storage.objects;

-- Allow public read access to extracted SCORM files
CREATE POLICY "Public read access for extracted SCORM files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'course-files' 
    AND name LIKE 'extracted/%'
  );
