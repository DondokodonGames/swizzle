// ショートゲームプラットフォーム - 統一タイマーバーコンポーネント
// Phase 4 Week 2: 共通UI実装 - 残り時間バー表示

import React, { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../constants/gameConfig';
import { getCurrentViewport } from '../../utils/viewportUtils';

interface TimerBarProps {
  /** 現在の残り時間（秒） */
  currentTime: number;
  /** 総時間（秒） */
  totalTime: number;
  /** バーの色設定（オプション） */
  colors?: {
    background?: string;
    fill?: string;
    warning?: string;  // 残り30%以下
    danger?: string;   // 残り10%以下
  };
  /** アニメーション有効/無効 */
  animated?: boolean;
  /** 数字表示の有効/無効 */
  showNumbers?: boolean;
  /** カスタムスタイル */
  style?: React.CSSProperties;
}

export const TimerBar: React.FC<TimerBarProps> = ({
  currentTime,
  totalTime,
  colors = {},
  animated = true,
  showNumbers = false,
  style = {}
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  
  // 進行率計算（0-1）
  const progress = Math.max(0, Math.min(1, currentTime / totalTime));
  const progressPercent = Math.round(progress * 100);
  
  // 色設定（デフォルト値）
  const colorConfig = {
    background: colors.background || 'rgba(0, 0, 0, 0.2)',
    fill: colors.fill || '#10b981',
    warning: colors.warning || '#f59e0b', 
    danger: colors.danger || '#ef4444',
  };
  
  // 進行状況に応じた色選択
  const getCurrentColor = () => {
    if (progress <= 0.1) return colorConfig.danger;   // 10%以下は赤
    if (progress <= 0.3) return colorConfig.warning;  // 30%以下は黄
    return colorConfig.fill;                          // それ以上は緑
  };
  
  const currentColor = getCurrentColor();

  // ビューポート対応の位置・サイズ計算
  const viewport = getCurrentViewport();
  const scale = viewport.scale;
  
  const timerBarStyles: React.CSSProperties = {
    position: 'fixed',
    left: `${GAME_CONFIG.UI.TIMER_BAR.MARGIN * scale}px`,
    bottom: `${(20) * scale}px`, // 画面下端から20px
    width: `calc(100vw - ${GAME_CONFIG.UI.TIMER_BAR.MARGIN * 2 * scale}px)`,
    maxWidth: `${(GAME_CONFIG.VIEWPORT.WIDTH - GAME_CONFIG.UI.TIMER_BAR.MARGIN * 2) * scale}px`,
    height: `${GAME_CONFIG.UI.TIMER_BAR.HEIGHT * scale}px`,
    backgroundColor: colorConfig.background,
    borderRadius: `${GAME_CONFIG.UI.TIMER_BAR.HEIGHT * scale / 2}px`,
    overflow: 'hidden',
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    ...style
  };
  
  const fillStyles: React.CSSProperties = {
    height: '100%',
    width: `${progressPercent}%`,
    backgroundColor: currentColor,
    borderRadius: `${GAME_CONFIG.UI.TIMER_BAR.HEIGHT * scale / 2}px`,
    transition: animated ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    position: 'relative',
    overflow: 'hidden'
  };
  
  // パルスアニメーション（危険時）
  const shouldPulse = progress <= 0.1 && animated;
  
  useEffect(() => {
    if (shouldPulse && fillRef.current) {
      fillRef.current.style.animation = 'pulse 0.8s ease-in-out infinite alternate';
    } else if (fillRef.current) {
      fillRef.current.style.animation = 'none';
    }
  }, [shouldPulse]);

  return (
    <>
      {/* CSS Keyframes for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.8; transform: scaleY(1); }
            100% { opacity: 1; transform: scaleY(1.1); }
          }
          
          .timer-bar-glow {
            position: relative;
          }
          
          .timer-bar-glow::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(90deg, transparent, ${currentColor}40, transparent);
            border-radius: inherit;
            opacity: ${progress <= 0.3 ? '1' : '0'};
            transition: opacity 0.3s ease;
          }
          
          .timer-number {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
          }
        `}
      </style>
      
      {/* メインタイマーバー */}
      <div 
        ref={barRef}
        style={timerBarStyles}
        className="timer-bar-container"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`残り時間 ${currentTime}秒 / ${totalTime}秒`}
      >
        <div 
          ref={fillRef}
          style={fillStyles}
          className={shouldPulse ? "timer-bar-glow" : ""}
        >
          {/* グラデーションオーバーレイ */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, 
              ${currentColor}00 0%, 
              ${currentColor}40 50%, 
              ${currentColor}80 100%)`,
            borderRadius: 'inherit'
          }} />
        </div>
        
        {/* 数字表示 */}
        {showNumbers && (
          <div style={{
            position: 'absolute',
            right: `${8 * scale}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            color: progress > 0.5 ? '#ffffff' : '#374151',
            fontSize: `${10 * scale}px`,
            fontWeight: '600',
            textShadow: progress > 0.5 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            pointerEvents: 'none'
          }}
          className="timer-number"
          >
            {Math.ceil(currentTime)}s
          </div>
        )}
      </div>
    </>
  );
};

// 使用例・プリセット
export const GameTimerBar: React.FC<{
  currentTime: number;
  totalTime: number;
  showNumbers?: boolean;
}> = ({ currentTime, totalTime, showNumbers = false }) => {
  return (
    <TimerBar
      currentTime={currentTime}
      totalTime={totalTime}
      showNumbers={showNumbers}
      animated={true}
      colors={{
        background: 'rgba(0, 0, 0, 0.15)',
        fill: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      }}
    />
  );
};

// デバッグ用プレビューコンポーネント
export const TimerBarPreview: React.FC = () => {
  const [time, setTime] = React.useState(10);
  const totalTime = 10;
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        if (prev <= 0) return 10; // リセット
        return prev - 0.1;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div style={{ 
      position: 'relative',
      height: '100vh',
      background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h2>Timer Bar Preview</h2>
      <div>現在時間: {time.toFixed(1)}秒 / {totalTime}秒</div>
      
      {/* 通常版 */}
      <GameTimerBar 
        currentTime={time} 
        totalTime={totalTime}
        showNumbers={false}
      />
      
      {/* 数字表示版 */}
      <TimerBar
        currentTime={time}
        totalTime={totalTime}
        showNumbers={true}
        style={{ bottom: '80px' }}
      />
    </div>
  );
};

export default TimerBar;