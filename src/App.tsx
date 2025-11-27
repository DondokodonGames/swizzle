// src/App.tsx

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './styles/arcade-theme.css';

import { useSubscription } from './hooks/monetization/useSubscription';
import { PremiumBadge } from './components/monetization/PremiumBadge';

// ゲーム関連コンポーネントの遅延読み込み（問題30・31対応）
const GameSequence = React.lazy(() => import('./components/GameSequence'));
const GameFeed = React.lazy(() => import('./components/GameFeed'));

// 認証・プロフィールページの遅延読み込み
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

// 利用規約・プライバシーポリシー・Aboutページの遅延読み込み
const TermsPage = React.lazy(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

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
          <p>Please make sure the required files are properly configured.</p>
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
        Please make sure the editor files are properly configured.
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

// 🎨 スプラッシュスクリーンコンポーネント（ロゴ画像版）
const SplashScreen: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 50%, #fef3c7 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      {/* ロゴ画像アニメーション */}
      <div style={{
        marginBottom: '48px',
        animation: 'bounce 2s ease-in-out infinite'
      }}>
        <img 
          src="/logo-splash.png" 
          alt="Swizzle - Short Game Platform"
          style={{
            maxWidth: '400px',
            width: '80vw',
            height: 'auto'
          }}
        />
      </div>

      {/* ローディングインジケーター */}
      <div style={{
        width: '200px',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '50%',
          background: 'linear-gradient(90deg, #a855f7, #ec4899)',
          borderRadius: '2px',
          animation: 'loading 1.5s ease-in-out infinite'
        }} />
      </div>

      {/* ローディングテキスト */}
      <p style={{
        color: '#9ca3af',
        fontSize: '14px',
        marginTop: '24px',
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        Loading your gaming experience...
      </p>

      {/* アニメーション定義 */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }

        @keyframes loading {
          0% {
            left: -50%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

// メインアプリケーションコンポーネント
function MainApp() {
  const navigate = useNavigate();
  
  // ✅ スプラッシュ画面の表示状態（1.5秒間表示）
  const [showSplash, setShowSplash] = useState(true);
  
  const [mode, setMode] = useState<AppMode>('sequence');
  const [editorProjectId, setEditorProjectId] = useState<string | undefined>(undefined);
  const [selectedFeedGame, setSelectedFeedGame] = useState<any>(null);
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(DEFAULT_VOLUME);

  // グローバルAuthModal用state
  const [globalAuthModalOpen, setGlobalAuthModalOpen] = useState(false);
  const [globalAuthModalMode, setGlobalAuthModalMode] = useState<'signin' | 'signup'>('signin');

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

  // ✅ スプラッシュ画面を1.5秒間表示
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

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
    console.log('🎮 フィードからゲームを選択:', game.title);
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

  // グローバルイベントリスナー
  useEffect(() => {
    const handleSwitchToEditorEvent = () => {
      handleSwitchToEditor();
    };

    window.addEventListener('switchToEditor', handleSwitchToEditorEvent);

    return () => {
      window.removeEventListener('switchToEditor', handleSwitchToEditorEvent);
    };
  }, []);

  // グローバルAuthModalイベントリスナー
  useEffect(() => {
    const handleGlobalOpenAuthModal = (event: CustomEvent) => {
      setGlobalAuthModalMode(event.detail?.mode || 'signin');
      setGlobalAuthModalOpen(true);
    };

    window.addEventListener('openAuthModal', handleGlobalOpenAuthModal as EventListener);

    return () => {
      window.removeEventListener('openAuthModal', handleGlobalOpenAuthModal as EventListener);
    };
  }, []);

  // ✅ スプラッシュ画面表示中
  if (showSplash) {
    return <SplashScreen />;
  }

  // 🔧 修正: ゲームプレイ時もフルスクリーン表示（旧トップ画面を完全にスキップ）
  if (mode === 'sequence') {
    return (
      <>
        <Suspense fallback={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '16px', fontSize: '48px' }}>🎮</div>
              <p style={{ color: '#a21caf', fontSize: '18px' }}>ゲームを読み込み中...</p>
            </div>
          </div>
        }>
          <GameSequence
            onExit={handleExitSequence}
            onOpenFeed={handleSwitchToFeed}
          />
        </Suspense>
        {/* グローバルAuthModal */}
        {AuthModal && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={globalAuthModalOpen}
              onClose={() => setGlobalAuthModalOpen(false)}
              defaultMode={globalAuthModalMode}
            />
          </Suspense>
        )}
      </>
    );
  }

  // エディターモード時のフルスクリーン表示
  if (mode === 'editor') {
    return (
      <>
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
        {/* グローバルAuthModal */}
        {AuthModal && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={globalAuthModalOpen}
              onClose={() => setGlobalAuthModalOpen(false)}
              defaultMode={globalAuthModalMode}
            />
          </Suspense>
        )}
      </>
    );
  }

  // フィードモード時のフルスクリーン表示
  if (mode === 'feed') {
    return (
      <>
        <Suspense fallback={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '16px', fontSize: '48px' }}>📱</div>
              <p style={{ color: '#a21caf', fontSize: '18px' }}>フィードを読み込み中...</p>
            </div>
          </div>
        }>
          <GameFeed
            onGameSelect={handleFeedGameSelect}
            onBack={handleExitFeed}
          />
        </Suspense>
        {/* グローバルAuthModal */}
        {AuthModal && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={globalAuthModalOpen}
              onClose={() => setGlobalAuthModalOpen(false)}
              defaultMode={globalAuthModalMode}
            />
          </Suspense>
        )}
      </>
    );
  }

  // 🔧 修正: 旧トップ画面レイアウトを完全に削除
  // testモードやその他の予期しないモードの場合のみ、シンプルなエラー画面を表示
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>予期しないモード</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          現在のモード: {mode}
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
          ゲームに戻る
        </button>
      </div>
    </div>
  );
}

// フィードページラッパー（/feed ルート用）
const FeedPageWrapper: React.FC = () => {
  const navigate = useNavigate();

  console.log('🎮 FeedPageWrapper レンダリング');

  const handleGameSelect = (game: any) => {
    console.log('🎮 ゲーム選択:', game.title);
    // ゲームを選択したらメインページに戻ってゲームをプレイ
    // 選択したゲームの情報をlocalStorageに保存
    localStorage.setItem('selectedFeedGame', JSON.stringify(game));
    navigate('/');
  };

  const handleBack = () => {
    console.log('🎮 フィードから戻る');
    navigate('/');
  };

  return (
    <GameFeed
      onGameSelect={handleGameSelect}
      onBack={handleBack}
    />
  );
};

// ソーシャル統合コンテンツ（useAuthを実際に呼び出す）
const SocialIntegratedAppContent: React.FC<{ useAuth: any }> = ({ useAuth }) => {
  // フックは常に呼ばれる（条件分岐なし）
  const auth = useAuth();

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
};

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
    // useAuthがロードされたら子コンポーネントをレンダリング
    if (useAuth) {
      return <SocialIntegratedAppContent useAuth={useAuth} />;
    }

    // ローディング表示
    return (
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
    );
  }

  return <MainApp />;
};

// ルートAppコンポーネント（React Router統合）
function App() {
  // AuthProviderを使うかどうかのラッパー
  const AppWithAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
            {children}
          </AuthProvider>
        </Suspense>
      );
    }

    return <>{children}</>;
  };

  return (
    <BrowserRouter>
      <AppWithAuth>
        <Routes>
          {/* 認証ページ: React Router */}
          <Route path="/signup" element={
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
              <SignupPage />
            </Suspense>
          } />
          <Route path="/login" element={
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="/profile/:username" element={
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
              <ProfilePage />
            </Suspense>
          } />

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

          {/* About・利用規約・プライバシーポリシー */}
          <Route path="/about" element={
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
              <AboutPage />
            </Suspense>
          } />
          <Route path="/terms" element={
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
              <TermsPage />
            </Suspense>
          } />
          <Route path="/privacy" element={
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
              <PrivacyPage />
            </Suspense>
          } />

          {/* フィードページ: 直接GameFeedを表示 */}
          <Route path="/feed" element={
            <Suspense fallback={
              <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#0a0a0f'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '16px', fontSize: '48px' }}>📱</div>
                  <p style={{ color: '#a855f7', fontSize: '18px' }}>フィードを読み込み中...</p>
                </div>
              </div>
            }>
              <FeedPageWrapper />
            </Suspense>
          } />

          {/* メインアプリ: 既存のmode-based */}
          <Route path="/*" element={<SocialIntegratedApp />} />
        </Routes>
      </AppWithAuth>
    </BrowserRouter>
  );
}

export default App;
