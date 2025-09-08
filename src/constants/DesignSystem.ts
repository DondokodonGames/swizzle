/**
 * モダンアプリケーション風デザインシステム
 * Phase 1-B: 基本UI・ファイル管理改善用
 * 修正版: 不足カラーパレット補完（24個のエラー修正）
 */

// 🎨 モダンカラーパレット（Material Design 3 + Custom）
export const DESIGN_TOKENS = {
  colors: {
    // Primary Colors（ブランドカラー）
    primary: {
      25: '#f0f9ff',    // 🆕 追加 - DragDropZone用
      50: '#f0f9ff',
      100: '#e0f2fe', 
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',  // メインプライマリ
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49'
    },
    
    // Secondary Colors（アクセント）
    secondary: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',  // メインセカンダリ
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b'
    },
    
    // Semantic Colors（意味を持つ色）
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',   // 🆕 追加 - エディター通知用
      200: '#bbf7d0',   // 🆕 追加 - ProjectSelector用
      500: '#22c55e',   // 成功
      600: '#16a34a',
      800: '#166534',   // 🆕 追加 - テキスト色用
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',   // 🆕 追加 - 警告背景用
      500: '#f59e0b',   // 警告
      600: '#d97706',
      800: '#92400e',   // 🆕 追加 - テキスト色用
      900: '#92400e'
    },
    error: {
      50: '#fef2f2',
      200: '#fecaca',   // 🆕 追加 - エラー背景用
      500: '#ef4444',   // エラー
      600: '#dc2626',
      800: '#991b1b',   // 🆕 追加 - テキスト色用
      900: '#7f1d1d'
    },
    
    // Neutral Colors（テキスト・背景）
    neutral: {
      0: '#ffffff',    // 純白
      50: '#f8fafc',   // 極薄グレー
      100: '#f1f5f9',  // 薄グレー
      200: '#e2e8f0',  // ライトグレー
      300: '#cbd5e1',  // ボーダー
      400: '#94a3b8',  // プレースホルダー
      500: '#64748b',  // セカンダリテキスト
      600: '#475569',  // プライマリテキスト
      700: '#334155',  // 濃いテキスト
      800: '#1e293b',  // 最濃テキスト
      900: '#0f172a',  // 黒に近い
      950: '#020617'   // 純黒
    }
  },
  
  // 📐 スペーシング（8px グリッドシステム）
  spacing: {
    0: '0px',
    1: '4px',     // 0.25rem
    2: '8px',     // 0.5rem
    3: '12px',    // 0.75rem
    4: '16px',    // 1rem
    5: '20px',    // 1.25rem
    6: '24px',    // 1.5rem
    8: '32px',    // 2rem
    10: '40px',   // 2.5rem
    12: '48px',   // 3rem
    16: '64px',   // 4rem
    20: '80px',   // 5rem
    24: '96px',   // 6rem
    32: '128px',  // 8rem
    40: '160px',  // 10rem
    48: '192px',  // 12rem
    56: '224px',  // 14rem
    64: '256px'   // 16rem
  },
  
  // 📏 Border Radius（モダンな角丸）
  borderRadius: {
    none: '0px',
    xs: '2px',
    sm: '4px',
    md: '6px',     // デフォルト
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px'
  },
  
  // 🌫️ シャドウ（エレベーション）
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
  },
  
  // 📝 Typography（フォントシステム）
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'] as const,
      mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'] as const
    },
    fontSize: {
      xs: '12px',    // 0.75rem
      sm: '14px',    // 0.875rem
      base: '16px',  // 1rem
      lg: '18px',    // 1.125rem
      xl: '20px',    // 1.25rem
      '2xl': '24px', // 1.5rem
      '3xl': '30px', // 1.875rem
      '4xl': '36px', // 2.25rem
      '5xl': '48px', // 3rem
      '6xl': '60px', // 3.75rem
      '7xl': '72px', // 4.5rem
      '8xl': '96px', // 6rem
      '9xl': '128px' // 8rem
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    }
  },
  
  // 🎭 アニメーション
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms'
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },
  
  // 📱 ブレークポイント（レスポンシブ）
  breakpoints: {
    xs: '320px',   // 小型スマートフォン
    sm: '640px',   // 大型スマートフォン
    md: '768px',   // タブレット
    lg: '1024px',  // 小型ラップトップ
    xl: '1280px',  // デスクトップ
    '2xl': '1536px' // 大型デスクトップ
  },
  
  // 🔲 Z-Index（重ね順）
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',      // モーダル背景
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',  // モーダル
    popover: '1050',
    tooltip: '1060',
    notification: '1070' // 通知
  }
} as const;

// 🎨 テーマ別カラーマッピング
export const THEME_MAPPINGS = {
  light: {
    background: {
      primary: DESIGN_TOKENS.colors.neutral[0],      // 白
      secondary: DESIGN_TOKENS.colors.neutral[50],   // 極薄グレー
      tertiary: DESIGN_TOKENS.colors.neutral[100]    // 薄グレー
    },
    text: {
      primary: DESIGN_TOKENS.colors.neutral[800],    // 濃いテキスト
      secondary: DESIGN_TOKENS.colors.neutral[600],  // セカンダリテキスト
      tertiary: DESIGN_TOKENS.colors.neutral[500],   // プレースホルダー
      inverse: DESIGN_TOKENS.colors.neutral[0]       // 白テキスト
    },
    border: {
      primary: DESIGN_TOKENS.colors.neutral[200],    // ライトボーダー
      secondary: DESIGN_TOKENS.colors.neutral[300],  // 標準ボーダー
      focus: DESIGN_TOKENS.colors.primary[500]       // フォーカスボーダー
    }
  },
  dark: {
    background: {
      primary: DESIGN_TOKENS.colors.neutral[900],    // 濃い背景
      secondary: DESIGN_TOKENS.colors.neutral[800],  // セカンダリ背景
      tertiary: DESIGN_TOKENS.colors.neutral[700]    // 淡い背景
    },
    text: {
      primary: DESIGN_TOKENS.colors.neutral[100],    // 明るいテキスト
      secondary: DESIGN_TOKENS.colors.neutral[300],  // セカンダリテキスト
      tertiary: DESIGN_TOKENS.colors.neutral[400],   // プレースホルダー
      inverse: DESIGN_TOKENS.colors.neutral[900]     // 黒テキスト
    },
    border: {
      primary: DESIGN_TOKENS.colors.neutral[700],    // ダークボーダー
      secondary: DESIGN_TOKENS.colors.neutral[600],  // 標準ボーダー
      focus: DESIGN_TOKENS.colors.primary[400]       // フォーカスボーダー
    }
  }
} as const;

// 🧩 コンポーネント用スタイルプリセット
export const COMPONENT_STYLES = {
  // ボタンスタイル
  button: {
    base: {
      fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),  // 🔧 文字列化修正
      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
      borderRadius: DESIGN_TOKENS.borderRadius.md,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: DESIGN_TOKENS.spacing[2],
      userSelect: 'none'
    },
    sizes: {
      xs: {
        height: '24px',
        padding: `0 ${DESIGN_TOKENS.spacing[2]}`,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs
      },
      sm: {
        height: '32px', 
        padding: `0 ${DESIGN_TOKENS.spacing[3]}`,
        fontSize: DESIGN_TOKENS.typography.fontSize.sm
      },
      md: {
        height: '40px',
        padding: `0 ${DESIGN_TOKENS.spacing[4]}`,
        fontSize: DESIGN_TOKENS.typography.fontSize.base
      },
      lg: {
        height: '48px',
        padding: `0 ${DESIGN_TOKENS.spacing[6]}`, 
        fontSize: DESIGN_TOKENS.typography.fontSize.lg
      },
      xl: {
        height: '56px',
        padding: `0 ${DESIGN_TOKENS.spacing[8]}`,
        fontSize: DESIGN_TOKENS.typography.fontSize.xl
      }
    },
    variants: {
      primary: {
        backgroundColor: DESIGN_TOKENS.colors.primary[500],
        color: DESIGN_TOKENS.colors.neutral[0]
      },
      secondary: {
        backgroundColor: DESIGN_TOKENS.colors.neutral[100],
        color: DESIGN_TOKENS.colors.neutral[700]
      },
      outline: {
        backgroundColor: 'transparent',
        color: DESIGN_TOKENS.colors.primary[500],
        border: `1px solid ${DESIGN_TOKENS.colors.primary[500]}`
      },
      ghost: {
        backgroundColor: 'transparent',
        color: DESIGN_TOKENS.colors.primary[500]
      }
    }
  },
  
  // カード/パネルスタイル
  card: {
    base: {
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      overflow: 'hidden'
    },
    variants: {
      elevated: {
        boxShadow: DESIGN_TOKENS.shadows.md
      },
      flat: {
        boxShadow: 'none'
      },
      outlined: {
        border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`
      }
    }
  },
  
  // 入力フィールドスタイル
  input: {
    base: {
      fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),  // 🔧 文字列化修正
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.md,
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
      outline: 'none'
    },
    states: {
      focus: {
        borderColor: DESIGN_TOKENS.colors.primary[500],
        boxShadow: `0 0 0 3px ${DESIGN_TOKENS.colors.primary[500]}20`
      },
      error: {
        borderColor: DESIGN_TOKENS.colors.error[500],
        boxShadow: `0 0 0 3px ${DESIGN_TOKENS.colors.error[500]}20`
      }
    }
  }
} as const;

// 🎯 レイアウトユーティリティ
export const LAYOUT_UTILS = {
  // フレックスボックス
  flex: {
    center: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    between: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    start: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start'
    },
    end: {
      display: 'flex',
      alignItems: 'center', 
      justifyContent: 'flex-end'
    },
    column: {
      display: 'flex',
      flexDirection: 'column'
    }
  },
  
  // グリッド
  grid: {
    auto: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: DESIGN_TOKENS.spacing[4]
    },
    responsive: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: DESIGN_TOKENS.spacing[6]
    }
  },
  
  // 位置指定
  position: {
    relative: { position: 'relative' },
    absolute: { position: 'absolute' },
    fixed: { position: 'fixed' },
    sticky: { position: 'sticky' }
  }
} as const;

// 📱 レスポンシブヘルパー
export const RESPONSIVE_HELPERS = {
  // モバイルファースト
  mobile: `@media (max-width: ${DESIGN_TOKENS.breakpoints.sm})`,
  tablet: `@media (min-width: ${DESIGN_TOKENS.breakpoints.md})`,
  desktop: `@media (min-width: ${DESIGN_TOKENS.breakpoints.lg})`,
  wide: `@media (min-width: ${DESIGN_TOKENS.breakpoints.xl})`,
  
  // 画面密度
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  
  // 操作方法
  touch: '@media (hover: none) and (pointer: coarse)',
  mouse: '@media (hover: hover) and (pointer: fine)',
  
  // 設定
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  darkMode: '@media (prefers-color-scheme: dark)'
} as const;

// 🎨 使用例とドキュメント
export const USAGE_EXAMPLES = {
  // モダンボタンの作成例
  modernButton: {
    style: {
      ...COMPONENT_STYLES.button.base,
      ...COMPONENT_STYLES.button.sizes.md,
      ...COMPONENT_STYLES.button.variants.primary,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.primary[600],
        transform: 'translateY(-1px)',
        boxShadow: DESIGN_TOKENS.shadows.lg
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: DESIGN_TOKENS.shadows.md
      }
    }
  },
  
  // モダンカードの作成例
  modernCard: {
    style: {
      ...COMPONENT_STYLES.card.base,
      ...COMPONENT_STYLES.card.variants.elevated,
      padding: DESIGN_TOKENS.spacing[6],
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: DESIGN_TOKENS.shadows.lg
      }
    }
  }
} as const;

// 🔧 ヘルパー関数
export const createResponsiveValue = (
  mobile: string,
  tablet?: string,
  desktop?: string,
  wide?: string
) => ({
  [mobile]: mobile,
  ...(tablet && { [RESPONSIVE_HELPERS.tablet]: tablet }),
  ...(desktop && { [RESPONSIVE_HELPERS.desktop]: desktop }),
  ...(wide && { [RESPONSIVE_HELPERS.wide]: wide })
});

export const createColorWithOpacity = (color: string, opacity: number) => 
  `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;

export const createSpacing = (multiplier: number) => 
  `${8 * multiplier}px`;

// Type exports for TypeScript
export type DesignTokens = typeof DESIGN_TOKENS;
export type ComponentStyles = typeof COMPONENT_STYLES;
export type ThemeMappings = typeof THEME_MAPPINGS;