// src/social/components/UserProfile.tsx
// 🔧 修正版: 認証ユーザーID取得対応

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { SocialService } from '../services/SocialService';
import { UserProfile as UserProfileType, UserGame } from '../types/SocialTypes';
import { UserActivityFeed } from './UserActivityFeed';
import { supabase } from '../../lib/supabase'; // 🔧 追加

interface UserProfileProps {
  userId?: string;
  className?: string;
}

// タブ定義
const PROFILE_TABS = [
  { id: 'games', label: '🎮 作品', icon: '🎮' },
  { id: 'liked', label: '❤️ いいね', icon: '❤️' },
  { id: 'activity', label: '📊 活動', icon: '📊' },
  { id: 'followers', label: '👥 フォロワー', icon: '👥' },
  { id: 'following', label: '👤 フォロー中', icon: '👤' }
];

const GAME_FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'published', label: '公開中' },
  { id: 'draft', label: '下書き' },
  { id: 'private', label: '非公開' }
];

export const UserProfile: React.FC<UserProfileProps> = ({ 
  userId: propUserId,
  className = '' 
}) => {
  // 🔧 修正: 実際の認証ユーザーIDを取得
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('games');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: ''
  });

  const socialService = useMemo(() => SocialService.getInstance(), []);

  // 🔧 追加: 認証ユーザーID取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          console.log('✅ 認証ユーザーID取得成功:', user.id);
        } else {
          console.warn('⚠️ 認証されていません');
          setError('ログインが必要です');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ 認証ユーザーID取得エラー:', err);
        setError('認証情報の取得に失敗しました');
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // 🔧 修正: userIdの決定（propUserId または currentUserId）
  const userId = useMemo(() => {
    if (propUserId && propUserId !== 'current-user') {
      return propUserId;
    }
    return currentUserId;
  }, [propUserId, currentUserId]);

  // プロフィール取得
  const fetchProfile = useCallback(async () => {
    // 🔧 追加: userIdがない場合は処理しない
    if (!userId) {
      console.log('⏳ userIdがまだ取得されていません');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 プロフィール取得開始:', userId);
      
      const [profileData, gamesData] = await Promise.all([
        socialService.getUserProfile(userId),
        socialService.getUserGames(userId)
      ]);

      console.log('✅ プロフィール取得成功:', profileData);
      console.log('✅ ゲーム取得成功:', gamesData.length, '件');

      setProfile(profileData);
      setGames(gamesData);
      
      setEditForm({
        displayName: profileData.displayName,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website
      });
    } catch (err: any) {
      console.error('❌ プロフィール取得エラー:', err);
      setError(err.message || 'プロフィールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [socialService, userId]);

  // 🔧 修正: userIdが設定されたらプロフィール取得
  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  // フォロー処理
  const handleFollow = useCallback(async () => {
    if (!profile || !currentUserId) return;
    
    try {
      const result = await socialService.toggleFollow(profile.id, currentUserId);
      
      setProfile(prev => prev ? {
        ...prev,
        isFollowing: result.isFollowing,
        stats: {
          ...prev.stats,
          totalFollowers: result.newCount
        }
      } : null);
    } catch (err) {
      console.error('Follow error:', err);
    }
  }, [socialService, profile, currentUserId]);

  // プロフィール編集保存
  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    
    try {
      const updatedProfile = await socialService.updateProfile(profile.id, editForm);
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err) {
      console.error('Save profile error:', err);
    }
  }, [socialService, profile, editForm]);

  // ゲーム削除
  const handleDeleteGame = useCallback(async (gameId: string) => {
    if (!confirm('このゲームを削除しますか？') || !userId) return;
    
    try {
      await socialService.deleteGame(gameId, userId);
      setGames(prev => prev.filter(game => game.id !== gameId));
    } catch (err) {
      console.error('Delete game error:', err);
    }
  }, [socialService, userId]);

  // ゲーム公開状態変更
  const handleToggleGameStatus = useCallback(async (gameId: string) => {
    if (!userId) return;
    
    try {
      const newStatus = await socialService.toggleGameStatus(gameId, userId);
      
      setGames(prev => prev.map(game => 
        game.id === gameId 
          ? { ...game, status: newStatus as any }
          : game
      ));
    } catch (err) {
      console.error('Toggle game status error:', err);
    }
  }, [socialService, userId]);

  // フィルタリング済みゲーム
  const filteredGames = useMemo(() => {
    if (gameFilter === 'all') return games;
    return games.filter(game => game.status === gameFilter);
  }, [games, gameFilter]);

  // 統計計算
  const gameStats = useMemo(() => {
    const stats = { all: games.length, published: 0, draft: 0, private: 0 };
    games.forEach(game => {
      if (game.status in stats) {
        stats[game.status as keyof typeof stats]++;
      }
    });
    return stats;
  }, [games]);

  // ローディング状態
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  // エラー状態
  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😵</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          {error === 'ログインが必要です' ? 'ログインが必要です' : 'プロフィールが見つかりません'}
        </h3>
        <p className="text-gray-500">{error || 'ユーザーが存在しないか、アクセスできません'}</p>
        {error === 'ログインが必要です' && (
          <div className="mt-4">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAuthModal', { 
                  detail: { mode: 'signin' } 
                }));
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              ログイン
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`user-profile ${className}`}>
      {/* プロフィールヘッダー */}
      <ModernCard className="mb-6 overflow-hidden">
        {/* バナー */}
        <div className="relative">
          <img 
            src={profile.banner} 
            alt="Banner"
            className="w-full h-32 md:h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        {/* プロフィール情報 */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-12">
            {/* アバター */}
            <div className="relative">
              <img 
                src={profile.avatar} 
                alt={profile.displayName}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg"
              />
              {profile.isOwner && (
                <ModernButton
                  onClick={() => setIsEditing(!isEditing)}
                  className="absolute bottom-0 right-0 w-8 h-8 p-0 bg-blue-500 text-white rounded-full"
                >
                  ✏️
                </ModernButton>
              )}
            </div>

            {/* 基本情報 */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{profile.displayName}</h1>
                  <p className="text-gray-600">@{profile.username}</p>
                  {profile.location && (
                    <p className="text-sm text-gray-500 mt-1">📍 {profile.location}</p>
                  )}
                </div>

                {/* アクションボタン */}
                {!profile.isOwner && (
                  <ModernButton
                    onClick={handleFollow}
                    className={`${
                      profile.isFollowing
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {profile.isFollowing ? '✓ フォロー中' : '+ フォロー'}
                  </ModernButton>
                )}
              </div>

              {/* 統計情報 */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-4 text-center">
                <div>
                  <div className="text-xl font-bold text-gray-800">{profile.stats.totalGames}</div>
                  <div className="text-xs text-gray-500">作品</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800">{profile.stats.totalPlays.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">プレイ数</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800">{profile.stats.totalLikes.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">いいね</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800">{profile.stats.totalFollowers.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">フォロワー</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800">{profile.stats.totalFollowing.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">フォロー中</div>
                </div>
              </div>
            </div>
          </div>

          {/* プロフィール編集フォーム */}
          {isEditing && profile.isOwner && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">✏️ プロフィール編集</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="表示名"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="自己紹介"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="所在地"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  placeholder="ウェブサイト"
                  value={editForm.website}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <ModernButton
                    onClick={handleSaveProfile}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    💾 保存
                  </ModernButton>
                  <ModernButton
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    ✕ キャンセル
                  </ModernButton>
                </div>
              </div>
            </div>
          )}

          {/* バイオ・リンク */}
          {!isEditing && (
            <div className="mt-4 space-y-2">
              {profile.bio && (
                <p className="text-gray-700">{profile.bio}</p>
              )}
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 text-sm"
                >
                  🔗 {profile.website}
                </a>
              )}
              <p className="text-xs text-gray-500">
                📅 {new Date(profile.stats.joinDate).toLocaleDateString('ja-JP')}に参加
              </p>
            </div>
          )}
        </div>
      </ModernCard>

      {/* タブナビゲーション */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
        {PROFILE_TABS.map((tab) => (
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

      {/* タブコンテンツ */}
      {activeTab === 'games' && (
        <div>
          {/* ゲームフィルター */}
          {profile.isOwner && (
            <div className="flex flex-wrap gap-2 mb-4">
              {GAME_FILTERS.map((filter) => (
                <ModernButton
                  key={filter.id}
                  onClick={() => setGameFilter(filter.id)}
                  className={`text-sm ${
                    gameFilter === filter.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {filter.label} ({gameStats[filter.id as keyof typeof gameStats] || 0})
                </ModernButton>
              ))}
            </div>
          )}

          {/* ゲームグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <ModernCard key={game.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src={game.thumbnail} 
                    alt={game.title}
                    className="w-full h-32 object-cover"
                  />
                  
                  {/* ステータスバッジ */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs px-2 py-1 rounded text-white ${
                      game.status === 'published' ? 'bg-green-500' :
                      game.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}>
                      {game.status === 'published' ? '🟢 公開' :
                       game.status === 'draft' ? '🟡 下書き' : '🔒 非公開'}
                    </span>
                  </div>

                  {/* オーナー限定アクション */}
                  {profile.isOwner && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <ModernButton
                        onClick={() => handleToggleGameStatus(game.id)}
                        className="p-1 bg-white bg-opacity-80 text-gray-600 text-xs"
                      >
                        {game.status === 'published' ? '🔒' : '🌐'}
                      </ModernButton>
                      <ModernButton
                        onClick={() => handleDeleteGame(game.id)}
                        className="p-1 bg-red-500 bg-opacity-80 text-white text-xs"
                      >
                        🗑️
                      </ModernButton>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-gray-800 mb-2 truncate">{game.title}</h3>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>👁️ {game.stats.views?.toLocaleString() || 0}</span>
                    <span>❤️ {game.stats.likes.toLocaleString()}</span>
                    <span>📤 {game.stats.shares}</span>
                  </div>

                  <div className="flex gap-1">
                    <ModernButton
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2"
                    >
                      ▶️ プレイ
                    </ModernButton>
                    {profile.isOwner && (
                      <ModernButton
                        className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm"
                      >
                        ✏️
                      </ModernButton>
                    )}
                  </div>
                </div>
              </ModernCard>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {gameFilter === 'all' ? 'ゲームがありません' : `${GAME_FILTERS.find(f => f.id === gameFilter)?.label}のゲームがありません`}
              </h3>
              <p className="text-gray-500">
                {profile.isOwner ? '新しいゲームを作成してみましょう！' : 'まだゲームが作成されていません'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* activityタブ - UserActivityFeed統合 */}
      {activeTab === 'activity' && userId && (
        <UserActivityFeed 
          userId={userId}
          targetUserId={userId}
          maxItems={20}
          autoRefresh={true}
          showFilters={true}
        />
      )}

      {/* 他のタブは開発中 */}
      {(activeTab === 'liked' || activeTab === 'followers' || activeTab === 'following') && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">開発中</h3>
          <p className="text-gray-500">この機能は近日実装予定です</p>
        </div>
      )}
    </div>
  );
};