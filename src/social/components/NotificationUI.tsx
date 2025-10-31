// src/social/components/NotificationUI.tsx
// 🔧 修正版: React Routerでゲームページ遷移を実装

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ 追加
import { ModernCard } from '../../components/ui/ModernCard';
import { ModernButton } from '../../components/ui/ModernButton';
import { NotificationService, GameNotification, NotificationSettings, NotificationStats } from '../services/NotificationService';

interface NotificationUIProps {
  className?: string;
  maxDisplayCount?: number;
}

interface NotificationItemProps {
  notification: GameNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onGameClick?: (gameId: string) => void;
}

// 個別通知アイテム
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDelete,
  onGameClick
}) => {
  const handleClick = useCallback(() => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    
    if (notification.gameId && onGameClick) {
      onGameClick(notification.gameId);
    }
  }, [notification, onRead, onGameClick]);

  const getTimeAgo = useCallback((dateString: string): string => {
    const now = new Date().getTime();
    const time = new Date(dateString).getTime();
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    return `${Math.floor(diffInMinutes / 1440)}日前`;
  }, []);

  return (
    <div
      className={`notification-item p-3 border-l-4 cursor-pointer transition-all hover:bg-gray-50 ${
        notification.isRead 
          ? 'border-l-gray-300 bg-white opacity-75' 
          : 'border-l-blue-500 bg-blue-50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="flex-shrink-0">
          <span className="text-2xl">{notification.icon}</span>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-sm ${
                notification.isRead ? 'text-gray-600' : 'text-gray-800'
              }`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 ${
                notification.isRead ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {notification.message}
              </p>
              
              {/* メタデータ */}
              {notification.metadata?.gameName && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    🎮 {notification.metadata.gameName}
                  </span>
                  {notification.metadata.count && (
                    <span className="text-xs text-gray-500">
                      {notification.metadata.count.toLocaleString()}回
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* アクション・時間 */}
            <div className="flex-shrink-0 text-right">
              <div className="text-xs text-gray-400 mb-1">
                {getTimeAgo(notification.createdAt)}
              </div>
              <ModernButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="p-1 text-xs bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600"
              >
                ✕
              </ModernButton>
            </div>
          </div>
        </div>

        {/* 未読インジケーター */}
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

// 通知設定コンポーネント
const NotificationSettingsPanel: React.FC<{
  settings: NotificationSettings;
  onUpdate: (settings: Partial<NotificationSettings>) => void;
  onClose: () => void;
}> = ({ settings, onUpdate, onClose }) => {
  const settingItems = [
    { key: 'reactions', label: 'リアクション', description: 'ゲームにリアクションが付いた時' },
    { key: 'likes', label: 'いいね', description: 'ゲームにいいねが付いた時' },
    { key: 'follows', label: 'フォロー', description: '新しいフォロワーが増えた時' },
    { key: 'trending', label: 'トレンド', description: 'ゲームがランキングに入った時' },
    { key: 'milestones', label: 'マイルストーン', description: '記録達成時' },
    { key: 'browserNotifications', label: 'ブラウザ通知', description: 'ブラウザの通知機能を使用' },
    { key: 'soundEnabled', label: '通知音', description: '通知時に音を再生' }
  ];

  return (
    <ModernCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">🔔 通知設定</h3>
        <ModernButton
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          ✕
        </ModernButton>
      </div>

      <div className="space-y-3">
        {settingItems.map(item => (
          <div key={item.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={item.key}
              checked={settings[item.key as keyof NotificationSettings] as boolean}
              onChange={(e) => onUpdate({ [item.key]: e.target.checked })}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor={item.key} className="font-medium text-sm text-gray-800 cursor-pointer">
                {item.label}
              </label>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          ブラウザ通知を有効にするには、ブラウザの設定で通知を許可してください。
        </p>
      </div>
    </ModernCard>
  );
};

// メイン通知UIコンポーネント
export const NotificationUI: React.FC<NotificationUIProps> = ({
  className = '',
  maxDisplayCount = 50
}) => {
  // ✅ React Router のナビゲーション追加
  const navigate = useNavigate();

  // 状態管理
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    unreadCount: 0,
    totalCount: 0,
    todayCount: 0,
    weekCount: 0
  });
  const [settings, setSettings] = useState<NotificationSettings>({
    reactions: true,
    likes: true,
    follows: true,
    trending: true,
    milestones: true,
    browserNotifications: true,
    emailNotifications: false,
    soundEnabled: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'today'>('all');

  // サービスインスタンス
  const notificationService = useMemo(() => NotificationService.getInstance(), []);

  // データ読み込み
  const loadData = useCallback(async () => {
    const allNotifications = await notificationService.getNotifications(maxDisplayCount);
    const currentStats = await notificationService.getStats();
    const currentSettings = notificationService.getSettings();
    
    setNotifications(allNotifications);
    setStats(currentStats);
    setSettings(currentSettings);
  }, [notificationService, maxDisplayCount]);

  // 初期ロード
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 通知サービスイベントリスナー
  useEffect(() => {
    const handleNotificationAdded = () => loadData();
    const handleNotificationRead = () => loadData();
    const handleAllRead = () => loadData();
    const handleNotificationDeleted = () => loadData();
    const handleSettingsUpdated = (newSettings: NotificationSettings) => {
      setSettings(newSettings);
    };

    notificationService.on('notificationAdded', handleNotificationAdded);
    notificationService.on('notificationRead', handleNotificationRead);
    notificationService.on('allNotificationsRead', handleAllRead);
    notificationService.on('notificationDeleted', handleNotificationDeleted);
    notificationService.on('settingsUpdated', handleSettingsUpdated);

    return () => {
      notificationService.off('notificationAdded', handleNotificationAdded);
      notificationService.off('notificationRead', handleNotificationRead);
      notificationService.off('allNotificationsRead', handleAllRead);
      notificationService.off('notificationDeleted', handleNotificationDeleted);
      notificationService.off('settingsUpdated', handleSettingsUpdated);
    };
  }, [notificationService]);

  // フィルタリング済み通知
  const filteredNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'today':
        return notifications.filter(n => new Date(n.createdAt) >= today);
      default:
        return notifications;
    }
  }, [notifications, filter]);

  // ハンドラー
  const handleNotificationRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, [notificationService]);

  const handleNotificationDelete = useCallback((id: string) => {
    notificationService.deleteNotification(id);
  }, [notificationService]);

  const handleMarkAllRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, [notificationService]);

  const handleSettingsUpdate = useCallback((newSettings: Partial<NotificationSettings>) => {
    notificationService.updateSettings(newSettings);
  }, [notificationService]);

  // ✅ ゲームページへの遷移を実装
  const handleGameClick = useCallback((gameId: string) => {
    navigate(`/games/${gameId}`);
  }, [navigate]);

  // 定期クリーンアップ開始
  useEffect(() => {
    notificationService.startPeriodicCleanup();
  }, [notificationService]);

  return (
    <div className={`notification-ui ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>🔔</span>
            <span>通知</span>
            {stats.unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {stats.unreadCount}
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {stats.unreadCount > 0 && (
            <ModernButton
              onClick={handleMarkAllRead}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
            >
              全て既読
            </ModernButton>
          )}
          <ModernButton
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            ⚙️ 設定
          </ModernButton>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-blue-600">{stats.unreadCount}</div>
          <div className="text-xs text-gray-500">未読</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-green-600">{stats.todayCount}</div>
          <div className="text-xs text-gray-500">今日</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-purple-600">{stats.weekCount}</div>
          <div className="text-xs text-gray-500">今週</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-gray-600">{stats.totalCount}</div>
          <div className="text-xs text-gray-500">総数</div>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="mb-4">
          <NotificationSettingsPanel
            settings={settings}
            onUpdate={handleSettingsUpdate}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        <ModernButton
          onClick={() => setFilter('all')}
          className={`text-sm ${
            filter === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          全て ({notifications.length})
        </ModernButton>
        <ModernButton
          onClick={() => setFilter('unread')}
          className={`text-sm ${
            filter === 'unread' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          未読 ({stats.unreadCount})
        </ModernButton>
        <ModernButton
          onClick={() => setFilter('today')}
          className={`text-sm ${
            filter === 'today' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          今日 ({stats.todayCount})
        </ModernButton>
      </div>

      {/* 通知一覧 */}
      <ModernCard className="divide-y divide-gray-200">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔔</div>
            <h3 className="text-lg font-medium text-gray-600 mb-1">
              {filter === 'unread' ? '未読の通知はありません' :
               filter === 'today' ? '今日の通知はありません' :
               '通知はありません'}
            </h3>
            <p className="text-sm text-gray-500">
              ゲームにリアクションやいいねが付くと通知が届きます
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleNotificationRead}
                onDelete={handleNotificationDelete}
                onGameClick={handleGameClick}
              />
            ))}
          </div>
        )}
      </ModernCard>

      {/* フッター */}
      {filteredNotifications.length > 0 && (
        <div className="text-center mt-4">
          <ModernButton
            onClick={loadData}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            🔄 更新
          </ModernButton>
        </div>
      )}
    </div>
  );
};

// 通知バッジコンポーネント（ヘッダー等で使用）
export const NotificationBadge: React.FC<{
  onClick?: () => void;
  className?: string;
}> = ({ onClick, className = '' }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationService = useMemo(() => NotificationService.getInstance(), []);

  useEffect(() => {
    const updateCount = async () => {
      const stats = await notificationService.getStats();
      setUnreadCount(stats.unreadCount);
    };

    updateCount();
    
    notificationService.on('notificationAdded', updateCount);
    notificationService.on('notificationRead', updateCount);
    notificationService.on('allNotificationsRead', updateCount);

    return () => {
      notificationService.off('notificationAdded', updateCount);
      notificationService.off('notificationRead', updateCount);
      notificationService.off('allNotificationsRead', updateCount);
    };
  }, [notificationService]);

  return (
    <ModernButton
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-gray-800 ${className}`}
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </ModernButton>
  );
};