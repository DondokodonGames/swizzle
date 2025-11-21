/**
 * CheckoutButton.tsx
 * Stripe Checkoutページへリダイレクトする決済ボタン（インラインスタイル版）
 * 
 * 機能:
 * - Stripe Checkout Sessionの作成
 * - チェックアウトページへのリダイレクト
 * - ローディング・エラー状態管理
 */

import React, { useState } from 'react';
import type { CheckoutButtonProps } from '../../types/MonetizationTypes';
import { redirectToCheckout } from '../../services/monetization/StripeService';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

/**
 * Checkout Button コンポーネント
 */
export function CheckoutButton({
  plan,
  billingCycle,
  className = '',
  disabled = false,
  onSuccess,
  onError,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);

  /**
   * チェックアウトボタンクリック時の処理
   */
  const handleCheckout = async () => {
    try {
      setLoading(true);

      // Stripe Checkoutページにリダイレクト
      await redirectToCheckout(plan, billingCycle);

      // 成功コールバック（通常はリダイレクトされるため呼ばれない）
      onSuccess?.();
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);

      // エラーコールバック
      onError?.(error as Error);

      // ユーザーにエラーを通知
      alert(
        '決済処理の開始に失敗しました。もう一度お試しいただくか、サポートにお問い合わせください。'
      );
    }
  };

  /**
   * ボタンのラベルテキスト
   */
  const getButtonLabel = () => {
    if (loading) {
      return '処理中...';
    }

    if (plan === 'free') {
      return '無料で始める';
    }

    return billingCycle === 'yearly'
      ? '年払いで購読する'
      : '月払いで購読する';
  };

  /**
   * ボタンのスタイル
   */
  const getButtonStyle = (): React.CSSProperties => {
    const isDisabled = disabled || loading;

    // 基本スタイル
    const baseStyle: React.CSSProperties = {
      width: '100%',
      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[6]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal}`,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: DESIGN_TOKENS.shadows.lg,
    };

    // disabled/loading時
    if (isDisabled) {
      return {
        ...baseStyle,
        backgroundColor: DESIGN_TOKENS.colors.neutral[300],
        color: DESIGN_TOKENS.colors.neutral[500],
        opacity: 0.5,
        boxShadow: 'none',
      };
    }

    // Premiumプラン
    if (plan === 'premium') {
      if (isActive) {
        return {
          ...baseStyle,
          backgroundColor: DESIGN_TOKENS.colors.purple[600],
          color: DESIGN_TOKENS.colors.neutral[0],
          transform: 'scale(0.95)',
          boxShadow: DESIGN_TOKENS.shadows.lg,
        };
      } else if (isHover) {
        return {
          ...baseStyle,
          backgroundColor: DESIGN_TOKENS.colors.purple[700],
          color: DESIGN_TOKENS.colors.neutral[0],
          transform: 'scale(1.05)',
          boxShadow: DESIGN_TOKENS.shadows.xl,
        };
      } else {
        return {
          ...baseStyle,
          backgroundColor: DESIGN_TOKENS.colors.purple[600],
          color: DESIGN_TOKENS.colors.neutral[0],
          transform: 'scale(1)',
          boxShadow: DESIGN_TOKENS.shadows.lg,
        };
      }
    }

    // Freeプラン
    return {
      ...baseStyle,
      backgroundColor: isHover 
        ? DESIGN_TOKENS.colors.neutral[300]
        : DESIGN_TOKENS.colors.neutral[200],
      color: DESIGN_TOKENS.colors.neutral[700],
      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
      boxShadow: 'none',
    };
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => {
        setIsHover(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={getButtonStyle()}
      aria-label={getButtonLabel()}
    >
      {loading && (
        <span style={{ display: 'inline-block', marginRight: DESIGN_TOKENS.spacing[2] }}>
          <svg
            style={{ 
              width: '20px', 
              height: '20px',
              display: 'inline-block',
              animation: 'spin 1s linear infinite'
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      {getButtonLabel()}
    </button>
  );
}

/**
 * Checkout Button with Text (テキスト付きバリエーション)
 */
export function CheckoutButtonWithText({
  plan,
  billingCycle,
  className = '',
  disabled = false,
  onSuccess,
  onError,
}: CheckoutButtonProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: DESIGN_TOKENS.spacing[2],
  };

  const textStyle: React.CSSProperties = {
    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    color: DESIGN_TOKENS.colors.neutral[500],
    textAlign: 'center',
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <CheckoutButton
        plan={plan}
        billingCycle={billingCycle}
        className={className}
        disabled={disabled}
        onSuccess={onSuccess}
        onError={onError}
      />
      <p style={textStyle}>
        ※ 安全な決済はStripeで処理されます
      </p>

      {/* スピナーアニメーション用のスタイルタグ */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}