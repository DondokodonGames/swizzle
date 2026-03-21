/**
 * WalletService.ts
 * ペイ・パー・プレイ課金モデルのウォレット管理
 *
 * モデル概要:
 *   - 最初の 100 ゲームは無料（free_games_remaining）
 *   - 無料枠終了後は 1 ゲーム = 1 円（balance_yen から消費）
 *   - 事前チャージ制（Top-up）
 */

import { supabase } from '../../lib/supabase';
import type { UserWallet, WalletStatus } from '../../types/MonetizationTypes';
import { calcWalletStatus } from '../../types/MonetizationTypes';

/**
 * ユーザーのウォレットを取得
 * 存在しない場合は初期レコードを作成して返す
 */
export async function getUserWallet(userId: string): Promise<UserWallet> {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as UserWallet;

  // 初回: ウォレットを作成
  const { data: created, error: createError } = await supabase
    .from('user_wallets')
    .insert({ user_id: userId })
    .select()
    .single();

  if (createError) throw createError;
  return created as UserWallet;
}

/**
 * ウォレット状態を計算して返す
 */
export async function getWalletStatus(userId: string): Promise<WalletStatus> {
  const wallet = await getUserWallet(userId);
  return calcWalletStatus(wallet);
}

/**
 * ゲームを作成できるか確認
 * Supabase RPC 経由でアトミックにチェック
 */
export async function canCreateGame(): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_wallet_can_play');

  if (error) {
    console.error('[WalletService] check_wallet_can_play error:', error);
    return false;
  }

  return data as boolean;
}

/**
 * ゲーム作成時にクレジットを消費
 * Supabase RPC 経由でアトミックに処理
 * 返り値: 消費できたか (false = 残高不足)
 */
export async function consumeGameCredit(): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_game_credit');

  if (error) {
    console.error('[WalletService] consume_game_credit error:', error);
    return false;
  }

  // RPC は JSON { allowed, free_games_remaining, balance_yen } を返す
  const result = data as { allowed: boolean } | null;
  return result?.allowed ?? false;
}

/**
 * チャージ後のウォレット残高加算（Webhook から呼び出される想定だが
 * フロント確認用にも公開）
 */
export async function addWalletBalance(userId: string, amountYen: number): Promise<UserWallet> {
  const { data, error } = await supabase.rpc('add_wallet_balance', {
    p_user_id: userId,
    p_amount_yen: amountYen,
  });

  if (error) throw error;

  // 最新ウォレットを再取得
  return getUserWallet(userId);
}
