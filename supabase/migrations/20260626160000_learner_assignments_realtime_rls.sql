-- Allow custom-auth (anon) learners to see assignments + enable realtime updates

-- user_course_enrollments: anon-friendly policies (matches uploaded_course_assignments pattern)
DROP POLICY IF EXISTS "Users can view own enrollments" ON user_course_enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON user_course_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON user_course_enrollments;

CREATE POLICY "Allow anon to view enrollments"
  ON user_course_enrollments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon to insert enrollments"
  ON user_course_enrollments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon to update enrollments"
  ON user_course_enrollments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete enrollments"
  ON user_course_enrollments FOR DELETE
  TO anon, authenticated
  USING (true);

-- courses: learners need to read assigned course metadata via joins
DROP POLICY IF EXISTS "Authenticated users can view published courses" ON courses;
DROP POLICY IF EXISTS "Trainers and admins can view all courses" ON courses;

CREATE POLICY "Allow anon to view courses"
  ON courses FOR SELECT
  TO anon, authenticated
  USING (true);

-- uploaded assignment statuses used by the app
ALTER TABLE uploaded_course_assignments DROP CONSTRAINT IF EXISTS uploaded_course_assignments_status_check;
ALTER TABLE uploaded_course_assignments ADD CONSTRAINT uploaded_course_assignments_status_check
  CHECK (status IN ('assigned', 'not_started', 'viewed', 'downloaded', 'in_progress', 'completed'));

-- Realtime: push assignment changes to connected learners
ALTER TABLE user_course_enrollments REPLICA IDENTITY FULL;
ALTER TABLE uploaded_course_assignments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_course_enrollments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_course_enrollments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'uploaded_course_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE uploaded_course_assignments;
  END IF;
END $$;
