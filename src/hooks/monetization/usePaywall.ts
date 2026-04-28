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
  const [_isOpen, setIsOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const shouldShowPaywall = !canCreateGame;

  const reason: string | null = (() => {
    if (!shouldShowPaywall) return null;
    if (status?.needsTopUp) return t('paywall.reasonNeedsTopUp');
    return t('paywall.reasonNoBalance');
  })();

  const openPaywall = useCallback(() => setIsOpen(true), []);
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
