/**
 * 20260321_billing_transition_hardening.sql
 * サブスクリプション → ペイ・パー・プレイ移行にあたるセキュリティ強化
 *
 * 1. credit_purchases.stripe_session_id に UNIQUE 制約を追加
 *    → 同一Stripeセッションの二重挿入（concurrent retry）を DB レベルで防止
 *
 * 2. subscriptions テーブルへの UPDATE RLS ポリシーを追加
 *    → 認証済みユーザーが plan_type を直接書き換えられる脆弱性を塞ぐ
 *
 * 3. subscriptions テーブルへの DELETE RLS ポリシーを追加
 *    → ユーザーが自分のサブスクリプションレコードを削除できないように制限
 *
 * 4. subscriptions テーブルへの INSERT RLS ポリシーを追加
 *    → フロントエンドから createSubscription() で偽のサブスクリプション行を
 *      挿入することを防止（Webhook の service_role のみが INSERT 可能）
 */

-- -------------------------------------------------------
-- 1. credit_purchases.stripe_session_id UNIQUE 制約
-- -------------------------------------------------------
-- 既に NULL が入っている行があっても UNIQUE 制約は NULL を除外するため安全
ALTER TABLE public.credit_purchases
  ADD CONSTRAINT credit_purchases_stripe_session_id_unique
    UNIQUE (stripe_session_id);

-- -------------------------------------------------------
-- 2 & 3. subscriptions テーブル RLS 強化
-- -------------------------------------------------------
-- 注: subscriptions への書き込みは全て service_role（Webhook）経由のみ許可
--     認証済みユーザー（フロントエンド）からの UPDATE/DELETE を禁止
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 既存の UPDATE ポリシーが存在する場合は削除して再作成
DROP POLICY IF EXISTS "Users cannot update subscriptions" ON public.subscriptions;
CREATE POLICY "Users cannot update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Users cannot delete subscriptions" ON public.subscriptions;
CREATE POLICY "Users cannot delete subscriptions"
  ON public.subscriptions
  FOR DELETE
  USING (FALSE);

-- INSERT も禁止（Webhook の service_role のみが subscriptions を作成できる）
DROP POLICY IF EXISTS "Users cannot insert subscriptions" ON public.subscriptions;
CREATE POLICY "Users cannot insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (FALSE);

-- SELECT は自分のレコードのみ許可（既存ポリシーがない場合に備えて追加）
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
