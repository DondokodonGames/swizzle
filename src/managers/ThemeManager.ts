// src/managers/ThemeManager.ts
// テーマ状態管理システム - 永続化・リスナー・システム設定統合

import { ThemeType } from '../types/themeTypes';

export interface ThemeChangeEvent {
  from: ThemeType;
  to: ThemeType;
  timestamp: number;
  source: 'user' | 'system' | 'auto';
}

export interface ThemePreferences {
  preferredTheme: ThemeType;
  autoSwitch: boolean;
  systemSync: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

type ThemeListener = (event: ThemeChangeEvent) => void;
type PreferencesListener = (preferences: ThemePreferences) => void;

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemeType = 'arcade';
  private preferences: ThemePreferences = {
    preferredTheme: 'arcade',
    autoSwitch: false,
    systemSync: true,
    reducedMotion: false,
    highContrast: false
  };
  
  private themeListeners: Set<ThemeListener> = new Set();
  private preferencesListeners: Set<PreferencesListener> = new Set();
  private mediaQueryListener?: (e: MediaQueryListEvent) => void;
  
  // テーマCSS動的読み込み状況
  private loadedThemes: Set<ThemeType> = new Set(['arcade']); // arcade-theme.cssは既に読み込み済み
  private isInitialized = false;

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 保存された設定を読み込み
      await this.loadStoredPreferences();
      
      // システム設定の監視を開始
      this.setupSystemPreferencesMonitoring();
      
      // 初期テーマを適用
      await this.applyInitialTheme();
      
      this.isInitialized = true;
      console.log('🎨 ThemeManager initialized successfully');
    } catch (error) {
      console.error('❌ ThemeManager initialization failed:', error);
      // フォールバック: アーケードテーマで初期化
      this.currentTheme = 'arcade';
      this.applyThemeToDOM('arcade');
    }
  }

  // メインのテーマ変更メソッド
  async setTheme(theme: ThemeType, source: 'user' | 'system' | 'auto' = 'user'): Promise<void> {
    if (!this.isValidTheme(theme)) {
      console.warn(`❌ Invalid theme: ${theme}`);
      return;
    }

    if (theme === this.currentTheme) {
      return;
    }

    const previousTheme = this.currentTheme;
    
    try {
      // テーマCSS動的読み込み
      await this.ensureThemeLoaded(theme);
      
      // DOM更新前のイベント
      const changeEvent: ThemeChangeEvent = {
        from: previousTheme,
        to: theme,
        timestamp: Date.now(),
        source
      };

      // テーマ適用
      this.currentTheme = theme;
      this.applyThemeToDOM(theme);
      
      // 設定保存（ユーザー操作の場合のみ）
      if (source === 'user') {
        this.preferences.preferredTheme = theme;
        this.savePreferences();
      }
      
      // トランジション効果
      this.applyTransitionEffect(previousTheme, theme);
      
      // リスナー通知
      this.notifyThemeListeners(changeEvent);
      
      console.log(`🎨 Theme changed: ${previousTheme} → ${theme} (${source})`);
    } catch (error) {
      console.error(`❌ Failed to set theme ${theme}:`, error);
      // エラー時は元のテーマに戻す
      this.currentTheme = previousTheme;
      this.applyThemeToDOM(previousTheme);
    }
  }

  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  getPreferences(): ThemePreferences {
    return { ...this.preferences };
  }

  async updatePreferences(newPreferences: Partial<ThemePreferences>): Promise<void> {
    const oldPreferences = { ...this.preferences };
    this.preferences = { ...this.preferences, ...newPreferences };
    
    try {
      // 設定変更に応じた処理
      if (newPreferences.systemSync !== undefined) {
        if (newPreferences.systemSync) {
          this.setupSystemPreferencesMonitoring();
        } else {
          this.removeSystemPreferencesMonitoring();
        }
      }

      if (newPreferences.preferredTheme && newPreferences.preferredTheme !== this.currentTheme) {
        await this.setTheme(newPreferences.preferredTheme, 'user');
      }

      // 設定保存
      this.savePreferences();
      
      // リスナー通知
      this.notifyPreferencesListeners(this.preferences);
      
      console.log('⚙️ Theme preferences updated:', newPreferences);
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      // エラー時は元の設定に戻す
      this.preferences = oldPreferences;
    }
  }

  // リスナー管理
  subscribeToThemeChanges(listener: ThemeListener): () => void {
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
  }

  subscribeToPreferencesChanges(listener: PreferencesListener): () => void {
    this.preferencesListeners.add(listener);
    return () => this.preferencesListeners.delete(listener);
  }

  // テーマCSS動的読み込み
  private async ensureThemeLoaded(theme: ThemeType): Promise<void> {
    if (this.loadedThemes.has(theme)) {
      return;
    }

    try {
      const cssPath = `/src/styles/${theme}-theme.css`;
      
      // CSS要素作成
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = cssPath;
      linkElement.id = `theme-${theme}`;
      
      // 読み込み完了を待つ
      await new Promise<void>((resolve, reject) => {
        linkElement.onload = () => resolve();
        linkElement.onerror = () => reject(new Error(`Failed to load ${cssPath}`));
        document.head.appendChild(linkElement);
      });
      
      this.loadedThemes.add(theme);
      console.log(`✅ Theme CSS loaded: ${theme}`);
    } catch (error) {
      console.error(`❌ Failed to load theme CSS for ${theme}:`, error);
      throw error;
    }
  }

  // DOM操作
  private applyThemeToDOM(theme: ThemeType): void {
    document.documentElement.setAttribute('data-theme', theme);
    
    // body要素にもクラス追加（CSS詳細設定用）
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
    
    // メタテーマカラー更新
    this.updateMetaThemeColor(theme);
  }

  private updateMetaThemeColor(theme: ThemeType): void {
    const themeColors: Record<ThemeType, string> = {
      arcade: '#8b5cf6',
      retro: '#10b981',
      neon: '#06b6d4',
      cute: '#f472b6',
      minimal: '#3b82f6',
      dark: '#111827'
    };

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', themeColors[theme]);
  }

  // トランジション効果
  private applyTransitionEffect(from: ThemeType, to: ThemeType): void {
    // 滑らかな色変更効果
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    // アニメーション完了後にtransitionを削除
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);

    // 特殊効果（テーマに応じて）
    this.applySpecialTransitionEffect(from, to);
  }

  private applySpecialTransitionEffect(from: ThemeType, to: ThemeType): void {
    // レトロ→ネオンなど特定の組み合わせで特殊効果
    if (from === 'retro' && to === 'neon') {
      this.createScanlineToGlowEffect();
    } else if (from === 'cute' && to === 'dark') {
      this.createColorDrainEffect();
    }
  }

  private createScanlineToGlowEffect(): void {
    // スキャンライン→グロー効果のアニメーション
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%);
      pointer-events: none;
      z-index: 9999;
      animation: glow-sweep 0.8s ease-out forwards;
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 800);
  }

  private createColorDrainEffect(): void {
    // かわいい→ダークのカラードレインエフェクト
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, transparent 0%, rgba(17, 24, 39, 0.8) 100%);
      pointer-events: none;
      z-index: 9999;
      animation: color-drain 1s ease-in-out forwards;
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1000);
  }

  // システム設定監視
  private setupSystemPreferencesMonitoring(): void {
    if (!this.preferences.systemSync) return;

    // ダークモード監視
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueryListener = (e: MediaQueryListEvent) => {
      if (this.preferences.systemSync) {
        const systemTheme = e.matches ? 'dark' : 'minimal';
        this.setTheme(systemTheme, 'system');
      }
    };
    
    darkModeQuery.addEventListener('change', this.mediaQueryListener);

    // 初回チェック
    if (darkModeQuery.matches && this.preferences.systemSync) {
      this.setTheme('dark', 'system');
    }
  }

  private removeSystemPreferencesMonitoring(): void {
    if (this.mediaQueryListener) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.removeEventListener('change', this.mediaQueryListener);
      this.mediaQueryListener = undefined;
    }
  }

  // ストレージ操作
  private async loadStoredPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem('theme-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...parsed };
      }
      
      // 個別のテーマ設定（後方互換性）
      const storedTheme = localStorage.getItem('preferred-theme') as ThemeType;
      if (storedTheme && this.isValidTheme(storedTheme)) {
        this.preferences.preferredTheme = storedTheme;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load stored preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('theme-preferences', JSON.stringify(this.preferences));
      // 後方互換性のため個別保存も継続
      localStorage.setItem('preferred-theme', this.preferences.preferredTheme);
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
    }
  }

  private async applyInitialTheme(): Promise<void> {
    let initialTheme = this.preferences.preferredTheme;
    
    // システム同期が有効な場合
    if (this.preferences.systemSync) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        initialTheme = 'dark';
      }
    }
    
    await this.setTheme(initialTheme, 'auto');
  }

  // ユーティリティメソッド
  private isValidTheme(theme: string): theme is ThemeType {
    return ['arcade', 'retro', 'neon', 'cute', 'minimal', 'dark'].includes(theme);
  }

  private notifyThemeListeners(event: ThemeChangeEvent): void {
    this.themeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ Error in theme listener:', error);
      }
    });
  }

  private notifyPreferencesListeners(preferences: ThemePreferences): void {
    this.preferencesListeners.forEach(listener => {
      try {
        listener(preferences);
      } catch (error) {
        console.error('❌ Error in preferences listener:', error);
      }
    });
  }

  // デバッグ・統計情報
  getDebugInfo() {
    return {
      currentTheme: this.currentTheme,
      preferences: this.preferences,
      loadedThemes: Array.from(this.loadedThemes),
      listenersCount: {
        theme: this.themeListeners.size,
        preferences: this.preferencesListeners.size
      },
      isInitialized: this.isInitialized
    };
  }
}

// CSS動的アニメーション追加
const addTransitionStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes glow-sweep {
      0% { transform: translateX(-100%); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes color-drain {
      0% { transform: scale(0); opacity: 0; }
      50% { opacity: 0.8; }
      100% { transform: scale(2); opacity: 0; }
    }
  `;
  
  if (!document.head.querySelector('style[data-theme-transitions]')) {
    styleSheet.setAttribute('data-theme-transitions', 'true');
    document.head.appendChild(styleSheet);
  }
};

// 初期化時にスタイル追加
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTransitionStyles);
  } else {
    addTransitionStyles();
  }
}

// シングルトンインスタンスをエクスポート
export const themeManager = ThemeManager.getInstance();