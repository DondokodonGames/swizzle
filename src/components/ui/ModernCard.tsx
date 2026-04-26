/**
 * モダンアプリケーション風カードコンポーネント
 * Phase 1-B: 基本UI・ファイル管理改善用
 */

import React, { HTMLAttributes, forwardRef, useState, useCallback } from 'react';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

// 🎯 カードバリアント
export type ModernCardVariant = 
  | 'default'      // 標準カード
  | 'elevated'     // エレベーション付き
  | 'outlined'     // アウトライン
  | 'filled'       // 塗りつぶし
  | 'interactive'; // インタラクティブ（クリック可能）

// 📏 カードサイズ
export type ModernCardSize = 'sm' | 'md' | 'lg' | 'xl';

// ✨ カードProps
export interface ModernCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'size'> {
  variant?: ModernCardVariant;
  size?: ModernCardSize;
  clickable?: boolean;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onCardClick?: () => void;
}

// 🎨 バリアント別スタイル計算
const getVariantStyles = (variant: ModernCardVariant) => {
  const styles = {
    default: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: DESIGN_TOKENS.colors.neutral[200],
      boxShadow: 'none'
    },
    elevated: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderWidth: '0',
      borderStyle: 'none',
      borderColor: 'transparent',
      boxShadow: DESIGN_TOKENS.shadows.md
    },
    outlined: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: DESIGN_TOKENS.colors.neutral[300],
      boxShadow: 'none'
    },
    filled: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[50],
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: DESIGN_TOKENS.colors.neutral[200],
      boxShadow: 'none'
    },
    interactive: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: DESIGN_TOKENS.colors.neutral[200],
      boxShadow: DESIGN_TOKENS.shadows.sm,
      cursor: 'pointer',
      '&:hover': {
        boxShadow: DESIGN_TOKENS.shadows.lg,
        transform: 'translateY(-2px)',
        borderColor: DESIGN_TOKENS.colors.primary[300]
      },
      '&:active': {
        transform: 'translateY(-1px)',
        boxShadow: DESIGN_TOKENS.shadows.md
      }
    }
  };

  return styles[variant] || styles.default;
};

// 📏 サイズ別スタイル計算
const getSizeStyles = (size: ModernCardSize) => {
  const styles = {
    sm: {
      padding: DESIGN_TOKENS.spacing[3],
      borderRadius: DESIGN_TOKENS.borderRadius.md
    },
    md: {
      padding: DESIGN_TOKENS.spacing[4],
      borderRadius: DESIGN_TOKENS.borderRadius.lg
    },
    lg: {
      padding: DESIGN_TOKENS.spacing[6],
      borderRadius: DESIGN_TOKENS.borderRadius.lg
    },
    xl: {
      padding: DESIGN_TOKENS.spacing[8],
      borderRadius: DESIGN_TOKENS.borderRadius.xl
    }
  };

  return styles[size] || styles.md;
};

// 🎮 ModernCard コンポーネント
export const ModernCard = forwardRef<HTMLDivElement, ModernCardProps>(({
  variant = 'default',
  size = 'md',
  clickable = false,
  loading = false,
  disabled = false,
  onCardClick,
  children,
  className = '',
  style = {},
  ...props
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // 自動でvariantを設定（clickable=trueまたはonCardClickが指定されている場合）
  const effectiveVariant = (clickable || onCardClick) && variant === 'default' 
    ? 'interactive' 
    : variant;

  // 🎨 スタイル計算
  const variantStyles = getVariantStyles(effectiveVariant);
  const sizeStyles = getSizeStyles(size);

  // 📱 イベントハンドラー
  const handleMouseEnter = useCallback(() => {
    if (!disabled && !loading) {
      setIsHovered(true);
    }
  }, [disabled, loading]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading && (clickable || onCardClick)) {
      setIsPressed(true);
    }
  }, [disabled, loading, clickable, onCardClick]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !loading && onCardClick) {
      onCardClick();
    }
  }, [disabled, loading, onCardClick]);

  // 🎨 最終スタイル統合
  const cardStyle: React.CSSProperties = {
    ...variantStyles,
    ...sizeStyles,
    position: 'relative',
    overflow: 'hidden',
    transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
    opacity: disabled ? 0.5 : 1,
    ...style
  };

  // ホバー・アクティブ状態の適用
  if (effectiveVariant === 'interactive' && !disabled && !loading) {
    if (isPressed) {
      cardStyle.transform = 'translateY(-1px)';
      cardStyle.boxShadow = DESIGN_TOKENS.shadows.md;
    } else if (isHovered) {
      cardStyle.transform = 'translateY(-2px)';
      cardStyle.boxShadow = DESIGN_TOKENS.shadows.lg;
      cardStyle.borderColor = DESIGN_TOKENS.colors.primary[300];
    }
  }

  // クリック可能な場合のカーソル設定
  if ((clickable || onCardClick) && !disabled && !loading) {
    cardStyle.cursor = 'pointer';
  }

  return (
    <div
      ref={ref}
      style={cardStyle}
      className={`modern-card ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick && !disabled ? 0 : undefined}
      {...props}
    >
      {/* ローディングオーバーレイ */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex[10],
            borderRadius: 'inherit'
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid transparent',
              borderTop: `2px solid ${DESIGN_TOKENS.colors.primary[500]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        </div>
      )}

      {/* メインコンテンツ */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* インタラクティブなカードの場合のホバーインディケーター */}
      {effectiveVariant === 'interactive' && !disabled && !loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${DESIGN_TOKENS.colors.primary[500]}08, transparent)`,
            opacity: isHovered ? 1 : 0,
            transition: `opacity ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
            pointerEvents: 'none',
            borderRadius: 'inherit'
          }}
        />
      )}
    </div>
  );
});

ModernCard.displayName = 'ModernCard';

// 🎯 特殊用途のカードコンポーネント

// プロジェクトカード（ProjectSelector用）
export const ProjectCard = forwardRef<HTMLDivElement, ModernCardProps & {
  thumbnail?: string;
  title: string;
  description?: string;
  stats?: { objects: number; sounds: number; rules: number };
  status?: 'draft' | 'published' | 'testing';
  lastModified?: string;
}>(({
  thumbnail,
  title,
  description,
  stats,
  status,
  lastModified,
  children,
  ...props
}, ref) => {
  const statusColors = {
    draft: DESIGN_TOKENS.colors.neutral[500],
    published: DESIGN_TOKENS.colors.success[500],
    testing: DESIGN_TOKENS.colors.warning[500]
  };

  const statusLabels = {
    draft: '下書き',
    published: '公開済み',
    testing: 'テスト中'
  };

  return (
    <ModernCard
      ref={ref}
      variant="interactive"
      size="md"
      {...props}
    >
      {/* サムネイル */}
      <div
        style={{
          width: '100%',
          height: '120px',
          backgroundColor: thumbnail ? 'transparent' : DESIGN_TOKENS.colors.neutral[100],
          borderRadius: DESIGN_TOKENS.borderRadius.md,
          marginBottom: DESIGN_TOKENS.spacing[3],
          backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!thumbnail && (
          <span style={{ 
            fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
            color: DESIGN_TOKENS.colors.neutral[400]
          }}>
            🎮
          </span>
        )}
        
        {/* ステータスバッジ */}
        {status && (
          <div
            style={{
              position: 'absolute',
              top: DESIGN_TOKENS.spacing[2],
              right: DESIGN_TOKENS.spacing[2],
              padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
              backgroundColor: statusColors[status],
              color: DESIGN_TOKENS.colors.neutral[0],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
            }}
          >
            {statusLabels[status]}
          </div>
        )}
      </div>

      {/* タイトル */}
      <h3
        style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`,
          lineHeight: DESIGN_TOKENS.typography.lineHeight.tight
        }}
      >
        {title}
      </h3>

      {/* 説明 */}
      {description && (
        <p
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.neutral[600],
            margin: `0 0 ${DESIGN_TOKENS.spacing[3]} 0`,
            lineHeight: DESIGN_TOKENS.typography.lineHeight.normal
          }}
        >
          {description}
        </p>
      )}

      {/* 統計情報 */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: DESIGN_TOKENS.spacing[2],
            marginBottom: DESIGN_TOKENS.spacing[3]
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[800]
              }}
            >
              {stats.objects}
            </div>
            <div
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[500]
              }}
            >
              オブジェクト
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[800]
              }}
            >
              {stats.sounds}
            </div>
            <div
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[500]
              }}
            >
              音声
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[800]
              }}
            >
              {stats.rules}
            </div>
            <div
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[500]
              }}
            >
              ルール
            </div>
          </div>
        </div>
      )}

      {/* 最終更新日時 */}
      {lastModified && (
        <div
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[500]
          }}
        >
          最終更新: {new Date(lastModified).toLocaleDateString('ja-JP')}
        </div>
      )}

      {/* カスタム子要素 */}
      {children}
    </ModernCard>
  );
});

ProjectCard.displayName = 'ProjectCard';

// 🎨 デフォルトエクスポート
export default ModernCard;