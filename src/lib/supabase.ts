// src/lib/supabase.ts
// シンプル版 - ウォームアップ削除（パフォーマンス改善）

import { createClient, User, Session } from '@supabase/supabase-js'
import { getErrorMessage } from '../utils/errorUtils'

// 環境変数から取得（セキュリティ対策）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 環境変数の存在チェック
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

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

// ウォームアップ関数（互換性のため残すが、何もしない）
export const warmupConnection = async (): Promise<boolean> => {
  return true;
};

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

// ゲームの一覧表示に必要な軽量カラムのみ（project_data は含まない）
// project_data には base64 画像が含まれ、1件あたり数 MB になるため一覧取得では除外する
const GAME_LIST_COLUMNS = 'id, title, description, thumbnail_url, is_published, created_at, updated_at, creator_id, template_id, play_count, like_count';

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
      try {
        // project_data を除外した軽量クエリ（ゲームフィード用）
        let query = supabase
          .from('user_games')
          .select(GAME_LIST_COLUMNS)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        // フィルター適用
        if (options.templateType) {
          query = query.eq('template_id', options.templateType);
        }
        if (options.searchQuery) {
          query = query.ilike('title', `%${options.searchQuery}%`);
        }
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
        }

        const { data, error } = await query;

        if (error) {
          console.error('ゲーム取得エラー:', error.message);
          return [];
        }

        if (!data || data.length === 0) {
          return [];
        }

        // プロフィール情報を一括取得
        const creatorIds = [...new Set(data.map((game: any) => game.creator_id))];
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', creatorIds);

        const profilesMap: Record<string, any> = {};
        if (profileData) {
          profileData.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
        }

        // ゲームとプロフィールを結合
        return data.map((game: any) => ({
          ...game,
          profiles: profilesMap[game.creator_id] || null
        }));

      } catch (error: unknown) {
        console.error('getPublished エラー:', getErrorMessage(error));
        return [];
      }
    },

    // 一覧用（project_data を除外した軽量クエリ）
    getUserGames: async (userId: string) => {
      const { data, error } = await supabase
        .from('user_games')
        .select(GAME_LIST_COLUMNS)
        .eq('creator_id', userId)
        .order('updated_at', { ascending: false })
        .limit(200)

      if (error) throw new SupabaseError(error.message)
      return data || []
    },

    // project_data 内の id フィールドで特定プロジェクトを検索（JSONB フィルタ）
    findByProjectId: async (userId: string, projectId: string) => {
      const { data, error } = await supabase
        .from('user_games')
        .select('id, updated_at')
        .eq('creator_id', userId)
        .filter('project_data->>id', 'eq', projectId)
        .maybeSingle()

      if (error) throw new SupabaseError(error.message)
      return data as { id: string; updated_at: string } | null
    },

    // 特定ゲームの完全データ取得（project_data 含む・編集時のみ使用）
    getProjectData: async (gameId: string, userId: string) => {
      const { data, error } = await supabase
        .from('user_games')
        .select('id, title, description, project_data, is_published, updated_at')
        .eq('id', gameId)
        .eq('creator_id', userId)
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    // 公開ゲームの project_data 取得（再生時のみ・is_published=true のみ）
    getPublicProjectData: async (gameId: string) => {
      const { data, error } = await supabase
        .from('user_games')
        .select('id, project_data')
        .eq('id', gameId)
        .eq('is_published', true)
        .single()

      if (error) throw new SupabaseError(error.message)
      return data as { id: string; project_data: any }
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new SupabaseError('認証が必要です')

      const { data, error } = await supabase
        .from('user_games')
        .update(updates)
        .eq('id', gameId)
        .eq('creator_id', user.id)
        .select()
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    // 軽量なメタデータ更新（タイトル、説明のみ）
    updateMetadata: async (gameId: string, metadata: {
      title?: string;
      description?: string;
      is_published?: boolean;
      thumbnail_url?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new SupabaseError('認証が必要です')

      const { data, error } = await supabase
        .from('user_games')
        .update({
          ...metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .eq('creator_id', user.id)
        .select('id, title, description, updated_at')
        .single()

      if (error) throw new SupabaseError(error.message)
      return data
    },

    delete: async (gameId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new SupabaseError('認証が必要です')

      const { error } = await supabase
        .from('user_games')
        .delete()
        .eq('id', gameId)
        .eq('creator_id', user.id)

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
            id, title, description, thumbnail_url, is_published, created_at, updated_at, creator_id, template_id,
            profiles:creator_id (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)

      if (error) throw new SupabaseError(error.message)

      return data?.map((fav: { user_games: unknown }) => fav.user_games).filter((game: unknown) => game !== null) || []
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
      const { data: _data, error } = await supabase.storage
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
    } catch (error: unknown) {
      console.error('Avatar upload error:', error)
      throw new SupabaseError(getErrorMessage(error) || 'Failed to upload avatar')
    }
  },

  deleteAvatar: async (avatarUrl: string): Promise<void> => {
    try {
      // URLからファイルパスを抽出（パストラバーサル対策）
      const url = new URL(avatarUrl)

      // Supabaseドメインからのリクエストのみ許可
      const expectedHost = new URL(supabaseUrl).host
      if (!url.host.endsWith('.supabase.co') && url.host !== expectedHost) {
        console.warn('Invalid avatar URL host:', url.host)
        return
      }

      const pathSegments = url.pathname.split('/storage/v1/object/public/avatars/')
      if (pathSegments.length !== 2) {
        console.warn('Invalid avatar URL path format')
        return
      }

      const path = pathSegments[1]

      // パストラバーサル攻撃の防止
      if (!path || path.includes('..') || path.includes('//') || path.startsWith('/')) {
        console.warn('Invalid avatar path detected:', path)
        return
      }

      // ファイル名のみを抽出（追加の安全策）
      const fileName = path.split('/').pop()
      if (!fileName || fileName !== path) {
        console.warn('Avatar path contains directory traversal')
        return
      }

      const { error } = await supabase.storage
        .from('avatars')
        .remove([fileName])

      if (error) throw new SupabaseError(error.message)
    } catch (error: unknown) {
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
  } catch (error: unknown) {
    return {
      connected: false,
      error: getErrorMessage(error) || 'Unknown error'
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