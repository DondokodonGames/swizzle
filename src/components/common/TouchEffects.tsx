// ショートゲームプラットフォーム - タッチエフェクトコンポーネント
// Phase 4 Week 2: 共通UI実装 - タッチエフェクト追加（修正版）

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentViewport } from '../../utils/viewportUtils';

interface TouchEffect {
  id: string;
  x: number;
  y: number;
  timestamp: number;
  type: 'tap' | 'success' | 'error' | 'splash';
  color?: string;
}

interface TouchEffectsProps {
  /** エフェクトを適用するコンテナの参照 */
  containerRef?: React.RefObject<HTMLElement>;
  /** エフェクトのタイプ */
  defaultEffectType?: TouchEffect['type'];
  /** エフェクトの色 */
  defaultColor?: string;
  /** エフェクトの継続時間（ms） */
  duration?: number;
  /** 最大同時表示エフェクト数 */
  maxEffects?: number;
  /** 無効化フラグ */
  disabled?: boolean;
}

export const TouchEffects: React.FC<TouchEffectsProps> = ({
  containerRef,
  defaultEffectType = 'tap',
  defaultColor = '#10b981',
  duration = 800,
  maxEffects = 10,
  disabled = false
}) => {
  const [effects, setEffects] = useState<TouchEffect[]>([]);
  const effectIdRef = useRef(0);
  const viewport = getCurrentViewport();
  const scale = viewport.scale;

  // エフェクト作成
  const createEffect = useCallback((
    x: number,
    y: number,
    type: TouchEffect['type'] = defaultEffectType,
    color?: string
  ) => {
    if (disabled) return;

    const id = `effect-${++effectIdRef.current}`;
    const newEffect: TouchEffect = {
      id,
      x,
      y,
      timestamp: Date.now(),
      type,
      color: color || defaultColor
    };

    setEffects(prev => {
      const updated = [...prev, newEffect];
      // 最大数を超えた場合は古いものを削除
      if (updated.length > maxEffects) {
        return updated.slice(-maxEffects);
      }
      return updated;
    });

    // 指定時間後に自動削除
    setTimeout(() => {
      setEffects(prev => prev.filter(effect => effect.id !== id));
    }, duration);
  }, [disabled, defaultEffectType, defaultColor, duration, maxEffects]);

  // タッチ・クリックイベントの監視
  useEffect(() => {
    const container = containerRef?.current || document.body;
    
    const handlePointerEvent = (event: PointerEvent | MouseEvent | TouchEvent) => {
      if (disabled) return;

      let clientX: number, clientY: number;

      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        return;
      }

      // コンテナ相対座標に変換
      const containerRect = container.getBoundingClientRect();
      const x = clientX - containerRect.left;
      const y = clientY - containerRect.top;

      createEffect(x, y, defaultEffectType);
    };

    // イベントリスナー登録
    container.addEventListener('pointerdown', handlePointerEvent, { passive: true });
    container.addEventListener('touchstart', handlePointerEvent, { passive: true });
    container.addEventListener('mousedown', handlePointerEvent, { passive: true });

    return () => {
      container.removeEventListener('pointerdown', handlePointerEvent);
      container.removeEventListener('touchstart', handlePointerEvent);
      container.removeEventListener('mousedown', handlePointerEvent);
    };
  }, [containerRef, disabled, defaultEffectType, createEffect]);

  // エフェクトスタイル生成
  const getEffectStyle = (effect: TouchEffect): React.CSSProperties => {
    const size = 40 * scale;
    const age = Date.now() - effect.timestamp;
    const progress = Math.min(age / duration, 1);

    // タイプ別のアニメーション設定
    const animations = {
      tap: {
        transform: `translate(-50%, -50%) scale(${1 - progress * 0.5})`,
        opacity: Math.max(0, 1 - progress * 1.5),
        borderRadius: '50%',
        border: `${2 * scale}px solid ${effect.color || defaultColor}`,
        backgroundColor: 'transparent'
      },
      success: {
        transform: `translate(-50%, -50%) scale(${0.5 + progress * 0.5})`,
        opacity: Math.max(0, 1 - progress * 1.2),
        borderRadius: '50%',
        backgroundColor: `${effect.color || '#10b981'}40`,
        border: `${2 * scale}px solid ${effect.color || '#10b981'}`,
        boxShadow: `0 0 ${20 * scale}px ${effect.color || '#10b981'}40`
      },
      error: {
        transform: `translate(-50%, -50%) scale(${1 + Math.sin(progress * Math.PI * 4) * 0.1})`,
        opacity: Math.max(0, 1 - progress * 1.5),
        borderRadius: '50%',
        backgroundColor: `${effect.color || '#ef4444'}40`,
        border: `${2 * scale}px solid ${effect.color || '#ef4444'}`,
        boxShadow: `0 0 ${15 * scale}px ${effect.color || '#ef4444'}60`
      },
      splash: {
        transform: `translate(-50%, -50%) scale(${progress * 2})`,
        opacity: Math.max(0, 1 - progress * 2),
        borderRadius: `${50 - progress * 30}%`,
        backgroundColor: `${effect.color || '#3b82f6'}${Math.round((1 - progress) * 60).toString(16).padStart(2, '0')}`,
        border: 'none'
      }
    };

    return {
      position: 'absolute',
      left: `${effect.x}px`,
      top: `${effect.y}px`,
      width: `${size}px`,
      height: `${size}px`,
      pointerEvents: 'none',
      zIndex: 9999,
      ...animations[effect.type]
    };
  };

  // エフェクトコンテナのスタイル
  const containerStyle: React.CSSProperties = {
    position: containerRef ? 'absolute' : 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 9999,
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} className="touch-effects-container">
      {effects.map(effect => (
        <div
          key={effect.id}
          style={getEffectStyle(effect)}
          className={`touch-effect touch-effect-${effect.type}`}
        />
      ))}
    </div>
  );
};

// ゲーム用プリセット
export const GameTouchEffects: React.FC<{
  containerRef?: React.RefObject<HTMLElement>;
  disabled?: boolean;
}> = ({ containerRef, disabled }) => {
  return (
    <TouchEffects
      containerRef={containerRef}
      defaultEffectType="tap"
      defaultColor="#10b981"
      duration={600}
      maxEffects={8}
      disabled={disabled}
    />
  );
};

// 成功時専用エフェクト
export const SuccessTouchEffects: React.FC<{
  containerRef?: React.RefObject<HTMLElement>;
}> = ({ containerRef }) => {
  return (
    <TouchEffects
      containerRef={containerRef}
      defaultEffectType="success"
      defaultColor="#10b981"
      duration={1000}
      maxEffects={5}
    />
  );
};

// エラー時専用エフェクト
export const ErrorTouchEffects: React.FC<{
  containerRef?: React.RefObject<HTMLElement>;
}> = ({ containerRef }) => {
  return (
    <TouchEffects
      containerRef={containerRef}
      defaultEffectType="error"
      defaultColor="#ef4444"
      duration={800}
      maxEffects={3}
    />
  );
};

export default TouchEffects;