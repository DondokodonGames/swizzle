// src/social/components/TrendingGames.tsx
// Phase 3完全版: Supabase trending API連携

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame } from '../types/SocialTypes';
import { SimpleReactionSystem } from './SimpleReactionSystem';
import { LikeButton } from './LikeButton';

// トレンド分析型定義
interface TrendingGame extends PublicGame {
  trendScore: number;
  rankChange: number; // 前回からのランク変動 (+上昇, -下降, 0変動なし)
  growthRate: number; // 成長率 (%)
  peakTime: string; // ピーク時間帯
}

interface TrendingStats {
  totalGames: number;
  activeUsers: number;
  totalPlays: number;
  avgEngagement: number;
}

interface TrendingGamesProps {
  userId?: string; // ユーザーIDを追加
  className?: string;
  maxItems?: number;
  showStats?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

// 期間フィルター定義
const TIME_FILTERS = [
  { id: 'today', label: '今日', icon: '📅', hours: 24 },
  { id: 'week', label: '今週', icon: '📊', hours: 24 * 7 },
  { id: 'month', label: '今月', icon: '📈', hours: 24 * 30 },
  { id: 'all', label: '全期間', icon: '🌟', hours: -1 }
];

// ランキング種別定義
const RANKING_TYPES = [
  { id: 'trending', label: '🔥 トレンド', icon: '🔥' },
  { id: 'popular', label: '❤️ 人気', icon: '❤️' },
  { id: 'newest', label: '🆕 新着', icon: '🆕' },
  { id: 'played', label: '🎯 プレイ数', icon: '🎯' }
];

export const TrendingGames: React.FC<TrendingGamesProps> = ({
  userId,
  className = '',
  maxItems = 10,
  showStats = true,
  autoRefresh = true,
  refreshInterval = 300000 // 5分
}) => {
  // 状態管理
  const [trendingGames, setTrendingGames] = useState<TrendingGame[]>([]);
  const [stats, setStats] = useState<TrendingStats>({
    totalGames: 0,
    activeUsers: 0,
    totalPlays: 0,
    avgEngagement: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [selectedRanking, setSelectedRanking] = useState<string>('trending');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // サービスインスタンス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // トレンドゲーム取得
  const fetchTrendingGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Supabase API呼び出し
      const trendingData = await socialService.getTrendingGames(
        selectedPeriod, 
        selectedRanking, 
        maxItems
      );

      setTrendingGames(trendingData);

      // 統計データ計算
      const totalPlays = trendingData.reduce((sum, game) => sum + (game.stats.views || 0), 0);
      const totalLikes = trendingData.reduce((sum, game) => sum + game.stats.likes, 0);
      const avgEngagement = trendingData.length > 0 ? totalLikes / trendingData.length : 0;

      setStats({
        totalGames: trendingData.length,
        activeUsers: Math.floor(totalPlays * 0.3), // 推定アクティブユーザー
        totalPlays,
        avgEngagement
      });

      setLastUpdate(new Date());
    } catch (err) {
      setError('トレンドデータの読み込みに失敗しました');
      console.error('Error fetching trending games:', err);
    } finally {
      setLoading(false);
    }
  }, [socialService, selectedPeriod, selectedRanking, maxItems]);

  // 初期ロード
  useEffect(() => {
    fetchTrendingGames();
  }, [fetchTrendingGames]);

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchTrendingGames, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTrendingGames]);

  // 数値フォーマット
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // ランク変動アイコン
  const getRankChangeIcon = useCallback((change: number): string => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➖';
  }, []);

  // 成長率カラー
  const getGrowthColor = useCallback((rate: number): string => {
    if (rate > 50) return 'text-green-600';
    if (rate > 0) return 'text-green-500';
    if (rate > -20) return 'text-yellow-500';
    return 'text-red-500';
  }, []);

  return (
    <div className={`trending-games ${className}`}>
      {/* ヘッダー */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">📈 トレンド・ランキング</h2>
          <div className="text-xs text-gray-500">
            最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
          </div>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2">
          {/* 期間フィルター */}
          <div className="flex flex-wrap gap-1">
            {TIME_FILTERS.map((filter) => (
              <ModernButton
                key={filter.id}
                onClick={() => setSelectedPeriod(filter.id)}
                className={`text-sm ${
                  selectedPeriod === filter.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {filter.icon} {filter.label}
              </ModernButton>
            ))}
          </div>

          <div className="w-px bg-gray-300"></div>

          {/* ランキング種別 */}
          <div className="flex flex-wrap gap-1">
            {RANKING_TYPES.map((type) => (
              <ModernButton
                key={type.id}
                onClick={() => setSelectedRanking(type.id)}
                className={`text-sm ${
                  selectedRanking === type.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {type.label}
              </ModernButton>
            ))}
          </div>
        </div>
      </div>

      {/* 統計サマリー */}
      {showStats && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <ModernCard className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalGames}</div>
            <div className="text-sm text-gray-500">ランクイン</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formatCount(stats.activeUsers)}</div>
            <div className="text-sm text-gray-500">アクティブユーザー</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{formatCount(stats.totalPlays)}</div>
            <div className="text-sm text-gray-500">総プレイ数</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{Math.round(stats.avgEngagement)}</div>
            <div className="text-sm text-gray-500">平均いいね数</div>
          </ModernCard>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {/* ローディング状態 */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">読み込み中...</span>
        </div>
      )}

      {/* トレンドゲーム一覧 */}
      {!loading && (
        <div className="space-y-4">
          {trendingGames.map((game, index) => (
            <ModernCard key={game.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                {/* ランク表示 */}
                <div className="flex-shrink-0 text-center">
                  <div className={`text-2xl font-bold ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {index === 0 ? '🥇' :
                     index === 1 ? '🥈' :
                     index === 2 ? '🥉' :
                     `#${index + 1}`}
                  </div>
                  <div className="text-xs text-center flex items-center justify-center gap-1">
                    <span>{getRankChangeIcon(game.rankChange)}</span>
                    {game.rankChange !== 0 && (
                      <span className={game.rankChange > 0 ? 'text-green-600' : 'text-red-600'}>
                        {Math.abs(game.rankChange)}
                      </span>
                    )}
                  </div>
                </div>

                {/* ゲームサムネイル */}
                <div className="flex-shrink-0">
                  <img 
                    src={game.thumbnail} 
                    alt={game.title}
                    className="w-20 h-16 object-cover rounded"
                  />
                </div>

                {/* ゲーム情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{game.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{game.description}</p>
                      
                      {/* 作者・カテゴリ */}
                      <div className="flex items-center gap-2 mt-1">
                        <img 
                          src={game.author.avatar} 
                          alt={game.author.name}
                          className="w-4 h-4 rounded-full"
                        />
                        <span className="text-xs text-gray-500">{game.author.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {game.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          ピーク: {game.peakTime}
                        </span>
                      </div>
                    </div>

                    {/* 統計・成長率 */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center justify-end gap-3 text-xs text-gray-500 mb-1">
                        <span>👁️ {formatCount(game.stats.views || 0)}</span>
                        <span>❤️ {formatCount(game.stats.likes)}</span>
                        <span>📤 {formatCount(game.stats.shares)}</span>
                      </div>
                      <div className={`text-xs font-medium ${getGrowthColor(game.growthRate)}`}>
                        {game.growthRate > 0 ? '+' : ''}{game.growthRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <ModernButton
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1"
                      >
                        ▶️ プレイ
                      </ModernButton>
                      <LikeButton
                        gameId={game.id}
                        initialStats={game.stats}
                        initialState={{
                          isLiked: game.isLiked,
                          isBookmarked: game.isBookmarked
                        }}
                        compact={true}
                        showLabels={false}
                      />
                    </div>

                    {/* トレンドスコア */}
                    <div className="text-xs text-gray-500">
                      トレンドスコア: {Math.round(game.trendScore)}
                    </div>
                  </div>
                </div>
              </div>
            </ModernCard>
          ))}
        </div>
      )}

      {/* 空の状態 */}
      {!loading && trendingGames.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">トレンドデータがありません</h3>
          <p className="text-gray-500">選択した期間にデータが見つかりません</p>
        </div>
      )}

      {/* リフレッシュボタン */}
      <div className="text-center mt-6">
        <ModernButton
          onClick={fetchTrendingGames}
          disabled={loading}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          {loading ? '🔄 更新中...' : '🔄 手動更新'}
        </ModernButton>
      </div>
    </div>
  );
};

// カテゴリ別トレンド表示コンポーネント
interface CategoryTrendingProps {
  userId?: string;
  categories: string[];
  className?: string;
}

export const CategoryTrending: React.FC<CategoryTrendingProps> = ({
  userId,
  categories = ['action', 'puzzle', 'casual', 'arcade'],
  className = ''
}) => {
  return (
    <div className={`category-trending ${className}`}>
      <h3 className="text-lg font-semibold mb-4">カテゴリ別トレンド</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(category => (
          <TrendingGames
            key={category}
            userId={userId}
            maxItems={3}
            showStats={false}
            autoRefresh={false}
            className="bg-gray-50 p-4 rounded-lg"
          />
        ))}
      </div>
    </div>
  );
};