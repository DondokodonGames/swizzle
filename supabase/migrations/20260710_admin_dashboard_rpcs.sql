-- WP60 P1-5: 管理ダッシュボード用 RPC
--
-- docs/analytics/queries.md の手動SQLをそのままRPC化したもの。
-- SECURITY DEFINER で analytics_events / user_games の RLS を越えて集計するため、
-- 各関数の先頭で public.is_admin() を必ずチェックし、非admin呼び出しは例外にする。

-- ---------------------------------------------------------------
-- 1. DAU / アクティブセッション（日次）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dau_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (day DATE, dau_logged_in BIGINT, active_sessions BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    (created_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS dau_logged_in,
    COUNT(DISTINCT session_id) AS active_sessions
  FROM public.analytics_events
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;

-- ---------------------------------------------------------------
-- 2. 獲得ファネル（session_start → play_start → 連続3プレイ → topup_complete）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_funnel_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  sessions BIGINT, reached_play BIGINT, reached_3plays BIGINT, reached_topup BIGINT,
  pct_play NUMERIC, pct_3plays NUMERIC, pct_topup NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH per_session AS (
    SELECT
      session_id,
      COUNT(*) FILTER (WHERE event_type = 'play_start')     AS n_play_start,
      COUNT(*) FILTER (WHERE event_type = 'bridge_next')    AS n_bridge_next,
      COUNT(*) FILTER (WHERE event_type = 'topup_complete') AS n_topup_complete
    FROM public.analytics_events
    WHERE created_at >= NOW() - (p_days || ' days')::interval
    GROUP BY session_id
  )
  SELECT
    COUNT(*)::BIGINT AS sessions,
    COUNT(*) FILTER (WHERE n_play_start >= 1)::BIGINT AS reached_play,
    COUNT(*) FILTER (WHERE n_bridge_next >= 3)::BIGINT AS reached_3plays,
    COUNT(*) FILTER (WHERE n_topup_complete >= 1)::BIGINT AS reached_topup,
    ROUND(100.0 * COUNT(*) FILTER (WHERE n_play_start >= 1) / NULLIF(COUNT(*), 0), 1) AS pct_play,
    ROUND(100.0 * COUNT(*) FILTER (WHERE n_bridge_next >= 3) / NULLIF(COUNT(*), 0), 1) AS pct_3plays,
    ROUND(100.0 * COUNT(*) FILTER (WHERE n_topup_complete >= 1) / NULLIF(COUNT(*), 0), 1) AS pct_topup
  FROM per_session;
END;
$$;

-- ---------------------------------------------------------------
-- 3. D1 リテンション
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_d1_retention(p_days INTEGER DEFAULT 30)
RETURNS TABLE (cohort_day DATE, cohort_size BIGINT, retained_d1 BIGINT, d1_retention_pct NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH user_days AS (
    SELECT DISTINCT user_id, (created_at AT TIME ZONE 'Asia/Tokyo')::date AS active_day
    FROM public.analytics_events
    WHERE user_id IS NOT NULL
  ),
  first_day AS (
    SELECT user_id, MIN(active_day) AS day0 FROM user_days GROUP BY user_id
  )
  SELECT
    f.day0 AS cohort_day,
    COUNT(*)::BIGINT AS cohort_size,
    COUNT(d1.user_id)::BIGINT AS retained_d1,
    ROUND(100.0 * COUNT(d1.user_id) / NULLIF(COUNT(*), 0), 1) AS d1_retention_pct
  FROM first_day f
  LEFT JOIN user_days d1 ON d1.user_id = f.user_id AND d1.active_day = f.day0 + 1
  WHERE f.day0 >= (NOW() AT TIME ZONE 'Asia/Tokyo')::date - (p_days || ' days')::interval
  GROUP BY f.day0
  ORDER BY f.day0 DESC;
END;
$$;

-- ---------------------------------------------------------------
-- 4. ゲーム別 完走率・スキップ率
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_game_completion_stats(p_days INTEGER DEFAULT 30, p_min_plays INTEGER DEFAULT 10)
RETURNS TABLE (game_id TEXT, title TEXT, starts BIGINT, completion_pct NUMERIC, skip_pct NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.game_id,
    g.title,
    COUNT(*) FILTER (WHERE e.event_type = 'play_start')::BIGINT AS starts,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_type = 'play_end' AND e.properties->>'result' <> 'skip')
          / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'play_start'), 0), 1) AS completion_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_type = 'play_end' AND e.properties->>'result' = 'skip')
          / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'play_start'), 0), 1) AS skip_pct
  FROM public.analytics_events e
  LEFT JOIN public.user_games g ON g.id = e.game_id
  WHERE e.game_id IS NOT NULL
    AND e.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY e.game_id, g.title
  HAVING COUNT(*) FILTER (WHERE e.event_type = 'play_start') >= p_min_plays
  ORDER BY completion_pct DESC NULLS LAST;
END;
$$;

-- ---------------------------------------------------------------
-- 5. ゲーム別売上ランキング
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revenue_by_game(p_days INTEGER DEFAULT 30)
RETURNS TABLE (game_id TEXT, title TEXT, purchase_count BIGINT, revenue_yen NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.game_id,
    g.title,
    COUNT(*)::BIGINT AS purchase_count,
    SUM((e.properties->>'amount_yen')::numeric) AS revenue_yen
  FROM public.analytics_events e
  LEFT JOIN public.user_games g ON g.id = e.game_id
  WHERE e.event_type = 'purchase'
    AND e.game_id IS NOT NULL
    AND e.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY e.game_id, g.title
  ORDER BY revenue_yen DESC
  LIMIT 50;
END;
$$;

-- ---------------------------------------------------------------
-- 6. 収益手段別の内訳
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revenue_by_method(p_days INTEGER DEFAULT 30)
RETURNS TABLE (method TEXT, purchase_count BIGINT, revenue_yen NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.properties->>'method' AS method,
    COUNT(*)::BIGINT AS purchase_count,
    SUM((e.properties->>'amount_yen')::numeric) AS revenue_yen
  FROM public.analytics_events e
  WHERE e.event_type = 'purchase'
    AND e.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY revenue_yen DESC;
END;
$$;

-- ---------------------------------------------------------------
-- 7. マネタイズ導線ファネル（topup open→complete, subscribe）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_monetization_funnel(p_days INTEGER DEFAULT 30)
RETURNS TABLE (topup_opens BIGINT, topup_completes BIGINT, subscribes BIGINT, topup_conv_pct NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'topup_open')::BIGINT AS topup_opens,
    COUNT(*) FILTER (WHERE event_type = 'topup_complete')::BIGINT AS topup_completes,
    COUNT(*) FILTER (WHERE event_type = 'subscribe')::BIGINT AS subscribes,
    ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'topup_complete')
          / NULLIF(COUNT(*) FILTER (WHERE event_type = 'topup_open'), 0), 1) AS topup_conv_pct
  FROM public.analytics_events
  WHERE created_at >= NOW() - (p_days || ' days')::interval;
END;
$$;

-- ---------------------------------------------------------------
-- 8. ユーザー管理: 検索
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_search_users(p_query TEXT DEFAULT '', p_limit INTEGER DEFAULT 50)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, is_admin BOOLEAN, created_at TIMESTAMPTZ, game_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.username, p.display_name, p.is_admin, p.created_at,
    (SELECT COUNT(*) FROM public.user_games ug WHERE ug.creator_id = p.id)::BIGINT AS game_count
  FROM public.profiles p
  WHERE p_query = '' OR p.username ILIKE '%' || p_query || '%' OR p.display_name ILIKE '%' || p_query || '%'
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------
-- 9. ユーザー管理: ban（本人の全公開ゲームを非公開化）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_ban_user_games(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.user_games SET is_published = false
  WHERE creator_id = p_user_id AND is_published = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------
-- 10. ユーザー管理: is_admin 付与/剥奪
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_is_admin(p_user_id UUID, p_is_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.profiles SET is_admin = p_is_admin WHERE id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------
-- 権限: authenticated のみ実行可（内部で is_admin() を再チェックするため安全）
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_dau_stats(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_funnel_stats(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_d1_retention(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_game_completion_stats(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revenue_by_game(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revenue_by_method(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_monetization_funnel(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_search_users(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ban_user_games(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_is_admin(UUID, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_dau_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_funnel_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_d1_retention(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_game_completion_stats(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_by_game(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_by_method(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_monetization_funnel(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user_games(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_is_admin(UUID, BOOLEAN) TO authenticated;
