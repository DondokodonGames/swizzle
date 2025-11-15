// src/components/ProfileModal.tsx
// ゲーム画面からポップアップで表示するユーザープロフィール（Phase M: SubscriptionManager統合版）
// 修正: user_profiles → profiles

import React, { useState, useEffect, useMemo } from 'react';
import { SocialService } from '../social/services/SocialService';
import { supabase } from '../lib/supabase';
import { SubscriptionManager } from './monetization/SubscriptionManager';

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
}

interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  website: string;
  stats: {
    totalGames: number;
    totalPlays: number;
    totalLikes: number;
    totalFollowers: number;
    totalFollowing: number;
    joinDate: string;
  };
  preferences: {
    language: string;
    avoidTags: string[];
    monetization: {
      enabled: boolean;
      earnings: number;
    };
  };
  isOwner: boolean;
  isFollowing: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ userId, onClose }) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'settings'>('info');

  const socialService = useMemo(() => SocialService.getInstance(), []);

  // プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        // プロフィール情報を取得（修正: user_profiles → profiles）
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        // ゲーム統計を取得
        const { data: games } = await supabase
          .from('user_games')
          .select('*')
          .eq('creator_id', userId);

        const totalGames = games?.length || 0;
        const totalPlays = games?.reduce((sum, game) => sum + (game.play_count || 0), 0) || 0;
        const totalLikes = games?.reduce((sum, game) => sum + (game.like_count || 0), 0) || 0;

        // フォロワー/フォロー中を取得
        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);

        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);

        // フォロー状態を確認
        let isFollowing = false;
        if (currentUserId && currentUserId !== userId) {
          const { data: followData } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', currentUserId)
            .eq('following_id', userId)
            .single();

          isFollowing = !!followData;
        }

        // ユーザー設定を取得
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        setProfile({
          id: profileData.id,
          username: profileData.username,
          displayName: profileData.display_name || profileData.username,
          avatar: profileData.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profileData.username}`,
          banner: profileData.banner_url || 'https://picsum.photos/800/200',
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || '',
          stats: {
            totalGames,
            totalPlays,
            totalLikes,
            totalFollowers: followersCount || 0,
            totalFollowing: followingCount || 0,
            joinDate: profileData.created_at
          },
          preferences: {
            language: preferences?.language || 'ja',
            avoidTags: preferences?.avoid_tags || [],
            monetization: {
              enabled: preferences?.monetization_enabled || false,
              earnings: preferences?.total_earnings || 0
            }
          },
          isOwner: currentUserId === userId,
          isFollowing
        });

      } catch (err: any) {
        console.error('プロフィール取得エラー:', err);
        setError(err.message || 'プロフィールの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // フォロー切り替え
  const handleFollow = async () => {
    if (!profile) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await socialService.toggleFollow(userId, user.id);

      setProfile(prev => prev ? {
        ...prev,
        isFollowing: result.isFollowing,
        stats: {
          ...prev.stats,
          totalFollowers: result.newCount
        }
      } : null);

    } catch (err) {
      console.error('フォロー切り替えエラー:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">プロフィール読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <span className="text-6xl mb-4 block">😵</span>
            <h3 className="text-xl font-bold text-gray-800 mb-2">エラー</h3>
            <p className="text-gray-600 mb-6">{error || 'プロフィールが見つかりません'}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-2xl">
        {/* ヘッダー */}
        <div className="relative">
          {/* バナー */}
          <img
            src={profile.banner}
            alt="Banner"
            className="w-full h-32 object-cover rounded-t-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 rounded-t-3xl"></div>

          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* プロフィール内容 */}
        <div className="px-6 pb-6">
          {/* アバターと基本情報 */}
          <div className="flex items-end gap-4 -mt-12 mb-4">
            <img
              src={profile.avatar}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{profile.displayName}</h2>
              <p className="text-gray-600">@{profile.username}</p>
            </div>
            {!profile.isOwner && (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 font-bold rounded-xl transition-colors ${
                  profile.isFollowing
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {profile.isFollowing ? '✓ フォロー中' : '+ フォロー'}
              </button>
            )}
          </div>

          {/* バイオ */}
          {profile.bio && (
            <p className="text-gray-700 mb-4">{profile.bio}</p>
          )}

          {/* 追加情報 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
            {profile.location && (
              <span>📍 {profile.location}</span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-600"
              >
                🔗 {profile.website}
              </a>
            )}
            <span>📅 {new Date(profile.stats.joinDate).toLocaleDateString('ja-JP')}に参加</span>
          </div>

          {/* タブ */}
          <div className="flex gap-2 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 font-bold transition-colors ${
                activeTab === 'info'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 統計情報
            </button>
            {profile.isOwner && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 font-bold transition-colors ${
                  activeTab === 'settings'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚙️ 設定
              </button>
            )}
          </div>

          {/* タブコンテンツ */}
          {activeTab === 'info' && (
            <div>
              {/* 統計情報 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{profile.stats.totalGames}</div>
                  <div className="text-sm text-gray-600">作品</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{profile.stats.totalLikes.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">貰ったいいね</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{profile.stats.totalPlays.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">プレイされた数</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">{profile.stats.totalPlays.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">プレイした数</div>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-pink-600">{profile.stats.totalFollowers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">フォロワー</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-600">{profile.stats.totalFollowing.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">フォロー中</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && profile.isOwner && (
            <div className="space-y-6">
              {/* Phase M: サブスクリプション管理セクション */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  <span>サブスクリプション管理</span>
                </h3>
                <SubscriptionManager />
              </div>

              {/* 設定言語 */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-800 mb-3">🌐 設定言語</h3>
                <select
                  value={profile.preferences.language}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              {/* 避けたいタグ */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-800 mb-3">🚫 避けたいタグ</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.preferences.avoidTags.length > 0 ? (
                    profile.preferences.avoidTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                      >
                        {tag} ✕
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">設定されていません</p>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="タグを追加..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 収益関連情報 */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-yellow-200">
                <h3 className="font-bold text-gray-800 mb-3">💰 収益関連情報</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">収益化設定</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      profile.preferences.monetization.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.preferences.monetization.enabled ? '有効' : '無効'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">累計収益</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      ¥{profile.preferences.monetization.earnings.toLocaleString()}
                    </span>
                  </div>
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl transition-colors">
                    収益設定を変更
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;