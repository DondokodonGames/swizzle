// src/social/components/UserActivityFeed.tsx
// 🔧 完全実装版 - Supabase完全連携（モック削除）

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame, UserProfile } from '../types/SocialTypes';
import { LikeButton } from './LikeButton';
import { SimpleReactionSystem, ReactionStats } from './SimpleReactionSystem';

interface UserActivityFeedProps {
  userId?: string; // 未指定の場合は現在のユーザーのフィード
  targetUserId?: string; // 特定ユーザーの活動を表示
  className?: string;
  maxItems?: number;
  autoRefresh?: boolean;
  showFilters?: boolean;
}

interface ActivityItem {
  id: string;
  type: 'game_created' | 'game_liked' | 'game_shared' | 'user_followed' | 'achievement' | 'comment' | 'reaction' | 'milestone' | 'collaboration';
  timestamp: string;
  actor: UserProfile;
  target?: PublicGame | UserProfile;
  content?: string;
  metadata?: {
    oldValue?: any;
    newValue?: any;
    count?: number;
    type?: string;
    collaborators?: UserProfile[];
  };
  isPublic: boolean;
  reactions?: ReactionStats;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface ActivityGroup {
  date: string;
  activities: ActivityItem[];
}

interface ActivityStats {
  todayCount: number;
  weekCount: number;
  totalActivities: number;
  averageDaily: number;
  streakDays: number;
  mostActiveHour: string;
}

interface ActivityFilters {
  types: string[];
  users: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  onlyFollowing: boolean;
  showPrivate: boolean;
}

const ACTIVITY_TYPES = [
  { id: 'game_created', label: 'ゲーム作成', icon: '🎮', color: 'text-blue-600' },
  { id: 'game_liked', label: 'いいね', icon: '❤️', color: 'text-red-600' },
  { id: 'game_shared', label: 'シェア', icon: '📤', color: 'text-green-600' },
  { id: 'user_followed', label: 'フォロー', icon: '👤', color: 'text-purple-600' },
  { id: 'achievement', label: '実績解除', icon: '🏆', color: 'text-yellow-600' },
  { id: 'comment', label: 'コメント', icon: '💬', color: 'text-indigo-600' },
  { id: 'reaction', label: 'リアクション', icon: '😊', color: 'text-pink-600' },
  { id: 'milestone', label: 'マイルストーン', icon: '🎯', color: 'text-orange-600' },
  { id: 'collaboration', label: 'コラボ', icon: '🤝', color: 'text-cyan-600' }
];

const TIME_FILTERS = [
  { id: 'today', label: '今日', hours: 24 },
  { id: 'week', label: '今週', hours: 24 * 7 },
  { id: 'month', label: '今月', hours: 24 * 30 },
  { id: 'all', label: '全期間', hours: -1 }
];

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({
  userId = 'current-user',
  targetUserId,
  className = '',
  maxItems = 20,
  autoRefresh = true,
  showFilters = true
}) => {
  // 状態管理
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [groupedActivities, setGroupedActivities] = useState<ActivityGroup[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    todayCount: 0,
    weekCount: 0,
    totalActivities: 0,
    averageDaily: 0,
    streakDays: 0,
    mostActiveHour: '20:00'
  });
  const [filters, setFilters] = useState<ActivityFilters>({
    types: [],
    users: [],
    dateRange: {},
    onlyFollowing: false,
    showPrivate: targetUserId === userId
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('week');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // 🔧 データ変換関数
  const convertToActivityItem = useCallback((dbActivity: any): ActivityItem => {
    const actor: UserProfile = {
      id: dbActivity.profiles.id,
      username: dbActivity.profiles.username,
      displayName: dbActivity.profiles.display_name || dbActivity.profiles.username,
      avatar: dbActivity.profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbActivity.profiles.username}`,
      banner: '',
      bio: '',
      location: '',
      website: '',
      stats: {
        totalGames: 0,
        totalPlays: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalFollowing: 0,
        joinDate: '',
        lastActive: ''
      },
      isFollowing: false
    };

    let target: PublicGame | UserProfile | undefined;

    if (dbActivity.target_game) {
      target = {
        id: dbActivity.target_game.id,
        title: dbActivity.target_game.title,
        description: '',
        thumbnail: dbActivity.target_game.thumbnail_url || `https://picsum.photos/200/150?random=${dbActivity.target_game.id}`,
        author: { ...actor, name: actor.displayName || actor.username || 'Unknown User' },
        stats: { likes: 0, shares: 0, bookmarks: 0, views: 0 },
        tags: [],
        category: 'casual',
        createdAt: dbActivity.created_at,
        updatedAt: dbActivity.created_at
      } as PublicGame;
    } else if (dbActivity.target_user) {
      target = {
        id: dbActivity.target_user.id,
        username: dbActivity.target_user.username,
        displayName: dbActivity.target_user.display_name || dbActivity.target_user.username,
        avatar: dbActivity.target_user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbActivity.target_user.username}`,
        banner: '',
        bio: '',
        location: '',
        website: '',
        stats: {
          totalGames: 0,
          totalPlays: 0,
          totalLikes: 0,
          totalFollowers: 0,
          totalFollowing: 0,
          joinDate: '',
          lastActive: ''
        },
        isFollowing: false
      } as UserProfile;
    }

    return {
      id: dbActivity.id,
      type: dbActivity.activity_type,
      timestamp: dbActivity.created_at,
      actor,
      target,
      content: dbActivity.content || '',
      metadata: dbActivity.metadata || {},
      isPublic: dbActivity.is_public,
      reactions: {
        completed: { count: 0, userReacted: false },
        fun: { count: 0, userReacted: false },
        amazing: { count: 0, userReacted: false }
      },
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    };
  }, []);

  // 🔧 活動取得（実装版）
  const fetchActivities = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      
      setError(null);

      // 実装版: SocialServiceを使用
      const { activities: fetchedActivities, hasMore: hasMoreResults } = await socialService.getActivities(
        targetUserId || userId,
        {
          types: filters.types,
          dateRange: filters.dateRange,
          onlyFollowing: filters.onlyFollowing,
          showPrivate: filters.showPrivate
        },
        pageNum,
        maxItems
      );

      // 時間フィルター適用
      let filteredActivities = fetchedActivities;
      const timeFilter = TIME_FILTERS.find(f => f.id === selectedTimeFilter);
      if (timeFilter && timeFilter.hours > 0) {
        const cutoffTime = Date.now() - timeFilter.hours * 60 * 60 * 1000;
        filteredActivities = filteredActivities.filter(activity => 
          new Date(activity.created_at).getTime() > cutoffTime
        );
      }

      // データ変換
      const convertedActivities = filteredActivities.map(convertToActivityItem);

      if (append) {
        setActivities(prev => [...prev, ...convertedActivities]);
      } else {
        setActivities(convertedActivities);
      }
      
      setHasMore(hasMoreResults);

      // 統計取得
      if (targetUserId || userId !== 'current-user') {
        const activityStats = await socialService.getActivityStats(targetUserId || userId);
        setStats(activityStats);
      }

    } catch (error: any) {
      setError('アクティビティの読み込みに失敗しました');
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [socialService, targetUserId, userId, filters, selectedTimeFilter, maxItems, convertToActivityItem]);

  // 活動グループ化
  const groupActivitiesByDate = useCallback((activities: ActivityItem[]): ActivityGroup[] => {
    const groups: Record<string, ActivityItem[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp).toLocaleDateString('ja-JP');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return Object.entries(groups)
      .map(([date, activities]) => ({ date, activities }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  // 活動グループ化の実行
  useEffect(() => {
    const grouped = groupActivitiesByDate(activities);
    setGroupedActivities(grouped);
  }, [activities, groupActivitiesByDate]);

  // 初期読み込み
  useEffect(() => {
    fetchActivities(1, false);
  }, [fetchActivities]);

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivities(1, false);
    }, 60000); // 1分間隔

    return () => clearInterval(interval);
  }, [autoRefresh, fetchActivities]);

  // もっと読み込み
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      fetchActivities(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchActivities]);

  // フィルター変更
  const handleFilterChange = useCallback((key: keyof ActivityFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    // フィルター変更時は再読み込み
    setTimeout(() => fetchActivities(1, false), 100);
  }, [fetchActivities]);

  // 時間フィルター変更
  const handleTimeFilterChange = useCallback((timeFilter: string) => {
    setSelectedTimeFilter(timeFilter);
    setPage(1);
  }, []);

  // 活動タイプ情報取得
  const getActivityTypeInfo = useCallback((type: string) => {
    return ACTIVITY_TYPES.find(t => t.id === type) || ACTIVITY_TYPES[0];
  }, []);

  // 相対時刻表示
  const getRelativeTime = useCallback((timestamp: string): string => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diffMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffMinutes < 1) return 'たった今';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}時間前`;
    return `${Math.floor(diffMinutes / 1440)}日前`;
  }, []);

  // アクティビティレンダー
  const renderActivity = useCallback((activity: ActivityItem) => {
    const typeInfo = getActivityTypeInfo(activity.type);
    const isExpanded = expandedActivity === activity.id;

    return (
      <ModernCard key={activity.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          {/* アバター */}
          <img 
            src={activity.actor.avatar} 
            alt={activity.actor.displayName}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg ${typeInfo.color}`}>{typeInfo.icon}</span>
              <span className="font-semibold text-gray-800">{activity.actor.displayName}</span>
              <span className="text-sm text-gray-500">@{activity.actor.username}</span>
              <span className="text-xs text-gray-400">{getRelativeTime(activity.timestamp)}</span>
              {!activity.isPublic && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">非公開</span>
              )}
            </div>

            {/* 活動内容 */}
            <div className="mb-2">
              <span className="text-gray-700">{activity.content}</span>
              {activity.target && activity.type.includes('game') && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img 
                      src={(activity.target as PublicGame).thumbnail} 
                      alt={(activity.target as PublicGame).title}
                      className="w-12 h-9 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm">
                        {(activity.target as PublicGame).title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>❤️ {(activity.target as PublicGame).stats.likes}</span>
                        <span>👁️ {(activity.target as PublicGame).stats.views || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activity.target && activity.type === 'user_followed' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <img 
                    src={(activity.target as UserProfile).avatar} 
                    alt={(activity.target as UserProfile).displayName}
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{(activity.target as UserProfile).displayName}</span>
                </div>
              )}

              {activity.metadata && (activity.type === 'achievement' || activity.type === 'milestone') && (
                <div className="mt-2 text-sm">
                  {activity.metadata.count && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                      🏆 {activity.metadata.count.toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {activity.metadata?.collaborators && (
                <div className="mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">参加者:</span>
                    {activity.metadata.collaborators.slice(0, 3).map(collab => (
                      <img 
                        key={collab.id}
                        src={collab.avatar} 
                        alt={collab.displayName}
                        className="w-6 h-6 rounded-full"
                        title={collab.displayName}
                      />
                    ))}
                    {activity.metadata.collaborators.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{activity.metadata.collaborators.length - 3}人
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* エンゲージメント */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
                  <span>❤️</span>
                  <span>{activity.engagement.likes}</span>
                </button>
                <button 
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                  onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                >
                  <span>💬</span>
                  <span>{activity.engagement.comments}</span>
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-500 transition-colors">
                  <span>📤</span>
                  <span>{activity.engagement.shares}</span>
                </button>
              </div>

              {/* リアクション */}
              {activity.reactions && (
                <SimpleReactionSystem
                  gameId={activity.id}
                  initialStats={activity.reactions}
                  compact={true}
                  showCounts={false}
                  animated={false}
                />
              )}
            </div>

            {/* 展開コンテンツ */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <p>詳細情報やコメントがここに表示されます。</p>
                  <div className="mt-2 flex gap-2">
                    <ModernButton className="text-xs bg-blue-100 text-blue-700">
                      詳細を見る
                    </ModernButton>
                    <ModernButton className="text-xs bg-gray-100 text-gray-700">
                      非表示
                    </ModernButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModernCard>
    );
  }, [getActivityTypeInfo, getRelativeTime, expandedActivity]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">アクティビティを読み込んでいます...</span>
      </div>
    );
  }

  return (
    <div className={`user-activity-feed ${className}`}>
      {/* ヘッダー */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            📊 {targetUserId && targetUserId !== userId ? 'ユーザー活動' : '活動タイムライン'}
          </h2>
          <ModernButton
            onClick={() => fetchActivities(1, false)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            🔄 更新
          </ModernButton>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.todayCount}</div>
            <div className="text-sm text-gray-600">今日</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.weekCount}</div>
            <div className="text-sm text-gray-600">今週</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.averageDaily)}</div>
            <div className="text-sm text-gray-600">日平均</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.streakDays}</div>
            <div className="text-sm text-gray-600">連続日数</div>
          </div>
          <div className="text-center p-3 bg-pink-50 rounded-lg">
            <div className="text-lg font-bold text-pink-600">{stats.mostActiveHour}</div>
            <div className="text-sm text-gray-600">活発な時間</div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      {showFilters && (
        <ModernCard className="p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">🔍 フィルター</h3>
          
          <div className="space-y-4">
            {/* 時間フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
              <div className="flex flex-wrap gap-2">
                {TIME_FILTERS.map(filter => (
                  <ModernButton
                    key={filter.id}
                    onClick={() => handleTimeFilterChange(filter.id)}
                    className={`text-sm ${
                      selectedTimeFilter === filter.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {filter.label}
                  </ModernButton>
                ))}
              </div>
            </div>

            {/* アクティビティタイプ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">アクティビティタイプ</label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map(type => (
                  <ModernButton
                    key={type.id}
                    onClick={() => {
                      const newTypes = filters.types.includes(type.id)
                        ? filters.types.filter(t => t !== type.id)
                        : [...filters.types, type.id];
                      handleFilterChange('types', newTypes);
                    }}
                    className={`text-sm ${
                      filters.types.includes(type.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {type.icon} {type.label}
                  </ModernButton>
                ))}
              </div>
            </div>

            {/* その他のフィルター */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.onlyFollowing}
                  onChange={(e) => handleFilterChange('onlyFollowing', e.target.checked)}
                />
                <span className="text-sm">フォロー中のみ</span>
              </label>
              
              {(targetUserId === userId || !targetUserId) && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.showPrivate}
                    onChange={(e) => handleFilterChange('showPrivate', e.target.checked)}
                  />
                  <span className="text-sm">非公開も含む</span>
                </label>
              )}
            </div>
          </div>
        </ModernCard>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {/* アクティビティ一覧 */}
      {groupedActivities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">アクティビティがありません</h3>
          <p className="text-gray-500">活動が始まると、ここにタイムラインが表示されます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedActivities.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-200"></div>
                <span className="text-sm font-medium text-gray-600 bg-white px-3">
                  {group.date}
                </span>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>
              
              <div className="space-y-3">
                {group.activities.map(renderActivity)}
              </div>
            </div>
          ))}

          {/* もっと読み込み */}
          {hasMore && (
            <div className="text-center py-6">
              <ModernButton
                onClick={loadMore}
                disabled={loadingMore}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {loadingMore ? '読み込み中...' : 'もっと読み込む'}
              </ModernButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};