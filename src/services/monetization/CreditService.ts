/**
 * CreditService.ts
 * ユーザーのゲーム作成クレジット（制限）を管理
 */

import { supabase } from '../../lib/supabase';
import type {
  UserCredit,
  CreditUsage,
  MVPSubscriptionPlan,
} from '../../types/MonetizationTypes';
import {
  getCurrentMonthYear,
  calculateCreditUsage,
  getMonthlyGameLimit,
} from '../../types/MonetizationTypes';

/**
 * ユーザーの今月のクレジット情報を取得
 */
export async function getUserCredits(userId: string): Promise<UserCredit | null> {
  try {
    const monthYear = getCurrentMonthYear();

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合はnullを返す
        return null;
      }
      throw error;
    }

    return data as UserCredit;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    throw error;
  }
}

/**
 * ユーザーの今月のクレジット使用状況を取得
 */
export async function getCreditUsage(userId: string): Promise<CreditUsage> {
  try {
    const credits = await getUserCredits(userId);

    if (!credits) {
      // 初回の場合、デフォルト値を返す
      return calculateCreditUsage(0, 5);
    }

    return calculateCreditUsage(
      credits.games_created_this_month,
      credits.monthly_limit
    );
  } catch (error) {
    console.error('Error getting credit usage:', error);
    // エラー時はデフォルト値を返す
    return calculateCreditUsage(0, 5);
  }
}

/**
 * ゲーム作成可能かチェック
 */
export async function canCreateGame(): Promise<boolean> {
  try {
    // Supabaseのcheck_game_creation_limit()関数を呼び出し
    const { data, error } = await supabase.rpc('check_game_creation_limit');

    if (error) {
      console.error('Error checking game creation limit:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('Error checking if user can create game:', error);
    return false;
  }
}

/**
 * ゲーム作成数をインクリメント（手動呼び出し用）
 * 注意: 通常はuser_gamesテーブルのINSERTトリガーで自動実行されるため不要
 */
export async function incrementGameCount(userId: string): Promise<void> {
  try {
    const monthYear = getCurrentMonthYear();

    // user_creditsレコードを更新
    const { error } = await supabase.rpc('increment_game_count');

    if (error) {
      console.error('Error incrementing game count:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error incrementing game count:', error);
    throw error;
  }
}

/**
 * プランに応じた月間制限数を取得
 */
export function getPlanLimit(plan: MVPSubscriptionPlan): number {
  return getMonthlyGameLimit(plan);
}