// src/components/GameFeed.tsx
// モダンなゲームフィード画面 - TikTok/Instagram Explore風デザイン

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

// ==================== アイコンコンポーネント ====================
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={spinning ? 'animate-spin' : ''}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const PlayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const GameFeed: React.FC<GameFeedProps> = ({ onGameSelect, onBack }) => {
  console.log('🎯 GameFeed コンポーネント レンダリング開始');

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
      // トレンドゲーム
      const trendingGames = await socialService.getTrendingGames('today', 'trending', 12);
      updateSection('trending', trendingGames, false);

      // フォロー中のユーザーのゲーム（ログイン時のみ）
      if (currentUser) {
        try {
          // フォロー中のユーザーIDを取得
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);

          if (followingData && followingData.length > 0) {
            const followingIds = followingData.map(f => f.following_id);

            // フォロー中ユーザーのゲームを取得
            const { data: followingGames } = await supabase
              .from('user_games')
              .select(`
                id,
                title,
                description,
                thumbnail_url,
                user_id,
                created_at,
                updated_at,
                profiles!user_games_user_id_fkey (
                  id,
                  username,
                  avatar_url
                )
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
          console.warn('フォロー中のゲーム取得に失敗:', err);
          updateSection('following', [], false);
        }
      } else {
        updateSection('following', [], false);
      }

      // おすすめゲーム（人気順）
      const tagGames = await socialService.getTrendingGames('week', 'popular', 12);
      updateSection('tags', tagGames, false);

      // ランダムゲーム
      const randomGames = await socialService.getRandomGames(12);
      updateSection('random', randomGames, false);

      // プレミアム（Coming Soon）
      updateSection('premium', [], false);

    } catch (err) {
      console.error('フィードデータの取得に失敗:', err);
    }
  }, [socialService, currentUser, updateSection]);

  useEffect(() => {
    fetchFeedData();
  }, [fetchFeedData]);

  // ==================== リフレッシュ ====================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // すべてのセクションをローディング状態に
    setSections(prev => prev.map(section => ({ ...section, loading: true })));
    await fetchFeedData();
    setIsRefreshing(false);
  };

  // ==================== 検索フィルタ ====================
  const filteredGames = useMemo(() => {
    const currentSection = sections.find(s => s.id === selectedSection);
    if (!currentSection) return [];

    if (!searchQuery.trim()) return currentSection.games;

    const query = searchQuery.toLowerCase();
    return currentSection.games.filter(game =>
      game.title.toLowerCase().includes(query) ||
      game.author.name.toLowerCase().includes(query) ||
      game.description.toLowerCase().includes(query)
    );
  }, [sections, selectedSection, searchQuery]);

  // ==================== 現在のセクション ====================
  const currentSection = sections.find(s => s.id === selectedSection);

  // ==================== 統計フォーマット ====================
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  console.log('🎯 GameFeed レンダリング実行中 - selectedSection:', selectedSection);

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] z-50 overflow-hidden flex flex-col">
      {/* ==================== ヘッダー ==================== */}
      <header className="bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* メインヘッダー */}
          <div className="h-16 flex items-center justify-between gap-4">
            {/* 戻るボタン */}
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/70 hover:text-white transition-colors p-2 -ml-2 rounded-xl hover:bg-white/5"
            >
              <BackIcon />
              <span className="font-medium hidden sm:block">戻る</span>
            </button>

            {/* タイトル */}
            <h1 className="text-white font-bold text-lg sm:text-xl tracking-tight">
              ゲームフィード
            </h1>

            {/* アクションボタン */}
            <div className="flex items-center gap-1">
              {/* 検索トグル */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2.5 rounded-xl transition-all ${
                  showSearch
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <SearchIcon />
              </button>

              {/* リフレッシュ */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <RefreshIcon spinning={isRefreshing} />
              </button>

              {/* ユーザーアバター */}
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm ml-1">
                {currentUser ? currentUser.email?.charAt(0).toUpperCase() || 'U' : '?'}
              </div>
            </div>
          </div>

          {/* 検索バー（展開時） */}
          {showSearch && (
            <div className="pb-4 animate-in slide-in-from-top duration-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ゲームを検索..."
                  className="w-full h-11 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ==================== タブナビゲーション ==================== */}
      <div className="bg-[#0a0a0f]/60 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-2 overflow-x-auto scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  selectedSection === section.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
                {!section.loading && section.games.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                    selectedSection === section.id
                      ? 'bg-white/20'
                      : 'bg-white/10'
                  }`}>
                    {section.games.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== コンテンツエリア ==================== */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* プレミアムセクション */}
          {selectedSection === 'premium' && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md mx-auto px-4">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center">
                  <span className="text-5xl">💎</span>
                </div>
                <h2 className="text-white text-2xl sm:text-3xl font-bold mb-3">
                  プレミアムゲーム
                </h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                  クリエイターを応援して、特別なゲームをプレイしましょう。
                  Coming Soon...
                </p>
                <button className="px-8 py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95">
                  通知を受け取る
                </button>
              </div>
            </div>
          )}

          {/* その他のセクション */}
          {selectedSection !== 'premium' && currentSection && (
            <div>
              {currentSection.loading ? (
                // ローディングスケルトン
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-video bg-white/5 rounded-2xl mb-3" />
                      <div className="h-4 bg-white/5 rounded-lg mb-2 w-3/4" />
                      <div className="h-3 bg-white/5 rounded-lg w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredGames.length === 0 ? (
                // 空状態
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-3xl flex items-center justify-center">
                      <span className="text-4xl">{currentSection.icon}</span>
                    </div>
                    <h3 className="text-white text-xl font-bold mb-2">
                      {currentSection.id === 'following' && !currentUser
                        ? 'ログインが必要です'
                        : searchQuery
                        ? '検索結果がありません'
                        : 'ゲームがありません'}
                    </h3>
                    <p className="text-white/50 leading-relaxed">
                      {currentSection.id === 'following' && !currentUser
                        ? 'フォロー中のユーザーのゲームを見るにはログインしてください'
                        : searchQuery
                        ? '別のキーワードで検索してみてください'
                        : '新しいゲームが投稿されるまでお待ちください'}
                    </p>
                  </div>
                </div>
              ) : (
                // ゲームグリッド
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredGames.map((game, index) => (
                    <div
                      key={game.id}
                      className="group cursor-pointer"
                      onClick={() => onGameSelect(game)}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <div className="bg-white/[0.03] rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-purple-500/10">
                        {/* サムネイル */}
                        <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-pink-900/20 relative overflow-hidden">
                          {game.thumbnail ? (
                            <img
                              src={game.thumbnail}
                              alt={game.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-5xl opacity-30">🎮</span>
                            </div>
                          )}

                          {/* プレイボタンオーバーレイ */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                              <PlayIcon />
                            </div>
                          </div>

                          {/* 統計オーバーレイ（左下） */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs">
                              <EyeIcon />
                              <span>{formatNumber(game.stats.views || 0)}</span>
                            </div>
                          </div>
                        </div>

                        {/* ゲーム情報 */}
                        <div className="p-4">
                          <h3 className="text-white font-semibold text-base mb-1.5 truncate group-hover:text-purple-300 transition-colors">
                            {game.title}
                          </h3>

                          {game.description && (
                            <p className="text-white/40 text-sm mb-3 line-clamp-2 leading-relaxed">
                              {game.description}
                            </p>
                          )}

                          {/* 作者・統計 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                                {game.author.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-white/60 text-sm truncate">
                                {game.author.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-white/40 flex-shrink-0">
                              <div className="flex items-center gap-1">
                                <HeartIcon />
                                <span className="text-xs">{formatNumber(game.stats.likes)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookmarkIcon />
                                <span className="text-xs">{formatNumber(game.stats.bookmarks)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameFeed;
