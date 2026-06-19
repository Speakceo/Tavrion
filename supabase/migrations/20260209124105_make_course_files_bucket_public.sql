/*
  # Make course-files bucket public for SCORM playback

  1. Changes
    - Set the course-files bucket to public
    - Required so SCORM content loaded in blob iframes can resolve
      relative resource paths via <base> tag pointing to storage URLs

  2. Important Notes
    - Extracted SCORM files use unique random IDs in their paths
    - This enables the iframe blob approach that bypasses X-Frame-Options
*/

UPDATE storage.buckets
SET public = true
WHERE id = 'course-files';
