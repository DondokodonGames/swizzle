import React, { useState, useEffect, useRef } from 'react';
import EnhancedGameCanvas from './EnhancedGameCanvas';
import { GameConfig } from './GameSelector';
import { GameTemplateFactory, GameType, TemplateInfo } from '../game-engine/GameTemplateFactory';
import RandomGameManager from '../managers/RandomGameManager';

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
  const [currentGame, setCurrentGame] = useState<GameSequenceItem | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [showInstruction, setShowInstruction] = useState(true);
  const [instructionCountdown, setInstructionCountdown] = useState(1); // 2秒→1秒短縮
  const [gameResult, setGameResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // RandomGameManagerインスタンス
  const gameManagerRef = useRef<RandomGameManager>(RandomGameManager.getInstance());

  // 次のゲーム生成（RandomGameManager使用）
  const generateNextGame = async (): Promise<GameSequenceItem> => {
    try {
      const gameManager = gameManagerRef.current;
      const gameConfig = gameManager.getNextRandomGame();
      
      // テンプレート情報取得
      const allTemplates = await GameTemplateFactory.getAllTemplates();
      const templateInfo = allTemplates.find(t => t.id === gameConfig.gameType);
      
      if (!templateInfo) {
        throw new Error(`テンプレート ${gameConfig.gameType} が見つかりません`);
      }

      // 作者名を適用（RandomGameManagerで生成された値またはデフォルト）
      const creators = ['あいうえお', 'ねこすき', 'たのしい', 'はやい', 'どうぶつ', 'まほう', 'げーまー'];
      const creator = creators[Math.floor(Math.random() * creators.length)];

      const gameItem: GameSequenceItem = {
        id: `${templateInfo.id}_${Date.now()}`,
        templateInfo,
        config: gameConfig,
        creator
      };

      console.log('RandomGameManager統合: 新しいゲーム生成', {
        template: templateInfo.name,
        characterType: gameConfig.characterType,
        creator,
        status: gameManager.getStatus()
      });

      return gameItem;
    } catch (error) {
      console.error('ゲーム生成エラー:', error);
      throw error;
    }
  };

  // 初期化処理（RandomGameManager初期化）
  useEffect(() => {
    const initializeRandomGameManager = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('RandomGameManager統合: 初期化開始...');
        const gameManager = gameManagerRef.current;
        
        // 全テンプレート読み込み
        await gameManager.loadAllTemplates();
        
        // 最初のゲーム生成
        const firstGame = await generateNextGame();
        setCurrentGame(firstGame);
        
        console.log('RandomGameManager統合: 初期化完了');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
        setError(errorMessage);
        console.error('初期化エラー:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRandomGameManager();
  }, []);

  // 指示画面のカウントダウン（2秒→1秒に短縮予定）
  useEffect(() => {
    if (showInstruction && instructionCountdown > 0) {
      const timer = setTimeout(() => {
        setInstructionCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showInstruction && instructionCountdown === 0) {
      // 指示終了 → ゲーム開始
      setShowInstruction(false);
    }
  }, [showInstruction, instructionCountdown]);

  // ゲーム終了時の処理（RandomGameManager統合）
  const handleGameEnd = async (success?: boolean, score?: number) => {
    console.log('Game ended:', success, score);
    
    // 結果表示
    const message = success ? 
      `🎉 やったね！\nスコア: ${score || 0}` : 
      `😅 惜しい！\nスコア: ${score || 0}`;
    
    setGameResult({ success: success || false, message });
    
    // 次のゲーム事前準備（プリロード）
    try {
      const nextGame = await generateNextGame();
      
      // 0.5秒後に次のゲームへ（高速化）
      setTimeout(() => {
        setGameResult(null);
        setCurrentGame(nextGame);
        setGameKey(prev => prev + 1);
        setShowInstruction(true);
        setInstructionCountdown(1); // 1秒に短縮
      }, 500); // 1.5秒→0.5秒短縮
    } catch (error) {
      console.error('次のゲーム準備エラー:', error);
      setError('次のゲームの準備に失敗しました');
    }
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
          RandomGameManager準備中...
        </div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>
          全20テンプレート読み込み中
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
  if (error || !currentGame) {
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
          RandomGameManager エラー
        </div>
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.8,
          maxWidth: '300px',
          marginBottom: '20px'
        }}>
          {error || 'ゲーム生成に失敗しました'}
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
          次のランダムゲームまで... (高速遷移)
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
          fontSize: '12px',
          opacity: 0.6,
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          {currentGame.templateInfo.name} - {currentGame.creator}作
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

  // ゲーム実行画面（RandomGameManager統合）
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