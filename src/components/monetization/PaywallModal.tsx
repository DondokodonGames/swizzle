/**
 * PaywallModal.tsx
 * 残高不足時のチャージ促進モーダル（ペイ・パー・プレイモデル）
 */

import React from 'react';
import type { PaywallModalProps } from '../../types/MonetizationTypes';
import { TOP_UP_OPTIONS, FREE_GAME_LIMIT } from '../../types/MonetizationTypes';
import { TopUpButton } from './TopUpButton';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

export function PaywallModal({ isOpen, onClose, currentUsage }: PaywallModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: DESIGN_TOKENS.zIndex.modal, overflowY: 'auto'
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        display: 'flex', minHeight: '100%',
        alignItems: 'center', justifyContent: 'center',
        padding: DESIGN_TOKENS.spacing[4]
      }}>
        <div
          style={{
            position: 'relative',
            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
            borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
            boxShadow: DESIGN_TOKENS.shadows['2xl'],
            maxWidth: '420px', width: '100%',
            padding: DESIGN_TOKENS.spacing[6]
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: DESIGN_TOKENS.spacing[4], right: DESIGN_TOKENS.spacing[4],
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: DESIGN_TOKENS.colors.neutral[400]
            }}
            aria-label="閉じる"
          >
            <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <div style={{
              width: 48, height: 48, borderRadius: DESIGN_TOKENS.borderRadius.full,
              background: 'linear-gradient(135deg,#fef9c3,#fde68a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24
            }}>
              🪙
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
            textAlign: 'center', color: DESIGN_TOKENS.colors.neutral[900],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            残高が不足しています
          </h2>

          {/* Description */}
          <p style={{
            textAlign: 'center', color: DESIGN_TOKENS.colors.neutral[500],
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            marginBottom: DESIGN_TOKENS.spacing[5]
          }}>
            無料の {FREE_GAME_LIMIT} ゲームを使い切りました。
            チャージして続けましょう！<br />
            <strong style={{ color: DESIGN_TOKENS.colors.neutral[700] }}>1ゲーム = 1円</strong>
          </p>

          {/* Usage info */}
          {currentUsage && (
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              padding: DESIGN_TOKENS.spacing[3],
              marginBottom: DESIGN_TOKENS.spacing[5],
              textAlign: 'center',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600]
            }}>
              累計ゲーム作成数: <strong style={{ color: DESIGN_TOKENS.colors.neutral[900] }}>
                {currentUsage.used}
              </strong>
              {currentUsage.remaining > 0 && (
                <> &nbsp;|&nbsp; 残高: <strong style={{ color: DESIGN_TOKENS.colors.neutral[900] }}>
                  {currentUsage.remaining}円
                </strong></>
              )}
            </div>
          )}

          {/* Top-up options */}
          <p style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[700],
            marginBottom: DESIGN_TOKENS.spacing[3]
          }}>
            チャージ金額を選択
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            {TOP_UP_OPTIONS.map((opt) => (
              <TopUpButton key={opt.amount_yen} option={opt} />
            ))}
          </div>

          <p style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[400],
            textAlign: 'center'
          }}>
            安全な決済は Stripe で処理されます。
          </p>
        </div>
      </div>
    </div>
  );
}
