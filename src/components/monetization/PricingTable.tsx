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
   * プランカードのレンダリング - モダンデザイン版
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
          relative rounded-2xl p-6
          ${planConfig.recommended
            ? 'bg-gradient-to-br from-purple-50 via-white to-pink-50 border-2 border-purple-400 shadow-purple-100'
            : 'bg-white border border-gray-200'}
          ${isCurrentPlan ? 'ring-2 ring-green-400' : ''}
          shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1
        `}
      >
        {/* Recommended Badge */}
        {planConfig.recommended && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              おすすめ
            </span>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <div className="absolute top-3 right-3">
            <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
              利用中
            </span>
          </div>
        )}

        {/* Plan Header */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {planConfig.displayName}
          </h3>
          <p className="text-gray-500 text-xs">
            {planConfig.description}
          </p>
        </div>

        {/* Price - 適切なサイズに調整 */}
        <div className="text-center mb-5 py-3 bg-gray-50 rounded-xl">
          {plan === 'free' ? (
            <div>
              <span className="text-3xl font-bold text-gray-800">¥0</span>
              <span className="text-gray-500 text-sm ml-1">/月</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-gray-800">
                ${price}
              </span>
              <span className="text-gray-500 text-sm ml-1">
                /{billingCycle === 'yearly' ? '年' : '月'}
              </span>
              {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                <div className="mt-1">
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {yearlyDiscount}% OFF
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features List - コンパクト版 */}
        <ul className="space-y-2 mb-6">
          {planConfig.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="text-purple-500 mr-2 mt-0.5 flex-shrink-0"
                style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px' }}
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
              <span className="text-gray-600 text-xs">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button - モダンデザイン */}
        <div className="mt-auto">
          {isCurrentPlan ? (
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-xl font-semibold bg-gray-100 text-gray-400 cursor-not-allowed text-sm"
            >
              利用中
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header - モダンなヒーローセクション */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
          <span className="text-purple-600 text-sm font-medium">💎 Premium</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
          クリエイターのための料金プラン
        </h2>
        <p className="text-base text-gray-600 max-w-md mx-auto">
          無料で始めて、必要に応じてアップグレード
        </p>
      </div>

      {/* Billing Cycle Toggle - モダン版 */}
      {showAnnualToggle && (
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-full p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`
                px-5 py-2 rounded-full font-medium text-sm transition-all duration-200
                ${billingCycle === 'monthly'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              月額
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`
                px-5 py-2 rounded-full font-medium text-sm transition-all duration-200
                ${billingCycle === 'yearly'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              年額
              <span className="ml-1 text-green-600 text-xs">17%OFF</span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid - よりコンパクト */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {renderPlanCard(MVPSubscriptionPlan.FREE)}
        {renderPlanCard(MVPSubscriptionPlan.PREMIUM)}
      </div>

      {/* FAQ Link - シンプル版 */}
      <div className="text-center mt-8">
        <p className="text-gray-500 text-sm">
          ご不明な点は
          <a href="#faq" className="text-purple-600 hover:text-purple-700 font-medium ml-1">
            FAQ
          </a>
          をご覧ください
        </p>
      </div>
    </div>
  );
}