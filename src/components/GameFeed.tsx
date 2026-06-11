// src/components/GameFeed.tsx
// モダンなゲームフィード画面 - useEffect無限ループ完全修正版

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SocialService } from '../social/services/SocialService';
import { PublicGame } from '../social/types/SocialTypes';
import { supabase } from '../lib/supabase';

interface GameFeedProps {
  onGameSelect: (game: PublicGame) => void;
  onBack: () => void;
}

interface FeedSection {
  id: string;
  titleKey: string;
  icon: string;
  games: PublicGame[];
  loading: boolean;
  error?: string;
}

export const GameFeed: React.FC<GameFeedProps> = ({ onGameSelect, onBack }) => {
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoaded, setUserLoaded] = useState(false); // ✅ ユーザー読み込み完了フラグ
  const [sections, setSections] = useState<FeedSection[]>([
    { id: 'trending', titleKey: 'gameFeed.trending', icon: '🔥', games: [], loading: true },
    { id: 'following', titleKey: 'gameFeed.following', icon: '👥', games: [], loading: true },
    { id: 'tags', titleKey: 'gameFeed.recommended', icon: '✨', games: [], loading: true },
    { id: 'random', titleKey: 'gameFeed.random', icon: '🎲', games: [], loading: true },
    { id: 'premium', titleKey: 'gameFeed.premium', icon: '💎', games: [], loading: true }
  ]);
  const [selectedSection, setSelectedSection] = useState<string>('tags');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ 重複実行防止フラグ
  const fetchedRef = useRef(false);

  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ==================== ユーザー情報取得（初回のみ） ====================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        setUserLoaded(true); // ✅ 読み込み完了フラグを立てる
      } catch (err) {
        console.warn('⚠️ GameFeed: ユーザー情報の取得に失敗:', err);
        setCurrentUser(null);
        setUserLoaded(true); // ✅ エラーでも完了フラグを立てる
      }
    };

    fetchUser();
  }, []); // 初回のみ実行

  // ==================== セクション更新 ====================
  const updateSection = (id: string, games: PublicGame[], loading: boolean, error?: string) => {
    setSections(prev => prev.map(section =>
      section.id === id ? { ...section, games, loading, error } : section
    ));
  };

  // ==================== タイムアウト付きPromise ====================
  const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number = 8000): Promise<T> => {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  };

  // ==================== フィードデータ取得（userLoaded後に1回だけ実行） ====================
  useEffect(() => {
    // ✅ 条件1: userLoadedがtrueになった後
    // ✅ 条件2: まだ実行されていない
    if (!userLoaded || fetchedRef.current) {
      return;
    }

    // ✅ 実行フラグを立てる（重複実行を防止）
    fetchedRef.current = true;

    const fetchFeedData = async () => {
      // フォロー中ゲーム取得関数
      const fetchFollowingGames = async (): Promise<PublicGame[]> => {
        if (!currentUser) {
          return [];
        }

        const followsQuery = supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const followsResult = await withTimeout(followsQuery, 8000) as any;
        const followingData = followsResult?.data;

        if (!followingData || followingData.length === 0) {
          return [];
        }

        const followingIds = followingData.map((f: any) => f.following_id);

        const gamesQuery = supabase
          .from('user_games')
          .select(`
            id, title, description, thumbnail_url, user_id, created_at, updated_at,
            profiles!user_games_user_id_fkey (id, username, avatar_url)
          `)
          .in('user_id', followingIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(12);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gamesResult = await withTimeout(gamesQuery, 8000) as any;
        const followingGames = gamesResult?.data;

        if (!followingGames) return [];

        return followingGames.map((game: any) => ({
          id: game.id,
          title: game.title || 'Untitled',
          description: game.description || '',
          thumbnail: game.thumbnail_url || '',
          author: {
            id: game.profiles?.id || game.user_id,
            name: game.profiles?.username || 'Unknown',
            avatar: game.profiles?.avatar_url || ''
          },
          stats: { likes: 0, shares: 0, bookmarks: 0, views: 0 },
          tags: [],
          category: '',
          createdAt: game.created_at,
          updatedAt: game.updated_at
        }));
      };

      // 全セクションを並列実行（最大8秒で全て完了）
      const [trendingResult, followingResult, tagsResult, randomResult] = await Promise.allSettled([
        // トレンドゲーム
        withTimeout(socialService.getTrendingGames('all', 'trending', 12), 8000)
          .then(games => {
            return games || [];
          }),
        // フォロー中
        fetchFollowingGames()
          .then(games => {
            return games;
          }),
        // おすすめ
        withTimeout(socialService.getTrendingGames('all', 'popular', 12), 8000)
          .then(games => {
            return games || [];
          }),
        // ランダム
        withTimeout(socialService.getRandomGames(12), 8000)
          .then(games => {
            return games || [];
          }),
      ]);

      // 結果を各セクションに反映
      if (trendingResult.status === 'fulfilled') {
        updateSection('trending', trendingResult.value, false);
      } else {
        console.error('❌ トレンドゲーム取得エラー:', trendingResult.reason);
        updateSection('trending', [], false, 'Failed to load trending games');
      }

      if (followingResult.status === 'fulfilled') {
        updateSection('following', followingResult.value, false);
      } else {
        console.error('❌ フォロー中ゲーム取得エラー:', followingResult.reason);
        updateSection('following', [], false, 'Failed to load following games');
      }

      if (tagsResult.status === 'fulfilled') {
        updateSection('tags', tagsResult.value, false);
      } else {
        console.error('❌ おすすめゲーム取得エラー:', tagsResult.reason);
        updateSection('tags', [], false, 'Failed to load recommended games');
      }

      if (randomResult.status === 'fulfilled') {
        updateSection('random', randomResult.value, false);
      } else {
        console.error('❌ ランダムゲーム取得エラー:', randomResult.reason);
        updateSection('random', [], false, 'Failed to load random games');
      }

      // プレミアム（Coming Soon）
      updateSection('premium', [], false);
    };

    fetchFeedData();
  }, [userLoaded, currentUser, socialService]); // ✅ userLoadedが変わった時のみ実行

  // ==================== リフレッシュ ====================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSections(prev => prev.map(section => ({ ...section, loading: true, error: undefined })));
    
    // ✅ 実行フラグをリセット
    fetchedRef.current = false;
    
    // ユーザー情報を再取得
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setUserLoaded(true); // ✅ これによりuseEffectが再実行される
    } catch (err) {
      console.warn('⚠️ ユーザー情報の再取得に失敗:', err);
      setCurrentUser(null);
      setUserLoaded(true);
    }
    
    setIsRefreshing(false);
  };

  // ==================== 現在のセクション ====================
  const currentSection = sections.find(s => s.id === selectedSection);

  // ==================== スタイル ====================
  // 🎨 GALLERY: 無彩色 + ヴァーミリオン1アクセント。影を使わず1px罫線で構造を作る
  const styles = {
    container: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#fafaf7',
      zIndex: 50,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const
    },
    header: {
      backgroundColor: '#fafaf7',
      borderBottom: '1px solid #111111',
      padding: '16px 20px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#111111',
      padding: '8px 14px',
      borderRadius: '0',
      border: '1px solid #111111',
      background: 'transparent',
      cursor: 'pointer',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '13px'
    },
    title: {
      color: '#111111',
      fontFamily: "'Fraunces', Georgia, serif",
      fontWeight: 600,
      fontSize: '22px',
      letterSpacing: '-0.5px',
      margin: 0
    },
    refreshButton: {
      padding: '8px 14px',
      borderRadius: '0',
      border: '1px solid #111111',
      background: 'transparent',
      color: '#111111',
      cursor: 'pointer',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '13px'
    },
    tabs: {
      backgroundColor: '#fafaf7',
      borderBottom: '1px solid #e6e6e0',
      padding: '12px 20px',
      overflowX: 'auto' as const
    },
    tabsInner: {
      display: 'flex',
      gap: '8px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    tab: (isActive: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      borderRadius: '0',
      border: `1px solid ${isActive ? '#111111' : '#e6e6e0'}`,
      background: isActive ? '#111111' : '#ffffff',
      color: isActive ? '#ffffff' : '#4a4a45',
      cursor: 'pointer',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontSize: '13px',
      fontWeight: 600,
      whiteSpace: 'nowrap' as const
    }),
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '20px'
    },
    contentInner: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '0',
      overflow: 'hidden',
      border: '1px solid #e6e6e0',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: 'none'
    },
    thumbnail: {
      aspectRatio: '16/9',
      backgroundColor: '#f4f4f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      position: 'relative' as const
    },
    thumbnailImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const
    },
    cardContent: {
      padding: '16px'
    },
    cardTitle: {
      color: '#111111',
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '17px',
      fontWeight: 600,
      marginBottom: '8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const
    },
    cardDescription: {
      color: '#6b6b66',
      fontSize: '14px',
      marginBottom: '12px',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden'
    },
    cardFooter: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    author: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    avatar: {
      width: '28px',
      height: '28px',
      background: '#111111',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '13px',
      fontWeight: 700
    },
    authorName: {
      color: '#6b6b66',
      fontSize: '13px'
    },
    stats: {
      display: 'flex',
      gap: '12px',
      color: '#a8a8a0',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontSize: '12px'
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#6b6b66'
    },
    empty: {
      textAlign: 'center' as const,
      padding: '60px 20px'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    emptyTitle: {
      color: '#111111',
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '22px',
      fontWeight: 600,
      marginBottom: '8px'
    },
    emptyText: {
      color: '#6b6b66',
      fontSize: '14px'
    },
    error: {
      textAlign: 'center' as const,
      padding: '60px 20px'
    },
    errorIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    errorTitle: {
      color: '#c41c08',
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '22px',
      fontWeight: 600,
      marginBottom: '8px'
    },
    errorText: {
      color: '#6b6b66',
      fontSize: '14px',
      marginBottom: '16px'
    },
    retryButton: {
      padding: '10px 20px',
      backgroundColor: '#ff3b1f',
      color: 'white',
      border: 'none',
      borderRadius: '0',
      cursor: 'pointer',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontSize: '14px',
      fontWeight: 600
    }
  };

  return (
    <div style={styles.container} className="game-feed-container">
      {/* ヘッダー */}
      <header style={styles.header} className="game-feed-header">
        <div style={styles.headerContent} className="game-feed-header-content">
          <button onClick={onBack} style={styles.backButton}>
            ← {t('common.back')}
          </button>
          <h1 style={styles.title}>{t('gameFeed.newGames')}</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              ...styles.refreshButton,
              opacity: isRefreshing ? 0.5 : 1
            }}
          >
            {isRefreshing ? t('common.loading') : `🔄 ${t('common.retry')}`}
          </button>
        </div>
      </header>

      {/* タブ */}
      <div style={styles.tabs} className="game-feed-tabs">
        <div style={styles.tabsInner} className="game-feed-tabs-inner">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              style={styles.tab(selectedSection === section.id)}
            >
              <span>{section.icon}</span>
              <span>{t(section.titleKey)}</span>
              {!section.loading && section.games.length > 0 && (
                <span style={{
                  fontSize: '12px',
                  opacity: 0.7,
                  marginLeft: '4px'
                }}>
                  ({section.games.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div style={styles.content}>
        <div style={styles.contentInner}>
          {/* プレミアムセクション */}
          {selectedSection === 'premium' && (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>💎</div>
              <div style={styles.emptyTitle}>{t('gameFeed.premium')}</div>
              <p style={styles.emptyText}>Coming Soon...</p>
            </div>
          )}

          {/* その他のセクション */}
          {selectedSection !== 'premium' && currentSection && (
            <>
              {currentSection.loading ? (
                <div style={styles.loading}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                  <p>{t('common.loading')}</p>
                </div>
              ) : currentSection.error ? (
                <div style={styles.error}>
                  <div style={styles.errorIcon}>⚠️</div>
                  <div style={styles.errorTitle}>Failed to Load</div>
                  <p style={styles.errorText}>{currentSection.error}</p>
                  <button onClick={handleRefresh} style={styles.retryButton}>
                    {t('common.retry')}
                  </button>
                </div>
              ) : currentSection.games.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>{currentSection.icon}</div>
                  <div style={styles.emptyTitle}>
                    {currentSection.id === 'following' && !currentUser
                      ? t('auth.loginTitle')
                      : 'No Games Yet'}
                  </div>
                  <p style={styles.emptyText}>
                    {currentSection.id === 'following' && !currentUser
                      ? t('auth.dontHaveAccount')
                      : 'Check back later for new games!'}
                  </p>
                </div>
              ) : (
                <div style={styles.grid} className="game-feed-grid">
                  {currentSection.games.map((game) => (
                    <div
                      key={game.id}
                      style={styles.card}
                      onClick={() => onGameSelect(game)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#111111';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e6e6e0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={styles.thumbnail}>
                        {game.thumbnail ? (
                          <img
                            src={game.thumbnail}
                            alt={game.title}
                            style={styles.thumbnailImg}
                          />
                        ) : (
                          <span>🎮</span>
                        )}
                      </div>
                      <div style={styles.cardContent}>
                        <div style={styles.cardTitle}>{game.title}</div>
                        {game.description && (
                          <p style={styles.cardDescription}>{game.description}</p>
                        )}
                        <div style={styles.cardFooter}>
                          <div style={styles.author}>
                            <div style={styles.avatar}>
                              {game.author.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={styles.authorName}>{game.author.name}</span>
                          </div>
                          <div style={styles.stats}>
                            <span>❤️ {game.stats.likes}</span>
                            <span>👁️ {game.stats.views || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* モバイル用レスポンシブスタイル */}
      <style>{`
        /* モバイル向け調整 (768px以下) */
        @media (max-width: 768px) {
          .game-feed-header {
            padding: 12px 16px !important;
          }
          .game-feed-header-content {
            gap: 8px;
          }
          .game-feed-header-content h1 {
            font-size: 16px !important;
          }
          .game-feed-header-content button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .game-feed-tabs {
            padding: 8px 12px !important;
          }
          .game-feed-tabs-inner {
            gap: 6px !important;
          }
          .game-feed-tabs-inner button {
            padding: 8px 12px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
          }
          .game-feed-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
            gap: 12px !important;
          }
          .game-feed-container > div:last-of-type {
            padding: 12px !important;
          }
        }

        /* より小さな画面用 (480px以下) */
        @media (max-width: 480px) {
          .game-feed-header {
            padding: 10px 12px !important;
          }
          .game-feed-header-content h1 {
            font-size: 14px !important;
          }
          .game-feed-header-content button {
            padding: 5px 8px !important;
            font-size: 11px !important;
          }
          .game-feed-tabs {
            padding: 6px 8px !important;
          }
          .game-feed-tabs-inner button {
            padding: 6px 10px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
          }
          .game-feed-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GameFeed;
