/*
  # Fix saved_items RLS for custom (anon) auth

  The LMS uses custom auth with the anon key, so auth.uid() is always null.
  social_likes / social_posts were already opened to anon; saved_items was missed,
  which made Social bookmarks and the Saved page appear broken (silent no-ops).

  Application filters by user_id from the logged-in profile.
*/

DROP POLICY IF EXISTS "Users can view own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can save items" ON saved_items;
DROP POLICY IF EXISTS "Users can unsave items" ON saved_items;
DROP POLICY IF EXISTS "Allow viewing saved items" ON saved_items;
DROP POLICY IF EXISTS "Allow saving items" ON saved_items;
DROP POLICY IF EXISTS "Allow unsaving items" ON saved_items;

CREATE POLICY "Allow viewing saved items"
  ON saved_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow saving items"
  ON saved_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = saved_items.user_id
      AND is_active = true
    )
  );

CREATE POLICY "Allow unsaving items"
  ON saved_items FOR DELETE
  TO anon, authenticated
  USING (true);
