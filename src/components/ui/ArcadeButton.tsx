// src/components/ui/ArcadeButton.tsx
import React, { ButtonHTMLAttributes, forwardRef, useState, useCallback } from 'react';
import { useGameTheme } from './GameThemeProvider';

// 🎮 ボタンバリアント定義
export type ButtonVariant = 
  | 'primary'      // メインアクション
  | 'secondary'    // セカンダリアクション
  | 'success'      // 成功・完了
  | 'warning'      // 警告・注意
  | 'error'        // エラー・削除
  | 'ghost'        // 透明背景
  | 'outline'      // アウトライン
  | 'gradient';    // グラデーション

// 📏 ボタンサイズ定義
export type ButtonSize = 
  | 'xs'     // 20px height
  | 'sm'     // 32px height
  | 'md'     // 40px height
  | 'lg'     // 48px height
  | 'xl'     // 56px height
  | 'xxl';   // 64px height

// ⚡ エフェクト定義
export interface ButtonEffects {
  glow?: boolean;           // グロー効果
  pulse?: boolean;          // パルス効果
  shake?: boolean;          // シェイク効果
  bounce?: boolean;         // バウンス効果
  ripple?: boolean;         // リップル効果
  sound?: boolean;          // サウンド効果
  particles?: boolean;      // パーティクル効果
}

// 🎨 ArcadeButton Props
export interface ArcadeButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  effects?: ButtonEffects;
  children: React.ReactNode;
}

// 🎯 バリアント別スタイル定義
const getVariantStyles = (variant: ButtonVariant, colors: any) => {
  const styles = {
    primary: {
      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
      color: colors.text,
      border: `2px solid ${colors.primary}`,
      boxShadow: `0 4px 12px ${colors.primary}40, inset 0 1px 0 rgba(255,255,255,0.2)`
    },
    secondary: {
      background: colors.surface,
      color: colors.text,
      border: `2px solid ${colors.border}`,
      boxShadow: `0 2px 8px ${colors.border}30`
    },
    success: {
      background: `linear-gradient(135deg, ${colors.success}, #059669)`,
      color: '#FFFFFF',
      border: `2px solid ${colors.success}`,
      boxShadow: `0 4px 12px ${colors.success}40`
    },
    warning: {
      background: `linear-gradient(135deg, ${colors.warning}, #D97706)`,
      color: '#FFFFFF',
      border: `2px solid ${colors.warning}`,
      boxShadow: `0 4px 12px ${colors.warning}40`
    },
    error: {
      background: `linear-gradient(135deg, ${colors.error}, #DC2626)`,
      color: '#FFFFFF',
      border: `2px solid ${colors.error}`,
      boxShadow: `0 4px 12px ${colors.error}40`
    },
    ghost: {
      background: 'transparent',
      color: colors.primary,
      border: '2px solid transparent',
      boxShadow: 'none'
    },
    outline: {
      background: 'transparent',
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      boxShadow: 'none'
    },
    gradient: {
      background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})`,
      color: colors.text,
      border: 'none',
      boxShadow: `0 6px 16px ${colors.primary}30`
    }
  };

  return styles[variant] || styles.primary;
};

// 📏 サイズ別スタイル定義
const getSizeStyles = (size: ButtonSize) => {
  const styles = {
    xs: {
      height: '20px',
      padding: '0 8px',
      fontSize: '10px',
      fontWeight: '500',
      borderRadius: '4px'
    },
    sm: {
      height: '32px',
      padding: '0 12px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '6px'
    },
    md: {
      height: '40px',
      padding: '0 16px',
      fontSize: '14px',
      fontWeight: '600',
      borderRadius: '8px'
    },
    lg: {
      height: '48px',
      padding: '0 20px',
      fontSize: '16px',
      fontWeight: '700',
      borderRadius: '10px'
    },
    xl: {
      height: '56px',
      padding: '0 24px',
      fontSize: '18px',
      fontWeight: '700',
      borderRadius: '12px'
    },
    xxl: {
      height: '64px',
      padding: '0 32px',
      fontSize: '20px',
      fontWeight: '800',
      borderRadius: '16px'
    }
  };

  return styles[size] || styles.md;
};

// ⚡ エフェクト用CSS classes
const getEffectClasses = (effects: ButtonEffects, isActive: boolean) => {
  const classes = [];

  if (effects.glow) {
    classes.push('arcade-glow');
  }
  if (effects.pulse) {
    classes.push('arcade-pulse');
  }
  if (effects.shake && isActive) {
    classes.push('arcade-shake');
  }
  if (effects.bounce && isActive) {
    classes.push('arcade-bounce');
  }
  if (effects.ripple) {
    classes.push('arcade-ripple');
  }

  return classes.join(' ');
};

// 🎮 ArcadeButton コンポーネント
export const ArcadeButton = forwardRef<HTMLButtonElement, ArcadeButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  effects = {},
  disabled,
  onClick,
  children,
  className = '',
  style = {},
  ...props
}, ref) => {
  const { currentTheme } = useGameTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 🎨 スタイル計算
  const variantStyles = getVariantStyles(variant, currentTheme.colors);
  const sizeStyles = getSizeStyles(size);
  const effectClasses = getEffectClasses(effects, isPressed);

  // 🔊 効果音再生（将来実装）
  const playSound = useCallback(() => {
    if (effects.sound) {
      // サウンド効果の実装（Web Audio API使用予定）
      console.log('🔊 Button sound effect');
    }
  }, [effects.sound]);

  // 🎉 リップル効果（将来実装）
  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (effects.ripple && !disabled && !loading) {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      
      console.log('🌊 Ripple effect at:', { x, y, size });
    }
  }, [effects.ripple, disabled, loading]);

  // 📱 イベントハンドラー
  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading) {
      setIsPressed(true);
      playSound();
    }
  }, [disabled, loading, playSound]);

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
      createRipple(event);
      onClick?.(event);
    }
  }, [disabled, loading, createRipple, onClick]);

  // 🎨 最終スタイル統合
  const buttonStyle: React.CSSProperties = {
    ...variantStyles,
    ...sizeStyles,
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: icon ? '8px' : '0',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    textDecoration: 'none',
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style
  };

  // ホバー時のエフェクト
  if (isHovered && !disabled && !loading) {
    if (variant === 'ghost') {
      buttonStyle.background = `${currentTheme.colors.primary}10`;
    } else if (variant === 'outline') {
      buttonStyle.background = `${currentTheme.colors.primary}10`;
    } else {
      buttonStyle.filter = 'brightness(1.1)';
      buttonStyle.transform = 'translateY(-1px) scale(1.02)';
    }
  }

  // 🎮 フォーカススタイル
  const focusStyle = {
    boxShadow: `${variantStyles.boxShadow}, 0 0 0 3px ${currentTheme.colors.primary}40`
  };

  return (
    <button
      ref={ref}
      style={buttonStyle}
      className={`arcade-button ${effectClasses} ${className}`}
      disabled={disabled || loading}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = focusStyle.boxShadow;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = variantStyles.boxShadow || '';
      }}
      {...props}
    >
      {/* ローディングスピナー */}
      {loading && (
        <div 
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: `2px solid ${currentTheme.colors.text}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      )}

      {/* アイコン（左） */}
      {icon && iconPosition === 'left' && !loading && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}

      {/* テキストコンテンツ */}
      {!loading && (
        <span style={{ whiteSpace: 'nowrap' }}>
          {children}
        </span>
      )}

      {/* アイコン（右） */}
      {icon && iconPosition === 'right' && !loading && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}

      {/* パーティクルエフェクト（将来実装） */}
      {effects.particles && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: 'inherit'
          }}
        >
          {/* パーティクルアニメーション */}
        </div>
      )}
    </button>
  );
});

ArcadeButton.displayName = 'ArcadeButton';

// 🎨 デフォルトエクスポート
export default ArcadeButton;