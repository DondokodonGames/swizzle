import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameTemplateFactory } from '../game-engine/GameTemplateFactory';
import { GameConfig } from './GameSelector';

interface EnhancedGameCanvasProps {
  width?: number;
  height?: number;
  config: GameConfig;
  onGameEnd?: (success?: boolean, score?: number) => void;
  bgmVolume?: number;
  seVolume?: number;
  isMuted?: boolean;
  // ボタン機能用のProps追加 
  onSkip?: () => void;
  onExit?: () => void;
}

const EnhancedGameCanvas: React.FC<EnhancedGameCanvasProps> = ({ 
  width = 375, 
  height = 600,
  config,
  onGameEnd,
  bgmVolume = 0.5,
  seVolume = 0.5,
  isMuted = false,
  onSkip,
  onExit
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [gameStatus, setGameStatus] = useState<string>('読み込み中...');
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
  const [localBgmVolume, setLocalBgmVolume] = useState(bgmVolume);
  const [localSeVolume, setLocalSeVolume] = useState(seVolume);
  const [localIsMuted, setLocalIsMuted] = useState(isMuted);
  const gameRef = useRef<any>(null); // ゲーム一時停止用
  
  // ✅ Step 3: 残り時間バー用の状態
  const [timeRemaining, setTimeRemaining] = useState(config.duration);
  const [totalTime] = useState(config.duration);
  const [isGameRunning, setIsGameRunning] = useState(false);

  useEffect(() => {
    let app: PIXI.Application | null = null;
    
    const initGame = async () => {
      if (!canvasRef.current) return;

      try {
        console.log('🎮 ゲーム初期化開始:', config.gameType);
        setGameStatus('初期化中...');

        // PIXI初期化
        app = new PIXI.Application({
          width,
          height,
          backgroundColor: 0xfce7ff,
        });

        // Canvas追加
        canvasRef.current.innerHTML = ''; // 前の内容をクリア
        canvasRef.current.appendChild(app.view as HTMLCanvasElement);
        console.log('✅ Canvas追加完了');

        // ゲーム作成
        const game = await GameTemplateFactory.createTemplate(config.gameType, app, {
          gameType: config.gameType,
          characterType: config.characterType,
          difficulty: config.difficulty,
          duration: config.duration,
          targetScore: config.targetScore
        });

        if (!game) {
          throw new Error('ゲーム作成失敗');
        }

        // ゲーム参照を保存（一時停止用）
        gameRef.current = game;

        console.log('✅ ゲーム作成完了');

        // シーン作成
        if (game.createScene) {
          await game.createScene();
          console.log('✅ シーン作成完了');
        }

        // ゲーム開始
        if (game.start) {
          game.start();
          console.log('✅ ゲーム開始');
          setGameStatus('ゲーム実行中');
          setIsGameRunning(true); // ✅ タイマー開始
        }

        // 終了コールバック
        if ('onGameEnd' in game) {
          (game as any).onGameEnd = (success: boolean, score: number) => {
            console.log('🎁 ゲーム終了:', success, score);
            setIsGameRunning(false); // ✅ タイマー停止
            onGameEnd?.(success, score);
          };
        }

      } catch (error) {
        console.error('❌ エラー発生:', error);
        setGameStatus('エラー発生');
      }
    };

    initGame();

    // クリーンアップ
    return () => {
      if (app) {
        try {
          app.destroy(true);
          console.log('🗑️ リソース削除完了');
        } catch (e) {
          console.warn('クリーンアップエラー:', e);
        }
      }
    };
  }, [config, width, height, onGameEnd]);

  // ✅ Step 3: 残り時間タイマー（1秒間隔）
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isGameRunning && timeRemaining > 0 && !showLoginOverlay && !showVolumeOverlay) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 0.1); // 0.1秒刻み
          
          // 時間切れ処理
          if (newTime <= 0) {
            setIsGameRunning(false);
            // ゲーム強制終了（時間切れ）
            if (gameRef.current && typeof gameRef.current.forceEnd === 'function') {
              gameRef.current.forceEnd(false, 0);
            } else {
              // fallback: 直接onGameEndを呼び出し
              setTimeout(() => onGameEnd?.(false, 0), 100);
            }
          }
          
          return newTime;
        });
      }, 100); // 0.1秒間隔でスムーズな更新
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isGameRunning, timeRemaining, showLoginOverlay, showVolumeOverlay, onGameEnd]);

  // ログインオーバーレイの表示制御（ゲーム一時停止付き）
  useEffect(() => {
    if (showLoginOverlay || showVolumeOverlay) {
      // ゲーム一時停止
      if (gameRef.current && typeof gameRef.current.pause === 'function') {
        gameRef.current.pause();
      }
      // ✅ タイマーも一時停止（上のuseEffectで依存関係により自動停止）
    } else {
      // ゲーム再開
      if (gameRef.current && typeof gameRef.current.resume === 'function') {
        gameRef.current.resume();
      }
      // ✅ タイマーも再開（isGameRunning = trueのため自動再開）
    }
  }, [showLoginOverlay, showVolumeOverlay]);

  const handleLoginClose = () => {
    setShowLoginOverlay(false);
  };

  const handleVolumeClose = () => {
    setShowVolumeOverlay(false);
  };

  const handleVolumeApply = () => {
    // TODO: 実際の音量設定を親コンポーネントに通知
    console.log('音量設定適用:', { localBgmVolume, localSeVolume, localIsMuted });
    setShowVolumeOverlay(false);
  };

  return (
    <div className="enhanced-game-canvas-container" style={{
      position: 'relative',
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      {/* Step 1: ゲーム上部バー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* 左側: 音量・ログイン */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#d946ef',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onClick={() => setShowVolumeOverlay(true)}
          >
            🔊 音量
          </button>
          
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onClick={() => setShowLoginOverlay(true)}
          >
            ログイン
          </button>
        </div>

        {/* 右側: 再読み込み・Skip・Exit */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄
          </button>
          
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onClick={onSkip}
          >
            Skip
          </button>
          
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onClick={onExit}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Step 2: ゲームタイトル（上部バー直下） */}
      <div style={{
        padding: '10px 15px',
        backgroundColor: '#fce7ff',
        borderBottom: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          margin: '0',
          color: '#d946ef',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          🌟 {config.gameType}
        </h3>
      </div>

      {/* ✅ 修復: Canvas描画エリア（明確に表示） */}
      <div 
        ref={canvasRef}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          margin: '0 auto',
          backgroundColor: '#fce7ff', // 確認用背景色
          border: '2px solid #d946ef', // 確認用境界線
          overflow: 'hidden',
          zIndex: 1 // ゲーム画面のz-index
        }}
      />

      {/* Step 3: 下部情報エリア（ステータス + 残り時間表示） */}
      <div style={{ 
        padding: '10px 15px', 
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0'
      }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#666',
          margin: '0 0 5px 0'
        }}>
          {gameStatus}
        </p>
        
        {/* 音量表示 */}
        <div style={{ fontSize: '12px', color: '#999', margin: '0 0 10px 0' }}>
          BGM: {isMuted ? 'ミュート' : `${Math.round(bgmVolume * 100)}%`} | 
          SE: {isMuted ? 'ミュート' : `${Math.round(seVolume * 100)}%`}
        </div>
        
        {/* ✅ 残り時間デジタル表示 */}
        <div style={{ 
          fontSize: '14px', 
          color: timeRemaining <= 3 ? '#ef4444' : '#d946ef',
          fontWeight: 'bold',
          margin: '0'
        }}>
          ⏱️ 残り時間: {timeRemaining.toFixed(1)}秒
        </div>
      </div>

      {/* ✅ Step 3: 残り時間プログレスバー（画面最下部） */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '8px',
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
        borderRadius: '0 0 4px 4px'
      }}>
        <div style={{
          height: '100%',
          backgroundColor: timeRemaining <= 3 ? '#ef4444' : timeRemaining <= 10 ? '#f59e0b' : '#d946ef',
          width: `${Math.max(0, (timeRemaining / totalTime) * 100)}%`,
          transition: 'width 0.1s linear, background-color 0.3s ease',
          borderRadius: '0 4px 4px 0',
          boxShadow: timeRemaining <= 5 ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none'
        }} />
        
        {/* ✅ パルス効果（残り3秒以下） */}
        {timeRemaining <= 3 && timeRemaining > 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundColor: '#ef4444',
            opacity: 0.3,
            animation: 'pulse 0.5s ease-in-out infinite alternate'
          }} />
        )}
      </div>
      
      {/* ✅ パルスアニメーション定義 */}
      <style>{`
        @keyframes pulse {
          from { opacity: 0.3; }
          to { opacity: 0.7; }
        }
      `}</style>

      {/* ✅ 音量設定オーバーレイ（z-index: 9999） */}
      {showVolumeOverlay && (
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
            zIndex: 9999
          }}
          onClick={handleVolumeClose}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '320px',
              maxWidth: '90vw',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: 0
              }}>
                🔊 音量設定
              </h2>
              <button
                onClick={handleVolumeClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
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
            
            {/* ミュート切り替え */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setLocalIsMuted(!localIsMuted)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: localIsMuted ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {localIsMuted ? '🔇 ミュート中' : '🔊 音声ON'}
              </button>
            </div>

            {/* BGM音量 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                🎵 BGM音量: {Math.round(localBgmVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localBgmVolume}
                onChange={(e) => setLocalBgmVolume(parseFloat(e.target.value))}
                disabled={localIsMuted}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: localIsMuted ? '#d1d5db' : 
                    `linear-gradient(to right, #d946ef 0%, #d946ef ${localBgmVolume * 100}%, #e5e7eb ${localBgmVolume * 100}%, #e5e7eb 100%)`,
                  outline: 'none',
                  cursor: localIsMuted ? 'not-allowed' : 'pointer'
                }}
              />
            </div>

            {/* SE音量 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                🎯 効果音量: {Math.round(localSeVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localSeVolume}
                onChange={(e) => setLocalSeVolume(parseFloat(e.target.value))}
                disabled={localIsMuted}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: localIsMuted ? '#d1d5db' : 
                    `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${localSeVolume * 100}%, #e5e7eb ${localSeVolume * 100}%, #e5e7eb 100%)`,
                  outline: 'none',
                  cursor: localIsMuted ? 'not-allowed' : 'pointer'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  backgroundColor: '#d946ef',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={handleVolumeApply}
              >
                適用
              </button>
              
              <button
                type="button"
                style={{
                  flex: 1,
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={handleVolumeClose}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ログインオーバーレイ（ゲーム停止版・z-index: 9999） */}
      {showLoginOverlay && (
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
            zIndex: 9999 // 最高優先度
          }}
          onClick={handleLoginClose}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '320px',
              maxWidth: '90vw',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              transform: showLoginOverlay ? 'scale(1)' : 'scale(0.9)',
              transition: 'transform 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: 0
              }}>
                🔐 ログイン
              </h2>
              <button
                onClick={handleLoginClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '4px'
              }}>
                メールアドレス
              </label>
              <input
                type="email"
                placeholder="example@email.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.style.borderColor = '#e5e7eb';
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '4px'
              }}>
                パスワード
              </label>
              <input
                type="password"
                placeholder="パスワードを入力"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.style.borderColor = '#e5e7eb';
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => {
                  // TODO: 実際のログイン処理
                  alert('ログイン機能は後で実装予定');
                  handleLoginClose();
                }}
                onMouseOver={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#3b82f6';
                }}
              >
                ログイン
              </button>
              
              <button
                type="button"
                style={{
                  flex: 1,
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => {
                  // TODO: 新規登録機能
                  alert('新規登録機能は後で実装予定');
                  handleLoginClose();
                }}
                onMouseOver={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#4b5563';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#6b7280';
                }}
              >
                新規登録
              </button>
            </div>
            
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              ゲスト使用も可能です
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedGameCanvas;