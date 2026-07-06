-- user_games に発見性・パーソナライズ用のタグ列を追加
--
-- mechanic     : 主メカニクス(MECHANICS_CATALOG_V2 のID。例: 'timing_one_shot', 'slingshot')
--                フィードの「同一メカニクス連続回避」インターリーブと多様性レポートに使う。
-- theme        : 世界観テーマ(例: 'space', 'cooking', 'animal')。同上。
-- trend_source : SNSトレンド由来のゲームの元ネタ識別子(ai:neta:trend が付与)。
--                「いまのネタ」フィードセクションの抽出キー。
--
-- 値の供給元はアップローダー(run-upload-examples.ts / SupabaseUploader)。
-- ゲームファイル先頭の @mechanic / @theme ヘッダーコメントから解釈される。

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS mechanic TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS trend_source TEXT;

-- フィードの多様性集計・トレンド抽出用
CREATE INDEX IF NOT EXISTS idx_user_games_mechanic
  ON user_games (mechanic)
  WHERE mechanic IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_games_trend_source
  ON user_games (trend_source, created_at DESC)
  WHERE trend_source IS NOT NULL;
