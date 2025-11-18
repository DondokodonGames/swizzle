/**
 * PaywallModal.tsx
 * 無料プラン制限到達時のPaywallモーダル
 * 
 * 機能:
 * - 月間制限到達時の表示
 * - クレジット使用状況の表示
 * - プレミアムプランへのアップグレード促進
 */

import React from 'react';
import type { PaywallModalProps } from '../../types/MonetizationTypes';
import { MVPSubscriptionPlan } from '../../types/MonetizationTypes';
import { CheckoutButton } from './CheckoutButton';

/**
 * Paywall Modal コンポーネント
 */
export function PaywallModal({
  isOpen,
  onClose,
  currentUsage,
}: PaywallModalProps) {
  if (!isOpen) return null;

  /**
   * 使用率の色を決定
   */
  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    return 'text-blue-600';
  };

  /**
   * プログレスバーの色を決定
   */
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="bg-purple-100 rounded-full flex items-center justify-center"
              style={{ width: '50px', height: '50px' }}
            >
              <svg
                className="text-purple-600"
                style={{ width: '30px', height: '30px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            月間制限に達しました
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 mb-8">
            無料プランでは月に{currentUsage?.limit || 5}ゲームまで作成できます。
            <br />
            プレミアムプランにアップグレードして無制限に楽しみましょう！
          </p>

          {/* Usage Display */}
          {currentUsage && currentUsage.isLimited && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">
                  今月の使用状況
                </span>
                <span className={`text-lg font-bold ${getUsageColor(currentUsage.percentage)}`}>
                  {currentUsage.used} / {currentUsage.limit} ゲーム
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getProgressBarColor(currentUsage.percentage)} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(currentUsage.percentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Premium Benefits */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🎉 プレミアムプランの特典
            </h3>
            <ul className="space-y-3">
              {[
                '無制限ゲーム作成',
                '広告非表示',
                '全225テンプレート',
                '高度な編集機能',
                'カスタムアセット無制限',
                '優先サポート（24時間以内）',
              ].map((benefit, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <svg
                    className="text-purple-600 mr-3 flex-shrink-0"
                    style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Monthly */}
            <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-600 mb-1">月額プラン</div>
                <div className="text-3xl font-bold text-gray-900">$4.99</div>
                <div className="text-xs text-gray-500">/月</div>
              </div>
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="monthly"
                className="text-sm"
              />
            </div>

            {/* Yearly */}
            <div className="border-2 border-purple-500 bg-purple-50 rounded-xl p-4 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  17% OFF
                </span>
              </div>
              <div className="text-center mb-4">
                <div className="text-sm text-gray-600 mb-1">年額プラン</div>
                <div className="text-3xl font-bold text-gray-900">$49.99</div>
                <div className="text-xs text-gray-500">/年</div>
              </div>
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="yearly"
                className="text-sm"
              />
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 text-center">
            いつでもキャンセル可能。安全な決済はStripeで処理されます。
          </p>
        </div>
      </div>
    </div>
  );
}