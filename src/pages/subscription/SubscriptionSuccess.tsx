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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Success Icon */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-8 text-center">
            <div
              className="inline-flex items-center justify-center bg-white rounded-full mb-4"
              style={{ width: '60px', height: '60px' }}
            >
              <svg
                className="text-green-500"
                style={{ width: '36px', height: '36px' }}
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
            <h1 className="text-3xl font-bold text-white mb-2">
              お支払いが完了しました！
            </h1>
            <p className="text-purple-100">
              プレミアムプランへようこそ🎉
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Premium Badge */}
            <div className="flex justify-center mb-8">
              <PremiumBadge size="large" />
            </div>

            {/* Subscription Info */}
            {subscription && (
              <div className="bg-purple-50 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  サブスクリプション情報
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">プラン:</span>
                    <span className="font-semibold text-gray-900">
                      {subscription.plan_type === 'premium' ? 'Premium' : subscription.plan_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ステータス:</span>
                    <span className="font-semibold text-green-600">
                      アクティブ
                    </span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">次回更新日:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Features Unlocked */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                利用可能になった機能
              </h2>
              <ul className="space-y-3">
                {[
                  '無制限ゲーム作成',
                  '広告非表示',
                  '全225テンプレート',
                  '高度な編集機能',
                  'カスタムアセット無制限',
                  '分析ダッシュボード',
                  'ゲームエクスポート（HTML5）',
                  '優先サポート（24時間以内）',
                ].map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center text-gray-700"
                  >
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
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Steps */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                次のステップ
              </h2>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>早速ゲームを作成してみましょう</li>
                <li>全225種類のテンプレートをチェック</li>
                <li>高度な編集機能を試してみる</li>
                <li>作品をコミュニティに公開</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
              >
                ゲームを作成する
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 px-6 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                ホームに戻る
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-6 text-xs text-gray-500 text-center">
              サブスクリプションの管理は、マイページから行えます。
              <br />
              ご質問がある場合は{' '}
              <a href="/support" className="text-purple-600 hover:text-purple-700 underline">
                サポート
              </a>{' '}
              までお問い合わせください。
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