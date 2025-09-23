// src/social/components/LikeButton.tsx

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { SocialStats, SocialState } from '../types/SocialTypes';

interface LikeButtonProps {
  gameId: string;
  initialStats: SocialStats;
  initialState?: Partial<SocialState>;
  onLike?: (gameId: string, isLiked: boolean) => void;
  onShare?: (gameId: string) => void;
  onBookmark?: (gameId: string, isBookmarked: boolean) => void;
  onView?: (gameId: string) => void;
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
  animated?: boolean;
}

// アニメーション設定
const ANIMATION_DURATION = 300;
const HEART_PARTICLES_COUNT = 6;

export const LikeButton: React.FC<LikeButtonProps> = ({
  gameId,
  initialStats,
  initialState = {},
  onLike,
  onShare,
  onBookmark,
  onView,
  className = '',
  compact = false,
  showLabels = true,
  animated = true
}) => {
  // 状態管理
  const [stats, setStats] = useState<SocialStats>(initialStats);
  const [state, setState] = useState<SocialState>({
    isLiked: initialState.isLiked || false,
    isShared: initialState.isShared || false,
    isBookmarked: initialState.isBookmarked || false
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [particleKey, setParticleKey] = useState(0);

  // リファレンス
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // サービスインスタンス
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // いいね処理
  const handleLike = useCallback(async () => {
    if (isAnimating) return;

    try {
      setIsAnimating(true);
      const newLikedState = !state.isLiked;
      
      // 楽観的更新
      setState(prev => ({ ...prev, isLiked: newLikedState }));
      setStats(prev => ({
        ...prev,
        likes: prev.likes + (newLikedState ? 1 : -1)
      }));

      // アニメーション効果
      if (animated && newLikedState) {
        setParticleKey(prev => prev + 1);
      }

      // APIコール
      const result = await socialService.toggleLike(gameId, 'current-user');
      
      // 実際の結果で更新
      setState(prev => ({ ...prev, isLiked: result.isLiked }));
      setStats(prev => ({ ...prev, likes: result.newCount }));

      // コールバック実行
      onLike?.(gameId, result.isLiked);

    } catch (error) {
      // エラー時はロールバック
      setState(prev => ({ ...prev, isLiked: !state.isLiked }));
      setStats(prev => ({
        ...prev,
        likes: prev.likes + (state.isLiked ? 1 : -1)
      }));
      console.error('Like error:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
    }
  }, [gameId, state.isLiked, isAnimating, animated, onLike, socialService]);

  // ブックマーク処理
  const handleBookmark = useCallback(async () => {
    try {
      const newBookmarkedState = !state.isBookmarked;
      
      // 楽観的更新
      setState(prev => ({ ...prev, isBookmarked: newBookmarkedState }));
      setStats(prev => ({
        ...prev,
        bookmarks: prev.bookmarks + (newBookmarkedState ? 1 : -1)
      }));

      // APIコール
      const result = await socialService.toggleBookmark(gameId, 'current-user');
      
      // 実際の結果で更新
      setState(prev => ({ ...prev, isBookmarked: result.isBookmarked }));
      setStats(prev => ({ ...prev, bookmarks: result.newCount }));

      onBookmark?.(gameId, result.isBookmarked);

    } catch (error) {
      // エラー時はロールバック
      setState(prev => ({ ...prev, isBookmarked: !state.isBookmarked }));
      setStats(prev => ({
        ...prev,
        bookmarks: prev.bookmarks + (state.isBookmarked ? 1 : -1)
      }));
      console.error('Bookmark error:', error);
    }
  }, [gameId, state.isBookmarked, onBookmark, socialService]);

  // シェア処理
  const handleShare = useCallback(async (platform?: string) => {
    try {
      const gameUrl = `${window.location.origin}/game/${gameId}`;
      
      if (platform === 'native' && navigator.share) {
        // ネイティブシェア
        await navigator.share({
          title: 'ゲームをチェック！',
          text: '面白いゲームを見つけました',
          url: gameUrl
        });
      } else if (platform === 'copy') {
        // URLコピー
        await navigator.clipboard.writeText(gameUrl);
        alert('URLをコピーしました！');
      } else if (platform) {
        // SNSシェア
        const shareUrls = {
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent('面白いゲームを見つけました！')}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`,
          line: `https://line.me/R/msg/text/?${encodeURIComponent('面白いゲームを見つけました！ ' + gameUrl)}`
        };
        
        const url = shareUrls[platform as keyof typeof shareUrls];
        if (url) {
          window.open(url, '_blank', 'width=600,height=400');
        }
      } else {
        // シェアメニューを表示
        setShowShareMenu(!showShareMenu);
        return;
      }

      // シェア統計を更新
      if (platform) {
        const newShareCount = await socialService.recordShare(gameId, platform, 'current-user');
        setStats(prev => ({ ...prev, shares: newShareCount }));
        setState(prev => ({ ...prev, isShared: true }));
        setShowShareMenu(false);
        onShare?.(gameId);
      }

    } catch (error) {
      console.error('Share error:', error);
    }
  }, [gameId, showShareMenu, onShare, socialService]);

  // 外部クリックでシェアメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  // ビュー数カウント（マウント時に1回だけ）
  useEffect(() => {
    if (onView) {
      onView(gameId);
      socialService.incrementViews(gameId).then(newViewCount => {
        setStats(prev => ({ ...prev, views: newViewCount }));
      });
    }
  }, [gameId, onView, socialService]);

  // 数値フォーマット
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  return (
    <div className={`like-button-container relative ${className}`}>
      <div className={`flex items-center gap-2 ${compact ? 'gap-1' : 'gap-2'}`}>
        
        {/* いいねボタン */}
        <div className="relative">
          <ModernButton
            ref={likeButtonRef}
            onClick={handleLike}
            disabled={isAnimating}
            className={`relative transition-all duration-300 ${
              state.isLiked 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-500'
            } ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'} ${
              isAnimating ? 'animate-pulse' : ''
            }`}
            style={{
              transform: animated && state.isLiked ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
          >
            <span className={`transition-transform duration-300 ${
              state.isLiked ? 'animate-bounce' : ''
            }`}>
              {state.isLiked ? '❤️' : '🤍'}
            </span>
            {showLabels && (
              <span className="ml-1 font-medium">
                {formatCount(stats.likes)}
              </span>
            )}
          </ModernButton>

          {/* ハートパーティクル効果 */}
          {animated && state.isLiked && (
            <div key={particleKey} className="absolute inset-0 pointer-events-none">
              {Array.from({ length: HEART_PARTICLES_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-red-500 text-xs animate-ping"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 50}ms`,
                    animationDuration: '1s'
                  }}
                >
                  ❤️
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ブックマークボタン */}
        <ModernButton
          onClick={handleBookmark}
          className={`transition-all duration-300 ${
            state.isBookmarked 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-yellow-500'
          } ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'}`}
        >
          {state.isBookmarked ? '⭐' : '☆'}
          {showLabels && (
            <span className="ml-1 font-medium">
              {formatCount(stats.bookmarks)}
            </span>
          )}
        </ModernButton>

        {/* シェアボタン */}
        <div className="relative" ref={shareMenuRef}>
          <ModernButton
            onClick={() => handleShare()}
            className={`transition-all duration-300 ${
              state.isShared 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-500'
            } ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'}`}
          >
            📤
            {showLabels && (
              <span className="ml-1 font-medium">
                {formatCount(stats.shares)}
              </span>
            )}
          </ModernButton>

          {/* シェアメニュー */}
          {showShareMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px] animate-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-100 mb-1">
                シェア先を選択
              </div>
              
              {/* ネイティブシェア（対応デバイスのみ） */}
              {'share' in navigator && (
                <button
                  onClick={() => handleShare('native')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  📱 デバイスのシェア機能
                </button>
              )}

              {/* SNSシェア */}
              <button
                onClick={() => handleShare('twitter')}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                🐦 Twitter でシェア
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                👤 Facebook でシェア
              </button>
              <button
                onClick={() => handleShare('line')}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                💬 LINE でシェア
              </button>
              
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  📋 URLをコピー
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ビュー数（compact以外で表示） */}
        {!compact && showLabels && (
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <span>👁️</span>
            <span>{formatCount(stats.views || 0)}</span>
          </div>
        )}
      </div>

      {/* コンパクト時の統計サマリー */}
      {compact && showLabels && (
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
          <span>👁️ {formatCount(stats.views || 0)}</span>
          <span>❤️ {formatCount(stats.likes)}</span>
          <span>📤 {formatCount(stats.shares)}</span>
        </div>
      )}
    </div>
  );
};

// レーティング機能付きバージョン
interface RatingButtonProps extends Omit<LikeButtonProps, 'initialStats'> {
  initialRating: number;
  maxRating?: number;
  onRate?: (gameId: string, rating: number) => void;
}

export const RatingButton: React.FC<RatingButtonProps> = ({
  gameId,
  initialRating,
  maxRating = 5,
  onRate,
  className = '',
  ...props
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleRate = useCallback((newRating: number) => {
    setRating(newRating);
    onRate?.(gameId, newRating);
    console.log(`${gameId}: 評価 ${newRating}/${maxRating}`);
  }, [gameId, maxRating, onRate]);

  return (
    <div className={`rating-button ${className}`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }).map((_, i) => {
          const starValue = i + 1;
          const isActive = starValue <= (hoverRating || rating);
          
          return (
            <button
              key={i}
              onClick={() => handleRate(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              className={`text-2xl transition-all duration-200 hover:scale-110 ${
                isActive ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
              }`}
            >
              {isActive ? '⭐' : '☆'}
            </button>
          );
        })}
        <span className="ml-2 text-sm text-gray-600">
          {rating.toFixed(1)} / {maxRating}
        </span>
      </div>
    </div>
  );
};