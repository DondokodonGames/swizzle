// src/hooks/editor/useNotification.ts
// 🔧 Phase E-1: 通知システム共通ロジック抽出
import { useState, useCallback } from 'react';

// 通知型定義
export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  id?: string;
}

// 通知Hook設定
export interface NotificationOptions {
  autoHide?: boolean;
  duration?: number;
  maxNotifications?: number;
}

export const useNotification = (options: NotificationOptions = {}) => {
  const {
    autoHide = true,
    duration = 4000,
    maxNotifications = 5
  } = options;

  const [notifications, setNotifications] = useState<(Notification & { id: string })[]>([]);

  // 通知表示
  const showNotification = useCallback((
    type: 'success' | 'error' | 'info',
    message: string,
    customDuration?: number
  ) => {
    const id = crypto.randomUUID();
    const newNotification = { type, message, id };

    setNotifications(prev => {
      // 最大通知数制限
      const updatedNotifications = [...prev, newNotification];
      if (updatedNotifications.length > maxNotifications) {
        return updatedNotifications.slice(-maxNotifications);
      }
      return updatedNotifications;
    });

    // 自動非表示
    if (autoHide) {
      setTimeout(() => {
        hideNotification(id);
      }, customDuration || duration);
    }
  }, [autoHide, duration, maxNotifications]);

  // 通知非表示
  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 全通知クリア
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 成功通知ヘルパー
  const showSuccess = useCallback((message: string, customDuration?: number) => {
    showNotification('success', message, customDuration);
  }, [showNotification]);

  // エラー通知ヘルパー
  const showError = useCallback((message: string, customDuration?: number) => {
    showNotification('error', message, customDuration);
  }, [showNotification]);

  // 情報通知ヘルパー
  const showInfo = useCallback((message: string, customDuration?: number) => {
    showNotification('info', message, customDuration);
  }, [showNotification]);

  return {
    notifications,
    showNotification,
    hideNotification,
    clearNotifications,
    showSuccess,
    showError,
    showInfo
  };
};