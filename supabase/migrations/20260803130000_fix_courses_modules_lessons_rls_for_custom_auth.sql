-- Fix courses/modules/lessons RLS for custom (anon) auth.
-- SELECT on courses was already opened to anon; INSERT/UPDATE/DELETE still
-- required auth.uid() via the authenticated role, which blocks CourseEditor saves.

DROP POLICY IF EXISTS "Trainers and admins can create courses" ON courses;
DROP POLICY IF EXISTS "Trainers and admins can update courses" ON courses;
DROP POLICY IF EXISTS "Trainers and admins can delete courses" ON courses;
DROP POLICY IF EXISTS "Allow anon to view courses" ON courses;
DROP POLICY IF EXISTS "Allow anon to insert courses" ON courses;
DROP POLICY IF EXISTS "Allow anon to update courses" ON courses;
DROP POLICY IF EXISTS "Allow anon to delete courses" ON courses;

CREATE POLICY "Allow anon to view courses"
  ON courses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon to insert courses"
  ON courses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon to update courses"
  ON courses FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete courses"
  ON courses FOR DELETE
  TO anon, authenticated
  USING (true);

-- modules
DROP POLICY IF EXISTS "Users can view modules of accessible courses" ON modules;
DROP POLICY IF EXISTS "Trainers and admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Allow anon to view modules" ON modules;
DROP POLICY IF EXISTS "Allow anon to insert modules" ON modules;
DROP POLICY IF EXISTS "Allow anon to update modules" ON modules;
DROP POLICY IF EXISTS "Allow anon to delete modules" ON modules;

CREATE POLICY "Allow anon to view modules"
  ON modules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon to insert modules"
  ON modules FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon to update modules"
  ON modules FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete modules"
  ON modules FOR DELETE
  TO anon, authenticated
  USING (true);

-- lessons
DROP POLICY IF EXISTS "Users can view lessons of accessible courses" ON lessons;
DROP POLICY IF EXISTS "Trainers and admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Allow anon to view lessons" ON lessons;
DROP POLICY IF EXISTS "Allow anon to insert lessons" ON lessons;
DROP POLICY IF EXISTS "Allow anon to update lessons" ON lessons;
DROP POLICY IF EXISTS "Allow anon to delete lessons" ON lessons;

CREATE POLICY "Allow anon to view lessons"
  ON lessons FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon to insert lessons"
  ON lessons FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon to update lessons"
  ON lessons FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete lessons"
  ON lessons FOR DELETE
  TO anon, authenticated
  USING (true);
