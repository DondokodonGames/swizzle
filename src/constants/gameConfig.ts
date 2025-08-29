// ショートゲームプラットフォーム - ゲーム設定統合ファイル
// Phase 4: 画面サイズ統一とアセット仕様策定（クリーンバージョン）

/**
 * ゲーム全体の基本設定
 * 9:16アスペクト比（1080x1920）を基準とした統一設計
 */
export const GAME_CONFIG = {
  /**
   * ビューポート設定 - 全ゲーム共通
   */
  VIEWPORT: {
    // 基準解像度（縦長モバイル最適化）
    WIDTH: 1080,
    HEIGHT: 1920,
    ASPECT_RATIO: 9 / 16,
    
    // レスポンシブ対応用の最小・最大サイズ
    MIN_WIDTH: 320,
    MIN_HEIGHT: 568,
    MAX_WIDTH: 1440,
    MAX_HEIGHT: 2560,
    
    // ピクセル密度対応
    PIXEL_RATIO: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  },

  /**
   * ゲーム領域設定
   * 安全領域を考慮したレイアウト
   */
  GAME_AREA: {
    // メインゲーム領域（画面中央60%）
    MAIN: {
      Y_START: 0.2,  // 上から20%の位置
      Y_END: 0.8,    // 上から80%の位置
      HEIGHT_RATIO: 0.6
    },
    
    // UI領域
    HEADER: {
      Y_START: 0,
      Y_END: 0.2,
      HEIGHT_RATIO: 0.2
    },
    
    FOOTER: {
      Y_START: 0.8,
      Y_END: 1.0,
      HEIGHT_RATIO: 0.2
    }
  },

  /**
   * アセット仕様 - 容量優先設定
   */
  ASSETS: {
    /**
     * 画像仕様（WebP形式・品質60%）
     */
    IMAGE: {
      // フォーマット設定
      FORMAT: 'webp',
      FALLBACK_FORMAT: 'png',
      QUALITY: 60,  // 容量優先
      
      // サイズ定義（5段階）
      BACKGROUND: {
        WIDTH: 1080,
        HEIGHT: 1920,
        MAX_SIZE_KB: 500  // 500KB以下
      },
      
      XL: {
        MAX_WIDTH: 400,
        MAX_HEIGHT: 400,
        MAX_SIZE_KB: 200  // 200KB以下
      },
      
      L: {
        MAX_WIDTH: 200,
        MAX_HEIGHT: 200,
        MAX_SIZE_KB: 100  // 100KB以下
      },
      
      M: {
        MAX_WIDTH: 100,
        MAX_HEIGHT: 100,
        MAX_SIZE_KB: 50   // 50KB以下
      },
      
      S: {
        MAX_WIDTH: 50,
        MAX_HEIGHT: 50,
        MAX_SIZE_KB: 25   // 25KB以下
      }
    },

    /**
     * 音声仕様（MP3形式・64kbps）
     */
    AUDIO: {
      // フォーマット設定
      FORMAT: 'mp3',
      FALLBACK_FORMAT: 'ogg',
      BITRATE: 64,  // 64kbps（容量優先）
      
      // BGM設定
      BGM: {
        MAX_DURATION: 30,    // 30秒以内
        MAX_SIZE_KB: 240,    // 240KB以下
        LOOP: true
      },
      
      // 効果音設定
      SE: {
        MAX_DURATION: 3,     // 3秒以内
        MAX_SIZE_KB: 24,     // 24KB以下
        LOOP: false
      }
    }
  },

  /**
   * パフォーマンス設定
   */
  PERFORMANCE: {
    // フレームレート
    TARGET_FPS: 60,
    MIN_FPS: 30,
    
    // メモリ使用量制限
    MAX_MEMORY_MB: 100,
    
    // 同時ロード可能アセット数
    MAX_CONCURRENT_LOADS: 5,
    
    // キャッシュサイズ
    CACHE_SIZE_MB: 50
  },

  /**
   * UI設定
   */
  UI: {
    // 共通UI要素のサイズ
    BUTTON_HEIGHT: 60,
    BUTTON_RADIUS: 30,
    
    // タイマーバー
    TIMER_BAR: {
      HEIGHT: 8,
      POSITION_Y: 1900, // 画面下端から20px
      MARGIN: 20
    },
    
    // 音量設定
    VOLUME_BUTTON: {
      SIZE: 48,
      POSITION_X: 1020, // 画面右端から60px
      POSITION_Y: 60    // 画面上端から60px
    },
    
    // スキップ・終了ボタン
    SKIP_EXIT_BUTTONS: {
      HEIGHT: 40,
      POSITION_Y: 80,   // 画面上端から80px
      SPACING: 20
    }
  },

  /**
   * アニメーション設定
   */
  ANIMATION: {
    // 基本アニメーション時間
    DURATION: {
      FAST: 200,     // 0.2秒
      NORMAL: 300,   // 0.3秒
      SLOW: 500      // 0.5秒
    },
    
    // イージング
    EASING: {
      IN: 'easeInQuad',
      OUT: 'easeOutQuad',
      IN_OUT: 'easeInOutQuad'
    }
  }
} as const;

/**
 * 画面サイズに応じたスケール計算
 */
export function calculateScale(containerWidth: number, containerHeight: number): number {
  const scaleX = containerWidth / GAME_CONFIG.VIEWPORT.WIDTH;
  const scaleY = containerHeight / GAME_CONFIG.VIEWPORT.HEIGHT;
  
  // アスペクト比を保持してスケール
  return Math.min(scaleX, scaleY);
}

/**
 * レスポンシブ座標変換
 */
export function getResponsivePosition(
  x: number, 
  y: number, 
  containerWidth: number, 
  containerHeight: number
) {
  const scale = calculateScale(containerWidth, containerHeight);
  
  return {
    x: x * scale,
    y: y * scale,
    scale
  };
}

/**
 * アセットパス生成
 */
export function getAssetPath(category: 'images' | 'audio', filename: string): string {
  return `/assets/${category}/${filename}`;
}

/**
 * 画像アセット検証（型安全版）
 */
export function validateImageAsset(
  file: File,
  category: 'BACKGROUND' | 'XL' | 'L' | 'M' | 'S'
): { valid: boolean; error?: string } {
  // 型安全な画像サイズ制限定義
  const IMAGE_SIZE_LIMITS = {
    BACKGROUND: 500, // KB
    XL: 200,
    L: 100,
    M: 50,
    S: 25
  } as const;
  
  const maxSizeKB = IMAGE_SIZE_LIMITS[category];
  
  // サイズチェック
  if (file.size > maxSizeKB * 1024) {
    return {
      valid: false,
      error: `ファイルサイズが上限（${maxSizeKB}KB）を超えています`
    };
  }
  
  // フォーマットチェック
  const allowedFormats = ['image/webp', 'image/png', 'image/jpeg'];
  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `対応していないファイル形式です（${file.type}）`
    };
  }
  
  return { valid: true };
}

/**
 * 音声アセット検証（型安全版）
 */
export function validateAudioAsset(
  file: File,
  category: 'BGM' | 'SE'
): { valid: boolean; error?: string } {
  // 型安全な音声サイズ制限定義
  const AUDIO_SIZE_LIMITS = {
    BGM: 240,  // KB
    SE: 24     // KB
  } as const;
  
  const maxSizeKB = AUDIO_SIZE_LIMITS[category];
  
  // サイズチェック
  if (file.size > maxSizeKB * 1024) {
    return {
      valid: false,
      error: `ファイルサイズが上限（${maxSizeKB}KB）を超えています`
    };
  }
  
  // フォーマットチェック
  const allowedFormats = ['audio/mp3', 'audio/mpeg', 'audio/ogg'];
  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `対応していないファイル形式です（${file.type}）`
    };
  }
  
  return { valid: true };
}

/**
 * デバイス情報取得
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      pixelRatio: 1,
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080
    };
  }

  return {
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768,
    pixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  };
}

/**
 * 型定義
 */
export type GameConfig = typeof GAME_CONFIG;
export type AssetImageCategory = 'BACKGROUND' | 'XL' | 'L' | 'M' | 'S';
export type AudioCategory = 'BGM' | 'SE';
export type DeviceInfo = ReturnType<typeof getDeviceInfo>;