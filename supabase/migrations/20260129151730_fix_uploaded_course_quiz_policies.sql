/*
  # Fix Uploaded Course Quiz RLS Policies
  
  1. Tables Affected
    - uploaded_course_quizzes
    - uploaded_course_quiz_questions
    - uploaded_course_assignments
  
  2. Changes
    - Add RLS policies for quiz creation and management
    - Allow authenticated and anon users to manage quizzes
    
  3. Security
    - Maintain RLS while allowing necessary operations
    - Users can create, view, update, and delete quizzes for courses
*/

-- Enable RLS on quiz tables if not already enabled
ALTER TABLE uploaded_course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_course_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_course_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert quizzes" ON uploaded_course_quizzes;
DROP POLICY IF EXISTS "Users can view quizzes" ON uploaded_course_quizzes;
DROP POLICY IF EXISTS "Users can update quizzes" ON uploaded_course_quizzes;
DROP POLICY IF EXISTS "Users can delete quizzes" ON uploaded_course_quizzes;

DROP POLICY IF EXISTS "Users can insert quiz questions" ON uploaded_course_quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions" ON uploaded_course_quiz_questions;
DROP POLICY IF EXISTS "Users can update quiz questions" ON uploaded_course_quiz_questions;
DROP POLICY IF EXISTS "Users can delete quiz questions" ON uploaded_course_quiz_questions;

-- Create policies for uploaded_course_quizzes
CREATE POLICY "Users can insert quizzes"
ON uploaded_course_quizzes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view quizzes"
ON uploaded_course_quizzes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can update quizzes"
ON uploaded_course_quizzes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete quizzes"
ON uploaded_course_quizzes FOR DELETE
TO anon, authenticated
USING (true);

-- Create policies for uploaded_course_quiz_questions
CREATE POLICY "Users can insert quiz questions"
ON uploaded_course_quiz_questions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view quiz questions"
ON uploaded_course_quiz_questions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can update quiz questions"
ON uploaded_course_quiz_questions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete quiz questions"
ON uploaded_course_quiz_questions FOR DELETE
TO anon, authenticated
USING (true);