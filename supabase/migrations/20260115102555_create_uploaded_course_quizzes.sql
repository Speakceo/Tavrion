/*
  # Create Quiz System for Uploaded Courses

  1. New Tables
    - `uploaded_course_quizzes`
      - `id` (uuid, primary key)
      - `course_id` (uuid) - Reference to uploaded_courses
      - `enabled` (boolean) - Whether quiz is enabled
      - `passing_score` (integer) - Percentage needed to pass (0-100)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `uploaded_course_quiz_questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid) - Reference to uploaded_course_quizzes
      - `question_text` (text) - The question
      - `option_a` (text) - First option
      - `option_b` (text) - Second option
      - `option_c` (text) - Third option
      - `option_d` (text) - Fourth option
      - `correct_option` (text) - 'a', 'b', 'c', or 'd'
      - `points` (integer) - Points for this question
      - `order_index` (integer) - Order in quiz
      - `created_at` (timestamptz)
    
    - `uploaded_course_quiz_attempts`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid) - Reference to uploaded_course_quizzes
      - `user_id` (uuid) - Reference to user_profiles
      - `score` (integer) - Percentage score (0-100)
      - `answers` (jsonb) - User's answers
      - `passed` (boolean) - Whether user passed
      - `attempted_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Allow anon users to perform all operations (custom auth system)
*/

-- Create uploaded_course_quizzes table
CREATE TABLE IF NOT EXISTS uploaded_course_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES uploaded_courses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled boolean DEFAULT false,
  passing_score integer DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create uploaded_course_quiz_questions table
CREATE TABLE IF NOT EXISTS uploaded_course_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES uploaded_course_quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  points integer DEFAULT 1 CHECK (points > 0),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create uploaded_course_quiz_attempts table
CREATE TABLE IF NOT EXISTS uploaded_course_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES uploaded_course_quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  score integer CHECK (score >= 0 AND score <= 100),
  answers jsonb DEFAULT '[]'::jsonb,
  passed boolean DEFAULT false,
  attempted_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_course_id ON uploaded_course_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON uploaded_course_quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON uploaded_course_quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON uploaded_course_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON uploaded_course_quiz_attempts(user_id);

-- Enable RLS
ALTER TABLE uploaded_course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_course_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_course_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_course_quizzes
CREATE POLICY "Allow anon to view quizzes"
ON uploaded_course_quizzes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon to insert quizzes"
ON uploaded_course_quizzes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon to update quizzes"
ON uploaded_course_quizzes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon to delete quizzes"
ON uploaded_course_quizzes FOR DELETE
TO anon, authenticated
USING (true);

-- RLS Policies for uploaded_course_quiz_questions
CREATE POLICY "Allow anon to view questions"
ON uploaded_course_quiz_questions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon to insert questions"
ON uploaded_course_quiz_questions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon to update questions"
ON uploaded_course_quiz_questions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon to delete questions"
ON uploaded_course_quiz_questions FOR DELETE
TO anon, authenticated
USING (true);

-- RLS Policies for uploaded_course_quiz_attempts
CREATE POLICY "Allow anon to view attempts"
ON uploaded_course_quiz_attempts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon to insert attempts"
ON uploaded_course_quiz_attempts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon to update attempts"
ON uploaded_course_quiz_attempts FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon to delete attempts"
ON uploaded_course_quiz_attempts FOR DELETE
TO anon, authenticated
USING (true);