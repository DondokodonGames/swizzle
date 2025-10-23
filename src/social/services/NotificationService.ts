// src/social/services/NotificationService.ts - 既存supabaseインスタンス使用版
// localStorage + Supabase ハイブリッド実装

import { supabase } from '../../lib/supabase';

// 通知型定義
export type NotificationType = 'reaction' | 'like' | 'follow' | 'trending' | 'milestone';

export interface GameNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  gameId?: string;
  userId?: string;
  fromUserId?: string;
  metadata?: {
    gameName?: string;
    userName?: string;
    reactionType?: string;
    count?: number;
    rank?: number;
  };
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationSettings {
  reactions: boolean;
  likes: boolean;
  follows: boolean;
  trending: boolean;
  milestones: boolean;
  browserNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
}

export interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  todayCount: number;
  weekCount: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private localNotifications: GameNotification[] = [];
  private settings: NotificationSettings = {
    reactions: true,
    likes: true,
    follows: true,
    trending: true,
    milestones: true,
    browserNotifications: true,
    emailNotifications: false,
    soundEnabled: true
  };
  private eventListeners: { [key: string]: Function[] } = {};
  private realtimeSubscription: any = null;
  private currentUserId: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.loadSettings();
    this.loadLocalNotifications();
    this.setupBrowserNotifications();
  }

  // ==================== 初期化・認証 ====================

  async initialize(userId: string) {
    this.currentUserId = userId;
    await this.loadSupabaseNotifications();
    this.subscribeToRealtimeNotifications();
  }

  cleanup() {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }
    this.currentUserId = null;
  }

  // ==================== イベントリスナー管理 ====================

  on(event: string, callback: Function) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // ==================== 設定管理 ====================

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.emit('settingsUpdated', this.settings);
    
    if (newSettings.browserNotifications && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
      this.requestBrowserPermission();
    }
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('notification_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // ==================== ローカル通知作成 ====================

  async createLocalNotification(
    type: NotificationType,
    gameId: string,
    metadata: any = {}
  ): Promise<GameNotification | null> {
    if (!this.isNotificationEnabled(type)) {
      console.log(`Notification type ${type} is disabled`);
      return null;
    }

    const notification: GameNotification = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: this.getNotificationTitle(type, metadata),
      message: this.getNotificationMessage(type, metadata),
      icon: this.getNotificationIcon(type),
      gameId,
      metadata,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: this.getExpirationDate(type)
    };

    this.localNotifications.unshift(notification);
    this.localNotifications = this.localNotifications.slice(0, 100);
    
    this.saveLocalNotifications();
    this.emit('notificationAdded', notification);

    if (this.settings.browserNotifications) {
      this.showBrowserNotification(notification);
    }

    if (this.settings.soundEnabled) {
      this.playNotificationSound(type);
    }

    console.log(`Local notification created: ${type} for game ${gameId}`);
    return notification;
  }

  // ==================== Supabase通知作成 ====================

  async createSupabaseNotification(
    toUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: {
      gameId?: string;
      fromUserId?: string;
      metadata?: any;
      icon?: string;
      expiresAt?: string;
    } = {}
  ): Promise<any | null> {
    try {
      const notificationData: any = {
        user_id: toUserId,
        type,
        title,
        message,
        icon: options.icon || this.getNotificationIcon(type),
        game_id: options.gameId,
        from_user_id: options.fromUserId,
        metadata: options.metadata,
        is_read: false,
        expires_at: options.expiresAt || this.getExpirationDate(type)
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating Supabase notification:', error);
        return null;
      }

      console.log(`Supabase notification created for user ${toUserId}`);
      return data;

    } catch (error) {
      console.error('Error creating Supabase notification:', error);
      return null;
    }
  }

  // ==================== 通知取得 ====================

  async getNotifications(limit: number = 50): Promise<GameNotification[]> {
    this.cleanupExpiredLocalNotifications();

    if (!this.currentUserId) {
      return this.localNotifications.slice(0, limit);
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching Supabase notifications:', error);
        return this.localNotifications.slice(0, limit);
      }

      const supabaseNotifications: GameNotification[] = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        icon: n.icon || this.getNotificationIcon(n.type),
        gameId: n.game_id || undefined,
        userId: n.user_id,
        fromUserId: n.from_user_id || undefined,
        metadata: n.metadata as any,
        isRead: n.is_read,
        createdAt: n.created_at,
        expiresAt: n.expires_at || undefined
      }));

      const allNotifications = [...supabaseNotifications, ...this.localNotifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      return allNotifications;

    } catch (error) {
      console.error('Error getting notifications:', error);
      return this.localNotifications.slice(0, limit);
    }
  }

  async getUnreadNotifications(): Promise<GameNotification[]> {
    const allNotifications = await this.getNotifications(100);
    return allNotifications.filter(n => !n.isRead);
  }

  // ==================== 通知操作 ====================

  async markAsRead(notificationId: string): Promise<boolean> {
    const localNotif = this.localNotifications.find(n => n.id === notificationId);
    if (localNotif) {
      if (!localNotif.isRead) {
        localNotif.isRead = true;
        this.saveLocalNotifications();
        this.emit('notificationRead', localNotif);
        return true;
      }
      return false;
    }

    if (!this.currentUserId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      this.emit('notificationRead', { id: notificationId });
      return true;

    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async markAllAsRead(): Promise<number> {
    let count = 0;

    const unreadLocal = this.localNotifications.filter(n => !n.isRead);
    unreadLocal.forEach(n => n.isRead = true);
    count += unreadLocal.length;
    
    if (unreadLocal.length > 0) {
      this.saveLocalNotifications();
    }

    if (this.currentUserId) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true } as any)
          .eq('user_id', this.currentUserId)
          .eq('is_read', false);

        if (!error) {
          const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', this.currentUserId)
            .eq('is_read', false);

          count += unreadCount || 0;
        }

      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    }

    if (count > 0) {
      this.emit('allNotificationsRead', count);
    }

    return count;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const localIndex = this.localNotifications.findIndex(n => n.id === notificationId);
    if (localIndex !== -1) {
      const deleted = this.localNotifications.splice(localIndex, 1)[0];
      this.saveLocalNotifications();
      this.emit('notificationDeleted', deleted);
      return true;
    }

    if (!this.currentUserId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      this.emit('notificationDeleted', { id: notificationId });
      return true;

    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // ==================== 統計取得 ====================

  async getStats(): Promise<NotificationStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allNotifications = await this.getNotifications(1000);

    return {
      unreadCount: allNotifications.filter(n => !n.isRead).length,
      totalCount: allNotifications.length,
      todayCount: allNotifications.filter(n => 
        new Date(n.createdAt) >= today
      ).length,
      weekCount: allNotifications.filter(n => 
        new Date(n.createdAt) >= weekAgo
      ).length
    };
  }

  // ==================== Supabaseリアルタイム購読 ====================

  private subscribeToRealtimeNotifications() {
    if (!this.currentUserId) return;

    this.realtimeSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          console.log('New notification received:', payload);
          const newNotif = payload.new;
          
          const gameNotif: GameNotification = {
            id: newNotif.id,
            type: newNotif.type,
            title: newNotif.title,
            message: newNotif.message,
            icon: newNotif.icon || this.getNotificationIcon(newNotif.type),
            gameId: newNotif.game_id || undefined,
            userId: newNotif.user_id,
            fromUserId: newNotif.from_user_id || undefined,
            metadata: newNotif.metadata as any,
            isRead: newNotif.is_read,
            createdAt: newNotif.created_at,
            expiresAt: newNotif.expires_at || undefined
          };

          this.emit('notificationAdded', gameNotif);

          if (this.settings.browserNotifications) {
            this.showBrowserNotification(gameNotif);
          }

          if (this.settings.soundEnabled) {
            this.playNotificationSound(newNotif.type);
          }
        }
      )
      .subscribe();

    console.log('Subscribed to realtime notifications');
  }

  private async loadSupabaseNotifications() {
    // 初回ロード（getNotifications内で実行されるため省略可能）
  }

  // ==================== 便利メソッド ====================

  async notifyGameLike(gameId: string, gameName: string, toUserId: string, fromUserId: string, fromUserName: string) {
    if (!this.isNotificationEnabled('like')) return;

    await this.createSupabaseNotification(
      toUserId,
      'like',
      'いいねされました！',
      `${fromUserName}さんが「${gameName}」にいいねしました`,
      {
        gameId,
        fromUserId,
        metadata: { gameName, userName: fromUserName }
      }
    );
  }

  async notifyNewFollower(toUserId: string, fromUserId: string, fromUserName: string) {
    if (!this.isNotificationEnabled('follow')) return;

    await this.createSupabaseNotification(
      toUserId,
      'follow',
      '新しいフォロワー',
      `${fromUserName}さんがあなたをフォローしました`,
      {
        fromUserId,
        metadata: { userName: fromUserName }
      }
    );
  }

  async notifyTrendingRank(gameId: string, gameName: string, rank: number) {
    return this.createLocalNotification('trending', gameId, {
      gameName,
      rank
    });
  }

  async notifyMilestone(gameId: string, gameName: string, count: number, type: string) {
    return this.createLocalNotification('milestone', gameId, {
      gameName,
      count,
      type
    });
  }

  // ==================== プライベートメソッド ====================

  private isNotificationEnabled(type: NotificationType): boolean {
    switch (type) {
      case 'reaction':
        return this.settings.reactions;
      case 'like':
        return this.settings.likes;
      case 'follow':
        return this.settings.follows;
      case 'trending':
        return this.settings.trending;
      case 'milestone':
        return this.settings.milestones;
      default:
        return true;
    }
  }

  private getNotificationTitle(type: NotificationType, metadata: any): string {
    switch (type) {
      case 'reaction':
        return 'リアクションが届きました！';
      case 'like':
        return 'いいねされました！';
      case 'follow':
        return '新しいフォロワー';
      case 'trending':
        return 'トレンドランクイン！';
      case 'milestone':
        return 'マイルストーン達成！';
      default:
        return '新しい通知';
    }
  }

  private getNotificationMessage(type: NotificationType, metadata: any): string {
    switch (type) {
      case 'reaction':
        return `${metadata.userName}さんが「${metadata.gameName}」に${metadata.reactionType}リアクションしました`;
      case 'like':
        return `${metadata.userName}さんが「${metadata.gameName}」にいいねしました`;
      case 'follow':
        return `${metadata.userName}さんがあなたをフォローしました`;
      case 'trending':
        return `「${metadata.gameName}」が${metadata.rank}位にランクインしました！`;
      case 'milestone':
        return `「${metadata.gameName}」が${metadata.count}${metadata.type}を達成しました！`;
      default:
        return '新しい活動があります';
    }
  }

  private getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'reaction':
        return '😄';
      case 'like':
        return '❤️';
      case 'follow':
        return '👤';
      case 'trending':
        return '📈';
      case 'milestone':
        return '🏆';
      default:
        return '🔔';
    }
  }

  private getExpirationDate(type: NotificationType): string {
    const now = new Date();
    const expiration = new Date(now);
    
    switch (type) {
      case 'trending':
        expiration.setDate(now.getDate() + 3);
        break;
      case 'milestone':
        expiration.setDate(now.getDate() + 7);
        break;
      default:
        expiration.setDate(now.getDate() + 30);
    }
    
    return expiration.toISOString();
  }

  private cleanupExpiredLocalNotifications(): number {
    const now = new Date().toISOString();
    const beforeCount = this.localNotifications.length;
    
    this.localNotifications = this.localNotifications.filter(notification => 
      !notification.expiresAt || notification.expiresAt > now
    );
    
    const cleanedCount = beforeCount - this.localNotifications.length;
    if (cleanedCount > 0) {
      this.saveLocalNotifications();
      this.emit('notificationsCleanedUp', cleanedCount);
    }
    
    return cleanedCount;
  }

  // ==================== ブラウザ通知 ====================

  private async setupBrowserNotifications() {
    if (typeof window !== 'undefined' && 'Notification' in window && this.settings.browserNotifications) {
      if (window.Notification.permission === 'default') {
        await this.requestBrowserPermission();
      }
    }
  }

  private async requestBrowserPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await window.Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  private showBrowserNotification(notification: GameNotification) {
    if (typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission !== 'granted') {
      return;
    }

    try {
      const browserNotification = new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/badge-icon.png',
        tag: notification.id,
        requireInteraction: false,
        silent: !this.settings.soundEnabled
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.gameId) {
          console.log(`Navigate to game: ${notification.gameId}`);
        }
        browserNotification.close();
        this.markAsRead(notification.id);
      };

      setTimeout(() => {
        browserNotification.close();
      }, 5000);

    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  // ==================== サウンド ====================

  private playNotificationSound(type: NotificationType) {
    if (!this.settings.soundEnabled || typeof window === 'undefined') return;

    try {
      const soundMap: Record<NotificationType, string> = {
        reaction: '/sounds/reaction.mp3',
        like: '/sounds/like.mp3',
        follow: '/sounds/follow.mp3',
        trending: '/sounds/trending.mp3',
        milestone: '/sounds/milestone.mp3'
      };

      const soundFile = soundMap[type] || '/sounds/notification.mp3';
      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      
      audio.addEventListener('error', () => {
        this.playBeepSound();
      });

      audio.play().catch(() => {
        this.playBeepSound();
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  private playBeepSound() {
    if (typeof window === 'undefined') return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing beep sound:', error);
    }
  }

  // ==================== データ永続化 ====================

  private loadLocalNotifications() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('game_notifications');
      if (saved) {
        this.localNotifications = JSON.parse(saved);
        this.cleanupExpiredLocalNotifications();
      }
    } catch (error) {
      console.error('Error loading local notifications:', error);
      this.localNotifications = [];
    }
  }

  private saveLocalNotifications() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('game_notifications', JSON.stringify(this.localNotifications));
    } catch (error) {
      console.error('Error saving local notifications:', error);
    }
  }

  // ==================== 定期クリーンアップ ====================

  startPeriodicCleanup(intervalMs: number = 24 * 60 * 60 * 1000) {
    setInterval(() => {
      this.cleanupExpiredLocalNotifications();
    }, intervalMs);
  }
}