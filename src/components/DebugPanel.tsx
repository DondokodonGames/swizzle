import React, { useState, useEffect } from 'react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GameDebugData {
  gameStatus: string;
  bgmVolume: number;
  seVolume: number;
  isMuted: boolean;
  timeRemaining: number;
  totalTime: number;
  isGameRunning: boolean;
  gameType: string;
}

interface SystemInfo {
  fps: number;
  memory: number;
  viewport: {
    width: number;
    height: number;
    ratio: string;
  };
  env: {
    NODE_ENV: string;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    AUTH_ENABLED: boolean;
  };
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [gameDebugData, setGameDebugData] = useState<GameDebugData | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    fps: 0,
    memory: 0,
    viewport: { width: 0, height: 0, ratio: '0:0' },
    env: {
      NODE_ENV: 'unknown',
      SUPABASE_URL: 'unknown',
      SUPABASE_KEY: 'unknown',
      AUTH_ENABLED: false
    }
  });

  // FPS・Memory測定
  useEffect(() => {
    let fps = 0;
    let lastTime = performance.now();
    let frameCount = 0;
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) { // 1秒間隔で更新
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        // Memory使用量取得
        const memory = (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;
        
        // Viewport情報取得
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          ratio: `${window.innerWidth}:${window.innerHeight}`
        };
        
        // 環境変数取得
        const getEnvVar = (key: string): string | undefined => {
          try {
            return (import.meta as any).env?.[key];
          } catch {
            return undefined;
          }
        };
        
        const env = {
          NODE_ENV: getEnvVar('MODE') || 'unknown',
          SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL') ? '✅ Set' : '❌ Missing',
          SUPABASE_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY') ? '✅ Set' : '❌ Missing',
          AUTH_ENABLED: getEnvVar('VITE_ENABLE_AUTH') === 'true'
        };
        
        setSystemInfo({ fps, memory, viewport, env });
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // ゲームデバッグデータ取得
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).gameDebugData) {
        setGameDebugData((window as any).gameDebugData);
      }
    }, 100); // 0.1秒間隔で更新
    
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#1f2937',
          color: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '500px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          fontFamily: 'monospace'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #374151',
          paddingBottom: '12px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#10b981',
            margin: 0
          }}>
            🔧 統合デバッグ画面
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* システム情報セクション */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            color: '#fbbf24', 
            marginBottom: '12px',
            borderLeft: '4px solid #fbbf24',
            paddingLeft: '8px'
          }}>
            📊 システム情報
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
            fontSize: '14px'
          }}>
            <div style={{ 
              backgroundColor: '#374151', 
              padding: '8px', 
              borderRadius: '6px' 
            }}>
              <div style={{ color: '#10b981', fontWeight: 'bold' }}>FPS</div>
              <div style={{ fontSize: '18px', color: systemInfo.fps > 50 ? '#10b981' : '#ef4444' }}>
                {systemInfo.fps}
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#374151', 
              padding: '8px', 
              borderRadius: '6px' 
            }}>
              <div style={{ color: '#10b981', fontWeight: 'bold' }}>Memory</div>
              <div style={{ fontSize: '18px', color: systemInfo.memory > 100 ? '#ef4444' : '#10b981' }}>
                {systemInfo.memory} MB
              </div>
            </div>
          </div>
        </div>

        {/* ビューポート情報セクション */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            color: '#3b82f6', 
            marginBottom: '12px',
            borderLeft: '4px solid #3b82f6',
            paddingLeft: '8px'
          }}>
            📱 ビューポート情報
          </h3>
          <div style={{ 
            backgroundColor: '#374151', 
            padding: '12px', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#9ca3af' }}>サイズ:</span> {systemInfo.viewport.width} × {systemInfo.viewport.height}
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#9ca3af' }}>比率:</span> {systemInfo.viewport.ratio}
            </div>
            <div>
              <span style={{ color: '#9ca3af' }}>推奨:</span> 375 × 667 (9:16)
            </div>
          </div>
        </div>

        {/* 環境変数セクション */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            color: '#8b5cf6', 
            marginBottom: '12px',
            borderLeft: '4px solid #8b5cf6',
            paddingLeft: '8px'
          }}>
            🔐 環境変数
          </h3>
          <div style={{ 
            backgroundColor: '#374151', 
            padding: '12px', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#9ca3af' }}>NODE_ENV:</span> {systemInfo.env.NODE_ENV}
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#9ca3af' }}>Supabase URL:</span> {systemInfo.env.SUPABASE_URL}
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#9ca3af' }}>Supabase Key:</span> {systemInfo.env.SUPABASE_KEY}
            </div>
            <div>
              <span style={{ color: '#9ca3af' }}>認証有効:</span> 
              <span style={{ 
                color: systemInfo.env.AUTH_ENABLED ? '#10b981' : '#f59e0b',
                fontWeight: 'bold'
              }}>
                {systemInfo.env.AUTH_ENABLED ? ' ✅ ON' : ' ⚠️ OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* ゲーム状態セクション */}
        {gameDebugData && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              color: '#d946ef', 
              marginBottom: '12px',
              borderLeft: '4px solid #d946ef',
              paddingLeft: '8px'
            }}>
              🎮 ゲーム状態
            </h3>
            <div style={{ 
              backgroundColor: '#374151', 
              padding: '12px', 
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>ステータス:</span> 
                <span style={{ 
                  color: gameDebugData.gameStatus === 'ゲーム実行中' ? '#10b981' : '#f59e0b',
                  fontWeight: 'bold',
                  marginLeft: '8px'
                }}>
                  {gameDebugData.gameStatus}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>ゲーム種類:</span> {gameDebugData.gameType}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>残り時間:</span> 
                <span style={{ 
                  color: gameDebugData.timeRemaining <= 3 ? '#ef4444' : '#10b981',
                  fontWeight: 'bold',
                  marginLeft: '8px'
                }}>
                  {gameDebugData.timeRemaining.toFixed(1)}s / {gameDebugData.totalTime}s
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>実行中:</span> 
                <span style={{ 
                  color: gameDebugData.isGameRunning ? '#10b981' : '#ef4444',
                  fontWeight: 'bold',
                  marginLeft: '8px'
                }}>
                  {gameDebugData.isGameRunning ? '▶️ Running' : '⏸️ Paused'}
                </span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>音量:</span>
                <div style={{ marginTop: '4px' }}>
                  {gameDebugData.isMuted ? (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔇 ミュート</span>
                  ) : (
                    <div style={{ fontSize: '11px' }}>
                      <span style={{ color: '#3b82f6' }}>BGM: {Math.round(gameDebugData.bgmVolume * 100)}%</span>
                      <span style={{ color: '#14b8a6', marginLeft: '8px' }}>SE: {Math.round(gameDebugData.seVolume * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* アクション */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid #374151'
        }}>
          <button
            onClick={() => {
              console.log('=== COMPLETE DEBUG INFO ===');
              console.log('System Info:', systemInfo);
              console.log('Game Debug Data:', gameDebugData);
              console.log('Window Debug Data:', (window as any).gameDebugData);
              alert('✅ デバッグ情報をコンソールに出力しました！');
            }}
            style={{
              flex: 1,
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📋 コンソール出力
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              flex: 1,
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🔄 リロード
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;