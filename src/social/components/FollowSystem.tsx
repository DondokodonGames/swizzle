// src/social/components/FollowSystem.tsx - Supabase完全実装版

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { UserProfile } from '../types/SocialTypes';
import { supabase } from '../../lib/supabase';

interface FollowSystemProps {
  currentUserId: string;
  className?: string;
}

interface FollowUser extends UserProfile {
  mutualFollowers: number;
  relationshipType: 'none' | 'following' | 'follower' | 'mutual' | 'blocked';
  lastInteraction?: string;
  commonInterests: string[];
  score?: number;
}

interface FollowStats {
  totalFollowing: number;
  totalFollowers: number;
  mutualConnections: number;
  pendingRequests: number;
  blockedUsers: number;
}

interface FollowSettings {
  isPrivate: boolean;
  allowFollowRequests: boolean;
  showFollowerCount: boolean;
  showFollowingCount: boolean;
  notifyOnFollow: boolean;
  autoFollowBack: boolean;
  blockNewFollowers: boolean;
}

const FOLLOW_TABS = [
  { id: 'following', label: '🤝 フォロー中', icon: '🤝' },
  { id: 'followers', label: '👥 フォロワー', icon: '👥' },
  { id: 'mutual', label: '💫 相互フォロー', icon: '💫' },
  { id: 'suggestions', label: '✨ おすすめ', icon: '✨' }
];

const SORT_OPTIONS = [
  { id: 'recent', label: '最近の順', icon: '⏰' },
  { id: 'alphabetical', label: '名前順', icon: '🔤' },
  { id: 'interactions', label: '交流順', icon: '💬' },
  { id: 'mutual', label: '共通順', icon: '🤝' }
];

export const FollowSystem: React.FC<FollowSystemProps> = ({
  currentUserId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>('following');
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [stats, setStats] = useState<FollowStats>({
    totalFollowing: 0,
    totalFollowers: 0,
    mutualConnections: 0,
    pendingRequests: 0,
    blockedUsers: 0
  });
  const [settings, setSettings] = useState<FollowSettings>({
    isPrivate: false,
    allowFollowRequests: true,
    showFollowerCount: true,
    showFollowingCount: true,
    notifyOnFollow: true,
    autoFollowBack: false,
    blockNewFollowers: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');

  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ==================== Supabaseデータ取得 ====================

  const fetchFollowing = useCallback(async (): Promise<FollowUser[]> => {
    try {
      const { data: follows, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          created_at,
          profiles!follows_following_id_fkey (
            id, username, display_name, avatar_url, bio, created_at, updated_at
          )
        `)
        .eq('follower_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error || !follows || follows.length === 0) {
        return [];
      }

      const usersWithNull = await Promise.all(
        follows.map(async (follow: any) => {
          const profile = follow.profiles;
          if (!profile) return null;

          const { count: followerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.id);

          const { count: followingCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profile.id);

          const { data: mutualCheck } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', profile.id)
            .eq('following_id', currentUserId)
            .single();

          const isMutual = !!mutualCheck;

          const { data: games } = await supabase
            .from('user_games')
            .select('id, like_count, play_count')
            .eq('creator_id', profile.id)
            .eq('is_published', true);

          const totalGames = games?.length || 0;
          const totalLikes = games?.reduce((sum, g) => sum + (g.like_count || 0), 0) || 0;
          const totalPlays = games?.reduce((sum, g) => sum + (g.play_count || 0), 0) || 0;

          return {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatar: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`,
            banner: `https://picsum.photos/400/100?random=${profile.id}`,
            bio: profile.bio || 'ゲーム制作が好きです',
            location: '',
            website: '',
            stats: {
              totalGames,
              totalPlays,
              totalLikes,
              totalFollowers: followerCount || 0,
              totalFollowing: followingCount || 0,
              joinDate: profile.created_at.split('T')[0],
              lastActive: profile.updated_at
            },
            mutualFollowers: 0,
            relationshipType: isMutual ? 'mutual' : 'following',
            lastInteraction: follow.created_at,
            commonInterests: [],
            isFollowing: true,
            isOwner: false
          } as FollowUser;
        })
      );

      return usersWithNull.filter((u): u is FollowUser => u !== null);
    } catch (error) {
      console.error('Error in fetchFollowing:', error);
      return [];
    }
  }, [currentUserId]);

  const fetchFollowers = useCallback(async (): Promise<FollowUser[]> => {
    try {
      const { data: follows, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          created_at,
          profiles!follows_follower_id_fkey (
            id, username, display_name, avatar_url, bio, created_at, updated_at
          )
        `)
        .eq('following_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error || !follows || follows.length === 0) {
        return [];
      }

      const usersWithNull = await Promise.all(
        follows.map(async (follow: any) => {
          const profile = follow.profiles;
          if (!profile) return null;

          const { count: followerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.id);

          const { count: followingCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profile.id);

          const { data: followingCheck } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', currentUserId)
            .eq('following_id', profile.id)
            .single();

          const isFollowingBack = !!followingCheck;

          const { data: games } = await supabase
            .from('user_games')
            .select('id, like_count, play_count')
            .eq('creator_id', profile.id)
            .eq('is_published', true);

          const totalGames = games?.length || 0;
          const totalLikes = games?.reduce((sum, g) => sum + (g.like_count || 0), 0) || 0;
          const totalPlays = games?.reduce((sum, g) => sum + (g.play_count || 0), 0) || 0;

          return {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatar: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`,
            banner: `https://picsum.photos/400/100?random=${profile.id}`,
            bio: profile.bio || 'ゲーム制作が好きです',
            location: '',
            website: '',
            stats: {
              totalGames,
              totalPlays,
              totalLikes,
              totalFollowers: followerCount || 0,
              totalFollowing: followingCount || 0,
              joinDate: profile.created_at.split('T')[0],
              lastActive: profile.updated_at
            },
            mutualFollowers: 0,
            relationshipType: isFollowingBack ? 'mutual' : 'follower',
            lastInteraction: follow.created_at,
            commonInterests: [],
            isFollowing: isFollowingBack,
            isOwner: false
          } as FollowUser;
        })
      );

      return usersWithNull.filter((u): u is FollowUser => u !== null);
    } catch (error) {
      console.error('Error in fetchFollowers:', error);
      return [];
    }
  }, [currentUserId]);

  const fetchMutual = useCallback(async (): Promise<FollowUser[]> => {
    try {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (!following || following.length === 0) {
        return [];
      }

      const followingIds = following.map(f => f.following_id);

      const { data: mutual, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          created_at,
          profiles!follows_follower_id_fkey (
            id, username, display_name, avatar_url, bio, created_at, updated_at
          )
        `)
        .eq('following_id', currentUserId)
        .in('follower_id', followingIds);

      if (error || !mutual || mutual.length === 0) {
        return [];
      }

      const usersWithNull = await Promise.all(
        mutual.map(async (follow: any) => {
          const profile = follow.profiles;
          if (!profile) return null;

          const { count: followerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.id);

          const { count: followingCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profile.id);

          const { data: games } = await supabase
            .from('user_games')
            .select('id, like_count, play_count')
            .eq('creator_id', profile.id)
            .eq('is_published', true);

          const totalGames = games?.length || 0;
          const totalLikes = games?.reduce((sum, g) => sum + (g.like_count || 0), 0) || 0;
          const totalPlays = games?.reduce((sum, g) => sum + (g.play_count || 0), 0) || 0;

          return {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatar: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`,
            banner: `https://picsum.photos/400/100?random=${profile.id}`,
            bio: profile.bio || 'ゲーム制作が好きです',
            location: '',
            website: '',
            stats: {
              totalGames,
              totalPlays,
              totalLikes,
              totalFollowers: followerCount || 0,
              totalFollowing: followingCount || 0,
              joinDate: profile.created_at.split('T')[0],
              lastActive: profile.updated_at
            },
            mutualFollowers: 0,
            relationshipType: 'mutual',
            lastInteraction: follow.created_at,
            commonInterests: [],
            isFollowing: true,
            isOwner: false
          } as FollowUser;
        })
      );

      return usersWithNull.filter((u): u is FollowUser => u !== null);
    } catch (error) {
      console.error('Error in fetchMutual:', error);
      return [];
    }
  }, [currentUserId]);

  const fetchSuggestions = useCallback(async (): Promise<FollowUser[]> => {
    try {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const followingIds = following?.map(f => f.following_id) || [];
      followingIds.push(currentUserId);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${followingIds.join(',')})`)
        .limit(20);

      if (error || !profiles || profiles.length === 0) {
        return [];
      }

      const users: FollowUser[] = await Promise.all(
        profiles.map(async (profile: any) => {
          const { count: followerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.id);

          const { data: games } = await supabase
            .from('user_games')
            .select('id, like_count, play_count')
            .eq('creator_id', profile.id)
            .eq('is_published', true);

          const totalGames = games?.length || 0;
          const totalLikes = games?.reduce((sum, g) => sum + (g.like_count || 0), 0) || 0;
          const totalPlays = games?.reduce((sum, g) => sum + (g.play_count || 0), 0) || 0;

          const score = Math.min(
            100,
            Math.round(
              ((followerCount || 0) * 0.3) +
              (totalGames * 2) +
              ((totalLikes / 100) * 0.5)
            )
          );

          return {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatar: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`,
            banner: `https://picsum.photos/400/100?random=${profile.id}`,
            bio: profile.bio || 'ゲーム制作が好きです',
            location: '',
            website: '',
            stats: {
              totalGames,
              totalPlays,
              totalLikes,
              totalFollowers: followerCount || 0,
              totalFollowing: 0,
              joinDate: profile.created_at.split('T')[0],
              lastActive: profile.updated_at
            },
            mutualFollowers: 0,
            relationshipType: 'none',
            commonInterests: [],
            score,
            isFollowing: false,
            isOwner: false
          } as FollowUser;
        })
      );

      return users.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (error) {
      console.error('Error in fetchSuggestions:', error);
      return [];
    }
  }, [currentUserId]);

  const fetchStats = useCallback(async () => {
    try {
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', currentUserId);

      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', currentUserId);

      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const followingIds = following?.map(f => f.following_id) || [];

      let mutualCount = 0;
      if (followingIds.length > 0) {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', currentUserId)
          .in('follower_id', followingIds);

        mutualCount = count || 0;
      }

      setStats({
        totalFollowing: followingCount || 0,
        totalFollowers: followerCount || 0,
        mutualConnections: mutualCount,
        pendingRequests: 0,
        blockedUsers: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [currentUserId]);

  const fetchData = useCallback(async (tab: string = activeTab) => {
    try {
      setLoading(true);
      setError(null);

      let fetchedUsers: FollowUser[] = [];

      switch (tab) {
        case 'following':
          fetchedUsers = await fetchFollowing();
          break;
        case 'followers':
          fetchedUsers = await fetchFollowers();
          break;
        case 'mutual':
          fetchedUsers = await fetchMutual();
          break;
        case 'suggestions':
          fetchedUsers = await fetchSuggestions();
          break;
        default:
          fetchedUsers = [];
      }

      const sortedUsers = sortUsers(fetchedUsers, sortBy);

      const filteredUsers = searchQuery
        ? sortedUsers.filter(user =>
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : sortedUsers;

      setUsers(filteredUsers);
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error('Error fetching follow data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, sortBy, searchQuery, fetchFollowing, fetchFollowers, fetchMutual, fetchSuggestions]);

  const sortUsers = useCallback((users: FollowUser[], sortType: string): FollowUser[] => {
    return [...users].sort((a, b) => {
      switch (sortType) {
        case 'alphabetical':
          return a.displayName.localeCompare(b.displayName);
        case 'interactions':
          const aInteraction = a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0;
          const bInteraction = b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0;
          return bInteraction - aInteraction;
        case 'mutual':
          return b.mutualFollowers - a.mutualFollowers;
        case 'recent':
        default:
          const aTime = new Date(a.stats.lastActive).getTime();
          const bTime = new Date(b.stats.lastActive).getTime();
          return bTime - aTime;
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('follow_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading follow settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('follow_settings', JSON.stringify(settings));
  }, [settings]);

  const handleFollow = useCallback(async (userId: string, action: 'follow' | 'unfollow' | 'remove') => {
    try {
      await socialService.toggleFollow(userId, currentUserId);

      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          let newRelationType: FollowUser['relationshipType'];
          switch (action) {
            case 'follow':
              newRelationType = user.relationshipType === 'follower' ? 'mutual' : 'following';
              break;
            case 'unfollow':
              newRelationType = user.relationshipType === 'mutual' ? 'follower' : 'none';
              break;
            case 'remove':
              newRelationType = user.relationshipType === 'mutual' ? 'following' : 'none';
              break;
            default:
              newRelationType = user.relationshipType;
          }

          return {
            ...user,
            relationshipType: newRelationType,
            isFollowing: newRelationType === 'following' || newRelationType === 'mutual'
          };
        }
        return user;
      }));

      await fetchStats();
    } catch (error) {
      console.error('Follow action error:', error);
    }
  }, [socialService, currentUserId, fetchStats]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      const userIds = Array.from(selectedUsers);

      switch (bulkAction) {
        case 'unfollow':
          for (const userId of userIds) {
            await handleFollow(userId, 'unfollow');
          }
          break;
        case 'remove':
          for (const userId of userIds) {
            await handleFollow(userId, 'remove');
          }
          break;
        default:
          break;
      }

      setSelectedUsers(new Set());
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  }, [bulkAction, selectedUsers, handleFollow]);

  const handleSettingsUpdate = useCallback((key: keyof FollowSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleUserSelect = useCallback((userId: string, selected: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  }, [users]);

  return (
    <div className={`follow-system ${className}`}>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">👥 フォロー管理</h2>
          <ModernButton
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            ⚙️ 設定
          </ModernButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalFollowing}</div>
            <div className="text-sm text-gray-600">フォロー中</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.totalFollowers}</div>
            <div className="text-sm text-gray-600">フォロワー</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.mutualConnections}</div>
            <div className="text-sm text-gray-600">相互フォロー</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
            <div className="text-sm text-gray-600">リクエスト</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.blockedUsers}</div>
            <div className="text-sm text-gray-600">ブロック</div>
          </div>
        </div>
      </div>

      {showSettings && (
        <ModernCard className="p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">フォロー設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.isPrivate}
                onChange={(e) => handleSettingsUpdate('isPrivate', e.target.checked)}
              />
              <span className="text-sm">🔒 プライベートアカウント（承認制）</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allowFollowRequests}
                onChange={(e) => handleSettingsUpdate('allowFollowRequests', e.target.checked)}
              />
              <span className="text-sm">📮 フォローリクエストを受け取る</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showFollowerCount}
                onChange={(e) => handleSettingsUpdate('showFollowerCount', e.target.checked)}
              />
              <span className="text-sm">👥 フォロワー数を公開</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showFollowingCount}
                onChange={(e) => handleSettingsUpdate('showFollowingCount', e.target.checked)}
              />
              <span className="text-sm">🤝 フォロー数を公開</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifyOnFollow}
                onChange={(e) => handleSettingsUpdate('notifyOnFollow', e.target.checked)}
              />
              <span className="text-sm">🔔 フォロー通知</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoFollowBack}
                onChange={(e) => handleSettingsUpdate('autoFollowBack', e.target.checked)}
              />
              <span className="text-sm">🔄 自動フォローバック</span>
            </label>
          </div>
        </ModernCard>
      )}

      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
        {FOLLOW_TABS.map((tab) => (
          <ModernButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm border-b-2 rounded-none ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </ModernButton>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="ユーザーを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.icon} {opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedUsers.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedUsers.size}人選択中
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-1 border border-blue-300 rounded text-sm"
          >
            <option value="">一括操作を選択</option>
            {(activeTab === 'following' || activeTab === 'mutual') && (
              <option value="unfollow">フォロー解除</option>
            )}
            {(activeTab === 'followers' || activeTab === 'mutual') && (
              <option value="remove">フォロワーから削除</option>
            )}
          </select>
          <ModernButton
            onClick={handleBulkAction}
            disabled={!bulkAction}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          >
            実行
          </ModernButton>
          <ModernButton
            onClick={() => setSelectedUsers(new Set())}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            選択解除
          </ModernButton>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">読み込み中...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">❌ {error}</div>
          <ModernButton
            onClick={() => fetchData()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            再読み込み
          </ModernButton>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {searchQuery ? '検索結果が見つかりません' : 'ユーザーがいません'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'suggestions' ? 'おすすめユーザーを読み込んでいます...' :
             searchQuery ? '検索条件を変更してお試しください' :
             'まだ該当するユーザーがいません'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={selectedUsers.size === users.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="text-sm text-gray-600">全て選択</span>
            </div>
          )}

          {users.map((user) => (
            <ModernCard key={user.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                  className="mt-2"
                />

                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg">{user.displayName}</h4>
                    <span className="text-gray-500">@{user.username}</span>
                    {user.mutualFollowers > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        共通 {user.mutualFollowers}人
                      </span>
                    )}
                    {activeTab === 'suggestions' && user.score && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        マッチ度 {user.score}%
                      </span>
                    )}
                  </div>

                  {user.bio && (
                    <p className="text-sm text-gray-600 mb-2">{user.bio}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span>🎮 {user.stats.totalGames}作品</span>
                    <span>👥 {user.stats.totalFollowers}フォロワー</span>
                    <span>❤️ {user.stats.totalLikes}いいね</span>
                    {user.location && <span>📍 {user.location}</span>}
                  </div>

                  {user.commonInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {user.commonInterests.map(interest => (
                        <span key={interest} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {user.relationshipType === 'none' && (
                    <ModernButton
                      onClick={() => handleFollow(user.id, 'follow')}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
                    >
                      👤 フォロー
                    </ModernButton>
                  )}

                  {user.relationshipType === 'following' && (
                    <ModernButton
                      onClick={() => handleFollow(user.id, 'unfollow')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                    >
                      ✓ フォロー中
                    </ModernButton>
                  )}

                  {user.relationshipType === 'follower' && (
                    <div className="flex flex-col gap-1">
                      <ModernButton
                        onClick={() => handleFollow(user.id, 'follow')}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
                      >
                        👤 フォローバック
                      </ModernButton>
                      <ModernButton
                        onClick={() => handleFollow(user.id, 'remove')}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                      >
                        削除
                      </ModernButton>
                    </div>
                  )}

                  {user.relationshipType === 'mutual' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-green-600 text-center">💫 相互フォロー</span>
                      <ModernButton
                        onClick={() => handleFollow(user.id, 'unfollow')}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                      >
                        解除
                      </ModernButton>
                    </div>
                  )}
                </div>
              </div>
            </ModernCard>
          ))}
        </div>
      )}
    </div>
  );
};