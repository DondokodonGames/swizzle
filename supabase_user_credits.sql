-- Supabase User Credits Schema
-- ユーザーのゲーム作成クレジット（制限）管理
--
-- このスクリプトをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard → SQL Editor → New Query

-- ========================================
-- user_credits テーブル作成
-- ========================================

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- クレジット情報
  games_created_this_month INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- 'YYYY-MM'形式

  -- プラン制限
  monthly_limit INTEGER NOT NULL DEFAULT 3, -- 999999 = 実質無制限（Premium）

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約: ユーザーごと・月ごとに1レコードのみ
  UNIQUE(user_id, month_year)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_month_year ON user_credits(month_year);

-- ========================================
-- RLS (Row Level Security) ポリシー
-- ========================================

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;

-- ユーザーは自分のクレジット情報のみ閲覧可能
CREATE POLICY "Users can view their own credits"
ON user_credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- セキュリティ強化: ユーザーによる直接更新を禁止
-- games_created_this_month の改ざんを防止するため
-- 更新は SECURITY DEFINER 関数（increment_game_count）経由のみ許可
-- ユーザーが直接 UPDATE できないようにポリシーを設定しない
--
-- 以前のポリシー（削除済み）:
-- CREATE POLICY "Users can update their own credits"
-- ON user_credits
-- FOR UPDATE
-- TO authenticated
-- USING (user_id = auth.uid())
-- WITH CHECK (user_id = auth.uid());
--
-- 注意: INSERT/UPDATE は SECURITY DEFINER 関数から行われるため
-- 通常のユーザーロールでの直接更新は RLS により拒否される

-- ========================================
-- トリガー: updated_at 自動更新
-- ========================================

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;

-- トリガーを作成
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RPC関数: ゲーム作成可能かチェック
-- ========================================

-- 既存の関数を削除（存在する場合）
-- CASCADE: この関数に依存するポリシーなども一緒に削除
DROP FUNCTION IF EXISTS check_game_creation_limit() CASCADE;

CREATE OR REPLACE FUNCTION check_game_creation_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  current_month TEXT;
  user_credit RECORD;
  user_plan TEXT;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 現在の年月を取得（'YYYY-MM'形式）
  current_month := TO_CHAR(NOW(), 'YYYY-MM');

  -- ユーザーのプランを取得（subscriptionsテーブルから）
  SELECT plan_type INTO user_plan
  FROM subscriptions
  WHERE user_id = current_user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- プランが見つからない場合はFreeプラン扱い
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  -- Premiumプランは無制限
  IF user_plan = 'premium' THEN
    RETURN TRUE;
  END IF;

  -- user_creditsテーブルからクレジット情報を取得
  SELECT * INTO user_credit
  FROM user_credits
  WHERE user_id = current_user_id
    AND month_year = current_month;

  -- レコードが存在しない場合は作成
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, month_year, monthly_limit)
    VALUES (current_user_id, current_month, 3) -- Freeプランは月3ゲームまで
    RETURNING * INTO user_credit;
  END IF;

  -- 制限チェック（999999 = 実質無制限）
  IF user_credit.monthly_limit >= 999999 THEN
    -- 無制限
    RETURN TRUE;
  ELSIF user_credit.games_created_this_month < user_credit.monthly_limit THEN
    -- まだ制限に達していない
    RETURN TRUE;
  ELSE
    -- 制限に達している
    RETURN FALSE;
  END IF;
END;
$$;

-- ========================================
-- RPC関数: ゲーム作成数をインクリメント
-- ========================================

-- 既存の関数を削除（存在する場合）
-- CASCADE: この関数に依存するトリガーなども一緒に削除
DROP FUNCTION IF EXISTS increment_game_count() CASCADE;
DROP FUNCTION IF EXISTS increment_game_count_for_user(UUID) CASCADE;

-- 新しい関数: ユーザーIDを引数で受け取る（service_role対応）
CREATE OR REPLACE FUNCTION increment_game_count_for_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month TEXT;
  user_plan TEXT;
  plan_limit INTEGER;
BEGIN
  -- ユーザーIDがNULLの場合はスキップ（AI生成システムの場合など）
  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 現在の年月を取得（'YYYY-MM'形式）
  current_month := TO_CHAR(NOW(), 'YYYY-MM');

  -- ユーザーのプランを取得
  SELECT plan_type INTO user_plan
  FROM subscriptions
  WHERE user_id = target_user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- プランが見つからない場合はFreeプラン扱い
  IF user_plan IS NULL THEN
    user_plan := 'free';
    plan_limit := 3; -- Freeプランは月3ゲームまで
  ELSIF user_plan = 'premium' THEN
    plan_limit := 999999; -- Premiumは実質無制限
  ELSE
    plan_limit := 3; -- デフォルトはFreeプラン
  END IF;

  -- user_creditsレコードをINSERT OR UPDATE
  INSERT INTO user_credits (user_id, month_year, games_created_this_month, monthly_limit)
  VALUES (target_user_id, current_month, 1, plan_limit)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    games_created_this_month = user_credits.games_created_this_month + 1,
    updated_at = NOW();
END;
$$;

-- 後方互換性のためのラッパー関数（既存のコードとの互換性）
CREATE OR REPLACE FUNCTION increment_game_count()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- auth.uid()を使用（通常のユーザーセッション用）
  PERFORM increment_game_count_for_user(auth.uid());
END;
$$;

-- ========================================
-- トリガー: user_gamesテーブルへのINSERT時に自動実行
-- ========================================

-- 既存の関数を削除（存在する場合）
-- CASCADE: この関数に依存するトリガーも一緒に削除
DROP FUNCTION IF EXISTS trigger_increment_game_count() CASCADE;

CREATE OR REPLACE FUNCTION trigger_increment_game_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ゲームが作成されたときにカウントをインクリメント
  -- NEW.creator_id を使用（service_role対応）
  PERFORM increment_game_count_for_user(NEW.creator_id);
  RETURN NEW;
END;
$$;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_user_game_created ON user_games;

-- トリガーを作成
CREATE TRIGGER on_user_game_created
  AFTER INSERT ON user_games
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_game_count();

-- ========================================
-- 確認クエリ
-- ========================================

-- テーブルが作成されているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_credits';

-- RLS ポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_credits';

-- RPC関数が作成されているか確認
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('check_game_creation_limit', 'increment_game_count', 'trigger_increment_game_count');
