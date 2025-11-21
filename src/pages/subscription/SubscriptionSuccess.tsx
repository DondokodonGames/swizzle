/**
 * SubscriptionSuccess.tsx
 * 決済成功ページ（完全インラインスタイル版）
 * 
 * 修正内容:
 * - Tailwind CSSクラス → 完全インラインスタイル + DESIGN_TOKENS
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import { PremiumBadge } from '../../components/monetization/PremiumBadge';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

export function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        await new Promise((resolve) => setTimeout(resolve, 2000));
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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 50%, #eff6ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: `4px solid ${DESIGN_TOKENS.colors.purple[200]}`,
            borderTop: `4px solid ${DESIGN_TOKENS.colors.purple[600]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            animation: 'spin 1s linear infinite',
            margin: `0 auto ${DESIGN_TOKENS.spacing[4]} auto`
          }} />
          <h2 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
            color: DESIGN_TOKENS.colors.neutral[900],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            {t('pricing.processingPayment')}
          </h2>
          <p style={{
            color: DESIGN_TOKENS.colors.neutral[600],
            fontSize: DESIGN_TOKENS.typography.fontSize.base
          }}>
            {t('pricing.pleaseWait')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 50%, #fce7f3 100%)'
    }}>
      <div style={{
        maxWidth: '672px',
        margin: '0 auto',
        padding: `${DESIGN_TOKENS.spacing[12]} ${DESIGN_TOKENS.spacing[4]}`
      }}>
        {/* Success Card */}
        <div style={{
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
          boxShadow: DESIGN_TOKENS.shadows.xl,
          overflow: 'hidden'
        }}>
          {/* Success Header */}
          <div style={{
            background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
            padding: DESIGN_TOKENS.spacing[6],
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              borderRadius: DESIGN_TOKENS.borderRadius.full,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DESIGN_TOKENS.spacing[3]
            }}>
              <svg
                style={{ 
                  width: '28px', 
                  height: '28px',
                  color: DESIGN_TOKENS.colors.success[500]
                }}
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
            <h1 style={{
              fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: DESIGN_TOKENS.colors.neutral[0],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              {t('pricing.welcomeToPremium')}
            </h1>
            <p style={{
              color: '#e9d5ff',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm
            }}>
              {t('pricing.paymentCompleted')}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: DESIGN_TOKENS.spacing[6] }}>
            {/* Premium Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: DESIGN_TOKENS.spacing[6]
            }}>
              <PremiumBadge size="medium" />
            </div>

            {/* Subscription Info */}
            {subscription && (
              <div style={{
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                borderRadius: DESIGN_TOKENS.borderRadius.xl,
                padding: DESIGN_TOKENS.spacing[4],
                marginBottom: DESIGN_TOKENS.spacing[6]
              }}>
                <h2 style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[3]
                }}>
                  {t('pricing.planInfo')}
                </h2>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: DESIGN_TOKENS.colors.neutral[500] }}>
                      {t('pricing.plan')}
                    </span>
                    <span style={{
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.neutral[800]
                    }}>
                      {subscription.plan_type === 'premium' ? t('pricing.premium') : subscription.plan_type}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: DESIGN_TOKENS.colors.neutral[500] }}>
                      {t('pricing.status')}
                    </span>
                    <span style={{
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.success[600]
                    }}>
                      {t('pricing.active')}
                    </span>
                  </div>
                  {subscription.current_period_end && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: DESIGN_TOKENS.colors.neutral[500] }}>
                        {t('pricing.nextRenewal')}
                      </span>
                      <span style={{
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[800]
                      }}>
                        {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Features Unlocked */}
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
              <h2 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[700],
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                {t('pricing.availableFeatures')}
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: DESIGN_TOKENS.spacing[2]
              }}>
                {[
                  t('pricing.features.unlimitedGames'),
                  t('pricing.features.adFree'),
                  t('pricing.features.allTemplates'),
                  t('pricing.features.advancedEditing'),
                  t('pricing.features.unlimitedAssets'),
                  t('pricing.features.analyticsDashboard'),
                  t('pricing.features.html5Export'),
                  t('pricing.features.prioritySupport'),
                ].map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: DESIGN_TOKENS.colors.neutral[600],
                      backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`
                    }}
                  >
                    <svg
                      style={{
                        width: '14px',
                        height: '14px',
                        minWidth: '14px',
                        minHeight: '14px',
                        color: DESIGN_TOKENS.colors.purple[500],
                        marginRight: DESIGN_TOKENS.spacing[2],
                        flexShrink: 0
                      }}
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
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                  background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
                  color: DESIGN_TOKENS.colors.neutral[0],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  borderRadius: DESIGN_TOKENS.borderRadius.xl,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  boxShadow: DESIGN_TOKENS.shadows.md,
                  transition: `all ${DESIGN_TOKENS.animation.duration.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)';
                  e.currentTarget.style.boxShadow = DESIGN_TOKENS.shadows.lg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)';
                  e.currentTarget.style.boxShadow = DESIGN_TOKENS.shadows.md;
                }}
              >
                {t('pricing.createGame')}
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  color: DESIGN_TOKENS.colors.neutral[600],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  borderRadius: DESIGN_TOKENS.borderRadius.xl,
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  transition: `all ${DESIGN_TOKENS.animation.duration.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.purple[300];
                  e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.neutral[200];
                  e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[0];
                }}
              >
                {t('pricing.backToHome')}
              </button>
            </div>

            {/* Help Text */}
            <p style={{
              marginTop: DESIGN_TOKENS.spacing[4],
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[400],
              textAlign: 'center'
            }}>
              {t('pricing.subscriptionManagement')}
              <a 
                href="/support"
                style={{
                  color: DESIGN_TOKENS.colors.purple[500],
                  marginLeft: DESIGN_TOKENS.spacing[1],
                  textDecoration: 'none',
                  transition: `color ${DESIGN_TOKENS.animation.duration.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = DESIGN_TOKENS.colors.purple[600];
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = DESIGN_TOKENS.colors.purple[500];
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {t('pricing.support')}
              </a>
            </p>
          </div>
        </div>

        {/* Session ID (Debug) */}
        {sessionId && (
          <p style={{
            marginTop: DESIGN_TOKENS.spacing[4],
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[400],
            textAlign: 'center'
          }}>
            {t('pricing.sessionId')}: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}

// スピンアニメーション用CSS
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-subscription-success-animations]')) {
    styleElement.setAttribute('data-subscription-success-animations', 'true');
    document.head.appendChild(styleElement);
  }
}