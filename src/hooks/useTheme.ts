// src/hooks/useTheme.ts
// テーマHook・React統合 - 簡単利用・状態管理・パフォーマンス最適化

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ThemeType } from '../types/themeTypes';
import { themeManager, ThemeChangeEvent, ThemePreferences } from '../managers/ThemeManager';

export interface UseThemeReturn {
  // 基本状態
  currentTheme: ThemeType;
  previousTheme: ThemeType | null;
  isLoading: boolean;
  isTransitioning: boolean;
  
  // テーマ操作
  changeTheme: (theme: ThemeType) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  cycleThemes: () => Promise<void>;
  
  // 利用可能テーマ
  availableThemes: ThemeType[];
  themeInfo: ThemeInfo[];
  
  // 設定管理
  preferences: ThemePreferences;
  updatePreferences: (prefs: Partial<ThemePreferences>) => Promise<void>;
  
  // ユーティリティ
  isTheme: (theme: ThemeType) => boolean;
  getThemeColor: (theme?: ThemeType) => string;
  preloadTheme: (theme: ThemeType) => Promise<void>;
  
  // デバッグ情報
  debugInfo: any;
}

export interface ThemeInfo {
  type: ThemeType;
  name: string;
  description: string;
  color: string;
  category: 'light' | 'dark' | 'colorful';
  accessibility: 'high' | 'medium' | 'standard';
}

export const useTheme = (): UseThemeReturn => {
  // 状態管理
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(themeManager.getCurrentTheme());
  const [previousTheme, setPreviousTheme] = useState<ThemeType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preferences, setPreferences] = useState<ThemePreferences>(themeManager.getPreferences());
  
  // パフォーマンス最適化用ref
  const lastChangeTime = useRef<number>(0);
  const changeTimeoutRef = useRef<NodeJS.Timeout>();

  // 利用可能テーマ定義
  const availableThemes: ThemeType[] = useMemo(() => [
    'arcade', 'retro', 'neon', 'cute', 'minimal', 'dark'
  ], []);

  // テーマ詳細情報
  const themeInfo: ThemeInfo[] = useMemo(() => [
    {
      type: 'arcade',
      name: 'アーケード',
      description: 'ゲームセンター風の迫力あるUI',
      color: '#8b5cf6',
      category: 'colorful',
      accessibility: 'standard'
    },
    {
      type: 'retro',
      name: 'レトロ',
      description: 'ピクセル時代の懐かしい雰囲気',
      color: '#10b981',
      category: 'dark',
      accessibility: 'medium'
    },
    {
      type: 'neon',
      name: 'ネオン',
      description: 'サイバーパンク風の未来感',
      color: '#06b6d4',
      category: 'dark',
      accessibility: 'medium'
    },
    {
      type: 'cute',
      name: 'かわいい',
      description: 'パステルカラーのやわらかUI',
      color: '#f472b6',
      category: 'light',
      accessibility: 'standard'
    },
    {
      type: 'minimal',
      name: 'ミニマル',
      description: 'シンプルで洗練されたデザイン',
      color: '#3b82f6',
      category: 'light',
      accessibility: 'high'
    },
    {
      type: 'dark',
      name: 'ダーク',
      description: '目に優しいダークモード',
      color: '#111827',
      category: 'dark',
      accessibility: 'high'
    }
  ], []);

  // ThemeManagerからの変更を監視
  useEffect(() => {
    const unsubscribeTheme = themeManager.subscribeToThemeChanges((event: ThemeChangeEvent) => {
      setPreviousTheme(event.from);
      setCurrentTheme(event.to);
      
      // トランジション状態管理
      setIsTransitioning(true);
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
      changeTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      
      lastChangeTime.current = event.timestamp;
    });

    const unsubscribePreferences = themeManager.subscribeToPreferencesChanges((prefs: ThemePreferences) => {
      setPreferences(prefs);
    });

    // クリーンアップ
    return () => {
      unsubscribeTheme();
      unsubscribePreferences();
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  // テーマ変更（基本）
  const changeTheme = useCallback(async (newTheme: ThemeType): Promise<void> => {
    if (newTheme === currentTheme || isTransitioning) {
      return;
    }

    // 頻繁な変更を防ぐ（デバウンス）
    const now = Date.now();
    if (now - lastChangeTime.current < 300) {
      return;
    }

    setIsLoading(true);
    
    try {
      await themeManager.setTheme(newTheme, 'user');
    } catch (error) {
      console.error('❌ Failed to change theme:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentTheme, isTransitioning]);

  // ダークモード切り替え
  const toggleDarkMode = useCallback(async (): Promise<void> => {
    const currentInfo = themeInfo.find(t => t.type === currentTheme);
    const isDarkTheme = currentInfo?.category === 'dark';
    
    if (isDarkTheme) {
      // ダークテーマから明るいテーマへ
      const lightThemes = themeInfo.filter(t => t.category === 'light');
      const targetTheme = lightThemes.find(t => t.type === preferences.preferredTheme)?.type || 'minimal';
      await changeTheme(targetTheme);
    } else {
      // 明るいテーマからダークテーマへ
      await changeTheme('dark');
    }
  }, [currentTheme, preferences.preferredTheme, themeInfo, changeTheme]);

  // テーマサイクル
  const cycleThemes = useCallback(async (): Promise<void> => {
    const currentIndex = availableThemes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    const nextTheme = availableThemes[nextIndex];
    
    await changeTheme(nextTheme);
  }, [currentTheme, availableThemes, changeTheme]);

  // 設定更新
  const updatePreferences = useCallback(async (prefs: Partial<ThemePreferences>): Promise<void> => {
    setIsLoading(true);
    try {
      await themeManager.updatePreferences(prefs);
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // テーマ判定
  const isTheme = useCallback((theme: ThemeType): boolean => {
    return currentTheme === theme;
  }, [currentTheme]);

  // テーマカラー取得
  const getThemeColor = useCallback((theme?: ThemeType): string => {
    const targetTheme = theme || currentTheme;
    const info = themeInfo.find(t => t.type === targetTheme);
    return info?.color || '#8b5cf6';
  }, [currentTheme, themeInfo]);

  // テーマ事前読み込み
  const preloadTheme = useCallback(async (theme: ThemeType): Promise<void> => {
    if (!availableThemes.includes(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }

    try {
      // ThemeManagerを通じて事前読み込み
      await themeManager.setTheme(theme, 'auto');
      await themeManager.setTheme(currentTheme, 'auto'); // 元に戻す
    } catch (error) {
      console.error(`❌ Failed to preload theme ${theme}:`, error);
      throw error;
    }
  }, [availableThemes, currentTheme]);

  // デバッグ情報
  const debugInfo = useMemo(() => ({
    managerDebugInfo: themeManager.getDebugInfo(),
    hookState: {
      currentTheme,
      previousTheme,
      isLoading,
      isTransitioning,
      lastChangeTime: lastChangeTime.current
    },
    preferences,
    performance: {
      availableThemesLength: availableThemes.length,
      themeInfoLength: themeInfo.length
    }
  }), [
    currentTheme,
    previousTheme,
    isLoading,
    isTransitioning,
    preferences,
    availableThemes.length,
    themeInfo.length
  ]);

  return {
    // 基本状態
    currentTheme,
    previousTheme,
    isLoading,
    isTransitioning,
    
    // テーマ操作
    changeTheme,
    toggleDarkMode,
    cycleThemes,
    
    // 利用可能テーマ
    availableThemes,
    themeInfo,
    
    // 設定管理
    preferences,
    updatePreferences,
    
    // ユーティリティ
    isTheme,
    getThemeColor,
    preloadTheme,
    
    // デバッグ情報
    debugInfo
  };
};

// テーマ情報のみ取得するライトウェイトHook
export const useThemeInfo = (): ThemeInfo[] => {
  return useMemo(() => [
    {
      type: 'arcade',
      name: 'アーケード',
      description: 'ゲームセンター風の迫力あるUI',
      color: '#8b5cf6',
      category: 'colorful',
      accessibility: 'standard'
    },
    {
      type: 'retro',
      name: 'レトロ',
      description: 'ピクセル時代の懐かしい雰囲気',
      color: '#10b981',
      category: 'dark',
      accessibility: 'medium'
    },
    {
      type: 'neon',
      name: 'ネオン',
      description: 'サイバーパンク風の未来感',
      color: '#06b6d4',
      category: 'dark',
      accessibility: 'medium'
    },
    {
      type: 'cute',
      name: 'かわいい',
      description: 'パステルカラーのやわらかUI',
      color: '#f472b6',
      category: 'light',
      accessibility: 'standard'
    },
    {
      type: 'minimal',
      name: 'ミニマル',
      description: 'シンプルで洗練されたデザイン',
      color: '#3b82f6',
      category: 'light',
      accessibility: 'high'
    },
    {
      type: 'dark',
      name: 'ダーク',
      description: '目に優しいダークモード',
      color: '#111827',
      category: 'dark',
      accessibility: 'high'
    }
  ], []);
};

// 現在のテーマのみ取得するライトウェイトHook
export const useCurrentTheme = (): ThemeType => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(themeManager.getCurrentTheme());

  useEffect(() => {
    const unsubscribe = themeManager.subscribeToThemeChanges((event: ThemeChangeEvent) => {
      setCurrentTheme(event.to);
    });

    return unsubscribe;
  }, []);

  return currentTheme;
};

// テーマカラーのみ取得するHook
export const useThemeColor = (theme?: ThemeType): string => {
  const currentTheme = useCurrentTheme();
  const themeInfo = useThemeInfo();
  
  return useMemo(() => {
    const targetTheme = theme || currentTheme;
    const info = themeInfo.find(t => t.type === targetTheme);
    return info?.color || '#8b5cf6';
  }, [theme, currentTheme, themeInfo]);
};

export default useTheme;