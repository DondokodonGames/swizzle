-- =============================================================
-- Migration: セキュリティ強化
-- Date: 2026-03-21
--
-- 概要:
--   add_wallet_balance は Webhook（SUPABASE_SERVICE_ROLE_KEY）からのみ
--   呼び出されるべき関数。anon/authenticated ロールからの直接呼び出しを
--   禁止し、フロントエンドによる残高改ざんを防ぐ。
--
-- 影響範囲:
--   - Webhook (service_role) からの呼び出しは引き続き可能
--   - フロントエンドクライアント (anon / authenticated) からの呼び出しは 403
-- =============================================================

REVOKE EXECUTE ON FUNCTION public.add_wallet_balance(UUID, INTEGER) FROM anon, authenticated;
