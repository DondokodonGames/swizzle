/**
 * useCredits.ts
 * ゲーム作成クレジット管理のReact Hook
 *
 * ペイ・パー・プレイモデル対応版:
 *   - useWallet を内部で使用
 *   - EditorApp.tsx 等との互換インターフェースを維持
 */

import { useCallback } from 'react';
import type { UseCreditsResult, CreditUsage, UserCredit } from '../../types/MonetizationTypes';
import { FREE_GAME_LIMIT } from '../../types/MonetizationTypes';
import { useWallet } from './useWallet';

/**
 * ウォレット情報を旧 CreditUsage 形式に変換
 */
function toUsage(
  freeRemaining: number,
  totalCreated: number,
  balanceYen: number,
): CreditUsage {
  const freeUsed = Math.min(totalCreated, FREE_GAME_LIMIT);
  const freePct = Math.min((freeUsed / FREE_GAME_LIMIT) * 100, 100);

  if (freeRemaining > 0) {
    // 無料フェーズ: 無料枠を使用量として表示
    return {
      used: freeUsed,
      limit: FREE_GAME_LIMIT,
      remaining: freeRemaining,
      percentage: freePct,
      isLimited: true,
    };
  }

  // 有料フェーズ: 残高（円 = ゲーム数）を表示
  return {
    used: totalCreated,
    limit: -1,
    remaining: balanceYen,
    percentage: 0,
    isLimited: balanceYen === 0,
  };
}

/**
 * クレジット管理Hook（互換ラッパー）
 */
export function useCredits(): UseCreditsResult {
  const { wallet, loading, error, refetch, canCreateGame } = useWallet();

  const usage: CreditUsage | null = wallet
    ? toUsage(wallet.free_games_remaining, wallet.total_games_created, wallet.balance_yen)
    : null;

  // 旧インターフェース互換: credits は null を返す（ウォレット経由のため不要）
  const credits: UserCredit | null = null;

  return {
    credits,
    loading,
    error,
    refetch,
    usage,
    canCreateGame,
  };
}
