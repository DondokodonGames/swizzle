/**
 * エディター機能の制限値・定数定義
 * Phase 6: ゲームエディター実装用 + SimpleRuleModal拡張対応
 * 🔧 修正: 4タブ→3タブ統合（AUDIO削除、ASSETS統合）
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
  },
  
  // ゲーム設定制限
  GAME_SETTINGS: {
    NAME_MIN_LENGTH: 1,                  // ゲーム名最小文字数
    NAME_MAX_LENGTH: 50,                 // ゲーム名最大文字数
    DESCRIPTION_MAX_LENGTH: 200,         // 説明文最大文字数
    DURATION_OPTIONS: [5, 10, 15, 20, 30] as const, // 選択可能な秒数
    MAX_UNLIMITED_SECONDS: 300,          // 無制限モード最大時間（5分）
    DIFFICULTY_LEVELS: ['easy', 'normal', 'hard'] as const,
    MAX_TAGS: 10,                        // 最大タグ数
    MAX_SCREENSHOTS: 5                   // 最大スクリーンショット数
  },
  
  // テストプレイ制限
  TEST_PLAY: {
    MAX_DURATION: 60,                    // テスト最大時間（60秒）
    SIMULATION_TIME: 3000,               // シミュレーション時間（3秒）
    SUCCESS_PROBABILITY: 0.7,            // 成功確率（70%）
    TIMEOUT_MESSAGE: 'テストがタイムアウトしました'
  },
  
  // 公開制限
  PUBLISHING: {
    MIN_ASSETS_COUNT: 1,                 // 最低必要アセット数
    MIN_RULES_OR_CONDITIONS: 0,          // 最低ルール数（警告レベル）
    VISIBILITY_OPTIONS: ['public', 'unlisted', 'private'] as const,
    THUMBNAIL_WIDTH: 300,                // サムネイル幅
    THUMBNAIL_HEIGHT: 400,               // サムネイル高さ（9:16比率）
    EXPORT_FORMATS: ['json', 'zip'] as const
  },
  
  // ScriptTab専用制限
  SCRIPT: {
    MAX_CONDITIONS_PER_RULE: 10,         // 1ルールあたりの最大条件数
    MAX_ACTIONS_PER_RULE: 10,            // 1ルールあたりの最大アクション数
    MAX_RULE_NAME_LENGTH: 30,            // ルール名最大文字数
    MAX_FLAG_NAME_LENGTH: 20,            // フラグ名最大文字数
    MAX_SUCCESS_CONDITIONS: 5,           // 最大成功条件数
    
    // 移動・エフェクト制限
    MAX_MOVEMENT_SPEED: 1000,            // 最大移動速度（px/sec）
    MAX_MOVEMENT_DURATION: 10,           // 最大移動時間（秒）
    MAX_EFFECT_DURATION: 5,              // 最大エフェクト時間（秒）
    MAX_ORBIT_RADIUS: 200,               // 最大軌道半径（px）
    
    // パフォーマンス
    COMPLEXITY_THRESHOLD: 80,            // 複雑度警告閾値
    MAX_CONCURRENT_RULES: 20             // 同時実行最大ルール数
  }
} as const;

// 🔧 修正: エディタータブ種類（4タブ→3タブ統合）
export const EDITOR_TABS = {
  ASSETS: 'assets',    // 🎨 統合アセット（画像+音声+テキスト）
  SCRIPT: 'script',    // ⚙️ ルール
  SETTINGS: 'settings' // 🚀 公開
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

// 🔧 拡張: 条件ライブラリ（SimpleRuleModal対応版）
export const CONDITIONS_LIBRARY = [
  // 基本条件
  { type: 'touch', label: 'タッチしたとき', icon: '👆', color: 'bg-blue-100', description: 'オブジェクトをタップしたら発動' },
  { type: 'time', label: '時間経過', icon: '⏰', color: 'bg-green-100', description: '指定時間後に自動発動' },
  
  // 🔧 新規追加: 位置・移動条件
  { type: 'position', label: '位置にいるとき', icon: '📍', color: 'bg-purple-100', description: '指定エリアに入った・出た時' },
  { type: 'collision', label: 'ぶつかったとき', icon: '💥', color: 'bg-red-100', description: '他のオブジェクトと衝突時' },
  
  // 🔧 新規追加: アニメーション・状態条件
  { type: 'animation', label: 'アニメ終了時', icon: '🎬', color: 'bg-orange-100', description: 'アニメーションが終了した時' },
  { type: 'flag', label: 'フラグがONのとき', icon: '🚩', color: 'bg-yellow-100', description: 'カスタムフラグの状態確認' },
  
  // 🔧 新規追加: ゲーム状態条件
  { type: 'gameState', label: 'ゲーム状態', icon: '🎮', color: 'bg-indigo-100', description: 'ゲーム全体の状態確認' },
  { type: 'score', label: 'スコア条件', icon: '🏆', color: 'bg-emerald-100', description: 'スコアが特定値に達した時' },
] as const;

// 🔧 拡張: アクションライブラリ（SimpleRuleModal対応版）
export const ACTIONS_LIBRARY = [
  // ゲーム制御アクション
  { type: 'success', label: 'ゲームクリア！', icon: '🎉', color: 'bg-emerald-100', description: '成功でゲーム終了' },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀', color: 'bg-rose-100', description: '失敗でゲーム終了' },
  { type: 'pause', label: 'ポーズ', icon: '⏸️', color: 'bg-gray-100', description: 'ゲームを一時停止' },
  { type: 'restart', label: 'リスタート', icon: '🔄', color: 'bg-blue-100', description: 'ゲームを最初から' },
  
  // 音響アクション
  { type: 'playSound', label: '音を鳴らす', icon: '🔊', color: 'bg-indigo-100', description: '効果音を再生' },
  { type: 'playBGM', label: 'BGM再生', icon: '🎵', color: 'bg-violet-100', description: 'バックグラウンドミュージック再生' },
  { type: 'stopSound', label: '音停止', icon: '🔇', color: 'bg-gray-100', description: '音声再生を停止' },
  
  // 🔧 新規追加: オブジェクト制御アクション
  { type: 'move', label: '移動する', icon: '🏃', color: 'bg-cyan-100', description: '指定位置に移動' },
  { type: 'show', label: '表示する', icon: '👁️', color: 'bg-teal-100', description: 'オブジェクトを表示' },
  { type: 'hide', label: '隠す', icon: '🫥', color: 'bg-gray-100', description: 'オブジェクトを非表示' },
  { type: 'switchAnimation', label: 'アニメ変更', icon: '🔄', color: 'bg-orange-100', description: 'アニメーションを切り替え' },
  
  // 🔧 新規追加: エフェクトアクション
  { type: 'effect', label: 'エフェクト', icon: '✨', color: 'bg-yellow-100', description: 'フラッシュ・シェイク等' },
  { type: 'particles', label: 'パーティクル', icon: '🎆', color: 'bg-pink-100', description: 'パーティクルエフェクト' },
  
  // スコア・メッセージ関連は削除（ユーザー要求により）
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', color: 'bg-yellow-100', description: 'カスタムフラグをON/OFF' },
] as const;

// 🔧 新規追加: 移動パターンライブラリ
export const MOVEMENT_PATTERNS = [
  { type: 'straight', label: 'まっすぐ移動', icon: '➡️', description: '指定位置へ直線移動' },
  { type: 'teleport', label: '瞬間移動', icon: '⚡', description: '即座に位置変更' },
  { type: 'wander', label: 'ふらふら移動', icon: '🔄', description: 'ランダムな方向に移動' },
  { type: 'bounce', label: 'ぴょんぴょん', icon: '🦘', description: '跳ねるような移動' },
  { type: 'orbit', label: '回転移動', icon: '🌀', description: '円形軌道で移動' },
  { type: 'approach', label: '追跡移動', icon: '🎯', description: '他のオブジェクトに近づく' },
] as const;

// 🔧 新規追加: エフェクトパターンライブラリ
export const EFFECT_PATTERNS = [
  { type: 'flash', label: 'フラッシュ', icon: '⚡', description: '画面・オブジェクトを光らせる' },
  { type: 'shake', label: 'シェイク', icon: '🥶', description: '振動・揺れエフェクト' },
  { type: 'scale', label: '拡大縮小', icon: '📏', description: 'サイズ変更エフェクト' },
  { type: 'rotate', label: '回転', icon: '🔄', description: '回転エフェクト' },
  { type: 'fade', label: 'フェード', icon: '🌫️', description: 'フェードイン・アウト' },
  { type: 'particles', label: 'パーティクル', icon: '✨', description: 'パーティクル放出' },
] as const;

// 🔧 新規追加: 位置エリアプリセット
export const POSITION_AREAS = [
  { type: 'center', label: '中央エリア', icon: '🎯', region: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 } },
  { type: 'top', label: '上部エリア', icon: '⬆️', region: { x: 0.2, y: 0.0, width: 0.6, height: 0.3 } },
  { type: 'bottom', label: '下部エリア', icon: '⬇️', region: { x: 0.2, y: 0.7, width: 0.6, height: 0.3 } },
  { type: 'left', label: '左側エリア', icon: '⬅️', region: { x: 0.0, y: 0.2, width: 0.3, height: 0.6 } },
  { type: 'right', label: '右側エリア', icon: '➡️', region: { x: 0.7, y: 0.2, width: 0.3, height: 0.6 } },
  { type: 'corners', label: '四隅', icon: '📐', region: { x: 0.0, y: 0.0, width: 0.25, height: 0.25 } },
] as const;

// 🔧 新規追加: 移動速度プリセット  
export const MOVEMENT_SPEEDS = [
  { type: 'slow', label: 'ゆっくり', icon: '🐌', speed: 100, description: '100px/秒' },
  { type: 'normal', label: '普通', icon: '🚶', speed: 300, description: '300px/秒' },
  { type: 'fast', label: '早い', icon: '🏃', speed: 600, description: '600px/秒' },
  { type: 'instant', label: '瞬間', icon: '⚡', speed: 9999, description: '即座移動' },
] as const;

// 時間プリセット（SettingsTab用）
export const DURATION_PRESETS = [
  { value: 5, label: '5秒', description: 'サクッと', emoji: '⚡', color: 'bg-yellow-100 border-yellow-300' },
  { value: 10, label: '10秒', description: 'ちょうどいい', emoji: '⏰', color: 'bg-blue-100 border-blue-300' },
  { value: 15, label: '15秒', description: 'じっくり', emoji: '🎯', color: 'bg-green-100 border-green-300' },
  { value: 30, label: '30秒', description: 'たっぷり', emoji: '🏃', color: 'bg-purple-100 border-purple-300' },
] as const;

// 難易度プリセット（SettingsTab用）
export const DIFFICULTY_PRESETS = [
  { value: 'easy', label: 'やさしい', description: '誰でも楽しめる', emoji: '😊', color: 'bg-green-100 border-green-300' },
  { value: 'normal', label: 'ふつう', description: 'ちょうどいい挑戦', emoji: '🙂', color: 'bg-blue-100 border-blue-300' },
  { value: 'hard', label: 'むずかしい', description: '上級者向け', emoji: '😤', color: 'bg-red-100 border-red-300' },
] as const;

// エラーメッセージ定数
export const ERROR_MESSAGES = {
  // 一般的なエラー
  GENERIC_ERROR: '予期しないエラーが発生しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  
  // プロジェクトエラー
  PROJECT_NOT_FOUND: 'プロジェクトが見つかりません',
  PROJECT_LOAD_FAILED: 'プロジェクトの読み込みに失敗しました',
  PROJECT_SAVE_FAILED: 'プロジェクトの保存に失敗しました',
  
  // ファイルエラー
  FILE_TOO_LARGE: 'ファイルサイズが上限を超えています',
  INVALID_FILE_TYPE: 'サポートされていないファイル形式です',
  FILE_UPLOAD_FAILED: 'ファイルのアップロードに失敗しました',
  
  // バリデーションエラー
  GAME_NAME_REQUIRED: 'ゲーム名を入力してください',
  GAME_NAME_TOO_LONG: 'ゲーム名は50文字以内で入力してください',
  DESCRIPTION_TOO_LONG: '説明文は200文字以内で入力してください',
  NO_ASSETS: '最低1つのオブジェクトまたは背景を追加してください',
  NO_RULES: 'ゲームルールまたは成功条件を設定してください',
  
  // 公開エラー
  PUBLISH_FAILED: 'ゲームの公開に失敗しました',
  EXPORT_FAILED: 'エクスポートに失敗しました',
  TEST_PLAY_FAILED: 'テストプレイに失敗しました',
  
  // 容量制限エラー
  PROJECT_SIZE_EXCEEDED: 'プロジェクトサイズが上限を超えています',
  ASSET_LIMIT_EXCEEDED: 'アセット数が上限を超えています'
} as const;

// 成功メッセージ定数
export const SUCCESS_MESSAGES = {
  PROJECT_SAVED: 'プロジェクトを保存しました',
  PROJECT_PUBLISHED: 'ゲームを公開しました',
  PROJECT_EXPORTED: 'プロジェクトをエクスポートしました',
  FILE_UPLOADED: 'ファイルをアップロードしました',
  TEST_PLAY_SUCCESS: 'テストプレイが成功しました',
  THUMBNAIL_GENERATED: 'サムネイルを生成しました'
} as const;