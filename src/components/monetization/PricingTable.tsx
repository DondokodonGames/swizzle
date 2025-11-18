/**
 * PricingTable.tsx
 * プラン比較表コンポーネント
 * 
 * 機能:
 * - Free/Premiumプランの比較表示
 * - 月額/年額切り替え
 * - 現在のプラン表示
 * - CheckoutButtonとの統合
 */

import React, { useState } from 'react';
import type { MVPPricingTableProps } from '../../types/MonetizationTypes';
import {
  MVPSubscriptionPlan,
  MVP_PLAN_CONFIGS,
  calculateYearlyDiscount,
} from '../../types/MonetizationTypes';
import { CheckoutButton } from './CheckoutButton';

/**
 * Pricing Table コンポーネント
 */
export function PricingTable({
  currentPlan = MVPSubscriptionPlan.FREE,
  onSelectPlan,
  showAnnualToggle = true,
}: MVPPricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  /**
   * プランカードのレンダリング
   */
  const renderPlanCard = (plan: MVPSubscriptionPlan) => {
    const planConfig = MVP_PLAN_CONFIGS[plan];
    const isCurrentPlan = currentPlan === plan;
    const price = billingCycle === 'yearly' ? planConfig.yearlyPrice : planConfig.price;
    const yearlyDiscount = calculateYearlyDiscount(plan);

    return (
      <div
        key={plan}
        className={`
          relative rounded-2xl p-8 
          ${planConfig.recommended ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-500' : 'bg-white border border-gray-200'}
          ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}
          shadow-lg hover:shadow-xl transition-all duration-200
        `}
      >
        {/* Recommended Badge */}
        {planConfig.recommended && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-purple-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-md">
              おすすめ
            </span>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <div className="absolute top-4 right-4">
            <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              現在のプラン
            </span>
          </div>
        )}

        {/* Plan Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {planConfig.displayName}
          </h3>
          <p className="text-gray-600 text-sm">
            {planConfig.description}
          </p>
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          {plan === 'free' ? (
            <div>
              <span className="text-5xl font-bold text-gray-900">無料</span>
            </div>
          ) : (
            <div>
              <span className="text-5xl font-bold text-gray-900">
                ${price}
              </span>
              <span className="text-gray-600 ml-2">
                /{billingCycle === 'yearly' ? '年' : '月'}
              </span>
              {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                <div className="mt-2">
                  <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                    {yearlyDiscount}% OFF
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features List */}
        <ul className="space-y-3 mb-8">
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
              <span className="text-gray-700 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-auto">
          {isCurrentPlan ? (
            <button
              disabled
              className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
            >
              現在のプラン
            </button>
          ) : (
            <CheckoutButton
              plan={plan}
              billingCycle={billingCycle}
              onSuccess={() => {
                onSelectPlan?.(plan);
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          シンプルでわかりやすい料金プラン
        </h2>
        <p className="text-xl text-gray-600">
          いつでもキャンセル可能。クレジットカード登録不要。
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      {showAnnualToggle && (
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-full p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`
                px-6 py-2 rounded-full font-semibold transition-all duration-200
                ${billingCycle === 'monthly' 
                  ? 'bg-white text-purple-600 shadow-md' 
                  : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              月額プラン
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`
                px-6 py-2 rounded-full font-semibold transition-all duration-200
                ${billingCycle === 'yearly' 
                  ? 'bg-white text-purple-600 shadow-md' 
                  : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              年額プラン
              <span className="ml-2 text-green-600 text-sm">お得</span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {renderPlanCard(MVPSubscriptionPlan.FREE)}
        {renderPlanCard(MVPSubscriptionPlan.PREMIUM)}
      </div>

      {/* FAQ Link */}
      <div className="text-center mt-12">
        <p className="text-gray-600">
          ご質問がありますか？{' '}
          <a href="/faq" className="text-purple-600 hover:text-purple-700 font-semibold underline">
            よくある質問
          </a>{' '}
          をご覧ください
        </p>
      </div>
    </div>
  );
}