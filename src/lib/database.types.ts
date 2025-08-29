// src/lib/database.types.ts
// Supabase データベース型定義
// 技術設計書のスキーマに基づく型安全性確保

// JSON型の基底定義
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// データベーススキーマ型定義
export interface Database {
  public: {
    Tables: {
      // ユーザープロフィール拡張テーブル
      profiles: {
        Row: {
          id: string                          // UUID, auth.usersを参照
          username: string                    // ユニークユーザー名
          display_name: string | null         // 表示名
          avatar_url: string | null           // アバター画像URL
          bio: string | null                  // 自己紹介文
          language: string                    // 言語設定（デフォルト'en'）
          age: number | null                  // 年齢（COPPA対応）
          requires_parental_oversight: boolean // 13歳未満フラグ
          created_at: string                  // 作成日時
          updated_at: string                  // 更新日時
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          language?: string
          age?: number | null
          requires_parental_oversight?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          language?: string
          age?: number | null
          requires_parental_oversight?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // ユーザー作成ゲームテーブル  
      user_games: {
        Row: {
          id: string                          // UUID主キー
          creator_id: string                  // 作成者ID（profiles.id参照）
          title: string                       // ゲームタイトル
          description: string | null          // ゲーム説明
          template_id: string                 // テンプレートID
          game_data: Json                     // ゲーム設定・カスタマイズデータ
          thumbnail_url: string | null        // サムネイル画像URL
          is_published: boolean               // 公開状態
          is_featured: boolean                // 注目ゲームフラグ
          play_count: number                  // プレイ回数
          like_count: number                  // いいね数
          created_at: string                  // 作成日時
          updated_at: string                  // 更新日時
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          template_id: string
          game_data: Json
          thumbnail_url?: string | null
          is_published?: boolean
          is_featured?: boolean
          play_count?: number
          like_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          template_id?: string
          game_data?: Json
          thumbnail_url?: string | null
          is_published?: boolean
          is_featured?: boolean
          play_count?: number
          like_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // お気に入りゲームテーブル
      game_favorites: {
        Row: {
          user_id: string                     // ユーザーID（profiles.id参照）
          game_id: string                     // ゲームID（user_games.id参照）
          created_at: string                  // お気に入り追加日時
        }
        Insert: {
          user_id: string
          game_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          game_id?: string
          created_at?: string
        }
      }

      // プレイリストテーブル
      playlists: {
        Row: {
          id: string                          // UUID主キー
          creator_id: string                  // 作成者ID（profiles.id参照）
          title: string                       // プレイリストタイトル
          description: string | null          // プレイリスト説明
          is_public: boolean                  // 公開状態
          created_at: string                  // 作成日時
          updated_at: string                  // 更新日時
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // プレイリスト内ゲームテーブル
      playlist_games: {
        Row: {
          playlist_id: string                 // プレイリストID（playlists.id参照）
          game_id: string                     // ゲームID（user_games.id参照）
          order_index: number                 // 並び順
          created_at: string                  // 追加日時
        }
        Insert: {
          playlist_id: string
          game_id: string
          order_index: number
          created_at?: string
        }
        Update: {
          playlist_id?: string
          game_id?: string
          order_index?: number
          created_at?: string
        }
      }

      // ゲームスコア記録テーブル（将来実装用）
      game_scores: {
        Row: {
          id: string                          // UUID主キー
          user_id: string                     // ユーザーID（profiles.id参照）
          game_id: string                     // ゲームID（user_games.id参照）
          score: number                       // スコア
          completed: boolean                  // クリア状態
          play_time_seconds: number           // プレイ時間（秒）
          created_at: string                  // 記録日時
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          score: number
          completed?: boolean
          play_time_seconds: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          score?: number
          completed?: boolean
          play_time_seconds?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 便利な型エイリアス
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type UserGame = Database['public']['Tables']['user_games']['Row']
export type UserGameInsert = Database['public']['Tables']['user_games']['Insert']
export type UserGameUpdate = Database['public']['Tables']['user_games']['Update']

export type GameFavorite = Database['public']['Tables']['game_favorites']['Row']
export type GameFavoriteInsert = Database['public']['Tables']['game_favorites']['Insert']

export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update']

export type PlaylistGame = Database['public']['Tables']['playlist_games']['Row']
export type PlaylistGameInsert = Database['public']['Tables']['playlist_games']['Insert']

export type GameScore = Database['public']['Tables']['game_scores']['Row']
export type GameScoreInsert = Database['public']['Tables']['game_scores']['Insert']

// ゲームテンプレート型定義（既存システムとの互換性）
export type GameTemplateType = 
  | 'cute_tap'           // S1: キュートタップ
  | 'lovely_dodge'       // S2: ラブリードッジ
  | 'sweet_match'        // S3: スイートマッチ
  | 'happy_rhythm'       // S4: ハッピーリズム
  | 'cutie_choice'       // S5: キューティーチョイス
  | 'dreamy_jump'        // A1: ドリーミージャンプ
  | 'magical_collect'    // A2: マジカルカレクト
  | 'friendly_shoot'     // A3: フレンドリーシュート
  | 'animal_chase'       // A4: アニマルチェイス
  | 'perfect_timing'     // A5: パーフェクトタイミング
  | 'rainbow_match'      // A6: レインボーマッチ
  | 'puzzle_princess'    // A7: パズルプリンセス
  | 'memory_friends'     // A8: メモリーフレンズ
  | 'speed_friend'       // B1: スピードフレンド
  | 'spot_difference'    // B2: スポットザディファレンス
  | 'opposite_action'    // B3: オポジットアクション
  | 'count_star'         // B4: カウントスター
  | 'number_hunt'        // B5: ナンバーハント
  | 'order_master'       // B6: オーダーマスター
  | 'size_perfect'       // B7: サイズパーフェクト

// ゲームデータの型定義（JSONデータ用）
export interface GameDataConfig {
  templateType: GameTemplateType
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number              // ゲーム時間（秒）
  settings: Record<string, any> // テンプレート固有設定
  assets: {
    characters?: string[]       // キャラクター画像URL
    backgrounds?: string[]      // 背景画像URL
    sounds?: string[]          // 音声ファイルURL
    effects?: string[]         // エフェクト設定
  }
  customization: {
    colors?: Record<string, string>      // カラーカスタマイズ
    texts?: Record<string, string>       // テキストカスタマイズ
    animations?: Record<string, any>     // アニメーション設定
  }
}

// 年齢制限関連の型
export type AgeGroup = '0-12' | '13-15' | '16-18' | '19+'
export interface ContentRating {
  ageGroup: AgeGroup
  requiresParentalConsent: boolean
  contentWarnings?: string[]
}

// ユーザー権限の型
export type UserRole = 'user' | 'creator' | 'moderator' | 'admin'

// エラー型定義
export interface DatabaseError {
  code: string
  message: string
  details?: string
  hint?: string
}

// 検索・フィルター用の型
export interface GameFilter {
  templateType?: GameTemplateType[]
  difficulty?: ('easy' | 'medium' | 'hard')[]
  ageGroup?: AgeGroup[]
  isPublished?: boolean
  createdAfter?: string
  createdBefore?: string
}

export interface GameSearchParams {
  query?: string
  filter?: GameFilter
  sortBy?: 'created_at' | 'updated_at' | 'play_count' | 'like_count'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// API レスポンス型
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  hasMore: boolean
  nextOffset?: number
}

export interface GameWithProfile extends UserGame {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
}

export interface PlaylistWithGames extends Playlist {
  playlist_games: (PlaylistGame & {
    user_games: GameWithProfile
  })[]
}

// 統計情報の型
export interface UserStats {
  gamesCreated: number
  totalPlays: number
  totalLikes: number
  playlistsCreated: number
  favoriteGames: number
}

export interface GameStats {
  playCount: number
  likeCount: number
  favoriteCount: number
  averagePlayTime: number
  completionRate: number
}

// リアルタイム更新用の型
export interface RealtimePayload<T = any> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: T
  old?: T
}