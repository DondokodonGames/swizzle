// src/App.tsx - AppMode型修正最終版（エラー2件完全修正）+ エディター自動起動機能追加

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import GameSequence from './components/GameSequence';
import './styles/arcade-theme.css';

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

// 🔧 最終修正: AppMode型定義（'editor'を確実に含める）
type AppMode = 'sequence' | 'test' | 'system' | 'editor';

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


// 認証機能（修正版）
const AuthenticatedUserInfo: React.FC = () => {
  const [useAuth, setUseAuth] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);

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
                <div style={{ fontWeight: '600', color: '#111827' }}>
                  {auth.profile.display_name || auth.profile.username}
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
  const [mode, setMode] = useState<AppMode>('sequence');

  // エディターで開くプロジェクトIDを管理
  const [editorProjectId, setEditorProjectId] = useState<string | undefined>(undefined);

  // 音量設定状態
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(DEFAULT_VOLUME);

  // 🆕 コピー完了時のエディター自動起動チェック
  useEffect(() => {
    const shouldOpenEditor = localStorage.getItem('shouldOpenEditor');
    const editProjectId = localStorage.getItem('editProjectId');
    const copiedGameTitle = localStorage.getItem('copiedGameTitle');
    
    if (shouldOpenEditor === 'true' && editProjectId) {
      // フラグをクリア
      localStorage.removeItem('shouldOpenEditor');
      
      // エディターモードに切り替え
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

  // 音量設定の保存
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

  const handleSwitchToEditor = () => {
    setMode('editor');
    setEditorProjectId(undefined); // 新規プロジェクト
  };

  const handleExitEditor = () => {
    setMode('sequence');
    setEditorProjectId(undefined);
    console.log('エディターから戻りました');
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
            <div style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
              Phase 6.2 ゲームエディター機能
            </div>
            {editorProjectId && (
              <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px' }}>
                📋 プロジェクトID: {editorProjectId}
              </div>
            )}
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
      {/* ヘッダー */}
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

        {/* モード切り替えボタン */}
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
        </div>
      </header>

      {/* ユーザー情報 */}
      {ENABLE_AUTH && <AuthenticatedUserInfo />}

      {/* メインコンテンツ */}
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
          />
        )}
        {mode === 'test' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
            <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>テストモード未実装</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              TemplateTestModeコンポーネントが見つかりません。
            </p>
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

      {/* フッター */}
      <footer style={{
        marginTop: '20px',
        color: '#9ca3af',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        © 2024 Swizzle - ショートゲームプラットフォーム
      </footer>
    </div>
  );
}

// ソーシャル統合ラッパー
const SocialIntegratedApp: React.FC = () => {
  const [useAuth, setUseAuth] = useState<any>(null);

  // useAuthフック取得
  useEffect(() => {
    if (ENABLE_AUTH) {
      import('./hooks/useAuth').then(module => {
        setUseAuth(() => module.useAuth);
      }).catch(error => {
        console.warn('useAuth読み込み失敗:', error);
      });
    }
  }, []);

  // ソーシャル機能が有効な場合のみプロバイダーでラップ
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

// ルートAppコンポーネント
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

  return <AppContent />;
}

export default App;