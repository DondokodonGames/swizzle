/**
 * CheckoutButton.tsx
 * Stripe Checkoutページへリダイレクトする決済ボタン
 * 
 * 機能:
 * - Stripe Checkout Sessionの作成
 * - チェックアウトページへのリダイレクト
 * - ローディング・エラー状態管理
 */

import React, { useState } from 'react';
import type { CheckoutButtonProps } from '../../types/MonetizationTypes';
import { redirectToCheckout } from '../../services/monetization/StripeService';

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
   * ボタンのスタイルクラス
   */
  const getButtonClassName = () => {
    const baseClasses = [
      'w-full',
      'py-3',
      'px-6',
      'rounded-lg',
      'font-semibold',
      'transition-all',
      'duration-200',
    ];

    if (disabled || loading) {
      baseClasses.push(
        'bg-gray-300',
        'text-gray-500',
        'cursor-not-allowed',
        'opacity-50'
      );
    } else if (plan === 'premium') {
      baseClasses.push(
        'bg-purple-600',
        'text-white',
        'hover:bg-purple-700',
        'hover:scale-105',
        'active:scale-95',
        'shadow-lg',
        'hover:shadow-xl'
      );
    } else {
      baseClasses.push(
        'bg-gray-200',
        'text-gray-700',
        'hover:bg-gray-300',
        'border',
        'border-gray-300'
      );
    }

    return [...baseClasses, className].join(' ');
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={getButtonClassName()}
      aria-label={getButtonLabel()}
    >
      {loading && (
        <span className="inline-block mr-2">
          <svg
            className="animate-spin h-5 w-5 inline-block"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
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
  return (
    <div className="space-y-2">
      <CheckoutButton
        plan={plan}
        billingCycle={billingCycle}
        className={className}
        disabled={disabled}
        onSuccess={onSuccess}
        onError={onError}
      />
      <p className="text-xs text-gray-500 text-center">
        ※ 安全な決済はStripeで処理されます
      </p>
    </div>
  );
}