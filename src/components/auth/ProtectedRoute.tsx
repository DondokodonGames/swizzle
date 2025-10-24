// src/components/auth/ProtectedRoute.tsx
// 認証必須ルートコンポーネント
// 認証状態チェック・リダイレクト・ローディング状態管理

import React, { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  requireProfile?: boolean
  fallback?: ReactNode
  onAuthRequired?: () => void
  allowedAges?: ('0-12' | '13-15' | '16-18' | '19+')[]
  showAuthPrompt?: boolean
}

interface AuthPromptProps {
  onLogin: () => void
  onSignup: () => void
}

// 認証プロンプトコンポーネント
const AuthPrompt: React.FC<AuthPromptProps> = ({ onLogin, onSignup }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
      {/* アイコン */}
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-3xl">🔒</span>
      </div>
      
      {/* タイトル・説明 */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        ログインが必要です
      </h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        ゲームの作成・保存・お気に入り機能を使用するには<br />
        アカウントが必要です
      </p>
      
      {/* ボタン */}
      <div className="space-y-3">
        <button
          onClick={onSignup}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 focus:ring-4 focus:ring-pink-200 transition-all"
        >
          アカウント作成
        </button>
        <button
          onClick={onLogin}
          className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all"
        >
          ログイン
        </button>
      </div>
      
      {/* 機能説明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left">
        <h3 className="font-semibold text-gray-900 mb-2">アカウント機能</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            オリジナルゲームの作成・保存
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            お気に入りゲームの管理
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            プレイリストの作成・共有
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            作品の公開・交流
          </li>
        </ul>
      </div>
    </div>
  </div>
)

// ローディング画面コンポーネント
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
    <div className="text-center">
      {/* ローディングアニメーション */}
      <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span className="text-xl">🎮</span>
        </div>
      </div>
      
      {/* テキスト */}
      <h2 className="text-xl font-semibold text-gray-800 mb-2">読み込み中...</h2>
      <p className="text-gray-600">少々お待ちください</p>
    </div>
  </div>
)

// 年齢制限チェック
const AgeRestrictedScreen: React.FC<{ requiredAges: string[]; userAge?: number }> = ({ 
  requiredAges, 
  userAge 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
      {/* アイコン */}
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
        <span className="text-3xl">⚠️</span>
      </div>
      
      {/* タイトル・説明 */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        年齢制限があります
      </h2>
      <p className="text-gray-600 mb-6 leading-relaxed">
        このコンテンツは特定の年齢層向けです。<br />
        {userAge ? `現在の設定年齢: ${userAge}歳` : 'プロフィールで年齢を設定してください。'}
      </p>
      
      {/* 必要な年齢層表示 */}
      <div className="p-4 bg-amber-50 rounded-xl mb-6">
        <h3 className="font-semibold text-amber-800 mb-2">対象年齢</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {requiredAges.map(age => (
            <span 
              key={age} 
              className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm font-medium"
            >
              {age === '0-12' && '12歳以下'}
              {age === '13-15' && '13-15歳'}
              {age === '16-18' && '16-18歳'}
              {age === '19+' && '19歳以上'}
            </span>
          ))}
        </div>
      </div>
      
      {/* 戻るボタン */}
      <button
        onClick={() => window.history.back()}
        className="w-full border border-amber-300 text-amber-700 py-3 rounded-xl font-medium hover:bg-amber-50 focus:ring-4 focus:ring-amber-200 transition-all"
      >
        戻る
      </button>
    </div>
  </div>
)

// プロフィール不完全画面
const IncompleteProfileScreen: React.FC<{ onSetupProfile: () => void }> = ({ onSetupProfile }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
      {/* アイコン */}
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
        <span className="text-3xl">👤</span>
      </div>
      
      {/* タイトル・説明 */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        プロフィール設定が必要です
      </h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        この機能を使用するには<br />
        プロフィール情報の設定が必要です
      </p>
      
      {/* ボタン */}
      <button
        onClick={onSetupProfile}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all"
      >
        プロフィール設定
      </button>
    </div>
  </div>
)

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireProfile = false,
  fallback,
  onAuthRequired,
  allowedAges,
  showAuthPrompt = true
}) => {
  const { 
    isAuthenticated, 
    profile, 
    initializing, 
    loading 
  } = useAuth()

  // 初期化中の場合はローディング表示
  if (initializing || loading) {
    return fallback || <LoadingScreen />
  }

  // 認証が必要だが未認証の場合
  if (!isAuthenticated) {
    // カスタムコールバックがある場合は実行
    if (onAuthRequired) {
      onAuthRequired()
      return fallback || null
    }

    // 認証プロンプトを表示
    if (showAuthPrompt) {
      return (
        <AuthPrompt
          onLogin={() => {
            // グローバル状態で認証モーダルを開く
            window.dispatchEvent(new CustomEvent('openAuthModal', { 
              detail: { mode: 'signin' } 
            }))
          }}
          onSignup={() => {
            // グローバル状態で認証モーダルを開く
            window.dispatchEvent(new CustomEvent('openAuthModal', { 
              detail: { mode: 'signup' } 
            }))
          }}
        />
      )
    }

    return fallback || null
  }

  // プロフィールが必要だが不完全な場合
  if (requireProfile && !profile) {
    return (
      <IncompleteProfileScreen
        onSetupProfile={() => {
          // グローバル状態でプロフィール設定モーダルを開く
          window.dispatchEvent(new CustomEvent('openProfileSetup', { 
            detail: { mode: 'setup' } 
          }))
        }}
      />
    )
  }

  // 年齢制限チェック
  if (allowedAges && profile) {
    const userAge = profile.age
    if (userAge !== null) {
      const userAgeGroup = 
        userAge <= 12 ? '0-12' :
        userAge <= 15 ? '13-15' :
        userAge <= 18 ? '16-18' : '19+'

      if (!allowedAges.includes(userAgeGroup as any)) {
        return <AgeRestrictedScreen requiredAges={allowedAges} userAge={userAge} />
      }
    }
  }

  // 全ての条件を満たしている場合はコンテンツを表示
  return <>{children}</>
}

// 便利なラッパーコンポーネント
export const RequireAuth: React.FC<{ 
  children: ReactNode 
  fallback?: ReactNode 
}> = ({ children, fallback }) => (
  <ProtectedRoute fallback={fallback}>
    {children}
  </ProtectedRoute>
)

export const RequireProfile: React.FC<{ 
  children: ReactNode 
  fallback?: ReactNode 
}> = ({ children, fallback }) => (
  <ProtectedRoute requireProfile fallback={fallback}>
    {children}
  </ProtectedRoute>
)

export const AgeRestricted: React.FC<{ 
  children: ReactNode
  allowedAges: ('0-12' | '13-15' | '16-18' | '19+')[]
  fallback?: ReactNode 
}> = ({ children, allowedAges, fallback }) => (
  <ProtectedRoute 
    requireProfile 
    allowedAges={allowedAges} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
)

// 条件付き表示用のHook
export const useConditionalRender = () => {
  const { isAuthenticated, profile } = useAuth()

  return {
    // 認証済みの場合のみ表示
    ifAuthenticated: (content: ReactNode) => isAuthenticated ? content : null,
    
    // 未認証の場合のみ表示
    ifNotAuthenticated: (content: ReactNode) => !isAuthenticated ? content : null,
    
    // プロフィール完了済みの場合のみ表示
    ifProfileComplete: (content: ReactNode) => (isAuthenticated && profile) ? content : null,
    
    // プロフィール未完了の場合のみ表示
    ifProfileIncomplete: (content: ReactNode) => (isAuthenticated && !profile) ? content : null,
    
    // 年齢条件に合致する場合のみ表示
    ifAgeAllowed: (content: ReactNode, allowedAges: ('0-12' | '13-15' | '16-18' | '19+')[]) => {
      if (!isAuthenticated || !profile || profile.age === null) return null
      
      const userAge = profile.age
      const userAgeGroup = 
        userAge <= 12 ? '0-12' :
        userAge <= 15 ? '13-15' :
        userAge <= 18 ? '16-18' : '19+'

      return allowedAges.includes(userAgeGroup as any) ? content : null
    }
  }
}

export default ProtectedRoute