/*
  # Allow all MIME types in course-files bucket

  1. Changes
    - Update the course-files storage bucket to allow all MIME types
    - This is needed because SCORM packages contain fonts (.woff, .ttf, .otf, .eot),
      Flash files (.swf), and other binary formats that are not in the default allowed list

  2. Notes
    - SCORM packages are standardized e-learning archives that can contain any file type
    - Restricting MIME types breaks SCORM content rendering
*/

UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'course-files';
