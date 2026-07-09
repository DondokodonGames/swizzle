# Analytics 集計クエリ集（WP41）

`analytics_events` テーブル（`supabase/migrations/20260612_analytics_events.sql`）に対する
管理者向け集計 SQL 集。**Supabase ダッシュボード → SQL Editor** で実行する。

- SELECT は RLS で **admin（`profiles.is_admin = true`）のみ**に制限されている。
  SQL Editor は service_role 相当で実行されるため RLS を貫通して参照できる。
- 時刻は UTC 保存。日本時間で集計したい場合は `created_at AT TIME ZONE 'Asia/Tokyo'` を使う
  （本ドキュメントでは JST 基準で日付を切る）。

## イベント設計（最小セット）

| event_type | 発火箇所 | 主な properties / カラム |
|---|---|---|
| `session_start` | GameSequence（フィード開始） | — |
| `play_start` | GameSequence / PlayGamePage | `game_id`, `index`, `source` |
| `play_end` | GameSequence / PlayGamePage | `game_id`, `duration`(秒), `result`(`success`/`failure`/`skip`), `score` |
| `bridge_next` | GameSequence（連続プレイ） | `game_id`, `nextGameId` |
| `like` | BridgeScreen | `game_id`, `liked`(bool) |
| `share` | BridgeScreen | `game_id`, `platform` |
| `signup` | useAuth | `language` |
| `topup_open` | TopUpButton | `amountYen`, `games` |
| `topup_complete` | ProfilePage（`?topup=success`） | `status` |
| `subscribe` | SubscriptionSuccess | `status` |
| `purchase` | `stripe-webhook`（サーバー側、決済成功時） | `amount_yen`, `method`(`nfc`/`wallet`/`subscription`), `game_id`(nfcのみ) |

---

## 1. DAU（日次アクティブユーザー / アクティブセッション）

匿名ユーザー（`user_id IS NULL`）も多いため、ユーザー基準とセッション基準の両方を出す。

```sql
-- 直近 30 日の DAU（ログインユーザー）と DAS（全セッション）
SELECT
  (created_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
  COUNT(DISTINCT user_id)    FILTER (WHERE user_id IS NOT NULL) AS dau_logged_in,
  COUNT(DISTINCT session_id)                                    AS active_sessions
FROM public.analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## 2. 獲得ファネル（session_start → play_start → 連続プレイ≥3 → topup_complete）

「ゲーム版 TikTok」の核心 KPI。セッション単位で各段階の到達数を数える。

```sql
WITH per_session AS (
  SELECT
    session_id,
    COUNT(*) FILTER (WHERE event_type = 'session_start')   AS n_session_start,
    COUNT(*) FILTER (WHERE event_type = 'play_start')       AS n_play_start,
    COUNT(*) FILTER (WHERE event_type = 'bridge_next')      AS n_bridge_next,
    COUNT(*) FILTER (WHERE event_type = 'topup_complete')   AS n_topup_complete
  FROM public.analytics_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY session_id
)
SELECT
  COUNT(*)                                              AS sessions,
  COUNT(*) FILTER (WHERE n_play_start    >= 1)          AS reached_play,
  COUNT(*) FILTER (WHERE n_bridge_next   >= 3)          AS reached_3plays,   -- セッション内連続プレイ 3 本以上
  COUNT(*) FILTER (WHERE n_topup_complete >= 1)         AS reached_topup,
  ROUND(100.0 * COUNT(*) FILTER (WHERE n_play_start  >= 1) / NULLIF(COUNT(*), 0), 1) AS pct_play,
  ROUND(100.0 * COUNT(*) FILTER (WHERE n_bridge_next >= 3) / NULLIF(COUNT(*), 0), 1) AS pct_3plays,
  ROUND(100.0 * COUNT(*) FILTER (WHERE n_topup_complete >= 1) / NULLIF(COUNT(*), 0), 1) AS pct_topup
FROM per_session;
```

### 2b. 1 セッションあたりの連続プレイ数（分布）

```sql
SELECT
  plays,
  COUNT(*) AS sessions
FROM (
  SELECT session_id, COUNT(*) FILTER (WHERE event_type = 'play_start') AS plays
  FROM public.analytics_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY session_id
) s
GROUP BY plays
ORDER BY plays;
```

---

## 3. D1 リテンション（翌日継続率）

`user_id` が付くログインユーザー基準。各ユーザーの初回アクティブ日 = day0 とし、
その翌日（day0 + 1）に再びイベントがあった割合を出す。

```sql
WITH user_days AS (
  SELECT DISTINCT
    user_id,
    (created_at AT TIME ZONE 'Asia/Tokyo')::date AS active_day
  FROM public.analytics_events
  WHERE user_id IS NOT NULL
),
first_day AS (
  SELECT user_id, MIN(active_day) AS day0
  FROM user_days
  GROUP BY user_id
)
SELECT
  f.day0                                            AS cohort_day,
  COUNT(*)                                          AS cohort_size,
  COUNT(d1.user_id)                                 AS retained_d1,
  ROUND(100.0 * COUNT(d1.user_id) / NULLIF(COUNT(*), 0), 1) AS d1_retention_pct
FROM first_day f
LEFT JOIN user_days d1
  ON d1.user_id = f.user_id
 AND d1.active_day = f.day0 + 1
WHERE f.day0 >= (NOW() AT TIME ZONE 'Asia/Tokyo')::date - INTERVAL '30 days'
GROUP BY f.day0
ORDER BY f.day0 DESC;
```

---

## 4. ゲーム別 完走率・スキップ率

完走率 = `play_end(success/failure)` / `play_start`。スキップ率 = `result='skip'` / `play_start`。
（`play_end` には skip も含まれるため、完走判定は result で分ける）

```sql
SELECT
  e.game_id,
  COUNT(*) FILTER (WHERE e.event_type = 'play_start')                              AS starts,
  COUNT(*) FILTER (WHERE e.event_type = 'play_end')                               AS ends,
  COUNT(*) FILTER (WHERE e.event_type = 'play_end' AND e.properties->>'result' = 'skip')    AS skips,
  COUNT(*) FILTER (WHERE e.event_type = 'play_end' AND e.properties->>'result' = 'success') AS successes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_type = 'play_end'
        AND e.properties->>'result' <> 'skip')
        / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'play_start'), 0), 1)        AS completion_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_type = 'play_end'
        AND e.properties->>'result' = 'skip')
        / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'play_start'), 0), 1)        AS skip_pct
FROM public.analytics_events e
WHERE e.game_id IS NOT NULL
  AND e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY e.game_id
HAVING COUNT(*) FILTER (WHERE e.event_type = 'play_start') >= 10   -- 母数 10 プレイ以上
ORDER BY completion_pct DESC NULLS LAST;
```

---

## 5. 品質スコア × 実プレイの相関（Track 1 改善ループ接続）

AI が付与した `user_games.ai_quality_score` が、実際の完走率・スキップ率と相関しているかを検証する。
スコアが高いのに完走率が低いゲームは、品質スコアラの過大評価候補（要レビュー）。

```sql
WITH game_play AS (
  SELECT
    game_id,
    COUNT(*) FILTER (WHERE event_type = 'play_start') AS starts,
    COUNT(*) FILTER (WHERE event_type = 'play_end'
          AND properties->>'result' <> 'skip')        AS completions,
    COUNT(*) FILTER (WHERE event_type = 'play_end'
          AND properties->>'result' = 'skip')         AS skips
  FROM public.analytics_events
  WHERE game_id IS NOT NULL
    AND created_at >= NOW() - INTERVAL '90 days'
  GROUP BY game_id
)
SELECT
  g.id,
  g.title,
  g.ai_quality_score,
  p.starts,
  ROUND(100.0 * p.completions / NULLIF(p.starts, 0), 1) AS completion_pct,
  ROUND(100.0 * p.skips       / NULLIF(p.starts, 0), 1) AS skip_pct
FROM game_play p
JOIN public.user_games g ON g.id = p.game_id
WHERE p.starts >= 10
  AND g.ai_quality_score IS NOT NULL
ORDER BY g.ai_quality_score DESC;

-- スコアと完走率の相関係数（-1〜1）。0 付近なら品質スコアは実プレイを予測できていない。
WITH game_play AS (
  SELECT
    game_id,
    COUNT(*) FILTER (WHERE event_type = 'play_start') AS starts,
    COUNT(*) FILTER (WHERE event_type = 'play_end'
          AND properties->>'result' <> 'skip')        AS completions
  FROM public.analytics_events
  WHERE game_id IS NOT NULL
    AND created_at >= NOW() - INTERVAL '90 days'
  GROUP BY game_id
  HAVING COUNT(*) FILTER (WHERE event_type = 'play_start') >= 10
)
SELECT
  CORR(g.ai_quality_score, 100.0 * p.completions / NULLIF(p.starts, 0)) AS corr_quality_completion,
  COUNT(*) AS n_games
FROM game_play p
JOIN public.user_games g ON g.id = p.game_id
WHERE g.ai_quality_score IS NOT NULL;
```

---

## 6. マネタイズ補助（無料 100 プレイ → 課金転換）

```sql
-- topup ファネル: open → complete の転換率（直近 30 日）
SELECT
  COUNT(*) FILTER (WHERE event_type = 'topup_open')     AS topup_opens,
  COUNT(*) FILTER (WHERE event_type = 'topup_complete') AS topup_completes,
  COUNT(*) FILTER (WHERE event_type = 'subscribe')      AS subscribes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'topup_complete')
        / NULLIF(COUNT(*) FILTER (WHERE event_type = 'topup_open'), 0), 1) AS topup_conv_pct
FROM public.analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## 7. ゲーム別売上ランキング（WP60 P1-3）

`purchase` イベント(`stripe-webhook` から直接記録。`properties.method` = `nfc` | `wallet` | `subscription`)。
NFC/QR課金は `game_id` が付くが、ウォレットチャージ・サブスクは特定ゲームに紐付かないため `game_id IS NULL` になる。

```sql
-- ゲーム別 売上ランキング（直近 30 日、NFC/QR課金のみ = game_id が付くイベント）
SELECT
  game_id,
  COUNT(*)                                    AS purchase_count,
  SUM((properties->>'amount_yen')::numeric)   AS revenue_yen
FROM public.analytics_events
WHERE event_type = 'purchase'
  AND game_id IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY game_id
ORDER BY revenue_yen DESC
LIMIT 50;
```

```sql
-- 収益手段別の内訳（NFC / ウォレットチャージ / サブスク、直近30日）
SELECT
  properties->>'method'                       AS method,
  COUNT(*)                                    AS purchase_count,
  SUM((properties->>'amount_yen')::numeric)   AS revenue_yen
FROM public.analytics_events
WHERE event_type = 'purchase'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY revenue_yen DESC;
```
