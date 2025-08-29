// src/hooks/useAuth.ts
// 認証状態管理Hook - 完全エラー修正版
// 全TypeScriptエラー解決済み

import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { auth, database, SupabaseError } from '../lib/supabase'
import type { Profile } from '../lib/database.types'

// 認証状態の型定義
interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initializing: boolean
  error: string | null
}

// サインアップオプション
interface SignUpOptions {
  username: string
  displayName?: string
  age: number
  language?: string
}

// 認証アクションの型定義
interface AuthActions {
  signUp: (email: string, password: string, options: SignUpOptions) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  checkUsernameAvailable: (username: string) => Promise<boolean>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
  requiresParentalOversight: boolean
}

// Context型定義
type AuthContextType = AuthState & AuthActions

// Contextの作成
const AuthContext = createContext<AuthContextType | null>(null)

// エラーメッセージの日本語化
const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
  'Email not confirmed': 'メールアドレスが確認されていません。確認メールをご確認ください',
  'User already registered': 'このメールアドレスは既に登録されています',
  'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
  'Username already taken': 'このユーザー名は既に使用されています',
  'Invalid email format': 'メールアドレスの形式が正しくありません',
  'Network request failed': 'ネットワークエラーが発生しました。接続を確認してください',
  'Failed to get current user': 'ユーザー情報の取得に失敗しました',
  'Failed to sign up': 'アカウント作成に失敗しました',
  'Failed to sign in': 'ログインに失敗しました',
  'Failed to sign out': 'ログアウトに失敗しました'
}

const getErrorMessage = (error: string | SupabaseError | Error): string => {
  if (error instanceof SupabaseError) {
    return ERROR_MESSAGES[error.message] || error.message
  }
  if (error instanceof Error) {
    return ERROR_MESSAGES[error.message] || error.message
  }
  return ERROR_MESSAGES[error] || error
}

// AuthProviderの実装
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: false,
    initializing: true,
    error: null
  })

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // プロフィール読み込み
  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const profile = await database.profiles.get(userId)
      return profile
    } catch (error) {
      console.error('Load profile error:', error)
      return null
    }
  }, [])

  // 認証状態の初期化
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const session = await auth.getCurrentSession()
        
        if (mounted) {
          if (session?.user) {
            const profile = await loadProfile(session.user.id)
            setState({
              user: session.user,
              session,
              profile,
              loading: false,
              initializing: false,
              error: null
            })
          } else {
            setState({
              user: null,
              session: null,
              profile: null,
              loading: false,
              initializing: false,
              error: null
            })
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            initializing: false,
            error: getErrorMessage(error as Error)
          })
        }
      }
    }

    initializeAuth()
    return () => { mounted = false }
  }, [loadProfile])

  // 認証状態変更の監視
  useEffect(() => {
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setState(prev => ({ ...prev, loading: true, error: null }))
          const profile = await loadProfile(session.user.id)
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            initializing: false,
            error: null
          })
        }
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          session: null,
          profile: null,
          loading: false,
          initializing: false,
          error: null
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  // サインアップ
  const signUp = useCallback(async (email: string, password: string, options: SignUpOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const usernameAvailable = await database.profiles.checkUsernameAvailable(options.username)
      if (!usernameAvailable) {
        throw new Error('Username already taken')
      }

      const result = await auth.signUp(email, password, options)
      
      if (result.user) {
        const profileData = {
          id: result.user.id,
          username: options.username,
          display_name: options.displayName || options.username,
          avatar_url: null,
          bio: null,
          language: options.language || 'ja',
          age: options.age,
          requires_parental_oversight: options.age < 13,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        await database.profiles.upsert(profileData)
      }

      setState(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Sign up error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error as Error)
      }))
      throw error
    }
  }, [])

  // サインイン
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await auth.signIn(email, password)
    } catch (error) {
      console.error('Sign in error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error as Error)
      }))
      throw error
    }
  }, [])

  // サインアウト
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error as Error)
      }))
      throw error
    }
  }, [])

  // プロフィール更新
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!state.user || !state.profile) {
      throw new Error('User not authenticated')
    }

    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      if (updates.username && updates.username !== state.profile.username) {
        const usernameAvailable = await database.profiles.checkUsernameAvailable(
          updates.username,
          state.user.id
        )
        if (!usernameAvailable) {
          throw new Error('Username already taken')
        }
      }

      const updatedProfile = {
        ...state.profile,
        ...updates,
        updated_at: new Date().toISOString()
      }

      const profile = await database.profiles.upsert(updatedProfile)
      
      setState(prev => ({
        ...prev,
        profile,
        loading: false
      }))
    } catch (error) {
      console.error('Update profile error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error as Error)
      }))
      throw error
    }
  }, [state.user, state.profile])

  // ユーザー名可用性チェック
  const checkUsernameAvailable = useCallback(async (username: string): Promise<boolean> => {
    try {
      return await database.profiles.checkUsernameAvailable(username, state.user?.id)
    } catch (error) {
      console.error('Check username error:', error)
      return false
    }
  }, [state.user])

  // パスワードリセット
  const resetPassword = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await auth.resetPassword(email)
      setState(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Reset password error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error as Error)
      }))
      throw error
    }
  }, [])

  // 計算プロパティ
  const isAuthenticated = !!state.user
  const requiresParentalOversight = state.profile?.requires_parental_oversight ?? false

  // Context値
  const contextValue: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile,
    checkUsernameAvailable,
    resetPassword,
    clearError,
    isAuthenticated,
    requiresParentalOversight
  }

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  )
}

// useAuthフックの実装
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// 便利なHook
export const useRequireAuth = (): AuthContextType => {
  const authContext = useAuth()
  
  useEffect(() => {
    if (!authContext.initializing && !authContext.isAuthenticated) {
      console.warn('Authentication required but user is not authenticated')
    }
  }, [authContext.initializing, authContext.isAuthenticated])
  
  return authContext
}

export const useRequireProfile = (): AuthContextType => {
  const authContext = useAuth()
  
  useEffect(() => {
    if (!authContext.initializing && authContext.isAuthenticated && !authContext.profile) {
      console.warn('Profile required but profile is not loaded')
    }
  }, [authContext.initializing, authContext.isAuthenticated, authContext.profile])
  
  return authContext
}

export default useAuth
export type { AuthState, AuthActions, SignUpOptions }