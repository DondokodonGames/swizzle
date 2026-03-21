-- =============================================================
-- Migration: RLS ポリシー強化
-- Date: 2026-03-21
--
-- 概要:
--   - credit_purchases の UPDATE/DELETE を全ユーザーに対して禁止
--   - user_wallets の UPDATE/DELETE を直接操作から禁止
--     （残高操作は SECURITY DEFINER RPC 経由のみ許可）
-- =============================================================

-- ---------------------------------------------------------------
-- credit_purchases: 書き換え・削除を禁止
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users cannot update purchases" ON public.credit_purchases;
CREATE POLICY "Users cannot update purchases"
  ON public.credit_purchases FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Users cannot delete purchases" ON public.credit_purchases;
CREATE POLICY "Users cannot delete purchases"
  ON public.credit_purchases FOR DELETE
  USING (FALSE);

-- ---------------------------------------------------------------
-- user_wallets: 直接 UPDATE/DELETE を禁止
-- 残高操作は consume_game_credit / add_wallet_balance RPC のみ許可
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users cannot update wallet directly" ON public.user_wallets;
CREATE POLICY "Users cannot update wallet directly"
  ON public.user_wallets FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Users cannot delete wallet" ON public.user_wallets;
CREATE POLICY "Users cannot delete wallet"
  ON public.user_wallets FOR DELETE
  USING (FALSE);
