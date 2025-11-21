/**
 * PaywallModal.tsx
 * 無料プラン制限到達時のPaywallモーダル（完全インラインスタイル版）
 * 
 * 修正内容:
 * - Tailwind CSSクラス → 完全インラインスタイル + DESIGN_TOKENS
 */

import React from 'react';
import type { PaywallModalProps } from '../../types/MonetizationTypes';
import { MVPSubscriptionPlan } from '../../types/MonetizationTypes';
import { CheckoutButton } from './CheckoutButton';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

/**
 * Paywall Modal コンポーネント
 */
export function PaywallModal({
  isOpen,
  onClose,
  currentUsage,
}: PaywallModalProps) {
  if (!isOpen) return null;

  /**
   * 使用率の色を決定
   */
  const getUsageColor = (percentage: number): string => {
    if (percentage >= 100) return DESIGN_TOKENS.colors.error[600];
    if (percentage >= 80) return DESIGN_TOKENS.colors.warning[600];
    return DESIGN_TOKENS.colors.primary[600];
  };

  /**
   * プログレスバーの色を決定
   */
  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 100) return DESIGN_TOKENS.colors.error[500];
    if (percentage >= 80) return DESIGN_TOKENS.colors.warning[500];
    return DESIGN_TOKENS.colors.primary[500];
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: DESIGN_TOKENS.zIndex.modal,
      overflowY: 'auto'
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: `opacity ${DESIGN_TOKENS.animation.duration.normal}`
        }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div style={{
        display: 'flex',
        minHeight: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: DESIGN_TOKENS.spacing[4]
      }}>
        <div
          style={{
            position: 'relative',
            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
            borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
            boxShadow: DESIGN_TOKENS.shadows['2xl'],
            maxWidth: '448px',
            width: '100%',
            padding: DESIGN_TOKENS.spacing[6],
            transform: 'scale(1)',
            transition: `all ${DESIGN_TOKENS.animation.duration.normal}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: DESIGN_TOKENS.spacing[4],
              right: DESIGN_TOKENS.spacing[4],
              color: DESIGN_TOKENS.colors.neutral[400],
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: DESIGN_TOKENS.spacing[1],
              transition: `color ${DESIGN_TOKENS.animation.duration.normal}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[400];
            }}
            aria-label="閉じる"
          >
            <svg
              style={{ 
                width: '24px', 
                height: '24px', 
                minWidth: '24px', 
                minHeight: '24px' 
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
          </button>

          {/* Icon */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)',
              borderRadius: DESIGN_TOKENS.borderRadius.full,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg
                style={{ 
                  width: '24px', 
                  height: '24px',
                  color: DESIGN_TOKENS.colors.purple[600]
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
            textAlign: 'center',
            color: DESIGN_TOKENS.colors.neutral[900],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            月間制限に達しました
          </h2>

          {/* Description */}
          <p style={{
            textAlign: 'center',
            color: DESIGN_TOKENS.colors.neutral[500],
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            marginBottom: DESIGN_TOKENS.spacing[6]
          }}>
            無料プランは月{currentUsage?.limit || 5}ゲームまで。プレミアムで無制限に！
          </p>

          {/* Usage Display */}
          {currentUsage && currentUsage.isLimited && (
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              padding: DESIGN_TOKENS.spacing[4],
              marginBottom: DESIGN_TOKENS.spacing[5]
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: DESIGN_TOKENS.spacing[2]
              }}>
                <span style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  今月の使用状況
                </span>
                <span style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: getUsageColor(currentUsage.percentage)
                }}>
                  {currentUsage.used} / {currentUsage.limit}
                </span>
              </div>
              <div style={{
                width: '100%',
                backgroundColor: DESIGN_TOKENS.colors.neutral[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: getProgressBarColor(currentUsage.percentage),
                  width: `${Math.min(currentUsage.percentage, 100)}%`,
                  transition: `width ${DESIGN_TOKENS.animation.duration.slower}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.full
                }} />
              </div>
            </div>
          )}

          {/* Premium Benefits */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[5] }}>
            <h3 style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[700],
              marginBottom: DESIGN_TOKENS.spacing[3]
            }}>
              Premium 特典
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {[
                '無制限ゲーム',
                '広告非表示',
                '全テンプレート',
                '高度な編集',
                'アセット無制限',
                '優先サポート',
              ].map((benefit, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: DESIGN_TOKENS.colors.neutral[600],
                    backgroundColor: DESIGN_TOKENS.colors.purple[50],
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
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Options */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: DESIGN_TOKENS.spacing[3],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            {/* Monthly */}
            <div style={{
              border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              padding: DESIGN_TOKENS.spacing[3],
              transition: `border-color ${DESIGN_TOKENS.animation.duration.normal}`,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.purple[300];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.neutral[200];
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginBottom: '2px'
                }}>
                  月額
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  $4.99
                </div>
              </div>
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="monthly"
                className="text-xs"
              />
            </div>

            {/* Yearly */}
            <div style={{
              border: `2px solid ${DESIGN_TOKENS.colors.purple[400]}`,
              backgroundColor: DESIGN_TOKENS.colors.purple[50],
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              padding: DESIGN_TOKENS.spacing[3],
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}>
                <span style={{
                  backgroundColor: DESIGN_TOKENS.colors.success[500],
                  color: DESIGN_TOKENS.colors.neutral[0],
                  fontSize: '10px',
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  padding: `2px ${DESIGN_TOKENS.spacing[2]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.full
                }}>
                  17%OFF
                </span>
              </div>
              <div style={{
                textAlign: 'center',
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginBottom: '2px'
                }}>
                  年額
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  $49.99
                </div>
              </div>
              <CheckoutButton
                plan={MVPSubscriptionPlan.PREMIUM}
                billingCycle="yearly"
                className="text-xs"
              />
            </div>
          </div>

          {/* Footer Note */}
          <p style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[500],
            textAlign: 'center',
            lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
          }}>
            いつでもキャンセル可能。安全な決済はStripeで処理されます。
          </p>
        </div>
      </div>
    </div>
  );
}