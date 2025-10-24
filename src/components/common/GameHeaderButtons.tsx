// ショートゲームプラットフォーム - ゲームヘッダーボタンコンポーネント
// Phase 4 Week 2: 共通UI実装 - ボタン配置統一（スキップ・終了を画面上部へ）

import React, { useState } from 'react';
import { GAME_CONFIG } from '../../constants/gameConfig';
import { getCurrentViewport } from '../../utils/viewportUtils';

interface GameHeaderButtonsProps {
  /** スキップボタンの表示/非表示 */
  showSkip?: boolean;
  /** 終了ボタンの表示/非表示 */
  showExit?: boolean;
  /** 一時停止ボタンの表示/非表示 */
  showPause?: boolean;
  /** スキップボタンクリック */
  onSkip?: () => void;
  /** 終了ボタンクリック */
  onExit?: () => void;
  /** 一時停止ボタンクリック */
  onPause?: () => void;
  /** 確認ダイアログの表示/非表示 */
  confirmExit?: boolean;
  /** ゲームの一時停止状態 */
  isPaused?: boolean;
  /** カスタムボタン */
  customButtons?: Array<{
    label: string;
    icon: string;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
  }>;
  /** 位置のカスタマイズ */
  position?: {
    top?: number;
    left?: number;
    right?: number;
  };
}

export const GameHeaderButtons: React.FC<GameHeaderButtonsProps> = ({
  showSkip = true,
  showExit = true,
  showPause = false,
  onSkip,
  onExit,
  onPause,
  confirmExit = true,
  isPaused = false,
  customButtons = [],
  position = {}
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // ビューポート対応
  const viewport = getCurrentViewport();
  const scale = viewport.scale;

  // 位置計算
  const containerPosition = {
    top: (position.top ?? GAME_CONFIG.UI.SKIP_EXIT_BUTTONS.POSITION_Y) * scale,
    left: position.left ? position.left * scale : `${GAME_CONFIG.UI.SKIP_EXIT_BUTTONS.SPACING * scale}px`,
    right: position.right ? position.right * scale : undefined,
  };

  // 終了確認処理
  const handleExitClick = () => {
    if (confirmExit) {
      setShowConfirmDialog(true);
    } else {
      onExit?.();
    }
  };

  const confirmExitAction = () => {
    setShowConfirmDialog(false);
    onExit?.();
  };

  // ボタンスタイル生成
  const getButtonStyle = (
    type: string,
    baseColor: string = '#6b7280',
    isActive: boolean = false
  ): React.CSSProperties => {
    const isHovered = hoveredButton === type;
    
    return {
      height: `${GAME_CONFIG.UI.SKIP_EXIT_BUTTONS.HEIGHT * scale}px`,
      paddingLeft: `${12 * scale}px`,
      paddingRight: `${12 * scale}px`,
      backgroundColor: isActive 
        ? baseColor 
        : isHovered 
          ? `${baseColor}20` 
          : 'rgba(0, 0, 0, 0.6)',
      color: isActive || isHovered ? 'white' : '#e5e7eb',
      border: 'none',
      borderRadius: `${6 * scale}px`,
      fontSize: `${12 * scale}px`,
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: `${4 * scale}px`,
      transition: 'all 0.2s ease',
      backdropFilter: 'blur(4px)',
      boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
      transform: isHovered ? 'translateY(-1px)' : 'none',
    };
  };

  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    top: `${containerPosition.top}px`,
    left: containerPosition.right ? undefined : containerPosition.left,
    right: containerPosition.right ? `${containerPosition.right}px` : undefined,
    display: 'flex',
    alignItems: 'center',
    gap: `${GAME_CONFIG.UI.SKIP_EXIT_BUTTONS.SPACING * scale}px`,
    zIndex: 1001,
  };

  const confirmDialogStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(4px)',
  };

  const dialogContentStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: `${12 * scale}px`,
    padding: `${20 * scale}px`,
    minWidth: `${280 * scale}px`,
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  return (
    <>
      {/* メインボタンコンテナ */}
      <div style={containerStyles}>
        {/* 一時停止ボタン */}
        {showPause && (
          <button
            style={getButtonStyle('pause', '#3b82f6', isPaused)}
            onClick={onPause}
            onMouseEnter={() => setHoveredButton('pause')}
            onMouseLeave={() => setHoveredButton(null)}
            title={isPaused ? 'ゲームを再開' : 'ゲームを一時停止'}
          >
            <span style={{ fontSize: `${14 * scale}px` }}>
              {isPaused ? '▶️' : '⏸️'}
            </span>
            <span>{isPaused ? '再開' : '一時停止'}</span>
          </button>
        )}

        {/* スキップボタン */}
        {showSkip && (
          <button
            style={getButtonStyle('skip', '#f59e0b')}
            onClick={onSkip}
            onMouseEnter={() => setHoveredButton('skip')}
            onMouseLeave={() => setHoveredButton(null)}
            title="このゲームをスキップ"
          >
            <span style={{ fontSize: `${14 * scale}px` }}>⏭️</span>
            <span>スキップ</span>
          </button>
        )}

        {/* カスタムボタン */}
        {customButtons.map((button, index) => (
          <button
            key={index}
            style={{
              ...getButtonStyle(`custom-${index}`, button.color || '#6b7280'),
              opacity: button.disabled ? 0.5 : 1,
              cursor: button.disabled ? 'not-allowed' : 'pointer',
            }}
            onClick={button.disabled ? undefined : button.onClick}
            onMouseEnter={() => !button.disabled && setHoveredButton(`custom-${index}`)}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={button.disabled}
            title={button.label}
          >
            <span style={{ fontSize: `${14 * scale}px` }}>{button.icon}</span>
            <span>{button.label}</span>
          </button>
        ))}

        {/* 終了ボタン */}
        {showExit && (
          <button
            style={getButtonStyle('exit', '#ef4444')}
            onClick={handleExitClick}
            onMouseEnter={() => setHoveredButton('exit')}
            onMouseLeave={() => setHoveredButton(null)}
            title="ゲームを終了"
          >
            <span style={{ fontSize: `${14 * scale}px` }}>❌</span>
            <span>終了</span>
          </button>
        )}
      </div>

      {/* 終了確認ダイアログ */}
      {showConfirmDialog && (
        <div style={confirmDialogStyles}>
          <div style={dialogContentStyles}>
            <div style={{
              fontSize: `${18 * scale}px`,
              marginBottom: `${8 * scale}px`
            }}>
              ⚠️
            </div>
            <h3 style={{
              margin: `0 0 ${8 * scale}px 0`,
              fontSize: `${16 * scale}px`,
              color: '#374151'
            }}>
              ゲームを終了しますか？
            </h3>
            <p style={{
              margin: `0 0 ${20 * scale}px 0`,
              fontSize: `${14 * scale}px`,
              color: '#6b7280',
              lineHeight: 1.5
            }}>
              進行中のゲームは失われ、<br/>
              最初に戻ります。
            </p>
            
            <div style={{
              display: 'flex',
              gap: `${12 * scale}px`,
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  padding: `${8 * scale}px ${16 * scale}px`,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: `${6 * scale}px`,
                  fontSize: `${14 * scale}px`,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmExitAction}
                style={{
                  padding: `${8 * scale}px ${16 * scale}px`,
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: `${6 * scale}px`,
                  fontSize: `${14 * scale}px`,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// プリセット：基本的なゲーム用ヘッダー
export const BasicGameHeader: React.FC<{
  onSkip?: () => void;
  onExit?: () => void;
}> = ({ onSkip, onExit }) => {
  return (
    <GameHeaderButtons
      showSkip={true}
      showExit={true}
      showPause={false}
      onSkip={onSkip}
      onExit={onExit}
      confirmExit={true}
    />
  );
};

// プリセット：一時停止可能なゲーム用ヘッダー
export const PausableGameHeader: React.FC<{
  onSkip?: () => void;
  onExit?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
}> = ({ onSkip, onExit, onPause, isPaused }) => {
  return (
    <GameHeaderButtons
      showSkip={true}
      showExit={true}
      showPause={true}
      onSkip={onSkip}
      onExit={onExit}
      onPause={onPause}
      isPaused={isPaused}
      confirmExit={true}
    />
  );
};

// プリセット：シンプル版（終了のみ）
export const SimpleGameHeader: React.FC<{
  onExit?: () => void;
  confirmExit?: boolean;
}> = ({ onExit, confirmExit = false }) => {
  return (
    <GameHeaderButtons
      showSkip={false}
      showExit={true}
      showPause={false}
      onExit={onExit}
      confirmExit={confirmExit}
    />
  );
};

export default GameHeaderButtons;