/**
 * AdUnit.tsx
 * 広告ユニットコンポーネント（MVP版）
 *
 * 機能:
 * - Freeユーザーに広告を表示
 * - Premiumユーザーには何も表示しない
 * - 将来的にGoogle AdSenseなどに置き換え可能
 */

import React from 'react';
import { useSubscription } from '../../hooks/monetization/useSubscription';
import type { AdUnitProps } from '../../types/MonetizationTypes';

/**
 * 広告ユニットコンポーネント
 */
export function AdUnit({ placement, className = '' }: AdUnitProps) {
  const { isPremium, loading } = useSubscription();

  // Premiumユーザーまたはローディング中は広告を表示しない
  if (loading || isPremium) {
    return null;
  }

  // Freeユーザーには広告プレースホルダーを表示
  // TODO: Google AdSenseなど実際の広告に置き換える
  return (
    <div
      className={`ad-unit ${className}`}
      data-placement={placement}
      style={{
        background: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px dashed rgba(0, 0, 0, 0.1)',
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ color: 'rgba(0, 0, 0, 0.3)', fontSize: '14px' }}>
        <div style={{ marginBottom: '8px', fontSize: '24px' }}>📢</div>
        <div>スポンサー広告</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Premiumプランで非表示
        </div>
      </div>
    </div>
  );
}

export default AdUnit;
