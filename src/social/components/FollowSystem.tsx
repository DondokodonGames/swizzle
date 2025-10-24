// src/social/components/FollowSystem.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { UserProfile } from '../types/SocialTypes';

interface FollowSystemProps {
  currentUserId: string;
  className?: string;
}

interface FollowUser extends UserProfile {
  mutualFollowers: number;
  relationshipType: 'none' | 'following' | 'follower' | 'mutual' | 'blocked';
  lastInteraction?: string;
  commonInterests: string[];
  score?: number; // 推薦スコア
}

interface FollowStats {
  totalFollowing: number;
  totalFollowers: number;
  mutualConnections: number;
  pendingRequests: number;
  blockedUsers: number;
}

interface FollowRequest {
  id: string;
  user: UserProfile;
  message?: string;
  timestamp: string;
  type: 'incoming' | 'outgoing';
}

interface FollowSettings {
  isPrivate: boolean; // プライベートアカウント（フォロー承認制）
  allowFollowRequests: boolean;
  showFollowerCount: boolean;
  showFollowingCount: boolean;
  notifyOnFollow: boolean;
  autoFollowBack: boolean; // 相互フォロー設定
  blockNewFollowers: boolean;
}

const FOLLOW_TABS = [
  { id: 'following', label: '🤝 フォロー中', icon: '🤝' },
  { id: 'followers', label: '👥 フォロワー', icon: '👥' },
  { id: 'mutual', label: '💫 相互フォロー', icon: '💫' },
  { id: 'suggestions', label: '✨ おすすめ', icon: '✨' },
  { id: 'requests', label: '📮 リクエスト', icon: '📮' },
  { id: 'blocked', label: '🚫 ブロック', icon: '🚫' }
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
  // 状態管理
  const [activeTab, setActiveTab] = useState<string>('following');
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [stats, setStats] = useState<FollowStats>({
    totalFollowing: 0,
    totalFollowers: 0,
    mutualConnections: 0,
    pendingRequests: 0,
    blockedUsers: 0
  });
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
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

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // データ取得
  const fetchData = useCallback(async (tab: string = activeTab) => {
    try {
      setLoading(true);
      setError(null);

      // モック実装（実装時はSupabase APIで置き換え）
      let mockUsers: FollowUser[] = [];
      
      switch (tab) {
        case 'following':
          mockUsers = generateMockUsers(50, 'following');
          break;
        case 'followers':
          mockUsers = generateMockUsers(45, 'follower');
          break;
        case 'mutual':
          mockUsers = generateMockUsers(30, 'mutual');
          break;
        case 'suggestions':
          mockUsers = generateMockUsers(20, 'none').map(user => ({
            ...user,
            score: Math.floor(Math.random() * 100)
          }));
          break;
        case 'blocked':
          mockUsers = generateMockUsers(5, 'blocked');
          break;
        default:
          mockUsers = [];
      }

      // ソート処理
      const sortedUsers = sortUsers(mockUsers, sortBy);
      
      // 検索フィルター
      const filteredUsers = searchQuery 
        ? sortedUsers.filter(user => 
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : sortedUsers;

      setUsers(filteredUsers);

      // 統計更新
      setStats({
        totalFollowing: tab === 'following' ? filteredUsers.length : Math.floor(Math.random() * 100),
        totalFollowers: tab === 'followers' ? filteredUsers.length : Math.floor(Math.random() * 100),
        mutualConnections: tab === 'mutual' ? filteredUsers.length : Math.floor(Math.random() * 50),
        pendingRequests: Math.floor(Math.random() * 10),
        blockedUsers: tab === 'blocked' ? filteredUsers.length : Math.floor(Math.random() * 5)
      });

      // フォローリクエスト取得
      if (tab === 'requests') {
        const mockRequests: FollowRequest[] = Array.from({ length: 8 }, (_, i) => ({
          id: `req_${i}`,
          user: generateMockUsers(1, 'none')[0],
          message: i % 3 === 0 ? `フォローさせてください！ゲーム制作に興味があります。` : undefined,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: Math.random() > 0.5 ? 'incoming' : 'outgoing'
        }));
        setFollowRequests(mockRequests);
      }

    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error('Error fetching follow data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, sortBy, searchQuery, socialService]);

  // モックユーザー生成
  const generateMockUsers = useCallback((count: number, relationshipType: FollowUser['relationshipType']): FollowUser[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `user_${relationshipType}_${i}`,
      username: `user${i}`,
      displayName: `ユーザー${i + 1}`,
      avatar: `https://picsum.photos/60/60?random=${i + 500}`,
      banner: `https://picsum.photos/400/100?random=${i + 600}`,
      bio: `${relationshipType}のユーザーです。ゲーム制作が趣味です。`,
      location: ['東京', '大阪', '名古屋', '福岡', '札幌'][Math.floor(Math.random() * 5)],
      website: Math.random() > 0.7 ? `https://example${i}.com` : '',
      stats: {
        totalGames: Math.floor(Math.random() * 50),
        totalPlays: Math.floor(Math.random() * 10000),
        totalLikes: Math.floor(Math.random() * 1000),
        totalFollowers: Math.floor(Math.random() * 500),
        totalFollowing: Math.floor(Math.random() * 200),
        joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lastActive: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      mutualFollowers: Math.floor(Math.random() * 20),
      relationshipType,
      lastInteraction: relationshipType !== 'none' ? 
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      commonInterests: ['ゲーム制作', 'プログラミング', 'デザイン', 'アニメ', '音楽']
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 1),
      isFollowing: relationshipType === 'following' || relationshipType === 'mutual',
      isOwner: false
    }));
  }, []);

  // ユーザーソート
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

  // 初期データ読み込み
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 設定読み込み
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

  // 設定保存
  useEffect(() => {
    localStorage.setItem('follow_settings', JSON.stringify(settings));
  }, [settings]);

  // フォローアクション
  const handleFollow = useCallback(async (userId: string, action: 'follow' | 'unfollow' | 'remove') => {
    try {
      const result = await socialService.toggleFollow(userId, currentUserId);
      
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

      // 統計更新
      if (action === 'follow') {
        setStats(prev => ({ ...prev, totalFollowing: prev.totalFollowing + 1 }));
      } else if (action === 'unfollow') {
        setStats(prev => ({ ...prev, totalFollowing: prev.totalFollowing - 1 }));
      } else if (action === 'remove') {
        setStats(prev => ({ ...prev, totalFollowers: prev.totalFollowers - 1 }));
      }

    } catch (error) {
      console.error('Follow action error:', error);
    }
  }, [socialService, currentUserId]);

  // ブロック機能
  const handleBlock = useCallback(async (userId: string, block: boolean = true) => {
    try {
      console.log(`${block ? 'Blocking' : 'Unblocking'} user ${userId}`);
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, relationshipType: block ? 'blocked' : 'none' }
          : user
      ));

      if (block) {
        setStats(prev => ({ ...prev, blockedUsers: prev.blockedUsers + 1 }));
      } else {
        setStats(prev => ({ ...prev, blockedUsers: prev.blockedUsers - 1 }));
      }

    } catch (error) {
      console.error('Block action error:', error);
    }
  }, []);

  // フォローリクエスト処理
  const handleFollowRequest = useCallback(async (requestId: string, action: 'accept' | 'decline') => {
    try {
      console.log(`${action} follow request ${requestId}`);
      
      setFollowRequests(prev => prev.filter(req => req.id !== requestId));
      
      if (action === 'accept') {
        setStats(prev => ({ 
          ...prev, 
          totalFollowers: prev.totalFollowers + 1,
          pendingRequests: prev.pendingRequests - 1
        }));
      }

    } catch (error) {
      console.error('Follow request error:', error);
    }
  }, []);

  // 一括操作
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
        case 'block':
          for (const userId of userIds) {
            await handleBlock(userId, true);
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
  }, [bulkAction, selectedUsers, handleFollow, handleBlock]);

  // 設定更新
  const handleSettingsUpdate = useCallback((key: keyof FollowSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // チェックボックス操作
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

  // 全選択・全解除
  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  }, [users]);

  return (
    <div className={`follow-system ${className}`}>
      {/* ヘッダー */}
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

        {/* 統計サマリー */}
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

      {/* 設定パネル */}
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

      {/* タブナビゲーション */}
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
            {tab.id === 'requests' && stats.pendingRequests > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1 rounded-full">
                {stats.pendingRequests}
              </span>
            )}
          </ModernButton>
        ))}
      </div>

      {/* 検索・ソート */}
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

      {/* 一括操作 */}
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
            <option value="block">ブロック</option>
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

      {/* フォローリクエスト一覧 */}
      {activeTab === 'requests' && (
        <div className="space-y-4 mb-6">
          {followRequests.map((request) => (
            <ModernCard key={request.id} className="p-4">
              <div className="flex items-start gap-4">
                <img 
                  src={request.user.avatar} 
                  alt={request.user.displayName}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{request.user.displayName}</h4>
                    <span className="text-sm text-gray-500">@{request.user.username}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      request.type === 'incoming' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {request.type === 'incoming' ? '受信' : '送信'}
                    </span>
                  </div>
                  {request.message && (
                    <p className="text-sm text-gray-600 mb-2">{request.message}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(request.timestamp).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                {request.type === 'incoming' && (
                  <div className="flex gap-2">
                    <ModernButton
                      onClick={() => handleFollowRequest(request.id, 'accept')}
                      className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      承認
                    </ModernButton>
                    <ModernButton
                      onClick={() => handleFollowRequest(request.id, 'decline')}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      拒否
                    </ModernButton>
                  </div>
                )}
              </div>
            </ModernCard>
          ))}
        </div>
      )}

      {/* ユーザー一覧 */}
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
          {/* 全選択チェックボックス */}
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
                  
                  {user.relationshipType === 'blocked' && (
                    <ModernButton
                      onClick={() => handleBlock(user.id, false)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                    >
                      ブロック解除
                    </ModernButton>
                  )}
                  
                  {user.relationshipType !== 'blocked' && (
                    <ModernButton
                      onClick={() => handleBlock(user.id, true)}
                      className="bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 text-sm"
                    >
                      🚫
                    </ModernButton>
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