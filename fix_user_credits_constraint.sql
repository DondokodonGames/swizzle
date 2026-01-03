-- Fix user_credits UNIQUE constraint issue
-- 実行前に必ずバックアップを取ること！

-- 現状確認: 既存のUNIQUE制約を確認
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE contype = 'u'
  AND n.nspname = 'public'
  AND conrelid = 'user_credits'::regclass;

-- ========================================
-- 修正1: 古い制約を削除（存在する場合）
-- ========================================

-- user_id のみのUNIQUE制約が存在する場合は削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_credits_user_id_unique'
      AND conrelid = 'user_credits'::regclass
  ) THEN
    ALTER TABLE user_credits DROP CONSTRAINT user_credits_user_id_unique;
    RAISE NOTICE 'Dropped constraint: user_credits_user_id_unique';
  ELSE
    RAISE NOTICE 'Constraint user_credits_user_id_unique does not exist';
  END IF;
END $$;

-- ========================================
-- 修正2: 正しい制約を追加
-- ========================================

-- (user_id, month_year) の複合UNIQUE制約を確実に作成
DO $$
BEGIN
  -- 既存の制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_credits_user_id_month_year_key'
      AND conrelid = 'user_credits'::regclass
  ) THEN
    RAISE NOTICE 'Constraint user_credits_user_id_month_year_key already exists';
  ELSE
    ALTER TABLE user_credits
    ADD CONSTRAINT user_credits_user_id_month_year_key
    UNIQUE (user_id, month_year);
    RAISE NOTICE 'Added constraint: user_credits_user_id_month_year_key';
  END IF;
END $$;

-- ========================================
-- 確認クエリ
-- ========================================

-- 修正後の制約を確認
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE contype = 'u'
  AND n.nspname = 'public'
  AND conrelid = 'user_credits'::regclass;

-- テーブル構造を確認
\d user_credits;
