// src/social/components/SocialAnalytics.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';

interface SocialAnalyticsProps {
  userId: string;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  className?: string;
}

interface AnalyticsData {
  overview: OverviewMetrics;
  engagement: EngagementMetrics;
  audience: AudienceMetrics;
  content: ContentMetrics;
  growth: GrowthMetrics;
  comparisons: ComparisonMetrics;
}

interface OverviewMetrics {
  totalGames: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalFollowers: number;
  engagementRate: number;
  averageRating: number;
  topPerformingGame: string;
}

interface EngagementMetrics {
  likesOverTime: TimeSeriesData[];
  sharesOverTime: TimeSeriesData[];
  commentsOverTime: TimeSeriesData[];
  viewsOverTime: TimeSeriesData[];
  engagementByHour: HourlyData[];
  topEngagingContent: ContentEngagement[];
  reactionBreakdown: ReactionData[];
}

interface AudienceMetrics {
  followerGrowth: TimeSeriesData[];
  audienceAge: AgeDistribution[];
  audienceLocation: LocationData[];
  audienceInterests: InterestData[];
  retentionRate: number;
  averageSessionTime: number;
  returningUsers: number;
}

interface ContentMetrics {
  contentByCategory: CategoryData[];
  performanceByCategory: CategoryPerformance[];
  uploadFrequency: TimeSeriesData[];
  contentQualityTrends: QualityTrends[];
  viralityScore: number;
  averageCompletionRate: number;
}

interface GrowthMetrics {
  dailyActiveUsers: TimeSeriesData[];
  weeklyActiveUsers: TimeSeriesData[];
  monthlyActiveUsers: TimeSeriesData[];
  growthRate: number;
  churnRate: number;
  lifetimeValue: number;
}

interface ComparisonMetrics {
  industryAverage: OverviewMetrics;
  topCreators: CreatorComparison[];
  categoryRanking: number;
  globalRanking: number;
  improvementSuggestions: string[];
}

interface TimeSeriesData {
  date: string;
  value: number;
  change?: number;
}

interface HourlyData {
  hour: number;
  value: number;
  label: string;
}

interface ContentEngagement {
  gameId: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  shares: number;
  engagementRate: number;
  createdAt: string;
}

interface ReactionData {
  type: string;
  count: number;
  percentage: number;
  emoji: string;
}

interface AgeDistribution {
  ageGroup: string;
  percentage: number;
  count: number;
}

interface LocationData {
  country: string;
  percentage: number;
  count: number;
  flag: string;
}

interface InterestData {
  interest: string;
  percentage: number;
  score: number;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface CategoryPerformance {
  category: string;
  averageViews: number;
  averageLikes: number;
  averageShares: number;
  engagementRate: number;
}

interface QualityTrends {
  date: string;
  averageRating: number;
  completionRate: number;
  bugReports: number;
}

interface CreatorComparison {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  engagementRate: number;
  totalViews: number;
}

const TIME_RANGES = [
  { id: 'day', label: '今日', icon: '📅' },
  { id: 'week', label: '今週', icon: '📊' },
  { id: 'month', label: '今月', icon: '📈' },
  { id: 'year', label: '今年', icon: '📋' },
  { id: 'all', label: '全期間', icon: '🌟' }
];

const ANALYTICS_SECTIONS = [
  { id: 'overview', label: 'オーバービュー', icon: '📊' },
  { id: 'engagement', label: 'エンゲージメント', icon: '❤️' },
  { id: 'audience', label: 'オーディエンス', icon: '👥' },
  { id: 'content', label: 'コンテンツ', icon: '🎮' },
  { id: 'growth', label: '成長', icon: '📈' },
  { id: 'comparison', label: '比較', icon: '⚖️' }
];

export const SocialAnalytics: React.FC<SocialAnalyticsProps> = ({
  userId,
  timeRange = 'week',
  className = ''
}) => {
  // 状態管理
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(timeRange);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('csv');

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // モック分析データ生成
  const generateMockAnalytics = useCallback((range: string): AnalyticsData => {
    const now = Date.now();
    const days = range === 'day' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : range === 'year' ? 365 : 730;
    
    // 時系列データ生成
    const generateTimeSeries = (baseValue: number, variance: number = 0.3) => {
      return Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const date = new Date(now - (days - i - 1) * 24 * 60 * 60 * 1000);
        const value = Math.max(0, baseValue + (Math.random() - 0.5) * variance * baseValue);
        return {
          date: date.toISOString().split('T')[0],
          value: Math.round(value),
          change: Math.round((Math.random() - 0.5) * 20)
        };
      });
    };

    return {
      overview: {
        totalGames: Math.floor(Math.random() * 50) + 10,
        totalViews: Math.floor(Math.random() * 100000) + 10000,
        totalLikes: Math.floor(Math.random() * 10000) + 1000,
        totalShares: Math.floor(Math.random() * 1000) + 100,
        totalFollowers: Math.floor(Math.random() * 5000) + 500,
        engagementRate: Math.round((Math.random() * 15 + 5) * 100) / 100,
        averageRating: Math.round((Math.random() * 2 + 3) * 100) / 100,
        topPerformingGame: 'アクションゲーム 第1弾'
      },
      engagement: {
        likesOverTime: generateTimeSeries(150, 0.4),
        sharesOverTime: generateTimeSeries(25, 0.5),
        commentsOverTime: generateTimeSeries(40, 0.6),
        viewsOverTime: generateTimeSeries(800, 0.3),
        engagementByHour: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          value: Math.floor(Math.random() * 100) + 10,
          label: `${i}:00`
        })),
        topEngagingContent: Array.from({ length: 5 }, (_, i) => ({
          gameId: `game_${i}`,
          title: `人気ゲーム ${i + 1}`,
          thumbnail: `https://picsum.photos/100/75?random=${i + 200}`,
          views: Math.floor(Math.random() * 5000) + 1000,
          likes: Math.floor(Math.random() * 500) + 100,
          shares: Math.floor(Math.random() * 50) + 10,
          engagementRate: Math.round((Math.random() * 10 + 5) * 100) / 100,
          createdAt: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        })),
        reactionBreakdown: [
          { type: 'fun', count: 1250, percentage: 35, emoji: '😄' },
          { type: 'amazing', count: 890, percentage: 25, emoji: '🤩' },
          { type: 'completed', count: 710, percentage: 20, emoji: '🎯' },
          { type: 'addictive', count: 535, percentage: 15, emoji: '🔥' },
          { type: 'creative', count: 178, percentage: 5, emoji: '💡' }
        ]
      },
      audience: {
        followerGrowth: generateTimeSeries(50, 0.6),
        audienceAge: [
          { ageGroup: '13-17', percentage: 15, count: 750 },
          { ageGroup: '18-24', percentage: 35, count: 1750 },
          { ageGroup: '25-34', percentage: 30, count: 1500 },
          { ageGroup: '35-44', percentage: 15, count: 750 },
          { ageGroup: '45+', percentage: 5, count: 250 }
        ],
        audienceLocation: [
          { country: '日本', percentage: 45, count: 2250, flag: '🇯🇵' },
          { country: 'アメリカ', percentage: 20, count: 1000, flag: '🇺🇸' },
          { country: '韓国', percentage: 15, count: 750, flag: '🇰🇷' },
          { country: 'その他', percentage: 20, count: 1000, flag: '🌍' }
        ],
        audienceInterests: [
          { interest: 'ゲーム', percentage: 85, score: 95 },
          { interest: 'アニメ', percentage: 60, score: 78 },
          { interest: 'プログラミング', percentage: 45, score: 82 },
          { interest: 'デザイン', percentage: 35, score: 71 },
          { interest: '音楽', percentage: 30, score: 65 }
        ],
        retentionRate: 78.5,
        averageSessionTime: 12.3,
        returningUsers: 65.2
      },
      content: {
        contentByCategory: [
          { category: 'アクション', count: 15, percentage: 35 },
          { category: 'パズル', count: 12, percentage: 28 },
          { category: 'カジュアル', count: 10, percentage: 23 },
          { category: 'アーケード', count: 6, percentage: 14 }
        ],
        performanceByCategory: [
          { category: 'アクション', averageViews: 2500, averageLikes: 180, averageShares: 25, engagementRate: 7.2 },
          { category: 'パズル', averageViews: 1800, averageLikes: 150, averageShares: 20, engagementRate: 8.3 },
          { category: 'カジュアル', averageViews: 3200, averageLikes: 220, averageShares: 35, engagementRate: 6.9 },
          { category: 'アーケード', averageViews: 1200, averageLikes: 95, averageShares: 12, engagementRate: 7.9 }
        ],
        uploadFrequency: generateTimeSeries(2, 0.8),
        contentQualityTrends: generateTimeSeries(4.2, 0.1).map(item => ({
          date: item.date,
          averageRating: item.value,
          completionRate: Math.min(95, Math.max(60, item.value * 20 + Math.random() * 10)),
          bugReports: Math.max(0, Math.floor((5 - item.value) * 2 + Math.random() * 3))
        })),
        viralityScore: 72.3,
        averageCompletionRate: 84.7
      },
      growth: {
        dailyActiveUsers: generateTimeSeries(120, 0.4),
        weeklyActiveUsers: generateTimeSeries(600, 0.3),
        monthlyActiveUsers: generateTimeSeries(2000, 0.2),
        growthRate: 15.8,
        churnRate: 8.2,
        lifetimeValue: 45.6
      },
      comparisons: {
        industryAverage: {
          totalGames: 25,
          totalViews: 15000,
          totalLikes: 1200,
          totalShares: 150,
          totalFollowers: 800,
          engagementRate: 6.5,
          averageRating: 3.8,
          topPerformingGame: ''
        },
        topCreators: Array.from({ length: 5 }, (_, i) => ({
          id: `creator_${i}`,
          name: `トップクリエイター${i + 1}`,
          avatar: `https://picsum.photos/40/40?random=${i + 300}`,
          followers: Math.floor(Math.random() * 10000) + 5000,
          engagementRate: Math.round((Math.random() * 5 + 8) * 100) / 100,
          totalViews: Math.floor(Math.random() * 500000) + 100000
        })),
        categoryRanking: Math.floor(Math.random() * 20) + 1,
        globalRanking: Math.floor(Math.random() * 1000) + 100,
        improvementSuggestions: [
          '投稿頻度を週3回に増やすことで、エンゲージメント率が12%向上する可能性があります',
          'パズルゲームの人気が高いため、このカテゴリに注力することをお勧めします',
          '午後8-10時の投稿で最も高いエンゲージメントが期待できます',
          'コラボレーション企画でフォロワー数を25%増加させることができます'
        ]
      }
    };
  }, []);

  // データ読み込み
  const loadAnalytics = useCallback(async (range: string = selectedRange) => {
    try {
      setLoading(true);
      setError(null);

      // 実装時はSupabase APIで置き換え
      const mockData = generateMockAnalytics(range);
      
      // 遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setAnalytics(mockData);

    } catch (error) {
      setError('分析データの読み込みに失敗しました');
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRange, generateMockAnalytics]);

  // 初期読み込み
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // 期間変更
  const handleRangeChange = useCallback((range: string) => {
    setSelectedRange(range);
    loadAnalytics(range);
  }, [loadAnalytics]);

  // リフレッシュ
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  // データエクスポート
  const handleExport = useCallback(async () => {
    if (!analytics) return;

    try {
      // 実装時はバックエンドでエクスポート処理
      const exportData = {
        userId,
        timeRange: selectedRange,
        exportedAt: new Date().toISOString(),
        data: analytics
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `analytics_${userId}_${selectedRange}_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

    } catch (error) {
      console.error('Export error:', error);
    }
  }, [analytics, userId, selectedRange]);

  // パーセンテージ計算
  const calculatePercentageChange = useCallback((current: number, previous: number): string => {
    if (previous === 0) return '+∞%';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }, []);

  // チャート色取得
  const getChartColor = useCallback((index: number): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[index % colors.length];
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">分析データを生成しています...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">❌ {error || 'データの読み込みに失敗しました'}</div>
        <ModernButton
          onClick={handleRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          再読み込み
        </ModernButton>
      </div>
    );
  }

  return (
    <div className={`social-analytics ${className}`}>
      {/* ヘッダー */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">📊 ソーシャル分析</h2>
          <div className="flex gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </select>
            <ModernButton
              onClick={handleExport}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              📥 エクスポート
            </ModernButton>
            <ModernButton
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {refreshing ? '🔄' : '🔄'} 更新
            </ModernButton>
          </div>
        </div>

        {/* 期間選択 */}
        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map((range) => (
            <ModernButton
              key={range.id}
              onClick={() => handleRangeChange(range.id)}
              className={`text-sm ${
                selectedRange === range.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {range.icon} {range.label}
            </ModernButton>
          ))}
        </div>
      </div>

      {/* セクション選択 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ANALYTICS_SECTIONS.map((section) => (
          <ModernButton
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`text-sm ${
              activeSection === section.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {section.icon} {section.label}
          </ModernButton>
        ))}
      </div>

      {/* オーバービュー */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ModernCard className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.overview.totalGames}</div>
              <div className="text-sm text-gray-500">総ゲーム数</div>
              <div className="text-xs text-green-600 mt-1">+12% 前週比</div>
            </ModernCard>
            <ModernCard className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.overview.totalViews.toLocaleString()}</div>
              <div className="text-sm text-gray-500">総再生数</div>
              <div className="text-xs text-green-600 mt-1">+8% 前週比</div>
            </ModernCard>
            <ModernCard className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{analytics.overview.totalLikes.toLocaleString()}</div>
              <div className="text-sm text-gray-500">総いいね数</div>
              <div className="text-xs text-green-600 mt-1">+15% 前週比</div>
            </ModernCard>
            <ModernCard className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{analytics.overview.totalFollowers.toLocaleString()}</div>
              <div className="text-sm text-gray-500">フォロワー数</div>
              <div className="text-xs text-green-600 mt-1">+5% 前週比</div>
            </ModernCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModernCard className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">エンゲージメント率</h3>
              <div className="text-2xl font-bold text-orange-600">{analytics.overview.engagementRate}%</div>
              <div className="text-sm text-gray-500">業界平均: 6.5%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, analytics.overview.engagementRate * 10)}%` }}
                ></div>
              </div>
            </ModernCard>

            <ModernCard className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">平均評価</h3>
              <div className="text-2xl font-bold text-yellow-600">{analytics.overview.averageRating}</div>
              <div className="text-sm text-gray-500">5点満点</div>
              <div className="flex mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-lg ${i < Math.floor(analytics.overview.averageRating) ? 'text-yellow-500' : 'text-gray-300'}`}>
                    ⭐
                  </span>
                ))}
              </div>
            </ModernCard>

            <ModernCard className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">トップパフォーマンス</h3>
              <div className="text-lg font-medium text-gray-800">{analytics.overview.topPerformingGame}</div>
              <div className="text-sm text-gray-500 mt-1">最も人気のゲーム</div>
              <ModernButton className="text-xs bg-blue-100 text-blue-700 mt-2">
                詳細を見る
              </ModernButton>
            </ModernCard>
          </div>
        </div>
      )}

      {/* エンゲージメント */}
      {activeSection === 'engagement' && (
        <div className="space-y-6">
          {/* リアクション分布 */}
          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">リアクション分布</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analytics.engagement.reactionBreakdown.map((reaction, index) => (
                <div key={reaction.type} className="text-center">
                  <div className="text-3xl mb-2">{reaction.emoji}</div>
                  <div className="text-lg font-semibold">{reaction.count.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{reaction.percentage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div 
                      className="h-1 rounded-full" 
                      style={{ 
                        width: `${reaction.percentage}%`,
                        backgroundColor: getChartColor(index)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          {/* 時間別エンゲージメント */}
          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">時間別エンゲージメント</h3>
            <div className="grid grid-cols-12 gap-1">
              {analytics.engagement.engagementByHour.map((hour) => (
                <div key={hour.hour} className="text-center">
                  <div 
                    className="bg-blue-500 rounded-t"
                    style={{ height: `${(hour.value / 100) * 60}px` }}
                    title={`${hour.label}: ${hour.value}`}
                  ></div>
                  <div className="text-xs text-gray-500 mt-1">{hour.hour}</div>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              最も活発な時間: 20:00-22:00
            </div>
          </ModernCard>

          {/* トップエンゲージングコンテンツ */}
          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">トップエンゲージングコンテンツ</h3>
            <div className="space-y-4">
              {analytics.engagement.topEngagingContent.map((content, index) => (
                <div key={content.gameId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-500 w-6">#{index + 1}</div>
                  <img 
                    src={content.thumbnail} 
                    alt={content.title}
                    className="w-16 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{content.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>👁️ {content.views.toLocaleString()}</span>
                      <span>❤️ {content.likes.toLocaleString()}</span>
                      <span>📤 {content.shares}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">{content.engagementRate}%</div>
                    <div className="text-xs text-gray-500">エンゲージメント率</div>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>
        </div>
      )}

      {/* オーディエンス */}
      {activeSection === 'audience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 年齢分布 */}
            <ModernCard className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">年齢分布</h3>
              <div className="space-y-3">
                {analytics.audience.audienceAge.map((age, index) => (
                  <div key={age.ageGroup} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{age.ageGroup}歳</span>
                    <div className="flex items-center gap-2 flex-1 mx-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${age.percentage}%`,
                            backgroundColor: getChartColor(index)
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">{age.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ModernCard>

            {/* 地域分布 */}
            <ModernCard className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">地域分布</h3>
              <div className="space-y-3">
                {analytics.audience.audienceLocation.map((location, index) => (
                  <div key={location.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{location.flag}</span>
                      <span className="text-sm text-gray-700">{location.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-green-500" 
                          style={{ width: `${location.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">{location.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ModernCard>
          </div>

          {/* 興味関心 */}
          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">オーディエンスの興味関心</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {analytics.audience.audienceInterests.map((interest, index) => (
                  <div key={interest.interest} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{interest.interest}</span>
                    <div className="flex items-center gap-2 flex-1 mx-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-purple-500" 
                          style={{ width: `${interest.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">{interest.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.audience.retentionRate}%</div>
                  <div className="text-sm text-gray-600">リテンション率</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.audience.averageSessionTime}分</div>
                  <div className="text-sm text-gray-600">平均セッション時間</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.audience.returningUsers}%</div>
                  <div className="text-sm text-gray-600">リピートユーザー</div>
                </div>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* 比較 */}
      {activeSection === 'comparison' && (
        <div className="space-y-6">
          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">業界平均との比較</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'エンゲージメント率', your: analytics.overview.engagementRate, average: analytics.comparisons.industryAverage.engagementRate, unit: '%' },
                { label: 'フォロワー数', your: analytics.overview.totalFollowers, average: analytics.comparisons.industryAverage.totalFollowers, unit: '' },
                { label: '平均いいね数', your: Math.round(analytics.overview.totalLikes / analytics.overview.totalGames), average: Math.round(analytics.comparisons.industryAverage.totalLikes / analytics.comparisons.industryAverage.totalGames), unit: '' },
                { label: '平均評価', your: analytics.overview.averageRating, average: analytics.comparisons.industryAverage.averageRating, unit: '' }
              ].map((metric, index) => (
                <div key={index} className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">{metric.label}</div>
                  <div className="text-lg font-bold text-blue-600">{metric.your}{metric.unit}</div>
                  <div className="text-sm text-gray-500">vs {metric.average}{metric.unit}</div>
                  <div className={`text-xs mt-1 ${metric.your > metric.average ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.your > metric.average ? '✓ 上回っています' : '! 下回っています'}
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">改善提案</h3>
            <div className="space-y-3">
              {analytics.comparisons.improvementSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-600 flex-shrink-0">💡</span>
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </div>
              ))}
            </div>
          </ModernCard>

          <ModernCard className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">ランキング</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">#{analytics.comparisons.categoryRanking}</div>
                <div className="text-sm text-gray-600">カテゴリ内ランキング</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">#{analytics.comparisons.globalRanking}</div>
                <div className="text-sm text-gray-600">グローバルランキング</div>
              </div>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  );
};