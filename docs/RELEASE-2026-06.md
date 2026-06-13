# リリース 2026-06 — 品質ゲート / フェーズ層 / アートディレクション / 計測基盤

検証済みコミット: `5d2b1ba2`（全13ワークパッケージ + Track 4）
統合検証: `tsc` クリーン / テスト 422 件 green / `lint` 0 error / `build` 成功 / AI量産 DRY_RUN（classic・lean）pass

---

## 1. このリリースで入ったもの（13 WP）

- **量産品質**: lean プロンプトスタイル（`PROMPT_STYLE=lean`）、`ai:status` 多様性レポート、類似度ゲート、フェーズ（状態機械）層、画像QA、公開ゲート（スコア70未満は審査キュー）
- **アートディレクション**: GALLERY 様式を主要4画面+共通UIに適用、`src/ai/v2/art-direction.json` で生成プロンプト・画像QA採点・Codex向けSPECを単一定義に接続、未使用テーマCSS削除
- **技術負債整理**: ESLint設定+CI復旧、アーキレビュー報告書、GameLoadingService で読込統一、EditorGameBridge の ListenerRegistry 化、エディタ共通部品抽出、`game_data` カラム廃止、schemaVersion v1→v2 マイグレーション層、**pixi.js 依存削除（Canvas 2D 確定）**、flag条件のv2/エンジン形不整合の恒久対応
- **計測・収益**: `analytics_events` 自前イベントテーブル + 計測フック（play_start/end・bridge_next・like/share・signup・topup・subscribe）、AdSenseクライアントID env化、グロース/マネタイズ意思決定資料（docs/growth/）

---

## 2. Go-Live チェックリスト（人間の作業）

デプロイは Vercel（`vercel.json` あり、build = `tsc && vite build`）。本番反映の前に:

### 2-1. Supabase マイグレーション適用（未適用なら）
本サイクルで追加された3本を本番DBに適用（冪等 `IF NOT EXISTS` スタイル）:
- [ ] `supabase/migrations/20260610_user_games_review_status.sql`（審査ステータス列 + 管理者RLS）
- [ ] `supabase/migrations/20260611_drop_user_games_game_data.sql`（死蔵カラム廃止 — **破壊的: 適用前に game_data 不使用を確認**）
- [ ] `supabase/migrations/20260612_analytics_events.sql`（計測テーブル + RLS）
適用: Supabase SQL Editor もしくは `supabase db push`

### 2-2. 環境変数（Vercel プロジェクト設定）
- [ ] `VITE_ADSENSE_CLIENT_ID`（未設定時は既存値にフォールバック）+ `VITE_ADSENSE_SLOT_GAME_BRIDGE` / `_GAME_LIST` / `_EDITOR`（AdSense管理画面でスロット発行）
- [ ] 既存キーの本番値確認: `ANTHROPIC_API_KEY`・`OPENAI_API_KEY`（量産用）、`VITE_SUPABASE_URL`・`SUPABASE_SERVICE_KEY`・`MASTER_USER_ID`、Stripe 本番キー一式（`docs/STRIPE_PRODUCTION_CHECKLIST.md` 再確認）

### 2-3. デプロイ & ポストデプロイ・スモーク
- [ ] main を Vercel にデプロイ
- [ ] プレイ導線（Splash→GameSequence→BridgeScreen→GameFeed）が GALLERY 様式で表示される
- [ ] エディタ（AIゲームレビュー含む）が開く
- [ ] 課金: 無料プレイ枯渇→ペイメントゲート→チャージ→残高反映 を1巡（テストカード）
- [ ] 計測: プレイ/いいねで `analytics_events` に行が入る（Supabase で確認）

### 2-4. ロールバック
問題時は Vercel の直前デプロイへ即ロールバック。DBマイグレーションは追加系（列追加/新テーブル）が中心で後方互換だが、`20260611`（game_data廃止）のみ非可逆 — 適用前にバックアップ推奨。

---

## 3. 検証バッチ実行ランブック（WP13/24 — 鍵のある環境で）

> 目的: lean プロンプト（WP11）と GALLERY アートディレクション（WP23）が、コード検証だけでなく**実プレイ/実アセットで効いているか**を確認する。
> 注: この作業には `ANTHROPIC_API_KEY`（+ DALL-E確認時は `OPENAI_API_KEY`、アップロード確認時は Supabase 認証）が必要。

### A) ローカル検証（本番に触れない・推奨の最初の一手）
```bash
# lean + claude-svg で10本生成（public/generated-games/ に保存、アップロードなし）
PROMPT_STYLE=lean npm run ai:v2:svg:10
# → npm run dev → エディター → ReviewQueue（ローカルJSON）でプレイ審査
```
**WP13 多様性の合格基準**: 10本中、操作タイプ・テーマ・構造が互いに明確に異なるものが7本以上 / そのまま公開可が6本以上 / フェーズ・イディオム使用が2本以上で正しく動く。

### B) DALL-E でのアートディレクション確認（OPENAI_API_KEY 必要）
```bash
IMAGE_PROVIDER=openai SKIP_UPLOAD=true npm run ai:v2 5
```
**WP24 様式の合格基準**: アセットのサムネイル一覧を横断で見て「同じプラットフォームのゲームに見える」/ `ai_image_score` 平均が様式導入前以上。

### C) 本番審査キューへ流す（Supabase 認証必要）
```bash
# 全件を審査キューに入れて人間レビューする場合は閾値を最大化
QUALITY_PUBLISH_THRESHOLD=100 PROMPT_STYLE=lean npm run ai:neta:10
# → エディター → AIゲームレビュー（審査待ちタブ + アセットプレビュー）で承認/却下
npm run ai:status   # 多様性レポート・審査待ち件数・画像QA平均を確認
```

### 結果の使い道
- 多様性/様式が基準未達なら、原因タグを lean プロンプト or art-direction.json に**1〜2行だけ**追記（リストの再肥大化を避ける）。
- 基準達成なら、本番公開を開始しつつ WP41 のファネルで「連続プレイ数・課金転換」を観測 → 次の意思決定へ。

---

## 4. 保留事項

- **`claude/update-billing-model-ULzhq` ブランチ**: 2025-11-03のシークレット除去履歴書き換え**以前の旧系統**に乗った「サブスク→ペイ・パー・プレイ移行」作業（最終 2026-03-21）。現mainと共通祖先がなく通常マージ不可。現方針（WP43 = サブスクとPay-Per-Play併存）で**方向性は上書き済み**。stripe-webhook の `.single()` 修正・セキュリティ監査5件など汎用修正が main に取り込み済みかだけ確認し、未取り込みのものがあれば個別 cherry-pick、なければアーカイブ（クローズ）推奨。
