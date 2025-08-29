// src/App.tsx - 既存コードに認証機能を統合

import React, { useState, useEffect } from 'react';
import GameSequence from './components/GameSequence';
import TemplateTestMode from './components/TemplateTestMode';
// EnvTestコンポーネントが存在する場合
import EnvTest from './components/EnvTest';

// 認証機能のインポート（条件付き）
// 認証機能を無効にする場合は VITE_ENABLE_AUTH=false に設定
const ENABLE_AUTH = (import.meta as any).env?.VITE_ENABLE_AUTH === 'true';

// 動的インポート用のコンポーネント
let AuthProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let useAuth: (() => any) | null = null;
let AuthModal: React.ComponentType<any> | null = null;
let ProfileSetup: React.ComponentType<any> | null = null;

// 認証機能が有効な場合のみインポート
if (ENABLE_AUTH) {
  try {
    const authModule = require('./hooks/useAuth');
    const authModalModule = require('./components/auth/AuthModal');
    const profileSetupModule = require('./components/auth/ProfileSetup');
    
    AuthProvider = authModule.AuthProvider;
    useAuth = authModule.useAuth;
    AuthModal = authModalModule.default;
    ProfileSetup = profileSetupModule.default;
  } catch (error) {
    console.warn('認証機能の読み込みに失敗しました:', error);
  }
}

// ユーザー情報表示コンポーネント（認証機能有効時のみ）
const UserInfo: React.FC = () => {
  if (!ENABLE_AUTH || !useAuth || !AuthModal || !ProfileSetup) return null;

  const auth = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);

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
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authModalMode}
        />
      )}

      {/* プロフィール設定モーダル */}
      {ProfileSetup && (
        <ProfileSetup
          isOpen={profileSetupOpen}
          onClose={() => setProfileSetupOpen(false)}
          mode={auth.profile ? 'edit' : 'setup'}
        />
      )}
    </div>
  );
};

// メインアプリケーションコンポーネント
function MainApp() {
  const [mode, setMode] = useState<'sequence' | 'test'>('sequence');

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

        {/* モード切り替えボタン */}
        <div style={{ marginTop: '15px' }}>
          <button
            onClick={mode === 'sequence' ? handleSwitchToTest : handleSwitchToSequence}
            style={{
              backgroundColor: mode === 'sequence' ? '#f59e0b' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {mode === 'sequence' ? '🧪 テストモード' : '🎮 通常プレイ'}
          </button>
        </div>
      </header>

      {/* ユーザー情報（認証機能有効時のみ表示） */}
      {ENABLE_AUTH && <UserInfo />}

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
        {mode === 'sequence' ? (
          <GameSequence onExit={handleExitSequence} />
        ) : (
          <TemplateTestMode onExit={handleSwitchToSequence} />
        )}
      </main>

      {/* フッター */}
      <footer style={{ 
        marginTop: '20px',
        color: '#6b7280',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        <div>
          Phase {ENABLE_AUTH ? '3' : '2'}: {mode === 'sequence' ? '完全自動連続プレイ' : 'テンプレート動作確認'} | 
          🎯 {mode === 'sequence' ? '真のメイドイン俺体験' : '品質保証テスト'} ✨
        </div>
        {ENABLE_AUTH && (
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#10b981' }}>
            🔐 認証システム統合完了 | ユーザー管理・プロフィール機能対応
          </div>
        )}
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          💡 {mode === 'sequence' ? 
            '修正点: 即座開始、指示画面、結果表示、完全自動進行' : 
            'ChatGPT制作テンプレートの動作確認・デバッグ用'
          }
        </div>
        <div style={{ fontSize: '11px', marginTop: '8px', color: '#9ca3af' }}>
          🚀 進捗: 基盤完成 → テンプレート量産中 → {ENABLE_AUTH ? '認証システム統合' : '動作確認段階'}
        </div>
      </footer>

      {/* EnvTest（存在する場合のみ表示） */}
      {typeof EnvTest !== 'undefined' && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <EnvTest />
        </div>
      )}
    </div>
  );
}

// ルートAppコンポーネント
function App() {
  // 認証機能が有効で、AuthProviderが利用可能な場合はラップ
  if (ENABLE_AUTH && AuthProvider) {
    return (
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    );
  }

  // 認証機能が無効な場合は既存機能のみ
  return <MainApp />;
}

// 開発モードでの設定表示
if ((import.meta as any).env?.DEV) {
  console.log('🚀 App Configuration:', {
    AUTH_ENABLED: ENABLE_AUTH,
    NODE_ENV: (import.meta as any).env?.NODE_ENV,
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  });
}

export default App;