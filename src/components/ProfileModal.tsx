// src/components/ProfileModal.tsx
// ゲーム画面からポップアップで表示するユーザープロフィール（Phase M: SubscriptionManager統合版）
// 修正: Tailwindクラス → インラインスタイル完全変換

import React, { useState, useEffect, useMemo } from 'react';
import { SocialService } from '../social/services/SocialService';
import { supabase } from '../lib/supabase';
import { SubscriptionManager } from './monetization/SubscriptionManager';
import { DESIGN_TOKENS } from '../constants/DesignSystem';

/**
 * URLが安全なプロトコルを使用しているか検証
 * javascript:, data:, vbscript: などの危険なスキームを拒否
 */
function isValidWebsiteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // http/https のみ許可
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    // URLパースに失敗した場合は無効
    return false;
  }
}

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
  
  // ホバー状態管理
  const [closeButtonHover, setCloseButtonHover] = useState(false);
  const [followButtonHover, setFollowButtonHover] = useState(false);
  const [errorCloseButtonHover, setErrorCloseButtonHover] = useState(false);
  const [infoTabHover, setInfoTabHover] = useState(false);
  const [settingsTabHover, setSettingsTabHover] = useState(false);
  const [websiteLinkHover, setWebsiteLinkHover] = useState(false);
  const [changeEarningsButtonHover, setChangeEarningsButtonHover] = useState(false);
  const [logoutButtonHover, setLogoutButtonHover] = useState(false);

  const socialService = useMemo(() => SocialService.getInstance(), []);

  // プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        const { data: games } = await supabase
          .from('user_games')
          .select('*')
          .eq('creator_id', userId);

        const totalGames = games?.length || 0;
        const totalPlays = games?.reduce((sum: number, game: { play_count?: number }) => sum + (game.play_count || 0), 0) || 0;
        const totalLikes = games?.reduce((sum: number, game: { like_count?: number }) => sum + (game.like_count || 0), 0) || 0;

        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);

        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);

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

  // ログアウト処理
  const handleLogout = async () => {
    if (!confirm('ログアウトしますか?')) return;

    try {
      await supabase.auth.signOut();
      console.log('✅ ログアウト成功');
      window.location.href = '/';
    } catch (err) {
      console.error('❌ ログアウトエラー:', err);
      alert('ログアウトに失敗しました');
    }
  };

  // スタイル定義
  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: DESIGN_TOKENS.spacing[4],
      overflowY: 'auto' as const
    },
    loadingCard: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderRadius: DESIGN_TOKENS.borderRadius['3xl'],
      padding: DESIGN_TOKENS.spacing[8],
      maxWidth: '640px',
      width: '100%',
      margin: '0 ' + DESIGN_TOKENS.spacing[4]
    },
    loadingContent: {
      textAlign: 'center' as const
    },
    spinner: {
      display: 'inline-block',
      width: '48px',
      height: '48px',
      border: `4px solid ${DESIGN_TOKENS.colors.purple[500]}20`,
      borderTopColor: DESIGN_TOKENS.colors.purple[500],
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      animation: 'spin 1s linear infinite',
      marginBottom: DESIGN_TOKENS.spacing[4]
    },
    loadingText: {
      color: DESIGN_TOKENS.colors.neutral[600],
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    errorEmoji: {
      fontSize: DESIGN_TOKENS.typography.fontSize['6xl'],
      marginBottom: DESIGN_TOKENS.spacing[4],
      display: 'block'
    },
    errorTitle: {
      fontSize: DESIGN_TOKENS.typography.fontSize.xl,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      color: DESIGN_TOKENS.colors.neutral[800],
      marginBottom: DESIGN_TOKENS.spacing[2]
    },
    errorMessage: {
      color: DESIGN_TOKENS.colors.neutral[600],
      marginBottom: DESIGN_TOKENS.spacing[6],
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    errorCloseButton: {
      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[6]}`,
      backgroundColor: errorCloseButtonHover 
        ? DESIGN_TOKENS.colors.purple[600] 
        : DESIGN_TOKENS.colors.purple[500],
      color: DESIGN_TOKENS.colors.neutral[0],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
      border: 'none',
      cursor: 'pointer',
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    modal: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      borderRadius: DESIGN_TOKENS.borderRadius['3xl'],
      maxWidth: '768px',
      width: '100%',
      margin: DESIGN_TOKENS.spacing[8] + ' 0',
      boxShadow: DESIGN_TOKENS.shadows['2xl']
    },
    header: {
      position: 'relative' as const
    },
    banner: {
      width: '100%',
      height: '128px',
      objectFit: 'cover' as const,
      borderTopLeftRadius: DESIGN_TOKENS.borderRadius['3xl'],
      borderTopRightRadius: DESIGN_TOKENS.borderRadius['3xl']
    },
    bannerOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.3))',
      borderTopLeftRadius: DESIGN_TOKENS.borderRadius['3xl'],
      borderTopRightRadius: DESIGN_TOKENS.borderRadius['3xl']
    },
    closeButton: {
      position: 'absolute' as const,
      top: DESIGN_TOKENS.spacing[4],
      right: DESIGN_TOKENS.spacing[4],
      width: '40px',
      height: '40px',
      backgroundColor: closeButtonHover ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: DESIGN_TOKENS.colors.neutral[0],
      fontSize: DESIGN_TOKENS.typography.fontSize.xl,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
      border: 'none',
      cursor: 'pointer'
    },
    content: {
      padding: `0 ${DESIGN_TOKENS.spacing[6]} ${DESIGN_TOKENS.spacing[6]}`
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: DESIGN_TOKENS.spacing[4],
      marginTop: '-48px',
      marginBottom: DESIGN_TOKENS.spacing[4]
    },
    avatar: {
      width: '96px',
      height: '96px',
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      border: `4px solid ${DESIGN_TOKENS.colors.neutral[0]}`,
      boxShadow: DESIGN_TOKENS.shadows.lg
    },
    profileInfo: {
      flex: 1
    },
    displayName: {
      fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      color: DESIGN_TOKENS.colors.neutral[800]
    },
    username: {
      color: DESIGN_TOKENS.colors.neutral[600],
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    followButton: {
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[6]}`,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
      border: 'none',
      cursor: 'pointer',
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    followButtonFollowing: {
      backgroundColor: followButtonHover 
        ? DESIGN_TOKENS.colors.neutral[200] 
        : DESIGN_TOKENS.colors.neutral[100],
      color: DESIGN_TOKENS.colors.neutral[700]
    },
    followButtonNotFollowing: {
      backgroundColor: followButtonHover 
        ? DESIGN_TOKENS.colors.purple[600] 
        : DESIGN_TOKENS.colors.purple[500],
      color: DESIGN_TOKENS.colors.neutral[0]
    },
    bio: {
      color: DESIGN_TOKENS.colors.neutral[700],
      marginBottom: DESIGN_TOKENS.spacing[4],
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
    },
    infoRow: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: DESIGN_TOKENS.spacing[4],
      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
      color: DESIGN_TOKENS.colors.neutral[600],
      marginBottom: DESIGN_TOKENS.spacing[6]
    },
    websiteLink: {
      color: websiteLinkHover 
        ? DESIGN_TOKENS.colors.purple[600] 
        : DESIGN_TOKENS.colors.purple[500],
      transition: `color ${DESIGN_TOKENS.animation.duration.normal}`,
      textDecoration: 'none'
    },
    tabContainer: {
      display: 'flex',
      gap: DESIGN_TOKENS.spacing[2],
      borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
      marginBottom: DESIGN_TOKENS.spacing[6]
    },
    tab: {
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[4]}`,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal}`,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    tabActive: {
      color: DESIGN_TOKENS.colors.purple[600],
      borderBottom: `2px solid ${DESIGN_TOKENS.colors.purple[600]}`,
      marginBottom: '-1px'
    },
    tabInactive: (isHover: boolean) => ({
      color: isHover ? DESIGN_TOKENS.colors.neutral[700] : DESIGN_TOKENS.colors.neutral[500]
    }),
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: DESIGN_TOKENS.spacing[4],
      marginBottom: DESIGN_TOKENS.spacing[6]
    },
    statCard: (fromColor: string, toColor: string) => ({
      background: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
      borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
      padding: DESIGN_TOKENS.spacing[4],
      textAlign: 'center' as const
    }),
    statValue: (color: string) => ({
      fontSize: DESIGN_TOKENS.typography.fontSize['3xl'],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      color: color
    }),
    statLabel: {
      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
      color: DESIGN_TOKENS.colors.neutral[600]
    },
    settingsSection: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: DESIGN_TOKENS.spacing[6]
    },
    subscriptionCard: {
      background: `linear-gradient(135deg, ${DESIGN_TOKENS.colors.purple[50]}, ${DESIGN_TOKENS.colors.purple[100]})`,
      borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
      padding: DESIGN_TOKENS.spacing[6],
      border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`
    },
    sectionTitle: {
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      color: DESIGN_TOKENS.colors.neutral[800],
      marginBottom: DESIGN_TOKENS.spacing[4],
      display: 'flex',
      alignItems: 'center',
      gap: DESIGN_TOKENS.spacing[2],
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    titleEmoji: {
      fontSize: DESIGN_TOKENS.typography.fontSize['2xl']
    },
    settingsCard: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[50],
      borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
      padding: DESIGN_TOKENS.spacing[4]
    },
    select: {
      width: '100%',
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[4]}`,
      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      outline: 'none'
    },
    tagsContainer: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: DESIGN_TOKENS.spacing[2],
      marginBottom: DESIGN_TOKENS.spacing[3]
    },
    tag: {
      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
      backgroundColor: DESIGN_TOKENS.colors.error[200],
      color: DESIGN_TOKENS.colors.error[800],
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      fontSize: DESIGN_TOKENS.typography.fontSize.sm
    },
    noTags: {
      color: DESIGN_TOKENS.colors.neutral[500],
      fontSize: DESIGN_TOKENS.typography.fontSize.sm
    },
    input: {
      width: '100%',
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[4]}`,
      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      outline: 'none'
    },
    earningsCard: {
      background: `linear-gradient(135deg, ${DESIGN_TOKENS.colors.warning[50]}, ${DESIGN_TOKENS.colors.warning[100]})`,
      borderRadius: DESIGN_TOKENS.borderRadius['2xl'],
      padding: DESIGN_TOKENS.spacing[4],
      border: `2px solid ${DESIGN_TOKENS.colors.warning[500]}`
    },
    earningsInfo: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: DESIGN_TOKENS.spacing[3]
    },
    earningsRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    earningsLabel: {
      color: DESIGN_TOKENS.colors.neutral[700],
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    badge: (enabled: boolean) => ({
      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      backgroundColor: enabled ? DESIGN_TOKENS.colors.success[100] : DESIGN_TOKENS.colors.neutral[100],
      color: enabled ? DESIGN_TOKENS.colors.success[800] : DESIGN_TOKENS.colors.neutral[700]
    }),
    earningsValue: {
      fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      color: DESIGN_TOKENS.colors.warning[600]
    },
    changeEarningsButton: {
      width: '100%',
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[4]}`,
      background: changeEarningsButtonHover
        ? `linear-gradient(to right, ${DESIGN_TOKENS.colors.warning[600]}, ${DESIGN_TOKENS.colors.warning[800]})`
        : `linear-gradient(to right, ${DESIGN_TOKENS.colors.warning[500]}, ${DESIGN_TOKENS.colors.warning[600]})`,
      color: DESIGN_TOKENS.colors.neutral[0],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal}`,
      border: 'none',
      cursor: 'pointer',
      fontSize: DESIGN_TOKENS.typography.fontSize.base
    },
    logoutButton: {
      width: '100%',
      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
      backgroundColor: logoutButtonHover
        ? DESIGN_TOKENS.colors.error[600]
        : DESIGN_TOKENS.colors.error[500],
      color: DESIGN_TOKENS.colors.neutral[0],
      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal}`,
      border: 'none',
      cursor: 'pointer',
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      marginTop: DESIGN_TOKENS.spacing[6]
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingContent}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>プロフィール読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingContent}>
            <span style={styles.errorEmoji}>😵</span>
            <h3 style={styles.errorTitle}>エラー</h3>
            <p style={styles.errorMessage}>{error || 'プロフィールが見つかりません'}</p>
            <button
              onClick={onClose}
              onMouseEnter={() => setErrorCloseButtonHover(true)}
              onMouseLeave={() => setErrorCloseButtonHover(false)}
              style={styles.errorCloseButton}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <img
            src={profile.banner}
            alt="Banner"
            style={styles.banner}
          />
          <div style={styles.bannerOverlay}></div>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseButtonHover(true)}
            onMouseLeave={() => setCloseButtonHover(false)}
            style={styles.closeButton}
          >
            ✕
          </button>
        </div>

        {/* プロフィール内容 */}
        <div style={styles.content}>
          {/* アバターと基本情報 */}
          <div style={styles.profileHeader}>
            <img
              src={profile.avatar}
              alt={profile.displayName}
              style={styles.avatar}
            />
            <div style={styles.profileInfo}>
              <h2 style={styles.displayName}>{profile.displayName}</h2>
              <p style={styles.username}>@{profile.username}</p>
            </div>
            {!profile.isOwner && (
              <button
                onClick={handleFollow}
                onMouseEnter={() => setFollowButtonHover(true)}
                onMouseLeave={() => setFollowButtonHover(false)}
                style={{
                  ...styles.followButton,
                  ...(profile.isFollowing 
                    ? styles.followButtonFollowing 
                    : styles.followButtonNotFollowing)
                }}
              >
                {profile.isFollowing ? '✓ フォロー中' : '+ フォロー'}
              </button>
            )}
          </div>

          {/* バイオ */}
          {profile.bio && (
            <p style={styles.bio}>{profile.bio}</p>
          )}

          {/* 追加情報 */}
          <div style={styles.infoRow}>
            {profile.location && (
              <span>📍 {profile.location}</span>
            )}
            {profile.website && isValidWebsiteUrl(profile.website) && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setWebsiteLinkHover(true)}
                onMouseLeave={() => setWebsiteLinkHover(false)}
                style={styles.websiteLink}
              >
                🔗 {profile.website}
              </a>
            )}
            <span>📅 {new Date(profile.stats.joinDate).toLocaleDateString('ja-JP')}に参加</span>
          </div>

          {/* タブ */}
          <div style={styles.tabContainer}>
            <button
              onClick={() => setActiveTab('info')}
              onMouseEnter={() => setInfoTabHover(true)}
              onMouseLeave={() => setInfoTabHover(false)}
              style={{
                ...styles.tab,
                ...(activeTab === 'info' 
                  ? styles.tabActive 
                  : styles.tabInactive(infoTabHover))
              }}
            >
              📊 統計情報
            </button>
            {profile.isOwner && (
              <button
                onClick={() => setActiveTab('settings')}
                onMouseEnter={() => setSettingsTabHover(true)}
                onMouseLeave={() => setSettingsTabHover(false)}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'settings' 
                    ? styles.tabActive 
                    : styles.tabInactive(settingsTabHover))
                }}
              >
                ⚙️ 設定
              </button>
            )}
          </div>

          {/* タブコンテンツ */}
          {activeTab === 'info' && (
            <div>
              {/* 統計情報 */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard(DESIGN_TOKENS.colors.purple[50], DESIGN_TOKENS.colors.purple[100])}>
                  <div style={styles.statValue(DESIGN_TOKENS.colors.purple[600])}>
                    {profile.stats.totalGames}
                  </div>
                  <div style={styles.statLabel}>作品</div>
                </div>
                <div style={styles.statCard(DESIGN_TOKENS.colors.primary[50], DESIGN_TOKENS.colors.primary[100])}>
                  <div style={styles.statValue(DESIGN_TOKENS.colors.primary[600])}>
                    {profile.stats.totalLikes.toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>貰ったいいね</div>
                </div>
                <div style={styles.statCard(DESIGN_TOKENS.colors.success[50], DESIGN_TOKENS.colors.success[100])}>
                  <div style={styles.statValue(DESIGN_TOKENS.colors.success[600])}>
                    {profile.stats.totalPlays.toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>プレイされた数</div>
                </div>
                <div style={styles.statCard(DESIGN_TOKENS.colors.warning[50], DESIGN_TOKENS.colors.warning[100])}>
                  <div style={styles.statValue(DESIGN_TOKENS.colors.warning[600])}>
                    {profile.stats.totalPlays.toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>プレイした数</div>
                </div>
                <div style={styles.statCard('#fce7f3', '#fecdd3')}>
                  <div style={styles.statValue('#ec4899')}>
                    {profile.stats.totalFollowers.toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>フォロワー</div>
                </div>
                <div style={styles.statCard(DESIGN_TOKENS.colors.secondary[100], DESIGN_TOKENS.colors.purple[50])}>
                  <div style={styles.statValue(DESIGN_TOKENS.colors.secondary[700])}>
                    {profile.stats.totalFollowing.toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>フォロー中</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && profile.isOwner && (
            <div style={styles.settingsSection}>
              {/* Phase M: サブスクリプション管理セクション */}
              <div style={styles.subscriptionCard}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.titleEmoji}>💎</span>
                  <span>サブスクリプション管理</span>
                </h3>
                <SubscriptionManager />
              </div>

              {/* 設定言語 */}
              <div style={styles.settingsCard}>
                <h3 style={styles.sectionTitle}>🌐 設定言語</h3>
                <select
                  value={profile.preferences.language}
                  style={styles.select}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              {/* 避けたいタグ */}
              <div style={styles.settingsCard}>
                <h3 style={styles.sectionTitle}>🚫 避けたいタグ</h3>
                <div style={styles.tagsContainer}>
                  {profile.preferences.avoidTags.length > 0 ? (
                    profile.preferences.avoidTags.map((tag, index) => (
                      <span key={index} style={styles.tag}>
                        {tag} ✕
                      </span>
                    ))
                  ) : (
                    <p style={styles.noTags}>設定されていません</p>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="タグを追加..."
                  style={styles.input}
                />
              </div>

              {/* 収益関連情報 */}
              <div style={styles.earningsCard}>
                <h3 style={styles.sectionTitle}>💰 収益関連情報</h3>
                <div style={styles.earningsInfo}>
                  <div style={styles.earningsRow}>
                    <span style={styles.earningsLabel}>収益化設定</span>
                    <span style={styles.badge(profile.preferences.monetization.enabled)}>
                      {profile.preferences.monetization.enabled ? '有効' : '無効'}
                    </span>
                  </div>
                  <div style={styles.earningsRow}>
                    <span style={styles.earningsLabel}>累計収益</span>
                    <span style={styles.earningsValue}>
                      ¥{profile.preferences.monetization.earnings.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onMouseEnter={() => setChangeEarningsButtonHover(true)}
                    onMouseLeave={() => setChangeEarningsButtonHover(false)}
                    style={styles.changeEarningsButton}
                  >
                    収益設定を変更
                  </button>
                </div>
              </div>

              {/* ログアウトボタン */}
              <button
                onClick={handleLogout}
                onMouseEnter={() => setLogoutButtonHover(true)}
                onMouseLeave={() => setLogoutButtonHover(false)}
                style={styles.logoutButton}
              >
                🚪 ログアウト
              </button>
            </div>
          )}
        </div>
      </div>

      {/* スピナーアニメーション用のスタイルタグ */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProfileModal;