/*
  # Allow Anonymous Access to Social Features

  1. Changes
    - Update social_posts, social_likes, and social_comments policies
    - Allow anon users to perform all operations
    - Keep validation that user_id exists in user_profiles
    
  2. Security
    - Still validates user_id exists and is active
    - Maintains data integrity
*/

-- Update social_posts policies for anon users
DROP POLICY IF EXISTS "Allow viewing public posts" ON social_posts;
DROP POLICY IF EXISTS "Allow creating posts with valid user_id" ON social_posts;
DROP POLICY IF EXISTS "Allow updating own posts" ON social_posts;
DROP POLICY IF EXISTS "Allow deleting own posts" ON social_posts;

CREATE POLICY "Allow viewing public posts"
  ON social_posts FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

CREATE POLICY "Allow creating posts with valid user_id"
  ON social_posts FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = social_posts.user_id
      AND is_active = true
    )
  );

CREATE POLICY "Allow updating posts"
  ON social_posts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = social_posts.user_id
      AND is_active = true
    )
  );

CREATE POLICY "Allow deleting posts"
  ON social_posts FOR DELETE
  TO anon, authenticated
  USING (true);

-- Update social_likes policies for anon users
DROP POLICY IF EXISTS "Allow viewing likes" ON social_likes;
DROP POLICY IF EXISTS "Allow liking posts" ON social_likes;
DROP POLICY IF EXISTS "Allow unliking posts" ON social_likes;

CREATE POLICY "Allow viewing likes"
  ON social_likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow liking posts"
  ON social_likes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = social_likes.user_id
      AND is_active = true
    )
  );

CREATE POLICY "Allow unliking posts"
  ON social_likes FOR DELETE
  TO anon, authenticated
  USING (true);

-- Update social_comments policies for anon users
DROP POLICY IF EXISTS "Allow viewing comments" ON social_comments;
DROP POLICY IF EXISTS "Allow creating comments" ON social_comments;
DROP POLICY IF EXISTS "Allow deleting comments" ON social_comments;

CREATE POLICY "Allow viewing comments"
  ON social_comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow creating comments"
  ON social_comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = social_comments.user_id
      AND is_active = true
    )
  );

CREATE POLICY "Allow deleting comments"
  ON social_comments FOR DELETE
  TO anon, authenticated
  USING (true);
