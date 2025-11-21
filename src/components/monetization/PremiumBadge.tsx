/**
 * PremiumBadge.tsx
 * プレミアムユーザーバッジコンポーネント
 * 
 * 機能:
 * - プレミアムユーザーの視覚的識別
 * - サイズバリエーション（small/medium/large）
 * - ラベル表示オプション
 */

import React, { useState } from 'react';
import type { PremiumBadgeProps } from '../../types/MonetizationTypes';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

/**
 * Premium Badge コンポーネント
 */
export function PremiumBadge({
  size = 'medium',
  showLabel = true,
}: PremiumBadgeProps) {
  const [isHover, setIsHover] = useState(false);

  /**
   * サイズに応じたスタイルを取得
   */
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: {
            paddingLeft: DESIGN_TOKENS.spacing[2],
            paddingRight: DESIGN_TOKENS.spacing[2],
            paddingTop: '2px',
            paddingBottom: '2px',
          },
          icon: {
            width: '12px',
            height: '12px',
          },
          text: {
            fontSize: '0.75rem',
            lineHeight: '1rem',
          },
        };
      case 'large':
        return {
          container: {
            paddingLeft: DESIGN_TOKENS.spacing[4],
            paddingRight: DESIGN_TOKENS.spacing[4],
            paddingTop: '6px',
            paddingBottom: '6px',
          },
          icon: {
            width: '24px',
            height: '24px',
          },
          text: {
            fontSize: '1rem',
            lineHeight: '1.5rem',
          },
        };
      case 'medium':
      default:
        return {
          container: {
            paddingLeft: DESIGN_TOKENS.spacing[3],
            paddingRight: DESIGN_TOKENS.spacing[3],
            paddingTop: DESIGN_TOKENS.spacing[1],
            paddingBottom: DESIGN_TOKENS.spacing[1],
          },
          icon: {
            width: '16px',
            height: '16px',
          },
          text: {
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
          },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: `linear-gradient(to right, ${DESIGN_TOKENS.colors.purple[600]}, ${DESIGN_TOKENS.colors.purple[500]})`,
    color: DESIGN_TOKENS.colors.neutral[0],
    fontWeight: 600,
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    boxShadow: isHover ? DESIGN_TOKENS.shadows.lg : DESIGN_TOKENS.shadows.md,
    transition: 'box-shadow 0.2s ease-in-out',
    cursor: 'default',
    ...sizeStyles.container,
  };

  return (
    <span
      style={containerStyle}
      title="プレミアムユーザー"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {/* Crown Icon */}
      <svg
        style={sizeStyles.icon}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
          clipRule="evenodd"
        />
      </svg>

      {/* Label */}
      {showLabel && <span style={sizeStyles.text}>Premium</span>}
    </span>
  );
}

/**
 * Premium Badge (Icon Only)
 */
export function PremiumBadgeIcon({ size = 'medium' }: Omit<PremiumBadgeProps, 'showLabel'>) {
  return <PremiumBadge size={size} showLabel={false} />;
}

/**
 * Premium Badge (Compact)
 * アバター横などの狭いスペース用
 */
export function PremiumBadgeCompact() {
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    background: `linear-gradient(to right, ${DESIGN_TOKENS.colors.purple[600]}, ${DESIGN_TOKENS.colors.purple[500]})`,
    color: DESIGN_TOKENS.colors.neutral[0],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    boxShadow: DESIGN_TOKENS.shadows.md,
  };

  const iconStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
  };

  return (
    <span
      style={containerStyle}
      title="プレミアムユーザー"
    >
      <svg style={iconStyle} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}