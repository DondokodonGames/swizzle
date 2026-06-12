-- =============================================================
-- Migration: アナリティクス基盤（自前イベントテーブル / WP41）
-- Date: 2026-06-12
--
-- 概要:
--   - analytics_events テーブル追加（時系列イベント計測）
--   - RLS: INSERT は全員可（匿名 anon 含む）/ SELECT は admin のみ
--   - 書き込みはクライアント側でベストエフォート（計測失敗が UX を壊さない）
--
-- 方式選択（人間ゲート）: A案（自前テーブル）を採用。
--   理由・比較は docs/work-plans/41-analytics-foundation.md の
--   「方式比較 / 選択結果」セクションを参照。
-- =============================================================

-- ---------------------------------------------------------------
-- 1. analytics_events テーブル
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- user_id は nullable（匿名プレイも計測する）。ユーザー削除時は NULL 化して履歴を保持。
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  -- game_id は user_games.id（text）への論理参照。匿名/非ゲームイベントでは NULL。
  -- FK は張らない（ゲーム削除後もイベント履歴を残すため）。
  game_id     TEXT,
  properties  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.analytics_events IS
  'WP41: 時系列イベント計測（DAU/ファネル/リテンション）。INSERT は全員可・SELECT は admin のみ。';

-- ---------------------------------------------------------------
-- 2. インデックス（集計クエリ最適化）
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id    ON public.analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_game_id    ON public.analytics_events (game_id);

-- ---------------------------------------------------------------
-- 3. RLS ポリシー
-- ---------------------------------------------------------------
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- INSERT: 全員可（匿名 anon + authenticated）。
-- ただし user_id のなりすましは防止する（自分の uid か NULL のみ許可）。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analytics_events' AND policyname = 'analytics_events_insert_all'
  ) THEN
    CREATE POLICY "analytics_events_insert_all" ON public.analytics_events
      FOR INSERT
      WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;
END $$;

-- SELECT: admin のみ。
-- public.is_admin() は 20260512_profiles_is_admin.sql で定義済み（SECURITY DEFINER）。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analytics_events' AND policyname = 'analytics_events_select_admin'
  ) THEN
    CREATE POLICY "analytics_events_select_admin" ON public.analytics_events
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 4. 権限付与
--   anon にも INSERT を許可（匿名プレイの計測）。
--   SELECT は authenticated に付与するが、実際の可否は RLS(is_admin) が制御する。
-- ---------------------------------------------------------------
GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
