/**
 * Pricing.tsx
 * プラン選択ページ（完全インラインスタイル版）
 * 
 * 修正内容:
 * - Tailwind CSSクラス → 完全インラインスタイル + DESIGN_TOKENS
 * - すべてのclassName削除（識別用のみ残す）
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PricingTable } from '../../components/monetization/PricingTable';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import { MVPSubscriptionPlan } from '../../types/MonetizationTypes';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

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
      console.log('Checkout was canceled');
    }
  }, []);

  /**
   * プラン選択時の処理
   */
  const handleSelectPlan = (plan: MVPSubscriptionPlan) => {
    console.log('Plan selected:', plan);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 50%, #eff6ff 100%)'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
        boxShadow: DESIGN_TOKENS.shadows.sm
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[4]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Back to Home Button */}
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: DESIGN_TOKENS.colors.neutral[600],
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              transition: `color ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
              padding: DESIGN_TOKENS.spacing[2]
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[900];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
            }}
          >
            <svg
              style={{ 
                width: '20px', 
                height: '20px', 
                minWidth: '20px', 
                minHeight: '20px',
                marginRight: DESIGN_TOKENS.spacing[2]
              }}
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

          {/* Premium Badge */}
          {isPremium && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              padding: `6px ${DESIGN_TOKENS.spacing[3]}`,
              background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)',
              borderRadius: DESIGN_TOKENS.borderRadius.full
            }}>
              <svg
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  minWidth: '16px', 
                  minHeight: '16px',
                  color: DESIGN_TOKENS.colors.purple[600]
                }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.purple[600]
              }}>
                {t('pricing.premium')}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: `${DESIGN_TOKENS.spacing[12]} 0` }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                  borderTop: `2px solid ${DESIGN_TOKENS.colors.purple[600]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  animation: 'spin 1s linear infinite',
                  margin: `0 auto ${DESIGN_TOKENS.spacing[4]} auto`
                }}
              />
              <p style={{
                color: DESIGN_TOKENS.colors.neutral[600],
                fontSize: DESIGN_TOKENS.typography.fontSize.sm
              }}>
                {t('pricing.loading')}
              </p>
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
      <footer style={{
        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
        borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
        padding: `${DESIGN_TOKENS.spacing[8]} 0`
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: `0 ${DESIGN_TOKENS.spacing[4]}`,
          textAlign: 'center',
          color: DESIGN_TOKENS.colors.neutral[600],
          fontSize: DESIGN_TOKENS.typography.fontSize.sm
        }}>
          <p>
            {t('pricing.supportContact')}{' '}
            <a 
              href="/support" 
              style={{
                color: DESIGN_TOKENS.colors.purple[600],
                textDecoration: 'underline',
                transition: `color ${DESIGN_TOKENS.animation.duration.normal}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = DESIGN_TOKENS.colors.purple[700];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = DESIGN_TOKENS.colors.purple[600];
              }}
            >
              {t('pricing.support')}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// スピンアニメーション用CSS（グローバルに追加）
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-pricing-animations]')) {
    styleElement.setAttribute('data-pricing-animations', 'true');
    document.head.appendChild(styleElement);
  }
}