/**
 * モダンアプリケーション風ボタンコンポーネント
 * Phase 1-B: 基本UI・ファイル管理改善用
 * 🔧 修正版: childrenオプション化・アイコンのみボタン対応・型安全修正
 */

import React, { ButtonHTMLAttributes, forwardRef, useState, useCallback } from 'react';
import { DESIGN_TOKENS, COMPONENT_STYLES } from '../../constants/DesignSystem';

// 🎯 モダンボタンバリアント
export type ModernButtonVariant = 
  | 'primary'      // メインCTA
  | 'secondary'    // セカンダリアクション  
  | 'outline'      // アウトライン
  | 'ghost'        // 透明背景
  | 'success'      // 成功アクション
  | 'warning'      // 警告アクション
  | 'error';       // 危険アクション

// 📏 モダンボタンサイズ
export type ModernButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// ✨ モダンボタンProps（🔧 修正: childrenオプション化）
export interface ModernButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ModernButtonVariant;
  size?: ModernButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode; // 🔧 修正: オプション化（アイコンのみボタン対応）
}

// 🎨 バリアント別スタイル計算
const getVariantStyles = (variant: ModernButtonVariant) => {
  const styles = {
    primary: {
      backgroundColor: DESIGN_TOKENS.colors.primary[500],
      color: DESIGN_TOKENS.colors.neutral[0],
      border: `1px solid ${DESIGN_TOKENS.colors.primary[500]}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.primary[600],
        borderColor: DESIGN_TOKENS.colors.primary[600]
      },
      '&:active': {
        backgroundColor: DESIGN_TOKENS.colors.primary[700],
        borderColor: DESIGN_TOKENS.colors.primary[700]
      }
    },
    secondary: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[100],
      color: DESIGN_TOKENS.colors.neutral[700],
      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.neutral[200],
        borderColor: DESIGN_TOKENS.colors.neutral[400]
      },
      '&:active': {
        backgroundColor: DESIGN_TOKENS.colors.neutral[300],
        borderColor: DESIGN_TOKENS.colors.neutral[500]
      }
    },
    outline: {
      backgroundColor: 'transparent',
      color: DESIGN_TOKENS.colors.primary[600],
      border: `1px solid ${DESIGN_TOKENS.colors.primary[500]}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.primary[50],
        borderColor: DESIGN_TOKENS.colors.primary[600]
      },
      '&:active': {
        backgroundColor: DESIGN_TOKENS.colors.primary[100],
        borderColor: DESIGN_TOKENS.colors.primary[700]
      }
    },
    ghost: {
      backgroundColor: 'transparent',
      color: DESIGN_TOKENS.colors.primary[600],
      border: '1px solid transparent',
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.primary[50],
        color: DESIGN_TOKENS.colors.primary[700]
      },
      '&:active': {
        backgroundColor: DESIGN_TOKENS.colors.primary[100],
        color: DESIGN_TOKENS.colors.primary[800]
      }
    },
    success: {
      backgroundColor: DESIGN_TOKENS.colors.success[500],
      color: DESIGN_TOKENS.colors.neutral[0],
      border: `1px solid ${DESIGN_TOKENS.colors.success[500]}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.success[600],
        borderColor: DESIGN_TOKENS.colors.success[600]
      },
      '&:active': {
        backgroundColor: '#16a34a', // success[700] equivalent
        borderColor: '#16a34a'
      }
    },
    warning: {
      backgroundColor: DESIGN_TOKENS.colors.warning[500],
      color: DESIGN_TOKENS.colors.neutral[0],
      border: `1px solid ${DESIGN_TOKENS.colors.warning[500]}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.warning[600],
        borderColor: DESIGN_TOKENS.colors.warning[600]
      },
      '&:active': {
        backgroundColor: '#d97706', // warning[700] equivalent  
        borderColor: '#d97706'
      }
    },
    error: {
      backgroundColor: DESIGN_TOKENS.colors.error[500],
      color: DESIGN_TOKENS.colors.neutral[0],
      border: `1px solid ${DESIGN_TOKENS.colors.error[500]}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.error[600],
        borderColor: DESIGN_TOKENS.colors.error[600]
      },
      '&:active': {
        backgroundColor: '#dc2626', // error[700] equivalent
        borderColor: '#dc2626'
      }
    }
  };

  return styles[variant] || styles.primary;
};

// 📏 サイズ別スタイル計算
const getSizeStyles = (size: ModernButtonSize) => {
  return COMPONENT_STYLES.button.sizes[size];
};

// 🎮 ModernButton コンポーネント
export const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  onClick,
  children,
  className = '',
  style = {},
  ...props
}, ref) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 🎨 スタイル計算
  // フォントファミリーを文字列化
  const baseStylesRaw = COMPONENT_STYLES.button.base;
  // fontFamilyを必ずstring化してからスプレッド
  const baseStyles = {
    ...baseStylesRaw,
    fontFamily: Array.isArray(baseStylesRaw.fontFamily)
      ? baseStylesRaw.fontFamily.join(', ')
      : baseStylesRaw.fontFamily
  };
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  // 📱 イベントハンドラー
  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading) {
      setIsPressed(true);
    }
  }, [disabled, loading]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      onClick?.(event);
    }
  }, [disabled, loading, onClick]);

  // 🔧 アイコンのみボタン対応（型安全修正）
  const isIconOnly = icon && !children;

  // 🎨 最終スタイル統合
  const buttonStyle: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles,
    ...variantStyles,
    width: fullWidth ? '100%' : isIconOnly ? sizeStyles.height : 'auto', // 型安全修正
    padding: isIconOnly ? '0' : sizeStyles.padding, // アイコンのみの場合はパディングリセット
    opacity: disabled ? 0.5 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transform: isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)',
    boxShadow: isPressed 
      ? DESIGN_TOKENS.shadows.sm 
      : isHovered && !disabled && !loading
        ? DESIGN_TOKENS.shadows.md
        : DESIGN_TOKENS.shadows.xs,
    ...style
  };

  // ホバー時の背景色調整
  if (isHovered && !disabled && !loading) {
    const hoverStyles = variantStyles['&:hover'];
    if (hoverStyles) {
      Object.assign(buttonStyle, hoverStyles);
    }
  }

  // アクティブ時の背景色調整
  if (isPressed && !disabled && !loading) {
    const activeStyles = variantStyles['&:active'];
    if (activeStyles) {
      Object.assign(buttonStyle, activeStyles);
    }
  }

  return (
    <button
      ref={ref}
      style={buttonStyle}
      className={`modern-button ${className}`}
      disabled={disabled || loading}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {/* ローディングスピナー */}
      {loading && (
        <div 
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      )}

      {/* アイコン（左）または アイコンのみ */}
      {icon && (iconPosition === 'left' || isIconOnly) && !loading && (
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '1.1em' }}>
          {icon}
        </span>
      )}

      {/* テキストコンテンツ（アイコンのみの場合は表示しない） */}
      {!loading && children && (
        <span style={{ 
          whiteSpace: 'nowrap',
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
        }}>
          {children}
        </span>
      )}

      {/* アイコン（右） */}
      {icon && iconPosition === 'right' && !loading && !isIconOnly && (
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '1.1em' }}>
          {icon}
        </span>
      )}
    </button>
  );
});

ModernButton.displayName = 'ModernButton';

// 🎨 デフォルトエクスポート
export default ModernButton;

// アニメーション用CSS（グローバルに追加が必要）
const spinKeyframes = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// スタイルを動的に追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = spinKeyframes;
  if (!document.head.querySelector('style[data-modern-button]')) {
    styleElement.setAttribute('data-modern-button', 'true');
    document.head.appendChild(styleElement);
  }
}