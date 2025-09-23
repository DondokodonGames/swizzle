// src/social/components/SimpleReactionSystem.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ModernButton } from '../../components/ui/ModernButton';
import { ModernCard } from '../../components/ui/ModernCard';
import { SocialService } from '../services/SocialService';

// リアクション型定義
export interface GameReaction {
  id: string;
  emoji: string;
  label: string;
  color: string;
  hoverColor: string;
  count: number;
  isSelected: boolean;
}

export interface ReactionStats {
  [key: string]: {
    count: number;
    userReacted: boolean;
  };
}

interface SimpleReactionSystemProps {
  gameId: string;
  initialStats?: ReactionStats;
  className?: string;
  compact?: boolean;
  showCounts?: boolean;
  animated?: boolean;
  onReactionChange?: (gameId: string, reactions: ReactionStats) => void;
}

// 定義済みリアクション
const DEFAULT_REACTIONS: Omit<GameReaction, 'count' | 'isSelected'>[] = [
  {
    id: 'completed',
    emoji: '🎯',
    label: 'やった！',
    color: 'bg-green-500 hover:bg-green-600',
    hoverColor: 'hover:bg-green-100'
  },
  {
    id: 'fun',
    emoji: '😄',
    label: '楽しかった',
    color: 'bg-yellow-500 hover:bg-yellow-600',
    hoverColor: 'hover:bg-yellow-100'
  },
  {
    id: 'amazing',
    emoji: '🤩',
    label: 'すごい！',
    color: 'bg-purple-500 hover:bg-purple-600',
    hoverColor: 'hover:bg-purple-100'
  },
  {
    id: 'difficult',
    emoji: '😅',
    label: '難しかった',
    color: 'bg-orange-500 hover:bg-orange-600',
    hoverColor: 'hover:bg-orange-100'
  },
  {
    id: 'addictive',
    emoji: '🔥',
    label: 'ハマる！',
    color: 'bg-red-500 hover:bg-red-600',
    hoverColor: 'hover:bg-red-100'
  },
  {
    id: 'creative',
    emoji: '💡',
    label: 'クリエイティブ',
    color: 'bg-blue-500 hover:bg-blue-600',
    hoverColor: 'hover:bg-blue-100'
  }
];

export const SimpleReactionSystem: React.FC<SimpleReactionSystemProps> = ({
  gameId,
  initialStats = {},
  className = '',
  compact = false,
  showCounts = true,
  animated = true,
  onReactionChange
}) => {
  // 状態管理
  const [reactionStats, setReactionStats] = useState<ReactionStats>(initialStats);
  const [loading, setLoading] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // サービスインスタンス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // リアクションデータ準備
  const reactions = useMemo(() => {
    return DEFAULT_REACTIONS.map(reaction => ({
      ...reaction,
      count: reactionStats[reaction.id]?.count || 0,
      isSelected: reactionStats[reaction.id]?.userReacted || false
    }));
  }, [reactionStats]);

  // 表示するリアクション（コンパクト時は上位3つのみ）
  const displayReactions = useMemo(() => {
    if (compact && !showAll) {
      return reactions
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }
    return reactions;
  }, [reactions, compact, showAll]);

  // 総リアクション数
  const totalReactions = useMemo(() => {
    return Object.values(reactionStats).reduce((sum, stat) => sum + stat.count, 0);
  }, [reactionStats]);

  // リアクション処理
  const handleReaction = useCallback(async (reactionId: string) => {
    if (loading) return;

    try {
      setLoading(reactionId);
      
      const currentReaction = reactionStats[reactionId];
      const isCurrentlySelected = currentReaction?.userReacted || false;
      const currentCount = currentReaction?.count || 0;

      // 楽観的更新
      const newStats = {
        ...reactionStats,
        [reactionId]: {
          count: currentCount + (isCurrentlySelected ? -1 : 1),
          userReacted: !isCurrentlySelected
        }
      };
      
      setReactionStats(newStats);

      // 実装時はSupabase APIコール
      // const result = await socialService.toggleReaction(gameId, reactionId, 'current-user');
      
      // モック結果（実装時は削除）
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log(`${gameId}: Reaction ${reactionId} ${isCurrentlySelected ? 'removed' : 'added'}`);

      // コールバック実行
      onReactionChange?.(gameId, newStats);

    } catch (error) {
      // エラー時はロールバック
      setReactionStats(reactionStats);
      console.error('Reaction error:', error);
    } finally {
      setLoading(null);
    }
  }, [gameId, reactionStats, loading, onReactionChange, socialService]);

  // 数値フォーマット
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // 初期データ読み込み
  useEffect(() => {
    if (Object.keys(initialStats).length === 0) {
      // 実装時はSupabase APIから取得
      // fetchReactionStats();
    }
  }, [initialStats]);

  return (
    <div className={`simple-reaction-system ${className}`}>
      {/* リアクションボタン群 */}
      <div className={`flex flex-wrap gap-2 ${compact ? 'gap-1' : 'gap-2'}`}>
        {displayReactions.map((reaction) => (
          <ModernButton
            key={reaction.id}
            onClick={() => handleReaction(reaction.id)}
            disabled={loading === reaction.id}
            className={`
              relative transition-all duration-300 group
              ${reaction.isSelected 
                ? `${reaction.color} text-white shadow-lg scale-105` 
                : `bg-gray-100 ${reaction.hoverColor} text-gray-600`
              }
              ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'}
              ${loading === reaction.id ? 'animate-pulse' : ''}
            `}
            style={{
              transform: animated && reaction.isSelected ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {/* リアクション表示 */}
            <div className="flex items-center gap-1">
              <span 
                className={`text-lg transition-transform duration-200 ${
                  reaction.isSelected ? 'animate-bounce' : 'group-hover:scale-110'
                }`}
              >
                {reaction.emoji}
              </span>
              
              {!compact && (
                <span className="font-medium text-sm">
                  {reaction.label}
                </span>
              )}
              
              {showCounts && reaction.count > 0 && (
                <span className={`text-xs font-bold ${
                  reaction.isSelected ? 'text-white' : 'text-gray-500'
                }`}>
                  {formatCount(reaction.count)}
                </span>
              )}
            </div>

            {/* パーティクル効果 */}
            {animated && reaction.isSelected && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-xs animate-ping opacity-75"
                    style={{
                      left: `${30 + Math.random() * 40}%`,
                      top: `${30 + Math.random() * 40}%`,
                      animationDelay: `${i * 100}ms`,
                      animationDuration: '0.8s'
                    }}
                  >
                    {reaction.emoji}
                  </div>
                ))}
              </div>
            )}
          </ModernButton>
        ))}

        {/* コンパクト時の「もっと見る」ボタン */}
        {compact && reactions.length > 3 && (
          <ModernButton
            onClick={() => setShowAll(!showAll)}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            {showAll ? '➖' : '➕'}
          </ModernButton>
        )}
      </div>

      {/* 統計サマリー */}
      {showCounts && totalReactions > 0 && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <span>💬 {formatCount(totalReactions)}件のリアクション</span>
          {compact && (
            <span>• 最多: {reactions.sort((a, b) => b.count - a.count)[0]?.emoji}</span>
          )}
        </div>
      )}
    </div>
  );
};

// リアクション統計表示コンポーネント
interface ReactionStatsDisplayProps {
  reactions: ReactionStats;
  className?: string;
}

export const ReactionStatsDisplay: React.FC<ReactionStatsDisplayProps> = ({
  reactions,
  className = ''
}) => {
  const sortedReactions = useMemo(() => {
    return DEFAULT_REACTIONS
      .map(reaction => ({
        ...reaction,
        count: reactions[reaction.id]?.count || 0
      }))
      .filter(reaction => reaction.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [reactions]);

  if (sortedReactions.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        <div className="text-2xl mb-2">🎮</div>
        <p className="text-sm">まだリアクションがありません</p>
      </div>
    );
  }

  return (
    <ModernCard className={`p-4 ${className}`}>
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>💬</span>
        <span>プレイヤーの反応</span>
      </h3>
      
      <div className="space-y-2">
        {sortedReactions.map((reaction, index) => (
          <div key={reaction.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{reaction.emoji}</span>
              <span className="text-sm text-gray-700">{reaction.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                {reaction.count.toLocaleString()}
              </span>
              {index === 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  👑 人気
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 総数 */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-center">
        <span className="text-sm text-gray-500">
          総リアクション数: {Object.values(reactions).reduce((sum, stat) => sum + stat.count, 0).toLocaleString()}件
        </span>
      </div>
    </ModernCard>
  );
};

// 使用例コンポーネント
export const ReactionSystemExample: React.FC = () => {
  const [stats, setStats] = useState<ReactionStats>({
    completed: { count: 245, userReacted: false },
    fun: { count: 189, userReacted: true },
    amazing: { count: 98, userReacted: false },
    difficult: { count: 67, userReacted: false },
    addictive: { count: 156, userReacted: false },
    creative: { count: 34, userReacted: false }
  });

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-bold">シンプルリアクションシステム</h2>
      
      {/* 標準サイズ */}
      <div>
        <h3 className="text-lg font-semibold mb-2">標準サイズ</h3>
        <SimpleReactionSystem
          gameId="example-game-1"
          initialStats={stats}
          onReactionChange={(gameId, reactions) => {
            console.log(`${gameId}: Reactions updated`, reactions);
            setStats(reactions);
          }}
        />
      </div>

      {/* コンパクトサイズ */}
      <div>
        <h3 className="text-lg font-semibold mb-2">コンパクトサイズ</h3>
        <SimpleReactionSystem
          gameId="example-game-2"
          initialStats={stats}
          compact={true}
          onReactionChange={(gameId, reactions) => {
            console.log(`${gameId}: Reactions updated`, reactions);
          }}
        />
      </div>

      {/* 統計表示 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">統計表示</h3>
        <ReactionStatsDisplay reactions={stats} />
      </div>
    </div>
  );
};