/**
 * TopUpButton.tsx
 * チャージ（Top-up）ボタンコンポーネント
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TopUpOption } from '../../types/MonetizationTypes';
import { redirectToTopUpCheckout } from '../../services/monetization/StripeService';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

interface TopUpButtonProps {
  option: TopUpOption;
  className?: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function TopUpButton({ option, onSuccess, onError }: TopUpButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      await redirectToTopUpCheckout(option.amount_yen);
      onSuccess?.();
    } catch (err) {
      console.error('TopUp error:', err);
      setLoading(false);
      onError?.(err as Error);
      alert(t('wallet.topUpError'));
    }
  };

  const isFeatured = !!option.badge;
  const badgeLabel = option.badge ? t(option.badge) : undefined;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: '100%',
        padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[2]}`,
        borderRadius: DESIGN_TOKENS.borderRadius.xl,
        border: isFeatured
          ? `2px solid ${DESIGN_TOKENS.colors.purple[400]}`
          : `1px solid ${hover ? DESIGN_TOKENS.colors.purple[300] : DESIGN_TOKENS.colors.neutral[200]}`,
        backgroundColor: isFeatured
          ? DESIGN_TOKENS.colors.purple[50]
          : hover ? DESIGN_TOKENS.colors.neutral[50] : DESIGN_TOKENS.colors.neutral[0],
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s',
        textAlign: 'center',
      }}
    >
      {badgeLabel && (
        <span style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: DESIGN_TOKENS.colors.success[500],
          color: '#fff', fontSize: '10px',
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          padding: `2px ${DESIGN_TOKENS.spacing[2]}`,
          borderRadius: DESIGN_TOKENS.borderRadius.full,
          whiteSpace: 'nowrap',
        }}>
          {badgeLabel}
        </span>
      )}
      <div style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
        color: isFeatured ? DESIGN_TOKENS.colors.purple[700] : DESIGN_TOKENS.colors.neutral[800]
      }}>
        {option.label}
      </div>
      <div style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.neutral[500], marginTop: '2px'
      }}>
        {t('wallet.topUpGames', { count: option.games })}
      </div>
      {loading && (
        <div style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.neutral[400], marginTop: '2px'
        }}>
          {t('wallet.topUpProcessing')}
        </div>
      )}
    </button>
  );
}
