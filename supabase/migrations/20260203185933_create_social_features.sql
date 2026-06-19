/*
  # Social Features Schema

  1. New Tables
    
    ## Social Posts
    - `social_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `content` (text)
      - `media_url` (text, optional)
      - `media_type` (text, optional - image, video, document)
      - `visibility` (text - public, team, private)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `social_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references social_posts)
      - `user_id` (uuid, references user_profiles)
      - `content` (text)
      - `created_at` (timestamptz)
    
    - `social_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references social_posts)
      - `user_id` (uuid, references user_profiles)
      - `created_at` (timestamptz)
      - unique constraint on (post_id, user_id)
    
    ## Polls
    - `polls`
      - `id` (uuid, primary key)
      - `created_by` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text, optional)
      - `end_date` (timestamptz, optional)
      - `allow_multiple` (boolean)
      - `anonymous` (boolean)
      - `created_at` (timestamptz)
    
    - `poll_options`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, references polls)
      - `option_text` (text)
      - `order_index` (integer)
    
    - `poll_votes`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, references polls)
      - `option_id` (uuid, references poll_options)
      - `user_id` (uuid, references user_profiles)
      - `created_at` (timestamptz)
    
    ## Events
    - `events`
      - `id` (uuid, primary key)
      - `created_by` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text)
      - `event_date` (timestamptz)
      - `end_date` (timestamptz, optional)
      - `location` (text, optional)
      - `virtual_link` (text, optional)
      - `max_attendees` (integer, optional)
      - `created_at` (timestamptz)
    
    - `event_attendees`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `user_id` (uuid, references user_profiles)
      - `status` (text - attending, maybe, declined)
      - `created_at` (timestamptz)
      - unique constraint on (event_id, user_id)
    
    ## Saved Items
    - `saved_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `item_type` (text - post, course, event, poll)
      - `item_id` (uuid)
      - `created_at` (timestamptz)
      - unique constraint on (user_id, item_type, item_id)
    
    ## Shots (Short Content)
    - `shots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text, optional)
      - `media_url` (text)
      - `media_type` (text - video, image)
      - `duration` (integer, optional - in seconds)
      - `views_count` (integer, default 0)
      - `created_at` (timestamptz)
    
    - `shot_likes`
      - `id` (uuid, primary key)
      - `shot_id` (uuid, references shots)
      - `user_id` (uuid, references user_profiles)
      - `created_at` (timestamptz)
      - unique constraint on (shot_id, user_id)
    
    ## Teams
    - `teams`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text, optional)
      - `created_by` (uuid, references user_profiles)
      - `created_at` (timestamptz)
    
    - `team_members`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `user_id` (uuid, references user_profiles)
      - `role` (text - admin, member)
      - `joined_at` (timestamptz)
      - unique constraint on (team_id, user_id)
    
    ## Vault (Document Storage)
    - `vault_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text, optional)
      - `file_path` (text)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size` (bigint)
      - `folder` (text, optional)
      - `is_shared` (boolean, default false)
      - `created_at` (timestamptz)
    
    ## Channels
    - `channels`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text, optional)
      - `created_by` (uuid, references user_profiles)
      - `is_public` (boolean, default true)
      - `created_at` (timestamptz)
    
    - `channel_members`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, references channels)
      - `user_id` (uuid, references user_profiles)
      - `role` (text - admin, member)
      - `joined_at` (timestamptz)
      - unique constraint on (channel_id, user_id)
    
    - `channel_messages`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, references channels)
      - `user_id` (uuid, references user_profiles)
      - `message` (text)
      - `media_url` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own content
    - Add policies for viewing public content
    - Add policies for team/channel members
*/

-- Social Posts
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  media_url text,
  media_type text,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'team', 'private')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  end_date timestamptz,
  allow_multiple boolean DEFAULT false,
  anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  order_index integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  virtual_link text,
  max_attendees integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Saved Items
CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('post', 'course', 'event', 'poll', 'shot')),
  item_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Shots
CREATE TABLE IF NOT EXISTS shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('video', 'image')),
  duration integer,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shot_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id uuid REFERENCES shots(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shot_id, user_id)
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Vault
CREATE TABLE IF NOT EXISTS vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  folder text,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  media_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

-- Social Posts Policies
CREATE POLICY "Users can view public posts"
  ON social_posts FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create own posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON social_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Social Comments Policies
CREATE POLICY "Users can view comments on visible posts"
  ON social_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = social_comments.post_id
      AND (social_posts.visibility = 'public' OR social_posts.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments"
  ON social_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON social_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Social Likes Policies
CREATE POLICY "Users can view likes"
  ON social_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create likes"
  ON social_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON social_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Polls Policies
CREATE POLICY "Users can view polls"
  ON polls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own polls"
  ON polls FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own polls"
  ON polls FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Poll Options Policies
CREATE POLICY "Users can view poll options"
  ON poll_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Poll creators can manage options"
  ON poll_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
      AND polls.created_by = auth.uid()
    )
  );

-- Poll Votes Policies
CREATE POLICY "Users can view poll votes"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can vote on polls"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can change own votes"
  ON poll_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Events Policies
CREATE POLICY "Users can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Event creators can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Event creators can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Event Attendees Policies
CREATE POLICY "Users can view event attendees"
  ON event_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can RSVP to events"
  ON event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own RSVP"
  ON event_attendees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own RSVP"
  ON event_attendees FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Saved Items Policies
CREATE POLICY "Users can view own saved items"
  ON saved_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save items"
  ON saved_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave items"
  ON saved_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Shots Policies
CREATE POLICY "Users can view shots"
  ON shots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create shots"
  ON shots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own shots"
  ON shots FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own shots"
  ON shots FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Shot Likes Policies
CREATE POLICY "Users can view shot likes"
  ON shot_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like shots"
  ON shot_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike shots"
  ON shot_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Teams Policies
CREATE POLICY "Users can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team creators can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team creators can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Team Members Policies
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team admins can manage members"
  ON team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- Vault Policies
CREATE POLICY "Users can view own vault items"
  ON vault_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can create vault items"
  ON vault_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vault items"
  ON vault_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vault items"
  ON vault_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Channels Policies
CREATE POLICY "Users can view public channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channels.id
      AND channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Channel creators can update channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Channel creators can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Channel Members Policies
CREATE POLICY "Users can view channel members"
  ON channel_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
      AND (channels.is_public = true OR channels.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can join public channels"
  ON channel_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
      AND channels.is_public = true
    )
  );

CREATE POLICY "Channel admins can manage members"
  ON channel_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
    OR user_id = auth.uid()
  );

-- Channel Messages Policies
CREATE POLICY "Channel members can view messages"
  ON channel_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channel_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Channel members can send messages"
  ON channel_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channel_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages"
  ON channel_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_comments_post_id ON social_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_post_id ON social_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shots_created_at ON shots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON channel_messages(created_at DESC);
