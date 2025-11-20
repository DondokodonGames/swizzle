import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  // ==================== React Router ====================
  const navigate = useNavigate();

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
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [gameTimeElapsed, setGameTimeElapsed] = useState(0);
  const [gameDuration, setGameDuration] = useState<number | null>(null);

  // 最適化: ゲームIDリストと次のゲームプリロード
  const [allGameIds, setAllGameIds] = useState<string[]>([]);
  const [nextGame, setNextGame] = useState<PublicGame | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

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
            .from('profiles')
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

    // プロフィール更新イベントのリスナー
    const handleProfileUpdate = () => {
      fetchUser();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // ==================== Ref ====================
  const canvasRef = useRef<HTMLDivElement>(null);
  const currentGameRef = useRef<string | null>(null);
  const bridgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== 公開ゲーム取得（最適化版: ランダム1つ読み込み） ====================
  useEffect(() => {
    const fetchInitialGame = async () => {
      setGameState('loading');
      setError(null);

      try {
        console.log('📥 公開ゲームを取得中（最適化版）...');

        // まず全ゲームIDを取得（軽量）
        const result = await socialService.getPublicGames(
          {
            sortBy: 'latest',
            category: 'all',
            search: undefined
          },
          1,
          100
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

        // ゲームIDリストを保存
        const gameIds = validGames.map(game => game.id);
        setAllGameIds(gameIds);

        // ランダムに1つのゲームを選択
        const randomIndex = Math.floor(Math.random() * validGames.length);
        const initialGame = validGames[randomIndex];

        console.log(`🎲 ランダムに選択: "${initialGame.title}" (${validGames.length}件中)`);

        // 初期ゲームを設定
        setPublicGames([initialGame]);
        setCurrentIndex(0);
        setGameState('playing');

      } catch (err) {
        console.error('❌ 公開ゲーム取得エラー:', err);
        setError('公開ゲームの取得に失敗しました。');
        setGameState('loading');
      }
    };

    fetchInitialGame();
  }, [socialService]);

  // ==================== 次のゲームをプリロード ====================
  const preloadNextGame = useCallback(async () => {
    if (allGameIds.length <= 1 || isPreloading) return;

    setIsPreloading(true);
    try {
      // 現在のゲーム以外からランダムに選択
      const currentGameId = publicGames[currentIndex]?.id;
      const availableIds = allGameIds.filter(id => id !== currentGameId);

      if (availableIds.length === 0) return;

      const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];

      console.log('🔄 次のゲームをプリロード中...');

      // 次のゲームを取得
      const result = await socialService.getPublicGames(
        {
          sortBy: 'latest',
          category: 'all',
          search: undefined
        },
        1,
        100
      );

      const nextGameData = result.games.find(game => game.id === randomId);

      if (nextGameData && nextGameData.projectData) {
        setNextGame(nextGameData);
        console.log(`✅ 次のゲームをプリロード完了: "${nextGameData.title}"`);
      }
    } catch (err) {
      console.warn('次のゲームのプリロードに失敗:', err);
    } finally {
      setIsPreloading(false);
    }
  }, [allGameIds, publicGames, currentIndex, isPreloading, socialService]);

  // ブリッジ画面表示時に次のゲームをプリロード
  useEffect(() => {
    if (gameState === 'bridge' && !nextGame) {
      preloadNextGame();
    }
  }, [gameState, nextGame, preloadNextGame]);

  // ==================== ブリッジタイマー ====================
  useEffect(() => {
    if (gameState === 'bridge') {
      setBridgeTimeLeft(20); // 5秒→20秒に変更

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

  // ==================== ゲーム時間トラッキング ====================
  useEffect(() => {
    if (gameStartTime && gameState === 'playing') {
      const timer = setInterval(() => {
        const elapsed = (Date.now() - gameStartTime) / 1000;
        setGameTimeElapsed(elapsed);
      }, 100); // 100msごとに更新

      return () => clearInterval(timer);
    }
  }, [gameStartTime, gameState]);

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

      // ゲーム時間トラッキング開始
      setGameStartTime(Date.now());
      setGameTimeElapsed(0);

      // ゲーム制限時間を取得
      const duration = currentGame.projectData.settings?.duration?.type === 'unlimited'
        ? null
        : (currentGame.projectData.settings?.duration?.seconds || 15);
      setGameDuration(duration);

      try {
        await bridge.launchFullGame(
          currentGame.projectData,
          canvasRef.current!,
          (result: any) => {
            console.log(`🏁 ゲーム終了: "${currentGame.title}"`, result);

            // ゲーム時間トラッキング停止
            setGameStartTime(null);

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
    console.log('⏭️ 次のゲームへ');

    // ブリッジタイマークリア
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }

    // プリロードされた次のゲームを使用
    if (nextGame) {
      setPublicGames([nextGame]);
      setCurrentIndex(0);
      setNextGame(null);
      console.log(`🎮 プリロードしたゲームを開始: "${nextGame.title}"`);
    } else if (publicGames.length > 0) {
      // フォールバック: 現在のゲームを再利用（プリロードがない場合）
      setCurrentIndex(0);
      console.log('🔄 プリロードなし、現在のゲームを再実行');
    }

    setGameState('playing');
    setCurrentScore(null);
  }, [nextGame, publicGames.length]);

  const handlePreviousGame = useCallback(() => {
    // 最適化版では前のゲームには戻れないので、次のゲームと同じ挙動にする
    handleNextGame();
  }, [handleNextGame]);

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
  // nextGameは状態として管理されているプリロードゲームを使用

  // ==================== ゲーム画面 + ブリッジ画面統合 ====================
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex items-center justify-center">
      {/* メインコンテナ（1080x1920、レスポンシブ対応） */}
      <div
        className="relative bg-black"
        style={{
          width: 'min(100vw, calc(100vh * 9 / 16), 1080px)',
          height: 'min(100vh, calc(100vw * 16 / 9), 1920px)',
          aspectRatio: '9 / 16'
        }}
      >
        {/* ゲームキャンバス */}
        <div
          ref={canvasRef}
          className="w-full h-full"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none'
          }}
        />

        {/* トップバー - 6つのアイコン（ブリッジ画面のみ表示） */}
        {gameState === 'bridge' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50px',
          zIndex: 1000,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'stretch'
        }}>
          {/* ログイン/新規登録またはユーザー情報 */}
          <button
            onClick={() => {
              if (currentUser && userProfile) {
                navigate(`/profile/${userProfile.username}`);
              } else {
                window.dispatchEvent(new CustomEvent('openAuthModal', {
                  detail: { mode: 'signin' }
                }));
              }
            }}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              border: 'none',
              background: currentUser
                ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                : 'rgba(59, 130, 246, 0.9)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              transition: 'opacity 0.2s',
              padding: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title={currentUser ? 'プロフィール' : 'ログイン'}
          >
            {currentUser && userProfile ? (
              userProfile.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Avatar"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid white'
                  }}
                />
              ) : (
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  border: '2px solid white'
                }}>
                  {(userProfile.display_name?.charAt(0).toUpperCase() || userProfile.username?.charAt(0).toUpperCase() || '?')}
                </div>
              )
            ) : (
              '👤'
            )}
          </button>

          {/* ゲームをプレイ（ホーム） */}
          <button
            onClick={() => {
              if (onExit) {
                onExit();
              }
            }}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              border: 'none',
              background: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="ホーム"
          >
            🎮
          </button>

          {/* フィード */}
          <button
            onClick={() => {
              if (onOpenFeed) {
                onOpenFeed();
              }
            }}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              border: 'none',
              background: 'rgba(59, 130, 246, 0.9)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="フィード"
          >
            📱
          </button>

          {/* ゲームを作る */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('switchToEditor'));
            }}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              border: 'none',
              background: 'rgba(236, 72, 153, 0.9)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="ゲームを作る"
          >
            🎨
          </button>

          {/* プレミアム */}
          <button
            onClick={() => {
              window.location.href = '/pricing';
            }}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              border: 'none',
              background: 'rgba(139, 92, 246, 0.9)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="プレミアム"
          >
            💎
          </button>

          {/* スキップ */}
          <button
            onClick={handleSkipToBridge}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              border: 'none',
              background: 'rgba(239, 68, 68, 0.9)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="スキップ"
          >
            ⏭️
          </button>
        </div>
        )}

        {/* ボトムバー - 残り時間バー（問題14対応） */}
        {gameState === 'playing' && gameDuration !== null && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            zIndex: 1000
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, (Math.max(0, gameDuration - gameTimeElapsed) / gameDuration) * 100))}%`,
              backgroundColor: (() => {
                const percent = (Math.max(0, gameDuration - gameTimeElapsed) / gameDuration) * 100;
                if (percent > 50) return '#10b981'; // 緑
                if (percent > 20) return '#f59e0b'; // 黄色
                return '#ef4444'; // 赤
              })(),
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        )}

        {/* ブリッジ画面（リザルト画面）オーバーレイ */}
        {gameState === 'bridge' && (
          <BridgeScreen
            currentGame={currentGame}
            nextGame={nextGame || undefined}
            score={currentScore}
            timeLeft={bridgeTimeLeft}
            totalGames={allGameIds.length}
            currentIndex={currentIndex}
            onNextGame={handleNextGame}
            onPreviousGame={handlePreviousGame}
            onReplayGame={handleReplayGame}
            onExit={onExit}
            inline={true}
          />
        )}
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