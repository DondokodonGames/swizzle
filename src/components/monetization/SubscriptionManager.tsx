/**
 * SubscriptionManager.tsx (= WalletManager)
 * ウォレット残高・利用状況表示パネル（ペイ・パー・プレイモデル）
 */

import React, { useState } from 'react';
import { useWallet } from '../../hooks/monetization/useWallet';
import { TOP_UP_OPTIONS, FREE_GAME_LIMIT, COST_PER_GAME_YEN } from '../../types/MonetizationTypes';
import { TopUpButton } from './TopUpButton';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

export function SubscriptionManager() {
  const { wallet, loading, status } = useWallet();
  const [showTopUp, setShowTopUp] = useState(false);

  if (loading) {
    return (
      <div style={{
        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
        borderRadius: '16px', boxShadow: DESIGN_TOKENS.shadows.lg,
        padding: DESIGN_TOKENS.spacing[8]
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[4] }}>
          {['33%','66%','50%'].map((w, i) => (
            <div key={i} style={{
              height: '1rem', backgroundColor: DESIGN_TOKENS.colors.neutral[200],
              borderRadius: DESIGN_TOKENS.borderRadius.md, width: w,
              animation: 'pulse 2s infinite'
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  const freeRemaining = wallet?.free_games_remaining ?? FREE_GAME_LIMIT;
  const totalCreated = wallet?.total_games_created ?? 0;
  const balanceYen = wallet?.balance_yen ?? 0;
  const isFreePhase = status?.isFreePhase ?? true;

  const freeUsed = Math.min(totalCreated, FREE_GAME_LIMIT);
  const freePct = Math.min((freeUsed / FREE_GAME_LIMIT) * 100, 100);

  const getBarColor = () => {
    if (freePct >= 100) return DESIGN_TOKENS.colors.error[500];
    if (freePct >= 80) return DESIGN_TOKENS.colors.warning[500];
    return DESIGN_TOKENS.colors.primary[500];
  };

  return (
    <div style={{
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderRadius: '16px', boxShadow: DESIGN_TOKENS.shadows.lg,
      padding: DESIGN_TOKENS.spacing[8]
    }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[6] }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: DESIGN_TOKENS.colors.neutral[900], margin: 0 }}>
          ウォレット
        </h2>
        <span style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.neutral[500],
          backgroundColor: DESIGN_TOKENS.colors.neutral[100],
          borderRadius: DESIGN_TOKENS.borderRadius.full,
          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`
        }}>
          {COST_PER_GAME_YEN}円 / ゲーム
        </span>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[6] }}>
        {[
          { label: '累計ゲーム数', value: totalCreated.toLocaleString() },
          { label: '無料残り', value: `${freeRemaining}回` },
          { label: '残高', value: `${balanceYen.toLocaleString()}円` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.xl,
            padding: DESIGN_TOKENS.spacing[4], textAlign: 'center'
          }}>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[500], marginBottom: DESIGN_TOKENS.spacing[1] }}>
              {label}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: DESIGN_TOKENS.colors.neutral[900] }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Free phase progress */}
      <div style={{
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        borderRadius: DESIGN_TOKENS.borderRadius.xl,
        padding: DESIGN_TOKENS.spacing[5],
        marginBottom: DESIGN_TOKENS.spacing[6]
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[2] }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, color: DESIGN_TOKENS.colors.neutral[600] }}>
            無料枠の進行状況
          </span>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, fontWeight: 700, color: DESIGN_TOKENS.colors.neutral[800] }}>
            {freeUsed} / {FREE_GAME_LIMIT}
          </span>
        </div>
        <div style={{
          width: '100%', height: 10,
          backgroundColor: DESIGN_TOKENS.colors.neutral[200],
          borderRadius: DESIGN_TOKENS.borderRadius.full, overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', width: `${freePct}%`,
            backgroundColor: getBarColor(),
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>
        {isFreePhase ? (
          <p style={{ marginTop: DESIGN_TOKENS.spacing[2], fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[500] }}>
            あと <strong>{freeRemaining}</strong> ゲーム無料で遊べます
          </p>
        ) : (
          <p style={{ marginTop: DESIGN_TOKENS.spacing[2], fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.warning[600], fontWeight: 600 }}>
            無料枠を使い切りました。残高からゲームを続けましょう！
          </p>
        )}
      </div>

      {/* Top-up section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[3] }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: DESIGN_TOKENS.colors.neutral[900], margin: 0 }}>
            チャージ
          </h3>
          <button
            onClick={() => setShowTopUp(!showTopUp)}
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[600],
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {showTopUp ? '閉じる ▲' : '開く ▼'}
          </button>
        </div>
        {showTopUp && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: DESIGN_TOKENS.spacing[2] }}>
            {TOP_UP_OPTIONS.map((opt) => (
              <TopUpButton key={opt.amount_yen} option={opt} />
            ))}
          </div>
        )}
      </div>

      <p style={{ marginTop: DESIGN_TOKENS.spacing[6], fontSize: '0.75rem', color: DESIGN_TOKENS.colors.neutral[500], textAlign: 'center' }}>
        残高は有効期限なし。安全な決済はStripeで処理されます。
      </p>
    </div>
  );
}
