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

export function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Cancel Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-8 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
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
              お支払いがキャンセルされました
            </h1>
            <p className="text-gray-100">
              決済は完了していません
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Message */}
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 mb-4">
                決済処理がキャンセルされました。
                <br />
                プランのアップグレードは行われていません。
              </p>
              <p className="text-sm text-gray-600">
                何か問題がありましたか？お困りの際はお気軽にお問い合わせください。
              </p>
            </div>

            {/* Free Plan Features */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                無料プランでもできること
              </h2>
              <ul className="space-y-3">
                {[
                  '✨ 月5ゲームまで作成可能',
                  '✨ 基本テンプレート50種類',
                  '✨ 基本ゲームエディター',
                  '✨ ソーシャル機能（いいね・フォロー）',
                  '✨ ゲーム公開・共有',
                  '✨ コミュニティサポート',
                ].map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center text-gray-700"
                  >
                    <svg
                      className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0"
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
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Why Premium? */}
            <div className="bg-purple-50 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                プレミアムプランの特典
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    🎮 無制限作成
                  </h3>
                  <p className="text-sm text-gray-600">
                    月間制限なしでゲームを作り放題
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    🚫 広告なし
                  </h3>
                  <p className="text-sm text-gray-600">
                    快適な編集・プレイ体験
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    📚 全テンプレート
                  </h3>
                  <p className="text-sm text-gray-600">
                    225種類すべてのテンプレート
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    ⚡ 優先サポート
                  </h3>
                  <p className="text-sm text-gray-600">
                    24時間以内の迅速な対応
                  </p>
                </div>
              </div>
            </div>

            {/* Common Questions */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                よくあるご質問
              </h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Q. 支払い方法を変更したい
                  </h3>
                  <p className="text-gray-600">
                    A. もう一度プラン選択ページから決済を開始できます。
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Q. カード情報の入力が不安
                  </h3>
                  <p className="text-gray-600">
                    A. 決済は世界中で使われているStripeで安全に処理されます。カード情報は暗号化され、当社では保持しません。
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Q. 後から解約できる？
                  </h3>
                  <p className="text-gray-600">
                    A. はい、いつでも解約可能です。解約後も次回更新日までプレミアム機能をご利用いただけます。
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
                プランを再確認する
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 px-6 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                ホームに戻る
              </button>
              <button
                onClick={() => navigate('/editor')}
                className="w-full py-3 px-6 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                無料プランで続ける →
              </button>
            </div>

            {/* Support Link */}
            <p className="mt-6 text-xs text-gray-500 text-center">
              ご不明な点がございましたら{' '}
              <a href="/support" className="text-purple-600 hover:text-purple-700 underline">
                サポート
              </a>{' '}
              までお問い合わせください。
              <br />
              喜んでサポートさせていただきます！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}