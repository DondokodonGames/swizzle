// src/utils/CSSIntegrationChecker.ts
// テーマCSS統合確認・動的読み込み・テスト用ユーティリティ

import { ThemeType } from '../types/themeTypes';

export interface CSSLoadStatus {
  theme: ThemeType;
  loaded: boolean;
  error?: string;
  size?: number;
  loadTime?: number;
}

export class CSSIntegrationChecker {
  private static loadedThemes: Set<ThemeType> = new Set(['arcade']);
  private static loadPromises: Map<ThemeType, Promise<void>> = new Map();

  // すべてのテーマCSS存在確認
  static async checkAllThemes(): Promise<CSSLoadStatus[]> {
    const themes: ThemeType[] = ['arcade', 'retro', 'neon', 'cute', 'minimal', 'dark'];
    const results: CSSLoadStatus[] = [];

    for (const theme of themes) {
      const status = await this.checkThemeCSS(theme);
      results.push(status);
    }

    return results;
  }

  // 個別テーマCSS確認
  static async checkThemeCSS(theme: ThemeType): Promise<CSSLoadStatus> {
    const startTime = performance.now();
    
    try {
      // arcade-theme.cssは既に読み込み済み
      if (theme === 'arcade') {
        return {
          theme,
          loaded: true,
          size: this.estimateFileSize('arcade'),
          loadTime: 0
        };
      }

      // 既に読み込み済みかチェック
      if (this.loadedThemes.has(theme)) {
        return {
          theme,
          loaded: true,
          loadTime: performance.now() - startTime
        };
      }

      // CSS存在確認（HEAD内チェック）
      const existingLink = document.querySelector(`link[id="theme-${theme}"]`);
      if (existingLink) {
        this.loadedThemes.add(theme);
        return {
          theme,
          loaded: true,
          loadTime: performance.now() - startTime
        };
      }

      // CSS動的読み込み
      await this.loadThemeCSS(theme);
      const loadTime = performance.now() - startTime;

      return {
        theme,
        loaded: true,
        loadTime,
        size: this.estimateFileSize(theme)
      };

    } catch (error) {
      return {
        theme,
        loaded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        loadTime: performance.now() - startTime
      };
    }
  }

  // CSS動的読み込み
  static async loadThemeCSS(theme: ThemeType): Promise<void> {
    // 既存のPromiseがあれば再利用
    if (this.loadPromises.has(theme)) {
      return this.loadPromises.get(theme);
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const cssPath = `/src/styles/${theme}-theme.css`;
      
      // link要素作成
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = cssPath;
      linkElement.id = `theme-${theme}`;
      
      // 読み込み完了イベント
      linkElement.onload = () => {
        this.loadedThemes.add(theme);
        console.log(`✅ Theme CSS loaded: ${theme}`);
        resolve();
      };
      
      // エラーイベント
      linkElement.onerror = () => {
        const error = new Error(`Failed to load CSS: ${cssPath}`);
        console.error(`❌ Theme CSS load failed: ${theme}`, error);
        reject(error);
      };
      
      // DOM追加
      document.head.appendChild(linkElement);
    });

    this.loadPromises.set(theme, loadPromise);
    return loadPromise;
  }

  // ファイルサイズ推定
  private static estimateFileSize(theme: ThemeType): number {
    const baseSizes: Record<ThemeType, number> = {
      arcade: 2.5,  // KB (既存)
      retro: 3.1,   // KB (推定)
      neon: 3.8,    // KB (推定・エフェクト多め)
      cute: 3.2,    // KB (推定)
      minimal: 2.0, // KB (推定・シンプル)
      dark: 2.8     // KB (推定)
    };
    
    return baseSizes[theme];
  }

  // テーマ適用確認
  static verifyThemeApplication(theme: ThemeType): boolean {
    const htmlElement = document.documentElement;
    const currentTheme = htmlElement.getAttribute('data-theme');
    
    if (currentTheme !== theme) {
      console.warn(`❌ Theme mismatch: expected ${theme}, got ${currentTheme}`);
      return false;
    }

    // CSS変数確認
    const computedStyle = getComputedStyle(htmlElement);
    const primaryColor = computedStyle.getPropertyValue('--color-primary').trim();
    
    if (!primaryColor) {
      console.warn(`❌ CSS variables not found for theme: ${theme}`);
      return false;
    }

    console.log(`✅ Theme applied successfully: ${theme} (primary: ${primaryColor})`);
    return true;
  }

  // パフォーマンステスト
  static async performanceTest(): Promise<{
    loadTimes: Record<ThemeType, number>;
    totalTime: number;
    averageTime: number;
  }> {
    const startTime = performance.now();
    const loadTimes: Record<string, number> = {};
    
    const themes: ThemeType[] = ['retro', 'neon', 'cute', 'minimal', 'dark'];
    
    // 並列読み込みテスト
    const loadPromises = themes.map(async (theme) => {
      const themeStartTime = performance.now();
      try {
        await this.loadThemeCSS(theme);
        const loadTime = performance.now() - themeStartTime;
        loadTimes[theme] = loadTime;
        return loadTime;
      } catch (error) {
        loadTimes[theme] = -1; // エラー
        return -1;
      }
    });

    await Promise.all(loadPromises);
    
    const totalTime = performance.now() - startTime;
    const validTimes = Object.values(loadTimes).filter(time => time > 0);
    const averageTime = validTimes.length > 0 ? 
      validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length : 0;

    return {
      loadTimes: loadTimes as Record<ThemeType, number>,
      totalTime,
      averageTime
    };
  }

  // 統合診断レポート
  static async generateDiagnosticReport(): Promise<string> {
    console.log('🔍 Running theme integration diagnostics...');
    
    const report: string[] = [
      '# テーマシステム統合診断レポート',
      `生成日時: ${new Date().toLocaleString()}`,
      ''
    ];

    // 1. CSS読み込み確認
    report.push('## 1. CSS読み込み確認');
    const cssStatuses = await this.checkAllThemes();
    
    for (const status of cssStatuses) {
      const statusIcon = status.loaded ? '✅' : '❌';
      const sizeInfo = status.size ? ` (${status.size}KB)` : '';
      const timeInfo = status.loadTime ? ` - ${status.loadTime.toFixed(2)}ms` : '';
      const errorInfo = status.error ? ` - Error: ${status.error}` : '';
      
      report.push(`${statusIcon} ${status.theme}${sizeInfo}${timeInfo}${errorInfo}`);
    }

    // 2. DOM統合確認
    report.push('', '## 2. DOM統合確認');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    report.push(`現在のテーマ: ${currentTheme || 'なし'}`);
    
    const themeBody = document.body.className.match(/theme-\w+/);
    report.push(`Bodyクラス: ${themeBody ? themeBody[0] : 'なし'}`);

    // 3. CSS変数確認
    report.push('', '## 3. CSS変数確認');
    const computedStyle = getComputedStyle(document.documentElement);
    const cssVars = [
      '--color-primary',
      '--color-secondary', 
      '--color-background',
      '--color-text'
    ];
    
    for (const cssVar of cssVars) {
      const value = computedStyle.getPropertyValue(cssVar).trim();
      const status = value ? '✅' : '❌';
      report.push(`${status} ${cssVar}: ${value || 'undefined'}`);
    }

    // 4. パフォーマンス確認
    report.push('', '## 4. パフォーマンス確認');
    try {
      const perfResults = await this.performanceTest();
      report.push(`総読み込み時間: ${perfResults.totalTime.toFixed(2)}ms`);
      report.push(`平均読み込み時間: ${perfResults.averageTime.toFixed(2)}ms`);
      
      for (const [theme, time] of Object.entries(perfResults.loadTimes)) {
        if (time > 0) {
          report.push(`  ${theme}: ${time.toFixed(2)}ms`);
        } else {
          report.push(`  ${theme}: 読み込み失敗`);
        }
      }
    } catch (error) {
      report.push(`パフォーマンステスト失敗: ${error}`);
    }

    // 5. 推奨事項
    report.push('', '## 5. 推奨事項');
    const failedThemes = cssStatuses.filter(s => !s.loaded);
    
    if (failedThemes.length === 0) {
      report.push('✅ すべてのテーマが正常に読み込まれています');
      report.push('✅ テーマシステムは完全に統合されています');
      report.push('🎉 Day 4実装完了！6テーマシステム稼働中');
    } else {
      report.push('⚠️ 以下のテーマに問題があります:');
      failedThemes.forEach(theme => {
        report.push(`  - ${theme.theme}: ${theme.error}`);
      });
      report.push('💡 ファイルパスとPermissionを確認してください');
    }

    const finalReport = report.join('\n');
    console.log(finalReport);
    return finalReport;
  }

  // 自動修復
  static async autoFix(): Promise<boolean> {
    console.log('🔧 Attempting auto-fix...');
    
    try {
      // 1. 失敗したテーマを再読み込み
      const cssStatuses = await this.checkAllThemes();
      const failedThemes = cssStatuses.filter(s => !s.loaded);
      
      for (const failed of failedThemes) {
        console.log(`🔄 Retrying ${failed.theme}...`);
        try {
          await this.loadThemeCSS(failed.theme);
        } catch (error) {
          console.error(`❌ Auto-fix failed for ${failed.theme}:`, error);
        }
      }

      // 2. DOM属性修正
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (!currentTheme) {
        console.log('🔄 Setting default theme...');
        document.documentElement.setAttribute('data-theme', 'arcade');
      }

      // 3. 再診断
      const postFixStatuses = await this.checkAllThemes();
      const stillFailed = postFixStatuses.filter(s => !s.loaded);
      
      if (stillFailed.length === 0) {
        console.log('✅ Auto-fix successful! All themes working.');
        return true;
      } else {
        console.log(`⚠️ Auto-fix partially successful. ${stillFailed.length} themes still failing.`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
      return false;
    }
  }
}

// 開発者コンソール用のグローバル関数（既存システム統合版）
if (typeof window !== 'undefined') {
  (window as any).checkThemes = () => CSSIntegrationChecker.generateDiagnosticReport();
  (window as any).fixThemes = () => CSSIntegrationChecker.autoFix();
  (window as any).verifyTheme = (theme: string) => CSSIntegrationChecker.verifyThemeApplication(theme as ThemeType);
  console.log('🎨 Theme debugging tools loaded:');
  console.log('  - checkThemes() : 統合診断レポート');
  console.log('  - fixThemes()   : 自動修復');
  console.log('  - verifyTheme(theme) : 個別テーマ確認');
}