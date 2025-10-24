export type ThemeType = 'arcade' | 'retro' | 'neon' | 'cute' | 'minimal' | 'dark';

export interface ThemeConfig {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  effects: {
    shadow: string;
    gradient: string;
    borderRadius: string;
  };
}

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  arcade: {
    name: 'arcade',
    displayName: 'アーケード',
    colors: {
      primary: '#d946ef',
      secondary: '#14b8a6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#0f0f23',
      surface: '#1e1b4b',
      text: '#f1f5f9'
    },
    effects: {
      shadow: '0 0 20px rgba(217, 70, 239, 0.5)',
      gradient: 'linear-gradient(45deg, #d946ef, #14b8a6)',
      borderRadius: '12px'
    }
  },
  retro: {
    name: 'retro',
    displayName: 'レトロ',
    colors: {
      primary: '#10b981',
      secondary: '#fbbf24',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#000000',
      surface: '#1f2937',
      text: '#00ff41'
    },
    effects: {
      shadow: '0 0 10px rgba(0, 255, 65, 0.3)',
      gradient: 'linear-gradient(45deg, #10b981, #fbbf24)',
      borderRadius: '4px'
    }
  },
  neon: {
    name: 'neon',
    displayName: 'ネオン',
    colors: {
      primary: '#8b5cf6',
      secondary: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#020617',
      surface: '#0f172a',
      text: '#e2e8f0'
    },
    effects: {
      shadow: '0 0 20px currentColor',
      gradient: 'linear-gradient(45deg, #8b5cf6, #06b6d4)',
      borderRadius: '8px'
    }
  },
  cute: {
    name: 'cute',
    displayName: 'かわいい',
    colors: {
      primary: '#f472b6',
      secondary: '#a78bfa',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#fef7ff',
      surface: '#ffffff',
      text: '#7c2d12'
    },
    effects: {
      shadow: '0 4px 20px rgba(244, 114, 182, 0.2)',
      gradient: 'linear-gradient(135deg, #fdf2f8, #fef3c7, #f0f9ff)',
      borderRadius: '20px'
    }
  },
  minimal: {
    name: 'minimal',
    displayName: 'ミニマル',
    colors: {
      primary: '#374151',
      secondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827'
    },
    effects: {
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      gradient: 'linear-gradient(135deg, #ffffff, #f9fafb)',
      borderRadius: '8px'
    }
  },
  dark: {
    name: 'dark',
    displayName: 'ダーク',
    colors: {
      primary: '#60a5fa',
      secondary: '#34d399',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb'
    },
    effects: {
      shadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      gradient: 'linear-gradient(135deg, #111827, #1f2937)',
      borderRadius: '8px'
    }
  }
};