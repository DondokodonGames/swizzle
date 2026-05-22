CREATE TABLE nfc_spots (
  id          text PRIMARY KEY,
  game_id     uuid REFERENCES user_games(id) ON DELETE SET NULL,
  name        text,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE nfc_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_nfc_spots" ON nfc_spots FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "public_read_nfc_spots" ON nfc_spots FOR SELECT USING (true);
