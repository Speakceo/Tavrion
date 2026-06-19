/*
  # Amberstudent LMS - Complete Database Schema

  ## Overview
  Comprehensive Learning Management System for Amberstudent with AI-powered features,
  role-based access control, and analytics tracking.

  ## 1. New Tables

  ### Authentication & Users
  - `user_profiles` - Extended user profile information
    - `id` (uuid, FK to auth.users)
    - `role` (enum: super_admin, admin, trainer, employee, partner)
    - `full_name` (text)
    - `email` (text)
    - `department` (text)
    - `country` (text: UK, US, AU, CA)
    - `is_active` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Course Structure
  - `courses` - Main course entities
    - `id` (uuid, PK)
    - `title` (text)
    - `description` (text)
    - `target_role` (text)
    - `country` (text)
    - `is_mandatory` (boolean)
    - `version` (integer)
    - `status` (enum: draft, published, archived)
    - `created_by` (uuid, FK to user_profiles)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `modules` - Course modules/sections
    - `id` (uuid, PK)
    - `course_id` (uuid, FK to courses)
    - `title` (text)
    - `description` (text)
    - `order_index` (integer)
    - `created_at` (timestamptz)

  - `lessons` - Individual lessons
    - `id` (uuid, PK)
    - `module_id` (uuid, FK to modules)
    - `title` (text)
    - `type` (enum: text, slides, quiz, mock_call)
    - `content` (jsonb)
    - `duration_minutes` (integer)
    - `order_index` (integer)
    - `created_at` (timestamptz)

  ### Assessments
  - `quizzes` - Quiz metadata
    - `id` (uuid, PK)
    - `lesson_id` (uuid, FK to lessons)
    - `title` (text)
    - `pass_threshold` (integer)
    - `max_attempts` (integer)
    - `created_at` (timestamptz)

  - `questions` - Quiz questions
    - `id` (uuid, PK)
    - `quiz_id` (uuid, FK to quizzes)
    - `question_text` (text)
    - `type` (enum: mcq, subjective, scenario)
    - `options` (jsonb)
    - `correct_answer` (text)
    - `explanation` (text)
    - `points` (integer)
    - `order_index` (integer)

  - `quiz_attempts` - User quiz attempts
    - `id` (uuid, PK)
    - `quiz_id` (uuid, FK to quizzes)
    - `user_id` (uuid, FK to user_profiles)
    - `score` (integer)
    - `answers` (jsonb)
    - `passed` (boolean)
    - `attempt_number` (integer)
    - `completed_at` (timestamptz)

  ### AI Features
  - `ai_chat_history` - AI tutor conversations
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to user_profiles)
    - `course_id` (uuid, FK to courses, nullable)
    - `message` (text)
    - `role` (enum: user, assistant)
    - `context` (jsonb)
    - `created_at` (timestamptz)

  - `mock_call_sessions` - AI mock call practice
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to user_profiles)
    - `scenario_type` (text: student, parent, partner)
    - `scenario_details` (jsonb)
    - `transcript` (jsonb)
    - `score` (integer)
    - `feedback` (jsonb)
    - `completed_at` (timestamptz)

  - `ai_generated_content` - Track AI-generated courses/slides
    - `id` (uuid, PK)
    - `type` (enum: course, slides, quiz)
    - `input_params` (jsonb)
    - `output_data` (jsonb)
    - `created_by` (uuid, FK to user_profiles)
    - `created_at` (timestamptz)

  ### Progress Tracking
  - `user_course_enrollments` - Course assignments
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to user_profiles)
    - `course_id` (uuid, FK to courses)
    - `enrolled_at` (timestamptz)
    - `started_at` (timestamptz, nullable)
    - `completed_at` (timestamptz, nullable)
    - `status` (enum: assigned, in_progress, completed)

  - `lesson_progress` - Individual lesson tracking
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to user_profiles)
    - `lesson_id` (uuid, FK to lessons)
    - `status` (enum: not_started, in_progress, completed)
    - `time_spent_seconds` (integer)
    - `last_accessed_at` (timestamptz)
    - `completed_at` (timestamptz, nullable)

  - `analytics_events` - Detailed activity tracking
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to user_profiles)
    - `event_type` (text)
    - `event_data` (jsonb)
    - `created_at` (timestamptz)

  ### Certifications
  - `certificates` - Course completion certificates
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to user_profiles)
    - `course_id` (uuid, FK to courses)
    - `issued_at` (timestamptz)
    - `certificate_url` (text)

  ## 2. Security
  - Enable RLS on all tables
  - Role-based policies for super_admin, admin, trainer, employee, partner
  - Users can view their own data
  - Admins and trainers have elevated permissions
  - Super admins have full access

  ## 3. Indexes
  - Foreign key indexes for performance
  - Course lookup by status and target role
  - User lookup by role and department
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'trainer', 'employee', 'partner');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE lesson_type AS ENUM ('text', 'slides', 'quiz', 'mock_call');
CREATE TYPE question_type AS ENUM ('mcq', 'subjective', 'scenario');
CREATE TYPE chat_role AS ENUM ('user', 'assistant');
CREATE TYPE progress_status AS ENUM ('assigned', 'not_started', 'in_progress', 'completed');
CREATE TYPE ai_content_type AS ENUM ('course', 'slides', 'quiz');

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'employee',
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  department text,
  country text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  target_role text,
  country text,
  is_mandatory boolean DEFAULT false,
  version integer DEFAULT 1,
  status course_status DEFAULT 'draft',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Modules Table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  type lesson_type NOT NULL,
  content jsonb DEFAULT '{}',
  duration_minutes integer DEFAULT 0,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  pass_threshold integer DEFAULT 70,
  max_attempts integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  type question_type NOT NULL,
  options jsonb DEFAULT '[]',
  correct_answer text,
  explanation text,
  points integer DEFAULT 1,
  order_index integer NOT NULL
);

-- Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  score integer NOT NULL,
  answers jsonb DEFAULT '{}',
  passed boolean NOT NULL,
  attempt_number integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- AI Chat History Table
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  message text NOT NULL,
  role chat_role NOT NULL,
  context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Mock Call Sessions Table
CREATE TABLE IF NOT EXISTS mock_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  scenario_type text NOT NULL,
  scenario_details jsonb DEFAULT '{}',
  transcript jsonb DEFAULT '[]',
  score integer,
  feedback jsonb DEFAULT '{}',
  completed_at timestamptz DEFAULT now()
);

-- AI Generated Content Table
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type ai_content_type NOT NULL,
  input_params jsonb NOT NULL,
  output_data jsonb NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- User Course Enrollments Table
CREATE TABLE IF NOT EXISTS user_course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  status progress_status DEFAULT 'assigned',
  UNIQUE(user_id, course_id)
);

-- Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  status progress_status DEFAULT 'not_started',
  time_spent_seconds integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, lesson_id)
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  issued_at timestamptz DEFAULT now(),
  certificate_url text,
  UNIQUE(user_id, course_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_target_role ON courses(target_role);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_call_sessions_user_id ON mock_call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON user_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON user_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins and admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Super admins and admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Super admins and admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for courses
CREATE POLICY "Authenticated users can view published courses"
  ON courses FOR SELECT
  TO authenticated
  USING (status = 'published' OR created_by = auth.uid());

CREATE POLICY "Trainers and admins can view all courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

CREATE POLICY "Trainers and admins can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

CREATE POLICY "Trainers and admins can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for modules
CREATE POLICY "Users can view modules of accessible courses"
  ON modules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = modules.course_id
      AND (courses.status = 'published' OR courses.created_by = auth.uid())
    )
  );

CREATE POLICY "Trainers and admins can manage modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for lessons
CREATE POLICY "Users can view lessons of accessible courses"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
      AND (courses.status = 'published' OR courses.created_by = auth.uid())
    )
  );

CREATE POLICY "Trainers and admins can manage lessons"
  ON lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for quizzes
CREATE POLICY "Users can view quizzes"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
      AND (courses.status = 'published' OR courses.created_by = auth.uid())
    )
  );

CREATE POLICY "Trainers and admins can manage quizzes"
  ON quizzes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for questions
CREATE POLICY "Users can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN lessons ON lessons.id = quizzes.lesson_id
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE quizzes.id = questions.quiz_id
      AND (courses.status = 'published' OR courses.created_by = auth.uid())
    )
  );

CREATE POLICY "Trainers and admins can manage questions"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all quiz attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ai_chat_history
CREATE POLICY "Users can view own chat history"
  ON ai_chat_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat messages"
  ON ai_chat_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for mock_call_sessions
CREATE POLICY "Users can view own mock call sessions"
  ON mock_call_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all mock call sessions"
  ON mock_call_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can insert own mock call sessions"
  ON mock_call_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ai_generated_content
CREATE POLICY "Trainers and admins can view AI generated content"
  ON ai_generated_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

CREATE POLICY "Trainers and admins can create AI generated content"
  ON ai_generated_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for user_course_enrollments
CREATE POLICY "Users can view own enrollments"
  ON user_course_enrollments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all enrollments"
  ON user_course_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage enrollments"
  ON user_course_enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view own lesson progress"
  ON lesson_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all lesson progress"
  ON lesson_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can update own lesson progress"
  ON lesson_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for analytics_events
CREATE POLICY "Users can view own analytics events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all analytics events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can insert own analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for certificates
CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "System can issue certificates"
  ON certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );