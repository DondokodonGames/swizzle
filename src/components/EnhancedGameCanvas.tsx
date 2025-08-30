import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GameTemplate } from '../game-engine/GameTemplate';
import { GameTemplateFactory } from '../game-engine/GameTemplateFactory';
import { GameConfig } from './GameSelector';
import { GameErrorManager, GameError } from '../game-engine/GameErrorManager';

// Week 2新機能: 音量設定の型定義
interface VolumeSettings {
  bgm: number
  se: number
  muted: boolean
}

interface EnhancedGameCanvasProps {
  width?: number;
  height?: number;
  config: GameConfig;
  onGameEnd?: (success?: boolean, score?: number) => void;
  // Week 2新機能: 音量設定Props
  volumeSettings?: VolumeSettings;
}

interface ErrorNotification {
  error: GameError;
  message: string;
  canRetry: boolean;
  userAction?: string;
}

// Week 2新機能: タッチエフェクト用の型定義
interface TouchEffect {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

const EnhancedGameCanvas: React.FC<EnhancedGameCanvasProps> = ({ 
  width = 375, 
  height = 600,
  config,
  onGameEnd,
  // Week 2新機能: 音量設定のデフォルト値
  volumeSettings = { bgm: 0.7, se: 0.8, muted: false }
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const gameRef = useRef<GameTemplate | null>(null);
  const errorManager = useRef(GameErrorManager.getInstance());
  
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('読み込み中...');
  const [errorNotification, setErrorNotification] = useState<ErrorNotification | null>(null);
  const [performanceStats, setPerformanceStats] = useState({ fps: 60, memoryUsage: 0 });
  
  // Week 2新機能: タッチエフェクト状態管理
  const [touchEffects, setTouchEffects] = useState<TouchEffect[]>([]);

  // Week 2新機能: タッチエフェクト生成関数
  const createTouchEffect = useCallback((x: number, y: number) => {
    const effectId = Date.now() + Math.random();
    const newEffect: TouchEffect = {
      id: effectId,
      x,
      y,
      timestamp: Date.now()
    };

    setTouchEffects(prev => [...prev, newEffect]);
    
    // 1秒後に自動削除
    setTimeout(() => {
      setTouchEffects(prev => prev.filter(effect => effect.id !== effectId));
    }, 1000);

    // Week 2新機能: タッチ音効果再生（音量設定適用）
    if (!volumeSettings.muted && volumeSettings.se > 0) {
      playTouchSound();
    }
  }, [volumeSettings]);

  // Week 2新機能: タッチ音再生関数
  const playTouchSound = useCallback(() => {
    // 簡単なWeb Audio APIを使った効果音
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800Hz の音
      gainNode.gain.setValueAtTime(volumeSettings.se * 0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('タッチ音再生エラー:', error);
    }
  }, [volumeSettings.se]);

  // Week 2新機能: DOM イベントハンドラ（TypeScriptエラー修正）
  const handleDOMTouchStart = useCallback((event: Event) => {
    const touchEvent = event as TouchEvent;
    if (!canvasRef.current || !touchEvent.touches[0]) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const touch = touchEvent.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    createTouchEffect(x, y);
  }, [createTouchEffect]);

  const handleDOMMouseDown = useCallback((event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = mouseEvent.clientX - rect.left;
    const y = mouseEvent.clientY - rect.top;
    
    createTouchEffect(x, y);
  }, [createTouchEffect]);

  // Week 2新機能: React イベントハンドラ（予備用）
  const handleCanvasInteraction = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;
    
    if (clientX !== undefined && clientY !== undefined) {
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      createTouchEffect(x, y);
    }
  }, [createTouchEffect]);

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

  // Week 2新機能: 音量設定変更時の処理
  useEffect(() => {
    // グローバル音量設定の更新
    if (typeof window !== 'undefined') {
      (window as any).gameVolumeSettings = volumeSettings;
    }

    // 既存のゲームインスタンスに音量設定を適用
    if (gameRef.current && typeof (gameRef.current as any).updateVolume === 'function') {
      (gameRef.current as any).updateVolume(volumeSettings);
    }

    console.log('EnhancedGameCanvas: 音量設定適用', volumeSettings);
  }, [volumeSettings]);

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

      // Week 2新機能: キャンバスにDOMイベントリスナー追加（TypeScriptエラー修正済み）
      const canvas = app.view as HTMLCanvasElement;
      canvas.addEventListener('touchstart', handleDOMTouchStart);
      canvas.addEventListener('mousedown', handleDOMMouseDown);
      canvas.style.touchAction = 'none'; // スクロール防止

      setGameStatus('ゲーム準備中...');

      // ゲーム設定（Week 2新機能: 音量設定を含む）
      const settings = {
        gameType: config.gameType,
        characterType: config.characterType,
        difficulty: config.difficulty,
        duration: config.duration,
        targetScore: config.targetScore,
        // Week 2新機能: 音量設定を settings に含める
        volumeSettings: volumeSettings
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

      // Week 2新機能: ゲームインスタンスに音量更新メソッドを追加
      if (typeof (game as any).updateVolume !== 'function') {
        (game as any).updateVolume = (newVolumeSettings: VolumeSettings) => {
          console.log('Game instance volume updated:', newVolumeSettings);
          // ゲーム内音量設定の更新処理
          // TODO: 実際のPixiJS Sound統合時に実装
        };
      }

      // コールバック設定（Week 2新機能: 音量設定考慮）
      (game as any).onGameEnd = (success: boolean, score: number) => {
        setGameStatus('ゲーム終了');
        
        // Week 2新機能: ゲーム終了音（成功・失敗で異なる音）
        if (!volumeSettings.muted && volumeSettings.se > 0) {
          playGameEndSound(success);
        }
        
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
          
          // Week 2新機能: ゲーム開始音
          if (!volumeSettings.muted && volumeSettings.bgm > 0) {
            playGameStartSound();
          }
        }
      }, 500);

    } catch (error) {
      // Week 2修正: GameErrorContextから volumeSettings を除外（型エラー解消）
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
  }, [width, height, config, onGameEnd, handleDOMTouchStart, handleDOMMouseDown, volumeSettings]);

  // Week 2新機能: ゲーム開始音
  const playGameStartSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 上昇音階で開始感を演出
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(volumeSettings.bgm * 0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('ゲーム開始音再生エラー:', error);
    }
  }, [volumeSettings.bgm]);

  // Week 2新機能: ゲーム終了音
  const playGameEndSound = useCallback((success: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (success) {
        // 成功: 上昇音階
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(659, audioContext.currentTime + 0.2); // E5
        oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.4); // G5
      } else {
        // 失敗: 下降音階
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.exponentialRampToValueAtTime(349, audioContext.currentTime + 0.3); // F4
      }
      
      gainNode.gain.setValueAtTime(volumeSettings.se * 0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('ゲーム終了音再生エラー:', error);
    }
  }, [volumeSettings.se]);

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
          // Week 2新機能: イベントリスナークリーンアップ（TypeScriptエラー修正済み）
          const canvas = appRef.current.view as HTMLCanvasElement;
          if (canvas) {
            canvas.removeEventListener('touchstart', handleDOMTouchStart);
            canvas.removeEventListener('mousedown', handleDOMMouseDown);
          }
          
          appRef.current.destroy(true, { children: true, texture: true });
        } catch (error) {
          console.warn('Error during PIXI cleanup:', error);
        }
        appRef.current = null;
      }
    };
  }, [initializeGame, handleDOMTouchStart, handleDOMMouseDown]);

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
    <div className="enhanced-game-canvas-container" style={{ position: 'relative' }}>
      {/* メインキャンバス */}
      <div 
        ref={canvasRef}
        style={{ position: 'relative' }}
        onTouchStart={handleCanvasInteraction}
        onMouseDown={handleCanvasInteraction}
      />
      
      {/* Week 2新機能: タッチエフェクト */}
      {touchEffects.map(effect => (
        <div
          key={effect.id}
          style={{
            position: 'absolute',
            left: effect.x - 20,
            top: effect.y - 20,
            width: 40,
            height: 40,
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: volumeSettings.muted 
                ? 'radial-gradient(circle, rgba(156, 163, 175, 0.6) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
              borderRadius: '50%',
              animation: 'ripple 1s ease-out',
              transform: 'scale(0)'
            }}
          />
        </div>
      ))}
      
      {/* Week 2新機能: 音量インジケーター */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span>{volumeSettings.muted ? '🔇' : '🔊'}</span>
        {!volumeSettings.muted && (
          <span style={{ fontFamily: 'monospace' }}>
            {Math.round(volumeSettings.bgm * 100)}%
          </span>
        )}
      </div>
      
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
              {/* Week 2新機能: 音量設定状態も表示 */}
              <p className="text-xs text-gray-500 mt-2">
                音量設定: {volumeSettings.muted ? 'ミュート' : `BGM ${Math.round(volumeSettings.bgm * 100)}% SE ${Math.round(volumeSettings.se * 100)}%`}
              </p>
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

      {/* ゲーム情報（既存のUIを維持 + Week 2機能追加） */}
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

        {/* Week 2新機能: 音量設定表示 */}
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          margin: '4px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{volumeSettings.muted ? '🔇 ミュート' : '🔊 音量ON'}</span>
          {!volumeSettings.muted && (
            <span style={{ fontFamily: 'monospace' }}>
              BGM:{Math.round(volumeSettings.bgm * 100)}% SE:{Math.round(volumeSettings.se * 100)}%
            </span>
          )}
        </div>

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

      {/* Week 2新機能: タッチエフェクト用CSS */}
      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedGameCanvas;