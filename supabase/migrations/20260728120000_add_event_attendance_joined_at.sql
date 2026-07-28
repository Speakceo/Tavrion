ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS joined_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_event_attendees_joined_at
  ON event_attendees (joined_at)
  WHERE joined_at IS NOT NULL;
