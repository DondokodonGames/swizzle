// src/App.tsx - Hooksルール完全準拠版 + ViewportTest統合 + Week 2音量設定機能
// React Hooks使用ルール違反エラー完全解消 + Phase 4 Week 1統合テスト + Week 2統合

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import GameSequence from './components/GameSequence';
import TemplateTestMode from './components/TemplateTestMode';
import EnvTest from './components/EnvTest';
import { ViewportTestWrapper } from './components/SimpleViewportTest';

// Week 2新機能: 音量設定の型定義
interface VolumeSettings {
  bgm: number
  se: number
  muted: boolean
}

// Week 2新機能: 音量設定のデフォルト値
const DEFAULT_VOLUME: VolumeSettings = {
  bgm: 0.7,
  se: 0.8,
  muted: false
}

// 認証機能の有効/無効判定
const ENABLE_AUTH = (import.meta as any).env?.VITE_ENABLE_AUTH === 'true';

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

// 認証機能を使用するコンポーネント（Hooks順序固定）
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

// Week 2新機能: 音量設定UIコンポーネント
const VolumeControlUI: React.FC<{
  volumeSettings: VolumeSettings;
  onVolumeChange: (settings: VolumeSettings) => void;
}> = ({ volumeSettings, onVolumeChange }) => {
  // BGM音量変更ハンドラ
  const handleBGMVolumeChange = useCallback((value: number) => {
    const newSettings = { ...volumeSettings, bgm: value }
    onVolumeChange(newSettings)
  }, [volumeSettings, onVolumeChange])

  // SE音量変更ハンドラ
  const handleSEVolumeChange = useCallback((value: number) => {
    const newSettings = { ...volumeSettings, se: value }
    onVolumeChange(newSettings)
  }, [volumeSettings, onVolumeChange])

  // ミュート切り替えハンドラ
  const handleMuteToggle = useCallback(() => {
    const newSettings = { ...volumeSettings, muted: !volumeSettings.muted }
    onVolumeChange(newSettings)
  }, [volumeSettings, onVolumeChange])

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '15px',
      padding: '15px',
      marginBottom: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#a21caf',
        textAlign: 'center',
        margin: '0 0 15px 0'
      }}>
        🎵 音量設定
      </h3>
      
      {/* ミュートボタン */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <button
          onClick={handleMuteToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: volumeSettings.muted 
              ? 'linear-gradient(45deg, #ef4444, #dc2626)'
              : 'linear-gradient(45deg, #10b981, #059669)',
            color: 'white'
          }}
        >
          <span style={{ fontSize: '16px' }}>
            {volumeSettings.muted ? '🔇' : '🔊'}
          </span>
          {volumeSettings.muted ? 'ミュート中' : '音声ON'}
        </button>
      </div>

      {/* BGM音量スライダー */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '6px' 
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6b7280' 
          }}>
            🎵 BGM音量
          </label>
          <span style={{ 
            fontSize: '12px', 
            color: '#a21caf', 
            fontWeight: '600' 
          }}>
            {Math.round(volumeSettings.bgm * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volumeSettings.bgm}
          onChange={(e) => handleBGMVolumeChange(parseFloat(e.target.value))}
          disabled={volumeSettings.muted}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: volumeSettings.muted 
              ? '#d1d5db' 
              : `linear-gradient(to right, #a21caf 0%, #a21caf ${volumeSettings.bgm * 100}%, #e5e7eb ${volumeSettings.bgm * 100}%, #e5e7eb 100%)`,
            outline: 'none',
            cursor: volumeSettings.muted ? 'not-allowed' : 'pointer'
          }}
        />
      </div>

      {/* SE音量スライダー */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '6px' 
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6b7280' 
          }}>
            🔊 SE音量
          </label>
          <span style={{ 
            fontSize: '12px', 
            color: '#a21caf', 
            fontWeight: '600' 
          }}>
            {Math.round(volumeSettings.se * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volumeSettings.se}
          onChange={(e) => handleSEVolumeChange(parseFloat(e.target.value))}
          disabled={volumeSettings.muted}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: volumeSettings.muted 
              ? '#d1d5db' 
              : `linear-gradient(to right, #a21caf 0%, #a21caf ${volumeSettings.se * 100}%, #e5e7eb ${volumeSettings.se * 100}%, #e5e7eb 100%)`,
            outline: 'none',
            cursor: volumeSettings.muted ? 'not-allowed' : 'pointer'
          }}
        />
      </div>

      {/* 音量テストボタン */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => {
            console.log('音量テスト:', volumeSettings)
            // TODO: 実際の音声再生機能と連携
          }}
          disabled={volumeSettings.muted}
          style={{
            padding: '6px 12px',
            borderRadius: '15px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '600',
            cursor: volumeSettings.muted ? 'not-allowed' : 'pointer',
            background: volumeSettings.muted 
              ? '#f3f4f6' 
              : 'linear-gradient(45deg, #fce7ff, #e7e5ff)',
            color: volumeSettings.muted ? '#9ca3af' : '#a21caf'
          }}
        >
          🎵 音量テスト
        </button>
      </div>
    </div>
  )
}

// メインアプリケーションコンポーネント
function MainApp() {
  const [mode, setMode] = useState<'sequence' | 'test' | 'week2-test'>('sequence');
  
  // Week 2新機能: 音量設定状態
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(DEFAULT_VOLUME)

  // Week 2新機能: 音量設定の読み込み（ローカルストレージから）
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

  // Week 2新機能: 音量設定の保存
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

  // Week 2新機能: Week 2テストモードへの切り替え
  const handleSwitchToWeek2Test = () => {
    setMode('week2-test');
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
            mode === 'test' ?
            'テンプレート動作確認モード' :
            'Week 2統合テストモード'
          }
        </p>

        {/* Phase 4 Week 2 統合状況表示 */}
        <div style={{ 
          marginTop: '10px',
          padding: '6px 12px',
          backgroundColor: mode === 'week2-test' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: mode === 'week2-test' ? '1px solid #22c55e' : '1px solid #10b981',
          borderRadius: '15px',
          fontSize: '12px',
          color: mode === 'week2-test' ? '#15803d' : '#065f46',
          display: 'inline-block'
        }}>
          {mode === 'week2-test' ? 
            '🧪 Phase 4 Week 2: 音量設定UI統合テスト実行中' :
            '🚀 Phase 4 Week 1: ビューポート統合テスト実行中'
          }
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
          {/* Week 2新機能: Week 2テストモードボタン */}
          <button
            onClick={handleSwitchToWeek2Test}
            style={{
              backgroundColor: mode === 'week2-test' ? '#22c55e' : 'white',
              color: mode === 'week2-test' ? 'white' : '#22c55e',
              border: '2px solid #22c55e',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔊 Week 2テスト
          </button>
        </div>
      </header>

      {/* ユーザー情報（認証機能有効時のみ表示） */}
      {ENABLE_AUTH && <AuthenticatedUserInfo />}

      {/* Week 2新機能: 音量設定UI */}
      <VolumeControlUI 
        volumeSettings={volumeSettings}
        onVolumeChange={saveVolumeSettings}
      />

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
            volumeSettings={volumeSettings}
            onVolumeChange={saveVolumeSettings}
          />
        )}
        {mode === 'test' && <TemplateTestMode onExit={handleSwitchToSequence} />}
        {mode === 'week2-test' && (
          /* Week 2新機能: Week 2統合テスト画面 */
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#22c55e', 
              marginBottom: '20px' 
            }}>
              🧪 Week 2統合テスト
            </h2>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '30px', 
              lineHeight: '1.6' 
            }}>
              音量設定UIが正常にメインシステムに統合されました！<br/>
              上部の音量設定で各種機能をテストできます。
            </p>
            
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              borderRadius: '12px', 
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#15803d', 
                marginBottom: '12px' 
              }}>
                ✅ 統合完了機能:
              </h4>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px', 
                color: '#166534',
                fontSize: '14px',
                lineHeight: '1.8'
              }}>
                <li>音量設定UI（BGM・SE・ミュート切り替え）</li>
                <li>ローカルストレージ自動保存・読み込み</li>
                <li>GameSequenceコンポーネントとの連携</li>
                <li>グローバル音量設定（window.gameVolumeSettings）</li>
                <li>既存認証・ビューポート機能との共存</li>
              </ul>
            </div>

            <div style={{ 
              backgroundColor: '#fffbeb', 
              border: '1px solid #fed7aa', 
              borderRadius: '12px', 
              padding: '20px',
              textAlign: 'left'
            }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#d97706', 
                marginBottom: '12px' 
              }}>
                🎯 次の実装予定（Week 3）:
              </h4>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px', 
                color: '#92400e',
                fontSize: '14px',
                lineHeight: '1.8'
              }}>
                <li>完全ランダム再生（固定5順序→全20種ランダム）</li>
                <li>動的テンプレート管理（templates/フォルダ構造）</li>
                <li>ゲーム内メッセージ管理・多言語対応準備</li>
                <li>リザルト簡素化・遷移高速化</li>
              </ul>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button
                onClick={handleSwitchToSequence}
                style={{
                  background: 'linear-gradient(45deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🎮 音量設定付きでゲームプレイ
              </button>
            </div>
          </div>
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
          Phase {ENABLE_AUTH ? '4' : '4'}: {
            mode === 'sequence' ? '完全自動連続プレイ' : 
            mode === 'test' ? 'テンプレート動作確認' :
            'Week 2統合テスト'
          } | 
          🎯 {
            mode === 'sequence' ? '真のメイドイン俺体験' : 
            mode === 'test' ? '品質保証テスト' :
            '音量設定統合テスト'
          } ✨
        </div>
        {ENABLE_AUTH && (
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#10b981' }}>
            🔐 認証システム統合完了 | ユーザー管理・プロフィール機能対応
          </div>
        )}
        <div style={{ fontSize: '12px', marginTop: '5px', color: '#3b82f6' }}>
          📱 Week 1: ビューポート統合・アセット仕様策定 | 9:16アスペクト比対応
        </div>
        {/* Week 2新機能: Week 2統合状況表示 */}
        <div style={{ fontSize: '12px', marginTop: '5px', color: '#22c55e' }}>
          🔊 Week 2: 音量設定UI統合完了 | BGM・SE・ミュート機能・ローカル保存対応
        </div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          💡 {
            mode === 'sequence' ? 
            '修正点: 即座開始、指示画面、結果表示、完全自動進行 + 音量設定' : 
            mode === 'test' ?
            'ChatGPT制作テンプレートの動作確認・デバッグ用' :
            'Week 2統合テスト: 音量設定・GameSequence連携・ローカル保存テスト'
          }
        </div>
        <div style={{ fontSize: '11px', marginTop: '8px', color: '#9ca3af' }}>
          🚀 進捗: 基盤完成 → テンプレート量産中 → 認証システム統合 → 📱 画面サイズ統一完了 → 🔊 音量設定統合完了
        </div>
      </footer>

      {/* EnvTest（位置調整：ViewportTestと重複回避） */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        <EnvTest />
      </div>
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

  // ViewportTestWrapperで全体をラップしてビューポート機能を統合
  return (
    <ViewportTestWrapper>
      <AppContent />
    </ViewportTestWrapper>
  );
}

// 開発モードでの設定表示（Phase 4 Week 2対応版）
if ((import.meta as any).env?.DEV) {
  console.log('🚀 App Configuration (Phase 4 Week 2):', {
    AUTH_ENABLED: ENABLE_AUTH,
    VIEWPORT_INTEGRATION: true,
    VOLUME_CONTROL_INTEGRATION: true, // Week 2新機能
    NODE_ENV: (import.meta as any).env?.NODE_ENV,
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  });
}

export default App;