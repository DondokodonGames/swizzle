// src/social/services/SupabaseRealtimeService.ts
// 🆕 新規: Supabase Realtimeを使用したリアルタイム更新サービス

import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeStats {
  connected: boolean;
  subscribedChannels: number;
  messagesReceived: number;
  lastActivity?: string;
}

export interface LikeUpdate {
  gameId: string;
  userId: string;
  isLiked: boolean;
  newCount: number;
  timestamp: string;
}

export interface FollowUpdate {
  followerId: string;
  followingId: string;
  isFollowing: boolean;
  newCount: number;
  timestamp: string;
}

export interface NotificationUpdate {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  gameId?: string;
  timestamp: string;
}

export interface GameUpdate {
  gameId: string;
  field: string;
  value: any;
  timestamp: string;
}

export type RealtimeEventHandler<T> = (payload: T) => void;

/**
 * Supabase Realtimeサービス
 * データベースの変更をリアルタイムで監視し、UIを自動更新
 */
export class SupabaseRealtimeService {
  private static instance: SupabaseRealtimeService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private stats: RealtimeStats = {
    connected: false,
    subscribedChannels: 0,
    messagesReceived: 0
  };

  static getInstance(): SupabaseRealtimeService {
    if (!SupabaseRealtimeService.instance) {
      SupabaseRealtimeService.instance = new SupabaseRealtimeService();
    }
    return SupabaseRealtimeService.instance;
  }

  constructor() {
    // 初期化時にSupabase接続状態を監視
    this.initializeConnectionMonitoring();
  }

  // ==================== 接続監視 ====================

  /**
   * Supabase接続状態の監視を開始
   */
  private initializeConnectionMonitoring(): void {
    // Supabaseの接続状態変更を監視
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.stats.connected = true;
        console.log('Supabase Realtime: User signed in');
      } else if (event === 'SIGNED_OUT') {
        this.stats.connected = false;
        this.cleanup();
        console.log('Supabase Realtime: User signed out, channels cleaned up');
      }
    });
  }

  // ==================== いいね機能 ====================

  /**
   * ゲームのいいねをリアルタイム監視
   * @param gameId 監視するゲームID
   * @param callback いいね変更時のコールバック
   * @returns unsubscribe関数
   */
  subscribeLikes(
    gameId: string, 
    callback: RealtimeEventHandler<LikeUpdate>
  ): () => void {
    const channelName = `likes:${gameId}`;
    
    // 既存のチャンネルがあれば削除
    if (this.channels.has(channelName)) {
      this.unsubscribeChannel(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'likes',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          this.stats.messagesReceived++;
          this.stats.lastActivity = new Date().toISOString();

          console.log('Like update received:', payload);

          // ペイロードをLikeUpdate型に変換
          const likeUpdate: LikeUpdate = {
            gameId: payload.new?.game_id || payload.old?.game_id,
            userId: payload.new?.user_id || payload.old?.user_id,
            isLiked: payload.eventType === 'INSERT',
            newCount: 0, // カウントは別途取得が必要
            timestamp: new Date().toISOString()
          };

          callback(likeUpdate);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to likes for game: ${gameId}`);
          this.stats.subscribedChannels = this.channels.size;
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to likes for game: ${gameId}`);
        }
      });

    this.channels.set(channelName, channel);

    // unsubscribe関数を返す
    return () => this.unsubscribeChannel(channelName);
  }

  // ==================== フォロー機能 ====================

  /**
   * ユーザーのフォローをリアルタイム監視
   * @param userId 監視するユーザーID
   * @param callback フォロー変更時のコールバック
   * @returns unsubscribe関数
   */
  subscribeFollows(
    userId: string,
    callback: RealtimeEventHandler<FollowUpdate>
  ): () => void {
    const channelName = `follows:${userId}`;
    
    // 既存のチャンネルがあれば削除
    if (this.channels.has(channelName)) {
      this.unsubscribeChannel(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${userId}` // このユーザーをフォローする人
        },
        (payload) => {
          this.stats.messagesReceived++;
          this.stats.lastActivity = new Date().toISOString();

          console.log('Follow update received:', payload);

          const followUpdate: FollowUpdate = {
            followerId: payload.new?.follower_id || payload.old?.follower_id,
            followingId: payload.new?.following_id || payload.old?.following_id,
            isFollowing: payload.eventType === 'INSERT',
            newCount: 0, // カウントは別途取得が必要
            timestamp: new Date().toISOString()
          };

          callback(followUpdate);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to follows for user: ${userId}`);
          this.stats.subscribedChannels = this.channels.size;
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribeChannel(channelName);
  }

  // ==================== 通知機能 ====================

  /**
   * ユーザーの通知をリアルタイム監視
   * @param userId 監視するユーザーID
   * @param callback 通知追加時のコールバック
   * @returns unsubscribe関数
   */
  subscribeNotifications(
    userId: string,
    callback: RealtimeEventHandler<NotificationUpdate>
  ): () => void {
    const channelName = `notifications:${userId}`;
    
    // 既存のチャンネルがあれば削除
    if (this.channels.has(channelName)) {
      this.unsubscribeChannel(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // 新しい通知のみ
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          this.stats.messagesReceived++;
          this.stats.lastActivity = new Date().toISOString();

          console.log('Notification received:', payload);

          const notificationUpdate: NotificationUpdate = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            gameId: payload.new.game_id,
            timestamp: payload.new.created_at
          };

          callback(notificationUpdate);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to notifications for user: ${userId}`);
          this.stats.subscribedChannels = this.channels.size;
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribeChannel(channelName);
  }

  // ==================== ゲーム更新 ====================

  /**
   * ゲーム情報の更新をリアルタイム監視
   * @param gameId 監視するゲームID
   * @param callback ゲーム更新時のコールバック
   * @returns unsubscribe関数
   */
  subscribeGameUpdates(
    gameId: string,
    callback: RealtimeEventHandler<GameUpdate>
  ): () => void {
    const channelName = `game:${gameId}`;
    
    // 既存のチャンネルがあれば削除
    if (this.channels.has(channelName)) {
      this.unsubscribeChannel(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          this.stats.messagesReceived++;
          this.stats.lastActivity = new Date().toISOString();

          console.log('Game update received:', payload);

          // 変更されたフィールドを検出
          const oldData = payload.old || {};
          const newData = payload.new || {};
          
          Object.keys(newData).forEach(field => {
            if (newData[field] !== oldData[field]) {
              const gameUpdate: GameUpdate = {
                gameId,
                field,
                value: newData[field],
                timestamp: new Date().toISOString()
              };

              callback(gameUpdate);
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to game updates for game: ${gameId}`);
          this.stats.subscribedChannels = this.channels.size;
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribeChannel(channelName);
  }

  // ==================== ユーザープレゼンス（オンライン状態）====================

  /**
   * ユーザーのオンライン状態を監視
   * @param callback プレゼンス変更時のコールバック
   * @returns unsubscribe関数
   */
  subscribeUserPresence(
    callback: (payload: any) => void
  ): () => void {
    const channelName = 'user-presence';
    
    // 既存のチャンネルがあれば削除
    if (this.channels.has(channelName)) {
      this.unsubscribeChannel(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence state:', state);
        callback(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        callback({ event: 'join', key, newPresences });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        callback({ event: 'leave', key, leftPresences });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to user presence');
          this.stats.subscribedChannels = this.channels.size;

          // 現在のユーザーの存在を通知
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            channel.track({
              user_id: user.id,
              online_at: new Date().toISOString()
            });
          }
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribeChannel(channelName);
  }

  // ==================== ユーティリティ ====================

  /**
   * 特定のチャンネルの購読解除
   */
  private unsubscribeChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
      this.stats.subscribedChannels = this.channels.size;
      console.log(`Unsubscribed from channel: ${channelName}`);
    }
  }

  /**
   * すべてのチャンネルをクリーンアップ
   */
  cleanup(): void {
    console.log('Cleaning up all Realtime channels...');
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
      console.log(`Unsubscribed from: ${name}`);
    });
    this.channels.clear();
    this.stats.subscribedChannels = 0;
    console.log('All Realtime channels cleaned up');
  }

  /**
   * 統計情報を取得
   */
  getStats(): RealtimeStats {
    return { ...this.stats };
  }

  /**
   * 接続状態を確認
   */
  isConnected(): boolean {
    return this.stats.connected;
  }

  /**
   * アクティブなチャンネル一覧を取得
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}