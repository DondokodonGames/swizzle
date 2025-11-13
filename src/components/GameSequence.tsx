import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { SocialService } from '../social/services/SocialService';
import EditorGameBridge from '../services/editor/EditorGameBridge';
import { PublicGame } from '../social/types/SocialTypes';
import { BridgeScreen } from './BridgeScreen';
import { supabase } from '../lib/supabase';
import ProfileModal from './ProfileModal';

/**
 * GameSequence.tsx - Phase H-3&H-4統合版
 * 
 * 機能:
 * - Supabaseから公開ゲームを取得
 * - ゲームとブリッジ画面の分離
 * - ソーシャル機能統合（いいね、フィード、プロフィール）
 * - 残り時間バー表示（ゲーム中+ブリッジ中）
 * - 1080x1920画面サイズ
 * - 非ログイン対応
 */

type GameState = 'loading' | 'playing' | 'bridge';

interface GameScore {
  points: number;
  time: number;
  success: boolean;
}

interface GameSequenceProps {
  onExit?: () => void;
  onOpenFeed?: () => void;
}

const GameSequence: React.FC<GameSequenceProps> = ({ onExit, onOpenFeed }) => {
  // ==================== 状態管理 ====================
  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentScore, setCurrentScore] = useState<GameScore | null>(null);
  const [bridgeTimeLeft, setBridgeTimeLeft] = useState(5);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // ==================== サービス ====================
  const socialService = useMemo(() => SocialService.getInstance(), []);
  const bridge = useMemo(() => EditorGameBridge.getInstance(), []);

  // ==================== ユーザー情報取得 ====================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (user) {
          // プロフィール情報を取得
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          setUserProfile(profile);
        }
      } catch (err) {
        console.warn('ユーザー情報の取得に失敗:', err);
      }
    };

    fetchUser();
  }, []);

  // ==================== Ref ====================
  const canvasRef = useRef<HTMLDivElement>(null);
  const currentGameRef = useRef<string | null>(null);
  const bridgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== 公開ゲーム取得 ====================
  useEffect(() => {
    const fetchPublicGames = async () => {
      setGameState('loading');
      setError(null);

      try {
        console.log('📥 公開ゲームを取得中...');
        
        const result = await socialService.getPublicGames(
          {
            sortBy: 'latest',
            category: 'all',
            search: undefined
          },
          1,
          50
        );

        console.log(`✅ ${result.games.length}件の公開ゲームを取得`);

        if (result.games.length === 0) {
          setError('公開ゲームがありません。エディターでゲームを作成して公開してください。');
          setGameState('loading');
          return;
        }

        // project_dataが存在するゲームのみフィルタ
        const validGames = result.games.filter(game => {
          if (!game.projectData) {
            console.warn(`⚠️ ゲーム "${game.title}" にproject_dataがありません（ID: ${game.id}）`);
            return false;
          }
          return true;
        });

        if (validGames.length === 0) {
          setError('有効な公開ゲームがありません。');
          setGameState('loading');
          return;
        }

        console.log(`✅ ${validGames.length}件の有効なゲームを検出`);
        setPublicGames(validGames);
        setGameState('playing');

      } catch (err) {
        console.error('❌ 公開ゲーム取得エラー:', err);
        setError('公開ゲームの取得に失敗しました。');
        setGameState('loading');
      }
    };

    fetchPublicGames();
  }, [socialService]);

  // ==================== ブリッジタイマー ====================
  useEffect(() => {
    if (gameState === 'bridge') {
      setBridgeTimeLeft(5);
      
      // 1秒ごとにカウントダウン
      bridgeTimerRef.current = setInterval(() => {
        setBridgeTimeLeft(prev => {
          if (prev <= 1) {
            // タイマー終了 → 次のゲームへ
            handleNextGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (bridgeTimerRef.current) {
          clearInterval(bridgeTimerRef.current);
        }
      };
    }
  }, [gameState]);

  // ==================== ゲーム実行 ====================
  useEffect(() => {
    if (!canvasRef.current || publicGames.length === 0 || gameState !== 'playing') {
      return;
    }

    const currentGame = publicGames[currentIndex];
    if (!currentGame || !currentGame.projectData) {
      console.warn('⚠️ 現在のゲームまたはproject_dataが存在しません');
      handleNextGame();
      return;
    }

    // 既に同じゲームが実行中の場合はスキップ
    if (currentGameRef.current === currentGame.id) {
      return;
    }

    const launchGame = async () => {
      currentGameRef.current = currentGame.id;

      console.log(`🎮 ゲーム起動: "${currentGame.title}" (${currentGame.id})`);

      try {
        await bridge.launchFullGame(
          currentGame.projectData,
          canvasRef.current!,
          (result: any) => {
            console.log(`🏁 ゲーム終了: "${currentGame.title}"`, result);
            
            // スコア記録
            setCurrentScore({
              points: result.score || 0,
              time: result.timeElapsed || 0,
              success: result.success || false
            });

            currentGameRef.current = null;
            
            // ブリッジ画面へ遷移
            setGameState('bridge');
          }
        );
      } catch (err) {
        console.error(`❌ ゲーム実行エラー: "${currentGame.title}"`, err);
        currentGameRef.current = null;
        
        // エラー時も次のゲームへスキップ（2秒後）
        setTimeout(() => {
          handleNextGame();
        }, 2000);
      }
    };

    launchGame();
  }, [currentIndex, publicGames, gameState, bridge]);

  // ==================== ゲーム遷移ハンドラ ====================
  const handleNextGame = useCallback(() => {
    if (publicGames.length === 0) return;
    
    console.log('⏭️ 次のゲームへ');
    
    // ブリッジタイマークリア
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    
    setCurrentIndex(prev => (prev + 1) % publicGames.length);
    setGameState('playing');
    setCurrentScore(null);
  }, [publicGames.length]);

  const handlePreviousGame = useCallback(() => {
    if (publicGames.length === 0) return;
    
    console.log('⏮️ 前のゲームへ');
    
    // ブリッジタイマークリア
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    
    setCurrentIndex(prev => (prev - 1 + publicGames.length) % publicGames.length);
    setGameState('playing');
    setCurrentScore(null);
  }, [publicGames.length]);

  const handleReplayGame = useCallback(() => {
    console.log('🔄 もう一度遊ぶ');
    
    // ブリッジタイマークリア
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    
    currentGameRef.current = null; // 同じゲームを再実行できるようにする
    setGameState('playing');
    setCurrentScore(null);
  }, []);

  const handleSkipToBridge = useCallback(() => {
    console.log('⏭️ スキップ → ブリッジ画面へ');
    
    // ゲーム強制終了
    setCurrentScore({
      points: 0,
      time: 0,
      success: false
    });
    
    setGameState('bridge');
  }, []);

  // ==================== レンダリング ====================

  // ローディング画面
  if (gameState === 'loading' && !error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">公開ゲームを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー画面
  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl font-bold mb-4">エラー</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          {onExit && (
            <button
              onClick={onExit}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              メニューに戻る
            </button>
          )}
        </div>
      </div>
    );
  }

  // ゲームがない場合
  if (publicGames.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-gray-400 text-6xl mb-4">🎮</div>
          <h2 className="text-white text-2xl font-bold mb-4">公開ゲームがありません</h2>
          <p className="text-gray-300 mb-6">
            エディターでゲームを作成して公開してください。
          </p>
          {onExit && (
            <button
              onClick={onExit}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              エディターを開く
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentGame = publicGames[currentIndex];
  const nextGame = publicGames[(currentIndex + 1) % publicGames.length];

  // ==================== ブリッジ画面 ====================
  if (gameState === 'bridge') {
    return (
      <BridgeScreen
        currentGame={currentGame}
        nextGame={nextGame}
        score={currentScore}
        timeLeft={bridgeTimeLeft}
        totalGames={publicGames.length}
        currentIndex={currentIndex}
        onNextGame={handleNextGame}
        onPreviousGame={handlePreviousGame}
        onReplayGame={handleReplayGame}
        onExit={onExit}
      />
    );
  }

  // ==================== ゲーム画面 ====================
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex items-center justify-center">
      {/* メインコンテナ（1080x1920） */}
      <div 
        className="relative bg-black"
        style={{ 
          width: '1080px',
          height: '1920px',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      >
        {/* ゲームキャンバス */}
        <div 
          ref={canvasRef}
          className="w-full h-full"
          style={{ 
            position: 'relative',
            touchAction: 'none'
          }}
        />

        {/* UI オーバーレイ */}
        <div className="absolute inset-0 pointer-events-none">
          {/* トップバー */}
          <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4">
              <div className="flex items-start justify-between">
                {/* ゲーム情報 */}
                <div className="flex-1">
                  <h3 className="text-white font-bold text-2xl mb-1">{currentGame.title}</h3>
                  <p className="text-gray-300 text-lg">by {currentGame.author.name}</p>
                </div>

                {/* ソーシャル機能アイコン */}
                <div className="flex items-center gap-3 ml-4">
                  {/* ソーシャルフィードボタン */}
                  <button
                    onClick={() => {
                      if (onOpenFeed) {
                        onOpenFeed();
                      }
                    }}
                    className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    title="ソーシャルフィード"
                  >
                    <span className="text-2xl">📱</span>
                  </button>

                  {/* ユーザーアイコン / ログインボタン */}
                  {currentUser && userProfile ? (
                    <button
                      onClick={() => {
                        setProfileUserId(currentUser.id);
                        setShowProfileModal(true);
                      }}
                      className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl hover:scale-110 transition-transform relative"
                      title="マイプロフィール"
                    >
                      {userProfile.display_name?.charAt(0).toUpperCase() ||
                       userProfile.username?.charAt(0).toUpperCase() || '?'}

                      {/* 通知バルーン（仮） */}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        3
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // TODO: ログインモーダルを開く
                        window.dispatchEvent(new CustomEvent('openAuthModal', {
                          detail: { mode: 'signin' }
                        }));
                      }}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
                    >
                      ログイン
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ボトムバー - 残り時間バー + スキップボタン */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
            {/* 残り時間バー（仮実装 - ゲームエンジンから取得予定） */}
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">ゲーム進行中</span>
                <span className="text-gray-300 text-sm">{currentIndex + 1} / {publicGames.length}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                  style={{ width: '50%' }} // TODO: 実際の進捗に置き換え
                />
              </div>
            </div>

            {/* 操作ボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleSkipToBridge}
                className="flex-1 bg-yellow-600/80 hover:bg-yellow-700 text-white text-lg font-bold py-4 rounded-xl backdrop-blur-sm transition-colors"
              >
                ⏭️ スキップ
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* プロフィールモーダル */}
      {showProfileModal && profileUserId && (
        <ProfileModal
          userId={profileUserId}
          onClose={() => {
            setShowProfileModal(false);
            setProfileUserId(null);
          }}
        />
      )}
    </div>
  );
};

export default GameSequence;