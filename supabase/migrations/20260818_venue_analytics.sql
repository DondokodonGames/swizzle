-- =============================================================
-- Migration: 拠点(NFC spot)計測基盤
-- Date: 2026-08-18
--
-- 目的:
--   「どの拠点でどのゲームが当たるか」「1拠点あたり月いくらか」を計測可能にする。
--   これまで nfc_spots は「1スポット=1ゲーム」のリダイレクト先でしかなく、
--   analytics_events に拠点の次元が無かったため、設置台の数字が一切取れなかった。
--
--   本マイグレーションで追加するもの:
--     1. nfc_spots に拠点メタ(業態/客層/エリア/稼働)
--     2. nfc_spot_games — 拠点ごとの複数ゲームのラインナップ(ローテーション出題用)
--     3. analytics_events.spot_id — 全イベントへの拠点帰属
--     4. 拠点別 / 拠点×ゲーム別 / 拠点日次 の集計 RPC(admin 限定)
--
--   売上は analytics_events の 'purchase' イベント
--   (properties.amount_yen / properties.method)を集計源とする。
--   既存の admin_revenue_by_game と同じ方式に揃えてある。
-- =============================================================

-- ---------------------------------------------------------------
-- 1. nfc_spots: 拠点メタ
-- ---------------------------------------------------------------
-- venue_type: izakaya / bar / shokudo / cafe / arcade / hotel / event / other
-- audience  : local(地元) / inbound(訪日客) / mixed
-- 実証済みの「拠点×客層で当たりが違う」を分析軸として持たせるための列。
ALTER TABLE public.nfc_spots
  ADD COLUMN IF NOT EXISTS venue_type TEXT,
  ADD COLUMN IF NOT EXISTS audience   TEXT,
  ADD COLUMN IF NOT EXISTS area       TEXT,
  ADD COLUMN IF NOT EXISTS active     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes      TEXT;

COMMENT ON COLUMN public.nfc_spots.venue_type IS '業態: izakaya/bar/shokudo/cafe/arcade/hotel/event/other';
COMMENT ON COLUMN public.nfc_spots.audience   IS '客層: local/inbound/mixed';
COMMENT ON COLUMN public.nfc_spots.area       IS '設置エリア(自由記述: 渋谷/浅草 など)';
COMMENT ON COLUMN public.nfc_spots.active     IS '稼働中フラグ。撤去済みの台を集計から外す用途';
COMMENT ON COLUMN public.nfc_spots.game_id    IS '【非推奨】単体ゲーム設定。nfc_spot_games が空のときのみフォールバックとして使う';

-- ---------------------------------------------------------------
-- 2. nfc_spot_games: 拠点ごとのラインナップ
-- ---------------------------------------------------------------
-- 1拠点に複数ゲームを並べ、NFCタップごとにローテーション出題する。
-- 同一拠点で複数タイトルを回すことで初めて「その拠点でどれが当たるか」の
-- 比較データが取れる(1拠点1ゲームでは拠点間比較しかできない)。
CREATE TABLE IF NOT EXISTS public.nfc_spot_games (
  spot_id    TEXT    NOT NULL REFERENCES public.nfc_spots(id)  ON DELETE CASCADE,
  game_id    TEXT    NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (spot_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_nfc_spot_games_spot
  ON public.nfc_spot_games (spot_id, sort_order);

ALTER TABLE public.nfc_spot_games ENABLE ROW LEVEL SECURITY;

-- admin 判定は public.is_admin()(SECURITY DEFINER)を使う。
-- profiles を直接 EXISTS で引くと profiles 側の RLS に依存し、将来 profiles の
-- 公開読み取りを絞った瞬間に管理者のラインナップ編集が黙って壊れる。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nfc_spot_games' AND policyname = 'admins_manage_nfc_spot_games'
  ) THEN
    CREATE POLICY "admins_manage_nfc_spot_games" ON public.nfc_spot_games FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 匿名プレイヤー(NFCタップ直後は anon)がラインナップを読めないと出題できない
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nfc_spot_games' AND policyname = 'public_read_nfc_spot_games'
  ) THEN
    CREATE POLICY "public_read_nfc_spot_games" ON public.nfc_spot_games FOR SELECT USING (TRUE);
  END IF;
END $$;

-- 既定権限に暗黙依存しないよう明示する(読めないと出題できず、拠点計測が丸ごと止まる)。
-- 書き込みは RLS 側で admin に限定される。
GRANT SELECT ON public.nfc_spot_games TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nfc_spot_games TO authenticated;

-- 既存の 1スポット1ゲーム設定をラインナップへ移送(冪等)
INSERT INTO public.nfc_spot_games (spot_id, game_id, sort_order, enabled)
SELECT s.id, s.game_id, 0, TRUE
FROM public.nfc_spots s
WHERE s.game_id IS NOT NULL
ON CONFLICT (spot_id, game_id) DO NOTHING;

-- ---------------------------------------------------------------
-- 3. analytics_events: 拠点帰属
-- ---------------------------------------------------------------
-- クライアントは NFC 到着時に spot コンテキストを掴み、そのタブセッションの
-- 全イベントに spot_id を付ける。NULL = 拠点経由でない通常のWeb流入。
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS spot_id TEXT;

COMMENT ON COLUMN public.analytics_events.spot_id IS
  '拠点帰属(nfc_spots.id への論理参照)。NFC/QR経由で到着したセッションのみ非NULL。FKは張らない(スポット削除後も履歴を残す)';

CREATE INDEX IF NOT EXISTS idx_analytics_events_spot_id
  ON public.analytics_events (spot_id) WHERE spot_id IS NOT NULL;

-- 拠点別×期間の集計が主クエリなので複合indexも張る
CREATE INDEX IF NOT EXISTS idx_analytics_events_spot_created
  ON public.analytics_events (spot_id, created_at) WHERE spot_id IS NOT NULL;

-- ---------------------------------------------------------------
-- 4. 集計 RPC(全て admin 限定 / SECURITY DEFINER)
-- ---------------------------------------------------------------

-- 4-1. 拠点別サマリ: 1拠点あたりの月次売上(= 実証6,000円 vs 計画2.4万円の検証軸)
CREATE OR REPLACE FUNCTION public.admin_spot_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  spot_id TEXT, spot_name TEXT, venue_type TEXT, audience TEXT, area TEXT, active BOOLEAN,
  sessions BIGINT, plays BIGINT, plays_per_session NUMERIC,
  purchases BIGINT, revenue_yen NUMERIC, revenue_per_session NUMERIC,
  revenue_per_30d NUMERIC, last_event_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      e.spot_id,
      COUNT(DISTINCT e.session_id)                                  AS sessions,
      COUNT(*) FILTER (WHERE e.event_type = 'play_start')            AS plays,
      COUNT(*) FILTER (WHERE e.event_type = 'purchase')              AS purchases,
      COALESCE(SUM((e.properties->>'amount_yen')::numeric)
               FILTER (WHERE e.event_type = 'purchase'), 0)          AS revenue_yen,
      MAX(e.created_at)                                              AS last_event_at
    FROM public.analytics_events e
    WHERE e.spot_id IS NOT NULL
      AND e.created_at >= NOW() - (p_days || ' days')::interval
    GROUP BY e.spot_id
  )
  SELECT
    s.id, s.name, s.venue_type, s.audience, s.area, s.active,
    COALESCE(a.sessions, 0)::BIGINT,
    COALESCE(a.plays, 0)::BIGINT,
    ROUND(COALESCE(a.plays, 0)::numeric / NULLIF(a.sessions, 0), 2),
    COALESCE(a.purchases, 0)::BIGINT,
    COALESCE(a.revenue_yen, 0),
    ROUND(COALESCE(a.revenue_yen, 0) / NULLIF(a.sessions, 0), 1),
    -- 期間を30日に正規化した月次換算(傾きの比較用)
    ROUND(COALESCE(a.revenue_yen, 0) * 30.0 / NULLIF(p_days, 0), 0),
    a.last_event_at
  FROM public.nfc_spots s
  LEFT JOIN agg a ON a.spot_id = s.id
  ORDER BY COALESCE(a.revenue_yen, 0) DESC, COALESCE(a.plays, 0) DESC;
END;
$$;

-- 4-2. 拠点×ゲーム: 「どの拠点でどれが当たるか」
CREATE OR REPLACE FUNCTION public.admin_spot_game_stats(
  p_spot_id TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30,
  p_min_plays INTEGER DEFAULT 0
)
RETURNS TABLE (
  spot_id TEXT, spot_name TEXT, venue_type TEXT, audience TEXT,
  game_id TEXT, title TEXT,
  starts BIGINT, sessions BIGINT, plays_per_session NUMERIC,
  completion_pct NUMERIC, skip_pct NUMERIC,
  revenue_yen NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.spot_id,
    s.name,
    s.venue_type,
    s.audience,
    e.game_id,
    g.title,
    COUNT(*) FILTER (WHERE e.event_type = 'play_start')::BIGINT AS starts,
    COUNT(DISTINCT e.session_id)::BIGINT AS sessions,
    ROUND(COUNT(*) FILTER (WHERE e.event_type = 'play_start')::numeric
          / NULLIF(COUNT(DISTINCT e.session_id), 0), 2) AS plays_per_session,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_type = 'play_end' AND e.properties->>'result' <> 'skip')
          / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'play_start'), 0), 1) AS completion_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_type = 'play_end' AND e.properties->>'result' = 'skip')
          / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'play_start'), 0), 1) AS skip_pct,
    COALESCE(SUM((e.properties->>'amount_yen')::numeric)
             FILTER (WHERE e.event_type = 'purchase'), 0) AS revenue_yen
  FROM public.analytics_events e
  LEFT JOIN public.nfc_spots  s ON s.id = e.spot_id
  LEFT JOIN public.user_games g ON g.id = e.game_id
  WHERE e.spot_id IS NOT NULL
    AND e.game_id IS NOT NULL
    AND (p_spot_id IS NULL OR e.spot_id = p_spot_id)
    AND e.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY e.spot_id, s.name, s.venue_type, s.audience, e.game_id, g.title
  HAVING COUNT(*) FILTER (WHERE e.event_type = 'play_start') >= p_min_plays
  ORDER BY e.spot_id, starts DESC;
END;
$$;

-- 4-3. 拠点日次: 傾き(トラクション)を見るための時系列
CREATE OR REPLACE FUNCTION public.admin_spot_daily(
  p_spot_id TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (day DATE, spot_id TEXT, sessions BIGINT, plays BIGINT, revenue_yen NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    (e.created_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
    e.spot_id,
    COUNT(DISTINCT e.session_id)::BIGINT AS sessions,
    COUNT(*) FILTER (WHERE e.event_type = 'play_start')::BIGINT AS plays,
    COALESCE(SUM((e.properties->>'amount_yen')::numeric)
             FILTER (WHERE e.event_type = 'purchase'), 0) AS revenue_yen
  FROM public.analytics_events e
  WHERE e.spot_id IS NOT NULL
    AND (p_spot_id IS NULL OR e.spot_id = p_spot_id)
    AND e.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2;
END;
$$;

-- 4-4. 客層別: インバウンド拠点の優位性を検証する軸
CREATE OR REPLACE FUNCTION public.admin_spot_audience_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  audience TEXT, venue_type TEXT, spot_count BIGINT,
  sessions BIGINT, plays BIGINT, revenue_yen NUMERIC,
  revenue_per_spot_30d NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(s.audience, 'unknown'),
    COALESCE(s.venue_type, 'unknown'),
    COUNT(DISTINCT s.id)::BIGINT,
    COUNT(DISTINCT e.session_id)::BIGINT,
    COUNT(*) FILTER (WHERE e.event_type = 'play_start')::BIGINT,
    COALESCE(SUM((e.properties->>'amount_yen')::numeric)
             FILTER (WHERE e.event_type = 'purchase'), 0),
    ROUND(
      COALESCE(SUM((e.properties->>'amount_yen')::numeric)
               FILTER (WHERE e.event_type = 'purchase'), 0)
      * 30.0 / NULLIF(p_days, 0) / NULLIF(COUNT(DISTINCT s.id), 0), 0)
  FROM public.nfc_spots s
  LEFT JOIN public.analytics_events e
    ON e.spot_id = s.id
   AND e.created_at >= NOW() - (p_days || ' days')::interval
  WHERE s.active = TRUE
  GROUP BY 1, 2
  ORDER BY 7 DESC NULLS LAST;
END;
$$;

-- ---------------------------------------------------------------
-- 5. 権限: authenticated のみ実行可(内部で is_admin() を再チェック)
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_spot_stats(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_spot_game_stats(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_spot_daily(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_spot_audience_stats(INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_spot_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_spot_game_stats(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_spot_daily(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_spot_audience_stats(INTEGER) TO authenticated;
