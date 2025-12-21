# API セットアップガイド

**作成日**: 2025年12月21日

このガイドでは、マーケティング自動化に必要なAPIの設定手順を説明します。

---

## 1. Twitter API v2

### 費用
- Basic: $100/月（推奨）
- Pro: $5,000/月（大規模向け）

### セットアップ手順

1. **Developer Portal アクセス**
   ```
   https://developer.twitter.com/en/portal/dashboard
   ```

2. **Project作成**
   - 「Create Project」をクリック
   - Project名: `Swizzle Marketing`
   - Use case: `Making a bot`

3. **App作成**
   - 「Create App」をクリック
   - App名: `SwizzleBot`

4. **API Keys取得**
   - 「Keys and tokens」タブ
   - 以下を取得してメモ:
     - API Key
     - API Key Secret
     - Bearer Token
     - Access Token
     - Access Token Secret

5. **OAuth 2.0設定**
   - 「User authentication settings」→「Set up」
   - App permissions: `Read and write`
   - Type of App: `Web App, Automated App or Bot`
   - Callback URL: `https://playswizzle.com/callback/twitter`

6. **環境変数設定**
   ```bash
   # .env.local に追加
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_SECRET=your_access_secret
   TWITTER_BEARER_TOKEN=your_bearer_token
   ```

### API制限（Basic プラン）
- ツイート投稿: 50回/24時間
- ツイート取得: 10,000回/月
- フォロワー取得: 15回/15分

---

## 2. Instagram Graph API

### 費用
- 無料（Meta Business アカウント必要）

### セットアップ手順

1. **Facebook Business Suite設定**
   ```
   https://business.facebook.com/
   ```
   - ビジネスアカウント作成
   - Instagram Businessアカウント連携

2. **Facebook App作成**
   ```
   https://developers.facebook.com/apps/
   ```
   - 「Create App」→「Business」
   - App名: `Swizzle Marketing`

3. **Instagram Graph API追加**
   - 「Add Products」→「Instagram Graph API」
   - 「Set Up」をクリック

4. **アクセストークン取得**
   - 「Graph API Explorer」使用
   - ページアクセストークンを取得
   - 長期トークンに変換

5. **環境変数設定**
   ```bash
   # .env.local に追加
   INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
   INSTAGRAM_BUSINESS_ACCOUNT_ID=your_business_account_id
   ```

### API制限
- 投稿: 25回/24時間
- API呼び出し: 200回/時間/ユーザー

---

## 3. Discord Bot

### 費用
- 無料

### セットアップ手順

1. **Developer Portal アクセス**
   ```
   https://discord.com/developers/applications
   ```

2. **Application作成**
   - 「New Application」をクリック
   - 名前: `Swizzle Bot`

3. **Bot追加**
   - 左メニュー「Bot」→「Add Bot」
   - 「Reset Token」でトークン取得（1回しか表示されない！）

4. **権限設定（Intents）**
   - `PRESENCE INTENT`: OFF
   - `SERVER MEMBERS INTENT`: ON（メンバー管理用）
   - `MESSAGE CONTENT INTENT`: ON（メッセージ読み取り用）

5. **Bot招待URL生成**
   - 左メニュー「OAuth2」→「URL Generator」
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions:
     - `Send Messages`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
     - `Add Reactions`
     - `Use Slash Commands`
     - `Manage Messages`（モデレーション用）
   - 生成されたURLでサーバーに招待

6. **環境変数設定**
   ```bash
   # .env.local に追加
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_GUILD_ID=your_server_id
   DISCORD_CLIENT_ID=your_application_id
   ```

### 取得方法（サーバーID）
- Discord設定 →「詳細設定」→「開発者モード」ON
- サーバー右クリック →「IDをコピー」

---

## 4. TikTok API（オプション）

### 費用
- 無料（申請・承認必要）

### 注意事項
```
⚠️ TikTok APIは企業・クリエイター向けに限定
⚠️ 個人開発者は申請が必要（承認に数週間〜数ヶ月）
⚠️ 自動投稿APIは制限あり
```

### 代替案（API承認前）
1. 動画自動生成のみ実装
2. ファイルをフォルダに保存
3. 手動でTikTokにアップロード（1日3本、数分）

### セットアップ手順（承認後）

1. **Developer Portal アクセス**
   ```
   https://developers.tiktok.com/
   ```

2. **App作成**
   - 「Create App」→「Web」
   - App名: `Swizzle`

3. **API申請**
   - 「Content Posting API」申請
   - ビジネス情報提出
   - 審査待ち（数週間〜）

4. **環境変数設定（承認後）**
   ```bash
   # .env.local に追加
   TIKTOK_CLIENT_KEY=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   ```

---

## 5. 環境変数テンプレート（完全版）

`.env.local.example` に以下を追加:

```bash
# ============================================
# Swizzle マーケティング自動化 環境変数
# ============================================

# --- 既存 ---
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_KEY=
MASTER_USER_ID=

# --- Twitter API v2 ---
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
TWITTER_BEARER_TOKEN=

# --- Instagram Graph API ---
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=

# --- Discord Bot ---
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_CLIENT_ID=

# --- TikTok API (オプション) ---
# TIKTOK_CLIENT_KEY=
# TIKTOK_CLIENT_SECRET=

# --- マーケティング設定 ---
MARKETING_ENABLED=true
MARKETING_DRY_RUN=false
```

---

## 6. 動作確認

各APIの動作確認コマンド:

```bash
# Twitter接続テスト
npm run marketing:test:twitter

# Instagram接続テスト
npm run marketing:test:instagram

# Discord Bot起動テスト
npm run marketing:test:discord

# 全API一括テスト
npm run marketing:test:all
```

---

## 7. トラブルシューティング

### Twitter
- `401 Unauthorized`: APIキーが正しいか確認
- `403 Forbidden`: アプリの権限設定を確認
- `429 Too Many Requests`: レート制限に達した、待機

### Instagram
- `Invalid token`: トークンの有効期限切れ、再取得
- `OAuthException`: ページアクセス権限を確認

### Discord
- `Invalid Token`: トークンをリセットして再取得
- `Missing Access`: Bot権限を確認
- `Missing Permissions`: サーバーでのBot権限を確認
