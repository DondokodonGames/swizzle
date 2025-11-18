# Swizzle プロジェクト構造ドキュメント

## 概要

Swizzleは、5〜30秒で完結するショートゲームプラットフォームです。TikTok/YouTubeショートのようなUXで「簡単に作って、簡単に遊ぶ」を実現します。

**技術スタック**: React 18 + TypeScript + PixiJS 7.x + Supabase + Stripe

---

## 目次

1. [コア/エントリーポイント](#1-コアエントリーポイント)
2. [認証関連](#2-認証関連)
3. [エディター関連](#3-エディター関連)
4. [ゲームプレイ関連](#4-ゲームプレイ関連)
5. [マネタイズ関連](#5-マネタイズ関連)
6. [ソーシャル機能関連](#6-ソーシャル機能関連)
7. [AI機能関連](#7-ai機能関連)
8. [UI共通コンポーネント](#8-ui共通コンポーネント)
9. [ユーティリティ・フック](#9-ユーティリティフック)
10. [型定義](#10-型定義)
11. [定数・設定](#11-定数設定)
12. [設定ファイル](#12-設定ファイル)

---

## 1. コア/エントリーポイント

| ファイル | 目的 |
|----------|------|
| `src/main.tsx` | React DOMルートエントリーポイント。React StrictModeでアプリをラップ |
| `src/App.tsx` | グローバルアプリケーションルーター・状態管理。3つのモード（シーケンス/エディター/フィード）を管理 |
| `src/index.css` | グローバルスタイル定義 |
| `vite.config.ts` | Viteビルド・開発サーバー設定。チャンク分割最適化 |
| `tsconfig.json` | TypeScriptコンパイラ設定 |
| `package.json` | プロジェクト設定・依存ライブラリ管理 |

---

## 2. 認証関連

### フック・サービス

| ファイル | 目的 |
|----------|------|
| `src/hooks/useAuth.ts` | グローバル認証状態管理フック。signUp/signIn/signOut/updateProfile等を提供 |
| `src/lib/supabase.ts` | Supabaseクライアント・データベースAPI集約。auth/database/storageオブジェクトを提供 |

### コンポーネント

| ファイル | 目的 |
|----------|------|
| `src/components/auth/AuthModal.tsx` | ログイン/登録タブ切り替えモーダル |
| `src/components/auth/ProfileSetup.tsx` | プロフィール設定・編集モーダル |
| `src/components/auth/ProtectedRoute.tsx` | ルート保護コンポーネント |

### ページ

| ファイル | 目的 |
|----------|------|
| `src/pages/SignupPage.tsx` | サインアップページ |
| `src/pages/LoginPage.tsx` | ログインページ |
| `src/pages/ProfilePage.tsx` | プロフィール表示ページ (`/profile/:username`) |

---

## 3. エディター関連

### メインエディター

| ファイル | 目的 |
|----------|------|
| `src/components/editor/EditorApp.tsx` | エディター入口。モード管理（selector/editor/testplay） |
| `src/components/editor/GameEditor.tsx` | メインエディター画面 |
| `src/components/editor/ProjectSelector.tsx` | プロジェクト一覧・新規作成 |

### タブ・ナビゲーション

| ファイル | 目的 |
|----------|------|
| `src/components/editor/common/TabNavigation.tsx` | 3タブナビゲーション（ASSETS/SCRIPT/SETTINGS） |
| `src/components/editor/tabs/AssetsTab.tsx` | 統合アセット管理タブ |
| `src/components/editor/tabs/ScriptTab.tsx` | ルール・成功条件エディタータブ |
| `src/components/editor/tabs/SettingsTab.tsx` | ゲーム設定・公開設定タブ |

### アセットセクション

| ファイル | 目的 |
|----------|------|
| `src/components/editor/tabs/assets/sections/BackgroundSection.tsx` | 背景画像管理（4フレームアニメ対応） |
| `src/components/editor/tabs/assets/sections/ObjectSection.tsx` | オブジェクト管理（8フレーム、複数配置） |
| `src/components/editor/tabs/assets/sections/SoundSection.tsx` | 音声管理（BGM + SE複数） |

### スクリプト関連

| ファイル | 目的 |
|----------|------|
| `src/components/editor/script/RuleList.tsx` | ルール一覧表示 |
| `src/components/editor/script/SimpleRuleModal.tsx` | 簡易ルール作成UI |
| `src/components/editor/script/AdvancedRuleModal.tsx` | 高度なルール編集 |
| `src/components/editor/script/RulePreview.tsx` | ルール内容プレビュー |
| `src/components/editor/script/GamePreview.tsx` | テストプレイプレビュー |
| `src/components/editor/script/BackgroundControl.tsx` | 背景アニメーション制御 |
| `src/components/editor/script/TimeBarSelector.tsx` | 時間バー選択UI |
| `src/components/editor/script/CounterRuleComponents.tsx` | カウンター条件・アクション |
| `src/components/editor/script/RandomRuleComponents.tsx` | ランダム条件・アクション |

### 条件エディター

| ファイル | 目的 |
|----------|------|
| `src/components/editor/script/conditions/TouchConditionEditor.tsx` | タッチ判定条件 |
| `src/components/editor/script/conditions/TimeConditionEditor.tsx` | 時間経過条件 |
| `src/components/editor/script/conditions/CollisionConditionEditor.tsx` | 衝突判定条件 |
| `src/components/editor/script/conditions/FlagConditionEditor.tsx` | フラグ条件 |
| `src/components/editor/script/conditions/AnimationConditionEditor.tsx` | アニメーション終了条件 |
| `src/components/editor/script/conditions/GameStateConditionEditor.tsx` | ゲーム状態条件 |

### アクションエディター

| ファイル | 目的 |
|----------|------|
| `src/components/editor/script/actions/ShowHideActionEditor.tsx` | 表示/非表示アクション |
| `src/components/editor/script/actions/MoveActionEditor.tsx` | 移動パターンアクション |
| `src/components/editor/script/actions/AnimationActionEditor.tsx` | アニメーション切り替えアクション |
| `src/components/editor/script/actions/EffectActionEditor.tsx` | エフェクトアクション（フラッシュ・シェイク等） |
| `src/components/editor/script/actions/SoundActionEditor.tsx` | 音声再生アクション |
| `src/components/editor/script/actions/FlagActionEditor.tsx` | フラグ操作アクション |

### 定数

| ファイル | 目的 |
|----------|------|
| `src/components/editor/script/constants/RuleLibrary.ts` | ルール・アクション完全リファレンス |
| `src/components/editor/script/constants/ShowHideConstants.ts` | 表示/非表示定数 |
| `src/components/editor/script/constants/AnimationConstants.ts` | アニメーション定数 |
| `src/components/editor/script/constants/FlagConstants.ts` | フラグ定数 |

### その他エディター

| ファイル | 目的 |
|----------|------|
| `src/components/editor/counter/CounterManager.tsx` | カウンター追加・編集UI |
| `src/components/editor/modals/VisualRuleEditor.tsx` | ビジュアルルール編集 |
| `src/components/editor/common/ProjectCard.tsx` | プロジェクトカード表示 |

### エディターサービス

| ファイル | 目的 |
|----------|------|
| `src/services/editor/EditorGameBridge.ts` | エディター ↔ ゲーム実行エンジン連携 |
| `src/services/editor/ProjectStorage.ts` | プロジェクト保存・読み込み |
| `src/services/editor/ProjectStorageManager.ts` | 複数プロジェクト管理 |
| `src/services/editor/GameProjectCopier.ts` | プロジェクト複製機能 |
| `src/services/editor/ErrorHandlingSystem.tsx` | エディター用エラーハンドリング |

### エディターフック

| ファイル | 目的 |
|----------|------|
| `src/hooks/editor/useGameProject.ts` | プロジェクト操作フック（create/load/save/delete/duplicate） |
| `src/hooks/editor/useAssetUpload.ts` | ファイルアップロードフック |
| `src/hooks/editor/useAudioPlayback.ts` | 音声再生フック |
| `src/hooks/editor/useNotification.ts` | 通知表示フック |

---

## 4. ゲームプレイ関連

### コンポーネント

| ファイル | 目的 |
|----------|------|
| `src/components/GameSequence.tsx` | ゲーム連続プレイUI + ブリッジ画面統合 |
| `src/components/GameFeed.tsx` | ユーザー作成ゲーム一覧表示 |
| `src/components/BridgeScreen.tsx` | ゲーム間の遷移画面（カウントダウン・クリエイター情報） |
| `src/components/ProfileModal.tsx` | ユーザープロフィール表示モーダル |

### ゲームエンジン

| ファイル | 目的 |
|----------|------|
| `src/services/rule-engine/RuleEngine.ts` | IF-THENルール実行エンジン。8種類の条件判定、10以上のアクション実行 |

### ナビゲーション

| ファイル | 目的 |
|----------|------|
| `src/components/navigation/NavigationManager.tsx` | ナビゲーション管理 |

---

## 5. マネタイズ関連

### 型定義

| ファイル | 目的 |
|----------|------|
| `src/types/MonetizationTypes.ts` | マネタイズシステム全型定義（Subscription/Payment/UserCredit等） |

### サービス

| ファイル | 目的 |
|----------|------|
| `src/services/monetization/StripeService.ts` | Stripe API統合（Checkout Session作成等） |
| `src/services/monetization/SubscriptionService.ts` | サブスクリプション状態管理 |
| `src/services/monetization/CreditService.ts` | ゲーム作成クレジット管理 |

### フック

| ファイル | 目的 |
|----------|------|
| `src/hooks/monetization/useSubscription.ts` | サブスクリプション状態フック |
| `src/hooks/monetization/useCredits.ts` | クレジット利用状況フック |
| `src/hooks/monetization/usePaywall.ts` | ペイウォール表示制御フック |

### コンポーネント

| ファイル | 目的 |
|----------|------|
| `src/components/monetization/PricingTable.tsx` | 料金表示コンポーネント |
| `src/components/monetization/CheckoutButton.tsx` | Stripe チェックアウトボタン |
| `src/components/monetization/PaywallModal.tsx` | 制限時ペイウォールモーダル |
| `src/components/monetization/SubscriptionManager.tsx` | サブスクリプション管理画面 |
| `src/components/monetization/AdUnit.tsx` | 広告配置コンポーネント |
| `src/components/monetization/PremiumBadge.tsx` | Premium ユーザーバッジ |

### ページ

| ファイル | 目的 |
|----------|------|
| `src/pages/subscription/Pricing.tsx` | 料金プランページ (`/pricing`) |
| `src/pages/subscription/SubscriptionSuccess.tsx` | 決済完了ページ |
| `src/pages/subscription/SubscriptionCancel.tsx` | 決済キャンセルページ |

### Edge Functions

| ファイル | 目的 |
|----------|------|
| `supabase/functions/create-checkout-session/index.ts` | Checkout Session作成 |
| `supabase/functions/create-customer-portal/index.ts` | Customer Portal Session作成 |
| `supabase/functions/stripe-webhook/index.ts` | Stripe Webhook処理 |
| `supabase/functions/_shared/stripe.ts` | 共有Stripe処理 |

---

## 6. ソーシャル機能関連

### サービス

| ファイル | 目的 |
|----------|------|
| `src/social/services/SocialService.ts` | 公開ゲーム取得・いいね・ブックマーク・トレンド機能 |
| `src/social/services/NotificationService.ts` | 通知管理（フォロー・いいね等） |

### 型定義

| ファイル | 目的 |
|----------|------|
| `src/social/types/SocialTypes.ts` | PublicGame/UserGame/GameFilters等の型定義 |

### コンポーネント

| ファイル | 目的 |
|----------|------|
| `src/social/components/SocialIntegration.tsx` | ソーシャル機能プロバイダー |

---

## 7. AI機能関連

### コアオーケストレーター

| ファイル | 目的 |
|----------|------|
| `src/ai/MasterOrchestrator.ts` | AI生成システム統括。24時間自動稼働対応 |
| `src/ai/index.ts` | CLI実行スクリプト (`npm run ai:generate`) |

### ジェネレーター

| ファイル | 目的 |
|----------|------|
| `src/ai/generators/LogicGenerator.ts` | ゲームロジック自動生成 |
| `src/ai/generators/ImageGenerator.ts` | 画像生成（DALL-E等統合予定） |
| `src/ai/generators/SoundGenerator.ts` | 効果音生成 |

### 品質管理

| ファイル | 目的 |
|----------|------|
| `src/ai/checkers/DynamicQualityChecker.ts` | 動的品質チェック |
| `src/ai/standards/AdaptiveStandards.ts` | 適応的品質基準 |
| `src/ai/analyzers/GamePortfolioAnalyzer.ts` | ポートフォリオ分析 |

### シミュレーション

| ファイル | 目的 |
|----------|------|
| `src/ai/simulators/PlayabilitySimulator.ts` | プレイ可能性シミュレーション |

### 出版・配信

| ファイル | 目的 |
|----------|------|
| `src/ai/publishers/AutoPublisher.ts` | 自動公開 |
| `src/ai/publishers/AssetRegistrar.ts` | アセット登録 |
| `src/ai/publishers/SupabaseUploader.ts` | Supabaseアップロード |
| `src/ai/publishers/SocialMediaPoster.ts` | SNS自動投稿 |
| `src/ai/publishers/ExplorationExploitationBalancer.ts` | 探索・利用バランス制御 |

### 型定義

| ファイル | 目的 |
|----------|------|
| `src/ai/types/GenerationTypes.ts` | GameSpec/GeneratedGame/GamePortfolio等 |

---

## 8. UI共通コンポーネント

### UIコンポーネント

| ファイル | 目的 |
|----------|------|
| `src/components/ui/ModernButton.tsx` | モダンスタイルボタン |
| `src/components/ui/ModernCard.tsx` | モダンスタイルカード |
| `src/components/ui/ArcadeButton.tsx` | アーケード風ボタン |
| `src/components/ui/ThemeSelector.tsx` | テーマ選択UI |
| `src/components/ui/GameThemeProvider.tsx` | テーマプロバイダー |
| `src/components/ui/DragDropZone.tsx` | ドラッグ&ドロップゾーン |

### 共通コンポーネント

| ファイル | 目的 |
|----------|------|
| `src/components/common/GameHeaderButtons.tsx` | ゲーム画面ヘッダーボタン |
| `src/components/common/FileUploader.tsx` | ファイルアップロードUI |
| `src/components/common/VolumeControl.tsx` | 音量制御UI |
| `src/components/common/TouchEffects.tsx` | タッチエフェクト表示 |
| `src/components/common/TimerBar.tsx` | 制限時間バー |

---

## 9. ユーティリティ・フック

### フック

| ファイル | 目的 |
|----------|------|
| `src/hooks/useAuth.ts` | 認証管理フック |
| `src/hooks/useTheme.ts` | テーマ管理フック |

### ユーティリティ

| ファイル | 目的 |
|----------|------|
| `src/utils/viewportUtils.ts` | ビューポート・レスポンシブ計算ユーティリティ |

### マネージャー

| ファイル | 目的 |
|----------|------|
| `src/managers/ThemeManager.ts` | テーマ管理サービス |

---

## 10. 型定義

### エディター型

| ファイル | 目的 |
|----------|------|
| `src/types/editor/GameProject.ts` | プロジェクト全体構造（GameSettings/EditorState/ProjectMetadata等） |
| `src/types/editor/GameScript.ts` | スクリプト・ロジック型定義（TriggerCondition/GameAction/GameRule等） |
| `src/types/editor/GameSettings.ts` | ゲーム設定インターフェース |
| `src/types/editor/ProjectAssets.ts` | アセット型定義 |

### その他型

| ファイル | 目的 |
|----------|------|
| `src/types/counterTypes.ts` | カウンター型定義（GameCounter/CounterOperation等） |
| `src/types/assetTypes.ts` | アセット共通型 |
| `src/types/MonetizationTypes.ts` | マネタイズ型 |
| `src/types/themeTypes.ts` | テーマ型 |

### ライブラリ型

| ファイル | 目的 |
|----------|------|
| `src/lib/database.types.ts` | Supabase生成型定義 |

---

## 11. 定数・設定

| ファイル | 目的 |
|----------|------|
| `src/constants/DesignSystem.ts` | デザインシステム（カラー/スペーシング/Typography/アニメーション/Z-Index等） |
| `src/constants/EditorLimits.ts` | エディター制限値（画像/音声サイズ制限、ルール上限等） |
| `src/constants/gameConfig.ts` | ゲーム実行設定 |

---

## 12. 設定ファイル

### ビルド・開発

| ファイル | 目的 |
|----------|------|
| `package.json` | 依存関係・スクリプト |
| `package-lock.json` | 依存関係ロック |
| `tsconfig.json` | TypeScript設定 |
| `tsconfig.node.json` | Node.js用TypeScript設定 |
| `vite.config.ts` | Viteビルド設定 |
| `.env.local.example` | 環境変数テンプレート |
| `.gitignore` | Git無視ファイル設定 |

### ドキュメント

| ファイル | 目的 |
|----------|------|
| `README.md` | プロジェクト概要・セットアップ・ロードマップ |
| `TESTING_GUIDE.md` | テスト実施ガイド |
| `CURRENT_HANDOVER.md` | 現状引き継ぎドキュメント |
| `project_status_report.md` | プロジェクト状態レポート |
| `implementation-status.json` | 実装進捗JSON |

### スタイル

| ファイル | 目的 |
|----------|------|
| `src/styles/arcade-theme.css` | アーケードテーマ |
| `src/styles/cute-theme.css` | キュートテーマ |
| `src/styles/dark-theme.css` | ダークテーマ |
| `src/styles/minimal-theme.css` | ミニマルテーマ |
| `src/styles/neon-theme.css` | ネオンテーマ |
| `src/styles/retro-theme.css` | レトロテーマ |

### Public Assets

| ファイル | 目的 |
|----------|------|
| `public/templates-config.json` | ゲームテンプレート設定（20種類） |

---

## アーキテクチャの特徴

1. **モジュール分割**: 認証・エディター・ゲーム・マネタイズ・ソーシャルが完全に分離
2. **型安全性**: 全機能でTypeScript strict mode
3. **遅延ロード**: React.lazyで初期読み込み最適化
4. **Supabase統合**: 認証・データベース・ストレージを一元管理
5. **AI拡張性**: MasterOrchestratorで自動生成システム準備
6. **マネタイズ**: Free/Premiumモデル実装
7. **エラーハンドリング**: 8種類エラー分類・自動復旧機能

---

## 統計

- **TypeScript/TSXファイル**: 約130ファイル
- **コンポーネント**: 約50ファイル
- **フック**: 約10ファイル
- **型定義**: 約10ファイル
- **サービス**: 約20ファイル
- **合計コード行数**: 約15,000行以上

---

*最終更新: 2025-11-18*
