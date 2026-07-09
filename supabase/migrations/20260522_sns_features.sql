ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS tiktok_video_url   text,
  ADD COLUMN IF NOT EXISTS tiktok_posted_at   timestamptz;

CREATE TABLE marketing_post_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id       text REFERENCES user_games(id) ON DELETE SET NULL,
  platform      text NOT NULL CHECK (platform IN ('twitter', 'instagram', 'tiktok')),
  success       boolean NOT NULL,
  post_id       text,
  error_message text,
  posted_at     timestamptz DEFAULT now()
);

ALTER TABLE marketing_post_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_post_log" ON marketing_post_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
