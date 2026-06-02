-- user_games に category カラムを追加
--
-- これまで category カラムはルートの一次スクリプト add-category-column.sql で
-- Supabase SQL Editor に手動適用されており、マイグレーション履歴に存在しなかった。
-- 新規DB構築でもスキーマが再現されるよう、正式なマイグレーションとして取り込む。
-- 既存環境では適用済みのため IF NOT EXISTS で冪等に動作する。

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'arcade';

-- カテゴリ別件数確認を高速化するインデックス
CREATE INDEX IF NOT EXISTS idx_user_games_category
  ON user_games (creator_id, category);
