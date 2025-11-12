/**
 * usePaywall.ts
 * Paywall表示制御のReact Hook
 * 
 * 機能:
 * - ゲーム作成制限チェック
 * - Paywall表示判定
 * - モーダル開閉管理
 */

import { useState, useEffect, useCallback } from 'react';
import type { UsePaywallResult } from '../../types/MonetizationTypes';
import { useSubscription } from './useSubscription';
import { useCredits } from './useCredits';

/**
 * Paywall制御Hook
 */
export function usePaywall(): UsePaywallResult {
  const { isPremium, isFree } = useSubscription();
  const { usage, canCreateGame } = useCredits();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [reason, setReason] = useState<string | null>(null);

  /**
   * Paywall表示が必要かチェック
   */
  const shouldShowPaywall = useCallback((): boolean => {
    // プレミアムユーザーは常に制限なし
    if (isPremium) {
      return false;
    }

    // 無料ユーザーで制限に達している場合
    if (isFree && !canCreateGame) {
      return true;
    }

    return false;
  }, [isPremium, isFree, canCreateGame]);

  /**
   * Paywall表示理由を計算
   */
  useEffect(() => {
    if (!shouldShowPaywall()) {
      setReason(null);
      return;
    }

    // 無料プランの月間制限に達した場合
    if (isFree && usage && usage.isLimited) {
      if (usage.remaining === 0) {
        setReason(
          `今月の無料プラン制限（${usage.limit}ゲーム）に達しました。プレミアムプランにアップグレードして無制限でゲームを作成しましょう！`
        );
        return;
      }
    }

    // デフォルトメッセージ
    setReason('ゲームを作成するにはプレミアムプランが必要です。');
  }, [shouldShowPaywall, isFree, usage]);

  /**
   * Paywallを開く
   */
  const openPaywall = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Paywallを閉じる
   */
  const closePaywall = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * ゲーム作成時の自動チェック
   * useEffectで制限に達したら自動的にPaywallを表示
   */
  useEffect(() => {
    if (shouldShowPaywall() && !isOpen) {
      // 自動的にPaywallを開く場合はコメント解除
      // openPaywall();
    }
  }, [shouldShowPaywall, isOpen, openPaywall]);

  return {
    shouldShowPaywall: shouldShowPaywall(),
    reason,
    openPaywall,
    closePaywall,
  };
}