/**
 * SubscriptionCancel.tsx
 * 決済キャンセルページ（完全インラインスタイル版）
 * 
 * 修正内容:
 * - Tailwind CSSクラス → 完全インラインスタイル + DESIGN_TOKENS
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

export function SubscriptionCancel() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #eff6ff 100%)'
    }}>
      <div style={{
        maxWidth: '768px',
        margin: '0 auto',
        padding: `${DESIGN_TOKENS.spacing[16]} ${DESIGN_TOKENS.spacing[4]}`
      }}>
        {/* Cancel Card */}
        <div style={{
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
          boxShadow: DESIGN_TOKENS.shadows.xl,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #52525b 0%, #71717a 100%)',
            padding: DESIGN_TOKENS.spacing[8],
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              borderRadius: DESIGN_TOKENS.borderRadius.full,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DESIGN_TOKENS.spacing[4]
            }}>
              <svg
                style={{ 
                  width: '36px', 
                  height: '36px',
                  color: DESIGN_TOKENS.colors.neutral[400]
                }}
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
            <h1 style={{
              fontSize: DESIGN_TOKENS.typography.fontSize['3xl'],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: DESIGN_TOKENS.colors.neutral[0],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              {t('pricing.paymentCancelled')}
            </h1>
            <p style={{
              color: '#f1f5f9',
              fontSize: DESIGN_TOKENS.typography.fontSize.base
            }}>
              {t('pricing.paymentNotCompleted')}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: DESIGN_TOKENS.spacing[8] }}>
            {/* Message */}
            <div style={{
              textAlign: 'center',
              marginBottom: DESIGN_TOKENS.spacing[8]
            }}>
              <p style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                color: DESIGN_TOKENS.colors.neutral[700],
                marginBottom: DESIGN_TOKENS.spacing[4],
                lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
              }}>
                {t('pricing.paymentCancelledMessage')}
                <br />
                {t('pricing.upgradeNotCompleted')}
              </p>
              <p style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[600]
              }}>
                {t('pricing.problemQuestion')}
              </p>
            </div>

            {/* Free Plan Features */}
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.primary[50],
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              padding: DESIGN_TOKENS.spacing[6],
              marginBottom: DESIGN_TOKENS.spacing[8]
            }}>
              <h2 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.neutral[900],
                marginBottom: DESIGN_TOKENS.spacing[4]
              }}>
                {t('pricing.freePlanTitle')}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: DESIGN_TOKENS.spacing[3]
              }}>
                {[
                  t('pricing.freePlanFeatures.limit5Games'),
                  t('pricing.freePlanFeatures.basicTemplates'),
                  t('pricing.freePlanFeatures.basicEditor'),
                  t('pricing.freePlanFeatures.socialFeatures'),
                  t('pricing.freePlanFeatures.publishShare'),
                  t('pricing.freePlanFeatures.communitySupport'),
                ].map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: DESIGN_TOKENS.colors.neutral[700]
                    }}
                  >
                    <svg
                      style={{
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        minHeight: '20px',
                        color: DESIGN_TOKENS.colors.primary[600],
                        marginRight: DESIGN_TOKENS.spacing[3],
                        flexShrink: 0
                      }}
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
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Premium? */}
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.purple[50],
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              padding: DESIGN_TOKENS.spacing[6],
              marginBottom: DESIGN_TOKENS.spacing[8]
            }}>
              <h2 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.neutral[900],
                marginBottom: DESIGN_TOKENS.spacing[4]
              }}>
                {t('pricing.premiumBenefitsTitle')}
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: DESIGN_TOKENS.spacing[4]
              }}>
                {[
                  {
                    title: t('pricing.premiumBenefits.unlimitedCreation'),
                    desc: t('pricing.premiumBenefits.unlimitedCreationDesc')
                  },
                  {
                    title: t('pricing.premiumBenefits.noAds'),
                    desc: t('pricing.premiumBenefits.noAdsDesc')
                  },
                  {
                    title: t('pricing.premiumBenefits.allTemplates'),
                    desc: t('pricing.premiumBenefits.allTemplatesDesc')
                  },
                  {
                    title: t('pricing.premiumBenefits.prioritySupport'),
                    desc: t('pricing.premiumBenefits.prioritySupportDesc')
                  }
                ].map((benefit, index) => (
                  <div key={index}>
                    <h3 style={{
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                      color: DESIGN_TOKENS.colors.neutral[900],
                      marginBottom: DESIGN_TOKENS.spacing[2],
                      fontSize: DESIGN_TOKENS.typography.fontSize.base
                    }}>
                      {benefit.title}
                    </h3>
                    <p style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[600],
                      lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
                    }}>
                      {benefit.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Questions */}
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              padding: DESIGN_TOKENS.spacing[6],
              marginBottom: DESIGN_TOKENS.spacing[8]
            }}>
              <h2 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.neutral[900],
                marginBottom: DESIGN_TOKENS.spacing[4]
              }}>
                {t('pricing.faqTitle')}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: DESIGN_TOKENS.spacing[4],
                fontSize: DESIGN_TOKENS.typography.fontSize.sm
              }}>
                {[
                  {
                    q: t('pricing.faq.changePaymentMethod'),
                    a: t('pricing.faq.changePaymentMethodAnswer')
                  },
                  {
                    q: t('pricing.faq.cardInfoConcern'),
                    a: t('pricing.faq.cardInfoConcernAnswer')
                  },
                  {
                    q: t('pricing.faq.canCancel'),
                    a: t('pricing.faq.canCancelAnswer')
                  }
                ].map((faq, index) => (
                  <div key={index}>
                    <h3 style={{
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                      color: DESIGN_TOKENS.colors.neutral[900],
                      marginBottom: DESIGN_TOKENS.spacing[1]
                    }}>
                      {faq.q}
                    </h3>
                    <p style={{
                      color: DESIGN_TOKENS.colors.neutral[600],
                      lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
                    }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: DESIGN_TOKENS.spacing[3]
            }}>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[6]}`,
                  background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)',
                  color: DESIGN_TOKENS.colors.neutral[0],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  borderRadius: DESIGN_TOKENS.borderRadius.xl,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.base,
                  boxShadow: DESIGN_TOKENS.shadows.lg,
                  transition: `all ${DESIGN_TOKENS.animation.duration.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)';
                  e.currentTarget.style.boxShadow = DESIGN_TOKENS.shadows.xl;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)';
                  e.currentTarget.style.boxShadow = DESIGN_TOKENS.shadows.lg;
                }}
              >
                {t('pricing.reviewPlans')}
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[6]}`,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  color: DESIGN_TOKENS.colors.neutral[700],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  borderRadius: DESIGN_TOKENS.borderRadius.xl,
                  border: `2px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.base,
                  transition: `all ${DESIGN_TOKENS.animation.duration.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.neutral[300];
                  e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.neutral[200];
                  e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[0];
                }}
              >
                {t('pricing.backToHome')}
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[6]}`,
                  backgroundColor: 'transparent',
                  color: DESIGN_TOKENS.colors.neutral[600],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.base,
                  transition: `color ${DESIGN_TOKENS.animation.duration.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[900];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
                }}
              >
                {t('pricing.continueWithFree')}
              </button>
            </div>

            {/* Support Link */}
            <p style={{
              marginTop: DESIGN_TOKENS.spacing[6],
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[500],
              textAlign: 'center',
              lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
            }}>
              {t('pricing.anyQuestions')}{' '}
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
              <br />
              {t('pricing.happyToHelp')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}