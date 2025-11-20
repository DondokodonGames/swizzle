/**
 * Pricing.tsx
 * プラン選択ページ
 * 
 * 機能:
 * - Free/Premiumプランの比較表示
 * - 月額/年額切り替え
 * - 決済ボタン統合
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PricingTable } from '../../components/monetization/PricingTable';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import { MVPSubscriptionPlan } from '../../types/MonetizationTypes';

export function Pricing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { subscription, isPremium, loading } = useSubscription();

  /**
   * キャンセルパラメータをチェック
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const canceled = params.get('canceled');

    if (canceled === 'true') {
      // キャンセル時のメッセージ表示（オプション）
      console.log('Checkout was canceled');
    }
  }, []);

  /**
   * プラン選択時の処理
   */
  const handleSelectPlan = (plan: MVPSubscriptionPlan) => {
    console.log('Plan selected:', plan);
    // 決済完了後は自動的にsuccessページにリダイレクトされる
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="mr-2"
                style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t('pricing.backToHome')}
            </button>

            {isPremium && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                <svg
                  className="text-purple-600"
                  style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-semibold text-purple-600">
                  {t('pricing.premium')}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div
                className="animate-spin rounded-full border-b-2 border-purple-600 mx-auto mb-4"
                style={{ width: '48px', height: '48px' }}
              />
              <p className="text-gray-600 text-sm">{t('pricing.loading')}</p>
            </div>
          </div>
        ) : (
          <PricingTable
            currentPlan={subscription?.plan_type as MVPSubscriptionPlan}
            onSelectPlan={handleSelectPlan}
            showAnnualToggle={true}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
          <p>
            {t('pricing.supportContact')}{' '}
            <a href="/support" className="text-purple-600 hover:text-purple-700 underline">
              {t('pricing.support')}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}