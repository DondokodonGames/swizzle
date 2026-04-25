import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocialService } from '../social/services/SocialService';
import EditorGameBridge from '../services/editor/EditorGameBridge';
import { PublicGame } from '../social/types/SocialTypes';
import { BridgeScreen } from './BridgeScreen';
import { supabase } from '../lib/supabase';
import ProfileModal from './ProfileModal';
import { DESIGN_TOKENS } from '../constants/DesignSystem';

/**
 * GameSequence.tsx - 完全レスポンシブ版（スマホ対応）
 * 
 * 機能:
 * - Supabaseから公開ゲームを取得
 * - ゲームとブリッジ画面の分離
 * - ソーシャル機能統合（いいね、フィード、プロフィール）
 * - 残り時間バー表示（ゲーム中+ブリッジ中）
 * - 🔧 完全レスポンシブ: PC・スマホ両対応
 * - 🔧 高さベースの9:16比率（太って見えない）
 * - 非ログイン対応
 * - ホームボタン → /about ページへ遷移
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

  // 最適化: 全ゲームをキャッシュしてプリロードを高速化
  const [allValidGames, setAllValidGames] = useState<PublicGame[]>([]);
  const [nextGame, setNextGame] = useState<PublicGame | null>(null);
  const [usedGameIds, setUsedGameIds] = useState<Set<string>>(new Set());

  // AuthModal表示中の一時停止
  const [paused, setPaused] = useState(false);

  // ホバー状態管理
  const [errorButtonHover, setErrorButtonHover] = useState(false);
  const [noGamesButtonHover, setNoGamesButtonHover] = useState(false);

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

  // ==================== AuthModal一時停止 ====================
  useEffect(() => {
    const handleAuthModalOpened = () => {
      setPaused(true);
    };

    const handleAuthModalClosed = () => {
      setPaused(false);
    };

    window.addEventListener('authModalOpened', handleAuthModalOpened);
    window.addEventListener('authModalClosed', handleAuthModalClosed);

    return () => {
      window.removeEventListener('authModalOpened', handleAuthModalOpened);
      window.removeEventListener('authModalClosed', handleAuthModalClosed);
    };
  }, []);

  // ==================== Ref ====================
  const canvasRef = useRef<HTMLDivElement>(null);
  const currentGameRef = useRef<string | null>(null);
  const bridgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== 公開ゲーム取得（超高速版: 1件取得→即開始→バックグラウンドで残り取得） ====================
  useEffect(() => {
    const fetchInitialGame = async () => {
      setGameState('loading');
      setError(null);

      // タイムアウト付きでゲーム取得
      const timeoutPromise = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('タイムアウト: サーバー応答なし')), ms)
          )
        ]);
      };

      try {
        // Step 1: 1ページ目から1件取得して即座に開始（20秒タイムアウト）
        const initialResult = await timeoutPromise(
          socialService.getPublicGames(
            {
              sortBy: 'latest',
              category: 'all',
              search: undefined
            },
            1,
            1
          ),
          20000
        );

        // ゲームが見つからない場合は1ページ目から取得
        let initialGame: PublicGame | null = null;
        if (initialResult.games.length > 0 && initialResult.games[0].projectData) {
          initialGame = initialResult.games[0];
        } else {
          const fallbackResult = await timeoutPromise(
            socialService.getPublicGames(
              {
                sortBy: 'latest',
                category: 'all',
                search: undefined
              },
              1,
              10
            ),
            20000
          );
          if (fallbackResult.games.length > 0 && fallbackResult.games[0].projectData) {
            initialGame = fallbackResult.games[0];
          }
        }

        if (!initialGame) {
          setError('公開ゲームがありません。エディターでゲームを作成して公開してください。');
          setGameState('loading');
          return;
        }

        // 初期ゲームを設定し、即座に開始
        setPublicGames([initialGame]);
        setUsedGameIds(new Set([initialGame.id]));
        setAllValidGames([initialGame]);
        setCurrentIndex(0);
        setGameState('playing');

        // Step 2: バックグラウンドで残りのゲームを取得（失敗しても無視）
        try {
          const fullResult = await timeoutPromise(
            socialService.getPublicGames(
              {
                sortBy: 'latest',
                category: 'all',
                search: undefined
              },
              1,
              100
            ),
            30000
          );

          const validGames = fullResult.games.filter(game => game.projectData);

          if (validGames.length > 0) {
            setAllValidGames(validGames);
          }
        } catch (bgErr) {
          // バックグラウンド取得失敗は無視（初期ゲームは既に開始済み）
          console.warn('⚠️ バックグラウンド取得失敗（無視）:', bgErr);
        }

      } catch (err) {
        console.error('❌ 公開ゲーム取得エラー:', err);
        setError(err instanceof Error ? err.message : '公開ゲームの取得に失敗しました。');
        setGameState('loading');
      }
    };

    fetchInitialGame();
  }, [socialService]);

  // ==================== 次のゲームをプリロード ====================
  const preloadNextGame = useCallback(() => {
    if (allValidGames.length <= 1) return;

    const currentGameId = publicGames[currentIndex]?.id;
    const availableGames = allValidGames.filter(game =>
      game.id !== currentGameId && !usedGameIds.has(game.id)
    );

    const gamesToChooseFrom = availableGames.length > 0
      ? availableGames
      : allValidGames.filter(game => game.id !== currentGameId);

    if (gamesToChooseFrom.length === 0) return;

    const randomIndex = Math.floor(Math.random() * gamesToChooseFrom.length);
    const nextGameData = gamesToChooseFrom[randomIndex];

    setNextGame(nextGameData);
  }, [allValidGames, publicGames, currentIndex, usedGameIds]);

  // ブリッジ画面表示時に次のゲームをプリロード
  useEffect(() => {
    if (gameState === 'bridge' && !nextGame) {
      preloadNextGame();
    }
  }, [gameState, nextGame, preloadNextGame]);

  // ==================== ブリッジタイマー ====================
  useEffect(() => {
    if (gameState === 'bridge') {
      if (paused) {
        if (bridgeTimerRef.current) {
          clearInterval(bridgeTimerRef.current);
          bridgeTimerRef.current = null;
        }
        return;
      }

      bridgeTimerRef.current = setInterval(() => {
        setBridgeTimeLeft(prev => {
          if (prev <= 0.1) {
            handleNextGame();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);

      return () => {
        if (bridgeTimerRef.current) {
          clearInterval(bridgeTimerRef.current);
        }
      };
    }
  }, [gameState, paused]);

  // bridgeTimeLeftの初期化
  useEffect(() => {
    if (gameState === 'bridge') {
      setBridgeTimeLeft(10);
    }
  }, [gameState]);

  // ==================== ゲーム時間トラッキング ====================
  useEffect(() => {
    if (gameStartTime && gameState === 'playing') {
      const timer = setInterval(() => {
        const elapsed = (Date.now() - gameStartTime) / 1000;
        setGameTimeElapsed(elapsed);
      }, 100);

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
        
        setTimeout(() => {
          handleNextGame();
        }, 2000);
      }
    };

    launchGame();
  }, [currentIndex, publicGames, gameState, bridge]);

  // ==================== ゲーム遷移ハンドラ ====================
  const handleNextGame = useCallback(() => {
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }

    if (nextGame) {
      setPublicGames([nextGame]);
      setCurrentIndex(0);
      setUsedGameIds(prev => new Set([...prev, nextGame.id]));
      setNextGame(null);
      console.log(`🎮 プリロードしたゲームを開始: "${nextGame.title}"`);
    } else if (publicGames.length > 0) {
      setCurrentIndex(0);
      console.log('🔄 プリロードなし、現在のゲームを再実行');
    }

    setGameState('playing');
    setCurrentScore(null);
  }, [nextGame, publicGames.length]);

  const handlePreviousGame = useCallback(() => {
    handleNextGame();
  }, [handleNextGame]);

  const handleReplayGame = useCallback(() => {
    console.log('🔄 もう一度遊ぶ');
    
    if (bridgeTimerRef.current) {
      clearInterval(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    
    currentGameRef.current = null;
    setGameState('playing');
    setCurrentScore(null);
  }, []);

  const handleSkipToBridge = useCallback(() => {
    console.log('⏭️ スキップ → ブリッジ画面へ');

    // 実行中のゲームを停止
    bridge.stopGame();

    setCurrentScore({
      points: 0,
      time: 0,
      success: false
    });

    setGameState('bridge');
  }, [bridge]);

  // ==================== スタイル定義（🔧 完全レスポンシブ対応） ====================
  const styles = {
    fullScreenContainer: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: DESIGN_TOKENS.colors.neutral[50],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      overflow: 'hidden'
    },
    centerContent: {
      textAlign: 'center' as const
    },
    spinner: {
      display: 'inline-block',
      width: '64px',
      height: '64px',
      border: `2px solid transparent`,
      borderTopColor: DESIGN_TOKENS.colors.purple[500],
      borderBottomColor: DESIGN_TOKENS.colors.purple[500],
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      animation: 'spin 1s linear infinite',
      margin: `0 auto ${DESIGN_TOKENS.spacing[4]}`
    },
    loadingText: {
      color: DESIGN_TOKENS.colors.neutral[700],
      fontSize: DESIGN_TOKENS.typography.fontSize.lg
    },
    errorContainer: {
      textAlign: 'center' as const,
      maxWidth: '448px',
      margin: '0 auto',
      padding: `0 ${DESIGN_TOKENS.spacing[4]}`
    },
    errorIcon: {
      color: DESIGN_TOKENS.colors.error[500],
      fontSize: DESIGN_TOKENS.typography.fontSize['6xl'],
      marginBottom: DESIGN_TOKENS.spacing[4]
    },
    errorTitle: {
      color: DESIGN_TOKENS.colors.neutral[800],
      fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      marginBottom: DESIGN_TOKENS.spacing[4]
    },
    errorMessage: {
      color: DESIGN_TOKENS.colors.neutral[600],
      marginBottom: DESIGN_TOKENS.spacing[6],
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    button: (isHover: boolean) => ({
      backgroundColor: isHover ? DESIGN_TOKENS.colors.purple[700] : DESIGN_TOKENS.colors.purple[600],
      color: DESIGN_TOKENS.colors.neutral[0],
      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[6]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      transition: `background-color ${DESIGN_TOKENS.animation.duration.normal}`,
      border: 'none',
      cursor: 'pointer',
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
    }),
    noGamesIcon: {
      color: DESIGN_TOKENS.colors.neutral[400],
      fontSize: DESIGN_TOKENS.typography.fontSize['6xl'],
      marginBottom: DESIGN_TOKENS.spacing[4]
    },
    // 🔧 PC: 9:16比率維持、スマホ: 全画面表示
    gameContainer: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: DESIGN_TOKENS.colors.neutral[100],
      zIndex: 50,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    } as React.CSSProperties,
    // 🔧 修正版: PCでは9:16比率維持、スマホでは全画面
    aspectRatioContainer: {
      position: 'relative' as const,
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      height: '100vh',         // 🔧 高さを画面いっぱいに
      width: 'auto',           // 🔧 幅はアスペクト比から自動計算
      maxWidth: '100%',        // 🔧 画面幅を超えない
      aspectRatio: '9 / 16',   // 🔧 9:16比率維持
      margin: '0 auto',        // 🔧 中央揃え
      overflow: 'hidden',      // 🔧 はみ出し防止
    } as React.CSSProperties,
    canvas: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      touchAction: 'none'
    } as React.CSSProperties,
    topBar: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '50px',
      zIndex: 1000,
      pointerEvents: 'none' as const,
      display: 'flex',
      alignItems: 'stretch'
    } as React.CSSProperties,
    topBarButton: (bgColor: string, isHover: boolean) => ({
      pointerEvents: 'auto' as const,
      flex: 1,
      border: 'none',
      background: bgColor,
      backdropFilter: 'blur(10px)',
      color: DESIGN_TOKENS.colors.neutral[0],
      fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: `opacity ${DESIGN_TOKENS.animation.duration.normal}`,
      opacity: isHover ? 0.8 : 1,
      padding: DESIGN_TOKENS.spacing[2]
    } as React.CSSProperties),
    avatar: {
      width: '34px',
      height: '34px',
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      objectFit: 'cover' as const,
      border: `2px solid ${DESIGN_TOKENS.colors.neutral[0]}`
    } as React.CSSProperties,
    avatarPlaceholder: {
      width: '34px',
      height: '34px',
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      background: 'rgba(255, 255, 255, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      border: `2px solid ${DESIGN_TOKENS.colors.neutral[0]}`
    } as React.CSSProperties,
    progressBarContainer: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      height: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      zIndex: 1000
    } as React.CSSProperties,
    progressBar: (percent: number) => ({
      height: '100%',
      width: `${percent}%`,
      backgroundColor: (() => {
        if (percent > 50) return DESIGN_TOKENS.colors.success[500];
        if (percent > 20) return DESIGN_TOKENS.colors.warning[500];
        return DESIGN_TOKENS.colors.error[500];
      })(),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    } as React.CSSProperties)
  };

  // ==================== レンダリング ====================

  // ローディング画面
  if (gameState === 'loading' && !error) {
    return (
      <div style={styles.fullScreenContainer} className="game-sequence-container">
        <div style={styles.centerContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>公開ゲームを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー画面
  if (error) {
    return (
      <div style={styles.fullScreenContainer} className="game-sequence-container">
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>エラー</h2>
          <p style={styles.errorMessage}>{error}</p>
          {onExit && (
            <button
              onClick={onExit}
              onMouseEnter={() => setErrorButtonHover(true)}
              onMouseLeave={() => setErrorButtonHover(false)}
              style={styles.button(errorButtonHover)}
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
      <div style={styles.fullScreenContainer} className="game-sequence-container">
        <div style={styles.errorContainer}>
          <div style={styles.noGamesIcon}>🎮</div>
          <h2 style={styles.errorTitle}>公開ゲームがありません</h2>
          <p style={styles.errorMessage}>
            エディターでゲームを作成して公開してください。
          </p>
          {onExit && (
            <button
              onClick={onExit}
              onMouseEnter={() => setNoGamesButtonHover(true)}
              onMouseLeave={() => setNoGamesButtonHover(false)}
              style={styles.button(noGamesButtonHover)}
            >
              エディターを開く
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentGame = publicGames[currentIndex];

  // ==================== ゲーム画面 + ブリッジ画面統合 ====================
  return (
    <div style={styles.gameContainer} className="game-sequence-container">
      {/* 🔧 完全レスポンシブ対応: 高さベースで幅を自動計算（太って見えない） */}
      <div style={styles.aspectRatioContainer} className="aspect-ratio-container">
        {/* ゲームキャンバス */}
        <div ref={canvasRef} style={styles.canvas} />

        {/* トップバー - 6つのアイコン */}
        <div style={styles.topBar} className="game-top-bar">
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
            style={styles.topBarButton(
              currentUser
                ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                : 'rgba(59, 130, 246, 0.9)',
              false
            )}
            title={currentUser ? 'プロフィール' : 'ログイン'}
          >
            {currentUser && userProfile ? (
              userProfile.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Avatar"
                  style={styles.avatar}
                  className="avatar-img"
                />
              ) : (
                <div style={styles.avatarPlaceholder} className="avatar-placeholder">
                  {(userProfile.display_name?.charAt(0).toUpperCase() || userProfile.username?.charAt(0).toUpperCase() || '?')}
                </div>
              )
            ) : (
              '👤'
            )}
          </button>

          {/* About Us */}
          <button
            onClick={() => {
              navigate('/about');
            }}
            style={styles.topBarButton('rgba(16, 185, 129, 0.9)', false)}
            title="About Us"
          >
            ℹ️
          </button>

          {/* フィード */}
          <button
            onClick={() => {
              if (onOpenFeed) {
                onOpenFeed();
              }
            }}
            style={styles.topBarButton('rgba(59, 130, 246, 0.9)', false)}
            title="フィード"
          >
            📱
          </button>

          {/* ゲームを作る */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('switchToEditor'));
            }}
            style={styles.topBarButton('rgba(236, 72, 153, 0.9)', false)}
            title="ゲームを作る"
          >
            🎨
          </button>

          {/* プレミアム */}
          <button
            onClick={() => {
              window.location.href = '/pricing';
            }}
            style={styles.topBarButton('rgba(139, 92, 246, 0.9)', false)}
            title="プレミアム"
          >
            💎
          </button>

          {/* スキップ - ゲーム中はブリッジへ、ブリッジ中は次のゲームへ */}
          <button
            onClick={gameState === 'bridge' ? handleNextGame : handleSkipToBridge}
            style={styles.topBarButton('rgba(239, 68, 68, 0.9)', false)}
            title={gameState === 'bridge' ? '次のゲームへ' : 'スキップ'}
          >
            ⏭️
          </button>
        </div>

        {/* ボトムバー - 残り時間バー */}
        {gameState === 'playing' && gameDuration !== null && (
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBar(
              Math.max(0, Math.min(100, (Math.max(0, gameDuration - gameTimeElapsed) / gameDuration) * 100))
            )} />
          </div>
        )}

        {/* ブリッジ画面（リザルト画面）オーバーレイ */}
        {gameState === 'bridge' && (
          <BridgeScreen
            currentGame={currentGame}
            nextGame={nextGame}
            score={currentScore}
            timeLeft={bridgeTimeLeft}
            totalGames={allValidGames.length}
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

      {/* スピナーアニメーション用のスタイルタグ */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* 🔧 スマホ: aspect-ratioを無効化して全画面表示 */
        @media (max-width: 768px), (max-aspect-ratio: 9/16) {
          .aspect-ratio-container {
            aspect-ratio: unset !important;
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
        }

        /* 🔧 モバイル用トップバー調整 */
        @media (max-width: 768px) {
          .game-top-bar {
            height: 44px !important;
          }
          .game-top-bar button {
            font-size: 18px !important;
            padding: 6px !important;
            min-width: 0 !important;
          }
          .game-top-bar .avatar-img,
          .game-top-bar .avatar-placeholder {
            width: 28px !important;
            height: 28px !important;
            font-size: 12px !important;
          }
        }

        /* より小さな画面用 (480px以下) */
        @media (max-width: 480px) {
          .game-top-bar {
            height: 40px !important;
          }
          .game-top-bar button {
            font-size: 16px !important;
            padding: 4px !important;
          }
          .game-top-bar .avatar-img,
          .game-top-bar .avatar-placeholder {
            width: 24px !important;
            height: 24px !important;
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GameSequence;