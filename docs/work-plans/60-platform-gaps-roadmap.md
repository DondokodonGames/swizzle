# WP60: プラットフォーム改善ロードマップ — ゲーム以外の欠落と次のアクション

**作成**: 2026-07-06 / **種別**: プロジェクト全体監査(①サービス面 ②収益化・運用 ③技術基盤の3方向)に基づく実行計画
**前提**: ゲーム側の品質基盤(API v2・品質基準v2・800本引き上げ工程)は WP50〜56 で整備済み。本書は**ゲーム以外**の全部。

> 使い方: 各項目は「1項目 = 1セッション」で着手できる粒度。上から順に、担当欄(Opus=Claude Code / Sonnet=軽量セッション / 人間)に従って消化する。
> 根拠は全て `ファイル:行` で裏取り済み(2026-07-06時点、ブランチ `claude/swizzle-quality-roadmap-15ctzw`)。

---

## 0. 総評 — 既に堅い領域(再スコープ禁止)

以下は監査で「実在し、動く」ことを確認済み。作り直しの提案をしないこと:

- **CI**: `.github/workflows/ci.yml`(tsc / test 518件 / lint、main+claude/**+PR)。エッジ関数自動デプロイ(`deploy-supabase-functions.yml`)も稼働
- **Stripe配管**: サブスクリプションは本番検証済みフルスタック。NFC/QR従量課金はPayment Link**自動生成**(`supabase/functions/create-payment-link/index.ts` — ゲームごとの手作業不要)+webhook+トークン検証まで一気通貫。ウォレット(作成クレジット)も動作
- **セキュリティ**: RLS堅牢化migration群 / 秘密鍵のリポジトリ混入なし / iframeサンドボックス `allow-scripts` のみ(不透明オリジン) / vercel.json のCSP+セキュリティヘッダ
- **i18n**: 9言語×8名前空間、キー整合チェック合格(`scripts/check-i18n-keys.cjs`)
- **ソーシャル基盤**: フォロー/いいね/ブックマーク/アクティビティは配線済み(`src/social/services/SocialService.ts`)
- **アナリティクス計測**: 10イベントのクライアント計測(`src/services/analytics/Analytics.ts` → `analytics_events`)

---

## P0 — ローンチブロッカー(法務・信頼)

有料課金(¥10〜100/プレイ)を公開する前に必須。**週1で全消化を推奨。**

### P0-1. 特定商取引法に基づく表記ページ 【人間+Sonnet / S】
- **根拠**: `grep -rni "特定商取引|特商" src docs public` → 0ヒット。`src/pages/AboutPage.tsx` は連絡先メールのみで事業者名/住所/電話/返金・キャンセル規約がない
- **やること**: 人間が記載事項(事業者名・所在地・連絡先・価格・支払時期・提供時期・返金規約)を確定 → `/tokushoho` ページ追加(`src/pages/TokushohoPage.tsx` + `App.tsx` ルート + フッターリンク)。TermsPage/PrivacyPage と同構成
- **受け入れ**: 有料ゲームの決済導線(PlayGamePage)から1タップで到達できる

### P0-2. アカウント削除(退会)フロー 【Opus / M】
- **根拠**: `grep "deleteAccount|退会|アカウント削除"` → 0ヒット。`ProfilePage.tsx:611` の編集モーダルはプロフィール編集のみ。個人情報保護・ストア審査の必須要件
- **やること**: エッジ関数 `delete-account`(auth.users削除+user_games等の匿名化or削除方針は人間が決定)+ ProfilePage に確認2段階付き退会UI
- **受け入れ**: 退会後に再ログイン不可・公開ゲームの扱いが規約と一致

### P0-3. UGC通報・ブロック 【Opus / M】
- **根拠**: `report|block|通報|ブロック` のヒットは全てゲームエンジン内部(FlagManager等)でモデレーションUIは0。ユーザー作成ゲームを有料で遊ばせる以上、悪質コンテンツの通報経路は必須
- **やること**: `game_reports` テーブル(reporter/game_id/reason/status、RLS)+ BridgeScreen/PlayGamePage に通報ボタン + GameReviewQueue に通報キュー統合(review_status既存フローに載せる)
- **受け入れ**: 通報→管理者が非公開化までをアプリ内で完結

### P0-4. エラートラッキング導入(Sentry等) 【Opus / S-M】
- **根拠**: 観測系依存ゼロ(`package.json` にsentry/datadog等なし)。`ErrorBoundary.tsx:27` / `CodeGameRunner.ts:117` は console.error のみ。`Analytics.ts:18-28` にエラーイベント型なし。**本番の障害・「静かに壊れたゲーム」が現状完全に不可視**
- **やること**: @sentry/react 導入(ErrorBoundary連携・window.onerror/unhandledrejection・CodeGameRunnerのゲームERRORをタグ付き送信)。CSP connect-src に追記。DSNは env
- **受け入れ**: 意図的に throw したエラーがダッシュボードに届く

### P0-5. スキーマドリフト解消 + バックアップ方針 【Opus+人間 / M】
- **根拠**: `src/lib/database.types.ts` は14テーブルを定義するが、`supabase/migrations/` に CREATE があるのは7つのみ。**profiles / likes / follows / notifications / playlists / playlist_games / game_favorites / game_shares / activities / reactions / user_preferences / game_scores は migration 不在**(手動SQL `SUPABASE_SETUP.md` のみ)→ クリーンDBを migrations から再構築できず、災害復旧不能。バックアップ運用の文書も無い
- **やること**: 本番スキーマから不足分の CREATE TABLE + RLS を migration にバックフィル(`supabase db diff` 利用)。未使用の `game_scores` 型は削除 or migration追加のどちらかに確定(ベストスコアは現在 localStorage のみ=`BestScoreStore.ts`)。`docs/OPERATIONS.md` に Supabase PITR/バックアップ・リストア手順を明文化(人間がプラン確認)
- **受け入れ**: 新規Supabaseプロジェクトに migrations 適用だけでアプリが起動する

### P0-6. 404ページ + 課金画面のi18n 【Sonnet / S】
- **根拠**: `App.tsx:826` の `/*` が未知URLを全てゲーム起動にしてしまう(NotFound 0ヒット)。また既定言語 en なのに課金画面が日本語ハードコード(`PlayGamePage.tsx:377-421` 「決済を確認中...」「¥{price} でプレイ」等。`ErrorBoundary.tsx:50` も同様)
- **やること**: NotFoundPage 追加+ルート整理 / PlayGamePage・ErrorBoundary の文言を i18n キー化(9言語分は既存名前空間に追加)
- **受け入れ**: `/xyz` が404表示 / en設定で課金画面が英語

---

## P1 — 収益を「実在」させる(コードは在るが収益ゼロ or 不可視)

### P1-1. Stripe本番webhookイベント設定の検証 【人間 / 即時・S】
- **根拠**: `docs/STRIPE_PRODUCTION_CHECKLIST.md:36-42` の「必要なイベント」一覧がサブスク系のみで、**ゲーム従量課金とトップアップが依存する `checkout.session.completed`(`stripe-webhook/index.ts:116-121` の game_payment/topup 分岐)が記載漏れ**。チェックリスト通りに本番エンドポイントを設定すると従量課金収益が無音で欠落する。なお同ファイルのチェックボックスは全て未チェックのまま(履歴表は完了と主張しており、真実が不明)
- **やること**: Stripeダッシュボードで本番webhookの購読イベントを実物確認 → checkout.session.completed を含める → チェックリストを実態に合わせて更新。テスト決済1件で `one_time_access` 行が生えることを確認
- **受け入れ**: 本番テスト購入→トークン発行→プレイまでE2Eで成功

### P1-2. AdSenseスロットID設定+審査 【人間 / S】
- **根拠**: `AdUnit.tsx:117` はスロットID未設定時プレースホルダ描画。`VITE_ADSENSE_SLOT_GAME_BRIDGE/_GAME_LIST/_EDITOR` 未設定(`docs/work-plans/42-monetization-activation.md:25` の未了人間タスク)。クライアントID・ads.txt・CSPは準備済みなので**残りは設定作業だけで広告収益が始まる**
- **受け入れ**: 本番でFreeユーザーに実広告が表示される

### P1-3. 収益アナリティクス(「どのゲームが稼いだか」を回答可能に) 【Opus / S】
- **根拠**: `Analytics.ts:18-28` に purchase/収益イベントが無い。NFC購入は一切計測されず、topup_complete/subscribe も金額なし。ゲーム別収益は `one_time_access.amount_paid_yen` に眠るだけで結合クエリもUIも無い → **収益に関する意思決定が全て不能**
- **やること**: `purchase` イベント(gameId, amount_yen, method: nfc/wallet/subscription)を追加し、webhook成功時にサーバー側からも `analytics_events` へ記録(エッジ関数から直接insert)。`docs/analytics/queries.md` にゲーム別収益クエリを追加
- **受け入れ**: SQLひとつで「ゲーム別売上ランキング」が出る

### P1-4. 返金・チャージバック処理 【Opus / S-M】
- **根拠**: `stripe-webhook/index.ts:110-164` のswitchに `charge.refunded` / `charge.dispute.created` が無い。返金しても `one_time_access` トークンは有効なまま、チャージバックはアプリから不可視
- **やること**: webhookに両ケースを追加(該当セッションのトークンを失効・payments行を更新)+ 管理向けログ。特商法ページの返金規約(P0-1)と整合
- **受け入れ**: Stripeテストの返金でトークンが無効化される

### P1-5. 管理ダッシュボード(最小構成) 【Opus / L】
- **根拠**: `src/pages/admin/` は NFCスポット管理のみ。収益・ファネル・リテンション・ユーザー管理(ban/is_admin付与)の画面が無く、KPIは `docs/analytics/queries.md` の手動SQLだけ。`is_admin` はDB直編集でしか付与できない(`20260512_profiles_is_admin.sql`)
- **やること**: `/admin/dashboard` — queries.md の主要SQL(DAU/ファネル/D1/ゲーム別売上・完了率)をRPC化してカード+表で表示。`/admin/users` — 検索/ban(is_published一括非公開)/is_admin付与。既存 `useIsAdmin` でガード
- **受け入れ**: オーナーがSQLを書かずに週次KPIと収益を確認できる

---

## P2 — 共有・発見の装置(バイラル基盤)

### P2-1. `/play/:gameId` の動的OGP 【Opus / M】
- **根拠**: OGPは `index.html` の静的タグのみ(playswizzle.com共通画像)。`vercel.json` が全パスを index.html にrewriteするため、**共有されたゲームリンクが全部同じ見た目=拡散装置が壊れている**。共有ボタン(BridgeScreen)は実装済みなのに受け皿が無い状態
- **やること**: Vercel Edge Function(または `api/og/[gameId]`)でクローラー向けにタイトル/説明/サムネイル(thumbnail_url)を埋めたHTMLを返す。OG画像はサムネ流用から開始(生成は後続)
- **受け入れ**: X/LINEに貼った2つのゲームURLが別のカード表示になる

### P2-2. robots.txt + sitemap.xml 【Sonnet / S】
- **根拠**: `public/` に両方存在しない。公開ゲームページがクロール不能
- **やること**: robots.txt(admin系Disallow)+ 公開ゲームURLのsitemap自動生成(ビルド時 or エッジで動的)
  
### P2-3. manifest.json + Service Worker(PWA) 【Sonnet / M】
- **根拠**: 両方なし(`grep manifest index.html` 空)。apple-mobile-web-app-capable だけ設定済みで実体が無い
- **やること**: vite-plugin-pwa でマニフェスト+最小SW(シェルキャッシュ)。ホーム画面追加の導線はP2-5と統合

### P2-4. メール通知(再訪装置) 【Opus / M】
- **根拠**: `NotificationService.ts:37` の emailNotifications フラグは既定false・送信実装ゼロ(`grep sendEmail` 空)。プッシュも service worker が無く不成立 → **再訪チャネルが存在しない**
- **やること**: Resend(またはSupabase SMTP)で「フォローされた/いいねされた/週間ダイジェスト」の3通から開始。オプトイン設計
  
### P2-5. 初回オンボーディング 【Sonnet / S-M】
- **根拠**: onboarding/firstRun UI 0ヒット。初見ユーザーがいきなり全画面ゲームに投げ込まれる(`App.tsx:436`)
- **やること**: 初回のみの3枚オーバーレイ(①遊ぶ=タップ ②次へ=スワイプ ③自分でも作れる)+ localStorageフラグ

---

## P3 — 技術負債・性能(継続改善、P0/P1と並走可)

| 項目 | 根拠 | 工数 |
|------|------|------|
| postMessage受信の送信元検証(`e.source === iframe.contentWindow`) | `CodeGameRunner.ts:94-120` が任意windowからのGAME_ENDを受理(サンドボックスで緩和済みだがスコア偽装可能) | S |
| discord.js / twitter-api-v2 / node-cron / openai / stripe(サーバSDK)を devDependencies へ | `package.json:87-100` — CLIスクリプト専用の重量Node依存が本番depsに混入 | S |
| ルートの React.lazy 分割 | `vite.config.ts:39-60` はvendor分割のみ、ページは全て先読み | S-M |
| SocialService の直列クエリ削減 | `SocialService.ts:76-115` ユーザー/likes/favoritesを逐次await | M |
| 古い `typescript_errors.log` の削除 | 参照先 `TemplateIntegrator.ts` は既に存在しない(ログが陳腐化)。現行 tsc はクリーン | S |
| WP33残項目の実行 | 承認済みで未着手: #3 EditorGameBridge分割(1,653行) / #4 ReviewQueue二重実装統一(`ReviewQueue.tsx`+`GameReviewQueue.tsx` 両方現存) / #5 AI v2 schemaVersion / #7 エディタ共通化(`docs/architecture-review.md:434-444`) | L |
| コメント機能の実装可否確定 | `SocialService.createActivity:416` に'comment'型宣言のみ、UI/保存なし。P0-3の通報と同時に設計判断 | 判断のみ |
| クリエイター収益分配 | `docs/growth/monetization-decision.md:124-152` の設計のみ。**ゲート(アクティブ50クリエイター・広告月10万円)到達まで凍結を維持** | 凍結 |
| ErrorBoundary の文言改善(生メッセージ非表示・i18n) | `ErrorBoundary.tsx:50-52` | S |
| 法務ページ(Terms/Privacy/About)の多言語化 | 現状英語ハードコード | S |
| ゲストプレイの一般化(匿名authをNFC以外にも) | `NfcSpotPage.tsx:59` のみ signInAnonymously | M |

---

## 実行順序の推奨

```
週1(公開前必須): P0-1 特商法 / P0-2 退会 / P0-3 通報 + P1-1 Stripe webhook検証 / P1-2 AdSenseスロット
週2(見える化):   P0-4 Sentry / P0-5 スキーマドリフト / P1-3 収益イベント / P0-6 404+i18n
週3(拡散装置):   P2-1 動的OGP / P2-2 robots+sitemap / P1-4 返金処理 / P1-5 ダッシュボード着手
以降:            P2-3〜5(PWA/メール/オンボーディング) → P3 を WP33残と併走
```

## 進捗チェックリスト

- [ ] P0-1 特商法表記(人間+Sonnet/S)
- [ ] P0-2 退会フロー(Opus/M)
- [ ] P0-3 通報・ブロック(Opus/M)
- [x] P0-4 Sentry(Opus/S-M)
- [ ] P0-5 スキーマドリフト+バックアップ(Opus+人間/M)
- [x] P0-6 404+課金画面i18n(Sonnet/S)
- [ ] P1-1 Stripe webhook検証(人間/S・即時)
- [ ] P1-2 AdSenseスロット(人間/S)
- [x] P1-3 収益アナリティクス(Opus/S)
- [x] P1-4 返金・チャージバック(Opus/S-M)
- [ ] P1-5 管理ダッシュボード(Opus/L)
- [x] P2-1 動的OGP(Opus/M)
- [x] P2-2 robots+sitemap(Sonnet/S)
- [x] P2-3 PWA(Sonnet/M)
- [ ] P2-4 メール通知(Opus/M)
- [ ] P2-5 オンボーディング(Sonnet/S-M)
- [ ] P3(上表、随時)

## 全項目共通の受け入れ基準

`npx tsc --noEmit --skipLibCheck` クリーン / `npm run test` 全green / `npm run lint` 0エラー(CIと同条件)。
DB変更は必ず `supabase/migrations/` に残す(P0-5以降、手動SQL禁止)。
