-- Certificate templates on assignments + uploaded course certificates

ALTER TABLE user_course_enrollments
  ADD COLUMN IF NOT EXISTS certificate_template text DEFAULT 'classic';

ALTER TABLE uploaded_course_assignments
  ADD COLUMN IF NOT EXISTS certificate_template text DEFAULT 'classic';

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS uploaded_course_id uuid REFERENCES uploaded_courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS certificate_template text DEFAULT 'classic';

ALTER TABLE certificates
  ALTER COLUMN course_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_uploaded_course_idx
  ON certificates(user_id, uploaded_course_id)
  WHERE uploaded_course_id IS NOT NULL;
