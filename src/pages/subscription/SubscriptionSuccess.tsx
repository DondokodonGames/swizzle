/**
 * Success.tsx
 * 決済成功ページ
 * 
 * 機能:
 * - 決済完了メッセージ表示
 * - サブスクリプション情報表示
 * - 次のアクション案内
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import { PremiumBadge } from '../../components/monetization/PremiumBadge';

export function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, loading, refetch } = useSubscription();
  const [isRefreshing, setIsRefreshing] = useState(true);

  const sessionId = searchParams.get('session_id');

  /**
   * サブスクリプション情報を更新
   */
  useEffect(() => {
    const refreshSubscription = async () => {
      try {
        // Webhook処理に少し時間がかかる場合があるため、少し待つ
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // サブスクリプション情報を再取得
        await refetch();
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    if (sessionId) {
      refreshSubscription();
    } else {
      setIsRefreshing(false);
    }
  }, [sessionId, refetch]);

  if (loading || isRefreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            決済を処理中...
          </h2>
          <p className="text-gray-600">少々お待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success Card - モダンデザイン */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header - コンパクト版 */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
            <div
              className="inline-flex items-center justify-center bg-white rounded-full mb-3"
              style={{ width: '48px', height: '48px' }}
            >
              <svg
                className="text-green-500"
                style={{ width: '28px', height: '28px' }}
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
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              ようこそ Premium へ
            </h1>
            <p className="text-purple-100 text-sm">
              お支払いが完了しました
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Premium Badge - 適切なサイズ */}
            <div className="flex justify-center mb-6">
              <PremiumBadge size="medium" />
            </div>

            {/* Subscription Info - コンパクト版 */}
            {subscription && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  プラン情報
                </h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">プラン</span>
                    <span className="font-medium text-gray-800">
                      {subscription.plan_type === 'premium' ? 'Premium' : subscription.plan_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ステータス</span>
                    <span className="font-medium text-green-600">
                      アクティブ
                    </span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">次回更新</span>
                      <span className="font-medium text-gray-800">
                        {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Features Unlocked - グリッド表示 */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                利用可能な機能
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  '無制限ゲーム作成',
                  '広告非表示',
                  '全テンプレート',
                  '高度な編集機能',
                  'アセット無制限',
                  '分析ダッシュボード',
                  'HTML5エクスポート',
                  '優先サポート',
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
                  >
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
                    <span className="text-xs">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons - コンパクト版 */}
            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg text-sm"
              >
                ゲームを作成する
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 bg-white text-gray-600 font-medium rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm"
              >
                ホームに戻る
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-4 text-xs text-gray-400 text-center">
              サブスクリプション管理は
              <a href="/support" className="text-purple-500 hover:text-purple-600 ml-1">
                サポート
              </a>
              へ
            </p>
          </div>
        </div>

        {/* Session ID (Debug) */}
        {sessionId && (
          <p className="mt-4 text-xs text-gray-400 text-center">
            Session ID: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}