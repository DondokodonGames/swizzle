// src/social/components/IntegratedGamePlayer.tsx
// TikTok風統合ゲームプレイヤー - EditorGameBridge統合版

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ModernButton } from '../../components/ui/ModernButton';
import { ModernCard } from '../../components/ui/ModernCard';
import { PublicGame } from '../types/SocialTypes';
import { SocialService } from '../services/SocialService';
import { EditorGameBridge, GameExecutionResult } from '../../services/editor/EditorGameBridge';
import { GameProject, createDefaultGameProject } from '../../types/editor/GameProject';
import { createDefaultInitialState } from '../../types/editor/GameScript';

interface IntegratedGamePlayerProps {
  gameData: PublicGame;
  onClose: () => void;
  onNextGame: () => void;
}

// PublicGame → GameProject変換関数
const convertPublicGameToGameProject = (publicGame: PublicGame): GameProject => {
  console.log('🔄 PublicGame → GameProject変換開始:', publicGame.title);
  
  try {
    // createDefaultGameProjectを使用して基本構造作成
    const baseProject = createDefaultGameProject(
      publicGame.title || 'Untitled Game',
      publicGame.author?.id
    );
    
    // PublicGameのデータでカスタマイズ
    const customizedProject: GameProject = {
      ...baseProject,
      id: publicGame.id,
      name: publicGame.title,
      description: publicGame.description,
      
      // 作成者情報
      creator: {
        userId: publicGame.author?.id,
        username: publicGame.author?.name || 'Unknown',
        isAnonymous: !publicGame.author?.id
      },
      
      // 設定更新
      settings: {
        ...baseProject.settings,
        name: publicGame.title,
        description: publicGame.description,
        publishing: {
          ...baseProject.settings.publishing,
          isPublished: true, // PublicGameなので公開済み
          visibility: 'public',
          tags: publicGame.tags || []
        }
      },
      
      // 簡易ゲーム要素（最小限でゲームが動作するように）
      assets: {
        ...baseProject.assets,
        background: publicGame.thumbnail ? {
          id: 'bg_' + publicGame.id,
          name: 'Background',
          frames: [{
            id: 'frame_0',
            dataUrl: publicGame.thumbnail,
            originalName: 'thumbnail.png',
            width: 360,
            height: 640,
            fileSize: 1000, // 仮の値
            uploadedAt: publicGame.createdAt
          }],
          animationSettings: {
            speed: 12,
            loop: false,
            pingPong: false,
            autoStart: false
          },
          totalSize: 1000,
          createdAt: publicGame.createdAt,
          lastModified: publicGame.updatedAt
        } : null,
        
        // デモ用オブジェクト（タップ可能なターゲット）
        objects: [{
          id: 'target_obj',
          name: 'ターゲット',
          frames: [{
            id: 'target_frame',
            dataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiNGRjZCMzUiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxyZWN0IHg9IjI4IiB5PSIyOCIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI0ZGRiIgcng9IjIiLz4KPC9zdmc+', // オレンジ色のターゲット
            originalName: 'target.svg',
            width: 64,
            height: 64,
            fileSize: 500,
            uploadedAt: publicGame.createdAt
          }],
          animationSettings: {
            speed: 12,
            loop: false,
            pingPong: false,
            autoStart: false
          },
          totalSize: 500,
          createdAt: publicGame.createdAt,
          lastModified: publicGame.updatedAt,
          collisionBox: { x: 0, y: 0, width: 64, height: 64 },
          defaultScale: 1.0,
          defaultOpacity: 1.0
        }]
      },
      
      // 簡易ゲームルール（タップでスコア獲得）
      script: {
        ...baseProject.script,
        rules: [{
          id: 'tap_rule_' + publicGame.id,
          name: 'タップでスコア獲得',
          enabled: true,
          priority: 10,
          targetObjectId: 'target_obj',
          triggers: {
            operator: 'AND',
            conditions: [{
              type: 'touch',
              target: 'target_obj',
              touchType: 'down'
            }]
          },
          actions: [{
            type: 'addScore',
            points: 10
          }, {
            type: 'move',
            targetId: 'target_obj',
            movement: {
              type: 'teleport',
              target: { x: Math.random(), y: Math.random() },
              speed: 0
            }
          }],
          createdAt: publicGame.createdAt,
          lastModified: publicGame.updatedAt
        }],
        
        successConditions: [{
          id: 'score_success_' + publicGame.id,
          name: 'スコア100点で成功',
          operator: 'AND',
          conditions: [{
            type: 'score',
            scoreValue: 100,
            scoreComparison: '>='
          }],
          successSettings: {
            autoEnd: true,
            delay: 1,
            message: 'ゲームクリア！',
            score: 50
          }
        }]
      }
    };
    
    console.log('✅ PublicGame → GameProject変換完了');
    return customizedProject;
    
  } catch (error) {
    console.error('❌ PublicGame変換エラー:', error);
    
    // フォールバック: 最小限のプロジェクト
    const fallbackProject = createDefaultGameProject('Demo Game', 'anonymous');
    return {
      ...fallbackProject,
      id: publicGame.id,
      name: publicGame.title || 'Demo Game'
    };
  }
};

export const IntegratedGamePlayer: React.FC<IntegratedGamePlayerProps> = ({
  gameData,
  onClose,
  onNextGame
}) => {
  // 状態管理
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'bridge' | 'error'>('loading');
  const [gameResult, setGameResult] = useState<GameExecutionResult | null>(null);
  const [bridgeTimeLeft, setBridgeTimeLeft] = useState(8);
  const [error, setError] = useState<string | null>(null);
  
  // ソーシャル状態
  const [isLiked, setIsLiked] = useState(gameData.isLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(gameData.isBookmarked || false);
  const [socialActions, setSocialActions] = useState({
    likes: gameData.stats.likes,
    shares: gameData.stats.shares,
    bookmarks: gameData.stats.bookmarks,
    views: gameData.stats.views
  });
  
  // Refs
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const bridgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);
  const gameBridge = useMemo(() => EditorGameBridge.getInstance(), []);
  
  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!gameContainerRef.current) return;
    
    try {
      setGameState('loading');
      setError(null);
      
      console.log('🎮 ゲーム開始:', gameData.title);
      
      // PublicGame → GameProject変換
      const gameProject = convertPublicGameToGameProject(gameData);
      
      // EditorGameBridgeでゲーム実行
      await gameBridge.launchFullGame(
        gameProject,
        gameContainerRef.current,
        (result: GameExecutionResult) => {
          console.log('🎯 ゲーム終了:', result);
          setGameResult(result);
          setGameState('bridge');
          startBridgeTimer();
        }
      );
      
      setGameState('playing');
      
    } catch (err) {
      console.error('❌ ゲーム開始エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
      setGameState('error');
    }
  }, [gameData, gameBridge]);
  
  // ブリッジタイマー開始
  const startBridgeTimer = useCallback(() => {
    setBridgeTimeLeft(8);
    
    bridgeTimerRef.current = setInterval(() => {
      setBridgeTimeLeft(prev => {
        if (prev <= 1) {
          if (bridgeTimerRef.current) {
            clearInterval(bridgeTimerRef.current);
            bridgeTimerRef.current = null;
          }
          onNextGame(); // 自動で次のゲームへ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onNextGame]);
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (bridgeTimerRef.current) {
        clearInterval(bridgeTimerRef.current);
      }
      gameBridge.reset();
    };
  }, [gameBridge]);
  
  // 初回ロード時にゲーム開始
  useEffect(() => {
    startGame();
  }, [startGame]);
  
  // ソーシャルアクション
  const handleLike = useCallback(async () => {
    try {
      const result = await socialService.toggleLike(gameData.id, 'current-user');
      setIsLiked(result.isLiked);
      setSocialActions(prev => ({ ...prev, likes: result.newCount }));
    } catch (err) {
      console.error('いいねエラー:', err);
    }
  }, [gameData.id, socialService]);
  
  const handleBookmark = useCallback(async () => {
    try {
      const result = await socialService.toggleBookmark(gameData.id, 'current-user');
      setIsBookmarked(result.isBookmarked);
      setSocialActions(prev => ({ ...prev, bookmarks: result.newCount }));
    } catch (err) {
      console.error('ブックマークエラー:', err);
    }
  }, [gameData.id, socialService]);
  
  const handleShare = useCallback(() => {
    // 簡易シェア機能
    if (navigator.share) {
      navigator.share({
        title: gameData.title,
        text: gameData.description,
        url: `${window.location.origin}/game/${gameData.id}`
      });
    } else {
      // フォールバック: URL コピー
      const url = `${window.location.origin}/game/${gameData.id}`;
      navigator.clipboard.writeText(url);
      alert('URLをコピーしました！');
    }
    
    setSocialActions(prev => ({ ...prev, shares: prev.shares + 1 }));
  }, [gameData]);
  
  const handleReplay = useCallback(() => {
    startGame();
  }, [startGame]);
  
  const handleSkip = useCallback(() => {
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    onNextGame();
  }, [onNextGame]);
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <img 
              src={gameData.author.avatar} 
              alt={gameData.author.name}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <div className="font-semibold">{gameData.author.name}</div>
              <div className="text-sm opacity-75">{gameData.title}</div>
            </div>
          </div>
          
          <ModernButton 
            onClick={onClose}
            className="bg-black/30 text-white hover:bg-black/50 p-2"
          >
            ✕
          </ModernButton>
        </div>
      </div>
      
      {/* ゲームエリア */}
      <div className="flex-1 flex items-center justify-center">
        {gameState === 'loading' && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div>ゲーム読み込み中...</div>
          </div>
        )}
        
        {gameState === 'error' && (
          <div className="text-white text-center max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl mb-2">ゲーム読み込みエラー</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <ModernButton 
              onClick={startGame}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              再試行
            </ModernButton>
          </div>
        )}
        
        {(gameState === 'playing' || gameState === 'finished') && (
          <div 
            ref={gameContainerRef}
            className="w-full h-full max-w-sm max-h-screen-80 mx-auto"
            style={{ aspectRatio: '9/16' }}
          />
        )}
        
        {gameState === 'bridge' && (
          <div className="text-white text-center max-w-md mx-auto p-6">
            <div className="mb-6">
              <div className="text-4xl mb-2">
                {gameResult?.success ? '🎉' : '💫'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {gameResult?.success ? 'ゲームクリア！' : 'ゲーム終了'}
              </h3>
              {gameResult?.score !== undefined && (
                <p className="text-lg">スコア: {gameResult.score}</p>
              )}
              {gameResult?.finalState && (
                <p className="text-sm text-gray-300">
                  プレイ時間: {gameResult.finalState.timeElapsed.toFixed(1)}秒
                </p>
              )}
            </div>
            
            {/* ソーシャルアクション */}
            <div className="flex justify-center space-x-4 mb-6">
              <ModernButton
                onClick={handleLike}
                className={`p-3 ${isLiked ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}
              >
                ❤️ {socialActions.likes}
              </ModernButton>
              
              <ModernButton
                onClick={handleBookmark}
                className={`p-3 ${isBookmarked ? 'bg-yellow-500 text-white' : 'bg-white/20 text-white'}`}
              >
                ⭐ {socialActions.bookmarks}
              </ModernButton>
              
              <ModernButton
                onClick={handleShare}
                className="p-3 bg-white/20 text-white"
              >
                📤 {socialActions.shares}
              </ModernButton>
            </div>
            
            {/* アクションボタン */}
            <div className="flex space-x-3 mb-4">
              <ModernButton
                onClick={handleReplay}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                🔄 リプレイ
              </ModernButton>
              
              <ModernButton
                onClick={handleSkip}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                ⏭️ 次のゲーム
              </ModernButton>
            </div>
            
            {/* 自動遷移タイマー */}
            <div className="text-sm text-gray-400">
              {bridgeTimeLeft}秒後に自動で次のゲームへ
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${((8 - bridgeTimeLeft) / 8) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* ゲーム情報（下部） */}
      {gameState === 'playing' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="text-white max-w-sm mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4 text-sm">
                <span>👁️ {socialActions.views.toLocaleString()}</span>
                <span>❤️ {socialActions.likes.toLocaleString()}</span>
                <span>📤 {socialActions.shares}</span>
              </div>
              
              <div className="flex space-x-2">
                <ModernButton
                  onClick={handleLike}
                  className={`p-2 text-sm ${isLiked ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}
                >
                  {isLiked ? '❤️' : '🤍'}
                </ModernButton>
              </div>
            </div>
            
            {gameData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {gameData.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="bg-white/20 text-xs px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};