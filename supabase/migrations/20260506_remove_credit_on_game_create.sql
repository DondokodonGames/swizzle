-- =============================================================
-- Migration: ゲーム作成時のクレジット消費を廃止
-- Date: 2026-05-06
--
-- 背景:
--   旧プレミアムプランではゲーム作成数にクレジット制限を設けていたが、
--   現行モデルではゲーム作成は無制限とする。
--   ウォレット（balance_yen / free_games_remaining）は将来の
--   ゲームプレイ課金用に残す。
--
-- 変更内容:
--   1. trg_on_game_created_consume_credit を削除（INSERT でクレジットを消費していた）
--   2. on_game_created_consume_credit 関数を削除
--   3. total_games_created のカウントのみ行う軽量トリガーを追加（統計用）
-- =============================================================

-- ---------------------------------------------------------------
-- 1. クレジット消費トリガーを削除
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_on_game_created_consume_credit ON public.user_games;
DROP FUNCTION IF EXISTS public.on_game_created_consume_credit();

-- ---------------------------------------------------------------
-- 2. total_games_created のカウントのみ行うトリガーを追加（統計用）
--    クレジットは消費しない
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_game_created_increment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, total_games_created)
  VALUES (NEW.creator_id, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_games_created = user_wallets.total_games_created + 1,
    updated_at          = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_game_created_increment_count ON public.user_games;
CREATE TRIGGER trg_on_game_created_increment_count
  AFTER INSERT ON public.user_games
  FOR EACH ROW EXECUTE FUNCTION public.on_game_created_increment_count();
