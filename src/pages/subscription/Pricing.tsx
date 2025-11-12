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
import { PricingTable } from '../components/monetization/PricingTable';
import { useSubscription } from '../hooks/monetization/useSubscription';
import { MVPSubscriptionPlan } from '../types/MonetizationTypes';

export function Pricing() {
  const navigate = useNavigate();
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
                className="w-5 h-5 mr-2"
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
              ホームに戻る
            </button>

            {isPremium && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-semibold text-purple-600">
                  Premium会員
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">読み込み中...</p>
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

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          よくある質問
        </h2>
        
        <div className="space-y-6">
          {/* FAQ Item 1 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              いつでもキャンセルできますか？
            </h3>
            <p className="text-gray-600">
              はい、いつでもキャンセル可能です。キャンセル後も、次回更新日まではプレミアム機能をご利用いただけます。
            </p>
          </div>

          {/* FAQ Item 2 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              支払い方法は何が使えますか？
            </h3>
            <p className="text-gray-600">
              クレジットカード（Visa、Mastercard、American Express）がご利用いただけます。決済は安全なStripeで処理されます。
            </p>
          </div>

          {/* FAQ Item 3 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              年額プランの方がお得ですか？
            </h3>
            <p className="text-gray-600">
              はい、年額プランは月額プランと比べて約17%お得です。月額$4.99 × 12ヶ月 = $59.88のところ、年額プランは$49.99です。
            </p>
          </div>

          {/* FAQ Item 4 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              プラン変更はできますか？
            </h3>
            <p className="text-gray-600">
              はい、マイページからいつでもプラン変更が可能です。月額⇔年額の切り替えもできます。
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
          <p>
            お困りの際は{' '}
            <a href="/support" className="text-purple-600 hover:text-purple-700 underline">
              サポート
            </a>{' '}
            までお問い合わせください
          </p>
        </div>
      </footer>
    </div>
  );
}