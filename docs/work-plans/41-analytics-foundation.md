# WP41: アナリティクス基盤 — 計測なしに改善なし

**担当**: Opus / **依存**: Track 3完了推奨（必須ではない） / **想定規模**: M / **人間ゲート**: 計測方式の選択

---

以下をそのまま新しいOpusセッションに貼って実行する。

## 背景

マネタイズ基盤（Stripe Checkout/Portal/Webhook・ウォレットPay-Per-Play・Free/Premiumサブスク）は実装済みだが、
**計測がほぼ存在しない**。現状あるのは:
- `user_games.play_count`（increment RPC）— スナップショットのみ、時系列なし
- `user_wallets`（balance_yen, free_games_remaining）と `credit_purchases`（課金ログ）
- DAU/リテンション/ファネル/イベントトラッキング: **なし**

「ゲーム版TikTok」の核心KPIは「1セッションあたりの連続プレイ数」「翌日リテンション」「無料100プレイ→課金転換率」。
これが見えないと量産品質もマネタイズも改善ループが回らない。

## やること

1. **方式比較を最初に提示**（実装前に1セクション、人間が選択するまで実装に進まない）:
   - A案: 自前イベントテーブル（Supabaseに `analytics_events` テーブル + クライアント計測フック + SQL集計）— 追加コスト0、自由度高、ダッシュボードは自作
   - B案: PostHog等の外部サービス（無料枠あり）— ファネル/リテンションがGUIで即見える、データが外部に出る
   - 推奨と理由を明記して人間に選ばせる
2. **選択された方式で実装**（以下はA案の場合の仕様。B案ならSDK組み込み+同じイベント設計）:
   - `analytics_events` テーブル: `id, user_id(nullable=匿名可), session_id, event_type, game_id(nullable), properties jsonb, created_at`。RLS: insertは全員可・selectはadminのみ。書き込みはバッチ/ベストエフォート（計測失敗がUXを壊さない）
   - クライアント計測フック `src/services/analytics/Analytics.ts`: `track(eventType, props)` + session_id管理（sessionStorage）
   - **計測ポイント（最小セット）**: `session_start` / `play_start` / `play_end`（duration, result: success|failure|skip）/ `bridge_next`（連続プレイ）/ `like` / `share` / `signup` / `topup_open` / `topup_complete` / `subscribe`
   - 計測の差し込み先: GameSequence（play_start/end, bridge_next）、BridgeScreen（like/share）、PlayGamePage、TopUpButton、StripeService呼び出し箇所
   - **集計クエリ集** `docs/analytics/queries.md`: DAU、ファネル（session_start→play_start→bridge_next≥3→topup_complete）、D1リテンション、ゲーム別の完走率（play_end/play_start）とスキップ率 — 管理者がSupabase SQL Editorで実行できる形
3. **ゲーム品質へのフィードバック**: ゲーム別の完走率・スキップ率を `ai_quality_score` と突き合わせるクエリを1本含める（品質スコアが実プレイと相関しているかの検証 — Track 1の改善ループに接続）

## やらないこと

- ダッシュボードUIの作り込み（クエリ集で開始。UIは効果が見えてから）
- クリエイター収益分配の実装（WP43で設計のみ）
- 広告のインプレッション計測（AdSense側のレポートで代替）

## 受け入れ基準

- 方式比較セクションに人間の選択が記録されている
- 計測ポイント最小セットが発火する（ブラウザのネットワークタブ or テーブルで確認）
- 計測失敗（オフライン等）でアプリの動作が壊れない
- マイグレーションが既存規約（DO $$ IF NOT EXISTS の冪等スタイル）に従う
- CI 3点セット green

## 検証方法

1. `npm run dev` でプレイ→ブリッジ→いいねを操作し、analytics_eventsに行が入ることを確認
2. queries.md の各クエリがSQL Editorでエラーなく実行できる
3. 完了時: 成果サマリ5行+変更ファイル一覧を出力

---

## 方式比較 / 選択結果（人間ゲート）

**選択: A案（自前イベントテーブル）** — 2026-06-12, makoto-isobe@ockhamgames.com が選択。

| 観点 | A案: 自前テーブル（採用） | B案: PostHog 等の外部サービス |
|---|---|---|
| 追加コスト | ¥0（既存 Supabase に同居） | 無料枠あり・超過で課金 |
| データ所有 | 完全に自社内、外部送信なし | イベントが外部に出る |
| 可視化 | SQL Editor（queries.md）。UI は自作 | ファネル/リテンションが GUI で即見える |
| ファネル/リテンション | SQL を書けば出せる | 設定するだけ・SQL 不要 |
| 実装 | テーブル+RLS+フック+差し込み（全自前） | SDK 組み込み + 同じイベント設計 |
| `ai_quality_score` 突合 | 同一 DB 内 SQL JOIN で容易 | export/送信の二度手間 |
| ベンダーロック | なし | あり（履歴の持ち出しが必要） |

**推奨理由（A案）:**
1. **データ主権** — 課金・プレイ行動という事業の核データを初期段階で外部に出すリスクを負わない。
2. **既存スタックとの親和性** — 受け入れ基準3（品質スコア突合）が同一 Supabase 内の SQL JOIN で完結。
3. **追加コスト0・ベンダーロックなし** — 後で PostHog が必要になれば `analytics_events` からエクスポートして移行可能（逆は困難）。
4. トレードオフ（GUI 探索の速さ）は queries.md + SQL Editor で当面十分。ダッシュボード UI は「効果が見えてから」の方針と一致。

### 実装サマリ（A案）

- マイグレーション: `supabase/migrations/20260612_analytics_events.sql`
  （`analytics_events` テーブル / RLS: INSERT 全員可・SELECT は `is_admin()` のみ / 冪等 `DO $$ IF NOT EXISTS` スタイル）
- 計測フック: `src/services/analytics/Analytics.ts`
  （`track(eventType, props)` + `startSession()`、session_id は sessionStorage、バッチ送信、離脱時 keepalive フラッシュ、全パス try/catch でベストエフォート）
- 計測ポイント（最小セット 10 種）の差し込み先:
  - `session_start` / `play_start` / `play_end` / `bridge_next` → `GameSequence.tsx`
  - `play_start` / `play_end` → `PlayGamePage.tsx`（単体プレイページ）
  - `like` / `share` → `BridgeScreen.tsx`
  - `signup` → `hooks/useAuth.ts`
  - `topup_open` → `components/monetization/TopUpButton.tsx`
  - `topup_complete` → `pages/ProfilePage.tsx`（`?topup=success`）
  - `subscribe` → `pages/subscription/SubscriptionSuccess.tsx`
- 集計クエリ集: `docs/analytics/queries.md`（DAU / ファネル / D1 リテンション / ゲーム別完走率・スキップ率 / 品質スコア相関 / 課金転換）
