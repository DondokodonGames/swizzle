-- =============================================================
-- Migration: サービスロールキー時のクレジット消費スキップ
-- Date: 2026-04-18
--
-- 概要:
--   AI生成スクリプト（service_roleキー使用）による user_games INSERT 時に
--   クレジット消費チェックをスキップする。
--   通常ユーザー（anon / authenticated）は従来通りチェックあり。
-- =============================================================

CREATE OR REPLACE FUNCTION public.on_game_created_consume_credit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- service_role キーによる操作はクレジット消費をスキップ（AI生成スクリプト用）
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- ウォレットから1クレジット消費
  SELECT public.consume_game_credit() INTO v_result;

  -- allowed = false の場合はゲーム作成を拒否
  IF (v_result->>'allowed')::BOOLEAN = FALSE THEN
    RAISE EXCEPTION 'Insufficient credits. Please top up your wallet.';
  END IF;

  RETURN NEW;
END;
$$;
