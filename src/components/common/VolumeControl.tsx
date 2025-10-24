// ショートゲームプラットフォーム - 音量コントロールコンポーネント
// Phase 4 Week 2: 共通UI実装 - BGM・SE音量設定

import React, { useState, useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../constants/gameConfig';
import { getCurrentViewport } from '../../utils/viewportUtils';

interface VolumeSettings {
  bgm: number;    // 0-1
  se: number;     // 0-1
  master: number; // 0-1
  muted: boolean;
}

interface VolumeControlProps {
  /** 初期音量設定 */
  initialVolume?: Partial<VolumeSettings>;
  /** 音量変更コールバック */
  onVolumeChange?: (settings: VolumeSettings) => void;
  /** 簡易モード（マスター音量のみ） */
  simpleMode?: boolean;
  /** 表示位置のカスタマイズ */
  position?: {
    top?: number;
    right?: number;
  };
  /** カスタムスタイル */
  style?: React.CSSProperties;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  initialVolume = {},
  onVolumeChange,
  simpleMode = false,
  position = {},
  style = {}
}) => {
  // デフォルト音量設定
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>({
    bgm: initialVolume.bgm ?? 0.7,
    se: initialVolume.se ?? 0.8, 
    master: initialVolume.master ?? 1.0,
    muted: initialVolume.muted ?? false,
  });

  // UI状態
  const [showPanel, setShowPanel] = useState(false);
  const [hovering, setHovering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ビューポート対応
  const viewport = getCurrentViewport();
  const scale = viewport.scale;

  // 音量設定の保存（localStorage）
  useEffect(() => {
    const saved = localStorage.getItem('sgp_volume_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVolumeSettings(parsed);
      } catch (error) {
        console.warn('音量設定の読み込みに失敗:', error);
      }
    }
  }, []);

  // 音量変更時の処理
  useEffect(() => {
    localStorage.setItem('sgp_volume_settings', JSON.stringify(volumeSettings));
    onVolumeChange?.(volumeSettings);
  }, [volumeSettings, onVolumeChange]);

  // 外部クリックでパネルを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && 
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  // 音量アイコンの選択
  const getVolumeIcon = () => {
    if (volumeSettings.muted || volumeSettings.master === 0) {
      return '🔇'; // ミュート
    }
    if (volumeSettings.master <= 0.3) {
      return '🔈'; // 小音量
    }
    if (volumeSettings.master <= 0.7) {
      return '🔉'; // 中音量
    }
    return '🔊'; // 大音量
  };

  // 音量レベルの更新
  const updateVolume = (type: keyof VolumeSettings, value: number | boolean) => {
    setVolumeSettings(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // ミュートトグル
  const toggleMute = () => {
    setVolumeSettings(prev => ({
      ...prev,
      muted: !prev.muted
    }));
  };

  // 位置計算
  const buttonPosition = {
    top: (position.top ?? GAME_CONFIG.UI.VOLUME_BUTTON.POSITION_Y) * scale,
    right: (position.right ?? (GAME_CONFIG.VIEWPORT.WIDTH - GAME_CONFIG.UI.VOLUME_BUTTON.POSITION_X)) * scale,
  };

  const buttonStyles: React.CSSProperties = {
    position: 'fixed',
    top: `${buttonPosition.top}px`,
    right: `${buttonPosition.right}px`,
    width: `${GAME_CONFIG.UI.VOLUME_BUTTON.SIZE * scale}px`,
    height: `${GAME_CONFIG.UI.VOLUME_BUTTON.SIZE * scale}px`,
    backgroundColor: hovering || showPanel ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
    border: 'none',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: `${18 * scale}px`,
    color: 'white',
    zIndex: 1001,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(4px)',
    ...style
  };

  const panelStyles: React.CSSProperties = {
    position: 'fixed',
    top: `${buttonPosition.top + GAME_CONFIG.UI.VOLUME_BUTTON.SIZE * scale + 8}px`,
    right: `${buttonPosition.right}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: `${8 * scale}px`,
    padding: `${12 * scale}px`,
    minWidth: `${simpleMode ? '120' : '200'}px`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(8px)',
    color: 'white',
    fontSize: `${12 * scale}px`,
    zIndex: 1002,
    transform: showPanel ? 'translateY(0) opacity(1)' : 'translateY(-10px) opacity(0)',
    transition: 'all 0.2s ease',
    pointerEvents: showPanel ? 'auto' : 'none'
  };

  // スライダーコンポーネント
  const VolumeSlider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    color?: string;
  }> = ({ label, value, onChange, color = '#10b981' }) => (
    <div style={{ marginBottom: `${8 * scale}px` }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: `${4 * scale}px`
      }}>
        <span style={{ fontSize: `${11 * scale}px`, opacity: 0.9 }}>{label}</span>
        <span style={{ fontSize: `${10 * scale}px`, opacity: 0.7 }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div style={{
        position: 'relative',
        height: `${6 * scale}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: `${3 * scale}px`,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${value * 100}%`,
          backgroundColor: color,
          borderRadius: `${3 * scale}px`,
          transition: 'width 0.1s ease'
        }} />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* メイン音量ボタン */}
      <button
        ref={buttonRef}
        style={buttonStyles}
        onClick={simpleMode ? toggleMute : () => setShowPanel(!showPanel)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-label={`音量設定 (${volumeSettings.muted ? 'ミュート' : Math.round(volumeSettings.master * 100) + '%'})`}
        title={simpleMode ? 'ミュート切り替え' : '音量設定を開く'}
      >
        {getVolumeIcon()}
      </button>

      {/* 音量設定パネル */}
      {!simpleMode && (
        <div ref={panelRef} style={panelStyles}>
          {/* ヘッダー */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: `${12 * scale}px`,
            paddingBottom: `${8 * scale}px`,
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <span style={{ fontWeight: '600', fontSize: `${13 * scale}px` }}>
              🎵 音量設定
            </span>
            <button
              onClick={toggleMute}
              style={{
                background: volumeSettings.muted ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: `${4 * scale}px`,
                padding: `${4 * scale}px ${8 * scale}px`,
                color: 'white',
                fontSize: `${10 * scale}px`,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              {volumeSettings.muted ? 'ミュート中' : 'ミュート'}
            </button>
          </div>

          {/* スライダー */}
          {!volumeSettings.muted && (
            <>
              <VolumeSlider
                label="🎵 BGM"
                value={volumeSettings.bgm}
                onChange={(value) => updateVolume('bgm', value)}
                color="#3b82f6"
              />
              <VolumeSlider
                label="🎯 効果音"
                value={volumeSettings.se}
                onChange={(value) => updateVolume('se', value)}
                color="#f59e0b"
              />
              <VolumeSlider
                label="🔊 全体"
                value={volumeSettings.master}
                onChange={(value) => updateVolume('master', value)}
                color="#10b981"
              />
            </>
          )}

          {/* プリセット */}
          <div style={{ 
            marginTop: `${12 * scale}px`,
            paddingTop: `${8 * scale}px`,
            borderTop: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ 
              fontSize: `${10 * scale}px`, 
              opacity: 0.7,
              marginBottom: `${6 * scale}px`
            }}>
              プリセット:
            </div>
            <div style={{ display: 'flex', gap: `${4 * scale}px` }}>
              {[
                { name: '小', values: { bgm: 0.3, se: 0.4, master: 0.5 } },
                { name: '中', values: { bgm: 0.6, se: 0.7, master: 0.7 } },
                { name: '大', values: { bgm: 0.8, se: 0.9, master: 1.0 } }
              ].map(preset => (
                <button
                  key={preset.name}
                  onClick={() => setVolumeSettings(prev => ({ ...prev, ...preset.values }))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: `${3 * scale}px`,
                    padding: `${3 * scale}px ${6 * scale}px`,
                    color: 'white',
                    fontSize: `${9 * scale}px`,
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 簡易版音量コントロール
export const SimpleVolumeControl: React.FC<{
  onVolumeChange?: (settings: VolumeSettings) => void;
}> = ({ onVolumeChange }) => {
  return (
    <VolumeControl
      simpleMode={true}
      onVolumeChange={onVolumeChange}
    />
  );
};

// ゲーム用音量コントロール（プリセット）
export const GameVolumeControl: React.FC<{
  onVolumeChange?: (settings: VolumeSettings) => void;
}> = ({ onVolumeChange }) => {
  return (
    <VolumeControl
      initialVolume={{
        bgm: 0.6,
        se: 0.8,
        master: 0.8,
        muted: false
      }}
      onVolumeChange={onVolumeChange}
      simpleMode={false}
    />
  );
};

export default VolumeControl;