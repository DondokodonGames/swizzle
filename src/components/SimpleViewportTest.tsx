// シンプルなビューポートテスト用コンポーネント
// Phase 4 Week 1: 統合確認用

import React, { useEffect, useState } from 'react';
import { 
  getCurrentViewport, 
  createViewportObserver, 
  setCSSViewportVariables,
  getGameAreaBounds,
} from '../utils/viewportUtils';
import { GAME_CONFIG } from '../constants/gameConfig';

export const SimpleViewportTest: React.FC = () => {
  const [viewport, setViewport] = useState(() => getCurrentViewport());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // CSS変数設定
    setCSSViewportVariables();
    
    // コンソールに情報出力
    console.log('🚀 Phase 4 Viewport Integration Test Started');
    console.log('Viewport Info:', viewport);
    console.log('Game Config:', {
      viewport: GAME_CONFIG.VIEWPORT,
      ui: GAME_CONFIG.UI
    });

    // ビューポート変更監視
    const cleanup = createViewportObserver((vp) => {
      setViewport(vp);
      setCSSViewportVariables(vp);
      console.log('Viewport Changed:', vp);
    });

    return cleanup;
  }, []);

  // 表示/非表示切り替え
  const toggleVisibility = () => setIsVisible(!isVisible);

  if (!isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        style={{
          position: 'fixed',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '8px 16px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        📱 Show Viewport Test
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '60px', // 環境変数パネルと重複回避
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      fontSize: '11px',
      fontFamily: 'monospace',
      zIndex: 9998, // 環境変数パネルより少し低く
      borderRadius: '6px',
      maxWidth: '280px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      border: '1px solid #4f46e5'
    }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: '#4ade80',
          fontSize: '12px' 
        }}>
          📱 Viewport Test (Week 1)
        </h3>
        <button
          onClick={toggleVisibility}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕
        </button>
      </div>
      
      {/* 基本ビューポート情報 */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>Current Viewport:</div>
        <div>Size: {viewport.width}×{viewport.height}</div>
        <div>Scale: {viewport.scale.toFixed(3)}</div>
        <div>Device: {viewport.deviceType}</div>
        <div>Orientation: {viewport.orientation}</div>
        <div>Ratio: {viewport.aspectRatio.toFixed(3)}</div>
      </div>

      {/* ゲーム設定情報 */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>Game Config:</div>
        <div>Base: {GAME_CONFIG.VIEWPORT.WIDTH}×{GAME_CONFIG.VIEWPORT.HEIGHT}</div>
        <div>Aspect: {GAME_CONFIG.VIEWPORT.ASPECT_RATIO}</div>
        <div>Timer Y: {GAME_CONFIG.UI.TIMER_BAR.POSITION_Y}</div>
        <div>Volume: ({GAME_CONFIG.UI.VOLUME_BUTTON.POSITION_X}, {GAME_CONFIG.UI.VOLUME_BUTTON.POSITION_Y})</div>
      </div>

      {/* 統合状況 */}
      <div style={{
        marginTop: '8px',
        padding: '4px',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderRadius: '3px',
        fontSize: '10px'
      }}>
        <div style={{ color: '#10b981', fontWeight: 'bold' }}>Integration Status:</div>
        <div>✅ gameConfig imported</div>
        <div>✅ viewportUtils imported</div>
        <div>✅ CSS variables set</div>
        <div>✅ Responsive monitoring</div>
      </div>

      {/* テスト実行ボタン */}
      <div style={{ marginTop: '8px' }}>
        <button
          onClick={() => {
            const bounds = getGameAreaBounds();
            console.log('=== VIEWPORT TEST RESULTS ===');
            console.log('Current Viewport:', viewport);
            console.log('Game Area Bounds:', bounds);
            console.log('CSS Variables Check:', {
              viewportWidth: getComputedStyle(document.documentElement).getPropertyValue('--viewport-width'),
              gameWidth: getComputedStyle(document.documentElement).getPropertyValue('--game-width'),
              gameOffsetX: getComputedStyle(document.documentElement).getPropertyValue('--game-offset-x')
            });
            alert('✅ Test completed! Check browser console for detailed results.');
          }}
          style={{
            width: '100%',
            padding: '4px 8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          🔍 Run Console Test
        </button>
      </div>
    </div>
  );
};

// App.tsxに簡単に追加できるラッパー
export const ViewportTestWrapper: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  useEffect(() => {
    // 初期化時にコンソール出力
    console.log('%c🚀 Phase 4 Week 1 Integration Active', 
      'color: #10b981; font-weight: bold; font-size: 14px; background: #000; padding: 4px 8px; border-radius: 4px;'
    );
  }, []);

  return (
    <>
      {children}
      <SimpleViewportTest />
    </>
  );
};