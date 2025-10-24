// src/social/components/SocialFeed.tsx
// 修正版 - IntegratedGamePlayer統合

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame, FilterOption, SortOption } from '../types/SocialTypes';
import { IntegratedGamePlayer } from './IntegratedGamePlayer'; // 🔧 新規追加

interface SocialFeedProps {
  className?: string;
}

// フィルター・ソート定義
const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: '🎮 すべて', icon: '🎮' },
  { id: 'action', label: '⚡ アクション', icon: '⚡' },
  { id: 'puzzle', label: '🧩 パズル', icon: '🧩' },
  { id: 'casual', label: '😊 カジュアル', icon: '😊' },
  { id: 'arcade', label: '🕹️ アーケード', icon: '🕹️' }
];

const SORT_OPTIONS: SortOption[] = [
  { id: 'latest', label: '🆕 新着順', icon: '🆕' },
  { id: 'popular', label: '🔥 人気順', icon: '🔥' },
  { id: 'trending', label: '📈 トレンド', icon: '📈' },
  { id: 'mostPlayed', label: '🎯 プレイ数', icon: '🎯' }
];

export const SocialFeed: React.FC<SocialFeedProps> = ({ className = '' }) => {
  // 状態管理
  const [games, setGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔧 新規追加: IntegratedGamePlayer状態
  const [currentPlayingGame, setCurrentPlayingGame] = useState<PublicGame | null>(null);
  const [showGamePlayer, setShowGamePlayer] = useState(false);

  // サービスインスタンス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ゲーム取得関数
  const fetchGames = useCallback(async (
    reset: boolean = false,
    filter: string = selectedFilter,
    sort: string = selectedSort,
    search: string = searchQuery
  ) => {
    try {
      setLoading(reset);
      setError(null);

      const currentPage = reset ? 1 : page;
      const result = await socialService.getPublicGames({
        category: filter !== 'all' ? filter : undefined,
        sortBy: sort as any,
        search: search || undefined
      }, currentPage);

      if (reset) {
        setGames(result.games);
        setPage(1);
      } else {
        setGames(prev => [...prev, ...result.games]);
      }
      
      setHasMore(result.hasMore);
    } catch (err) {
      setError('ゲームの読み込みに失敗しました');
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [socialService, selectedFilter, selectedSort, searchQuery, page]);

  // 初期ロード
  useEffect(() => {
    fetchGames(true);
  }, [selectedFilter, selectedSort]);

  // 検索処理
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    fetchGames(true, selectedFilter, selectedSort, query);
  }, [selectedFilter, selectedSort, fetchGames]);

  // リフレッシュ処理
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGames(true);
  }, [fetchGames]);

  // もっと読み込み
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchGames(false);
    }
  }, [loading, hasMore, fetchGames]);

  // いいね処理
  const handleLike = useCallback(async (gameId: string) => {
    try {
      const result = await socialService.toggleLike(gameId, 'current-user');
      
      setGames(prev => prev.map(game => 
        game.id === gameId 
          ? { 
              ...game, 
              isLiked: result.isLiked,
              stats: { 
                ...game.stats, 
                likes: result.newCount 
              }
            }
          : game
      ));
    } catch (err) {
      console.error('Like error:', err);
    }
  }, [socialService]);

  // ブックマーク処理
  const handleBookmark = useCallback(async (gameId: string) => {
    try {
      const result = await socialService.toggleBookmark(gameId, 'current-user');
      
      setGames(prev => prev.map(game => 
        game.id === gameId 
          ? { 
              ...game, 
              isBookmarked: result.isBookmarked,
              stats: { 
                ...game.stats, 
                bookmarks: result.newCount 
              }
            }
          : game
      ));
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  }, [socialService]);

  // 🔧 修正: ゲームプレイ処理 - IntegratedGamePlayer統合
  const handlePlay = useCallback(async (gameId: string) => {
    try {
      // ビュー数増加
      const newViewCount = await socialService.incrementViews(gameId);
      
      setGames(prev => prev.map(game => 
        game.id === gameId 
          ? { ...game, stats: { ...game.stats, views: newViewCount }}
          : game
      ));
      
      // ゲームデータ取得・プレイヤー表示
      const game = games.find(g => g.id === gameId);
      if (game) {
        console.log(`${gameId}をプレイ開始 - IntegratedGamePlayer起動`);
        setCurrentPlayingGame(game);
        setShowGamePlayer(true);
      }
    } catch (err) {
      console.error('Play error:', err);
    }
  }, [socialService, games]);

  // 🔧 新規追加: IntegratedGamePlayer制御
  const handleCloseGamePlayer = useCallback(() => {
    setShowGamePlayer(false);
    setCurrentPlayingGame(null);
    
    // ゲーム終了後のデータ更新（必要に応じて）
    if (currentPlayingGame) {
      fetchGames(true); // リフレッシュしてゲーム統計を更新
    }
  }, [currentPlayingGame, fetchGames]);

  const handleNextGame = useCallback(() => {
    if (!currentPlayingGame) return;
    
    // 現在のゲームの次のゲームを選択
    const currentIndex = games.findIndex(g => g.id === currentPlayingGame.id);
    const nextGame = games[currentIndex + 1] || games[0]; // 次のゲームまたは最初のゲーム
    
    if (nextGame && nextGame.id !== currentPlayingGame.id) {
      setCurrentPlayingGame(nextGame);
      // showGamePlayerは既にtrueなので、IntegratedGamePlayerが自動的に新しいゲームをロードする
    } else {
      // 次のゲームがない場合は閉じる
      handleCloseGamePlayer();
    }
  }, [currentPlayingGame, games, handleCloseGamePlayer]);

  // フィルタリング済みゲーム
  const filteredGames = useMemo(() => {
    let filtered = games;
    
    if (searchQuery) {
      filtered = filtered.filter(game => 
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [games, searchQuery]);

  return (
    <>
      {/* 🔧 新規追加: IntegratedGamePlayer */}
      {showGamePlayer && currentPlayingGame && (
        <IntegratedGamePlayer 
          gameData={currentPlayingGame}
          onClose={handleCloseGamePlayer}
          onNextGame={handleNextGame}
        />
      )}

      {/* 既存のSocialFeedUI */}
      <div className={`social-feed ${className}`}>
        {/* ヘッダー */}
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">🎮 ゲーム発見</h1>
            <ModernButton
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {refreshing ? '⟳' : '🔄'} リフレッシュ
            </ModernButton>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 ゲームを検索..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-3.5 text-gray-400">🔍</div>
          </div>

          {/* フィルター・ソート */}
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1">
              {FILTER_OPTIONS.map((filter) => (
                <ModernButton
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`text-sm ${
                    selectedFilter === filter.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {filter.label}
                </ModernButton>
              ))}
            </div>
            
            <div className="w-px bg-gray-300"></div>
            
            <div className="flex flex-wrap gap-1">
              {SORT_OPTIONS.map((sort) => (
                <ModernButton
                  key={sort.id}
                  onClick={() => setSelectedSort(sort.id)}
                  className={`text-sm ${
                    selectedSort === sort.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {sort.label}
                </ModernButton>
              ))}
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ {error}
          </div>
        )}

        {/* ゲームグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map((game) => (
            <ModernCard key={game.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* ゲームサムネイル */}
              <div className="relative">
                <img 
                  src={game.thumbnail} 
                  alt={game.title}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <ModernButton
                    onClick={() => handleBookmark(game.id)}
                    className={`p-1 text-xs ${
                      game.isBookmarked 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-white bg-opacity-80 text-gray-600'
                    }`}
                  >
                    {game.isBookmarked ? '⭐' : '☆'}
                  </ModernButton>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {game.category}
                  </span>
                </div>
              </div>

              {/* ゲーム情報 */}
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 mb-1 truncate">{game.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{game.description}</p>
                
                {/* 作者情報 */}
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src={game.author.avatar} 
                    alt={game.author.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-xs text-gray-500">{game.author.name}</span>
                </div>

                {/* 統計情報 */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>👁️ {game.stats.views?.toLocaleString() || 0}</span>
                  <span>❤️ {game.stats.likes.toLocaleString()}</span>
                  <span>📤 {game.stats.shares}</span>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-1">
                  <ModernButton
                    onClick={() => handlePlay(game.id)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2"
                  >
                    ▶️ プレイ
                  </ModernButton>
                  <ModernButton
                    onClick={() => handleLike(game.id)}
                    className={`px-3 text-sm ${
                      game.isLiked 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {game.isLiked ? '❤️' : '🤍'}
                  </ModernButton>
                </div>
              </div>
            </ModernCard>
          ))}
        </div>

        {/* ローディング・もっと読み込み */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">読み込み中...</span>
          </div>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center py-6">
            <ModernButton
              onClick={loadMore}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              📄 もっと見る
            </ModernButton>
          </div>
        )}

        {!loading && !hasMore && filteredGames.length > 0 && (
          <div className="text-center py-6 text-gray-500">
            ✨ すべてのゲームを表示しました
          </div>
        )}

        {!loading && filteredGames.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">ゲームが見つかりません</h3>
            <p className="text-gray-500">検索条件を変更してお試しください</p>
          </div>
        )}
      </div>
    </>
  );
};