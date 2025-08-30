import React, { useState, useEffect, useRef } from 'react';
import EnhancedGameCanvas from './EnhancedGameCanvas'; // 変更: GameCanvas → EnhancedGameCanvas
import { GameConfig } from './GameSelector';
import { GameTemplateFactory, GameType, TemplateInfo } from '../game-engine/GameTemplateFactory';

// Week 2新機能: 音量設定の型定義
interface VolumeSettings {
  bgm: number
  se: number
  muted: boolean
}

interface GameSequenceItem {
  id: string;
  templateInfo: TemplateInfo;
  config: GameConfig;
  creator: string;
}

interface GameSequenceProps {
  onExit?: () => void;
  // Week 2新機能: 音量設定Props
  volumeSettings?: VolumeSettings;
  onVolumeChange?: (settings: VolumeSettings) => void;
}

const GameSequence: React.FC<GameSequenceProps> = ({ 
  onExit,
  // Week 2新機能: 音量設定のデフォルト値
  volumeSettings = { bgm: 0.7, se: 0.8, muted: false },
  onVolumeChange
}) => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [showInstruction, setShowInstruction] = useState(true);
  const [instructionCountdown, setInstructionCountdown] = useState(2);
  const [gameResult, setGameResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gameSequence, setGameSequence] = useState<GameSequenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week 2新機能: タイマー関連状態
  const [remainingTime, setRemainingTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 動的にテンプレートを生成するゲームシーケンス（非同期対応）
  const generateGameSequence = async (): Promise<GameSequenceItem[]> => {
    try {
      const templates = await GameTemplateFactory.getAllTemplates();
      
      if (!templates || templates.length === 0) {
        throw new Error('テンプレートが見つかりません');
      }

      const characterTypes: ('girl' | 'animal' | 'child')[] = ['girl', 'animal', 'child'];
      const creators = ['あいうえお', 'ねこすき', 'たのしい', 'はやい', 'どうぶつ', 'まほう', 'げーまー'];
      
      return templates.slice(0, 5).map((template, index) => {
        const characterType = characterTypes[index % characterTypes.length];
        return {
          id: `${template.id}_${index}`,
          templateInfo: template,
          config: {
            gameType: template.id as any,
            characterType,
            difficulty: template.defaultSettings.difficulty,
            duration: template.defaultSettings.duration,
            targetScore: template.defaultSettings.targetScore
          },
          creator: creators[index % creators.length]
        };
      });
    } catch (error) {
      console.error('ゲームシーケンス生成エラー:', error);
      throw error;
    }
  };

  // 初期化処理
  useEffect(() => {
    const initializeGameSequence = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('ゲームシーケンスを初期化中...');
        const sequence = await generateGameSequence();
        setGameSequence(sequence);
        console.log(`${sequence.length}個のゲームでシーケンス初期化完了`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
        setError(errorMessage);
        console.error('初期化エラー:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeGameSequence();
  }, []);

  // Week 2新機能: 音量設定変更の監視
  useEffect(() => {
    // グローバル音量設定の更新（EnhancedGameCanvasとの連携用）
    if (typeof window !== 'undefined') {
      (window as any).gameVolumeSettings = volumeSettings;
    }
    
    console.log('GameSequence: 音量設定更新', volumeSettings);
  }, [volumeSettings]);

  // Week 2新機能: タイマー管理
  const startGameTimer = (duration: number) => {
    setTotalTime(duration);
    setRemainingTime(duration);
    setIsGamePlaying(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          // タイマー終了 - ゲーム自動終了
          clearInterval(timerRef.current!);
          setIsGamePlaying(false);
          handleGameEnd(false, 0); // タイムアップは失敗扱い
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Week 2新機能: タイマー停止
  const stopGameTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsGamePlaying(false);
  };

  const currentGame = gameSequence[currentGameIndex];

  // 指示画面のカウントダウン（2秒）
  useEffect(() => {
    if (showInstruction && instructionCountdown > 0) {
      const timer = setTimeout(() => {
        setInstructionCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showInstruction && instructionCountdown === 0) {
      // 指示終了 → ゲーム開始（EnhancedGameCanvasが自動で開始）
      setShowInstruction(false);
      // Week 2新機能: ゲーム開始時にタイマー開始
      if (currentGame) {
        startGameTimer(currentGame.config.duration || 15);
      }
    }
  }, [showInstruction, instructionCountdown, currentGame]);

  // ゲーム終了時の処理
  const handleGameEnd = (success?: boolean, score?: number) => {
    console.log('Game ended:', success, score);
    
    // Week 2新機能: タイマー停止
    stopGameTimer();
    
    // 結果表示
    const message = success ? 
      `🎉 やったね！\nスコア: ${score || 0}` : 
      `😅 惜しい！\nスコア: ${score || 0}`;
    
    setGameResult({ success: success || false, message });
    
    // 1.5秒後に次のゲームへ
    setTimeout(() => {
      setGameResult(null);
      const nextIndex = (currentGameIndex + 1) % gameSequence.length;
      setCurrentGameIndex(nextIndex);
      setGameKey(prev => prev + 1);
      setShowInstruction(true);
      setInstructionCountdown(2);
    }, 1500);
  };

  // Week 2新機能: スキップ機能
  const handleSkip = () => {
    if (showInstruction) {
      setShowInstruction(false);
      setInstructionCountdown(0);
    } else if (isGamePlaying) {
      // ゲーム中のスキップ
      stopGameTimer();
      handleGameEnd(false, 0);
    }
  };

  // Week 2新機能: 緊急退出（音量設定保存付き）
  const handleExitWithVolumePreservation = () => {
    stopGameTimer();
    if (onExit) {
      onExit();
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // ローディング画面
  if (isLoading) {
    return (
      <div style={{
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '18px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '60px',
          marginBottom: '20px',
          animation: 'spin 2s linear infinite'
        }}>
          🎮
        </div>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
          ゲームを準備中...
        </div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>
          テンプレート読み込み中
        </div>
        {/* Week 2新機能: 音量設定表示 */}
        <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '10px' }}>
          🔊 音量: {volumeSettings.muted ? 'ミュート' : `BGM ${Math.round(volumeSettings.bgm * 100)}% SE ${Math.round(volumeSettings.se * 100)}%`}
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // エラー画面
  if (error || gameSequence.length === 0) {
    return (
      <div style={{
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '18px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '60px',
          marginBottom: '20px'
        }}>
          ❌
        </div>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
          読み込みエラー
        </div>
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.8,
          maxWidth: '300px',
          marginBottom: '20px'
        }}>
          {error || 'ゲームテンプレートが見つかりません'}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '10px 20px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          リロードして再試行
        </button>
      </div>
    );
  }

  // 結果表示画面
  if (gameResult) {
    return (
      <div style={{
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: gameResult.success ? 
          'linear-gradient(135deg, #10b981 0%, #047857 100%)' :
          'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Week 2新機能: 音量インジケーター付き終了ボタン */}
        <button
          onClick={handleExitWithVolumePreservation}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            padding: '5px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          {volumeSettings.muted ? '🔇' : '🔊'} 終了
        </button>

        <div style={{ 
          fontSize: '80px', 
          marginBottom: '20px',
          textShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          {gameResult.success ? '🎉' : '😅'}
        </div>
        
        <div style={{
          whiteSpace: 'pre-line',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          lineHeight: '1.4'
        }}>
          {gameResult.message}
        </div>

        <div style={{
          position: 'absolute',
          bottom: '20px',
          fontSize: '14px',
          opacity: 0.8
        }}>
          次のゲームまで...
        </div>
      </div>
    );
  }

  // 指示画面
  if (showInstruction) {
    return (
      <div style={{
        height: '600px',
        background: `linear-gradient(135deg, 
          ${currentGame.config.characterType === 'girl' ? '#fce7ff, #d946ef' : 
            currentGame.config.characterType === 'animal' ? '#fff7ed, #f97316' : 
            '#f0f9ff, #0ea5e9'})`,
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        position: 'relative',
        userSelect: 'none'
      }}>
        {/* Week 2新機能: 音量インジケーター付き終了ボタン */}
        <button
          onClick={handleExitWithVolumePreservation}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            padding: '5px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          {volumeSettings.muted ? '🔇' : '🔊'} 終了
        </button>

        {/* Week 2新機能: スキップボタン（改良版） */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          ⭐ スキップ
        </button>

        {/* キャラクター表示 */}
        <div style={{
          fontSize: '100px',
          marginBottom: '30px',
          textShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          {currentGame.config.characterType === 'girl' ? '👧' : 
           currentGame.config.characterType === 'animal' ? '🐱' : '🧒'}
        </div>

        {/* ゲーム指示 */}
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: '1.4',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          marginBottom: '20px',
          whiteSpace: 'pre-line'
        }}>
          {currentGame.templateInfo.instruction}
        </div>

        {/* 目標表示 */}
        <div style={{
          fontSize: '16px',
          opacity: 0.9,
          textAlign: 'center',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '20px',
          padding: '10px 20px',
          backdropFilter: 'blur(10px)'
        }}>
          目標: {currentGame.config.targetScore}回 / {currentGame.config.duration}秒
        </div>

        {/* 進行状況と音量表示 */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          fontSize: '12px',
          opacity: 0.8
        }}>
          <div>ゲーム {currentGameIndex + 1} / {gameSequence.length}</div>
          {/* Week 2新機能: 音量表示 */}
          <div style={{ marginTop: '4px' }}>
            🔊 {volumeSettings.muted ? 'ミュート' : `${Math.round(volumeSettings.bgm * 100)}%`}
          </div>
        </div>
      </div>
    );
  }

  // Week 2新機能: タイマープログレス計算
  const timerProgress = totalTime > 0 ? (remainingTime / totalTime) * 100 : 100;

  // ゲーム実行画面
  return (
    <div style={{ position: 'relative' }}>
      {/* Week 2新機能: ゲームヘッダー（音量・タイマー・ボタン統合） */}
      {isGamePlaying && (
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          background: 'linear-gradient(90deg, #8b5cf6, #d946ef)',
          color: 'white',
          padding: '8px 12px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* 左側: ゲーム情報・音量表示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <span style={{ fontWeight: '600' }}>
              ゲーム {currentGameIndex + 1}/{gameSequence.length}
            </span>
            <span style={{ opacity: 0.8 }}>
              {volumeSettings.muted ? '🔇' : '🔊'} {Math.round(volumeSettings.bgm * 100)}%
            </span>
            <span style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: '2px 6px', 
              borderRadius: '8px',
              fontFamily: 'monospace'
            }}>
              ⏱️ {remainingTime}s
            </span>
          </div>

          {/* 右側: スキップ・終了ボタン */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleSkip}
              style={{
                background: 'rgba(255, 193, 7, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ⏭️ スキップ
            </button>
            <button
              onClick={handleExitWithVolumePreservation}
              style={{
                background: 'rgba(239, 68, 68, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ❌ 終了
            </button>
          </div>
        </div>
      )}

      {/* メインゲームキャンバス */}
      <div style={{ marginTop: isGamePlaying ? '40px' : '0' }}>
        <EnhancedGameCanvas 
          key={gameKey}
          config={currentGame.config}
          onGameEnd={handleGameEnd}
          volumeSettings={volumeSettings} // Week 2新機能: 音量設定を渡す
        />
      </div>

      {/* Week 2新機能: タイマーバー */}
      {isGamePlaying && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '6px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: timerProgress > 50 
              ? 'linear-gradient(90deg, #10b981, #059669)' 
              : timerProgress > 25
              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
              : 'linear-gradient(90deg, #ef4444, #dc2626)',
            width: `${timerProgress}%`,
            transition: 'width 1s linear'
          }} />
        </div>
      )}

      {/* Week 2新機能: 開発モード用デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontFamily: 'monospace'
        }}>
          Week2統合: 🔊{Math.round(volumeSettings.bgm * 100)}% ⏱️{remainingTime}s 🎮{gameKey}
        </div>
      )}
    </div>
  );
};

export default GameSequence;