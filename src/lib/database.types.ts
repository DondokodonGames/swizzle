// src/lib/database.types.ts
// Supabase データベース型定義（ソーシャル機能追加版）
// 技術設計書のスキーマに基づく型安全性確保
// 🔧 Phase 2: activitiesテーブル追加（UserActivityFeed完全実装）
// 🆕 Phase 3: reactions, user_preferencesテーブル追加

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
      // 注: この型は不完全（category/review_status/game_type/mechanic/theme/trend_source等、
      // 後続migrationで追加された列が未反映）。WP60 P0-5 で id が UUID ではなく TEXT である
      // ことが判明したため修正した（根拠: supabase/migrations/20260101_schema_drift_backfill.sql
      // のコメント参照）。全列の完全な反映は別タスク。
      user_games: {
        Row: {
          id: string                          // TEXT主キー（UUID形式とは限らない）
          creator_id: string                  // 作成者ID（profiles.id参照）
          title: string                       // ゲームタイトル
          description: string | null          // ゲーム説明
          template_id: string                 // テンプレートID
          project_data: Json | null           // 🔧 追加: 完全なGameProjectデータ
          thumbnail_url: string | null        // サムネイル画像URL
          is_published: boolean               // 公開状態
          is_featured: boolean                // 注目ゲームフラグ
          play_count: number                  // プレイ回数
          like_count: number                  // いいね数
          ai_generated: boolean               // AI一括生成ゲームかどうか
          ai_quality_score: number | null      // AI品質スコア
          created_at: string                  // 作成日時
          updated_at: string                  // 更新日時
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          template_id: string
          project_data?: Json | null          // 🔧 追加
          thumbnail_url?: string | null
          is_published?: boolean
          is_featured?: boolean
          play_count?: number
          like_count?: number
          ai_generated?: boolean
          ai_quality_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          template_id?: string
          project_data?: Json | null          // 🔧 追加
          thumbnail_url?: string | null
          is_published?: boolean
          is_featured?: boolean
          play_count?: number
          like_count?: number
          ai_generated?: boolean
          ai_quality_score?: number | null
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

      // いいねテーブル
      likes: {
        Row: {
          user_id: string                     // ユーザーID（auth.users参照）
          game_id: string                     // ゲームID（user_games.id参照）
          created_at: string                  // いいね日時
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

      // フォローテーブル
      follows: {
        Row: {
          follower_id: string                 // フォローするユーザーID（auth.users参照）
          following_id: string                // フォローされるユーザーID（auth.users参照）
          created_at: string                  // フォロー日時
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }

      // 通知テーブル
      notifications: {
        Row: {
          id: string                          // UUID主キー
          user_id: string                     // 通知を受け取るユーザーID
          type: 'reaction' | 'like' | 'follow' | 'trending' | 'milestone' // 通知タイプ
          title: string                       // 通知タイトル
          message: string                     // 通知メッセージ
          icon: string | null                 // 通知アイコン（絵文字）
          game_id: string | null              // 関連するゲームID
          from_user_id: string | null         // 通知の送信元ユーザーID
          metadata: Json | null               // 追加メタデータ
          is_read: boolean                    // 既読フラグ
          created_at: string                  // 通知作成日時
          expires_at: string | null           // 通知の有効期限
        }
        Insert: {
          id?: string
          user_id: string
          type: 'reaction' | 'like' | 'follow' | 'trending' | 'milestone'
          title: string
          message: string
          icon?: string | null
          game_id?: string | null
          from_user_id?: string | null
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'reaction' | 'like' | 'follow' | 'trending' | 'milestone'
          title?: string
          message?: string
          icon?: string | null
          game_id?: string | null
          from_user_id?: string | null
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
          expires_at?: string | null
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

      // ゲームシェアテーブル
      game_shares: {
        Row: {
          id: string                          // UUID主キー
          user_id: string                     // ユーザーID
          game_id: string                     // ゲームID
          platform: string                    // シェアプラットフォーム
          shared_at: string                   // シェア日時
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          platform: string
          shared_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          platform?: string
          shared_at?: string
        }
      }

      // アクティビティテーブル（UserActivityFeed用）
      activities: {
        Row: {
          id: string                                    // UUID主キー
          user_id: string                               // ユーザーID
          activity_type: 'game_created' | 'game_liked' | 'game_shared' | 
                         'user_followed' | 'achievement' | 'comment' | 
                         'reaction' | 'milestone' | 'collaboration'
          target_type: 'game' | 'user' | null           // ターゲットタイプ
          target_id: string | null                      // ターゲットID
          content: string | null                        // アクティビティ内容
          metadata: Json                                // 追加メタデータ
          is_public: boolean                            // 公開状態
          created_at: string                            // 作成日時
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: 'game_created' | 'game_liked' | 'game_shared' | 
                         'user_followed' | 'achievement' | 'comment' | 
                         'reaction' | 'milestone' | 'collaboration'
          target_type?: 'game' | 'user' | null
          target_id?: string | null
          content?: string | null
          metadata?: Json
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: 'game_created' | 'game_liked' | 'game_shared' | 
                          'user_followed' | 'achievement' | 'comment' | 
                          'reaction' | 'milestone' | 'collaboration'
          target_type?: 'game' | 'user' | null
          target_id?: string | null
          content?: string | null
          metadata?: Json
          is_public?: boolean
          created_at?: string
        }
      }

      // 🆕 Phase 3: リアクションテーブル（SimpleReactionSystem用）
      reactions: {
        Row: {
          id: string                                    // UUID主キー
          user_id: string                               // ユーザーID
          game_id: string                               // ゲームID
          reaction_type: 'completed' | 'fun' | 'amazing' | 'difficult' | 'addictive' | 'creative'
          created_at: string                            // 作成日時
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          reaction_type: 'completed' | 'fun' | 'amazing' | 'difficult' | 'addictive' | 'creative'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          reaction_type?: 'completed' | 'fun' | 'amazing' | 'difficult' | 'addictive' | 'creative'
          created_at?: string
        }
      }

      // 🆕 Phase 3: ユーザー設定テーブル（ContentDiscovery用）
      user_preferences: {
        Row: {
          user_id: string                               // ユーザーID（主キー）
          favorite_categories: string[]                 // お気に入りカテゴリ
          play_time: 'short' | 'medium' | 'long'       // プレイ時間設定
          difficulty: 'easy' | 'medium' | 'hard'       // 難易度設定
          gameplay_style: string[]                      // ゲームプレイスタイル
          interaction_history: Json                     // 行動履歴（JSONB）
          created_at: string                            // 作成日時
          updated_at: string                            // 更新日時
        }
        Insert: {
          user_id: string
          favorite_categories?: string[]
          play_time?: 'short' | 'medium' | 'long'
          difficulty?: 'easy' | 'medium' | 'hard'
          gameplay_style?: string[]
          interaction_history?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          favorite_categories?: string[]
          play_time?: 'short' | 'medium' | 'long'
          difficulty?: 'easy' | 'medium' | 'hard'
          gameplay_style?: string[]
          interaction_history?: Json
          created_at?: string
          updated_at?: string
        }
      }

      // UGC通報テーブル（WP60 P0-3）
      game_reports: {
        Row: {
          id: string
          game_id: string
          reporter_id: string | null
          reason: string
          detail: string | null
          status: 'open' | 'resolved' | 'dismissed'
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          game_id: string
          reporter_id?: string | null
          reason: string
          detail?: string | null
          status?: 'open' | 'resolved' | 'dismissed'
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          reporter_id?: string | null
          reason?: string
          detail?: string | null
          status?: 'open' | 'resolved' | 'dismissed'
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // 便利関数の型定義
      get_like_count: {
        Args: { p_game_id: string }
        Returns: number
      }
      get_follower_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_following_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_liked: {
        Args: { p_user_id: string; p_game_id: string }
        Returns: boolean
      }
      is_following: {
        Args: { p_follower_id: string; p_following_id: string }
        Returns: boolean
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      cleanup_expired_notifications: {
        Args: Record<string, never>
        Returns: number
      }
      // 🆕 Phase 3: リアクション統計関数
      get_reaction_stats: {
        Args: { p_game_id: string; p_user_id?: string }
        Returns: Json
      }
      // 🆕 Phase 3: 行動履歴更新関数
      update_interaction_history: {
        Args: { p_user_id: string; p_action: string; p_target_id: string }
        Returns: void
      }
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

// ソーシャル機能の型エイリアス
export type Like = Database['public']['Tables']['likes']['Row']
export type LikeInsert = Database['public']['Tables']['likes']['Insert']

export type Follow = Database['public']['Tables']['follows']['Row']
export type FollowInsert = Database['public']['Tables']['follows']['Insert']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update']

export type PlaylistGame = Database['public']['Tables']['playlist_games']['Row']
export type PlaylistGameInsert = Database['public']['Tables']['playlist_games']['Insert']

export type GameShare = Database['public']['Tables']['game_shares']['Row']
export type GameShareInsert = Database['public']['Tables']['game_shares']['Insert']

// アクティビティの型エイリアス
export type Activity = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export type ActivityType = Database['public']['Tables']['activities']['Row']['activity_type']

// 🆕 Phase 3: リアクションの型エイリアス
export type Reaction = Database['public']['Tables']['reactions']['Row']
export type ReactionInsert = Database['public']['Tables']['reactions']['Insert']
export type ReactionUpdate = Database['public']['Tables']['reactions']['Update']

export type ReactionType = Database['public']['Tables']['reactions']['Row']['reaction_type']

// 🆕 Phase 3: ユーザー設定の型エイリアス
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

// 通知タイプ
export type NotificationType = Database['public']['Tables']['notifications']['Row']['type']

// 🆕 Phase 3: インタラクション履歴の型
export interface InteractionHistory {
  likedGames: string[]
  playedGames: string[]
  sharedGames: string[]
  searchTerms: string[]
}

// 🆕 Phase 3: リアクション統計の型
export interface ReactionStats {
  [key: string]: {
    count: number
    userReacted: boolean
  }
}

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

// ソーシャル機能拡張型
export interface UserGameWithSocialData extends UserGame {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
  is_liked?: boolean
  is_bookmarked?: boolean
  likes_count?: number
}

export interface ProfileWithStats extends Profile {
  follower_count?: number
  following_count?: number
  games_count?: number
  total_likes?: number
  total_plays?: number
}

export interface NotificationWithUser extends Notification {
  from_user?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
  game?: Pick<UserGame, 'title' | 'thumbnail_url'>
}

// 統計情報の型
export interface UserStats {
  gamesCreated: number
  totalPlays: number
  totalLikes: number
  playlistsCreated: number
  favoriteGames: number
  followerCount?: number
  followingCount?: number
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