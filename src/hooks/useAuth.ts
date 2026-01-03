// src/hooks/useAuth.ts
// トリガー対応版 - プロフィール作成自動化により大幅簡素化

import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { auth, database, SupabaseError } from '../lib/supabase'
import type { Profile } from '../lib/database.types'
import i18n from '../i18n'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initializing: boolean
  error: string | null
}

interface SignUpOptions {
  username: string
  displayName?: string
  age: number
  language?: string
}

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

type AuthContextType = AuthState & AuthActions

const AuthContext = createContext<AuthContextType | null>(null)

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: false,
    initializing: true,
    error: null
  })

  // 初期化完了を追跡するためのref（SIGNED_INイベントの重複処理防止用）
  const initCompletedRef = useRef(false)
  const profileLoadedRef = useRef(false)

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const loadProfile = useCallback(async (userId: string, isNewUser: boolean = false): Promise<Profile | null> => {
    const startTime = performance.now()
    console.log('📊 [useAuth] loadProfile開始', userId, 'isNewUser:', isNewUser, new Date().toISOString())
    try {
      const dbStartTime = performance.now()
      let profile = await database.profiles.get(userId)
      const dbEndTime = performance.now()
      console.log(`📊 [useAuth] database.profiles.get完了 (${(dbEndTime - dbStartTime).toFixed(0)}ms)`, profile ? 'found' : 'not found')

      // 新規ユーザーの場合のみ、トリガー処理を待つ
      if (!profile && isNewUser) {
        console.log('⏳ [useAuth] 新規ユーザー、1秒待機してリトライ')
        await new Promise(resolve => setTimeout(resolve, 1000))
        const retryStartTime = performance.now()
        profile = await database.profiles.get(userId)
        const retryEndTime = performance.now()
        console.log(`📊 [useAuth] database.profiles.get リトライ完了 (${(retryEndTime - retryStartTime).toFixed(0)}ms)`, profile ? 'found' : 'not found')
      }

      // プロフィールの言語設定でi18nを同期
      if (profile?.language) {
        i18n.changeLanguage(profile.language)
      }

      const totalTime = performance.now() - startTime
      console.log(`✅ [useAuth] loadProfile完了 (合計: ${totalTime.toFixed(0)}ms)`, profile?.username)
      return profile
    } catch (error) {
      const errorTime = performance.now() - startTime
      console.error(`❌ [useAuth] loadProfileエラー (${errorTime.toFixed(0)}ms):`, error)
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
            profileLoadedRef.current = !!profile
            initCompletedRef.current = true
            setState({
              user: session.user,
              session,
              profile,
              loading: false,
              initializing: false,
              error: null
            })
          } else {
            initCompletedRef.current = true
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
          initCompletedRef.current = true
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

      if (event === 'TOKEN_REFRESHED') {
        // トークンリフレッシュ時は既存のプロフィールを維持（ローディング状態なし）
        if (session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            // プロフィールは既存のものを維持
            loading: false,
            initializing: false,
            error: null
          }))
        }
      } else if (event === 'SIGNED_IN') {
        console.log('🔔 [useAuth] SIGNED_INイベント発火', new Date().toISOString(), 'user:', session?.user?.id)
        if (session?.user) {
          // 初期化中またはプロフィール読み込み済みの場合は、ローディングなしでセッション情報のみ更新
          // これにより、ページリロード時の重複ローディングを防止
          if (!initCompletedRef.current || profileLoadedRef.current) {
            console.log('⏭️ [useAuth] SIGNED_IN: 初期化中またはプロフィール読み込み済み、スキップ')
            setState(prev => ({
              ...prev,
              user: session.user,
              session,
              loading: false,
              error: null
            }))
            return
          }

          // 🚀 新規サインイン時：プロフィールをバックグラウンドで読み込む（ローディング表示なし）
          // これにより、画面遷移後もユーザーを待たせない
          const profileStartTime = performance.now()
          console.log('🔄 [useAuth] プロフィールをバックグラウンドで読み込み開始', new Date().toISOString())

          try {
            const profile = await loadProfile(session.user.id)
            const profileEndTime = performance.now()
            profileLoadedRef.current = !!profile
            console.log(`✅ [useAuth] プロフィール読み込み完了 (${(profileEndTime - profileStartTime).toFixed(0)}ms):`, profile?.username, new Date().toISOString())
            setState(prev => ({
              ...prev,
              profile,
              loading: false,
              initializing: false,
              error: null
            }))
          } catch (error) {
            const profileErrorTime = performance.now()
            console.error(`❌ [useAuth] プロフィール読み込みエラー (${(profileErrorTime - profileStartTime).toFixed(0)}ms):`, error, new Date().toISOString())
            setState(prev => ({
              ...prev,
              profile: null,
              loading: false,
              initializing: false,
              error: null
            }))
          }
        }
      } else if (event === 'SIGNED_OUT') {
        profileLoadedRef.current = false
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

  // サインアップ - 大幅簡素化版（トリガーがプロフィール作成を自動処理）
  const signUp = useCallback(async (email: string, password: string, options: SignUpOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Step 1: ユーザー名可用性チェック（重複回避のため）
      const usernameAvailable = await database.profiles.checkUsernameAvailable(options.username)
      if (!usernameAvailable) {
        throw new Error('Username already taken')
      }

      // Step 2: Supabase Auth でユーザー作成
      // トリガーが自動的にプロフィールを作成するため、メタデータも含める
      const result = await auth.signUp(email, password, {
        username: options.username,
        display_name: options.displayName || options.username,
        age: options.age,
        language: options.language || 'ja',
        requires_parental_oversight: options.age < 13
      })
      
      // Step 3: トリガーによる自動プロフィール作成完了
      // 複雑なリトライロジックは不要！
      console.log('User created successfully:', result.user?.id)

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

  // サインイン - 超高速化版（プロフィール読み込みは遷移後に実行）
  const signIn = useCallback(async (email: string, password: string) => {
    const startTime = performance.now()
    console.log('🔐 [useAuth] signIn開始', new Date().toISOString())
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const authStartTime = performance.now()
      console.log('📡 [useAuth] auth.signIn呼び出し', new Date().toISOString())
      const result = await auth.signIn(email, password)
      const authEndTime = performance.now()
      console.log(`✅ [useAuth] auth.signIn成功: ${result.user?.id} (${(authEndTime - authStartTime).toFixed(0)}ms)`, new Date().toISOString())

      if (result.user) {
        // 🚀 即座にログイン状態を反映（プロフィールは後で読み込む）
        setState({
          user: result.user,
          session: result.session,
          profile: null, // プロフィールはSIGNED_INイベントで読み込まれる
          loading: false, // すぐにloadingを解除して画面遷移可能にする
          initializing: false,
          error: null
        })
        const totalTime = performance.now() - startTime
        console.log(`✅ [useAuth] signIn即座に完了 (合計: ${totalTime.toFixed(0)}ms)`, new Date().toISOString())
      } else {
        console.warn('⚠️ [useAuth] result.userがnull')
        setState(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      const errorTime = performance.now() - startTime
      console.error(`❌ [useAuth] signInエラー (${errorTime.toFixed(0)}ms):`, error, new Date().toISOString())
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

      // 言語設定が更新された場合、i18nを同期
      if (updates.language && updates.language !== state.profile.language) {
        console.log('プロフィール更新で言語を変更:', updates.language)
        i18n.changeLanguage(updates.language).then(() => {
          console.log('i18n言語変更完了:', i18n.language)
        })
      }

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

  // Contextの値
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

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