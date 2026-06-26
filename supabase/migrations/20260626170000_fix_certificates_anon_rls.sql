-- Certificates: allow custom-auth (anon) learners to issue and view their certificates

DROP POLICY IF EXISTS "Users can view own certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can view all certificates" ON certificates;
DROP POLICY IF EXISTS "System can issue certificates" ON certificates;

CREATE POLICY "Allow anon to view certificates"
  ON certificates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon to insert certificates"
  ON certificates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon to update certificates"
  ON certificates FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Backfill certificates for completed uploaded courses missing a cert
INSERT INTO certificates (
  user_id,
  uploaded_course_id,
  course_id,
  course_title,
  user_name,
  certificate_number,
  certificate_template,
  issued_at
)
SELECT
  uca.user_id,
  uca.course_id,
  NULL,
  uc.title,
  COALESCE(up.full_name, 'Learner'),
  'CERT-' || UPPER(SUBSTR(REPLACE(uca.id::text, '-', ''), 1, 10)),
  COALESCE(uca.certificate_template, 'classic'),
  COALESCE(uca.completed_at, NOW())
FROM uploaded_course_assignments uca
JOIN uploaded_courses uc ON uc.id = uca.course_id
JOIN user_profiles up ON up.id = uca.user_id
WHERE uca.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM certificates c
    WHERE c.user_id = uca.user_id
      AND c.uploaded_course_id = uca.course_id
  );

-- Backfill certificates for completed built-in enrollments missing a cert
INSERT INTO certificates (
  user_id,
  course_id,
  uploaded_course_id,
  course_title,
  user_name,
  certificate_number,
  certificate_template,
  issued_at
)
SELECT
  e.user_id,
  e.course_id,
  NULL,
  c.title,
  COALESCE(up.full_name, 'Learner'),
  'CERT-' || UPPER(SUBSTR(REPLACE(e.id::text, '-', ''), 1, 10)),
  COALESCE(e.certificate_template, 'classic'),
  COALESCE(e.completed_at, NOW())
FROM user_course_enrollments e
JOIN courses c ON c.id = e.course_id
JOIN user_profiles up ON up.id = e.user_id
WHERE e.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM certificates cert
    WHERE cert.user_id = e.user_id
      AND cert.course_id = e.course_id
  );
