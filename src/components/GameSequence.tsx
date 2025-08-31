import React, { useState, useEffect, useRef } from 'react';
import EnhancedGameCanvas from './EnhancedGameCanvas';
import { GameConfig } from './GameSelector';
import { GameTemplateFactory, GameType, TemplateInfo } from '../game-engine/GameTemplateFactory';

interface GameSequenceItem {
  id: string;
  templateInfo: TemplateInfo;
  config: GameConfig;
  creator: string;
}

interface GameSequenceProps {
  onExit?: () => void;
}

const GameSequence: React.FC<GameSequenceProps> = ({ onExit }) => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [showInstruction, setShowInstruction] = useState(true);
  const [instructionCountdown, setInstructionCountdown] = useState(2);
  const [gameResult, setGameResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gameSequence, setGameSequence] = useState<GameSequenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
    }
  }, [showInstruction, instructionCountdown]);

  // ゲーム終了時の処理
  const handleGameEnd = (success?: boolean, score?: number) => {
    console.log('Game ended:', success, score);
    
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

  // スキップ機能
  const handleSkip = () => {
    if (showInstruction) {
      setShowInstruction(false);
      setInstructionCountdown(0);
    } else {
      // ゲーム中のスキップ
      handleGameEnd(false, 0);
    }
  };

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
        textAlign: 'center'
      }}>
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

  // 指示画面（簡素化版）
  if (showInstruction) {
    return (
      <div style={{
        height: '600px',
        background: '#fce7ff',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#a21caf',
        position: 'relative'
      }}>
        {/* 簡素化されたゲーム指示 */}
        <div style={{
          fontSize: '80px',
          marginBottom: '20px'
        }}>
          🎮
        </div>

        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          {currentGame.templateInfo.instruction}
        </div>

        <div style={{
          fontSize: '14px',
          opacity: 0.8,
          textAlign: 'center'
        }}>
          {instructionCountdown > 0 ? `${instructionCountdown}秒後に開始...` : '開始中...'}
        </div>
      </div>
    );
  }

  // ゲーム実行画面（新UI適用）
  return (
    <div style={{ position: 'relative' }}>
      <EnhancedGameCanvas 
        key={gameKey}
        config={currentGame.config}
        onGameEnd={handleGameEnd}
        onSkip={handleSkip}
        onExit={onExit}
      />
    </div>
  );
};

export default GameSequence;