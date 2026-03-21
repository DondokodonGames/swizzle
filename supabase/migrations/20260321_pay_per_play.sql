-- =============================================================
-- Migration: ペイ・パー・プレイ課金モデル導入
-- Date: 2026-03-21
--
-- 概要:
--   - user_wallets テーブル追加（残高・無料枠管理）
--   - credit_purchases テーブル追加（チャージ履歴）
--   - RPC関数: check_wallet_can_play / consume_game_credit / add_wallet_balance
--   - 既存 user_games INSERT トリガーを wallet 対応に更新
-- =============================================================

-- ---------------------------------------------------------------
-- 1. user_wallets テーブル
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT,

  -- 事前チャージ残高（円）
  balance_yen           INTEGER NOT NULL DEFAULT 0 CHECK (balance_yen >= 0),

  -- 累計ゲーム作成数
  total_games_created   INTEGER NOT NULL DEFAULT 0 CHECK (total_games_created >= 0),

  -- 無料ゲーム残数（初期 100、0になると有料フェーズへ）
  free_games_remaining  INTEGER NOT NULL DEFAULT 100 CHECK (free_games_remaining >= 0),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

COMMENT ON TABLE public.user_wallets IS 'ペイ・パー・プレイ課金モデルのウォレット情報';

-- ---------------------------------------------------------------
-- 2. credit_purchases テーブル（チャージ履歴）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_yen                INTEGER NOT NULL CHECK (amount_yen > 0),
  stripe_session_id         TEXT,
  stripe_payment_intent_id  TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'failed')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_purchases IS 'クレジットチャージ購入履歴';

-- ---------------------------------------------------------------
-- 3. インデックス
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id     ON public.user_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_session ON public.credit_purchases (stripe_session_id);

-- ---------------------------------------------------------------
-- 4. RLS ポリシー
-- ---------------------------------------------------------------
ALTER TABLE public.user_wallets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- user_wallets: 自分のレコードのみ読み取り可
DROP POLICY IF EXISTS "Users can view own wallet"   ON public.user_wallets;
CREATE POLICY "Users can view own wallet"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallet" ON public.user_wallets;
CREATE POLICY "Users can insert own wallet"
  ON public.user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- credit_purchases: 自分の履歴のみ読み取り可
DROP POLICY IF EXISTS "Users can view own purchases" ON public.credit_purchases;
CREATE POLICY "Users can view own purchases"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 5. updated_at 自動更新トリガー
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER trg_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- 6. 新規ユーザー登録時にウォレットを自動作成するトリガー
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_user_wallet_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_wallet_on_signup ON auth.users;
CREATE TRIGGER trg_create_wallet_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_wallet_on_signup();

-- ---------------------------------------------------------------
-- 7. RPC: check_wallet_can_play
--    ゲームを作成/プレイできるか確認（消費しない）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_wallet_can_play()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_wallet  public.user_wallets%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  -- ウォレットを取得（なければ作成）
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_wallets (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_wallet;
  END IF;

  -- 無料枠残あり OR 残高あり
  RETURN (v_wallet.free_games_remaining > 0 OR v_wallet.balance_yen > 0);
END;
$$;

-- ---------------------------------------------------------------
-- 8. RPC: consume_game_credit
--    ゲーム1回分のクレジットをアトミックに消費
--    返り値: JSON { allowed, free_games_remaining, balance_yen }
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_game_credit()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_wallet  public.user_wallets%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('allowed', false, 'free_games_remaining', 0, 'balance_yen', 0);
  END IF;

  -- 行ロック取得
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- ウォレットを初期化
    INSERT INTO public.user_wallets (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.free_games_remaining > 0 THEN
    -- 無料枠から消費
    UPDATE public.user_wallets
    SET
      free_games_remaining = free_games_remaining - 1,
      total_games_created  = total_games_created + 1,
      updated_at           = NOW()
    WHERE user_id = v_user_id
    RETURNING * INTO v_wallet;
    v_allowed := TRUE;

  ELSIF v_wallet.balance_yen > 0 THEN
    -- 残高から消費（1円）
    UPDATE public.user_wallets
    SET
      balance_yen         = balance_yen - 1,
      total_games_created = total_games_created + 1,
      updated_at          = NOW()
    WHERE user_id = v_user_id
    RETURNING * INTO v_wallet;
    v_allowed := TRUE;

  ELSE
    -- 残高不足
    v_allowed := FALSE;
  END IF;

  RETURN json_build_object(
    'allowed',               v_allowed,
    'free_games_remaining',  v_wallet.free_games_remaining,
    'balance_yen',           v_wallet.balance_yen
  );
END;
$$;

-- ---------------------------------------------------------------
-- 9. RPC: add_wallet_balance
--    チャージ後に残高を加算（Webhook から Service Role で呼ぶ）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_wallet_balance(
  p_user_id   UUID,
  p_amount_yen INTEGER
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- ウォレットが存在しない場合は作成してから加算
  INSERT INTO public.user_wallets (user_id, balance_yen)
  VALUES (p_user_id, p_amount_yen)
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance_yen = user_wallets.balance_yen + p_amount_yen,
    updated_at  = NOW();
END;
$$;

-- ---------------------------------------------------------------
-- 10. user_games の INSERT トリガーを consume_game_credit に置き換え
--     （既存の increment_game_count トリガーがあれば上書き）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_game_created_consume_credit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- ウォレットから1クレジット消費
  SELECT public.consume_game_credit() INTO v_result;

  -- allowed = false の場合はゲーム作成を拒否
  IF (v_result->>'allowed')::BOOLEAN = FALSE THEN
    RAISE EXCEPTION 'Insufficient credits. Please top up your wallet.';
  END IF;

  RETURN NEW;
END;
$$;

-- 既存トリガーを削除して再作成
DROP TRIGGER IF EXISTS trg_on_game_created_consume_credit ON public.user_games;
DROP TRIGGER IF EXISTS trg_increment_game_count           ON public.user_games;

CREATE TRIGGER trg_on_game_created_consume_credit
  BEFORE INSERT ON public.user_games
  FOR EACH ROW EXECUTE FUNCTION public.on_game_created_consume_credit();

-- ---------------------------------------------------------------
-- 11. 既存ユーザーにウォレットを一括作成（バックフィル）
--     ※ 既存ユーザーは全員 free_games_remaining=100 から開始
-- ---------------------------------------------------------------
INSERT INTO public.user_wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
