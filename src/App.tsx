// src/App.tsx - React Router ハイブリッド構造版（Phase M 統合完了 + Premium Badge）

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import GameSequence from './components/GameSequence';
import GameFeed from './components/GameFeed';
import './styles/arcade-theme.css';

// Phase M: マネタイズ統合インポート
import { useSubscription } from './hooks/monetization/useSubscription';
import { PremiumBadge } from './components/monetization/PremiumBadge';

// マネタイズページの遅延読み込み
const Pricing = React.lazy(() => 
  import('./pages/subscription/Pricing').then(module => ({
    default: module.Pricing
  })).catch(error => {
    console.warn('Pricing読み込み失敗:', error);
    return {
      default: () => (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>料金プランページを読み込めませんでした</h2>
          <p>Phase M のファイルが正しく配置されていることを確認してください。</p>
        </div>
      )
    };
  })
);

const SubscriptionSuccess = React.lazy(() => 
  import('./pages/subscription/SubscriptionSuccess').then(module => ({
    default: module.SubscriptionSuccess
  })).catch(error => {
    console.warn('SubscriptionSuccess読み込み失敗:', error);
    return {
      default: () => (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>決済完了ページを読み込めませんでした</h2>
        </div>
      )
    };
  })
);

const SubscriptionCancel = React.lazy(() => 
  import('./pages/subscription/SubscriptionCancel').then(module => ({
    default: module.SubscriptionCancel
  })).catch(error => {
    console.warn('SubscriptionCancel読み込み失敗:', error);
    return {
      default: () => (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>決済キャンセルページを読み込めませんでした</h2>
        </div>
      )
    };
  })
);

// エディターアプリのプロパティ型を定義
interface EditorAppProps {
  onClose?: () => void;
  initialProjectId?: string;
  className?: string;
}

// フォールバックコンポーネントを別途定義
const EditorFallback: React.FC<EditorAppProps> = ({ onClose }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '20px',
      textAlign: 'center',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
      <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>エディター機能を読み込めませんでした</h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        エディター機能の実装が必要です。<br />
        Phase 6.2のファイルが正しく配置されていることを確認してください。
      </p>
      <button
        onClick={onClose || (() => {})}
        style={{
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ゲームに戻る
      </button>
    </div>
  </div>
);

// エディター機能の遅延読み込み
const EditorApp = React.lazy((): Promise<{ default: React.FC<EditorAppProps> }> => 
  import('./components/editor/EditorApp').then(module => ({ 
    default: module.EditorApp
  })).catch(error => {
    console.warn('EditorApp読み込み失敗:', error);
    return { 
      default: EditorFallback
    };
  })
);

// ソーシャル統合コンポーネントの遅延読み込み
const SocialIntegrationProvider = React.lazy(() => 
  import('./social/components/SocialIntegration').then(module => ({
    default: module.SocialIntegrationProvider
  })).catch(error => {
    console.warn('SocialIntegration読み込み失敗:', error);
    return {
      default: ({ children }: { children: React.ReactNode }) => <>{children}</>
    };
  })
);

// 音量設定の型定義
interface VolumeSettings {
  bgm: number
  se: number
  muted: boolean
}

const DEFAULT_VOLUME: VolumeSettings = {
  bgm: 0.7,
  se: 0.8,
  muted: false
}

// 🔧 修正: AppMode型定義（'editor' と 'feed' を確実に含める）
type AppMode = 'sequence' | 'test' | 'system' | 'editor' | 'feed';

// 認証機能の有効/無効判定
const ENABLE_AUTH = (import.meta as any).env?.VITE_ENABLE_AUTH === 'true';
const ENABLE_SOCIAL = ENABLE_AUTH && (import.meta as any).env?.VITE_ENABLE_SOCIAL !== 'false';

// 認証コンポーネントの遅延読み込み
const AuthProvider = ENABLE_AUTH ? React.lazy(async () => {
  try {
    const module = await import('./hooks/useAuth');
    return { default: module.AuthProvider };
  } catch (error) {
    console.warn('AuthProvider読み込み失敗:', error);
    return { default: ({ children }: { children: React.ReactNode }) => <>{children}</> };
  }
}) : null;

const AuthModal = ENABLE_AUTH ? React.lazy(async () => {
  try {
    return await import('./components/auth/AuthModal');
  } catch (error) {
    console.warn('AuthModal読み込み失敗:', error);
    return { default: () => null };
  }
}) : null;

const ProfileSetup = ENABLE_AUTH ? React.lazy(async () => {
  try {
    return await import('./components/auth/ProfileSetup');
  } catch (error) {
    console.warn('ProfileSetup読み込み失敗:', error);
    return { default: () => null };
  }
}) : null;

// 認証機能（Premium Badge統合版）
const AuthenticatedUserInfo: React.FC = () => {
  const [useAuth, setUseAuth] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);

  // Phase M: サブスクリプション状態取得
  const { subscription, isPremium } = useSubscription();

  // useAuthフックの読み込み
  useEffect(() => {
    if (ENABLE_AUTH) {
      import('./hooks/useAuth').then(module => {
        setUseAuth(() => module.useAuth);
      }).catch(error => {
        console.warn('useAuth読み込み失敗:', error);
        setUseAuth(() => () => ({
          isAuthenticated: false,
          user: null,
          profile: null,
          loading: false,
          error: null,
          signOut: () => {},
          clearError: () => {}
        }));
      });
    }
  }, []);

  // グローバルイベントリスナー
  useEffect(() => {
    const handleOpenAuthModal = (event: CustomEvent) => {
      setAuthModalMode(event.detail?.mode || 'signin');
      setAuthModalOpen(true);
    };

    const handleOpenProfileSetup = () => {
      setProfileSetupOpen(true);
    };

    window.addEventListener('openAuthModal', handleOpenAuthModal as EventListener);
    window.addEventListener('openProfileSetup', handleOpenProfileSetup as EventListener);

    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal as EventListener);
      window.removeEventListener('openProfileSetup', handleOpenProfileSetup as EventListener);
    };
  }, []);

  if (!useAuth) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: '15px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>認証システム読み込み中...</div>
      </div>
    );
  }

  const auth = useAuth();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '15px',
      padding: '15px',
      marginBottom: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #d946ef, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            {auth.profile?.display_name?.charAt(0).toUpperCase() || 
             auth.profile?.username?.charAt(0).toUpperCase() || 
             auth.user?.email?.charAt(0).toUpperCase() || '?'}
          </div>

          <div>
            {auth.profile ? (
              <>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {auth.profile.display_name || auth.profile.username}
                  {/* Phase M: Premium Badge 統合 */}
                  {isPremium && (
                    <PremiumBadge 
                      size="small" 
                      showLabel={false}
                    />
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  @{auth.profile.username}
                </div>
              </>
            ) : auth.user ? (
              <>
                <div style={{ fontWeight: '600', color: '#111827' }}>
                  {auth.user.email}
                </div>
                <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                  プロフィール設定が必要
                </div>
              </>
            ) : (
              <div style={{ fontWeight: '600', color: '#6b7280' }}>ゲスト</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {auth.isAuthenticated ? (
            <>
              {auth.profile ? (
                <button
                  onClick={() => setProfileSetupOpen(true)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: '#3b82f6',
                    backgroundColor: '#eff6ff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  編集
                </button>
              ) : (
                <button
                  onClick={() => setProfileSetupOpen(true)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'white',
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  設定
                </button>
              )}
              <button
                onClick={auth.signOut}
                disabled={auth.loading}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#ef4444',
                  backgroundColor: '#fef2f2',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: auth.loading ? 0.5 : 1
                }}
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setAuthModalOpen(true);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#3b82f6',
                  backgroundColor: '#eff6ff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ログイン
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setAuthModalOpen(true);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: 'white',
                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                新規登録
              </button>
            </>
          )}
        </div>
      </div>

      {auth.error && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{auth.error}</span>
          <button
            onClick={auth.clearError}
            style={{
              color: '#dc2626',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {AuthModal && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            defaultMode={authModalMode}
          />
        </Suspense>
      )}

      {ProfileSetup && (
        <Suspense fallback={null}>
          <ProfileSetup
            isOpen={profileSetupOpen}
            onClose={() => setProfileSetupOpen(false)}
            mode={auth.profile ? 'edit' : 'setup'}
          />
        </Suspense>
      )}
    </div>
  );
};

// メインアプリケーションコンポーネント
function MainApp() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AppMode>('sequence');
  const [editorProjectId, setEditorProjectId] = useState<string | undefined>(undefined);
  const [selectedFeedGame, setSelectedFeedGame] = useState<any>(null);
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(DEFAULT_VOLUME);

  // コピー完了時のエディター自動起動チェック
  useEffect(() => {
    const shouldOpenEditor = localStorage.getItem('shouldOpenEditor');
    const editProjectId = localStorage.getItem('editProjectId');
    const copiedGameTitle = localStorage.getItem('copiedGameTitle');
    
    if (shouldOpenEditor === 'true' && editProjectId) {
      localStorage.removeItem('shouldOpenEditor');
      setEditorProjectId(editProjectId);
      setMode('editor');
      
      console.log('✅ コピーされたプロジェクトをエディターで開きます:', editProjectId);
      if (copiedGameTitle) {
        console.log('📋 元のゲーム名:', copiedGameTitle);
      }
    }
  }, []);

  // 音量設定の読み込み
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem('gameVolumeSettings')
      if (savedVolume) {
        const parsed = JSON.parse(savedVolume)
        setVolumeSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.warn('音量設定の読み込みに失敗:', error)
    }
  }, [])

  const saveVolumeSettings = useCallback((newSettings: VolumeSettings) => {
    try {
      localStorage.setItem('gameVolumeSettings', JSON.stringify(newSettings))
      setVolumeSettings(newSettings)
      
      if (typeof window !== 'undefined') {
        (window as any).gameVolumeSettings = newSettings
      }
    } catch (error) {
      console.warn('音量設定の保存に失敗:', error)
    }
  }, [])

  const handleExitSequence = () => {
    window.location.reload();
  };

  const handleSwitchToSequence = () => {
    setMode('sequence');
  };

  const handleSwitchToFeed = () => {
    setMode('feed');
  };

  const handleSwitchToEditor = () => {
    setMode('editor');
    setEditorProjectId(undefined);
  };

  const handleExitEditor = () => {
    setMode('sequence');
    setEditorProjectId(undefined);
  };

  const handleFeedGameSelect = (game: any) => {
    setSelectedFeedGame(game);
    setMode('sequence');
  };

  const handleExitFeed = () => {
    setMode('sequence');
  };

  // 料金プランページへ遷移
  const handleGoToPricing = () => {
    navigate('/pricing');
  };

  // エディターモード時のフルスクリーン表示
  if (mode === 'editor') {
    return (
      <Suspense fallback={
        <div style={{ 
          minHeight: '100vh',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', fontSize: '48px', animation: 'pulse 2s infinite' }}>🎨</div>
            <div style={{ color: '#6b7280', fontSize: '18px', fontWeight: '600' }}>
              エディターを読み込み中...
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
              }
            `}</style>
          </div>
        </div>
      }>
        <EditorApp 
          onClose={handleExitEditor} 
          initialProjectId={editorProjectId}
        />
      </Suspense>
    );
  }

  // フィードモード時のフルスクリーン表示
  if (mode === 'feed') {
    return (
      <GameFeed
        onGameSelect={handleFeedGameSelect}
        onBack={handleExitFeed}
      />
    );
  }

  return (
    <div className="App" style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{
          color: '#a21caf',
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>
          🌟 Swizzle
        </h1>
        <p style={{
          color: '#52525b',
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: '500'
        }}>
          メイドイン俺風・ショートゲームプラットフォーム
        </p>

        <div style={{ marginTop: '15px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleSwitchToSequence}
            style={{
              backgroundColor: mode === 'sequence' ? '#10b981' : 'white',
              color: mode === 'sequence' ? 'white' : '#10b981',
              border: '2px solid #10b981',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            🎮 ゲームをプレイ
          </button>

          <button
            onClick={handleSwitchToEditor}
            style={{
              backgroundColor: (mode as string) === 'editor' ? '#ec4899' : 'white',
              color: (mode as string) === 'editor' ? 'white' : '#ec4899',
              border: '2px solid #ec4899',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            🎨 ゲームを作る
          </button>

          <button
            onClick={handleGoToPricing}
            style={{
              backgroundColor: 'white',
              color: '#8b5cf6',
              border: '2px solid #8b5cf6',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            💎 プレミアム
          </button>
        </div>
      </header>

      {ENABLE_AUTH && <AuthenticatedUserInfo />}

      <main style={{ 
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '450px',
        width: '100%',
        position: 'relative'
      }}>
        {mode === 'sequence' && (
          <GameSequence
            onExit={handleExitSequence}
            onOpenFeed={handleSwitchToFeed}
          />
        )}
        {mode === 'test' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
            <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>テストモード未実装</h2>
            <button
              onClick={handleSwitchToSequence}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              通常プレイに戻る
            </button>
          </div>
        )}
      </main>

      <footer style={{
        marginTop: '20px',
        color: '#9ca3af',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        © 2024 Swizzle - Phase M: マネタイズ機能統合完了 💰
      </footer>
    </div>
  );
}

// ソーシャル統合ラッパー
const SocialIntegratedApp: React.FC = () => {
  const [useAuth, setUseAuth] = useState<any>(null);

  useEffect(() => {
    if (ENABLE_AUTH) {
      import('./hooks/useAuth').then(module => {
        setUseAuth(() => module.useAuth);
      }).catch(error => {
        console.warn('useAuth読み込み失敗:', error);
      });
    }
  }, []);

  if (ENABLE_SOCIAL) {
    const auth = useAuth ? useAuth() : null;
    
    return (
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', fontSize: '24px' }}>🌟</div>
            <div style={{ color: '#6b7280' }}>ソーシャル機能読み込み中...</div>
          </div>
        </div>
      }>
        <SocialIntegrationProvider
          enableSocial={ENABLE_SOCIAL}
          currentUser={auth?.user || null}
        >
          <MainApp />
        </SocialIntegrationProvider>
      </Suspense>
    );
  }

  return <MainApp />;
};

// ルートAppコンポーネント（React Router統合）
function App() {
  const AppContent = () => {
    if (ENABLE_AUTH && AuthProvider) {
      return (
        <Suspense fallback={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '16px', fontSize: '24px' }}>🌟</div>
              <div style={{ color: '#6b7280' }}>認証システム読み込み中...</div>
            </div>
          </div>
        }>
          <AuthProvider>
            <SocialIntegratedApp />
          </AuthProvider>
        </Suspense>
      );
    }

    return <SocialIntegratedApp />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* マネタイズページ: React Router */}
        <Route path="/pricing" element={
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
            <Pricing />
          </Suspense>
        } />
        <Route path="/subscription/success" element={
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
            <SubscriptionSuccess />
          </Suspense>
        } />
        <Route path="/subscription/cancel" element={
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
            <SubscriptionCancel />
          </Suspense>
        } />
        
        {/* メインアプリ: 既存のmode-based */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;