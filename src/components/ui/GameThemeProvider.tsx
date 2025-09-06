import React, { useEffect, createContext, useContext, useState } from 'react';

// テーマ型定義
export type ThemeType = 'arcade' | 'retro' | 'neon' | 'cute' | 'minimal' | 'dark';

// ゲームカテゴリ型定義（GameEditor.tsxで必要）
export type GameCategory = 'action' | 'puzzle' | 'timing' | 'reaction' | 'special';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  currentTheme: {
    name: string;
    colors: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      error: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
      border: string;
      accent: string;
      gradientFrom: string;
      gradientTo: string;
    };
  };
}

// デフォルトテーマ設定
const defaultTheme = {
  name: 'arcade',
  colors: {
    primary: '#d946ef',
    secondary: '#14b8a6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f0f23',
    surface: '#1e1b4b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#06b6d4',
    gradientFrom: '#d946ef',
    gradientTo: '#14b8a6'
  }
};

// テーマコンテキスト作成
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'arcade',
  setTheme: () => {},
  currentTheme: defaultTheme
});

// テーマプロバイダーProps
interface GameThemeProviderProps {
  theme?: ThemeType;
  children: React.ReactNode;
}

// GameThemeProvider コンポーネント
export const GameThemeProvider: React.FC<GameThemeProviderProps> = ({
  theme = 'arcade',
  children
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(theme);

  // テーマ適用
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);
  
  const setTheme = (newTheme: ThemeType) => {
    setCurrentTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  const contextValue: ThemeContextType = {
    theme: currentTheme,
    setTheme,
    currentTheme: defaultTheme // 現在は固定、将来的にテーマ切り替えで動的に
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// テーマHook（GameEditor.tsxとArcadeButton.tsxで使用）
export const useGameTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useGameTheme must be used within GameThemeProvider');
  }
  return {
    ...context,
    // GameEditor.tsxで使用される追加プロパティ
    themeType: context.theme,
    gameCategory: null as GameCategory | null,
    setThemeType: context.setTheme,
    setGameCategory: (_category: GameCategory | null) => {}
  };
};

// 別名エクスポート（互換性のため）
export const useTheme = useGameTheme;

export default GameThemeProvider;