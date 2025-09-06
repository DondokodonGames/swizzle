import React, { useEffect, createContext, useContext } from 'react';

// テーマ型定義
export type ThemeType = 'arcade' | 'retro' | 'neon' | 'cute' | 'minimal' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

// テーマコンテキスト作成
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'arcade',
  setTheme: () => {}
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
  // テーマ適用
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  const setTheme = (newTheme: ThemeType) => {
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// テーマHook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within GameThemeProvider');
  }
  return context;
};

export default GameThemeProvider;