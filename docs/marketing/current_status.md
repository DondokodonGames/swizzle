# Swizzle マーケティング現状確認レポート

**作成日**: 2025年12月21日
**更新日**: 2025年12月21日

---

## 1. SNSアカウント状況

| プラットフォーム | 状況 | アカウント名/URL | 備考 |
|-----------------|------|-----------------|------|
| TikTok | ❓ 要確認 | - | API申請必要 |
| Instagram | ❓ 要確認 | - | Meta Business必要 |
| Twitter/X | ❓ 要確認 | - | API有料($100/月〜) |
| Discord | ❓ 要確認 | - | Bot無料 |

## 2. 既存マーケティング資産

### ブランド資産
- ロゴ（大）: `public/logo-large.png` ✅
- ロゴ（スプラッシュ）: `public/logo-splash.png` ✅
- Favicon: `public/favicon-32x32.png`, `public/favicon-16x16.png` ✅
- Apple Touch Icon: `public/apple-touch-icon.png` ✅

### ゲームコンテンツ
- サンプルゲーム: `public/sample-games/` (9個) ✅
- AI生成ゲーム: Supabase `user_games` テーブル ✅

### マーケティング素材
- 投稿用画像: なし ❌
- 投稿用動画: なし ❌
- プレスリリース: なし ❌

## 3. 技術基盤

### 既存API連携
```
✅ Supabase (データベース・認証・Storage)
✅ Claude API (AI生成)
✅ OpenAI API (画像生成用?)
❌ Twitter API
❌ Instagram Graph API
❌ Discord Bot
❌ TikTok API
```

### 環境変数（.env.local.example）
```
# 既存
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_KEY=

# マーケティング用（未設定）
# TWITTER_API_KEY= (コメントアウト)
```

## 4. 必要な準備作業

### 即時対応（優先度: 高）

| タスク | 担当 | 状況 | 備考 |
|-------|------|------|------|
| Twitter APIアカウント作成 | ユーザー | 未着手 | $100/月必要 |
| Discord Botトークン取得 | ユーザー | 未着手 | 無料 |
| Instagram Business設定 | ユーザー | 未着手 | Meta Business Suite |

### 中期対応（優先度: 中）

| タスク | 担当 | 状況 | 備考 |
|-------|------|------|------|
| TikTok API申請 | ユーザー | 未着手 | 承認に時間要 |
| Buffer/Hootsuite検討 | ユーザー | 未着手 | 統合ツール |

### 自動実装（Claude Code）

| タスク | 状況 | 備考 |
|-------|------|------|
| コンテンツ生成エンジン | 実装中 | Claude API活用 |
| Discord Bot | 実装予定 | discord.js |
| Twitter自動投稿 | 実装予定 | twitter-api-v2 |
| Instagram自動投稿 | 実装予定 | instagram-graph-api |

## 5. コスト試算

### 月額固定費
| 項目 | 費用 | 備考 |
|------|------|------|
| Twitter API (Blue) | $100 | 必須 |
| Claude API | $50-100 | コンテンツ生成 |
| サーバー (Vercel) | $0-20 | Cronジョブ用 |
| **合計** | **$150-220** | |

### オプション
| 項目 | 費用 | 備考 |
|------|------|------|
| Buffer Pro | $50 | 統合管理 |
| 追加ストレージ | $10-20 | 動画保存 |

## 6. 次のステップ

1. **ユーザー対応**
   - [ ] Twitter Developer Portalでアカウント作成
   - [ ] Discord Developer Portalでアプリケーション作成
   - [ ] Meta Business Suiteでアカウント設定

2. **Claude Code対応**
   - [x] ディレクトリ構造作成
   - [ ] APIセットアップガイド作成
   - [ ] コンテンツ生成エンジン実装
   - [ ] Discord Bot実装
   - [ ] SNS自動投稿システム実装

---

## 確認が必要な項目

以下の情報をお知らせください：

1. **既存SNSアカウント**
   - TikTok: アカウント有無、URL
   - Instagram: アカウント有無、URL
   - Twitter/X: アカウント有無、URL
   - Discord: サーバー有無、URL

2. **予算**
   - Twitter API費用（$100/月）の承認
   - その他ツール費用の上限

3. **優先順位**
   - 最初に注力するプラットフォーム
   - 自動化の範囲（完全自動 or 半自動）
