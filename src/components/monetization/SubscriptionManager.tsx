/**
 * SubscriptionManager.tsx
 * サブスクリプション管理パネルコンポーネント
 * 
 * 機能:
 * - 現在のプラン・使用状況表示
 * - プラン変更
 * - サブスクリプションキャンセル
 * - Stripe Customer Portalへのリンク
 */

import React, { useState } from 'react';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import { useCredits } from '../../hooks/monetization/useCredits';
import { redirectToCustomerPortal } from '../../services/monetization/StripeService';
import { PremiumBadge } from './PremiumBadge';
import { CheckoutButton } from './CheckoutButton';
import { MVPSubscriptionPlan, MVP_PLAN_CONFIGS } from '../../types/MonetizationTypes';

/**
 * Subscription Manager コンポーネント
 */
export function SubscriptionManager() {
  const { subscription, loading, isPremium, isFree, period } = useSubscription();
  const { usage } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  // ===== デバッグ用ログ（一時的に追加）=====
  console.log('🔍 SubscriptionManager Debug:', {
    subscription,
    isPremium,
    isFree,
    loading,
    plan_type: subscription?.plan_type,
    status: subscription?.status
  });
  // ========================================
  /**
   * Customer Portalを開く
   */
  const handleOpenPortal = async () => {
    try {
      setIsLoading(true);
      await redirectToCustomerPortal();
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('サブスクリプション管理ページを開けませんでした。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  const planConfig = MVP_PLAN_CONFIGS[currentPlan as MVPSubscriptionPlan];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">サブスクリプション</h2>
        {isPremium && <PremiumBadge size="small" showLabel={true} />}
      </div>

      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {planConfig.displayName} プラン
            </h3>
            <p className="text-sm text-gray-600">{planConfig.description}</p>
          </div>
          <div className="text-right">
            {isFree ? (
              <div className="text-3xl font-bold text-gray-900">
                無料
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-purple-600">
                  ${subscription?.stripe_price_id?.includes('year') ? planConfig.yearlyPrice : planConfig.price}
                </div>
                <div className="text-sm text-gray-600">
                  /{subscription?.stripe_price_id?.includes('year') ? '年' : '月'}
                </div>
                {subscription?.stripe_price_id?.includes('year') && (
                  <div className="mt-1 text-xs text-green-600 font-semibold">
                    月額換算: ${(planConfig.yearlyPrice / 12).toFixed(2)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Period Info */}
        {period && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">開始日:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {period.start.toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">次回更新:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {period.end.toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
            {period.daysRemaining > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                残り {period.daysRemaining} 日
                {!period.willRenew && (
                  <span className="ml-2 text-orange-600 font-semibold">
                    （更新予定なし）
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Statistics (Free Plan) */}
      {isFree && usage && usage.isLimited && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            今月の使用状況
          </h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">ゲーム作成数</span>
            <span className="text-lg font-bold text-gray-900">
              {usage.used} / {usage.limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${
                usage.percentage >= 100
                  ? 'bg-red-500'
                  : usage.percentage >= 80
                  ? 'bg-orange-500'
                  : 'bg-blue-500'
              } transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(usage.percentage, 100)}%` }}
            />
          </div>
          {usage.remaining === 0 && (
            <p className="mt-3 text-sm text-red-600 font-semibold">
              今月の制限に達しました。プレミアムにアップグレードして無制限に作成しましょう！
            </p>
          )}
        </div>
      )}

      {/* Features List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          利用可能な機能
        </h3>
        <ul className="space-y-2">
          {planConfig.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="text-purple-600 mr-3 mt-0.5 flex-shrink-0"
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
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isFree ? (
          // Upgrade Button
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              🚀 プレミアムにアップグレード
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="monthly"
                className="text-sm py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              />
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="yearly"
                className="text-sm py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              />
            </div>
            <p className="mt-3 text-xs text-center text-gray-600">
              年額プランなら<strong className="text-green-600">2ヶ月分お得</strong>！
            </p>
          </div>
        ) : (
          // Manage Subscription Button
          <div>
            <button
              onClick={handleOpenPortal}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  処理中...
                </span>
              ) : (
                '⚙️ サブスクリプションを管理'
              )}
            </button>
            <p className="mt-2 text-xs text-center text-gray-600">
              プラン変更・キャンセル・支払い方法の更新
            </p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        {isPremium
          ? 'いつでもキャンセル可能。返金ポリシーについては利用規約をご確認ください。'
          : 'いつでもキャンセル可能。安全な決済はStripeで処理されます。'}
      </p>
    </div>
  );
}