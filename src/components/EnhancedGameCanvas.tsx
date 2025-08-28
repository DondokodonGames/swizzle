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
  onGameEnd
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const gameRef = useRef<GameTemplate | null>(null);
  const errorManager = useRef(GameErrorManager.getInstance());
  
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('読み込み中...');
  const [errorNotification, setErrorNotification] = useState<ErrorNotification | null>(null);
  const [performanceStats, setPerformanceStats] = useState({ fps: 60, memoryUsage: 0 });

  // エラー通知の処理
  useEffect(() => {
    const handleGameError = (event: CustomEvent) => {
      const { error, message, canRetry, userAction } = event.detail;
      setErrorNotification({ error, message, canRetry, userAction });
      setGameStatus('エラー');
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
      
      if (currentTime - lastTime >= 1000) { // 1秒ごと
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const memoryUsage = (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;
        
        setPerformanceStats({ fps, memoryUsage });
        
        // パフォーマンス警告
        if (fps < 30) {
          errorManager.current.handleError({
            error: new Error(`Low FPS detected: ${fps}`),
            gameType: config.gameType,
            context: { gameState: 'performance_warning' }
          });
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measurePerformance);
    };
    
    animationId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(animationId);
  }, [config.gameType]);

  const initializeGame = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      setGameStatus('PixiJS初期化中...');
      setErrorNotification(null);

      // PixiJS初期化（エラーハンドリング強化）
      const app = new PIXI.Application({
        width,
        height,
        backgroundColor: 0xfce7ff,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2), // 解像度制限
        autoDensity: true,
      });

      // PixiJS初期化確認
      if (!app.stage) {
        throw new Error('PixiJS stage initialization failed');
      }

      appRef.current = app;
      canvasRef.current.appendChild(app.view as HTMLCanvasElement);

      setGameStatus('ゲーム準備中...');

      // ゲーム設定
      const settings = {
        gameType: config.gameType,
        characterType: config.characterType,
        difficulty: config.difficulty,
        duration: config.duration,
        targetScore: config.targetScore
      };

      // ゲームテンプレート作成（タイムアウト付き）
      const gamePromise = GameTemplateFactory.createTemplate(config.gameType, app, settings);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Game load timeout after 10 seconds')), 10000);
      });

      const game = await Promise.race([gamePromise, timeoutPromise]);
      
      if (!game) {
        throw new Error('Game template creation returned null');
      }

      gameRef.current = game;

      // コールバック設定
      (game as any).onGameEnd = (success: boolean, score: number) => {
        setGameStatus('ゲーム終了');
        onGameEnd?.(success, score);
      };

      // シーン作成
      if (typeof game.createScene === 'function') {
        await game.createScene();
      } else {
        throw new Error('Game createScene method not found');
      }

      setIsGameLoaded(true);
      setGameStatus('ゲーム開始準備完了');

      // 自動開始
      setTimeout(() => {
        if (gameRef.current && typeof gameRef.current.start === 'function') {
          gameRef.current.start();
          setGameStatus('ゲーム実行中...');
        }
      }, 500);

    } catch (error) {
      await errorManager.current.handleError({
        error: error as Error,
        gameType: config.gameType,
        context: { 
          gameState: 'initialization',
          gameSettings: config
        },
        forceUserNotification: true
      });
    }
  }, [width, height, config, onGameEnd]);

  useEffect(() => {
    initializeGame();

    return () => {
      if (gameRef.current) {
        try {
          if (typeof gameRef.current.destroy === 'function') {
            gameRef.current.destroy();
          }
        } catch (error) {
          console.warn('Error during game cleanup:', error);
        }
        gameRef.current = null;
      }
      
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: true });
        } catch (error) {
          console.warn('Error during PIXI cleanup:', error);
        }
        appRef.current = null;
      }
    };
  }, [initializeGame]);

  const handleRetry = async () => {
    setErrorNotification(null);
    await initializeGame();
  };

  const handleManualRetry = async () => {
    if (errorNotification) {
      const success = await errorManager.current.manualRetry(errorNotification.error.id);
      if (success) {
        setErrorNotification(null);
        setGameStatus('再試行中...');
        await initializeGame();
      }
    }
  };

  const dismissError = () => {
    setErrorNotification(null);
  };

  return (
    <div className="enhanced-game-canvas-container">
      {/* メインキャンバス */}
      <div ref={canvasRef} />
      
      {/* エラー通知（強化版） */}
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

            {/* エラー詳細（開発用） */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">技術詳細</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(errorNotification.error, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* ゲーム情報（既存のUIを維持） */}
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
          color: errorNotification ? '#dc2626' : '#52525b', 
          margin: '8px 0',
          fontWeight: '500'
        }}>
          {gameStatus}
        </p>

        {/* パフォーマンス表示（開発モード） */}
        <div className="text-xs text-gray-400 mt-2">
          FPS: {performanceStats.fps} | Memory: {performanceStats.memoryUsage}MB
        </div>

        <button
          onClick={handleRetry}
          disabled={gameStatus.includes('読み込み中')}
          className="mt-3 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 再読み込み
        </button>
      </div>
    </div>
  );
};

export default EnhancedGameCanvas;