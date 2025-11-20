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
          relative rounded-xl p-5 flex flex-col
          ${planConfig.recommended
            ? 'bg-white border-2 border-purple-500 shadow-lg shadow-purple-100'
            : 'bg-white border border-gray-200 shadow-sm'}
          ${isCurrentPlan ? 'ring-2 ring-green-400' : ''}
          transition-all duration-200 hover:shadow-md
        `}
      >
        {/* Recommended Badge */}
        {planConfig.recommended && (
          <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
            <span className="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              人気
            </span>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <div className="absolute top-2 right-2">
            <span className="bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
              利用中
            </span>
          </div>
        )}

        {/* Plan Header */}
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold text-gray-900">
            {planConfig.displayName}
          </h3>
        </div>

        {/* Price */}
        <div className="text-center mb-4">
          {plan === 'free' ? (
            <div>
              <span className="text-3xl font-bold text-gray-900">¥0</span>
              <span className="text-gray-500 text-xs ml-1">/月</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-purple-600">
                ${price}
              </span>
              <span className="text-gray-500 text-xs ml-1">
                /{billingCycle === 'yearly' ? '年' : '月'}
              </span>
              {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                <div className="mt-1">
                  <span className="inline-block bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    {yearlyDiscount}% OFF
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features List */}
        <ul className="space-y-1.5 mb-4 flex-grow">
          {planConfig.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className={`mr-1.5 mt-0.5 flex-shrink-0 ${planConfig.recommended ? 'text-purple-500' : 'text-gray-400'}`}
                style={{ width: '12px', height: '12px', minWidth: '12px', minHeight: '12px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-600 text-[11px] leading-tight">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-auto">
          {isCurrentPlan ? (
            <button
              disabled
              className="w-full py-2 px-3 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed text-xs"
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header - コンパクトで洗練されたデザイン */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          プラン選択
        </h2>
        <p className="text-sm text-gray-500">
          あなたに最適なプランを選んでください
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      {showAnnualToggle && (
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 rounded-lg p-0.5 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`
                px-4 py-1.5 rounded-md font-medium text-xs transition-all duration-150
                ${billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              月額
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`
                px-4 py-1.5 rounded-md font-medium text-xs transition-all duration-150
                ${billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              年額
              <span className="ml-1 text-green-600 text-[10px]">17%OFF</span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {renderPlanCard(MVPSubscriptionPlan.FREE)}
        {renderPlanCard(MVPSubscriptionPlan.PREMIUM)}
      </div>
    </div>
  );
}