/*
  # Create Uploaded Courses System

  1. New Tables
    - `uploaded_courses`
      - `id` (uuid, primary key)
      - `title` (text) - Course title
      - `description` (text) - Course description
      - `file_name` (text) - Original filename
      - `file_path` (text) - Storage path
      - `file_type` (text) - pdf or ppt/pptx
      - `file_size` (bigint) - File size in bytes
      - `category` (text) - Course category
      - `uploaded_by` (uuid) - Reference to user who uploaded
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `uploaded_course_assignments`
      - `id` (uuid, primary key)
      - `course_id` (uuid) - Reference to uploaded_courses
      - `user_id` (uuid) - Reference to user_profiles
      - `assigned_by` (uuid) - Reference to user who assigned
      - `status` (text) - assigned, viewed, downloaded, completed
      - `viewed_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Uploaded courses visible to all authenticated users
    - Only admins/trainers can upload and delete
    - Users can only see their assigned courses
    - Assignment operations restricted to admins/trainers

  3. Storage
    - Create storage bucket for course files
    - Set up policies for file access
*/

-- Create uploaded_courses table
CREATE TABLE IF NOT EXISTS uploaded_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'ppt', 'pptx')),
  file_size bigint NOT NULL,
  category text DEFAULT 'general',
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create uploaded_course_assignments table
CREATE TABLE IF NOT EXISTS uploaded_course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES uploaded_courses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'viewed', 'downloaded', 'completed')),
  viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_courses_uploaded_by ON uploaded_courses(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_courses_created_at ON uploaded_courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_course_assignments_user_id ON uploaded_course_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_course_assignments_course_id ON uploaded_course_assignments(course_id);

-- Enable RLS
ALTER TABLE uploaded_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_course_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_courses

-- All authenticated users can view uploaded courses
CREATE POLICY "All authenticated users can view uploaded courses"
  ON uploaded_courses FOR SELECT
  TO authenticated
  USING (true);

-- Only admins and trainers can insert uploaded courses
CREATE POLICY "Admins and trainers can upload courses"
  ON uploaded_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Only admins and trainers can update uploaded courses
CREATE POLICY "Admins and trainers can update uploaded courses"
  ON uploaded_courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Only admins and trainers can delete uploaded courses
CREATE POLICY "Admins and trainers can delete uploaded courses"
  ON uploaded_courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- RLS Policies for uploaded_course_assignments

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
  ON uploaded_course_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Only admins and trainers can create assignments
CREATE POLICY "Admins and trainers can create assignments"
  ON uploaded_course_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Users can update their own assignment status
CREATE POLICY "Users can update their own assignment status"
  ON uploaded_course_assignments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Only admins and trainers can delete assignments
CREATE POLICY "Admins and trainers can delete assignments"
  ON uploaded_course_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Create storage bucket for course files
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-files', 'course-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-files bucket

-- Allow authenticated users to read files they're assigned to
CREATE POLICY "Users can view assigned course files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course-files'
    AND (
      -- Admins and trainers can view all
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
      )
      OR
      -- Users can view files they're assigned to
      EXISTS (
        SELECT 1 FROM uploaded_courses uc
        JOIN uploaded_course_assignments uca ON uca.course_id = uc.id
        WHERE uc.file_path = storage.objects.name
        AND uca.user_id = auth.uid()
      )
    )
  );

-- Allow admins and trainers to upload files
CREATE POLICY "Admins and trainers can upload course files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-files'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );

-- Allow admins and trainers to delete files
CREATE POLICY "Admins and trainers can delete course files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-files'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );