// src/lib/supabase.ts
// ウォームアップ機能追加版 - コールドスタート対策

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'
import type { Database } from './database.types'

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

// ウォームアップ状態管理
let isWarmedUp = false;
let warmupPromise: Promise<boolean> | null = null;

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

// ウォームアップ関数（コールドスタート対策）
export const warmupConnection = async (): Promise<boolean> => {
  // 既にウォームアップ済みの場合はスキップ
  if (isWarmedUp) {
    return true;
  }

  // ウォームアップ中の場合は待機せずに即座にtrueを返す
  if (warmupPromise) {
    return true;
  }

  // ウォームアップ開始
  warmupPromise = (async () => {
    console.log('🔥 [Warmup] データベース接続をウォームアップ中...');
    const startTime = Date.now();

    try {
      // タイムアウト付きクエリ（5秒）
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Warmup timeout')), 5000)
      );

      // 軽量なクエリで接続を確立（1件のみ取得）
      const queryPromise = supabase
        .from('user_games')
        .select('id')
        .limit(1);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      const elapsed = Date.now() - startTime;

      if (error) {
        console.warn(`⚠️ [Warmup] エラー (${elapsed}ms):`, error.message);
        return false;
      }

      isWarmedUp = true;
      console.log(`✅ [Warmup] 接続確立完了 (${elapsed}ms)`);
      return true;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.warn(`⚠️ [Warmup] タイムアウトまたはエラー (${elapsed}ms)、スキップして続行`);
      // タイムアウトでもtrueを返してアプリを続行させる
      isWarmedUp = true;
      return true;
    } finally {
      warmupPromise = null;
    }
  })();

  return warmupPromise;
};

// 即座にウォームアップを開始（モジュール読み込み時）
warmupConnection().catch(console.error);

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

      // ウォームアップはバックグラウンドで実行（待機しない）
      warmupConnection().catch(() => {});

      // リトライ設定（短縮）
      const maxRetries = 2;
      const timeoutMs = 8000; // 8秒
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // AbortControllerでタイムアウト制御
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const queryStartTime = Date.now();

          let query = supabase
            .from('user_games')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .abortSignal(controller.signal);

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

          console.log(`🔍 [Step 1] クエリ実行中... (試行 ${attempt}/${maxRetries}, タイムアウト: ${timeoutMs/1000}秒)`);

          const { data, error } = await query;
          clearTimeout(timeoutId);

          if (error) {
            throw new Error(error.message);
          }

          const queryElapsed = Date.now() - queryStartTime;
          console.log(`✅ [Step 1] ゲーム取得成功: ${data?.length || 0}件 (${queryElapsed}ms)`);

          // データがない場合は空配列を返す
          if (!data || data.length === 0) {
            return [];
          }

          // Step 2: プロフィール情報を一括取得
          const creatorIds = [...new Set(data.map((game: any) => game.creator_id))];

          const profileTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('プロフィール取得タイムアウト')), 10000)
          );

          const profileQuery = supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', creatorIds);

          let profilesMap: Record<string, any> = {};
          try {
            const { data: profileData, error: profileError } = await Promise.race([profileQuery, profileTimeoutPromise]);
            if (!profileError && profileData) {
              profilesMap = profileData.reduce((acc: any, profile: any) => {
                acc[profile.id] = profile;
                return acc;
              }, {});
            }
          } catch {
            console.warn('⚠️ プロフィール取得失敗、スキップして続行');
          }

          // Step 3: ゲームとプロフィールを結合
          const gamesWithProfiles = data.map((game: any) => ({
            ...game,
            profiles: profilesMap[game.creator_id] || null
          }));

          return gamesWithProfiles;

        } catch (error: any) {
          clearTimeout(timeoutId);

          // AbortErrorの場合はタイムアウトとして扱う
          const isAborted = error?.name === 'AbortError' || controller.signal.aborted;
          const errorMessage = isAborted ? `タイムアウト (${timeoutMs/1000}秒)` : (error?.message || String(error));

          lastError = new Error(errorMessage);
          console.warn(`⚠️ [試行 ${attempt}/${maxRetries}] 失敗: ${errorMessage}`);

          if (attempt < maxRetries) {
            console.log(`🔄 ${attempt + 1}回目のリトライを実行...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
          }
        }
      }

      // 全リトライ失敗
      console.error('❌ 全リトライ失敗:', lastError?.message);
      return [];
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

    // 軽量なメタデータ更新（タイトル、説明のみ）
    updateMetadata: async (gameId: string, metadata: {
      title?: string;
      description?: string;
      is_published?: boolean;
      thumbnail_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('user_games')
        .update({
          ...metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select('id, title, description, updated_at')
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