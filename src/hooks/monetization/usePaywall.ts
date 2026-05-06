/**
 * usePaywall.ts
 * Paywall 表示制御のReact Hook（ペイ・パー・プレイモデル対応版）
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { UsePaywallResult } from '../../types/MonetizationTypes';
import { useWallet } from './useWallet';

/**
 * Paywall 制御Hook
 */
export function usePaywall(): UsePaywallResult {
  const { t } = useTranslation();
  const { status, canCreateGame } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // 残高不足かつ明示的に openPaywall() が呼ばれた場合のみ表示
  const shouldShowPaywall = isOpen && !canCreateGame;

  const reason: string | null = (() => {
    if (!shouldShowPaywall) return null;
    if (status?.needsTopUp) return t('paywall.reasonNeedsTopUp');
    return t('paywall.reasonNoBalance');
  })();

  // 残高不足の場合のみモーダルを開く。残高があれば何もしない
  const openPaywall = useCallback(() => {
    if (!canCreateGame) setIsOpen(true);
  }, [canCreateGame]);

  const closePaywall = useCallback(() => setIsOpen(false), []);
  const openTopUp = useCallback(() => setIsTopUpOpen(true), []);
  const closeTopUp = useCallback(() => setIsTopUpOpen(false), []);

  return {
    shouldShowPaywall,
    reason,
    openPaywall,
    closePaywall,
    openTopUp,
    isTopUpOpen,
    closeTopUp,
  };
}
