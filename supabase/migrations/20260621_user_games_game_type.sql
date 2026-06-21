-- user_games に game_type カラムを追加
--
-- JSサンドボックスゲーム (game_type = 'code') と
-- 従来のif-thenルールゲーム (game_type = 'rules') を区別するための識別子。
-- 既存レコードはすべて 'rules' 扱いとなるよう DEFAULT 'rules' を設定。

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'rules'
  CHECK (game_type IN ('rules', 'code'));

CREATE INDEX IF NOT EXISTS idx_user_games_game_type
  ON user_games (game_type, created_at DESC);
