/**
 * PricingTable.tsx
 * モダンなプラン比較表コンポーネント
 */

import React, { useState } from 'react';
import type { MVPPricingTableProps } from '../../types/MonetizationTypes';
import {
  MVPSubscriptionPlan,
  MVP_PLAN_CONFIGS,
  calculateYearlyDiscount,
} from '../../types/MonetizationTypes';
import { CheckoutButton } from './CheckoutButton';

// プラン機能の定義
const PLAN_FEATURES = {
  free: [
    { text: 'ゲームをプレイ', included: true },
    { text: 'ソーシャル機能', included: true },
    { text: '広告表示あり', included: true, isNegative: true },
    { text: 'エディター機能', included: false },
  ],
  premium: [
    { text: 'ゲームをプレイ', included: true },
    { text: 'ソーシャル機能', included: true },
    { text: '広告非表示', included: true, isHighlight: true },
    { text: 'エディター機能（月20個まで）', included: true, isHighlight: true },
  ],
};

export function PricingTable({
  currentPlan = MVPSubscriptionPlan.FREE,
  onSelectPlan,
  showAnnualToggle = true,
}: MVPPricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const yearlyDiscount = calculateYearlyDiscount(MVPSubscriptionPlan.PREMIUM);
  const premiumConfig = MVP_PLAN_CONFIGS[MVPSubscriptionPlan.PREMIUM];
  const price = billingCycle === 'yearly' ? premiumConfig.yearlyPrice : premiumConfig.price;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          プランを選択
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          無料で始めて、必要に応じてアップグレード
        </p>
      </div>

      {/* Billing Toggle */}
      {showAnnualToggle && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
                color: billingCycle === 'monthly' ? '#111827' : '#6b7280',
                boxShadow: billingCycle === 'monthly' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              月額
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: billingCycle === 'yearly' ? '#ffffff' : 'transparent',
                color: billingCycle === 'yearly' ? '#111827' : '#6b7280',
                boxShadow: billingCycle === 'yearly' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              年額
              <span style={{
                marginLeft: '4px',
                color: '#059669',
                fontSize: '11px'
              }}>
                {yearlyDiscount}%OFF
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Free Plan */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative'
        }}>
          {currentPlan === MVPSubscriptionPlan.FREE && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              現在
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              Free
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: 0
            }}>
              基本機能を無料で
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#111827'
            }}>
              ¥0
            </span>
            <span style={{
              fontSize: '14px',
              color: '#6b7280',
              marginLeft: '4px'
            }}>
              /月
            </span>
          </div>

          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 20px 0'
          }}>
            {PLAN_FEATURES.free.map((feature, index) => (
              <li key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontSize: '13px',
                color: feature.isNegative ? '#9ca3af' : '#374151'
              }}>
                {feature.included ? (
                  <span style={{ color: feature.isNegative ? '#9ca3af' : '#10b981' }}>✓</span>
                ) : (
                  <span style={{ color: '#d1d5db' }}>✗</span>
                )}
                {feature.text}
              </li>
            ))}
          </ul>

          {currentPlan === MVPSubscriptionPlan.FREE ? (
            <button
              disabled
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f3f4f6',
                color: '#9ca3af',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'not-allowed'
              }}
            >
              現在のプラン
            </button>
          ) : (
            <button
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              ダウングレード
            </button>
          )}
        </div>

        {/* Premium Plan */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px solid #8b5cf6',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.1)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: '10px'
          }}>
            おすすめ
          </div>

          {currentPlan === MVPSubscriptionPlan.PREMIUM && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              現在
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              Premium
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: 0
            }}>
              全機能をアンロック
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#8b5cf6'
            }}>
              ${price}
            </span>
            <span style={{
              fontSize: '14px',
              color: '#6b7280',
              marginLeft: '4px'
            }}>
              /{billingCycle === 'yearly' ? '年' : '月'}
            </span>
            {billingCycle === 'yearly' && (
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  backgroundColor: '#d1fae5',
                  color: '#059669',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {yearlyDiscount}% お得
                </span>
              </div>
            )}
          </div>

          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 20px 0'
          }}>
            {PLAN_FEATURES.premium.map((feature, index) => (
              <li key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontSize: '13px',
                color: feature.isHighlight ? '#7c3aed' : '#374151',
                fontWeight: feature.isHighlight ? '500' : '400'
              }}>
                <span style={{ color: '#8b5cf6' }}>✓</span>
                {feature.text}
              </li>
            ))}
          </ul>

          {currentPlan === MVPSubscriptionPlan.PREMIUM ? (
            <button
              disabled
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f3f4f6',
                color: '#9ca3af',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'not-allowed'
              }}
            >
              現在のプラン
            </button>
          ) : (
            <CheckoutButton
              plan={MVPSubscriptionPlan.PREMIUM}
              billingCycle={billingCycle}
              onSuccess={() => {
                onSelectPlan?.(MVPSubscriptionPlan.PREMIUM);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
