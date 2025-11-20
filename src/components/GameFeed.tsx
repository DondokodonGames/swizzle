// src/components/GameFeed.tsx
// モダンなゲームフィード画面 - 完全インラインスタイル版

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SocialService } from '../social/services/SocialService';
import { PublicGame } from '../social/types/SocialTypes';
import { supabase } from '../lib/supabase';

interface GameFeedProps {
  onGameSelect: (game: PublicGame) => void;
  onBack: () => void;
}

interface FeedSection {
  id: string;
  title: string;
  icon: string;
  games: PublicGame[];
  loading: boolean;
}

export const GameFeed: React.FC<GameFeedProps> = ({ onGameSelect, onBack }) => {
  // ==================== 状態管理 ====================
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sections, setSections] = useState<FeedSection[]>([
    { id: 'trending', title: 'トレンド', icon: '🔥', games: [], loading: true },
    { id: 'following', title: 'フォロー中', icon: '👥', games: [], loading: true },
    { id: 'tags', title: 'おすすめ', icon: '✨', games: [], loading: true },
    { id: 'random', title: 'ランダム', icon: '🎲', games: [], loading: true },
    { id: 'premium', title: 'プレミアム', icon: '💎', games: [], loading: true }
  ]);
  const [selectedSection, setSelectedSection] = useState<string>('trending');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ==================== サービス ====================
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ==================== ユーザー情報取得 ====================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (err) {
        console.warn('ユーザー情報の取得に失敗:', err);
      }
    };

    fetchUser();
  }, []);

  // ==================== セクション更新 ====================
  const updateSection = useCallback((id: string, games: PublicGame[], loading: boolean) => {
    setSections(prev => prev.map(section =>
      section.id === id ? { ...section, games, loading } : section
    ));
  }, []);

  // ==================== フィードデータ取得 ====================
  const fetchFeedData = useCallback(async () => {
    try {
      console.log('📊 フィードデータ取得開始');

      // トレンドゲーム
      try {
        const trendingGames = await socialService.getTrendingGames('today', 'trending', 12);
        console.log('📊 トレンドゲーム取得:', trendingGames?.length || 0, '件');
        updateSection('trending', trendingGames || [], false);
      } catch (err) {
        console.error('❌ トレンドゲーム取得エラー:', err);
        updateSection('trending', [], false);
      }

      // フォロー中
      if (currentUser) {
        try {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);

          if (followingData && followingData.length > 0) {
            const followingIds = followingData.map(f => f.following_id);
            const { data: followingGames } = await supabase
              .from('user_games')
              .select(`
                id, title, description, thumbnail_url, user_id, created_at, updated_at,
                profiles!user_games_user_id_fkey (id, username, avatar_url)
              `)
              .in('user_id', followingIds)
              .eq('status', 'published')
              .order('created_at', { ascending: false })
              .limit(12);

            if (followingGames) {
              const formattedGames: PublicGame[] = followingGames.map((game: any) => ({
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
              updateSection('following', formattedGames, false);
            } else {
              updateSection('following', [], false);
            }
          } else {
            updateSection('following', [], false);
          }
        } catch (err) {
          updateSection('following', [], false);
        }
      } else {
        updateSection('following', [], false);
      }

      // おすすめ
      try {
        const tagGames = await socialService.getTrendingGames('week', 'popular', 12);
        console.log('📊 おすすめゲーム取得:', tagGames?.length || 0, '件');
        updateSection('tags', tagGames || [], false);
      } catch (err) {
        console.error('❌ おすすめゲーム取得エラー:', err);
        updateSection('tags', [], false);
      }

      // ランダム
      try {
        const randomGames = await socialService.getRandomGames(12);
        console.log('📊 ランダムゲーム取得:', randomGames?.length || 0, '件');
        updateSection('random', randomGames || [], false);
      } catch (err) {
        console.error('❌ ランダムゲーム取得エラー:', err);
        updateSection('random', [], false);
      }

      // プレミアム
      updateSection('premium', [], false);

      console.log('📊 フィードデータ取得完了');

    } catch (err) {
      console.error('❌ フィードデータの取得に失敗:', err);
    }
  }, [socialService, currentUser, updateSection]);

  useEffect(() => {
    fetchFeedData();
  }, [fetchFeedData]);

  // ==================== リフレッシュ ====================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSections(prev => prev.map(section => ({ ...section, loading: true })));
    await fetchFeedData();
    setIsRefreshing(false);
  };

  // ==================== 現在のセクション ====================
  const currentSection = sections.find(s => s.id === selectedSection);

  // ==================== スタイル ====================
  const styles = {
    container: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0a0a0f',
      zIndex: 50,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const
    },
    header: {
      backgroundColor: 'rgba(10, 10, 15, 0.9)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
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
      color: 'rgba(255, 255, 255, 0.7)',
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      fontSize: '14px'
    },
    title: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: '20px',
      margin: 0
    },
    refreshButton: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.7)',
      cursor: 'pointer',
      fontSize: '14px'
    },
    tabs: {
      backgroundColor: 'rgba(10, 10, 15, 0.6)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
      borderRadius: '12px',
      border: 'none',
      background: isActive
        ? 'linear-gradient(to right, #a855f7, #ec4899)'
        : 'rgba(255, 255, 255, 0.1)',
      color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isActive ? 'bold' : 'normal',
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
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    thumbnail: {
      aspectRatio: '16/9',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const
    },
    cardDescription: {
      color: 'rgba(255, 255, 255, 0.5)',
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
      background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    authorName: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '13px'
    },
    stats: {
      display: 'flex',
      gap: '12px',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '12px'
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: 'rgba(255, 255, 255, 0.6)'
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
      color: 'white',
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    emptyText: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onBack} style={styles.backButton}>
            ← 戻る
          </button>
          <h1 style={styles.title}>ゲームフィード</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              ...styles.refreshButton,
              opacity: isRefreshing ? 0.5 : 1
            }}
          >
            {isRefreshing ? '更新中...' : '🔄 更新'}
          </button>
        </div>
      </header>

      {/* タブ */}
      <div style={styles.tabs}>
        <div style={styles.tabsInner}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              style={styles.tab(selectedSection === section.id)}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
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
              <div style={styles.emptyTitle}>プレミアムゲーム</div>
              <p style={styles.emptyText}>Coming Soon...</p>
            </div>
          )}

          {/* その他のセクション */}
          {selectedSection !== 'premium' && currentSection && (
            <>
              {currentSection.loading ? (
                <div style={styles.loading}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                  <p>読み込み中...</p>
                </div>
              ) : currentSection.games.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>{currentSection.icon}</div>
                  <div style={styles.emptyTitle}>
                    {currentSection.id === 'following' && !currentUser
                      ? 'ログインが必要です'
                      : 'ゲームがありません'}
                  </div>
                  <p style={styles.emptyText}>
                    {currentSection.id === 'following' && !currentUser
                      ? 'フォロー中のユーザーのゲームを見るにはログインしてください'
                      : '新しいゲームが投稿されるまでお待ちください'}
                  </p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {currentSection.games.map((game) => (
                    <div
                      key={game.id}
                      style={styles.card}
                      onClick={() => onGameSelect(game)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
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
    </div>
  );
};

export default GameFeed;
