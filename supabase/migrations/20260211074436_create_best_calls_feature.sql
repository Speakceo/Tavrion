/*
  # Create Best Calls Feature

  1. New Tables
    - `best_calls`
      - `id` (uuid, primary key)
      - `title` (text) - Title/name of the call recording
      - `description` (text) - Description of the call
      - `category` (text) - Category: objection_handling, urgency, rapport_building, closing, discovery, follow_up
      - `file_name` (text) - Original file name
      - `file_path` (text) - Path in storage bucket
      - `file_size` (bigint) - File size in bytes
      - `duration` (integer) - Duration in seconds (optional)
      - `uploaded_by` (uuid) - Reference to user_profiles
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `best_call_likes`
      - `id` (uuid, primary key)
      - `call_id` (uuid) - Reference to best_calls
      - `user_id` (uuid) - Reference to user_profiles
      - `created_at` (timestamptz)

    - `best_call_comments`
      - `id` (uuid, primary key)
      - `call_id` (uuid) - Reference to best_calls
      - `user_id` (uuid) - Reference to user_profiles
      - `comment` (text)
      - `created_at` (timestamptz)

  2. Storage
    - Create `call-recordings` bucket for audio files

  3. Security
    - Enable RLS on all tables
    - Admins can create, update, delete best calls
    - All authenticated users can view best calls
    - Users can like and comment on calls
*/

-- Create best_calls table
CREATE TABLE IF NOT EXISTS best_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL CHECK (category IN ('objection_handling', 'urgency', 'rapport_building', 'closing', 'discovery', 'follow_up')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  duration integer,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (uploaded_by) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create best_call_likes table
CREATE TABLE IF NOT EXISTS best_call_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (call_id) REFERENCES best_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  UNIQUE(call_id, user_id)
);

-- Create best_call_comments table
CREATE TABLE IF NOT EXISTS best_call_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (call_id) REFERENCES best_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE best_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_call_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_call_comments ENABLE ROW LEVEL SECURITY;

-- Best Calls Policies
CREATE POLICY "Anyone can view best calls"
  ON best_calls FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert best calls"
  ON best_calls FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = uploaded_by AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update best calls"
  ON best_calls FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT id FROM user_profiles WHERE id = uploaded_by LIMIT 1)
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete best calls"
  ON best_calls FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = uploaded_by AND up.role = 'admin'
    )
  );

-- Best Call Likes Policies
CREATE POLICY "Anyone can view likes"
  ON best_call_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can like calls"
  ON best_call_likes FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_id
    )
  );

CREATE POLICY "Users can unlike their own likes"
  ON best_call_likes FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_id
    )
  );

-- Best Call Comments Policies
CREATE POLICY "Anyone can view comments"
  ON best_call_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can add comments"
  ON best_call_comments FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_id
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON best_call_comments FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_id
    )
  );

-- Storage Policies for call-recordings bucket
CREATE POLICY "Anyone can view call recordings"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'call-recordings');

CREATE POLICY "Admins can upload call recordings"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'call-recordings' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can delete call recordings"
  ON storage.objects FOR DELETE
  TO public
  USING (
    bucket_id = 'call-recordings' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_best_calls_category ON best_calls(category);
CREATE INDEX IF NOT EXISTS idx_best_calls_created_at ON best_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_call_likes_call_id ON best_call_likes(call_id);
CREATE INDEX IF NOT EXISTS idx_best_call_comments_call_id ON best_call_comments(call_id);
