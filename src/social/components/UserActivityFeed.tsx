// src/social/components/UserActivityFeed.tsx

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

  // 活動データ生成（モック）
  const generateMockActivities = useCallback((count: number, pageNum: number = 1): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const id = `activity_${pageNum}_${i}`;
      const type = ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)].id as ActivityItem['type'];
      const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const actor: UserProfile = {
        id: `user_${Math.floor(Math.random() * 20)}`,
        username: `user${Math.floor(Math.random() * 20)}`,
        displayName: `ユーザー${Math.floor(Math.random() * 20) + 1}`,
        avatar: `https://picsum.photos/40/40?random=${Math.floor(Math.random() * 100)}`,
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
        isFollowing: Math.random() > 0.5
      };

      let target: PublicGame | UserProfile | undefined;
      let content = '';
      let metadata: ActivityItem['metadata'] = {};

      switch (type) {
        case 'game_created':
          target = {
            id: `game_${Math.floor(Math.random() * 1000)}`,
            title: `新作ゲーム ${Math.floor(Math.random() * 100)}`,
            description: '楽しいゲームです！',
            thumbnail: `https://picsum.photos/200/150?random=${Math.floor(Math.random() * 100)}`,
            author: actor,
            stats: {
              likes: Math.floor(Math.random() * 100),
              shares: Math.floor(Math.random() * 20),
              bookmarks: Math.floor(Math.random() * 50),
              views: Math.floor(Math.random() * 1000)
            },
            tags: ['楽しい', '新作'],
            category: 'casual',
            createdAt: timestamp,
            updatedAt: timestamp
          };
          content = '新しいゲームを公開しました！';
          break;

        case 'game_liked':
          target = {
            id: `game_${Math.floor(Math.random() * 1000)}`,
            title: `人気ゲーム ${Math.floor(Math.random() * 100)}`,
            description: 'いいねされたゲーム',
            thumbnail: `https://picsum.photos/200/150?random=${Math.floor(Math.random() * 100)}`,
            author: { ...actor, id: `author_${Math.floor(Math.random() * 10)}` },
            stats: {
              likes: Math.floor(Math.random() * 500),
              shares: Math.floor(Math.random() * 50),
              bookmarks: Math.floor(Math.random() * 100),
              views: Math.floor(Math.random() * 2000)
            },
            tags: ['人気', 'おすすめ'],
            category: 'action',
            createdAt: timestamp,
            updatedAt: timestamp
          };
          content = 'このゲームに「いいね」しました';
          break;

        case 'user_followed':
          target = {
            ...actor,
            id: `target_user_${Math.floor(Math.random() * 50)}`,
            displayName: `フォロー先ユーザー${Math.floor(Math.random() * 50) + 1}`
          };
          content = 'をフォローしました';
          break;

        case 'achievement':
          content = `実績「${['ゲーム王', '100いいね達成', 'プレイマスター', 'ソーシャル達人'][Math.floor(Math.random() * 4)]}」を解除しました！`;
          metadata = { type: 'achievement', count: Math.floor(Math.random() * 100) + 1 };
          break;

        case 'milestone':
          const milestones = ['10作品公開', '1000いいね達成', '100フォロワー達成', '10万再生達成'];
          content = milestones[Math.floor(Math.random() * milestones.length)];
          metadata = { count: Math.floor(Math.random() * 1000) + 100 };
          break;

        case 'collaboration':
          const collaborators = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
            ...actor,
            id: `collab_${i}`,
            displayName: `コラボ相手${i + 1}`
          }));
          content = 'コラボレーション作品を開始しました';
          metadata = { collaborators };
          break;

        default:
          content = 'アクティビティが発生しました';
      }

      activities.push({
        id,
        type,
        timestamp,
        actor,
        target,
        content,
        metadata,
        isPublic: Math.random() > 0.1, // 90%がパブリック
        reactions: {
          completed: { count: Math.floor(Math.random() * 10), userReacted: false },
          fun: { count: Math.floor(Math.random() * 15), userReacted: false },
          amazing: { count: Math.floor(Math.random() * 8), userReacted: false }
        },
        engagement: {
          likes: Math.floor(Math.random() * 20),
          comments: Math.floor(Math.random() * 5),
          shares: Math.floor(Math.random() * 3)
        }
      });
    }

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  // 活動取得
  const fetchActivities = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      
      setError(null);

      // 実装時はSupabase APIで置き換え
      const mockActivities = generateMockActivities(maxItems, pageNum);
      
      // フィルター適用
      let filteredActivities = mockActivities;
      
      if (filters.types.length > 0) {
        filteredActivities = filteredActivities.filter(activity => 
          filters.types.includes(activity.type)
        );
      }
      
      if (filters.onlyFollowing) {
        filteredActivities = filteredActivities.filter(activity => 
          activity.actor.isFollowing
        );
      }
      
      if (!filters.showPrivate) {
        filteredActivities = filteredActivities.filter(activity => 
          activity.isPublic
        );
      }

      // 時間フィルター
      const timeFilter = TIME_FILTERS.find(f => f.id === selectedTimeFilter);
      if (timeFilter && timeFilter.hours > 0) {
        const cutoffTime = Date.now() - timeFilter.hours * 60 * 60 * 1000;
        filteredActivities = filteredActivities.filter(activity => 
          new Date(activity.timestamp).getTime() > cutoffTime
        );
      }

      if (append) {
        setActivities(prev => [...prev, ...filteredActivities]);
      } else {
        setActivities(filteredActivities);
      }
      
      setHasMore(pageNum < 5); // モック制限

      // 統計計算
      const now = Date.now();
      const today = new Date().setHours(0, 0, 0, 0);
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      setStats({
        todayCount: filteredActivities.filter(a => new Date(a.timestamp).getTime() > today).length,
        weekCount: filteredActivities.filter(a => new Date(a.timestamp).getTime() > weekAgo).length,
        totalActivities: filteredActivities.length,
        averageDaily: filteredActivities.length / 7,
        streakDays: Math.floor(Math.random() * 30) + 1,
        mostActiveHour: ['9:00', '12:00', '15:00', '18:00', '21:00'][Math.floor(Math.random() * 5)]
      });

    } catch (error) {
      setError('アクティビティの読み込みに失敗しました');
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [generateMockActivities, maxItems, filters, selectedTimeFilter]);

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