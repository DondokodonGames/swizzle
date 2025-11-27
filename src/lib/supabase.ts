// src/lib/supabase.ts
// 超シンプル・完全エラーフリー版
// 複雑な型定義を排除し、確実に動作することを最優先

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'
import type { Database } from './database.types' // ← この行を追加

// 環境変数を直接ハードコード（型エラー完全回避）
const supabaseUrl = 'https://rqzehjsygvkkvntswqbs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemVoanN5Z3Zra3ZudHN3cWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTA4MjEsImV4cCI6MjA3MTk2NjgyMX0.e6jBgtNNr1bPlP0L8XYqoMyZmWOjJaojgRrHvRhUU_0'

// シンプルなSupabaseクライアント作成（型制約なし）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// シンプルな認証状態型
export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

// シンプルなエラークラス
export class SupabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SupabaseError'
  }
}

// 認証機能（シンプル版）
export const auth = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  },

  getCurrentSession: async (): Promise<Session | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Get session error:', error)
      return null
    }
  },

  signUp: async (email: string, password: string, userData: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: userData.username || '',
          display_name: userData.displayName || userData.username || '',
          age: userData.age || 18,
          language: userData.language || 'ja',
          requires_parental_oversight: (userData.age || 18) < 13,
          ...userData
        }
      }
    })

    if (error) throw new SupabaseError(error.message, error.code)
    return data
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw new SupabaseError(error.message, error.code)
    return data
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new SupabaseError(error.message, error.code)
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) throw new SupabaseError(error.message, error.code)
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// データベース操作（シンプル版・any型使用）
export const database = {
  profiles: {
    get: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    upsert: async (profileData: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    checkUsernameAvailable: async (username: string, excludeUserId?: string) => {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username)

      if (excludeUserId) {
        query = query.neq('id', excludeUserId)
      }

      const { data, error } = await query

      if (error) throw new SupabaseError(error.message)
      return data.length === 0
    }
  },

  userGames: {
    getPublished: async (options: any = {}) => {
      console.log('🔍 [database.userGames.getPublished] 開始:', options);
      
      try {
        // Step 1: 基本クエリでゲーム取得
        let query = supabase
          .from('user_games')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        console.log('🔍 [Step 1] 基本クエリ構築完了');

        // フィルター適用
        if (options.templateType) {
          query = query.eq('template_id', options.templateType);
          console.log('🔍 [Step 1] templateType フィルター:', options.templateType);
        }

        if (options.searchQuery) {
          query = query.ilike('title', `%${options.searchQuery}%`);
          console.log('🔍 [Step 1] searchQuery フィルター:', options.searchQuery);
        }

        if (options.limit) {
          query = query.limit(options.limit);
          console.log('🔍 [Step 1] limit:', options.limit);
        }

        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
          console.log('🔍 [Step 1] offset:', options.offset);
        }

        console.log('🔍 [Step 1] クエリ実行中...');

        // タイムアウト処理付きでクエリ実行
        const timeoutPromise1 = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ゲーム取得がタイムアウトしました（10秒）')), 10000)
        );

        const { data, error } = await Promise.race([
          query,
          timeoutPromise1
        ]) as any;

        if (error) {
          console.error('❌ [Step 1] クエリエラー:', error);
          throw new SupabaseError(error.message);
        }

        console.log('✅ [Step 1] ゲーム取得成功:', data?.length || 0, '件');

        // データがない場合は空配列を返す
        if (!data || data.length === 0) {
          console.log('✅ [完了] データなし、空配列を返します');
          return [];
        }

        // Step 2: プロフィール情報を一括取得
        console.log('🔍 [Step 2] プロフィール情報を一括取得中...');

        // creator_idのリストを抽出（重複排除）
        const creatorIds = [...new Set(data.map((game: any) => game.creator_id))];
        console.log('🔍 [Step 2] 取得するプロフィール数:', creatorIds.length);

        // タイムアウト処理付きでプロフィール一括取得
        const timeoutPromise2 = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('プロフィール取得がタイムアウトしました（5秒）')), 5000)
        );

        const profileQuery = supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', creatorIds);

        const profileResult = await Promise.race([
          profileQuery,
          timeoutPromise2
        ]) as any;

        let profilesMap: Record<string, any> = {};

        if (profileResult.error) {
          console.warn('⚠️ [Step 2] プロフィール取得エラー:', profileResult.error);
          console.warn('⚠️ [Step 2] プロフィールなしで続行します');
        } else if (profileResult.data) {
          console.log('✅ [Step 2] プロフィール取得成功:', profileResult.data.length, '件');
          // プロフィールをMapに変換（高速検索用）
          profilesMap = profileResult.data.reduce((acc: any, profile: any) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }

        // Step 3: ゲームとプロフィールを結合
        console.log('🔍 [Step 3] ゲームとプロフィールを結合中...');

        const gamesWithProfiles = data.map((game: any) => ({
          ...game,
          profiles: profilesMap[game.creator_id] || null
        }));

        console.log('✅ [完了] 全処理完了:', gamesWithProfiles.length, '件');
        return gamesWithProfiles;

      } catch (error) {
        console.error('❌ [エラー] getPublished で予期しないエラー:', error);
        
        if (error instanceof Error) {
          console.error('❌ エラーメッセージ:', error.message);
          console.error('❌ エラースタック:', error.stack);
        }
        
        // エラーを再スローせず、空配列を返す（サイトが表示されるようにする）
        console.warn('⚠️ エラーが発生しましたが、空配列を返して続行します');
        return [];
      }
    },

    getUserGames: async (userId: string) => {
      const { data, error } = await supabase
        .from('user_games')
        .select('*')
        .eq('creator_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw new SupabaseError(error.message)
      return data || []
    },

    save: async (gameData: any) => {
      const { data, error } = await supabase
        .from('user_games')
        .insert(gameData)
        .select()
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    update: async (gameId: string, updates: any) => {
      const { data, error } = await supabase
        .from('user_games')
        .update(updates)
        .eq('id', gameId)
        .select()
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    delete: async (gameId: string) => {
      const { error } = await supabase
        .from('user_games')
        .delete()
        .eq('id', gameId)

      if (error) throw new SupabaseError(error.message)
    }
  },

  favorites: {
    add: async (userId: string, gameId: string) => {
      const { error } = await supabase
        .from('game_favorites')
        .insert({
          user_id: userId,
          game_id: gameId,
          created_at: new Date().toISOString()
        })

      if (error) throw new SupabaseError(error.message)
    },

    remove: async (userId: string, gameId: string) => {
      const { error } = await supabase
        .from('game_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('game_id', gameId)

      if (error) throw new SupabaseError(error.message)
    },

    list: async (userId: string) => {
      const { data, error } = await supabase
        .from('game_favorites')
        .select(`
          game_id,
          user_games:game_id (
            *,
            profiles:creator_id (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)

      if (error) throw new SupabaseError(error.message)

      return data?.map(fav => fav.user_games).filter(game => game !== null) || []
    }
  }
}

// ストレージ操作（アバター画像アップロード用）
export const storage = {
  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    try {
      // ファイル名を生成（拡張子を保持）
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      // バケット名は .from('avatars') で指定されているので、パスには含めない
      const filePath = fileName

      // ファイルをアップロード
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('Supabase Storage upload error:', error)
        throw new SupabaseError(error.message)
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      throw new SupabaseError(error.message || 'Failed to upload avatar')
    }
  },

  deleteAvatar: async (avatarUrl: string): Promise<void> => {
    try {
      // URLからファイルパスを抽出
      const url = new URL(avatarUrl)
      const path = url.pathname.split('/storage/v1/object/public/avatars/')[1]

      if (path) {
        const { error } = await supabase.storage
          .from('avatars')
          .remove([path])

        if (error) throw new SupabaseError(error.message)
      }
    } catch (error: any) {
      console.error('Delete avatar error:', error)
      // エラーを無視（ファイルが存在しない場合など）
    }
  }
}

// 接続テスト関数
export const testConnection = async () => {
  try {
    const startTime = Date.now()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    const latency = Date.now() - startTime

    return {
      connected: !error,
      error: error?.message,
      latency
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'Unknown error'
    }
  }
}

// ヘルスチェック関数
export const healthCheck = async () => {
  const connection = await testConnection()
  const authCheck = await supabase.auth.getSession()
  
  return {
    database: connection,
    auth: {
      connected: !authCheck.error,
      authenticated: !!authCheck.data.session,
      error: authCheck.error?.message
    },
    environment: {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    }
  }
}

export default supabase
