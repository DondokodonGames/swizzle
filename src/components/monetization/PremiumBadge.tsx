/**
 * PremiumBadge.tsx
 * プレミアムユーザーバッジコンポーネント
 * 
 * 機能:
 * - プレミアムユーザーの視覚的識別
 * - サイズバリエーション（small/medium/large）
 * - ラベル表示オプション
 */

import React from 'react';
import type { PremiumBadgeProps } from '../../types/MonetizationTypes';

/**
 * Premium Badge コンポーネント
 */
export function PremiumBadge({
  size = 'medium',
  showLabel = true,
}: PremiumBadgeProps) {
  /**
   * サイズに応じたクラス名を取得
   */
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-0.5',
          icon: 'w-3 h-3',
          text: 'text-xs',
        };
      case 'large':
        return {
          container: 'px-4 py-1.5',
          icon: 'w-6 h-6',
          text: 'text-base',
        };
      case 'medium':
      default:
        return {
          container: 'px-3 py-1',
          icon: 'w-4 h-4',
          text: 'text-sm',
        };
    }
  };

  const classes = getSizeClasses();

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 
        bg-gradient-to-r from-purple-600 to-purple-500 
        text-white font-semibold rounded-full 
        shadow-md hover:shadow-lg transition-shadow
        ${classes.container}
      `}
      title="プレミアムユーザー"
    >
      {/* Crown Icon */}
      <svg
        className={classes.icon}
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
      {showLabel && <span className={classes.text}>Premium</span>}
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
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-full shadow-md"
      title="プレミアムユーザー"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}