/*
  # Create Presentations Table

  1. New Tables
    - `presentations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `title` (text) - Presentation title/topic
      - `task_id` (text) - Presenton API task ID
      - `status` (text) - Generation status (pending, completed, error)
      - `download_url` (text) - URL to download the presentation
      - `view_url` (text) - URL to view/embed the presentation
      - `params` (jsonb) - Configuration parameters used
      - `error_message` (text) - Error details if generation failed
      - `created_at` (timestamptz) - When generation was initiated
      - `completed_at` (timestamptz) - When generation completed

  2. Security
    - Enable RLS on `presentations` table
    - Add policy for users to read their own presentations
    - Add policy for users to create their own presentations
    - Add policy for users to delete their own presentations
*/

CREATE TABLE IF NOT EXISTS presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  task_id text,
  status text NOT NULL DEFAULT 'pending',
  download_url text,
  view_url text,
  params jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presentations"
  ON presentations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own presentations"
  ON presentations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations"
  ON presentations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations"
  ON presentations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_status ON presentations(status);
CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON presentations(created_at DESC);
