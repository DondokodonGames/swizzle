// src/social/components/SocialIntegration.tsx
// Phase I Week 3-3: ソーシャル機能統合・既存システム連携

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode 
} from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { SocialService } from '../services/SocialService';
import { PublicGame, UserProfile, SocialStats } from '../types/SocialTypes';
import { auth, database } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

// =============================================================================
// 型定義
// =============================================================================

interface SocialIntegrationState {
  // 認証・ユーザー状態
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  
  // ソーシャル機能制御
  socialEnabled: boolean;
  notificationsEnabled: boolean;
  
  // データ状態
  publicGames: PublicGame[];
  userGames: any[];
  loading: boolean;
  error: string | null;
}

interface SocialIntegrationActions {
  // 認証管理
  initializeAuth: () => Promise<void>;
  syncAuthState: (user: User | null) => Promise<void>;
  
  // 設定管理
  toggleSocialFeatures: (enabled: boolean) => void;
  toggleNotifications: (enabled: boolean) => void;
  
  // プロジェクト連携
  publishProjectToSocial: (project: GameProject) => Promise<string | null>;
  updateProjectSocialStats: (projectId: string, stats: Partial<SocialStats>) => Promise<void>;
  deleteProjectFromSocial: (projectId: string) => Promise<void>;
  
  // データ管理
  refreshSocialData: () => Promise<void>;
  clearError: () => void;
}

type SocialIntegrationContextType = SocialIntegrationState & SocialIntegrationActions;

// =============================================================================
// Context作成
// =============================================================================

const SocialIntegrationContext = createContext<SocialIntegrationContextType | null>(null);

export const useSocialIntegration = (): SocialIntegrationContextType => {
  const context = useContext(SocialIntegrationContext);
  if (!context) {
    throw new Error('useSocialIntegration must be used within a SocialIntegrationProvider');
  }
  return context;
};

// =============================================================================
// Provider実装
// =============================================================================

interface SocialIntegrationProviderProps {
  children: ReactNode;
  // App.tsx から渡される設定
  enableSocial?: boolean;
  currentUser?: any; // App.tsx の認証ユーザー
}

export const SocialIntegrationProvider: React.FC<SocialIntegrationProviderProps> = ({
  children,
  enableSocial = true,
  currentUser
}) => {
  // ---------------------------------------------------------------------------
  // 状態管理
  // ---------------------------------------------------------------------------
  
  const [state, setState] = useState<SocialIntegrationState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    socialEnabled: enableSocial,
    notificationsEnabled: true,
    publicGames: [],
    userGames: [],
    loading: false,
    error: null
  });

  const socialService = SocialService.getInstance();

  // ---------------------------------------------------------------------------
  // 認証管理
  // ---------------------------------------------------------------------------

  const initializeAuth = useCallback(async () => {
    if (!state.socialEnabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Supabase認証状態取得
      const user = await auth.getCurrentUser();
      
      if (user) {
        // プロフィール取得・作成
        let profile: UserProfile | null = null;
        try {
          const profileData = await database.profiles.get(user.id);
          
          // プロフィールをUserProfile型に変換
          profile = {
            id: profileData.id,
            username: profileData.username || '',
            displayName: profileData.display_name || profileData.username || '',
            avatar: profileData.avatar_url || '',
            banner: profileData.banner_url || '',
            bio: profileData.bio || '',
            location: profileData.location || '',
            website: profileData.website || '',
            stats: {
              totalGames: 0,
              totalPlays: 0,
              totalLikes: 0,
              totalFollowers: 0,
              totalFollowing: 0,
              joinDate: profileData.created_at || new Date().toISOString(),
              lastActive: new Date().toISOString()
            },
            isOwner: true
          };
        } catch (profileError) {
          console.warn('Profile not found, will create on first update:', profileError);
        }

        setState(prev => ({
          ...prev,
          user,
          profile,
          isAuthenticated: true,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isAuthenticated: false,
          loading: false
        }));
      }
    } catch (error: any) {
      console.error('Auth initialization failed:', error);
      setState(prev => ({
        ...prev,
        error: '認証の初期化に失敗しました',
        loading: false
      }));
    }
  }, [state.socialEnabled]);

  const syncAuthState = useCallback(async (user: User | null) => {
    if (!state.socialEnabled) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      if (user) {
        // 既存の認証ユーザーとSupabaseユーザーを同期
        const profile = await socialService.getUserProfile(user.id);
        
        setState(prev => ({
          ...prev,
          user,
          profile,
          isAuthenticated: true,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isAuthenticated: false,
          loading: false
        }));
      }
    } catch (error: any) {
      console.error('Auth sync failed:', error);
      setState(prev => ({
        ...prev,
        error: '認証同期に失敗しました',
        loading: false
      }));
    }
  }, [socialService, state.socialEnabled]);

  // ---------------------------------------------------------------------------
  // 設定管理
  // ---------------------------------------------------------------------------

  const toggleSocialFeatures = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, socialEnabled: enabled }));
    
    // ローカルストレージに保存
    try {
      localStorage.setItem('socialFeaturesEnabled', JSON.stringify(enabled));
    } catch (error) {
      console.warn('Failed to save social features setting:', error);
    }
  }, []);

  const toggleNotifications = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, notificationsEnabled: enabled }));
    
    try {
      localStorage.setItem('socialNotificationsEnabled', JSON.stringify(enabled));
    } catch (error) {
      console.warn('Failed to save notifications setting:', error);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // プロジェクト連携
  // ---------------------------------------------------------------------------

  const publishProjectToSocial = useCallback(async (project: GameProject): Promise<string | null> => {
    if (!state.socialEnabled || !state.user) {
      throw new Error('ソーシャル機能が無効または未認証です');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // GameProject → PublicGame 変換
      const gameData = {
        id: project.id,
        title: project.settings.name || project.name,
        description: project.description || 'ユーザー作成ゲーム',
        thumbnail: project.settings.preview?.thumbnailDataUrl || '',
        creator_id: state.user.id,
        template_id: 'custom', // エディターで作成されたゲーム
        game_data: JSON.stringify(project), // プロジェクト全体をJSONで保存
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Supabaseに保存
      const savedGame = await database.userGames.save(gameData);

      setState(prev => ({ ...prev, loading: false }));
      
      return savedGame.id;
    } catch (error: any) {
      console.error('Failed to publish project to social:', error);
      setState(prev => ({
        ...prev,
        error: 'ゲームの公開に失敗しました',
        loading: false
      }));
      throw error;
    }
  }, [state.socialEnabled, state.user]);

  const updateProjectSocialStats = useCallback(async (
    projectId: string, 
    stats: Partial<SocialStats>
  ) => {
    if (!state.socialEnabled || !state.user) return;

    try {
      await database.userGames.update(projectId, {
        social_stats: stats,
        updated_at: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Failed to update project social stats:', error);
    }
  }, [state.socialEnabled, state.user]);

  const deleteProjectFromSocial = useCallback(async (projectId: string) => {
    if (!state.socialEnabled || !state.user) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      await database.userGames.delete(projectId);
      setState(prev => ({ ...prev, loading: false }));
    } catch (error: any) {
      console.error('Failed to delete project from social:', error);
      setState(prev => ({
        ...prev,
        error: 'ゲームの削除に失敗しました',
        loading: false
      }));
    }
  }, [state.socialEnabled, state.user]);

  // ---------------------------------------------------------------------------
  // データ管理
  // ---------------------------------------------------------------------------

  const refreshSocialData = useCallback(async () => {
    if (!state.socialEnabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 公開ゲーム取得
      const { games } = await socialService.getPublicGames({}, 1, 20);
      
      // ユーザーのゲーム取得（認証済みの場合）
      let userGames: any[] = [];
      if (state.user) {
        userGames = await database.userGames.getUserGames(state.user.id);
      }

      setState(prev => ({
        ...prev,
        publicGames: games,
        userGames,
        loading: false
      }));
    } catch (error: any) {
      console.error('Failed to refresh social data:', error);
      setState(prev => ({
        ...prev,
        error: 'データの更新に失敗しました',
        loading: false
      }));
    }
  }, [socialService, state.socialEnabled, state.user]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ---------------------------------------------------------------------------
  // 初期化・設定読み込み
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // ローカルストレージから設定読み込み
    try {
      const savedSocialEnabled = localStorage.getItem('socialFeaturesEnabled');
      const savedNotificationsEnabled = localStorage.getItem('socialNotificationsEnabled');
      
      setState(prev => ({
        ...prev,
        socialEnabled: savedSocialEnabled ? JSON.parse(savedSocialEnabled) : enableSocial,
        notificationsEnabled: savedNotificationsEnabled ? JSON.parse(savedNotificationsEnabled) : true
      }));
    } catch (error) {
      console.warn('Failed to load social settings:', error);
    }
  }, [enableSocial]);

  // 認証初期化
  useEffect(() => {
    if (state.socialEnabled) {
      initializeAuth();
    }
  }, [state.socialEnabled, initializeAuth]);

  // App.tsx からの認証ユーザー同期
  useEffect(() => {
    if (currentUser && state.socialEnabled) {
      syncAuthState(currentUser);
    }
  }, [currentUser, syncAuthState, state.socialEnabled]);

  // Supabase認証状態変更監視
  useEffect(() => {
    if (!state.socialEnabled) return;

    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth state changed:', event, session?.user?.id);

      // TOKEN_REFRESHED はトークン更新のみなので、DBクエリをスキップ
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user,
            // profile は既存のものを維持（DB呼び出し不要）
          }));
        }
        return;
      }

      if (session?.user) {
        // 🚀 awaitを削除して非同期実行（auth.signIn()をブロックしない）
        syncAuthState(session.user);
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isAuthenticated: false
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncAuthState, state.socialEnabled]);

  // ---------------------------------------------------------------------------
  // Context値作成
  // ---------------------------------------------------------------------------

  const contextValue: SocialIntegrationContextType = {
    // 状態
    ...state,
    
    // アクション
    initializeAuth,
    syncAuthState,
    toggleSocialFeatures,
    toggleNotifications,
    publishProjectToSocial,
    updateProjectSocialStats,
    deleteProjectFromSocial,
    refreshSocialData,
    clearError
  };

  return (
    <SocialIntegrationContext.Provider value={contextValue}>
      {children}
    </SocialIntegrationContext.Provider>
  );
};

// =============================================================================
// HOC・ユーティリティ
// =============================================================================

/**
 * ソーシャル機能が有効な場合のみコンポーネントを表示するHOC
 */
export const withSocialIntegration = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { socialEnabled } = useSocialIntegration();
    
    if (!socialEnabled) {
      return null;
    }
    
    return <Component {...props} />;
  };
};

/**
 * ソーシャル機能の簡易設定パネル
 */
export const SocialIntegrationSettings: React.FC = () => {
  const {
    socialEnabled,
    notificationsEnabled,
    isAuthenticated,
    user,
    toggleSocialFeatures,
    toggleNotifications,
    error,
    clearError
  } = useSocialIntegration();

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
        ソーシャル機能設定
      </h3>
      
      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {error}
          <button
            onClick={clearError}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={socialEnabled}
            onChange={(e) => toggleSocialFeatures(e.target.checked)}
          />
          <span>ソーシャル機能を有効にする</span>
        </label>
        
        {socialEnabled && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => toggleNotifications(e.target.checked)}
              />
              <span>通知を有効にする</span>
            </label>
            
            <div style={{
              padding: '12px',
              backgroundColor: isAuthenticated ? '#d1f2d1' : '#fff3cd',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                認証状態: {isAuthenticated ? '認証済み' : '未認証'}
              </div>
              {user && (
                <div>
                  ユーザーID: {user.id}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SocialIntegrationProvider;