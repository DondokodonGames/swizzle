/**
 * エディター機能の制限値・定数定義
 * Phase 6: ゲームエディター実装用
 */

export const EDITOR_LIMITS = {
  // 画像制限
  IMAGE: {
    BACKGROUND_FRAME_MAX_SIZE: 2 * 1024 * 1024,    // 2MB/フレーム
    BACKGROUND_TOTAL_MAX_SIZE: 8 * 1024 * 1024,    // 8MB（4フレーム合計）
    OBJECT_FRAME_MAX_SIZE: 1 * 1024 * 1024,        // 1MB/フレーム
    OBJECT_TOTAL_MAX_SIZE: 8 * 1024 * 1024,        // 8MB（8フレーム合計）
    
    MAX_WIDTH: 2048,
    MAX_HEIGHT: 2048,
    MIN_WIDTH: 32,
    MIN_HEIGHT: 32,
    
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as const,
    COMPRESSION_QUALITY: 0.8, // JPEG圧縮品質
    AUTO_RESIZE_THRESHOLD: 1920 // この解像度を超えたら自動リサイズ
  },
  
  // 音声制限
  AUDIO: {
    BGM_MAX_SIZE: 5 * 1024 * 1024,       // 5MB
    BGM_MAX_DURATION: 30,                // 30秒
    SE_MAX_SIZE: 1 * 1024 * 1024,        // 1MB/個
    SE_MAX_DURATION: 10,                 // 10秒
    
    SUPPORTED_FORMATS: ['audio/mp3', 'audio/wav', 'audio/ogg'] as const,
    DEFAULT_COMPRESSION: 128, // kbps
    SAMPLE_RATE: 44100 // Hz
  },
  
  // テキスト制限
  TEXT: {
    MAX_LENGTH: 8,           // 8文字
    MAX_COUNT: 5,            // 5個まで
    MIN_FONT_SIZE: 12,       // 最小フォントサイズ
    MAX_FONT_SIZE: 72        // 最大フォントサイズ
  },
  
  // プロジェクト全体制限
  PROJECT: {
    TOTAL_MAX_SIZE: 50 * 1024 * 1024,    // 50MB
    MAX_OBJECTS: 15,                     // オブジェクト最大数
    MAX_SE_COUNT: 15,                    // SE最大数
    MAX_RULES: 50,                       // ルール最大数
    MAX_FLAGS: 20,                       // フラグ最大数
    MAX_TEXTS: 5,                        // テキスト最大数
    
    AUTO_SAVE_INTERVAL: 30000,           // 30秒間隔で自動保存
    VERSION_HISTORY_COUNT: 10            // バージョン履歴保持数
  },
  
  // パフォーマンス制限
  PERFORMANCE: {
    MAX_ANIMATION_FPS: 30,               // アニメーション最大FPS
    MAX_PARTICLES: 100,                  // パーティクル最大数
    MAX_CONCURRENT_SOUNDS: 8,            // 同時再生音数
    SCRIPT_EXECUTION_TIMEOUT: 5000       // スクリプト実行タイムアウト(ms)
  }
} as const;

// エディタータブ種類
export const EDITOR_TABS = {
  ASSETS: 'assets',
  AUDIO: 'audio', 
  SCRIPT: 'script',
  SETTINGS: 'settings'
} as const;

export type EditorTab = typeof EDITOR_TABS[keyof typeof EDITOR_TABS];

// プロジェクト状態
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  TESTING: 'testing', 
  PUBLISHED: 'published'
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

// ゲーム時間設定
export const GAME_DURATION_OPTIONS = [5, 10, 15, 20, 30] as const;
export type GameDurationOption = typeof GAME_DURATION_OPTIONS[number];

// 難易度設定
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard'
} as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

// アニメーション設定
export const ANIMATION_SETTINGS = {
  MIN_FPS: 1,
  MAX_FPS: 30,
  DEFAULT_FPS: 12,
  MAX_BACKGROUND_FRAMES: 4,
  MAX_OBJECT_FRAMES: 8
} as const;