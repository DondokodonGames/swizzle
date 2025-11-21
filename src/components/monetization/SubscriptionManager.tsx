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
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

/**
 * Subscription Manager コンポーネント
 */
export function SubscriptionManager() {
  const { subscription, loading, isPremium, isFree, period } = useSubscription();
  const { usage } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [isManageHover, setIsManageHover] = useState(false);

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

  // スタイル定義
  const containerStyle: React.CSSProperties = {
    backgroundColor: DESIGN_TOKENS.colors.neutral[0],
    borderRadius: '16px',
    boxShadow: DESIGN_TOKENS.shadows.lg,
    padding: DESIGN_TOKENS.spacing[8],
  };

  const skeletonContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: DESIGN_TOKENS.spacing[4],
  };

  const skeletonBarStyle = (width: string): React.CSSProperties => ({
    height: '1rem',
    backgroundColor: DESIGN_TOKENS.colors.neutral[200],
    borderRadius: DESIGN_TOKENS.borderRadius.md,
    width,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  });

  if (loading) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={skeletonContainerStyle}>
          <div style={skeletonBarStyle('33%')} />
          <div style={skeletonBarStyle('66%')} />
          <div style={skeletonBarStyle('50%')} />
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  const planConfig = MVP_PLAN_CONFIGS[currentPlan as MVPSubscriptionPlan];

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DESIGN_TOKENS.spacing[6],
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: DESIGN_TOKENS.colors.neutral[900],
    margin: 0,
  };

  const planCardStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom right, ${DESIGN_TOKENS.colors.purple[50]}, ${DESIGN_TOKENS.colors.purple[100]})`,
    borderRadius: DESIGN_TOKENS.borderRadius.xl,
    padding: DESIGN_TOKENS.spacing[6],
    marginBottom: DESIGN_TOKENS.spacing[6],
  };

  const planHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DESIGN_TOKENS.spacing[4],
  };

  const planTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: DESIGN_TOKENS.colors.neutral[900],
    marginBottom: DESIGN_TOKENS.spacing[1],
  };

  const planDescStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: DESIGN_TOKENS.colors.neutral[600],
  };

  const priceStyle: React.CSSProperties = {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: isPremium ? DESIGN_TOKENS.colors.purple[600] : DESIGN_TOKENS.colors.neutral[900],
  };

  const periodStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: DESIGN_TOKENS.colors.neutral[600],
  };

  const savingsStyle: React.CSSProperties = {
    marginTop: DESIGN_TOKENS.spacing[1],
    fontSize: '0.75rem',
    color: DESIGN_TOKENS.colors.success[600],
    fontWeight: 600,
  };

  const periodInfoStyle: React.CSSProperties = {
    marginTop: DESIGN_TOKENS.spacing[4],
    paddingTop: DESIGN_TOKENS.spacing[4],
    borderTop: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: DESIGN_TOKENS.spacing[4],
    fontSize: '0.875rem',
  };

  const usageCardStyle: React.CSSProperties = {
    backgroundColor: DESIGN_TOKENS.colors.neutral[50],
    borderRadius: DESIGN_TOKENS.borderRadius.xl,
    padding: DESIGN_TOKENS.spacing[6],
    marginBottom: DESIGN_TOKENS.spacing[6],
  };

  const usageHeaderStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.neutral[900],
    marginBottom: DESIGN_TOKENS.spacing[4],
  };

  const usageRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DESIGN_TOKENS.spacing[3],
  };

  const getProgressBarColor = () => {
    if (!usage || !usage.isLimited) return DESIGN_TOKENS.colors.primary[500];
    if (usage.percentage >= 100) return DESIGN_TOKENS.colors.error[500];
    if (usage.percentage >= 80) return DESIGN_TOKENS.colors.warning[500];
    return DESIGN_TOKENS.colors.primary[500];
  };

  const progressBarBgStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: DESIGN_TOKENS.colors.neutral[200],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    height: '12px',
    overflow: 'hidden',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: getProgressBarColor(),
    transition: 'all 0.5s ease-in-out',
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    width: usage && usage.isLimited ? `${Math.min(usage.percentage, 100)}%` : '0%',
  };

  const featuresHeaderStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.neutral[900],
    marginBottom: DESIGN_TOKENS.spacing[4],
  };

  const featureListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: DESIGN_TOKENS.spacing[2],
    marginBottom: DESIGN_TOKENS.spacing[6],
  };

  const featureItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
  };

  const checkIconStyle: React.CSSProperties = {
    color: DESIGN_TOKENS.colors.purple[600],
    marginRight: DESIGN_TOKENS.spacing[3],
    marginTop: '2px',
    flexShrink: 0,
    width: '20px',
    height: '20px',
    minWidth: '20px',
    minHeight: '20px',
  };

  const featureTextStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: DESIGN_TOKENS.colors.neutral[700],
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: DESIGN_TOKENS.spacing[3],
  };

  const upgradeHeaderStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.neutral[900],
    marginBottom: DESIGN_TOKENS.spacing[3],
  };

  const upgradeGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: DESIGN_TOKENS.spacing[3],
  };

  const savingsTextStyle: React.CSSProperties = {
    marginTop: DESIGN_TOKENS.spacing[3],
    fontSize: '0.75rem',
    textAlign: 'center',
    color: DESIGN_TOKENS.colors.neutral[600],
  };

  const getManageButtonStyle = (): React.CSSProperties => {
    if (isLoading) {
      return {
        width: '100%',
        padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[6]}`,
        background: `linear-gradient(to right, ${DESIGN_TOKENS.colors.primary[600]}, ${DESIGN_TOKENS.colors.primary[700]})`,
        color: DESIGN_TOKENS.colors.neutral[0],
        fontWeight: 600,
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        transition: 'all 0.2s ease-in-out',
        boxShadow: DESIGN_TOKENS.shadows.md,
        border: 'none',
        cursor: 'not-allowed',
        opacity: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    }

    return {
      width: '100%',
      padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[6]}`,
      background: isManageHover
        ? `linear-gradient(to right, ${DESIGN_TOKENS.colors.primary[700]}, ${DESIGN_TOKENS.colors.primary[800]})`
        : `linear-gradient(to right, ${DESIGN_TOKENS.colors.primary[600]}, ${DESIGN_TOKENS.colors.primary[700]})`,
      color: DESIGN_TOKENS.colors.neutral[0],
      fontWeight: 600,
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      transition: 'all 0.2s ease-in-out',
      boxShadow: isManageHover ? DESIGN_TOKENS.shadows.lg : DESIGN_TOKENS.shadows.md,
      border: 'none',
      cursor: 'pointer',
    };
  };

  const helpTextStyle: React.CSSProperties = {
    marginTop: DESIGN_TOKENS.spacing[6],
    fontSize: '0.75rem',
    color: DESIGN_TOKENS.colors.neutral[500],
    textAlign: 'center',
  };

  const spinnerContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const spinnerStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    marginRight: DESIGN_TOKENS.spacing[2],
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={headerStyle}>
        <h2 style={headingStyle}>サブスクリプション</h2>
        {isPremium && <PremiumBadge size="small" showLabel={true} />}
      </div>

      {/* Current Plan Card */}
      <div style={planCardStyle}>
        <div style={planHeaderStyle}>
          <div>
            <h3 style={planTitleStyle}>
              {planConfig.displayName} プラン
            </h3>
            <p style={planDescStyle}>{planConfig.description}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {isFree ? (
              <div style={priceStyle}>
                無料
              </div>
            ) : (
              <>
                <div style={priceStyle}>
                  ${subscription?.stripe_price_id?.includes('year') ? planConfig.yearlyPrice : planConfig.price}
                </div>
                <div style={periodStyle}>
                  /{subscription?.stripe_price_id?.includes('year') ? '年' : '月'}
                </div>
                {subscription?.stripe_price_id?.includes('year') && (
                  <div style={savingsStyle}>
                    月額換算: ${(planConfig.yearlyPrice / 12).toFixed(2)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Period Info */}
        {period && (
          <div style={periodInfoStyle}>
            <div style={gridStyle}>
              <div>
                <span style={{ color: DESIGN_TOKENS.colors.neutral[600] }}>開始日:</span>
                <span style={{ marginLeft: DESIGN_TOKENS.spacing[2], fontWeight: 600, color: DESIGN_TOKENS.colors.neutral[900] }}>
                  {period.start.toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div>
                <span style={{ color: DESIGN_TOKENS.colors.neutral[600] }}>次回更新:</span>
                <span style={{ marginLeft: DESIGN_TOKENS.spacing[2], fontWeight: 600, color: DESIGN_TOKENS.colors.neutral[900] }}>
                  {period.end.toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
            {period.daysRemaining > 0 && (
              <div style={{ marginTop: DESIGN_TOKENS.spacing[2], fontSize: '0.875rem', color: DESIGN_TOKENS.colors.neutral[600] }}>
                残り {period.daysRemaining} 日
                {!period.willRenew && (
                  <span style={{ marginLeft: DESIGN_TOKENS.spacing[2], color: DESIGN_TOKENS.colors.warning[600], fontWeight: 600 }}>
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
        <div style={usageCardStyle}>
          <h3 style={usageHeaderStyle}>
            今月の使用状況
          </h3>
          <div style={usageRowStyle}>
            <span style={{ fontSize: '0.875rem', color: DESIGN_TOKENS.colors.neutral[600] }}>ゲーム作成数</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: DESIGN_TOKENS.colors.neutral[900] }}>
              {usage.used} / {usage.limit}
            </span>
          </div>
          <div style={progressBarBgStyle}>
            <div style={progressBarFillStyle} />
          </div>
          {usage.remaining === 0 && (
            <p style={{ marginTop: DESIGN_TOKENS.spacing[3], fontSize: '0.875rem', color: DESIGN_TOKENS.colors.error[600], fontWeight: 600 }}>
              今月の制限に達しました。プレミアムにアップグレードして無制限に作成しましょう！
            </p>
          )}
        </div>
      )}

      {/* Features List */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
        <h3 style={featuresHeaderStyle}>
          利用可能な機能
        </h3>
        <ul style={{ ...featureListStyle, listStyle: 'none', padding: 0, margin: 0 }}>
          {planConfig.features.map((feature, index) => (
            <li key={index} style={featureItemStyle}>
              <svg
                style={checkIconStyle}
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
              <span style={featureTextStyle}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div style={actionsStyle}>
        {isFree ? (
          // Upgrade Button
          <div>
            <h3 style={upgradeHeaderStyle}>
              🚀 プレミアムにアップグレード
            </h3>
            <div style={upgradeGridStyle}>
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
            <p style={savingsTextStyle}>
              年額プランなら<strong style={{ color: DESIGN_TOKENS.colors.success[600] }}>2ヶ月分お得</strong>！
            </p>
          </div>
        ) : (
          // Manage Subscription Button
          <div>
            <button
              onClick={handleOpenPortal}
              disabled={isLoading}
              onMouseEnter={() => setIsManageHover(true)}
              onMouseLeave={() => setIsManageHover(false)}
              style={getManageButtonStyle()}
            >
              {isLoading ? (
                <span style={spinnerContainerStyle}>
                  <svg style={spinnerStyle} viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  処理中...
                </span>
              ) : (
                '⚙️ サブスクリプションを管理'
              )}
            </button>
            <p style={{ marginTop: DESIGN_TOKENS.spacing[2], fontSize: '0.75rem', textAlign: 'center', color: DESIGN_TOKENS.colors.neutral[600] }}>
              プラン変更・キャンセル・支払い方法の更新
            </p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p style={helpTextStyle}>
        {isPremium
          ? 'いつでもキャンセル可能。返金ポリシーについては利用規約をご確認ください。'
          : 'いつでもキャンセル可能。安全な決済はStripeで処理されます。'}
      </p>
    </div>
  );
}