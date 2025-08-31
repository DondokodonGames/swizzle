import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GameTemplate } from '../game-engine/GameTemplate';
import { GameTemplateFactory } from '../game-engine/GameTemplateFactory';
import { GameConfig } from './GameSelector';
import { GameErrorManager, GameError } from '../game-engine/GameErrorManager';

interface EnhancedGameCanvasProps {
  width?: number;
  height?: number;
  config: GameConfig;
  onGameEnd?: (success?: boolean, score?: number) => void;
  bgmVolume?: number;
  seVolume?: number;
  isMuted?: boolean;
}

interface ErrorNotification {
  error: GameError;
  message: string;
  canRetry: boolean;
  userAction?: string;
}

const EnhancedGameCanvas: React.FC<EnhancedGameCanvasProps> = ({ 
  width = 375, 
  height = 600,
  config,
  onGameEnd,
  bgmVolume = 0.7,
  seVolume = 0.8,
  isMuted = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const gameRef = useRef<GameTemplate | null>(null);
  const errorManager = useRef(GameErrorManager.getInstance());
  const isInitializingRef = useRef(false);
  
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('読み込み中...');
  const [errorNotification, setErrorNotification] = useState<ErrorNotification | null>(null);
  const [performanceStats, setPerformanceStats] = useState({ fps: 60, memoryUsage: 0 });
  // 🔍 デバッグ情報追加
  const [debugInfo, setDebugInfo] = useState<{
    pixiInitialized: boolean;
    canvasAttached: boolean;
    gameTemplateCreated: boolean;
    sceneCreated: boolean;
    gameStarted: boolean;
    lastError: string | null;
  }>({
    pixiInitialized: false,
    canvasAttached: false,
    gameTemplateCreated: false,
    sceneCreated: false,
    gameStarted: false,
    lastError: null
  });

  // エラー通知の処理
  useEffect(() => {
    const handleGameError = (event: CustomEvent) => {
      const { error, message, canRetry, userAction } = event.detail;
      setErrorNotification({ error, message, canRetry, userAction });
      setGameStatus('エラー');
      setDebugInfo(prev => ({ ...prev, lastError: message }));
    };

    window.addEventListener('gameError', handleGameError as EventListener);
    return () => window.removeEventListener('gameError', handleGameError as EventListener);
  }, []);

  // パフォーマンス監視
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measurePerformance = () => {
      const currentTime = performance.now();
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const memoryUsage = (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;
        
        setPerformanceStats({ fps, memoryUsage });
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measurePerformance);
    };
    
    animationId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(animationId);
  }, [config.gameType]);

  // 🚑 デバッグ強化版ゲーム初期化
  const initializeGame = useCallback(async () => {
    if (isInitializingRef.current) {
      console.log('🔄 Game initialization already in progress, skipping...');
      return;
    }
    
    if (!canvasRef.current) {
      console.error('❌ Canvas ref not available');
      setDebugInfo(prev => ({ ...prev, lastError: 'Canvas ref not available' }));
      return;
    }

    console.log('🚀 Starting game initialization...');
    isInitializingRef.current = true;
    
    // デバッグ情報リセット
    setDebugInfo({
      pixiInitialized: false,
      canvasAttached: false,
      gameTemplateCreated: false,
      sceneCreated: false,
      gameStarted: false,
      lastError: null
    });
    
    try {
      setGameStatus('PixiJS初期化中...');
      setErrorNotification(null);

      // 🧹 既存リソースのクリーンアップ
      console.log('🧹 Cleaning up existing resources...');
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: false });
          console.log('✅ Previous PIXI app destroyed');
        } catch (error) {
          console.warn('⚠️ Previous app cleanup warning:', error);
        }
        appRef.current = null;
      }

      if (gameRef.current) {
        try {
          gameRef.current.destroy();
          console.log('✅ Previous game destroyed');
        } catch (error) {
          console.warn('⚠️ Previous game cleanup warning:', error);
        }
        gameRef.current = null;
      }

      // Canvas DOM要素クリーンアップ
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
      console.log('✅ Canvas DOM cleaned');

      // 🎨 PixiJS初期化
      console.log('🎨 Initializing PixiJS...');
      const app = new PIXI.Application({
        width,
        height,
        backgroundColor: 0xfce7ff,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });

      if (!app || !app.stage) {
        throw new Error('PixiJS initialization failed - no stage');
      }

      appRef.current = app;
      console.log('✅ PixiJS initialized successfully');
      setDebugInfo(prev => ({ ...prev, pixiInitialized: true }));
      
      // 🖼️ Canvas DOM追加
      console.log('🖼️ Attaching canvas to DOM...');
      if (app.view && canvasRef.current) {
        canvasRef.current.appendChild(app.view as HTMLCanvasElement);
        console.log('✅ Canvas attached to DOM');
        setDebugInfo(prev => ({ ...prev, canvasAttached: true }));
      } else {
        throw new Error('Failed to append canvas to DOM - no view');
      }

      // 🔍 テスト描画（PIXI動作確認）
      console.log('🔍 Adding test graphics to verify PIXI...');
      const testGraphics = new PIXI.Graphics();
      testGraphics.beginFill(0xff0000);
      testGraphics.drawCircle(width / 2, height / 2, 50);
      testGraphics.endFill();
      app.stage.addChild(testGraphics);
      console.log('✅ Test red circle added to stage');

      setGameStatus('ゲームテンプレート作成中...');

      // 🎮 ゲーム設定準備
      const settings = {
        gameType: config.gameType,
        characterType: config.characterType,
        difficulty: config.difficulty,
        duration: config.duration,
        targetScore: config.targetScore,
        bgmVolume: isMuted ? 0 : bgmVolume,
        seVolume: isMuted ? 0 : seVolume
      };

      console.log('🎮 Creating game template with settings:', settings);

      // 🏭 ゲームテンプレート作成
      let game: GameTemplate | null = null;
      try {
        const gamePromise = GameTemplateFactory.createTemplate(config.gameType, app, settings);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Game load timeout after 10 seconds`)), 10000);
        });

        game = await Promise.race([gamePromise, timeoutPromise]);
        
        if (!game) {
          throw new Error('Game template creation returned null');
        }

        gameRef.current = game;
        console.log('✅ Game template created:', config.gameType);
        setDebugInfo(prev => ({ ...prev, gameTemplateCreated: true }));

      } catch (templateError) {
        console.error('❌ Game template creation failed:', templateError);
        
        // 🚑 フォールバック: 基本的なCuteTapGameを直接作成
        console.log('🚑 Attempting fallback to CuteTap...');
        try {
          const { CuteTapGame } = await import('../game-engine/CuteTapGame');
          game = new CuteTapGame(app, {
            duration: settings.duration,
            targetScore: settings.targetScore,
            difficulty: settings.difficulty,
            targetTaps: settings.targetScore,
            characterType: settings.characterType
          });
          gameRef.current = game;
          console.log('✅ Fallback CuteTap game created');
          setDebugInfo(prev => ({ ...prev, gameTemplateCreated: true }));
        } catch (fallbackError) {
          console.error('❌ Fallback game creation also failed:', fallbackError);
          throw new Error(`Both main and fallback game creation failed: ${templateError.message}`);
        }
      }

      // テスト描画を削除
      if (app.stage.children.includes(testGraphics)) {
        app.stage.removeChild(testGraphics);
        console.log('🧹 Test graphics removed');
      }

      setGameStatus('ゲームシーン作成中...');

      // 🎬 ゲームシーン作成
      if (game && typeof game.createScene === 'function') {
        console.log('🎬 Creating game scene...');
        await game.createScene();
        console.log('✅ Game scene created');
        setDebugInfo(prev => ({ ...prev, sceneCreated: true }));
      } else {
        console.warn('⚠️ Game has no createScene method, skipping...');
      }

      // 🔧 ゲーム初期化
      if (game && typeof game.initialize === 'function') {
        console.log('🔧 Initializing game...');
        await game.initialize();
        console.log('✅ Game initialized');
      }

      // 📞 コールバック設定
      if (game) {
        (game as any).onGameEnd = (success: boolean, score: number) => {
          console.log('🏁 Game ended:', success, score);
          setGameStatus('ゲーム終了');
          if (onGameEnd) {
            onGameEnd(success, score);
          }
        };
      }

      setIsGameLoaded(true);
      setGameStatus('ゲーム開始準備完了');

      // ⏰ 自動ゲーム開始
      console.log('⏰ Scheduling game start...');
      setTimeout(() => {
        if (gameRef.current && typeof gameRef.current.start === 'function') {
          console.log('🎯 Starting game...');
          try {
            gameRef.current.start();
            console.log('✅ Game started successfully');
            setGameStatus('ゲーム実行中...');
            setDebugInfo(prev => ({ ...prev, gameStarted: true }));
          } catch (startError) {
            console.error('❌ Game start failed:', startError);
            setDebugInfo(prev => ({ ...prev, lastError: `Game start failed: ${startError.message}` }));
          }
        } else {
          console.error('❌ Cannot start game - no start method or game reference');
          setDebugInfo(prev => ({ ...prev, lastError: 'No start method available' }));
        }
      }, 800);

    } catch (error) {
      console.error('❌ Game initialization error:', error);
      setDebugInfo(prev => ({ ...prev, lastError: error.message }));
      
      await errorManager.current.handleError({
        error: error as Error,
        gameType: config.gameType,
        context: { 
          gameState: 'initialization',
          screenSize: { 
            width: window.innerWidth, 
            height: window.innerHeight 
          }
        },
        forceUserNotification: true
      });
    } finally {
      isInitializingRef.current = false;
      console.log('🏁 Game initialization process completed');
    }
  }, [width, height, config, onGameEnd, bgmVolume, seVolume, isMuted]);

  // 🧹 クリーンアップ
  const cleanupGame = useCallback(() => {
    console.log('🧹 Starting cleanup...');
    
    try {
      if (gameRef.current) {
        try {
          gameRef.current.destroy();
          console.log('✅ Game destroyed');
        } catch (error) {
          console.warn('⚠️ Game cleanup warning:', error);
        }
        gameRef.current = null;
      }
      
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { 
            children: true, 
            texture: false,
            baseTexture: false 
          });
          console.log('✅ PIXI app destroyed');
        } catch (error) {
          console.warn('⚠️ PIXI cleanup warning:', error);
        }
        appRef.current = null;
      }
      
      setIsGameLoaded(false);
      setGameStatus('読み込み中...');
      setErrorNotification(null);
      
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
    
    console.log('✅ Cleanup completed');
  }, []);

  // メインEffect
  useEffect(() => {
    console.log('🔄 EnhancedGameCanvas effect triggered, config:', config.gameType);
    initializeGame();

    return () => {
      console.log('🧹 EnhancedGameCanvas effect cleanup');
      cleanupGame();
    };
  }, [config.gameType, config.characterType, config.difficulty, config.duration, config.targetScore]);

  // 音量変更監視
  useEffect(() => {
    if (gameRef.current && typeof (gameRef.current as any).updateAudioSettings === 'function') {
      (gameRef.current as any).updateAudioSettings({
        bgmVolume: isMuted ? 0 : bgmVolume,
        seVolume: isMuted ? 0 : seVolume,
        isMuted
      });
    }
  }, [bgmVolume, seVolume, isMuted]);

  const handleRetry = async () => {
    console.log('🔄 Manual retry requested');
    setErrorNotification(null);
    cleanupGame();
    setTimeout(() => {
      initializeGame();
    }, 500);
  };

  const handleManualRetry = async () => {
    if (errorNotification) {
      console.log('🛠️ Manual error recovery requested');
      const success = await errorManager.current.manualRetry(errorNotification.error.id);
      if (success) {
        setErrorNotification(null);
        setGameStatus('再試行中...');
        await handleRetry();
      }
    }
  };

  const dismissError = () => {
    setErrorNotification(null);
    setGameStatus('準備完了');
  };

  return (
    <div className="enhanced-game-canvas-container">
      {/* メインキャンバス */}
      <div 
        ref={canvasRef} 
        style={{ 
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          margin: '0 auto',
          background: 'linear-gradient(135deg, #fce7ff 0%, #e5e7eb 100%)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid #d946ef' // 🔍 デバッグ用境界線
        }}
      />
      
      {/* エラー通知 */}
      {errorNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="text-red-500 text-2xl mr-3">⚠️</div>
              <h3 className="text-lg font-bold text-gray-800">エラーが発生しました</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 whitespace-pre-line">{errorNotification.message}</p>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                onClick={handleRetry}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                🔄 再試行
              </button>
              
              {errorNotification.canRetry && (
                <button
                  onClick={handleManualRetry}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  🛠️ 自動修復を試す
                </button>
              )}
              
              <button
                onClick={dismissError}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors"
              >
                ❌ 閉じる
              </button>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">技術詳細</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(errorNotification.error, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* ゲーム情報（デバッグ情報強化版） */}
      <div className="game-info" style={{ 
        padding: '15px', 
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <h3 style={{ 
          margin: '10px 0 5px 0', 
          color: '#d946ef',
          fontSize: '18px'
        }}>
          🌟 {config.gameType}
        </h3>
        
        <p style={{ 
          fontSize: '14px', 
          color: errorNotification ? '#dc2626' : 
               gameStatus.includes('実行中') ? '#10b981' : '#52525b', 
          margin: '8px 0',
          fontWeight: '500'
        }}>
          {gameStatus}
        </p>

        {/* 🔍 デバッグ情報表示 */}
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '10px',
          margin: '10px 0',
          fontSize: '11px',
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#374151' }}>
            🔍 デバッグ状況:
          </div>
          <div style={{ color: debugInfo.pixiInitialized ? '#10b981' : '#ef4444' }}>
            ✓ PixiJS初期化: {debugInfo.pixiInitialized ? '完了' : '未完了'}
          </div>
          <div style={{ color: debugInfo.canvasAttached ? '#10b981' : '#ef4444' }}>
            ✓ Canvas添付: {debugInfo.canvasAttached ? '完了' : '未完了'}
          </div>
          <div style={{ color: debugInfo.gameTemplateCreated ? '#10b981' : '#ef4444' }}>
            ✓ テンプレート作成: {debugInfo.gameTemplateCreated ? '完了' : '未完了'}
          </div>
          <div style={{ color: debugInfo.sceneCreated ? '#10b981' : '#ef4444' }}>
            ✓ シーン作成: {debugInfo.sceneCreated ? '完了' : '未完了'}
          </div>
          <div style={{ color: debugInfo.gameStarted ? '#10b981' : '#ef4444' }}>
            ✓ ゲーム開始: {debugInfo.gameStarted ? '完了' : '未完了'}
          </div>
          {debugInfo.lastError && (
            <div style={{ color: '#ef4444', marginTop: '5px' }}>
              ❌ 最新エラー: {debugInfo.lastError}
            </div>
          )}
        </div>

        {/* パフォーマンス表示 */}
        <div className="text-xs text-gray-400 mt-2">
          FPS: {performanceStats.fps} | Memory: {performanceStats.memoryUsage}MB
        </div>

        <button
          onClick={handleRetry}
          disabled={gameStatus.includes('読み込み中') || isInitializingRef.current}
          className="mt-3 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 再読み込み
        </button>
      </div>
    </div>
  );
};

export default EnhancedGameCanvas;