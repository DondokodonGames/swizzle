-- Supabase SQL Editorで実行するマイグレーション
-- user_gamesテーブルにcategoryカラムを追加

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'arcade';

-- インデックス（カテゴリ別件数確認を高速化）
CREATE INDEX IF NOT EXISTS idx_user_games_category
  ON user_games (creator_id, category);

-- 確認クエリ
SELECT
  category,
  COUNT(*) AS count
FROM user_games
GROUP BY category
ORDER BY count DESC;
