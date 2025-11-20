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

      {/* Modal - コンパクト版 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all"
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

          {/* Icon - コンパクト版 */}
          <div className="flex justify-center mb-4">
            <div
              className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center"
              style={{ width: '40px', height: '40px' }}
            >
              <svg
                className="text-purple-600"
                style={{ width: '24px', height: '24px' }}
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

          {/* Title - コンパクト版 */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            月間制限に達しました
          </h2>

          {/* Description - コンパクト版 */}
          <p className="text-center text-gray-500 text-sm mb-6">
            無料プランは月{currentUsage?.limit || 5}ゲームまで。プレミアムで無制限に！
          </p>

          {/* Usage Display - コンパクト版 */}
          {currentUsage && currentUsage.isLimited && (
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  今月の使用状況
                </span>
                <span className={`text-sm font-bold ${getUsageColor(currentUsage.percentage)}`}>
                  {currentUsage.used} / {currentUsage.limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${getProgressBarColor(currentUsage.percentage)} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(currentUsage.percentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Premium Benefits - グリッド版 */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Premium 特典
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                '無制限ゲーム',
                '広告非表示',
                '全テンプレート',
                '高度な編集',
                'アセット無制限',
                '優先サポート',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center text-gray-600 bg-purple-50 rounded-lg px-3 py-2">
                  <svg
                    className="text-purple-500 mr-2 flex-shrink-0"
                    style={{ width: '14px', height: '14px', minWidth: '14px', minHeight: '14px' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-xs">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Options - コンパクト版 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Monthly */}
            <div className="border border-gray-200 rounded-xl p-3 hover:border-purple-300 transition-colors">
              <div className="text-center mb-3">
                <div className="text-xs text-gray-500 mb-0.5">月額</div>
                <div className="text-2xl font-bold text-gray-800">$4.99</div>
              </div>
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="monthly"
                className="text-xs"
              />
            </div>

            {/* Yearly */}
            <div className="border-2 border-purple-400 bg-purple-50 rounded-xl p-3 relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  17%OFF
                </span>
              </div>
              <div className="text-center mb-3">
                <div className="text-xs text-gray-500 mb-0.5">年額</div>
                <div className="text-2xl font-bold text-gray-800">$49.99</div>
              </div>
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="yearly"
                className="text-xs"
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