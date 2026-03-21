/**
 * Pricing.tsx
 * プラン選択ページ（完全インラインスタイル版）
 * 
 * 修正内容:
 * - Tailwind CSSクラス → 完全インラインスタイル + DESIGN_TOKENS
 * - すべてのclassName削除（識別用のみ残す）
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SubscriptionManager } from '../../components/monetization/SubscriptionManager';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

export function Pricing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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

          {/* Wallet icon placeholder */}
          <span style={{ fontSize: '1.25rem' }}>🪙</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: `${DESIGN_TOKENS.spacing[12]} 0` }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: `0 ${DESIGN_TOKENS.spacing[4]}` }}>
          <SubscriptionManager />
        </div>
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