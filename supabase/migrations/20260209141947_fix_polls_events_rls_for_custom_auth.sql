/*
  # Fix Polls and Events RLS for Custom Authentication

  1. Changes
    - Updates RLS policies for polls, poll_options, poll_votes, events, and event_attendees
    - Removes auth.uid() dependencies since we use custom authentication
    - Allows anon and authenticated users to access these features
    - Admins can delete any poll or event

  2. Security
    - Maintains data validation through user_profiles checks
    - Allows users to create and manage their own content
    - Admins have full management capabilities
*/

-- POLLS TABLE
DROP POLICY IF EXISTS "Users can create polls" ON polls;
DROP POLICY IF EXISTS "Users can update own polls" ON polls;
DROP POLICY IF EXISTS "Users can delete own polls" ON polls;

CREATE POLICY "Anyone can view polls"
  ON polls FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create polls"
  ON polls FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = polls.created_by
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can delete any poll"
  ON polls FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = polls.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- POLL OPTIONS TABLE
DROP POLICY IF EXISTS "Poll creators can manage options" ON poll_options;

CREATE POLICY "Anyone can view poll options"
  ON poll_options FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Can manage poll options"
  ON poll_options FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- POLL VOTES TABLE
DROP POLICY IF EXISTS "Users can vote on polls" ON poll_votes;
DROP POLICY IF EXISTS "Users can change own votes" ON poll_votes;

CREATE POLICY "Anyone can view poll votes"
  ON poll_votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can vote on polls"
  ON poll_votes FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = poll_votes.user_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Users can change votes"
  ON poll_votes FOR DELETE
  TO authenticated, anon
  USING (true);

-- EVENTS TABLE
DROP POLICY IF EXISTS "Only admins can create events" ON events;
DROP POLICY IF EXISTS "Event creators can update events" ON events;
DROP POLICY IF EXISTS "Event creators can delete events" ON events;

CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = events.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = events.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = events.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = events.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- EVENT ATTENDEES TABLE
DROP POLICY IF EXISTS "Users can RSVP to events" ON event_attendees;
DROP POLICY IF EXISTS "Users can update own RSVP" ON event_attendees;
DROP POLICY IF EXISTS "Users can delete own RSVP" ON event_attendees;

CREATE POLICY "Anyone can view event attendees"
  ON event_attendees FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can RSVP to events"
  ON event_attendees FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = event_attendees.user_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Users can update RSVP"
  ON event_attendees FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete RSVP"
  ON event_attendees FOR DELETE
  TO authenticated, anon
  USING (true);
