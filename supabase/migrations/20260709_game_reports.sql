-- WP60 P0-3: UGC 通報テーブル
--
-- 有料で他人が作ったゲームを遊ばせる以上、悪質コンテンツの通報経路が必須
-- （監査時点で report/block の UI は0件だった）。
-- INSERT は匿名含め全員可（NFCの未ログインプレイからも通報できるように）。
-- SELECT/UPDATE は admin のみ（public.is_admin() は 20260512_profiles_is_admin.sql で定義済み）。

CREATE TABLE IF NOT EXISTS public.game_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     TEXT NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  detail      TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.game_reports IS
  'WP60 P0-3: UGC通報。INSERT は全員可（匿名含む）・SELECT/UPDATE は admin のみ。';

CREATE INDEX IF NOT EXISTS idx_game_reports_game_id ON public.game_reports (game_id);
CREATE INDEX IF NOT EXISTS idx_game_reports_status  ON public.game_reports (status);
CREATE INDEX IF NOT EXISTS idx_game_reports_created_at ON public.game_reports (created_at);

ALTER TABLE public.game_reports ENABLE ROW LEVEL SECURITY;

-- INSERT: 全員可。ただし reporter_id のなりすましは防止する（自分の uid か NULL のみ許可）。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'game_reports' AND policyname = 'game_reports_insert_all'
  ) THEN
    CREATE POLICY "game_reports_insert_all" ON public.game_reports
      FOR INSERT
      WITH CHECK (reporter_id IS NULL OR auth.uid() = reporter_id);
  END IF;
END $$;

-- SELECT: admin のみ。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'game_reports' AND policyname = 'game_reports_select_admin'
  ) THEN
    CREATE POLICY "game_reports_select_admin" ON public.game_reports
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

-- UPDATE: admin のみ（ステータス変更・非公開化の記録用）。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'game_reports' AND policyname = 'game_reports_update_admin'
  ) THEN
    CREATE POLICY "game_reports_update_admin" ON public.game_reports
      FOR UPDATE
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

GRANT INSERT ON public.game_reports TO anon;
GRANT INSERT ON public.game_reports TO authenticated;
GRANT SELECT, UPDATE ON public.game_reports TO authenticated;
