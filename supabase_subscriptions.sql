-- Supabase Subscriptions Schema
-- ユーザーのサブスクリプション管理（MVP版: Free/Premium）
--
-- このスクリプトをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard → SQL Editor → New Query
--
-- 注意: このスクリプトは supabase_user_credits.sql の前に実行してください

-- ========================================
-- subscriptions テーブル作成
-- ========================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- プラン情報（MVP: 'free' | 'premium' のみ）
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),

  -- Stripe情報
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- 期間情報
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- メタデータ
  metadata JSONB DEFAULT '{}'::jsonb,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 部分一意インデックス: ユーザーごとに有効なサブスクリプションは1つのみ
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active_unique
  ON subscriptions(user_id)
  WHERE status IN ('active', 'trialing');

-- ========================================
-- RLS (Row Level Security) ポリシー
-- ========================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のサブスクリプション情報のみ閲覧可能
CREATE POLICY "Users can view their own subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ユーザーは自分のサブスクリプション情報のみ更新可能
CREATE POLICY "Users can update their own subscriptions"
ON subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ========================================
-- トリガー: updated_at 自動更新
-- ========================================

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- トリガーを作成
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 初期データ: 新規ユーザーにFreeプランを自動付与
-- ========================================

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS create_default_subscription();

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 新規ユーザーにFreeプランのサブスクリプションを作成
  INSERT INTO subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- トリガーを作成（auth.usersテーブルへのINSERT時）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ========================================
-- ヘルパー関数: ユーザーの現在のプランを取得
-- ========================================

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS get_user_plan(UUID);

CREATE OR REPLACE FUNCTION get_user_plan(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan TEXT;
BEGIN
  SELECT plan_type INTO user_plan
  FROM subscriptions
  WHERE user_id = user_uuid
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- プランが見つからない場合はFreeプラン扱い
  IF user_plan IS NULL THEN
    RETURN 'free';
  ELSE
    RETURN user_plan;
  END IF;
END;
$$;

-- ========================================
-- ヘルパー関数: ユーザーがプレミアムかチェック
-- ========================================

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS is_premium_user(UUID);

CREATE OR REPLACE FUNCTION is_premium_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT get_user_plan(user_uuid) = 'premium');
END;
$$;

-- ========================================
-- 確認クエリ
-- ========================================

-- テーブルが作成されているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'subscriptions';

-- RLS ポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'subscriptions';

-- 関数が作成されているか確認
SELECT proname
FROM pg_proc
WHERE proname IN ('update_updated_at_column', 'create_default_subscription', 'get_user_plan', 'is_premium_user');
