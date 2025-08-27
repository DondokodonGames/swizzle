import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameTemplate } from '../game-engine/GameTemplate';
import { GameTemplateFactory } from '../game-engine/GameTemplateFactory';
import { GameConfig } from './GameSelector';

interface GameCanvasProps {
  width?: number;
  height?: number;
  config: GameConfig;
  onGameEnd?: (success?: boolean, score?: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  width = 375, 
  height = 600,
  config,
  onGameEnd
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const gameRef = useRef<GameTemplate | null>(null);
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('読み込み中...');
  const [gameError, setGameError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('GameCanvas: Initializing PIXI Application...');

    // PixiJSアプリケーション初期化（修正版）
    const app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0xfce7ff, // 薄ピンク背景
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // PIXI初期化処理
    const initPixiApp = async () => {
      console.log('GameCanvas: PIXI app initialized, stage exists:', !!app.stage);
      
      appRef.current = app;
      canvasRef.current!.appendChild(app.view as HTMLCanvasElement);

      // ゲーム初期化（非同期対応）
      await initGame();
    };

    const initGame = async () => {
      try {
        setGameStatus('ゲーム準備中...');
        setGameError(null);
        
        console.log('GameCanvas: Starting game initialization...');
        
        // 統一設定で GameTemplateFactory を呼び出し
        const settings = {
          gameType: config.gameType,
          characterType: config.characterType,
          difficulty: config.difficulty,
          duration: config.duration,
          targetScore: config.targetScore
        };

        console.log('GameCanvas: Creating template with settings:', settings);

        // 非同期でテンプレート作成
        const game = await GameTemplateFactory.createTemplate(config.gameType, app, settings);
        
        if (!game) {
          throw new Error('ゲームテンプレートの作成に失敗しました');
        }

        console.log('GameCanvas: Game template created successfully');
        gameRef.current = game;
        
        // コールバック設定の修正
        if (game) {
          console.log('GameCanvas: Setting onGameEnd callback...');
          // CuteTapGameには onGameEnd プロパティが存在するため型アサーション使用
          (game as any).onGameEnd = (success: boolean, score: number) => {
            console.log(`GameCanvas: onGameEnd called - ${success ? 'SUCCESS' : 'FAILED'}, Score: ${score}`);
            setGameStatus('ゲーム終了');
            onGameEnd?.(success, score);
          };
          console.log('GameCanvas: onGameEnd callback set successfully');
        }
        
        // ゲーム初期化
        if (typeof game.createScene === 'function') {
          console.log('GameCanvas: Creating game scene...');
          await game.createScene();
          console.log('GameCanvas: Game scene created');
        }
        
        setIsGameLoaded(true);
        
        // 自動でゲーム開始（スタートボタン不要）
        setTimeout(() => {
          if (gameRef.current && typeof gameRef.current.start === 'function') {
            console.log('GameCanvas: Starting game...');
            gameRef.current.start();
            setGameStatus('ゲーム実行中...');
          } else {
            console.warn('GameCanvas: Game start method not found');
          }
        }, 100);

      } catch (error) {
        console.error('GameCanvas: Game initialization failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'ゲーム読み込みエラー';
        setGameError(errorMessage);
        setGameStatus('エラー');
      }
    };

    // PIXI初期化開始
    initPixiApp().catch((error) => {
      console.error('GameCanvas: PIXI initialization failed:', error);
      setGameError('PIXI初期化エラー');
      setGameStatus('エラー');
    });

    // クリーンアップ関数
    return () => {
      console.log('GameCanvas: Cleaning up...');
      
      if (gameRef.current) {
        if (typeof gameRef.current.destroy === 'function') {
          gameRef.current.destroy();
        }
        gameRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [width, height, config, onGameEnd]);

  // 手動でゲームリスタート
  const handleRestart = async () => {
    if (!appRef.current) return;

    try {
      setGameStatus('再読み込み中...');
      setGameError(null);

      if (gameRef.current) {
        if (typeof gameRef.current.destroy === 'function') {
          gameRef.current.destroy();
        }
        gameRef.current = null;
      }
      
      const settings = {
        gameType: config.gameType,
        characterType: config.characterType,
        difficulty: config.difficulty,
        duration: config.duration,
        targetScore: config.targetScore
      };

      const newGame = await GameTemplateFactory.createTemplate(config.gameType, appRef.current, settings);
      
      if (!newGame) {
        throw new Error('ゲーム再作成に失敗しました');
      }

      gameRef.current = newGame;
      
      // コールバック再設定
      if (newGame) {
        (newGame as any).onGameEnd = (success: boolean, score: number) => {
          setGameStatus('ゲーム終了');
          onGameEnd?.(success, score);
        };
      }
      
      if (typeof newGame.createScene === 'function') {
        await newGame.createScene();
      }
      
      // 自動でゲーム開始
      setTimeout(() => {
        if (gameRef.current && typeof gameRef.current.start === 'function') {
          gameRef.current.start();
          setGameStatus('ゲーム実行中...');
        }
      }, 100);

    } catch (error) {
      console.error('GameCanvas: Game restart failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'ゲーム再起動エラー';
      setGameError(errorMessage);
      setGameStatus('エラー');
    }
  };

  const getCharacterName = () => {
    switch (config.characterType) {
      case 'girl': return '💧 魔法少女';
      case 'animal': return '🐱 猫ちゃん';
      case 'child': return '🧒 元気な子';
      default: return '💧 キャラクター';
    }
  };

  const getDifficultyName = () => {
    switch (config.difficulty) {
      case 'easy': return '😊 簡単モード';
      case 'normal': return '😐 普通モード';
      case 'hard': return '😤 難しいモード';
      default: return '😐 普通モード';
    }
  };

  const getGameTypeName = () => {
    // config.gameType から表示名を生成
    const gameTypeNames: Record<string, string> = {
      'cute_tap': 'キュートタップ',
      'memory_match': 'メモリーマッチ',
      'quick_dodge': 'クイックドッジ',
      'timing_perfect': 'パーフェクトタイミング',
      'collect_items': 'アイテムコレクト',
      'jump_adventure': 'ジャンプアドベンチャー',
      'friendly_shoot': 'フレンドリーシュート',
      'animal_chase': 'アニマルチェイス',
      'rainbow_match': 'レインボーマッチ',
      'puzzle_princess': 'パズルプリンセス',
      'speed_friend': 'スピードフレンド',
      'spot_difference': 'スポットザディファレンス',
      'opposite_action': 'オポジットアクション',
      'count_star': 'カウントスター',
      'number_hunt': 'ナンバーハント',
      'order_master': 'オーダーマスター',
      'size_perfect': 'サイズパーフェクト',
      'dreamy_jump': 'ドリーミージャンプ',
      'magical_collect': 'マジカルコレクト',
      'balance_game': 'バランスゲーム'
    };

    return gameTypeNames[config.gameType] || config.gameType;
  };

  return (
    <div className="game-canvas-container">
      <div ref={canvasRef} />
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
          🌟 {getGameTypeName()}
        </h3>
        
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          padding: '10px',
          margin: '10px 0',
          fontSize: '13px'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>キャラクター:</strong> {getCharacterName()}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>難易度:</strong> {getDifficultyName()}
          </div>
          <div>
            <strong>目標:</strong> {config.targetScore}点 / {config.duration}秒
          </div>
        </div>

        <p style={{ 
          fontSize: '14px', 
          color: gameError ? '#dc2626' : '#52525b', 
          margin: '8px 0',
          fontWeight: '500'
        }}>
          {gameError || gameStatus}
        </p>

        {gameError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '10px',
            margin: '10px 0',
            fontSize: '12px',
            color: '#dc2626'
          }}>
            エラー: {gameError}
          </div>
        )}

        <div style={{ marginTop: '15px' }}>
          <button
            onClick={handleRestart}
            disabled={gameStatus === '読み込み中...' || gameStatus === '再読み込み中...'}
            style={{
              backgroundColor: gameError ? '#ef4444' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: gameStatus.includes('読み込み中') ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: gameStatus.includes('読み込み中') ? 0.6 : 1
            }}
          >
            {gameError ? '🔄 エラー解決を試す' : '🔄 もう一回プレイ'}
          </button>
        </div>

        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          marginTop: '15px',
          lineHeight: '1.4'
        }}>
          <p>💡 <strong>遊び方:</strong></p>
          <p>キャラクターをタップしてリアクションを楽しもう！</p>
          <p>制限時間内に目標スコアを達成できるかな？</p>
          {gameError && (
            <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
              ※ エラーが発生した場合は「エラー解決を試す」ボタンをクリック
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;