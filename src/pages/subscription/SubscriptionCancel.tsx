/**
 * Cancel.tsx
 * 決済キャンセルページ
 * 
 * 機能:
 * - キャンセルメッセージ表示
 * - 再試行の案内
 * - 無料プランでできることの紹介
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function SubscriptionCancel() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Cancel Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-8 text-center">
            <div
              className="inline-flex items-center justify-center bg-white rounded-full mb-4"
              style={{ width: '60px', height: '60px' }}
            >
              <svg
                className="text-gray-400"
                style={{ width: '36px', height: '36px' }}
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
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('pricing.paymentCancelled')}
            </h1>
            <p className="text-gray-100">
              {t('pricing.paymentNotCompleted')}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Message */}
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 mb-4">
                {t('pricing.paymentCancelledMessage')}
                <br />
                {t('pricing.upgradeNotCompleted')}
              </p>
              <p className="text-sm text-gray-600">
                {t('pricing.problemQuestion')}
              </p>
            </div>

            {/* Free Plan Features */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('pricing.freePlanTitle')}
              </h2>
              <ul className="space-y-3">
                {[
                  t('pricing.freePlanFeatures.limit5Games'),
                  t('pricing.freePlanFeatures.basicTemplates'),
                  t('pricing.freePlanFeatures.basicEditor'),
                  t('pricing.freePlanFeatures.socialFeatures'),
                  t('pricing.freePlanFeatures.publishShare'),
                  t('pricing.freePlanFeatures.communitySupport'),
                ].map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center text-gray-700"
                  >
                    <svg
                      className="text-blue-600 mr-3 flex-shrink-0"
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
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why Premium? */}
            <div className="bg-purple-50 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('pricing.premiumBenefitsTitle')}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('pricing.premiumBenefits.unlimitedCreation')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('pricing.premiumBenefits.unlimitedCreationDesc')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('pricing.premiumBenefits.noAds')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('pricing.premiumBenefits.noAdsDesc')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('pricing.premiumBenefits.allTemplates')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('pricing.premiumBenefits.allTemplatesDesc')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('pricing.premiumBenefits.prioritySupport')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('pricing.premiumBenefits.prioritySupportDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Common Questions */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('pricing.faqTitle')}
              </h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('pricing.faq.changePaymentMethod')}
                  </h3>
                  <p className="text-gray-600">
                    {t('pricing.faq.changePaymentMethodAnswer')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('pricing.faq.cardInfoConcern')}
                  </h3>
                  <p className="text-gray-600">
                    {t('pricing.faq.cardInfoConcernAnswer')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('pricing.faq.canCancel')}
                  </h3>
                  <p className="text-gray-600">
                    {t('pricing.faq.canCancelAnswer')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
              >
                {t('pricing.reviewPlans')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 px-6 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                {t('pricing.backToHome')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-6 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {t('pricing.continueWithFree')}
              </button>
            </div>

            {/* Support Link */}
            <p className="mt-6 text-xs text-gray-500 text-center">
              {t('pricing.anyQuestions')}{' '}
              <a href="/support" className="text-purple-600 hover:text-purple-700 underline">
                {t('pricing.support')}
              </a>
              <br />
              {t('pricing.happyToHelp')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}