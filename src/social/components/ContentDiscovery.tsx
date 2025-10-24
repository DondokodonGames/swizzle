// src/social/components/ContentDiscovery.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { PublicGame, UserProfile } from '../types/SocialTypes';
import { LikeButton } from './LikeButton';

interface ContentDiscoveryProps {
  userId: string;
  className?: string;
  maxRecommendations?: number;
}

interface RecommendationSection {
  id: string;
  title: string;
  description: string;
  algorithm: string;
  icon: string;
  games: RecommendedGame[];
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
}

interface RecommendedGame extends PublicGame {
  recommendationScore: number;
  recommendationReason: string[];
  similarityType: 'content' | 'collaborative' | 'trending' | 'social' | 'behavior';
  confidence: number; // 0-1
  abTestGroup?: string;
}

interface UserPreferences {
  favoriteCategories: string[];
  playTime: 'short' | 'medium' | 'long';
  difficulty: 'easy' | 'medium' | 'hard';
  gameplayStyle: string[];
  followedCreators: string[];
  interactionHistory: {
    likedGames: string[];
    playedGames: string[];
    sharedGames: string[];
    searchTerms: string[];
  };
}

interface DiscoveryMetrics {
  impressions: number;
  clicks: number;
  plays: number;
  likes: number;
  shares: number;
  ctr: number; // click-through rate
  engagement: number;
}

const RECOMMENDATION_ALGORITHMS = [
  {
    id: 'personalized',
    name: '個人向け推薦',
    description: 'あなたの好みに基づいた推薦',
    icon: '🎯',
    weight: 0.4
  },
  {
    id: 'collaborative',
    name: '似たユーザー',
    description: '似た好みのユーザーが楽しんだゲーム',
    icon: '👥',
    weight: 0.3
  },
  {
    id: 'trending',
    name: 'トレンド',
    description: '今話題のゲーム',
    icon: '📈',
    weight: 0.2
  },
  {
    id: 'social',
    name: 'ソーシャル',
    description: 'フォローしているクリエイターの新作',
    icon: '🤝',
    weight: 0.1
  }
];

const DISCOVERY_SECTIONS = [
  {
    id: 'for_you',
    title: 'あなたにおすすめ',
    description: 'パーソナライズされた推薦',
    icon: '✨',
    priority: 1
  },
  {
    id: 'similar_taste',
    title: '似た好みのユーザーから',
    description: '協調フィルタリング',
    icon: '👥',
    priority: 2
  },
  {
    id: 'trending_now',
    title: '今話題',
    description: 'トレンド分析',
    icon: '🔥',
    priority: 3
  },
  {
    id: 'new_creators',
    title: '新進クリエイター',
    description: 'フレッシュな才能を発見',
    icon: '🌟',
    priority: 4
  },
  {
    id: 'genre_deep_dive',
    title: '好きなジャンルを深掘り',
    description: 'カテゴリ特化推薦',
    icon: '🎮',
    priority: 5
  },
  {
    id: 'social_picks',
    title: 'フォロー中の活動',
    description: 'ソーシャル連動',
    icon: '🤝',
    priority: 6
  }
];

export const ContentDiscovery: React.FC<ContentDiscoveryProps> = ({
  userId,
  className = '',
  maxRecommendations = 8
}) => {
  // 状態管理
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DiscoveryMetrics>({
    impressions: 0,
    clicks: 0,
    plays: 0,
    likes: 0,
    shares: 0,
    ctr: 0,
    engagement: 0
  });
  const [abTestGroup, setAbTestGroup] = useState<string>('control');
  const [selectedSection, setSelectedSection] = useState<string>('for_you');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // サービス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ユーザー設定読み込み
  const loadUserPreferences = useCallback(async () => {
    try {
      // 実装時はSupabase APIで置き換え
      const mockPreferences: UserPreferences = {
        favoriteCategories: ['puzzle', 'casual', 'action'],
        playTime: 'medium',
        difficulty: 'medium',
        gameplayStyle: ['relaxing', 'challenging', 'creative'],
        followedCreators: ['creator1', 'creator2', 'creator3'],
        interactionHistory: {
          likedGames: Array.from({ length: 20 }, (_, i) => `game_${i}`),
          playedGames: Array.from({ length: 50 }, (_, i) => `game_${i + 100}`),
          sharedGames: Array.from({ length: 5 }, (_, i) => `game_${i + 200}`),
          searchTerms: ['パズル', 'アクション', '楽しい', 'かわいい']
        }
      };

      setUserPreferences(mockPreferences);
      return mockPreferences;
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }
  }, [userId]);

  // A/Bテストグループ決定
  const determineABTestGroup = useCallback(() => {
    const userId_num = parseInt(userId.slice(-2), 16) || 0;
    const groups = ['control', 'variant_a', 'variant_b'];
    const group = groups[userId_num % groups.length];
    setAbTestGroup(group);
    return group;
  }, [userId]);

  // 推薦アルゴリズム実行
  const generateRecommendations = useCallback(async (
    algorithm: string,
    preferences: UserPreferences,
    count: number = maxRecommendations
  ): Promise<RecommendedGame[]> => {
    try {
      // 基本ゲームデータ取得
      const baseGames = await socialService.getPublicGames({}, 1, count * 3);
      
      // アルゴリズム別スコア計算
      const scoredGames = baseGames.games.map((game): RecommendedGame => {
        const score = calculateRecommendationScore(game, algorithm, preferences);
        const reasons = generateRecommendationReasons(game, algorithm, preferences);
        
        return {
          ...game,
          recommendationScore: score,
          recommendationReason: reasons,
          similarityType: getSimilarityType(algorithm),
          confidence: Math.min(score / 100, 1),
          abTestGroup
        };
      });

      // スコア順ソートと上位選択
      return scoredGames
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, count);

    } catch (error) {
      console.error(`Error generating ${algorithm} recommendations:`, error);
      return [];
    }
  }, [socialService, maxRecommendations, abTestGroup]);

  // 推薦スコア計算
  const calculateRecommendationScore = useCallback((
    game: PublicGame,
    algorithm: string,
    preferences: UserPreferences
  ): number => {
    let score = 0;

    switch (algorithm) {
      case 'personalized':
        // カテゴリマッチ
        if (preferences.favoriteCategories.includes(game.category)) score += 30;
        
        // タグマッチ
        const tagMatches = game.tags.filter(tag => 
          preferences.gameplayStyle.some(style => tag.includes(style))
        ).length;
        score += tagMatches * 15;
        
        // 作者フォロー状況
        if (preferences.followedCreators.includes(game.author.id)) score += 25;
        
        // 基本人気度
        score += Math.min(game.stats.likes / 100, 20);
        break;

      case 'collaborative':
        // 似たユーザーの行動パターン（モック）
        const collaborativeScore = Math.random() * 60 + 20;
        score += collaborativeScore;
        
        // 相互作用の強度
        if (game.stats.likes > 100) score += 15;
        if (game.stats.shares > 20) score += 10;
        break;

      case 'trending':
        // トレンドスコア
        const daysSinceCreated = (Date.now() - new Date(game.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const trendScore = Math.max(50 - daysSinceCreated * 2, 0);
        score += trendScore;
        
        // バイラル係数
        const viralScore = (game.stats.shares * 2 + game.stats.likes * 0.5) / Math.max(daysSinceCreated, 1);
        score += Math.min(viralScore, 30);
        break;

      case 'social':
        // ソーシャル連動
        if (preferences.followedCreators.includes(game.author.id)) score += 40;
        
        // フォロワーの活動
        const socialBoost = Math.random() * 30 + 10; // モック
        score += socialBoost;
        break;

      default:
        score = Math.random() * 50 + 25;
    }

    // A/Bテスト調整
    if (abTestGroup === 'variant_a') {
      score *= 1.1; // 10%ブースト
    } else if (abTestGroup === 'variant_b') {
      score *= 0.9; // 10%減少
    }

    return Math.round(score);
  }, [abTestGroup]);

  // 推薦理由生成
  const generateRecommendationReasons = useCallback((
    game: PublicGame,
    algorithm: string,
    preferences: UserPreferences
  ): string[] => {
    const reasons: string[] = [];

    if (preferences.favoriteCategories.includes(game.category)) {
      reasons.push(`好きなジャンル「${game.category}」`);
    }

    if (preferences.followedCreators.includes(game.author.id)) {
      reasons.push(`フォロー中の${game.author.name}の作品`);
    }

    const tagMatches = game.tags.filter(tag => 
      preferences.gameplayStyle.some(style => tag.includes(style))
    );
    if (tagMatches.length > 0) {
      reasons.push(`「${tagMatches[0]}」要素`);
    }

    if (game.stats.likes > 500) {
      reasons.push('高評価作品');
    }

    if (algorithm === 'trending') {
      reasons.push('話題沸騰中');
    }

    if (algorithm === 'collaborative') {
      reasons.push('似た好みのユーザーが高評価');
    }

    return reasons.length > 0 ? reasons : ['おすすめ'];
  }, []);

  // 類似性タイプ取得
  const getSimilarityType = useCallback((algorithm: string): RecommendedGame['similarityType'] => {
    switch (algorithm) {
      case 'personalized': return 'content';
      case 'collaborative': return 'collaborative';
      case 'trending': return 'trending';
      case 'social': return 'social';
      default: return 'behavior';
    }
  }, []);

  // セクション生成
  const generateSections = useCallback(async (preferences: UserPreferences) => {
    const newSections: RecommendationSection[] = [];

    for (const sectionConfig of DISCOVERY_SECTIONS) {
      try {
        const algorithm = getAlgorithmForSection(sectionConfig.id);
        const games = await generateRecommendations(algorithm, preferences);
        
        newSections.push({
          id: sectionConfig.id,
          title: sectionConfig.title,
          description: sectionConfig.description,
          algorithm,
          icon: sectionConfig.icon,
          games,
          hasMore: true,
          loadMore: async () => {
            const moreGames = await generateRecommendations(algorithm, preferences, 4);
            setSections(prev => prev.map(section => 
              section.id === sectionConfig.id 
                ? { ...section, games: [...section.games, ...moreGames] }
                : section
            ));
          }
        });
      } catch (error) {
        console.error(`Error generating section ${sectionConfig.id}:`, error);
      }
    }

    return newSections;
  }, [generateRecommendations]);

  // セクション用アルゴリズム選択
  const getAlgorithmForSection = useCallback((sectionId: string): string => {
    const mapping: Record<string, string> = {
      'for_you': 'personalized',
      'similar_taste': 'collaborative',
      'trending_now': 'trending',
      'new_creators': 'trending',
      'genre_deep_dive': 'personalized',
      'social_picks': 'social'
    };
    return mapping[sectionId] || 'personalized';
  }, []);

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [preferences] = await Promise.all([
        loadUserPreferences(),
        // メトリクス読み込みも並列実行可能
      ]);

      if (preferences) {
        const sections = await generateSections(preferences);
        setSections(sections);
        
        // 初期メトリクス設定
        setMetrics(prev => ({
          ...prev,
          impressions: prev.impressions + sections.reduce((sum, section) => sum + section.games.length, 0)
        }));
      }

    } catch (error) {
      setError('推薦コンテンツの読み込みに失敗しました');
      console.error('Error loading discovery data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadUserPreferences, generateSections]);

  // 初期読み込み
  useEffect(() => {
    determineABTestGroup();
    loadData();
  }, [determineABTestGroup, loadData]);

  // リフレッシュ
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ゲームクリック処理
  const handleGameClick = useCallback((game: RecommendedGame, sectionId: string) => {
    // メトリクス更新
    setMetrics(prev => ({
      ...prev,
      clicks: prev.clicks + 1,
      ctr: (prev.clicks + 1) / Math.max(prev.impressions, 1)
    }));

    // 実装時はゲームページに遷移
    console.log(`Clicked game ${game.id} from section ${sectionId} (score: ${game.recommendationScore})`);
  }, []);

  // いいね処理
  const handleLike = useCallback((gameId: string) => {
    setMetrics(prev => ({
      ...prev,
      likes: prev.likes + 1,
      engagement: (prev.likes + prev.shares + prev.plays) / Math.max(prev.impressions, 1)
    }));
  }, []);

  // 現在選択されたセクション
  const currentSection = useMemo(() => {
    return sections.find(section => section.id === selectedSection) || sections[0];
  }, [sections, selectedSection]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">あなたにピッタリのゲームを探しています...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">❌ {error}</div>
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
    <div className={`content-discovery ${className}`}>
      {/* ヘッダー */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">✨ コンテンツ発見</h2>
          <div className="flex gap-2">
            <ModernButton
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              {viewMode === 'grid' ? '📋' : '🗂️'}
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

        {/* メトリクス表示 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{metrics.impressions}</div>
            <div className="text-xs text-gray-500">表示</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{metrics.clicks}</div>
            <div className="text-xs text-gray-500">クリック</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="text-lg font-bold text-purple-600">{(metrics.ctr * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-500">CTR</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="text-lg font-bold text-orange-600">{(metrics.engagement * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-500">エンゲージ</div>
          </div>
        </div>
      </div>

      {/* セクション選択 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map((section) => (
          <ModernButton
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className={`text-sm ${
              selectedSection === section.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {section.icon} {section.title}
          </ModernButton>
        ))}
      </div>

      {/* 現在のセクション表示 */}
      {currentSection && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                {currentSection.icon} {currentSection.title}
              </h3>
              <p className="text-sm text-gray-600">{currentSection.description}</p>
            </div>
            {currentSection.hasMore && (
              <ModernButton
                onClick={currentSection.loadMore}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                もっと見る
              </ModernButton>
            )}
          </div>

          {/* ゲーム表示 */}
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'
          }>
            {currentSection.games.map((game) => (
              <ModernCard 
                key={game.id} 
                className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'p-4' : ''
                }`}
                onClick={() => handleGameClick(game, currentSection.id)}
              >
                {viewMode === 'grid' ? (
                  <div>
                    {/* サムネイル */}
                    <div className="relative">
                      <img 
                        src={game.thumbnail} 
                        alt={game.title}
                        className="w-full h-32 object-cover"
                      />
                      {/* 推薦スコア */}
                      <div className="absolute top-2 left-2">
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          {Math.round(game.confidence * 100)}% マッチ
                        </span>
                      </div>
                      {/* A/Bテストバッジ */}
                      {abTestGroup !== 'control' && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-yellow-500 text-white text-xs px-1 py-1 rounded">
                            {abTestGroup}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h4 className="font-semibold text-gray-800 mb-1 truncate">{game.title}</h4>
                      
                      {/* 推薦理由 */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {game.recommendationReason.slice(0, 2).map(reason => (
                          <span key={reason} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {reason}
                          </span>
                        ))}
                      </div>

                      {/* 作者・統計 */}
                      <div className="flex items-center gap-2 mb-2">
                        <img 
                          src={game.author.avatar} 
                          alt={game.author.name}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-xs text-gray-500">{game.author.name}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>👁️ {game.stats.views?.toLocaleString() || 0}</span>
                        <span>❤️ {game.stats.likes.toLocaleString()}</span>
                        <span>📤 {game.stats.shares}</span>
                      </div>

                      {/* アクション */}
                      <LikeButton
                        gameId={game.id}
                        initialStats={game.stats}
                        initialState={{
                          isLiked: game.isLiked,
                          isBookmarked: game.isBookmarked
                        }}
                        onLike={() => handleLike(game.id)}
                        compact={true}
                        showLabels={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <img 
                      src={game.thumbnail} 
                      alt={game.title}
                      className="w-24 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-1">{game.title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{game.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {game.recommendationReason.map(reason => (
                              <span key={reason} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600 mb-1">
                            {Math.round(game.confidence * 100)}% マッチ
                          </div>
                          <div className="text-xs text-gray-500">
                            スコア: {game.recommendationScore}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>👁️ {game.stats.views?.toLocaleString() || 0}</span>
                          <span>❤️ {game.stats.likes.toLocaleString()}</span>
                        </div>
                        
                        <LikeButton
                          gameId={game.id}
                          initialStats={game.stats}
                          initialState={{
                            isLiked: game.isLiked,
                            isBookmarked: game.isBookmarked
                          }}
                          onLike={() => handleLike(game.id)}
                          compact={true}
                          showLabels={false}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </ModernCard>
            ))}
          </div>

          {currentSection.games.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">推薦コンテンツを準備中</h3>
              <p className="text-gray-500">あなたの好みを学習して、より良い推薦をお届けします</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};