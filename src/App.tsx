// src/App.tsx - UI機能完成版（不要機能削除・デバッグ画面統合）
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import GameSequence from './components/GameSequence';
import TemplateTestMode from './components/TemplateTestMode';
import DebugPanel from './components/DebugPanel';
import { ViewportTestWrapper } from './components/SimpleViewportTest';

// 音量設定の型定義
interface VolumeSettings {
  bgm: number
  se: number
  muted: boolean
}

// 音量設定のデフォルト値
const DEFAULT_VOLUME: VolumeSettings = {
  bgm: 0.7,
  se: 0.8,
  muted: false
}

// 認証機能の有効/無効判定
const ENABLE_AUTH = (import.meta as any).env?.VITE_ENABLE_AUTH === 'true';

// 認証コンポーネントの遅延読み込み（既存機能保護）
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

// ✅ 認証機能（既存保護・UI統合済みのため簡素化）
const AuthenticatedUserInfo: React.FC = () => {
  const [useAuth, setUseAuth] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);

  // useAuthフックの読み込み（必ず実行）
  useEffect(() => {
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

  // useAuthが読み込まれていない場合のローディング表示
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
          {/* ユーザーアバター */}
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

          {/* ユーザー情報 */}
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

        {/* アクションボタン */}
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

      {/* エラー表示 */}
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

      {/* 認証モーダル */}
      {AuthModal && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            defaultMode={authModalMode}
          />
        </Suspense>
      )}

      {/* プロフィール設定モーダル */}
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
  const [mode, setMode] = useState<'sequence' | 'test'>('sequence'); // ✅ Week2テスト削除
  const [showDebugPanel, setShowDebugPanel] = useState(false); // ✅ デバッグ画面追加
  
  // 音量設定状態
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(DEFAULT_VOLUME)

  // 音量設定の読み込み（ローカルストレージから）
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
      
      // グローバル音量設定の更新（ゲームエンジン用）
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

  const handleSwitchToTest = () => {
    setMode('test');
  };

  const handleSwitchToSequence = () => {
    setMode('sequence');
  };

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
          🌟 Swizzle Platform
        </h1>
        <p style={{ 
          color: '#52525b',
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: '500'
        }}>
          {mode === 'sequence' ? 
            'メイドイン俺風・完全自動連続ゲーム体験' : 
            'テンプレート動作確認モード'
          }
        </p>

        {/* ✅ UI機能完成ステータス表示 */}
        <div style={{ 
          marginTop: '10px',
          padding: '6px 12px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid #22c55e',
          borderRadius: '15px',
          fontSize: '12px',
          color: '#15803d',
          display: 'inline-block'
        }}>
          🎉 UI機能完成版: 統合デバッグ画面・残り時間バー・オーバーレイUI統合完了
        </div>

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
              fontWeight: 'bold'
            }}
          >
            🎮 通常プレイ
          </button>
          <button
            onClick={handleSwitchToTest}
            style={{
              backgroundColor: mode === 'test' ? '#f59e0b' : 'white',
              color: mode === 'test' ? 'white' : '#f59e0b',
              border: '2px solid #f59e0b',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🧪 テストモード
          </button>
          {/* ✅ 統合デバッグ画面ボタン */}
          <button
            onClick={() => setShowDebugPanel(true)}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: '2px solid #8b5cf6',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔧 デバッグ画面
          </button>
        </div>
      </header>

      {/* ユーザー情報（認証機能有効時のみ表示） */}
      {ENABLE_AUTH && <AuthenticatedUserInfo />}

      {/* ✅ 音量設定UI削除（ゲーム内統合済み） */}
      {/* VolumeControlUI は削除 - ゲーム内オーバーレイに統合完了 */}

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
            // ✅ volumeSettings、onVolumeChangeプロパティを削除（GameSequenceが対応していない）
          />
        )}
        {mode === 'test' && <TemplateTestMode onExit={handleSwitchToSequence} />}
      </main>

      {/* フッター */}
      <footer style={{ 
        marginTop: '20px',
        color: '#6b7280',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        <div>
          Phase {ENABLE_AUTH ? '4' : '4'}: {
            mode === 'sequence' ? '完全自動連続プレイ' : 'テンプレート動作確認'
          } | 
          🎯 UI機能完成版 ✨
        </div>
        {ENABLE_AUTH && (
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#10b981' }}>
            🔐 認証システム統合完了 | ユーザー管理・プロフィール機能対応
          </div>
        )}
        <div style={{ fontSize: '12px', marginTop: '5px', color: '#3b82f6' }}>
          📱 ビューポート統合・アセット仕様策定 | 9:16アスペクト比対応
        </div>
        <div style={{ fontSize: '12px', marginTop: '5px', color: '#22c55e' }}>
          🔊 音量設定・ゲーム内UI統合完了 | 残り時間バー・オーバーレイ統合
        </div>
        <div style={{ fontSize: '12px', marginTop: '5px', color: '#8b5cf6' }}>
          🔧 統合デバッグ画面完成 | Viewport・環境変数・FPS・Memory・ゲーム状態統合
        </div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          💡 {
            mode === 'sequence' ? 
            '完成: 上部バー・タイトル・残り時間バー・ログイン/音量オーバーレイ' : 
            'ChatGPT制作テンプレートの動作確認・デバッグ用'
          }
        </div>
        <div style={{ fontSize: '11px', marginTop: '8px', color: '#9ca3af' }}>
          🚀 進捗: 基盤完成 → テンプレート量産中 → 認証統合 → 画面統一 → 音量統合 → 🎉 UI機能完成
        </div>
      </footer>

      {/* ✅ 統合デバッグ画面（EnvTest・ViewportTest統合） */}
      <DebugPanel 
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
      
      {/* ✅ 従来の個別デバッグ表示は削除（統合デバッグ画面に移行） */}
      {/* EnvTest・ViewportTest個別表示は非表示 */}
    </div>
  );
}

// ルートAppコンポーネント（ViewportTestWrapper統合）
function App() {
  // ViewportTestWrapperで全体をラップしてPhase 4機能を統合
  const AppContent = () => {
    // 認証機能が有効な場合はAuthProviderでラップ
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
            <MainApp />
          </AuthProvider>
        </Suspense>
      );
    }

    // 認証機能が無効な場合は既存機能のみ
    return <MainApp />;
  };

  // ViewportTestWrapperで全体をラップしてビューポート機能を統合（背景で動作）
  return (
    <ViewportTestWrapper>
      <AppContent />
    </ViewportTestWrapper>
  );
}

// 開発モードでの設定表示（UI機能完成版）
if ((import.meta as any).env?.DEV) {
  console.log('🎉 App Configuration (UI機能完成版):', {
    AUTH_ENABLED: ENABLE_AUTH,
    VIEWPORT_INTEGRATION: true,
    VOLUME_CONTROL_INTEGRATION: true,
    DEBUG_PANEL_INTEGRATION: true, // 新機能
    GAME_UI_INTEGRATION: true, // 新機能
    NODE_ENV: (import.meta as any).env?.NODE_ENV,
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  });
}

export default App;