-- Optional cover image for uploaded courses (stored in course-files/thumbnails/)
ALTER TABLE uploaded_courses
  ADD COLUMN IF NOT EXISTS thumbnail_path text;

COMMENT ON COLUMN uploaded_courses.thumbnail_path IS 'Storage path under course-files bucket, e.g. thumbnails/{course_id}_{ts}.jpg';
