# Swizzle 引き継ぎ資料（2026-11-12）

> 対象: ChatGPT・Claude Code・Slack を連携させた AI エージェント体制への引き継ぎ。
> 作成: Claude Code（調査と資料作成のみ。コード変更・commit・push・外部送信・デプロイは行っていない）。
> 調査対象: `/home/user/swizzle`（GitHub `dondokodongames/swizzle`）のみ。Slack・Supabase・Stripe・Vercel の実環境には接続していない。
>
> **更新（2026-11-12 同日）**: 初版作成後に次を実施し、本資料に反映した。
> - 検証待ちだったゲーム24本を検証してコミット（`6fa259a`）
> - 本番ビルドの失敗とテスト1件の失敗を修正（`7d2fa27`）
> - アプリ起動時のエラー「Missing Supabase environment variables」の原因を特定（§4.10）

### 本資料での表記ルール

| 表記 | 意味 |
|---|---|
| **【実測】** | 本資料作成時（2026-11-12）に、このリポジトリでコマンドを実行・ファイルを読んで確認したこと |
| **【記録】** | リポジトリ内の文書・過去の作業ログ・コミットメッセージに書かれていること（今回は再検証していない） |
| **【構想】** | 計画・意思決定資料に書かれた方針。実装はされていない |
| **【未確認】** | 根拠が見つからない／実環境が必要で確認できない |

実装状況の区分: **実装済み**（コードがあり、テストまたは検証記録がある）／**部分実装**／**設計のみ**／**未着手**／**未確認**。

---

## 1. Executive Summary（最初に読む概要）

**Swizzle は「5〜30秒で完結するミニゲーム」のプラットフォーム**です。React + Canvas 2D + Supabase + Stripe で作られたWebアプリで、ブラウザ（スマホ）で動きます。現在の事業上の主眼は、**飲食店・バーなどに NFC タグ／QR コードを設置し、来店客がスマホでタップ → 1プレイ課金（Pay-to-Play）で遊ぶ**ことです（`docs/work-plans/65-venue-analytics.md`、`docs/work-plans/69-master-plan.md`）。

### 現時点で言えること

1. **プラットフォームの主要機能はコードとして存在する【実測】**。
   - NFC/QR 着地ページ（`/nfc/:spotId`）、拠点ごとのゲームラインナップ、1プレイ課金ゲート（Stripe Payment Link → トークン発行 → 回数制限）がある。
   - 拠点別の計測、管理画面（ダッシュボード／ユーザー／通報／拠点管理）、Supabase エッジ関数 12本、DB マイグレーション 24本がある。
   - ただし **本番環境での実決済の通し確認・拠点での実運用データは【未確認】**（文書上も「まだ検証できていない」と明記）。
2. **ゲームは「コードゲーム」（1ファイル1ゲームの JavaScript）として大量生産中【実測】**。
   - 作業ブランチ `claude/dreamy-einstein-dmr3y8` にコミット済みのゲームは **1,282本**（D 340 / I 392 / J 316 / K 134 / GH 100）。
   - **`main` ブランチにあるのは GH の 57本だけ**。作業ブランチは `main` より約70コミット先行しており、未マージ。
3. **本番で実際にプレイ可能なゲーム数は【未確認】**。
   - ゲームを本番で遊べるようにするには `npm run ai:upload:games` で Supabase に登録する必要がある。これはユーザー（人間）の担当で、どこまで実行済みかはリポジトリから判断できない。
4. **ビルドとテストは現在すべて通る【実測】**（修正済み、`7d2fa27`）。
   - `npm run build` 成功、`npm run test` 604/604、`tsc` エラー0、`lint` エラー0・警告431。
   - **アプリ起動時に「Missing Supabase environment variables」と出る問題**は、コードではなく環境設定が原因。デプロイ先（Vercel）に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` が設定されていない（§4.10）。**人間による設定とビルドし直しが必要**。
5. **ビジネス上の最大の空白は「拠点での実測」**。
   - マスタープラン（WP69）は「拠点で再投入率と月額売上の数字が出るまで、量産の第2波・自動化に進まない」と定めている。
   - しかし Phase 3（拠点計測）の実績は【未確認】。その一方で、ユーザー指示によるゲーム量産（棚ごとの在庫消化とバリエーション）が先行している。
6. **権利（IP）リスクが高い棚がある**。
   - I（マイクロゲーム集風）・J（ボードパーティ風）・K（リズムゲーム集風）は任天堂作品をジャンル上の元ネタにしている。
   - 固有名詞・キャラ・独特UIを排除するルールと自動チェッカーで管理しているが、公開前の人間による最終判断が必要。
7. **アーケード既存タイトルのライセンス利用、クラウドゲーミング、店舗用ハードウェア、設置先との契約は、いずれも実装・契約の根拠が見つからない【未確認】**。
   - CAPCOM / SNK の「許諾済み」はルール文書にのみ記載がある【記録】。

### 次にやるべきこと（詳細は §12, §16）

Vercel への Supabase 環境変数の設定と再デプロイ（人間）→ 作業ブランチの `main` 統合（PR・人間承認）→ 人間による Supabase アップロードと 1拠点での実証（Stripe 実決済1件の通し確認を含む）。

---

## 2. プロジェクトの目的とビジネスモデル

### 2.1 ビジョンと提供価値

| 観点 | 内容 | 区分・根拠 |
|---|---|---|
| 当初コンセプト | 「5-30秒で完結するショートゲームプラットフォーム」「TikTok・YouTubeショート動画のようなUX」「作る側は小学生でも、遊ぶ側は次々と流れてくる体験」 | 【記録】`README.md` 冒頭（※README は古い。§7.4 参照） |
| 現在の主眼 | 飲食店・バーに設置台（NFCタグ／QR）を置き、来店客がスマホでタップして1コイン1プレイで遊ぶ。拠点ごとの売上を測り、「どの拠点でどのゲームが当たるか」を数字で出す | 【記録】`docs/work-plans/65-venue-analytics.md`「実験①（ゲーム800本 → 利益と傾向と対策 → 飲食店の受注を取る）」 |
| 品質の基準 | 「1コイン1プレイ」— 1プレイの終わりに正解／不正解・満足／不満足が自分で分かること（verdict） | 【記録】`docs/work-plans/68-game-list-policy.md` §1 |
| 提供価値（店舗側） | 待ち時間・飲食中の娯楽、追加売上 | 【構想】（明文化された価値提案文書は見つからない） |
| 提供価値（客側） | アプリ不要・タップ即プレイ・短時間 | 【構想】 |

### 2.2 想定ユーザー・店舗・利用シーン

- **想定する店舗（業態）**: 居酒屋 / バー / 食堂 / 観光地など。`nfc_spots.venue_type` に izakaya / bar / shokudo などを入れる設計【記録】WP65。
- **客層**: local / inbound / mixed（`nfc_spots.audience`）。インバウンド拠点には「第1階層カジュアル＋ジェネリックアーケード（許諾済みIP）」を優先する運用案がある【記録】WP65 運用手順。
- **オンライン側（従来構想）**: ショート動画視聴層（10〜20歳）と、プログラミング不要のクリエイター【記録】README。
- **具体的な設置先の候補・店舗名**: 【未確認】（リポジトリ内に記載なし）。

### 2.3 課金モデルと収益分配

【記録】`docs/growth/monetization-decision.md`（WP43）より。4つの課金手段があり、それぞれ課金対象が違います。

| 手段 | 誰に課金 | 実装状況 | 内容 |
|---|---|---|---|
| NFC/QR + Payment Link（1プレイ課金） | 店舗の来店客 | **実装済み（コード）**。本番の実決済の通しは【未確認】 | ゲームごとに `game_payment_config.price_yen` を設定。Stripe Payment Link で決済 → `one_time_access` トークン（有効24時間・既定3プレイ）。ティア価格表 S=100 / A=50 / B=30 / C=10 円（`src/ai/code/parseGameHeader.ts:20`） |
| Free / Premium サブスク | ヘビー層 | 実装済み【記録: 本番検証済みとWP60】 | $4.99/月。広告非表示・無制限作成など |
| Pay-Per-Play ウォレット（作成課金） | クリエイター | 実装済み【記録】 | 作成100件まで無料、以降 ¥1/作成。チャージ ¥100〜3,000 |
| 広告（AdSense） | 無料ユーザー | **部分実装**（スロットID未設定） | `src/components/.../AdUnit.tsx` はスロット未設定時にプレースホルダを表示【記録 WP60 P1-2】 |

**収益分配（クリエイター向け）**: **設計のみ・凍結中**。「アクティブクリエイター50人以上」などのゲート到達まで実装しない（`monetization-decision.md` §4.5）。

**店舗（拠点オーナー）への収益分配**: リポジトリ内に設計・実装とも見当たらない **【未確認／未着手】**。

**目標値【記録】**: 1拠点あたり月次売上「計画 ¥24,000 / 実証 ¥6,000」（WP65「読む数字と判断基準」）。

**注意（現状のギャップ）【実測】**:
- 今回量産しているコードゲームには、価格ティアを示す `// @tier:` ヘッダーが1本も付いていない（`grep -l "@tier:"` = 0件）。
- そのため `PRICE_SYNC=true` でアップロードしても価格は自動設定されない。価格は管理画面か DB で個別に設定する必要がある。

### 2.4 QR/NFC からプレイまでのユーザーフロー【実測: コードを読んで確認】

```
来店客が NFC タグをタップ / QR を読む
  → https://<app>/nfc/:spotId                       src/pages/nfc/NfcSpotPage.tsx
     ├ setSpotContext(spotId)  … sessionStorage にこのタブの拠点IDを保持
     ├ 未ログインなら supabase.auth.signInAnonymously()（匿名ログイン）
     ├ nfc_spots / nfc_spot_games（ラインナップ）を取得
     ├ pickLineupIndex() で端末ごとに巡回出題       src/pages/nfc/lineupRotation.ts
     ├ track('spot_enter') … 遊ばなかったタップも母数に残す
     └ navigate('/play/:gameId')
  → /play/:gameId                                    src/pages/play/PlayGamePage.tsx
     ├ game_payment_config を取得（price_yen, payment_link_url）
     ├ 価格なし → そのままプレイ
     ├ 価格あり → localStorage の play_token_<gameId> を確認
     │    ├ 無効/無し → 決済ゲート表示 → Stripe Payment Link（client_reference_id=spot_id）
     │    └ Stripe から戻る（session_id）→ edge: exchange-session-token → トークン保存
     └ edge: validate-play-token（有効期限・回数を検査し play_count++）→ ゲーム起動
  → ゲームは sandbox iframe 内で実行               src/services/code-game/CodeGameRunner.ts
     （iframe sandbox="allow-scripts"、エンジンは src/services/code-game/iframeTemplate.ts）
  → 決済完了は Stripe webhook が受けて purchase イベント（spot_id 付き）を記録
                                                     supabase/functions/stripe-webhook/index.ts
```

### 2.5 プラットフォームと個別ゲームの関係

- **プラットフォーム（React アプリ）**: 認証・課金・配信・計測・管理を担う。
- **ゲームの種類（2系統）【実測】**
  1. **ルールJSONゲーム**: エディタ（ルールエンジン `src/services/rule-engine/`）で作る。AI生成ライン（`ai:v2:*`）もこの形式。`SWIZZLE_JSON_SPEC.md` が仕様。
  2. **コードゲーム（現行の制作ライン）**: `src/ai/code/games/<family>/<id>-<slug>.js` の1ファイル1ゲーム。
     - sandbox iframe 内で `game.*` API（描画・音・入力・終了通知）を使う。仕様は `docs/specifications/SANDBOX_API_V2.md`。
     - Supabase の `user_games` テーブルに登録され、本番はそこから読み込む（git からは読まない）。
- **エンジン（iframeTemplate.ts）はアプリと一緒にデプロイされる**。そのため、エンジンの修正はアップロード済みの全ゲームに再アップロード無しで反映される【記録】CLAUDE.md。

### 2.6 事業上の現在の課題

1. 拠点での実測データがない（WP69 Phase 3 未達）→ どの系統・価格が当たるか不明【記録/未確認】。
2. 本番での実決済（Payment Link → webhook → トークン → プレイ、spot_id 帰属）を1件も通していない【記録 WP65「まだ検証できていないもの」】。
3. 特定商取引法に基づく表記ページが未実装【実測: `src/pages` に該当なし】→ 有料公開のブロッカー。
4. 店舗側への収益分配・契約形態が未設計【未確認】。
5. 量産したゲームの大半が `main` 未統合・本番未登録（の可能性）【実測/未確認】。
6. 任天堂作品をジャンル上の元ネタにした棚（I/J/K、計 818本＋予定分）の公開可否は、人間の最終判断待ち。

---

## 3. システムアーキテクチャ

### 3.1 技術スタック【実測: package.json / vite.config / vercel.json】

| 層 | 技術 |
|---|---|
| フロント | React 18 + TypeScript + Vite、react-router-dom、i18next（9言語）、vite-plugin-pwa |
| ゲーム描画 | Canvas 2D（`getContext('2d')`）。PixiJS は未使用で依存削除済み（CLAUDE.md）。※README には「PixiJS 7.x」と古い記述が残る |
| バックエンド | Supabase（PostgreSQL + RLS、Auth、Edge Functions[Deno]） |
| 決済 | Stripe（Checkout、Customer Portal、Payment Links、Webhook） |
| ホスティング | Vercel（`vercel.json`: SPA rewrite、クローラ向け `/api/og/:gameId`、CSP/セキュリティヘッダ） |
| 監視 | Sentry（`@sentry/react`、`VITE_SENTRY_DSN`） |
| メール | Resend（`RESEND_API_KEY`、edge `send-notification-email`）【記録】 |
| AI 生成 | `@anthropic-ai/sdk`、`openai`（スクリプト用。アプリ本体の機能ではない） |
| テスト | Vitest + jsdom、Playwright（ゲームの smoke テスト用） |

### 3.2 構成図（テキスト）

```
[客のスマホ] ─NFC/QR→ Vercel (React SPA + /api/og + /api/sitemap.xml)
     │                    │
     │                    ├─ Supabase Auth（メール / 匿名）
     │                    ├─ Supabase DB（user_games, nfc_spots, nfc_spot_games,
     │                    │   game_payment_config, one_time_access, analytics_events, profiles, …）
     │                    └─ Supabase Edge Functions（12）
     │                          create-payment-link / exchange-session-token / validate-play-token
     │                          stripe-webhook / create-checkout-session / create-customer-portal
     │                          consume-game-credit / delete-account / send-notification-email
     │                          on-game-published / remove-billing-trigger / (_shared)
     └─ Stripe Payment Link ──→ Stripe ──webhook──→ stripe-webhook
ゲーム実行: React → CodeGameRunner → sandbox iframe（iframeTemplate のエンジン＋ゲームJS）
            → postMessage(GAME_END/ERROR) → BestScoreStore（localStorage）
```

### 3.3 主要ディレクトリ【実測】

| パス | 役割 |
|---|---|
| `src/App.tsx` | ルーティング（`/feed` `/play/:gameId` `/nfc/:spotId` `/admin/*` `/pricing` ほか。24個の lazy import） |
| `src/pages/` | Login / Signup / Profile / About / Terms / Privacy / NotFound / `nfc/` / `play/` / `subscription/` / `admin/` |
| `src/services/code-game/` | `CodeGameRunner.ts`（iframe 実行）、`iframeTemplate.ts`（ゲームエンジン）、`BestScoreStore.ts` |
| `src/services/rule-engine/` | ルールJSONゲームのエンジン（RuleEngine、ConditionEvaluator、ActionExecutor、DelayScheduler） |
| `src/services/analytics/` | `Analytics.ts`（track、spot context） |
| `src/services/monetization/`、`src/services/monitoring/` | 課金・監視 |
| `src/types/editor/contract.ts` | ルールJSONの action/condition 型の唯一の正（CLAUDE.md の重要ルール） |
| `src/ai/code/` | コードゲームの生成・検証（Validator、QualityScorer、IpSafetyChecker、mechanicClassifier、stylePacks、playFamilies） |
| `src/ai/code/games/` | **現行のゲーム本体**（13 family フォルダ） |
| `src/ai/code/examples/` | 旧 800ファイル（797本は破棄方針。few-shot 原型を含む） |
| `src/ai/v2/` | ルールJSON生成パイプライン（9段階 Orchestrator）、`run-upload-games.ts`、`template-factories/`（撤去予定） |
| `src/marketing/` | **未実装スタブ**（SNS投稿の自動化。実投稿しない） |
| `src/social/` | フォロー/いいね/ブックマーク |
| `supabase/functions/`、`supabase/migrations/` | Edge Functions 12、マイグレーション 24 |
| `api/` | Vercel Functions（`og/[gameId].js`、`sitemap.xml.js`） |
| `scripts/` | 検証・台帳スクリプト（`check-game.ts`、`smoke-code-games.ts`、`dup-plays.ts`、`check-ip-safety.ts`、`build-game-ledger.ts`、`build-production-list.ts` ほか） |
| `docs/specifications/` | ゲーム制作の正本（PLAY_GRAMMAR_V3、SANDBOX_API_V2、GAME_QUALITY_STANDARD_V2、IP_SAFETY_RULES、MECHANICS_CATALOG_V2、ARCADE_ART_DIRECTION、PRODUCTION_ORDER） |
| `docs/work-plans/` | 作業計画（WP番号）。**WP69 マスタープラン**、**WP70 棚バリエーション実装ブリーフ**、WP60 プラットフォーム改善ロードマップ ほか |
| `docs/work-plans/ledger/` | 台帳（`production-list.csv` 62,705行、`game-ledger.csv`、`sources/plays/*.tsv`） |

---

## 4. 現在の実装状況

各機能の区分と根拠です。「確認方法」は、別のAIが同じことを確かめるための手順です。

### 4.1 QRコード・NFC連携 — **実装済み（コード）／実店舗での運用は未確認**

- **根拠**
  - `src/pages/nfc/NfcSpotPage.tsx`（`NfcSpotPage`）、`src/pages/nfc/lineupRotation.ts`（`pickLineupIndex`）、`src/pages/nfc/NfcSetupPage.tsx`（qrcode.react で QR 生成、Web NFC API `NDEFReader` でタグ書き込み。Android Chrome 限定）、`src/pages/admin/NfcSpotManagerPage.tsx`。
  - マイグレーション: `supabase/migrations/20260522_nfc_spots.sql`、`20260818_venue_analytics.sql`。
- **確認方法**: `src/pages/nfc/__tests__` のテスト（`npm run test`）。ローカルで `/nfc/<spotId>` に遷移して確かめる（DB が必要）。
- **検証記録【記録】**: WP65 に「PostgreSQL 16 実機で migration 適用・RLS・RPC 数値一致を確認」とある。本番 Supabase への適用は【未確認】。

### 4.2 ゲーム起動・配信 — **実装済み**

- **根拠**: `CodeGameRunner.ts`（`sandbox="allow-scripts"` の iframe を作り、`srcdoc` にエンジン＋ゲームを埋めて起動。`GAME_END` / `ERROR` を postMessage で受ける）、`iframeTemplate.ts`（`buildIframeHtml`）、`GameLoadingService.ts`、`/feed`、`/play/:gameId`。
- **配信元**: Supabase `user_games`。登録は `npm run ai:upload:games`（`src/ai/v2/run-upload-games.ts`。`OVERWRITE=true` で上書き、`PRICE_SYNC=true` でティア価格を同期）。
- **ウォッチドッグ**: 最初の入力から (duration+3) 秒で強制終了。アップロード時の duration は固定30秒なので実質33秒（`CodeGameRunner.ts`、`run-upload-games.ts:198`）【記録】。
- **確認方法**: `npm run test`（`src/services/code-game/__tests__`）、`npm run games:smoke`。

### 4.3 課金・決済 — **実装済み（コード）／本番の通し確認は未確認**

- **1プレイ課金**: edge `create-payment-link`（ゲームごとの Payment Link 自動生成）、`exchange-session-token`、`validate-play-token`（`DEFAULT_MAX_PLAY_COUNT = 3`。トークン有効期限24時間は `stripe-webhook` 内で設定）、`stripe-webhook`。
- **webhook が処理するイベント**: `checkout.session.completed`（game_payment / topup）、`customer.subscription.*`、`invoice.payment_*`、`charge.refunded`、`charge.dispute.created`。
- **サブスク**: `create-checkout-session`、`create-customer-portal`、`src/pages/subscription/*`。
- **ウォレット**: `consume-game-credit`、`credit_purchases`。
- **人間タスク（未完）【記録 WP60】**
  - P1-1: 本番 webhook の購読イベント（`checkout.session.completed` を含むか）の実物確認。
  - P1-2: AdSense スロットID の設定。
  - `docs/STRIPE_PRODUCTION_CHECKLIST.md` のチェックボックスは未チェックのまま。

### 4.4 ユーザーセッション管理 — **実装済み（簡素）**

- Supabase Auth（メール登録/ログイン、匿名ログインは NFC 経由のみ: `NfcSpotPage.tsx`）。
- 拠点コンテキストは sessionStorage、プレイトークンは localStorage（`play_token_<gameId>`）。
- 退会: edge `delete-account` 【記録 WP60 P0-2 完了】。
- 匿名ログインを NFC 以外にも広げる件は未着手【記録 WP60 P3】。

### 4.5 店舗・設置場所管理 — **実装済み（管理UI＋DB）**

- `nfc_spots`（venue_type / audience / area / active / notes）、`nfc_spot_games`（ラインナップ・並び順・有効フラグ）。UI は `NfcSpotManagerPage.tsx`。
- **未実装【記録 WP65「未実装」】**: 時間帯分析、ラインナップ入替履歴テーブル、拠点オーナー向け読み取り専用ダッシュボード。

### 4.6 ゲーム管理・登録 — **部分実装**

- アップロードスクリプト（上記）、審査状態 `user_games.review_status`、通報キュー（`GameReportsPage.tsx`、`game_reports`）。
- `LocalGamesPage.tsx`（`/admin/local-games`）: Supabase 無しで `src/ai/code/games/**` をビルドに埋め込んで確認する画面。全ゲーム分で 15.5 MB のチャンクになるため、PWA のプリキャッシュ対象から除外した（`vite.config.ts` の `globIgnores`、§8）。
- ReviewQueue が二重実装（`src/components/editor/ReviewQueue.tsx` と `GameReviewQueue.tsx`）【実測】。

### 4.7 管理画面 — **実装済み**

- `AdminDashboardPage.tsx`（DAU / ファネル / 売上、拠点あたり月次売上の中央値）、`AdminUsersPage.tsx`、`GameReportsPage.tsx`、`NfcSpotManagerPage.tsx`、`LocalGamesPage.tsx`。
- RPC は `20260710_admin_dashboard_rpcs.sql` と `20260818_venue_analytics.sql`。`is_admin()` でガードされている。

### 4.8 プレイ記録・売上分析 — **実装済み（計測経路）／実データは未確認**

- `analytics_events`（`spot_id` 次元付き）、`track()`、サーバー側の `purchase` 記録（webhook）。
- RPC: `admin_spot_stats`、`admin_spot_game_stats`、`admin_spot_daily`、`admin_spot_audience_stats`。SQL 集は `docs/analytics/queries.md`。
- ベストスコアは端末の localStorage のみ（`BestScoreStore.ts`）。サーバー側のスコア保存・ランキングは**未着手**。

### 4.9 セキュリティ・不正利用対策 — **部分実装**

- **あるもの**
  - RLS 強化マイグレーション群。
  - iframe は `allow-scripts` のみで、不透明オリジンになる。
  - Vercel の CSP・X-Frame-Options。
  - webhook の署名検証。
  - `client_reference_id`（spot_id）の形式検証。
  - トークンの回数・期限チェック。
  - いくつかの edge 関数にレート制限がある（`rate.?limit` の記述あり）。
- **穴【実測】**
  - `CodeGameRunner` の message ハンドラが送信元（`e.source === iframe.contentWindow`）を検証していない → 任意のウィンドウから `GAME_END` を送ってスコアを偽装できる（WP60 P3）。
  - ベストスコアが localStorage のみ → 改ざん可能（現状、賞品等に使っていないなら影響は小さい）。
  - 1プレイ課金トークンは端末の localStorage に保存される。共有や再利用への対策の程度は【未確認】。

### 4.10 開発環境・本番環境 — **部分的に確認**

- 必要な環境変数は**名前のみ**を記載（値は出力していない）。`.env.local.example` にある:
  - アプリ: `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_SENTRY_DSN`、`VITE_STRIPE_PUBLIC_KEY`、`VITE_STRIPE_PREMIUM_*_PRICE_ID`、`VITE_ADSENSE_*`、`VITE_ADMIN_USER_ID`、`VITE_APP_URL`
  - サーバー/スクリプト: `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`RESEND_API_KEY`、`SUPABASE_SERVICE_KEY`、`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`IMAGE_PROVIDER`、`MASTER_EMAIL`、`MASTER_PASSWORD`
  - マーケティング用（スタブ）: `TWITTER_*`、`DISCORD_*`、`INSTAGRAM_*`、`TIKTOK_*`、`FACEBOOK_PAGE_ID`
- 本番 Supabase プロジェクト・Vercel プロジェクトの実状態は【未確認】。
- **既知の問題（2026-11-12、ユーザーのスクリーンショットで確認）**: アプリ起動画面に「An unexpected error occurred — Missing Supabase environment variables」と表示される。
  - 原因: `src/lib/supabase.ts` は `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` が無いと起動時に例外を投げる。`VITE_` で始まる変数は**ビルド時に埋め込まれる**ため、ビルドした環境にこの2つが無いとこの画面になる。
  - 対処（人間）: Vercel の Settings → Environment Variables に2つを登録する。適用先は Production だけでなく **Preview** にも入れる（作業ブランチのデプロイは Preview 扱い）。その後 **Redeploy** する。ローカルなら `.env.local.example` をコピーして `.env.local` を作る。値は Supabase の Project Settings → API にある。

### 4.11 デプロイとインフラ — **設定あり／実行状況は未確認**

- **Vercel**: `vercel.json`（buildCommand `npm run build`）。どのブランチを本番に出しているかは【未確認】（通常は `main`）。
- **GitHub Actions【実測】**
  - `ci.yml`: main・`claude/**`・PR で tsc / test / lint。
  - `deploy-supabase-functions.yml`: main への `supabase/functions/**` 変更時に edge 関数をデプロイ。
  - `generate-games.yml`: **毎時 cron で `npm run ai:neta -- 3` を実行し、`neta-progress.json` をコミット・push** する設定。
    - これは旧ルールJSON生成ラインで、Anthropic API と本番 Supabase を使う。
    - 実際に動いているか（Actions が有効か）は【未確認】。取得できた履歴（119コミット）に `auto-generated games` コミットは無い。
    - WP67 も「自動ラインはほぼ空回り」と記録している。**意図しないAPI課金・本番書き込みの可能性があるため、人間の確認を推奨**。
- **バックアップ・PITR**: `docs/OPERATIONS.md` に、マイグレーションからの再構築手順はある。バックアップ方針は「人間の判断待ち」の TODO のまま【記録】。

### 4.12 外部API・サービス連携 — 一覧

| サービス | 用途 | 状況 |
|---|---|---|
| Supabase | DB・Auth・Edge | 実装済み（本番の状態は未確認） |
| Stripe | 決済 | 実装済み（本番の通しは未確認） |
| Vercel | ホスティング・OGP・sitemap | 設定済み |
| Sentry | エラー監視 | 実装済み【記録 WP60 P0-4】 |
| Resend | 通知メール（フォロー/いいね） | 実装済み【記録】。週間ダイジェストは対象外 |
| Google AdSense | 広告 | 部分実装（スロット未設定） |
| Anthropic / OpenAI | ゲーム・ネタ生成スクリプト | スクリプトとして存在。現行ゲームは主に人手＋Claude Code セッションで制作 |
| Discord / X / Instagram / TikTok | SNS自動投稿 | **未実装スタブ**（`src/marketing/README.md`。実投稿しない） |
| Slack | — | リポジトリ内に連携コードなし【実測】 |

### 4.13 その他（実装済み【記録 WP60 チェックリスト】）

- 404ページ、課金画面の i18n、通報（ユーザー間ブロックは対象外）、動的OGP、robots/sitemap、PWA、オンボーディング、メール通知、収益分析、返金・チャージバック処理、管理ダッシュボード。
- **未着手（WP60 P0-1）**: 特定商取引法表記ページ【実測: 該当ファイルなし】。

---

## 5. ゲーム開発・量産基盤

### 5.1 「ゲーム本数」の定義（混同しないこと）

| 指標 | 数 | 区分・根拠 |
|---|---|---|
| **A. 旧サンプル（破棄方針）** | `src/ai/code/examples/*.js` 800ファイル（797本＋few-shot原型） | 【実測】。WP68 で「1構造に収束しているため破棄」と決定済み。削除は未実施 |
| **B. 旧テンプレート** | README 記載の「20種類のゲームテンプレート（PixiJS）」 | 【記録】README のみ。現行ラインでは使っていない。PixiJS は依存削除済み |
| **C. 制作リスト（題名の在庫）** | `production-list.csv` 62,705行（tier1=20 / tier2=27,477 / tier3=34,411 / discard=797） | 【実測】。※`status` 列は最新の制作状況を反映していない（`games:list` の再生成が必要） |
| **D. 遊びの一文が書かれた行** | GH 386、D 340、I 163(+バリエーション237)、J 316(+34)、K 134(+266) | 【実測】`sources/plays/*.tsv` |
| **E. 作業ブランチにコミット済みのコードゲーム** | **1,282本**（D 340 / I 392 / J 316 / K 134 / GH 100） | 【実測】`git ls-files` 相当で確認 |
| **F. ディスク上の未検証ファイル** | 0本（初版時の24本は検証してコミット済み） | 【実測】`git status` |
| **G. `main` にあるコードゲーム** | 57本（GH のみ） | 【実測】`git ls-tree origin/main` |
| **H. 本番 Supabase に登録済み（＝本番でプレイ可能）** | **不明** | 【未確認】。`ai:upload:games` は人間の担当 |
| **I. 品質ゲート通過済み** | E の 1,282本はコミット前に全数ゲート通過 | 【記録】作業ログ・コミットメッセージ（validator 0エラー・scorer≥80・smoke 2回PASS・IP 0件・重複判定）。今回は全数の再検証はしていない |
| **J. 人間がプレイテストして面白さを確認した本数** | **不明（記録なし）** | 【未確認】。smoke は自動のランダム入力で、面白さは測れない |
| **K. 拠点で売上・再投入率を計測済み** | 0本（確認できる記録なし） | 【未確認】 |

棚（shelf）の意味（`docs/work-plans/ledger/sources/README.md`）:
- **D**: 動画広告・ハイパーカジュアル・TikTok・流行アプリ系
- **GH**: SIMPLE2000シリーズの題材
- **I**: マイクロゲーム集風
- **J**: ボードパーティのミニゲーム集風
- **K**: リズムゲーム集風
- **E/F**: ジェネリックレトロ／アーケード（遊びの一文はまだない）

### 5.2 棚ごとの進捗と目標【実測】

| 棚 | ユーザー指定の目標 | コミット済み | 残り | 備考 |
|---|---|---|---|---|
| D | 340（在庫を全消化） | 340 | 0 | 完了 |
| I | 400 | 392 | 8 | 残り8本は未着手（I-var.tsv の todo 行） |
| J | 350 | 316 | 34 | `plays/J-var.tsv` 34行（遊びの一文は作成済み、実装は0本） |
| K | 400 | 134 | 266 | `plays/K-var.tsv` 266行（拍の型 `beat` 列付き、実装は0本） |
| GH | （在庫386） | 100 | 286 | 遊びの一文は作成済み |
| E/F | 未定 | 0 | — | 遊びの一文がない |

### 5.3 共通ライブラリ（エンジン）

- **`iframeTemplate.ts`** が全コードゲーム共通のランタイム。`game.*` API の中身は以下のとおり（`docs/specifications/SANDBOX_API_V2.md`）。
  - 描画（rect / circle / line / sprite / gradient / text / hand）
  - WebAudio のチップチューン合成（tone / melody / bgm プリセット）
  - 入力（タップ / スワイプ / ホールド / ドラッグ / マルチタッチ）
  - 演出（fx / feedback.good / feedback.bad）
  - 終了（end.success / failure / record）
  - `game.best`
- 欠けている効果音・BGM アセットは合成音で代替されるので、無音にはならない【記録 CLAUDE.md】。
- **テンプレートは使わない方針**。「共通テンプレを先に作って10本にスタンプする」は禁止事項【記録 WP69「やらないこと」】。各ゲームは1本ずつ書き下ろし、参考ファイルのコード流用も禁止（WP70）。

### 5.4 共通 UI/UX（全ゲーム共通の約束事）【記録 WP70 / PLAY_GRAMMAR_V3】

- 状態は `ATTRACT → PLAYING → RESULT`。ATTRACT 画面ではゴーストハンドが実際のロジックで遊んで見せる。
- 縦画面 1080×1920 の3ゾーン（上部 HUD / プレイ領域 / 下部の親指ゾーン）。
- **テキストレス**: 表示してよい文字列はホワイトリストのみ。操作説明文は禁止で、絵と実演で伝える。
- 危険は0.5〜0.8秒前に予告する（telegraph）。失敗時は0.3〜0.6秒止めて原因を見せる（hit-stop）。
- `READY?` → `GO!` のカウントイン、効果音の意味別の使い分け、マイルストーン演出、RESULT 画面のニアミス表示と BEST。
- メカニクス族ごとの尺の帯域。放置したときに終わるまでの合計は28秒以内（本番ウォッチドッグ33秒への対策。2026-11-08 追加）。

### 5.5 新しいゲームを追加する手順（現行・手作業＋Claude Code エージェント）

1. 棚の行を決める。
   - 在庫行: `docs/work-plans/ledger/sources/plays/<棚>.tsv`（`id<TAB>play<TAB>status`）。
   - バリエーション: `<棚>-var.tsv`（`id<TAB>play<TAB>status<TAB>mechanic<TAB>world[<TAB>beat]`）。
2. メカニクスを事前に割り当てる。既存の同種ゲーム・同 wave 内の双子と被らないようにする（`docs/specifications/MECHANICS_CATALOG_V2.md`、`src/ai/code/mechanicClassifier.ts`）。
3. 世界観の重複を確認する: `grep -h "^// 世界観:" src/ai/code/games/*/<棚>-*.js`。
4. `src/ai/code/games/<family>/<id>-<slug>.js` を書く。ヘッダー9行と `@mechanic` は WP70 §1 に従う。
5. `npx tsx scripts/check-game.ts <path>` が `valid: true` かつ score≥80 になること。
6. `grep -c 'game.onUpdate(' <file>` が 1 であること（2回呼ぶと先のハンドラが消えるエンジン仕様のため）。
7. `npx tsx scripts/smoke-code-games.ts --files ... --out <scratch>` を2回連続で PASS（既定4ワーカー）。
8. `npm run games:ip` で error 0 / warning 0。
9. `npx tsx scripts/dup-plays.ts --games --csv` で、code_sim≥0.6 かつ text_sim≥0.35 のペアが無いこと（生成CSVはコミットしない）。
10. TSV の status を built にし、`npm run games:ledger` を実行し、ゲームと台帳をまとめてコミット・push。
11. 本番化: 人間が `npm run ai:upload:games` を実行する。

### 5.6 制作の自動化状況（WP67 の棚卸し【記録】＋今回の確認）

| ライン | 状態 |
|---|---|
| `ai:v2:*` / `ai:neta:*`（ルールJSON生成） | 動く（dry 確認済み【記録】）。現在の主力ではない |
| `ai:code:*`（コードゲームのLLM生成） | dry が落ちる（OPENAI_API_KEY 必須）【記録】。未使用 |
| `ai:build-templates` → `ai:produce-games`（ファクトリー線） | ほぼ未使用。世界観だけを差し替える量産の温床として撤去予定 |
| **実際の制作ライン** | **Claude Code セッション＋並列サブエージェント**（1 wave ≒ 45〜50本、5エージェント×9〜10本）。統括側が全数を検証してからコミット |
| 計画中の自動化 | WP69 Phase 5: 新しい生成コマンド `games:gen`（系統ローテの few-shot）＋終了画面の判定が出るかを検査する新しい監査。目標 2万本/日。**未着手**。「拠点の実測が出るまで始めない」が条件 |

**量産の律速【記録: 作業ログ】**: Claude の利用上限（5時間上限・週間上限）にたびたび到達している。直近は週間上限に達し、11/13 19:00 UTC まで停止中。コンテナの再作成で未コミットの作業が2回失われたため、ブリーフはリポジトリ（WP70）に置くようにした。

### 5.7 面白さ・品質の検証の仕組み

| 仕組み | 何を見るか | 何を見ないか |
|---|---|---|
| `CodeGameValidator`（`check-game.ts`） | API 違反、禁止テキスト、構造、IP（IpSafetyChecker） | 面白さ |
| `CodeQualityScorer` | 行動フィードバック、音・映像、レイアウト、終了、構造などの100点満点 | 面白さ |
| smoke（Playwright、`scripts/smoke-code-games.ts`） | 実行時エラー、GAME_END に到達するか、ATTRACT が動くか、マルチタッチ | 操作感・難易度の妥当性（入力はランダム） |
| dup-plays | コードと遊びの一文の類似度（同じ遊びの検出） | 世界観の重複（grep による手動チェックで補完） |
| IP チェッカー | 固有名詞・意匠の共起ルール | 人間の法的判断の代わりにはならない |
| **人間のプレイテスト** | — | **仕組みがない【未確認】** |
| **拠点計測（WP65）** | 再投入率・完走率・売上（最終的な審判） | **実データなし** |

### 5.8 パフォーマンス

- 個々のゲームは Canvas 2D の1ファイルで軽量。端末別の FPS 計測記録は見つからない【未確認】。
- アプリのバンドルは大きい。ビルドで「1000 kB を超えるチャンクあり」の警告が出る【実測】。

### 5.9 「800本」目標の現実性と主な障害

- **本数としては超えている**: コードゲームは 1,282本がコミット済み【実測】。
- **「800本 → 利益と傾向」という実験の目的は未達**。障害は次のとおり。
  1. `main` 未統合・本番未登録（の可能性）。
  2. デプロイ先の環境変数の未設定（ビルド自体は修正済み）。
  3. 拠点での実運用・計測が未実施。
  4. 価格ティアの未設定（`@tier` なし）。
  5. 人間のプレイテストが未実施。
  6. I/J/K の権利判断。
  7. 制作のスループットが Claude の利用上限に縛られている。

---

## 6. アーケード・クラウド・店舗展開

| 項目 | 実装 | 調査 | 交渉・契約 | 構想 | 根拠 |
|---|---|---|---|---|---|
| 既存アーケードタイトルのライセンス利用 | なし（移植・エミュレーションのコードなし） | 題名リスト `sources/arcade-archives.txt`（`#! source=memory` ＝記憶ベースで未検証） | **CAPCOM「許諾済み」/ SNK「NDA下で許諾済み」とルール文書に記載**。契約書・範囲は【未確認】 | ジェネリックアーケード枠で寄せてよい | `docs/specifications/IP_SAFETY_RULES.md` §3 |
| クラウドゲーミング | なし | ubitus 等との親和性を評価。「現状 Canvas 2D では△、独立バイナリ化が必要で別軸の作業」 | 【未確認】 | — | `docs/ai-generation/engine_assessment.md` §5 |
| 店舗設置用ハードウェア | NFCタグ書き込み機能（Web NFC）と QR 生成のみ | WP65 に「筐体まわりの導線（POP・高さ・声かけ）」の記述 | 【未確認】 | 設置台＝NFCタグ／QR＋客のスマホ（専用筐体の設計は見当たらない） | `NfcSetupPage.tsx`、WP65 |
| 店舗への導入手順 | 管理画面で拠点作成 → ラインナップ5〜10本 → NFC/QR 設置 → 2週ごとに入替 | — | — | WP65「運用手順（最初の実証台）」 | WP65 |
| 設置先候補と契約状況 | — | — | **【未確認】**（記載なし） | 居酒屋/バー/食堂/観光 | — |
| 必要資金・運営費用 | — | — | — | 【未確認】（拠点売上の目標値のみ記載あり） | WP65 |
| マーケティング・集客 | SNS自動投稿は**未実装スタブ** | `docs/growth/*`（SNS・コミュニティ playbook）、`docs/marketing/current_status.md`（2025-12時点で各SNSアカウントは「要確認」） | 【未確認】 | — | `src/marketing/README.md` |
| 法的・契約的な未解決事項 | 特商法表記ページ **未実装** | — | — | 店舗との契約形態・収益分配・景品表示法/風営法等の該当性は【未確認】（文書なし） | WP60 P0-1 |

---

## 7. Git・ディレクトリ・依存関係

### 7.1 Git【実測 2026-11-12】

- **リモート**: `dondokodongames/swizzle`。
- **ブランチ**
  - `main`: 最新は `4afff7a`「Add Supabase-free local game review page (/admin/local-games)」（2026-09-19）。
  - 作業ブランチ `claude/dreamy-einstein-dmr3y8`: `main` より **約70コミット先行・0 遅れ**（本資料のコミットを含む）。直前のコードの変更は `7d2fa27`「Fix production build and stale draw.hand test」（2026-11-12）。
- **未コミット変更**: なし（本資料もコミット済み）。
- **運用ルール【記録 CLAUDE.md・セッション指示】**
  - AI の作業は feature ブランチで行う。本番は `main`。
  - force-push・amend・フック回避は禁止。
  - コミットにモデル名を入れない。
  - `ai:upload:games` は人間が実行する。

### 7.2 依存関係【実測 package.json】

- **dependencies**: @anthropic-ai/sdk, @sentry/react, @stripe/stripe-js, @supabase/supabase-js, @tabler/icons-react, discord.js, dotenv, i18next(+detector), lucide-react, node-cron, openai, qrcode.react, react, react-dom, react-i18next, react-router-dom, stripe, twitter-api-v2, use-sync-external-store。
  - ※ discord.js / twitter-api-v2 / node-cron / openai / stripe はスクリプト専用で、devDependencies へ移すべき（WP60 P3、未着手）。
- **devDependencies**: vitest, @testing-library/*, jsdom, playwright, tsx, typescript, vite, vite-plugin-pwa, eslint ほか。

### 7.3 npm scripts（主なもの）

- `dev` / `build` / `test` / `lint` / `preview`。
- ゲーム: `games:smoke` / `games:ledger` / `games:ip` / `games:dup` / `games:list` / `ai:upload:games`。
- 旧ライン: `ai:v2:*` / `ai:neta:*` / `ai:code:*` / `ai:ideas:*` / `ai:build-templates` / `ai:produce-games`。
- スタブ: `marketing:*`。

### 7.4 文書の鮮度に関する注意【実測】

- **`README.md` は古い**: 「PixiJS 7.x」「20種類のテンプレート」など。実態は **`CLAUDE.md` と `docs/work-plans/69-master-plan.md`、`70-shelf-variation-batch-brief.md` が正**。
- `typescript_errors.log` は陳腐化している（参照先が既に存在しない）。
- `production-list.csv` の `status` は最新の制作状況と一致していない（D/I/J/K が todo のまま）。`npm run games:list` で再生成が必要。
- `docs/work-plans/ledger/sources/` の warioware / marioparty / rhythm / mobile / switch / arcade-archives は `#! source=memory`（記憶ベースで未検証）のまま。

---

## 8. ビルド・テスト・デプロイ状況

### 8.1 今回実行した検証【実測 2026-11-12、作業ブランチ】

| コマンド | 結果 |
|---|---|
| `npx tsc --noEmit --skipLibCheck` | **成功（エラー0）** |
| `npm run lint` | **エラー0・警告431** |
| `npm run test` | 初版時: 604件中1件失敗 → **修正後: 604/604 成功** |
| `npm run build` | 初版時: 失敗 → **修正後: 成功**（precache 56 entries） |

**test 失敗の詳細（修正済み `7d2fa27`: 期待値を引数名に依存しない正規表現に変更）**
- 対象: `src/services/code-game/__tests__/iframeTemplate.test.ts > buildIframeHtml > engine v2.1 (WP62) > exposes game.draw.hand backed by the sprite path`。
- 原因: テストが文字列 `hand: function(x, y, opts)` を期待しているが、エンジン（`iframeTemplate.ts:802`）は `hand: function(x0, y0, opts)` になっている。コミット `15c2013`（ゴーストハンドの揺らぎをエンジン側に移した変更）で引数名が変わり、テストが追随していない。
- 影響: CI（`claude/**` でも実行）が赤になっているはず【推定。Actions の画面は未確認】。
- 修正: テストの期待値を1行直すか、正規表現にする。

**build 失敗の詳細（修正済み `7d2fa27`: 該当チャンクを `globIgnores` でプリキャッシュから除外。ページ自体は遅延読み込みで通常どおり動く）**
- vite-plugin-pwa（workbox）のエラー: `assets/LocalGamesPage-*.js is 15.5 MB` が `maximumFileSizeToCacheInBytes`（既定 2 MiB）を超える。
- 原因: `src/pages/admin/LocalGamesPage.tsx:14` の `import.meta.glob('/src/ai/code/games/**/*.js', …raw)` が全ゲームのソースをバンドルに埋め込むため。
- `main`（57本）では超えていなかったと考えられるが、作業ブランチ（1,280本規模）では超える。
- **このまま `main` にマージすると Vercel のデプロイが失敗する可能性が高い**。
- 対策案（未実施）:
  - (a) LocalGamesPage を開発ビルド限定にする。
  - (b) workbox の `globIgnores` / `maximumFileSizeToCacheInBytes` で該当チャンクをプリキャッシュから除外する。
  - (c) ゲームソースを静的ファイルとして配信し、fetch で読む。
- 副産物: ビルドで `dist/` が生成された（`.gitignore` 対象）。その他の chunk >1000kB の警告、Browserslist データが11ヶ月前という警告あり。

### 8.2 過去の検証記録【記録】

- ゲーム1本ごとに `check-game.ts`（score 95 が大半）、smoke 2回、`games:ip`、`dup-plays` を実施してからコミット（コミットメッセージ・作業ログ）。
- WP65 の拠点計測 SQL は PostgreSQL 16 実機で検証済み。
- smoke ハーネスの締切を「ATTRACT→PLAYING の最初のタップ＋15秒＋6秒」に修正済み（コミット `539f8863`）。

### 8.3 デプロイ

- **Vercel**: 設定のみ確認。実デプロイ状況は【未確認】。
- **Supabase**: edge 関数は `main` push 時に自動デプロイ（`stripe-webhook` は `--no-verify-jwt`）。マイグレーションの本番適用状況は【未確認】。
- **ゲームの本番登録**: `ai:upload:games` を人間が実行。

---

## 9. 完成した成果物

**【実測】でファイルとして存在し、テストまたは検証記録があるもの**

1. NFC/QR 着地 → 巡回出題 → 決済ゲート → トークン検証 → iframe 起動の一連のコード（§2.4）。
2. Stripe 課金一式（1プレイ・サブスク・ウォレット・返金/チャージバック）の edge 関数。
3. 拠点別の計測スキーマ・RPC・管理UI（WP65、PG16 で検証済み【記録】）。
4. 管理画面5種。
5. コードゲームのエンジン v2.1 と検証ツール群（validator / scorer / smoke / IP / dup / ledger / production-list）。
6. **コードゲーム 1,282本**（作業ブランチ、全数ゲート通過【記録】）。
7. 制作の正本文書: PLAY_GRAMMAR_V3、SANDBOX_API_V2、GAME_QUALITY_STANDARD_V2、IP_SAFETY_RULES、MECHANICS_CATALOG_V2、ARCADE_ART_DIRECTION、PRODUCTION_ORDER、WP69、WP70。
8. 制作リスト 62,705行と、棚ごとの遊びの一文（plays TSV）。I/J/K のバリエーション計画（I-var 237行、J-var 34行、K-var 266行）。
9. CI（tsc/test/lint）。

---

## 10. 未完成・未実装・未確認事項

| 区分 | 項目 |
|---|---|
| 未実装 | 特商法表記ページ / 店舗オーナー向けダッシュボード / ラインナップ入替履歴 / 時間帯分析 / サーバー側スコア・ランキング / postMessage の送信元検証 / 匿名ログインの一般化 / ユーザー間ブロック / コメント機能（実装可否が未決） / 週間ダイジェストメール / `games:gen` 自動生成ライン / 終了画面の判定を検査する監査 / SNS 連携（スタブ） / 店舗への収益分配 / クラウドゲーミング / 既存アーケードタイトルの移植 / Slack 連携 |
| 部分実装 | 広告（スロット未設定） / ゲーム管理（ReviewQueue 二重実装） / 価格ティア（ゲーム側に `@tier` なし） |
| 未完の制作 | I 8本 / J 34本 / K 266本 / GH 286本 / E・F 棚（遊びの一文なし） |
| 未確認 | 本番 Supabase・Vercel の状態 / アップロード済みのゲーム数 / Stripe 本番 webhook 設定 / 実決済の通し / 拠点での運用実績 / 設置先と契約 / CAPCOM・SNK 許諾の範囲 / `generate-games.yml` の実行状況 / CI の現在の結果 / 人間のプレイテスト結果 |
| 既知の不具合 | デプロイ先の Supabase 環境変数の未設定による起動エラー（§4.10、人間の設定待ち）/ スコア偽装の余地（§4.9）。ビルド失敗とテスト失敗は修正済み |

---

## 11. 現在の主要課題とリスク

| # | 課題・リスク | 影響 | 重大度 |
|---|---|---|---|
| R1 | デプロイ先に Supabase 環境変数が無い | アプリが起動画面でエラーになる（ビルドは修正済み） | 高（人間の設定で解消） |
| R2 | 1,225本（1,282−57）が `main` 未統合 | 成果が本番に出ない。コンテナが再作成されると未 push 分は消える（過去に2回発生） | 高 |
| R3 | 拠点での実測なし | 何を作ればよいかの判断材料がない（WP69 のゲート未達） | 高（事業） |
| R4 | 実決済の未検証 | 課金が無音で欠落する可能性（WP60 P1-1 のチェックリスト漏れの指摘あり） | 高 |
| R5 | 特商法表記なし | 有料公開の法的ブロッカー | 高 |
| R6 | I/J/K の任天堂作品由来のジャンル | 権利クレームのリスク。自動チェックは補助にすぎない | 中〜高 |
| R7 | `generate-games.yml` の毎時 cron | 有効なら API 課金・本番 DB への書き込み・`main` への自動 push | 中（要確認） |
| R8 | スコア偽装（postMessage 未検証、localStorage） | ランキング・賞品を導入すると問題化 | 中 |
| R9 | 制作スループットが Claude の利用上限に依存 | K の 266本などの完了時期が読めない | 中 |
| R10 | 面白さの検証が自動化されていない | 量に対して当たりの比率が不明 | 中 |
| R11 | 文書の鮮度（README・production-list・source=memory） | 新しいAIが誤った前提で作業する | 中 |
| R12 | 本番依存に重い Node SDK が入っている | バンドル・セキュリティ面の負債 | 低 |

---

## 12. 次に実行すべきタスク（優先順位・完了条件）

| 優先 | タスク | 作業内容 | 完了条件 | 依存・担当 |
|---|---|---|---|---|
| ~~P0-a~~ 完了 | 本番ビルドの修復（`7d2fa27`） | LocalGamesPage のゲーム埋め込みを PWA プリキャッシュから外す（`globIgnores` 等）、または開発ビルド限定にする | `npm run build` 成功、`dist` に該当の大きなチャンクがプリキャッシュされない | Claude Code |
| ~~P0-b~~ 完了 | テスト修正（`7d2fa27`） | `iframeTemplate.test.ts` の期待値を現エンジンに合わせる | `npm run test` 全件 green | Claude Code |
| ~~P0-c~~ 完了 | 未検証24本の処理（`6fa259a`） | 検証（check-game / smoke×2 / IP / dup）→ コミット、または破棄 | untracked のゲームが0、I 棚が 392 | Claude Code（利用上限の解除後） |
| P0-env | Supabase 環境変数の設定 | Vercel の Production と Preview に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を登録して Redeploy | 起動画面のエラーが消える | **人間** |
| P0-d | `main` への統合 | 作業ブランチから PR を作成し、CI green を確認して人間がレビュー・マージ | `main` に全ゲーム、CI green | **人間の承認**、P0-a/b が前提 |
| P0-e | 本番登録とアップロード方針 | どの棚を本番に出すか決め、`ai:upload:games` を実行 | Supabase の `user_games` 件数と棚の内訳が把握できる | **人間** |
| P1-a | 実証1拠点 | WP65 の運用手順で1拠点を作成し、ラインナップ5〜10本で NFC/QR を設置 | `admin_spot_stats` に実データが出る | **人間**（店舗）、P0-d/e |
| P1-b | 実決済の通し | Payment Link で1件実購入 → webhook → `purchase(spot_id)` → トークン → プレイ | `analytics_events` に spot_id 付き purchase が1件 | **人間**＋Claude Code（調査支援） |
| P1-c | 特商法表記ページ | 記載事項を人間が確定し、ページとフッター・決済導線からのリンクを実装 | 決済画面から1タップで到達できる | 人間（文面）→ Claude Code |
| P1-d | 価格ティアの付与 | ゲームに `// @tier:` を付けるか、価格表を DB で管理するかを決める | 有料ゲームの価格が設定されている | 人間（価格決定）→ Claude Code |
| P1-e | `generate-games.yml` の扱い | Actions の有効状態を確認し、不要なら無効化を提案 | 意図しない自動実行がない | **人間**（確認）→ Claude Code |
| P2-a | セキュリティ | `CodeGameRunner` で `e.source === iframe.contentWindow` を検証 | 他ウィンドウからの GAME_END を無視するテストが通る | Claude Code |
| P2-b | 台帳の再生成 | `npm run games:list` / `games:ledger` | production-list の status が実態と一致 | Claude Code |
| P2-c | 制作の続き | I 残り → J-var 34 → K-var 266 → GH 286（WP70 に従う） | 各棚の目標本数 | Claude Code（企画レビューは ChatGPT） |
| P2-d | 文書の更新 | README を現状に合わせる。source=memory リストを検証済みに差し替え | README と CLAUDE.md が矛盾しない | ChatGPT（文案）＋人間（一覧の貼り込み） |
| P3 | 技術負債 | 依存の整理、ReviewQueue 統一、EditorGameBridge 分割、旧797本と template-factories の撤去（WP69 Phase 6） | WP60 P3 / WP69 Phase 6 の完了条件 | Claude Code |

---

## 13. ChatGPT と Claude Code の具体的な協業方法

既存のリポジトリ運用（WP 文書・plays TSV・検証スクリプト・feature ブランチ）を**そのまま共通基盤にする**提案です。作り直しはしません。以下はすべて**提案**で、今回は何も作成していません。

### 13.1 AI 間で共有すべき仕様書（正本）

| 文書 | 用途 | 主な読み手 |
|---|---|---|
| `CLAUDE.md` | コマンド・アーキテクチャ規則・禁止事項 | 両方 |
| `docs/work-plans/69-master-plan.md` | 事業ゲートと Phase | 両方（特に ChatGPT） |
| `docs/work-plans/70-shelf-variation-batch-brief.md` | ゲーム実装の手順と品質ルール | Claude Code（ChatGPT は仕様作成時に参照） |
| `docs/specifications/PLAY_GRAMMAR_V3.md` / `GAME_QUALITY_STANDARD_V2.md` / `MECHANICS_CATALOG_V2.md` / `IP_SAFETY_RULES.md` / `ARCADE_ART_DIRECTION.md` / `SANDBOX_API_V2.md` | ゲームデザインの共通言語 | 両方 |
| `docs/work-plans/ledger/sources/plays/*.tsv` | 作るゲームの「遊びの一文」（ChatGPT が書き、Claude が実装する接点） | 両方 |
| `docs/work-plans/60-platform-gaps-roadmap.md`、`65-venue-analytics.md` | プラットフォームと計測の残課題 | 両方 |
| 本資料 | 現在地 | 両方 |

### 13.2 共通のタスク形式（提案）

`docs/ai-collab/tasks/<YYYYMMDD>-<slug>.md` に1タスク1ファイルで置きます（ディレクトリは未作成）。

```markdown
---
id: T-20261113-build-fix
type: platform | game-batch | game-design | review | docs
priority: P0 | P1 | P2 | P3
owner: claude-code | chatgpt | human
status: proposed | approved | in-progress | review | done | rejected
requires_human_approval: true | false
depends_on: [T-...]
---
## 目的（なぜ）
## 仕様（何を）— 受け入れ条件を箇条書きで、検証可能な形で
## 範囲外（やらないこと）
## 参照（正本文書・ファイルパス）
## 完了条件（コマンドと期待結果。例: npm run build 成功 / npm run test 全green）
```

ゲーム企画の場合は、仕様欄に plays TSV の行（`id / play / mechanic / world / beat`）をそのまま書きます。これで現在の制作ラインに直結します。

### 13.3 ゲーム開発の自動化パイプライン（現行ラインの延長）

```
[ChatGPT] 企画: 元ネタ → 遊びの一文・メカニクス割当・世界観（IP ルール準拠）
   → plays/<棚>-var.tsv 形式の行（status=todo）をタスクとして提出
[人間] 承認（特に I/J/K の権利判断、優先棚）
[Claude Code] 実装: WP70 に従い並列で制作 → check-game / smoke×2 / games:ip / dup-plays
   → status=built、games:ledger → feature ブランチに commit/push
[Claude Code] 報告（§13.5）
[ChatGPT] レビュー: スクリーンショット（smoke の contact sheet）・世界観・遊びの差別化・UX
   → 改善タスク（再実装の指示）を発行
[人間] PR マージ・ai:upload:games・拠点への投入
[計測] admin_spot_game_stats → ChatGPT が分析 → 次の棚・系統の優先順位に反映
```

### 13.4 ChatGPT から実装依頼を受け取る方法

- **推奨**: 人間が ChatGPT の出力（タスクファイル形式）を Claude Code セッションに貼る、またはリポジトリにコミットする。
- Claude Code は `docs/ai-collab/tasks/` の `status: approved` だけを処理する。
- **遊びの一文**は ChatGPT が TSV 行で出す。Claude Code は形式・割当数・元行とのメカニクス重複・IP を機械検査してから取り込む。I/J/K の var.tsv 作成時と同じ自己検査を流用する。

### 13.5 Claude Code から実装結果を返す方法

`docs/ai-collab/reports/<task-id>.md` に、次の項目を毎回同じ形式で残します。

- 変更ファイル・コミットSHA・ブランチ
- 検証コマンドと結果（tsc / test / lint / build / check-game / smoke / ip / dup の数値）
- 未解決事項、判断が必要な点、意図的に変えなかった点
- ゲームの場合: パス、@mechanic、世界観1行、スコア、smoke 結果、contact sheet の保存場所

ChatGPT にはこのレポートと PR の差分を渡してレビューしてもらいます。

### 13.6 レビューと再実装のループ

1. ChatGPT がレポートを読み、指摘を「必須 / 任意」に分けて新しいタスク（type: review）として出す。
2. Claude Code は必須を実装し、任意は採否と理由を返す。
3. 2周しても決着しないものは、人間が裁定する（`requires_human_approval: true`）。
4. **数値ゲート（tsc / test / lint / build / validator / smoke / ip / dup）は AI 同士の合意で緩めない**。

### 13.7 人間による最終承認が必要な工程

- `main` へのマージ、本番デプロイ、`ai:upload:games`、本番 DB へのマイグレーション適用。
- 価格・課金設定、Stripe・AdSense の設定、返金方針。
- 特商法・利用規約などの法務文面、店舗との契約、収益分配。
- I/J/K など他社IPがジャンル上の元ネタになっている棚の公開可否、CAPCOM/SNK 許諾の適用範囲。
- 外部への投稿（Slack を含む）、SNS 投稿、外部サービスの新規契約。
- マスタープランのゲート変更（例: 拠点の実測前に量産を続けるか）。

### 13.8 既存の開発ルールを維持する方法

- タスクは必ず正本文書を参照させる。新ルールは WP 文書か `CLAUDE.md` に追記してから使う。
- `contract.ts` を単一の正とする（ルールJSON系）。ゲームは WP70 に従う。
- ブランチ運用: AI は feature ブランチのみを使い、force-push・amend は禁止。
- 秘密情報は文書・タスク・レポートに書かない（環境変数は名前のみ）。
- 生成物（`dup-scan-games.csv` 等）はコミットしない。

---

## 14. Slack との接続設計（提案。今回は接続していない）

### 14.1 範囲の制限

- 接続先は **非公開チャンネル `#ockham_strategy` と、そこで明示的に許可された Canvas / Lists のみ**。
- 他チャンネル・DM・ワークスペース横断検索は使わない。
- 許可リストはリポジトリ外の設定（エージェント側の設定）で管理し、チャンネルIDと Canvas/List ID を明示する。
- 投稿してよい内容: 進捗の数値、タスクの状態、承認依頼、リスク。
- 投稿しない内容: ゲームのソースコード、秘密情報、個人情報、店舗との契約条件の詳細（人間が許可した場合を除く）。

### 14.2 既存の日次 ToDo 運用との接続方法（案）

1. **日次サマリ（読み取り元はリポジトリのみ）**
   - Claude が `git log`、plays TSV の built 件数、CI 結果、`docs/ai-collab/tasks/*` の status を集計し、次の形式の短いサマリを作る。
     ```
     [Swizzle] 11/13  I 392/400 | J 316/350 | K 134/400 | GH 100/386
     ビルド: OK/NG  テスト: 604/604  未マージ: 67 commits
     本日完了: …  ブロッカー(人間): 特商法文面 / 実決済テスト / PR承認
     ```
   - これを既存の日次 ToDo 運用（`#ockham_strategy` の Canvas/List）の Swizzle 欄に**追記・更新**する。
2. **Lists の項目対応**: §12 のタスク表の P0〜P1 を List の1行ずつに対応づける。列は ID・担当（human/chatgpt/claude）・状態・完了条件。
3. **承認依頼**: `requires_human_approval: true` のタスクは、Slack では「承認待ち」状態にするだけにする。承認そのものは人間が PR・タスクファイル上で行い、Slack 上の自由文を承認とみなさない。
4. **書き込みの頻度・権限**: 1日1回の更新。新規投稿より既存 Canvas/List の更新を優先する。人間が設定するまでは「下書き（draft）として作成 → 人間が送信」の運用にする。
5. **情報の向き**: 原則としてリポジトリから Slack への一方向。Slack 上の指示をタスク化するときは、人間がタスクファイルに起票する（Slack 本文を直接コードの指示にしない）。

---

## 15. 人間の判断が必要な事項

1. 作業ブランチ（約70コミット、1,225本の新規ゲーム）を `main` に統合するか（ビルドとテストは green）。
0. （先に）Vercel に Supabase 環境変数を設定して再デプロイする（§4.10）。
2. どの棚を本番に出すか（特に I/J/K の権利判断）。CAPCOM/SNK 許諾の範囲と根拠書面の所在。
3. マスタープランのゲート: 拠点の実測前に量産（K 266本など）を続けるか、実証1拠点を先にするか。
4. 価格: ゲームごとの価格ティア、既定のプレイ回数（現在3回/24時間）。
5. 特商法表記の記載事項、返金規約、店舗との契約形態、店舗への収益分配。
6. Stripe 本番 webhook の設定確認、AdSense スロットの設定。
7. `generate-games.yml`（毎時 cron）を残すか止めるか。
8. バックアップ・PITR の方針（`docs/OPERATIONS.md` の TODO）。
9. 旧797本と旧生成ライン（template-factories など）の削除時期（WP69 Phase 6）。
10. Slack 連携の権限範囲（チャンネル・Canvas・List の ID）と、自動投稿か下書きかの選択。
11. 人間のプレイテストを誰がどの頻度で行うか（面白さの最終判定）。

---

## 16. 最初の1週間に進めるべき実装計画（案）

| 日 | Claude Code | ChatGPT | 人間 |
|---|---|---|---|
| 1日目 | （P0-a/b/c は完了済み）I 棚の残り8本、PR 作成の準備 | 本資料を読み、タスク形式（§13.2）と最初の5タスクを起票 | §15 の 1・3・7 を判断 |
| 2日目 | J-var 34本の制作開始（利用上限の解除後） | I/J/K のうち本番候補を棚単位でレビュー（IP・UX 観点） | `generate-games.yml` の確認 |
| 3日目 | P2-b 台帳の再生成、PR 作成（作業ブランチ → `main`）と CI green の確認 | PR のレビュー（ゲームのサンプル、スクリーンショット） | PR マージの可否判断 |
| 4日目 | P2-a postMessage の送信元検証（テスト付き）、P1-d 価格ティアの実装方式の準備 | 実証拠点の運用案（POP・声かけ・ラインナップ10本の選定） | `ai:upload:games` 実行、拠点・価格の決定 |
| 5日目 | 実証拠点の管理画面作業の支援（データは人間）、実決済テストの手順書作成 | 特商法・返金規約の文案（人間がレビュー） | 1件の実決済テスト（P1-b） |
| 6〜7日目 | J-var 34本の制作（WP70）、または P1-c の実装（文面が確定していれば） | 拠点データの読み方・次の棚優先度の提案 | 実証拠点の設置 |

---

## 別のAIが開発を再開するための最初の指示

> 以下を、新しく参加する AI（Claude Code または ChatGPT）への最初のメッセージとして使ってください。

```
あなたは Swizzle（5〜30秒のミニゲームを、飲食店に置いた NFC/QR から1プレイ課金で遊ばせる
プラットフォーム）の開発に参加します。リポジトリは dondokodongames/swizzle、
作業ブランチは claude/dreamy-einstein-dmr3y8（main より約70コミット先行・未マージ）です。

1. まず次の順で読むこと（読み終えるまで変更しない）:
   SWIZZLE_HANDOVER_2026-11-12.md → CLAUDE.md → docs/work-plans/69-master-plan.md
   → docs/work-plans/70-shelf-variation-batch-brief.md → docs/specifications/PLAY_GRAMMAR_V3.md
   → docs/specifications/IP_SAFETY_RULES.md
   README.md は古い（PixiJS・20テンプレートの記述）ので、前提にしないこと。

2. 環境確認（Claude Code の場合）:
   git fetch && git status（未コミットのゲームファイルの有無を確認）
   node_modules が無ければ npm ci
   npx tsc --noEmit --skipLibCheck / npm run test / npm run lint / npm run build
   2026-11-12 時点の既知の結果: すべて成功（build 成功・test 604/604・tsc 0・lint エラー0）。
   アプリ起動時の「Missing Supabase environment variables」はデプロイ先の環境変数の未設定が原因（§4.10）。

3. 最初のタスクは §12 の残り（P0-d の PR 準備、I 棚の残り8本、P2-a のセキュリティ修正）。完了条件は
   §12 の表のとおり。修正は最小限にし、feature ブランチに
   commit/push。main へのマージ、npm run ai:upload:games、本番DB・Stripe・デプロイ操作は
   人間の承認なしに行わない。

4. ゲームを作る・直すときは WP70 の手順と数値ゲート（check-game ≥80・onUpdate 1回・
   smoke 2回 PASS・games:ip 0件・dup-plays の基準）を必ず守り、計画と実績、検証済みと
   未確認を区別して報告すること。秘密情報は出力しない。Slack は人間が許可した
   #ockham_strategy の Canvas/List 以外に触れない。

5. 作業の終わりには、変更ファイル・コミットSHA・検証コマンドの結果・未解決事項を
   docs/ai-collab/reports/ 形式（本資料 §13.5）でまとめて返すこと。
```

---

*本資料は 2026-11-12 時点の調査結果です。数値（ゲーム本数・テスト件数・コミット数）は作業の進行で変わるため、利用時に §16 の環境確認コマンドで再確認してください。*
