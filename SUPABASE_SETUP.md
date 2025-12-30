# Supabase データベースセットアップ手順

このドキュメントでは、Swizzleアプリケーションで必要なSupabaseデータベースのテーブルとRPC関数をセットアップする手順を説明します。

## 📋 概要

以下のSQLスクリプトを**順番に**実行する必要があります：

1. `supabase_subscriptions.sql` - サブスクリプション管理テーブル
2. `supabase_user_credits.sql` - ゲーム作成クレジット管理テーブル
3. `supabase_rls_policies.sql` - RLSポリシー（既存のテーブル用）

## 🔧 セットアップ手順

### 1. Supabase ダッシュボードにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左サイドバーから **SQL Editor** をクリック

### 2. subscriptionsテーブルの作成

1. SQL Editorで **New Query** をクリック
2. `supabase_subscriptions.sql` の内容を全てコピー＆ペースト
3. **Run** をクリックして実行

**このスクリプトで作成されるもの：**
- `subscriptions` テーブル
- RLSポリシー（ユーザーは自分のサブスクリプション情報のみアクセス可能）
- トリガー：
  - 新規ユーザー登録時に自動でFreeプランを付与
  - `updated_at` フィールドの自動更新
- ヘルパー関数：
  - `get_user_plan(user_uuid)` - ユーザーのプランを取得
  - `is_premium_user(user_uuid)` - ユーザーがプレミアムかチェック

### 3. user_creditsテーブルの作成

1. SQL Editorで **New Query** をクリック
2. `supabase_user_credits.sql` の内容を全てコピー＆ペースト
3. **Run** をクリックして実行

**このスクリプトで作成されるもの：**
- `user_credits` テーブル
- RLSポリシー（ユーザーは自分のクレジット情報のみアクセス可能）
- RPC関数：
  - `check_game_creation_limit()` - ゲーム作成可能かチェック
  - `increment_game_count()` - ゲーム作成数をインクリメント
- トリガー：
  - `user_games` テーブルへのINSERT時に自動でゲーム作成数をインクリメント
  - `updated_at` フィールドの自動更新

### 4. RLSポリシーの適用（オプション）

既存のテーブル（user_games, profiles, likes, follows, notifications, game_favorites）にRLSポリシーを適用する場合：

1. SQL Editorで **New Query** をクリック
2. `supabase_rls_policies.sql` の内容を全てコピー＆ペースト
3. **Run** をクリックして実行

## ✅ セットアップ確認

以下のSQLクエリを実行して、正しくセットアップされているか確認します：

```sql
-- テーブルが作成されているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('subscriptions', 'user_credits');

-- RPC関数が作成されているか確認
SELECT proname
FROM pg_proc
WHERE proname IN (
  'check_game_creation_limit',
  'increment_game_count',
  'get_user_plan',
  'is_premium_user'
);

-- RLSポリシーを確認
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('subscriptions', 'user_credits');
```

期待される結果：
- テーブル: `subscriptions`, `user_credits` が表示される
- RLS: 各テーブルで `rowsecurity = true` になっている
- 関数: 4つのRPC関数が全て表示される
- ポリシー: 各テーブルに適切なポリシーが設定されている

## 🎯 プラン制限の動作確認

### Freeプランの制限

- **月3ゲームまで作成可能**
- 3ゲーム作成後、4つ目のゲーム作成時にPaywallが表示される

### Premiumプランの制限

- **無制限にゲーム作成可能**
- Paywallは表示されない

### 確認方法

1. Freeプランのユーザーでログイン
2. エディターから新規ゲームを3つ作成
3. 4つ目のゲーム作成時にPaywallモーダルが表示されることを確認

以下のSQLクエリでクレジット情報を確認できます：

```sql
-- 特定ユーザーのクレジット情報を確認
SELECT
  uc.*,
  s.plan_type
FROM user_credits uc
JOIN subscriptions s ON uc.user_id = s.user_id
WHERE uc.user_id = 'YOUR_USER_ID_HERE'
  AND s.status IN ('active', 'trialing');
```

## 🔄 月初めのリセット

`user_credits` テーブルは月ごとに管理されています：

- `month_year` フィールドが `'YYYY-MM'` 形式で保存される
- 新しい月になると、新しいレコードが自動作成される
- 古い月のレコードは履歴として保持される

月が変わった後、初めてゲームを作成する際に：
1. `check_game_creation_limit()` が新しい月のレコードを作成
2. `games_created_this_month` が 0 からスタート
3. プランに応じた `monthly_limit` が設定される

## 🐛 トラブルシューティング

### エラー: "relation does not exist"

原因: テーブルが作成されていない、または順番が間違っている

解決策:
1. `supabase_subscriptions.sql` を先に実行
2. その後 `supabase_user_credits.sql` を実行

### エラー: "function does not exist"

原因: RPC関数が正しく作成されていない

解決策:
1. SQL Editorで関数の存在を確認：
```sql
SELECT proname FROM pg_proc WHERE proname = 'check_game_creation_limit';
```
2. 存在しない場合は `supabase_user_credits.sql` を再実行

### ゲーム作成制限が動作しない

原因: トリガーが正しく動作していない、または `user_games` テーブルが存在しない

解決策:
1. トリガーの存在を確認：
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'on_user_game_created';
```
2. `user_games` テーブルの存在を確認：
```sql
SELECT tablename FROM pg_tables WHERE tablename = 'user_games';
```

## 📝 注意事項

- **バックアップ**: 本番環境で実行する前に、必ずデータベースのバックアップを取得してください
- **権限**: これらのスクリプトは `SECURITY DEFINER` を使用しているため、適切な権限で実行されます
- **Stripe連携**: Stripeのwebhookからサブスクリプション情報を更新する場合は、別途設定が必要です

## 🔗 関連ドキュメント

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Stripe本番環境チェックリスト](./docs/STRIPE_PRODUCTION_CHECKLIST.md)
- [Stripe Customer Portalセットアップ](./docs/STRIPE_CUSTOMER_PORTAL_SETUP.md)
