// src/social/services/NotificationService.ts - Notification API修正版

// 通知型定義
export interface GameNotification {
  id: string;
  type: 'reaction' | 'like' | 'follow' | 'trending' | 'comment' | 'milestone';
  title: string;
  message: string;
  icon: string;
  gameId?: string;
  userId?: string;
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
  private notifications: GameNotification[] = [];
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

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.loadSettings();
    this.loadNotifications();
    this.setupBrowserNotifications();
  }

  // イベントリスナー管理
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

  // 設定管理
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.emit('settingsUpdated', this.settings);
    
    // ブラウザ通知権限の管理
    if (newSettings.browserNotifications && Notification.permission === 'default') {
      this.requestBrowserPermission();
    }
  }

  private loadSettings() {
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
    try {
      localStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // 通知作成
  async createNotification(
    type: GameNotification['type'], 
    gameId: string, 
    userId: string, 
    metadata: any = {}
  ): Promise<GameNotification> {
    // 設定チェック
    if (!this.isNotificationEnabled(type)) {
      console.log(`Notification type ${type} is disabled`);
      return null as any;
    }

    const notification: GameNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: this.getNotificationTitle(type, metadata),
      message: this.getNotificationMessage(type, metadata),
      icon: this.getNotificationIcon(type),
      gameId,
      userId,
      metadata,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: this.getExpirationDate(type)
    };

    // 通知を追加
    this.notifications.unshift(notification);
    
    // 最大100件に制限
    this.notifications = this.notifications.slice(0, 100);
    
    this.saveNotifications();
    this.emit('notificationAdded', notification);

    // ブラウザ通知表示
    if (this.settings.browserNotifications) {
      this.showBrowserNotification(notification);
    }

    // サウンド再生
    if (this.settings.soundEnabled) {
      this.playNotificationSound(type);
    }

    console.log(`Notification created: ${type} for game ${gameId}`);
    return notification;
  }

  // 通知読み取り
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.saveNotifications();
      this.emit('notificationRead', notification);
      return true;
    }
    return false;
  }

  // 全て既読
  markAllAsRead(): number {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    unreadNotifications.forEach(notification => {
      notification.isRead = true;
    });
    
    if (unreadNotifications.length > 0) {
      this.saveNotifications();
      this.emit('allNotificationsRead', unreadNotifications.length);
    }
    
    return unreadNotifications.length;
  }

  // 通知削除
  deleteNotification(notificationId: string): boolean {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const deleted = this.notifications.splice(index, 1)[0];
      this.saveNotifications();
      this.emit('notificationDeleted', deleted);
      return true;
    }
    return false;
  }

  // 期限切れ通知のクリーンアップ
  cleanupExpiredNotifications(): number {
    const now = new Date().toISOString();
    const beforeCount = this.notifications.length;
    
    this.notifications = this.notifications.filter(notification => 
      !notification.expiresAt || notification.expiresAt > now
    );
    
    const cleanedCount = beforeCount - this.notifications.length;
    if (cleanedCount > 0) {
      this.saveNotifications();
      this.emit('notificationsCleanedUp', cleanedCount);
    }
    
    return cleanedCount;
  }

  // 通知取得
  getNotifications(limit: number = 50): GameNotification[] {
    this.cleanupExpiredNotifications();
    return this.notifications.slice(0, limit);
  }

  getUnreadNotifications(): GameNotification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  // 統計取得
  getStats(): NotificationStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      unreadCount: this.notifications.filter(n => !n.isRead).length,
      totalCount: this.notifications.length,
      todayCount: this.notifications.filter(n => 
        new Date(n.createdAt) >= today
      ).length,
      weekCount: this.notifications.filter(n => 
        new Date(n.createdAt) >= weekAgo
      ).length
    };
  }

  // 通知タイプ別の有効性チェック
  private isNotificationEnabled(type: GameNotification['type']): boolean {
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

  // 通知コンテンツ生成
  private getNotificationTitle(type: GameNotification['type'], metadata: any): string {
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

  private getNotificationMessage(type: GameNotification['type'], metadata: any): string {
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

  private getNotificationIcon(type: GameNotification['type']): string {
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

  private getExpirationDate(type: GameNotification['type']): string {
    const now = new Date();
    const expiration = new Date(now);
    
    switch (type) {
      case 'trending':
        expiration.setDate(now.getDate() + 3); // 3日
        break;
      case 'milestone':
        expiration.setDate(now.getDate() + 7); // 1週間
        break;
      default:
        expiration.setDate(now.getDate() + 30); // 30日
    }
    
    return expiration.toISOString();
  }

  // ブラウザ通知
  private async setupBrowserNotifications() {
    if ('Notification' in window && this.settings.browserNotifications) {
      if (Notification.permission === 'default') {
        await this.requestBrowserPermission();
      }
    }
  }

  private async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  private showBrowserNotification(notification: GameNotification) {
    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // またはアプリのアイコンパス
        badge: '/badge-icon.png',
        tag: notification.id,
        // 🔧 修正: 'renotify'プロパティを削除（標準ではサポートされていない）
        requireInteraction: false,
        silent: !this.settings.soundEnabled
      });

      // クリック時の動作
      browserNotification.onclick = () => {
        window.focus();
        if (notification.gameId) {
          // 実装時はルーターを使用してゲームページに移動
          console.log(`Navigate to game: ${notification.gameId}`);
        }
        browserNotification.close();
        this.markAsRead(notification.id);
      };

      // 自動で閉じる
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  // サウンド再生
  private playNotificationSound(type: GameNotification['type']) {
    if (!this.settings.soundEnabled) return;

    try {
      // 🔧 修正: 通知音の選択（'comment'を削除）
      const soundMap = {
        reaction: '/sounds/reaction.mp3',
        like: '/sounds/like.mp3',
        follow: '/sounds/follow.mp3',
        trending: '/sounds/trending.mp3',
        milestone: '/sounds/milestone.mp3'
      };

      const soundFile = soundMap[type as keyof typeof soundMap] || '/sounds/notification.mp3';
      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      
      // エラーハンドリング
      audio.addEventListener('error', () => {
        console.log('Notification sound not available, using default');
        // フォールバック：ビープ音
        this.playBeepSound();
      });

      audio.play().catch(() => {
        // 音声再生に失敗した場合のフォールバック
        this.playBeepSound();
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  private playBeepSound() {
    try {
      // Web Audio APIを使用したシンプルなビープ音
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // データ永続化
  private loadNotifications() {
    try {
      const saved = localStorage.getItem('game_notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.cleanupExpiredNotifications();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  private saveNotifications() {
    try {
      localStorage.setItem('game_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // 特定の通知タイプのクリエイター向けヘルパー
  async notifyGameReaction(gameId: string, gameName: string, userId: string, userName: string, reactionType: string) {
    return this.createNotification('reaction', gameId, userId, {
      gameName,
      userName,
      reactionType
    });
  }

  async notifyGameLike(gameId: string, gameName: string, userId: string, userName: string) {
    return this.createNotification('like', gameId, userId, {
      gameName,
      userName
    });
  }

  async notifyNewFollower(userId: string, userName: string) {
    return this.createNotification('follow', '', userId, {
      userName
    });
  }

  async notifyTrendingRank(gameId: string, gameName: string, rank: number) {
    return this.createNotification('trending', gameId, '', {
      gameName,
      rank
    });
  }

  async notifyMilestone(gameId: string, gameName: string, count: number, type: string) {
    return this.createNotification('milestone', gameId, '', {
      gameName,
      count,
      type
    });
  }

  // 定期クリーンアップの設定
  startPeriodicCleanup(intervalMs: number = 24 * 60 * 60 * 1000) { // デフォルト24時間
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, intervalMs);
  }
}