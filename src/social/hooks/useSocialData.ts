// src/social/hooks/useSocialData.ts
// 🔧 修正版: ユーザーID取得を実装（'current-user'ハードコード削除）

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SocialService } from '../services/SocialService';
import { PublicGame, UserProfile, UserGame, GameFilters } from '../types/SocialTypes';

// ソーシャルフィード用フック
export const useSocialFeed = () => {
  const [games, setGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const socialService = useMemo(() => SocialService.getInstance(), []);

  const fetchGames = useCallback(async (
    filters: GameFilters = {},
    reset: boolean = false
  ) => {
    try {
      setLoading(reset);
      setError(null);

      const currentPage = reset ? 1 : page;
      const result = await socialService.getPublicGames(filters, currentPage);

      if (reset) {
        setGames(result.games);
        setPage(1);
      } else {
        setGames(prev => [...prev, ...result.games]);
      }
      
      setHasMore(result.hasMore);
    } catch (err) {
      setError('ゲームの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [socialService, page]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback((filters?: GameFilters) => {
    fetchGames(filters, true);
  }, [fetchGames]);

  return {
    games,
    loading,
    error,
    hasMore,
    fetchGames,
    loadMore,
    refresh
  };
};

// ユーザープロフィール用フック
export const useUserProfile = (userId: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socialService = useMemo(() => SocialService.getInstance(), []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [profileData, gamesData] = await Promise.all([
        socialService.getUserProfile(userId),
        socialService.getUserGames(userId)
      ]);

      setProfile(profileData);
      setGames(gamesData);
    } catch (err) {
      setError('プロフィールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [socialService, userId]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    
    try {
      const updatedProfile = await socialService.updateProfile(profile.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Profile update error:', err);
      throw err;
    }
  }, [socialService, profile]);

  const deleteGame = useCallback(async (gameId: string) => {
    try {
      await socialService.deleteGame(gameId, userId);
      setGames(prev => prev.filter(game => game.id !== gameId));
    } catch (err) {
      console.error('Delete game error:', err);
      throw err;
    }
  }, [socialService, userId]);

  const toggleGameStatus = useCallback(async (gameId: string) => {
    try {
      const newStatus = await socialService.toggleGameStatus(gameId, userId);
      setGames(prev => prev.map(game => 
        game.id === gameId 
          ? { ...game, status: newStatus as any }
          : game
      ));
      return newStatus;
    } catch (err) {
      console.error('Toggle game status error:', err);
      throw err;
    }
  }, [socialService, userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    games,
    loading,
    error,
    fetchProfile,
    updateProfile,
    deleteGame,
    toggleGameStatus
  };
};

// ソーシャル統計用フック
// 🔧 修正: ユーザーID取得を実装
export const useSocialStats = (gameId: string, initialStats: any) => {
  const [stats, setStats] = useState(initialStats);
  const [state, setState] = useState({
    isLiked: false,
    isBookmarked: false,
    isShared: false
  });

  const socialService = useMemo(() => SocialService.getInstance(), []);

  const toggleLike = useCallback(async () => {
    try {
      // ✅ Supabaseから現在のユーザーを取得
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const result = await socialService.toggleLike(gameId, user.id);
      setState(prev => ({ ...prev, isLiked: result.isLiked }));
      setStats((prev: any) => ({ ...prev, likes: result.newCount }));
      return result;
    } catch (err) {
      console.error('Like error:', err);
      throw err;
    }
  }, [socialService, gameId]);

  const toggleBookmark = useCallback(async () => {
    try {
      // ✅ Supabaseから現在のユーザーを取得
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const result = await socialService.toggleBookmark(gameId, user.id);
      setState(prev => ({ ...prev, isBookmarked: result.isBookmarked }));
      setStats((prev: any) => ({ ...prev, bookmarks: result.newCount }));
      return result;
    } catch (err) {
      console.error('Bookmark error:', err);
      throw err;
    }
  }, [socialService, gameId]);

  const recordShare = useCallback(async (platform: string) => {
    try {
      // ✅ Supabaseから現在のユーザーを取得
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const newShareCount = await socialService.recordShare(gameId, platform, user.id);
      setState(prev => ({ ...prev, isShared: true }));
      setStats((prev: any) => ({ ...prev, shares: newShareCount }));
      return newShareCount;
    } catch (err) {
      console.error('Share error:', err);
      throw err;
    }
  }, [socialService, gameId]);

  const incrementViews = useCallback(async () => {
    try {
      const newViewCount = await socialService.incrementViews(gameId);
      setStats((prev: any) => ({ ...prev, views: newViewCount }));
      return newViewCount;
    } catch (err) {
      console.error('View error:', err);
      return 0;
    }
  }, [socialService, gameId]);

  return {
    stats,
    state,
    toggleLike,
    toggleBookmark,
    recordShare,
    incrementViews
  };
};

// フォロー機能用フック
// 🔧 修正: ユーザーID取得を実装
export const useFollow = (targetUserId: string, initialIsFollowing: boolean = false) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const socialService = useMemo(() => SocialService.getInstance(), []);

  const toggleFollow = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      
      // ✅ Supabaseから現在のユーザーを取得
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const result = await socialService.toggleFollow(targetUserId, user.id);
      setIsFollowing(result.isFollowing);
      setFollowerCount(result.newCount);
      return result;
    } catch (err) {
      console.error('Follow error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [socialService, targetUserId, loading]);

  return {
    isFollowing,
    loading,
    followerCount,
    toggleFollow
  };
};

// 検索・フィルタリング用フック
export const useGameFilters = () => {
  const [filters, setFilters] = useState<GameFilters>({
    category: undefined,
    sortBy: 'latest',
    search: '',
    tags: [],
    dateRange: undefined
  });

  const updateFilter = useCallback((key: keyof GameFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      category: undefined,
      sortBy: 'latest',
      search: '',
      tags: [],
      dateRange: undefined
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.category ||
      filters.search ||
      (filters.tags && filters.tags.length > 0) ||
      filters.dateRange
    );
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters
  };
};

// デバウンス用フック
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ローカルストレージ用フック
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
};