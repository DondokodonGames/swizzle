// ショートゲームプラットフォーム - ゲームUI統合システム
// Phase 4 Week 2: 共通UI実装 - 全コンポーネント統合（クリーン版）

import React, { useRef, useState, useEffect } from 'react';

// 音量設定の型定義
interface VolumeSettings {
  bgm: number;
  se: number;
  master: number;
  muted: boolean;
}

interface GameUISystemProps {
  /** ゲーム時間管理 */
  gameTime?: {
    currentTime: number;
    totalTime: number;
    showNumbers?: boolean;
  };
  
  /** ヘッダーボタン設定 */
  headerButtons?: {
    showSkip?: boolean;
    showExit?: boolean;
    showPause?: boolean;
    onSkip?: () => void;
    onExit?: () => void;
    onPause?: () => void;
    isPaused?: boolean;
    customButtons?: Array<{
      label: string;
      icon: string;
      onClick: () => void;
      color?: string;
    }>;
  };
  
  /** 音量設定 */
  volume?: {
    enabled?: boolean;
    simpleMode?: boolean;
    onVolumeChange?: (settings: VolumeSettings) => void;
  };
  
  /** タッチエフェクト設定 */
  touchEffects?: {
    enabled?: boolean;
    type?: 'tap' | 'success' | 'error' | 'splash';
    color?: string;
  };
  
  /** 全体設定 */
  settings?: {
    theme?: 'light' | 'dark' | 'game';
    disabled?: boolean;
  };
  
  /** 子コンポーネント */
  children?: React.ReactNode;
}

export const GameUISystem: React.FC<GameUISystemProps> = ({
  gameTime,
  headerButtons = {},
  volume = { enabled: true },
  touchEffects = { enabled: true },
  settings = {},
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [uiVisible, setUiVisible] = useState(true);

  // UI表示制御（デバッグ用）
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // U キーでUI表示切り替え（開発時のみ）
      if (event.key === 'u' && process.env.NODE_ENV === 'development') {
        setUiVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // 無効化されている場合は子要素のみ表示
  if (settings.disabled) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
        className={`game-ui-system ${settings.theme || 'game'}`}
      >
        {/* メインコンテンツ */}
        {children}

        {/* UI レイヤー（表示/非表示制御） */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: uiVisible ? 'auto' : 'none',
            opacity: uiVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 1000
          }}
          className="game-ui-overlay"
        >
          {/* デバッグ情報（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              position: 'fixed',
              bottom: '60px',
              left: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              zIndex: 9999,
              fontFamily: 'monospace'
            }}>
              Week 2 UI: {uiVisible ? 'ON' : 'OFF'} | Press 'U' to toggle
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// プリセット：完全版ゲームUI（簡素化版）
export const FullGameUI: React.FC<{
  currentTime: number;
  totalTime: number;
  onSkip?: () => void;
  onExit?: () => void;
  onVolumeChange?: (settings: VolumeSettings) => void;
  children?: React.ReactNode;
}> = ({ currentTime, totalTime, onSkip, onExit, onVolumeChange, children }) => {
  return (
    <GameUISystem
      gameTime={{
        currentTime,
        totalTime,
        showNumbers: false
      }}
      headerButtons={{
        showSkip: true,
        showExit: true,
        onSkip,
        onExit
      }}
      volume={{
        enabled: true,
        onVolumeChange
      }}
      touchEffects={{
        enabled: true,
        type: 'tap'
      }}
    >
      {children}
    </GameUISystem>
  );
};

// プリセット：シンプル版ゲームUI
export const SimpleGameUI: React.FC<{
  currentTime?: number;
  totalTime?: number;
  onExit?: () => void;
  children?: React.ReactNode;
}> = ({ currentTime, totalTime, onExit, children }) => {
  return (
    <GameUISystem
      gameTime={currentTime && totalTime ? {
        currentTime,
        totalTime,
        showNumbers: true
      } : undefined}
      headerButtons={{
        showSkip: false,
        showExit: true,
        showPause: false,
        onExit
      }}
      volume={{
        enabled: true,
        simpleMode: true
      }}
      touchEffects={{
        enabled: true
      }}
    >
      {children}
    </GameUISystem>
  );
};

// デバッグ・プレビュー用コンポーネント（簡素化版）
export const GameUIPreview: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(10);
  const [isPaused, setIsPaused] = useState(false);
  const totalTime = 10;

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev <= 0) return 10; // リセット
          return prev - 0.1;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const handleSkip = () => {
    console.log('Skip clicked');
    setCurrentTime(0);
  };

  const handleExit = () => {
    console.log('Exit clicked');
    setCurrentTime(10);
  };

  const handleVolumeChange = (settings: VolumeSettings) => {
    console.log('Volume changed:', settings);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <SimpleGameUI
        currentTime={currentTime}
        totalTime={totalTime}
        onExit={handleExit}
      >
        {/* ゲームコンテンツのサンプル */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '20px' }}>
            🎮 Game UI System Preview
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '30px' }}>
            Week 2実装：基本UI統合システムのデモです。
          </p>
          <div style={{ marginBottom: '20px' }}>
            <div>残り時間: {currentTime.toFixed(1)}秒</div>
            <div>状態: {isPaused ? '一時停止中' : '実行中'}</div>
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setIsPaused(!isPaused)}
              style={{
                padding: '10px 20px',
                backgroundColor: isPaused ? '#10b981' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isPaused ? '▶️ 再開' : '⏸️ 一時停止'}
            </button>
            <button
              onClick={() => setCurrentTime(5)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              ⏱️ 5秒設定
            </button>
            <button
              onClick={handleSkip}
              style={{
                padding: '10px 20px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              ⏭️ スキップテスト
            </button>
          </div>
          <div style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#9ca3af'
          }}>
            💡 Phase 4 Week 2: UI統合システム基盤完成<br/>
            個別コンポーネントは分離実装・後日統合予定
          </div>
        </div>
      </SimpleGameUI>
    </div>
  );
};

export default GameUISystem;