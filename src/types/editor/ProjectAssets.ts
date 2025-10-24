/**
 * エディター用アセット管理型定義
 * Phase 6: ゲームエディター実装用
 * 🔧 修正版: データ構造保持・UI機能のみ削除（互換性確保）
 */

// 基本アセットフレーム
export interface AssetFrame {
  id: string;
  dataUrl: string;        // base64画像データ
  originalName: string;   // アップロード時のファイル名
  width: number;
  height: number;
  fileSize: number;       // バイト数
  uploadedAt: string;     // ISO日時文字列
}

// アニメーション設定
export interface AnimationSettings {
  speed: number;          // fps (1-30)
  loop: boolean;          // ループ再生
  pingPong: boolean;      // 往復再生
  autoStart: boolean;     // 自動開始
}

// 背景アセット（1枚、最大4フレーム）
export interface BackgroundAsset {
  id: string;
  name: string;           // ユーザー設定名
  frames: AssetFrame[];   // 最大4枚
  animationSettings: AnimationSettings;
  totalSize: number;      // 全フレーム合計サイズ
  createdAt: string;
  lastModified: string;
}

// オブジェクトアセット（最大15個、各8フレーム）
export interface ObjectAsset {
  id: string;
  name: string;           // ユーザー設定名（デフォルト: "オブジェクト1"等）
  frames: AssetFrame[];   // 最大8枚
  animationSettings: AnimationSettings;
  totalSize: number;      // 全フレーム合計サイズ
  createdAt: string;
  lastModified: string;
  
  // オブジェクト固有設定
  collisionBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // 表示設定
  defaultScale: number;   // デフォルトスケール（0.1-3.0）
  defaultOpacity: number; // デフォルト透明度（0.0-1.0）
}

// テキストスタイル（データ構造保持）
export interface TextStyle {
  fontSize: number;       // フォントサイズ（12-72）
  color: string;          // hex color (#ffffff)
  fontWeight: 'normal' | 'bold';
  fontFamily?: string;    // フォントファミリー
  
  // アウトライン
  outline?: {
    color: string;
    thickness: number;    // 1-5px
  };
  
  // シャドウ
  shadow?: {
    color: string;
    offsetX: number;      // -10 to 10
    offsetY: number;      // -10 to 10
    blur: number;         // 0-10
  };
}

// テキストアセット（最大5個、8文字以内）- データ構造保持
export interface TextAsset {
  id: string;
  content: string;        // 8文字制限
  style: TextStyle;
  createdAt: string;
  lastModified: string;
}

// 音声アセット
export interface AudioAsset {
  id: string;
  name: string;           // ユーザー設定名
  dataUrl: string;        // base64音声データ
  originalName: string;   // アップロード時のファイル名
  duration: number;       // 秒
  fileSize: number;       // バイト数
  format: string;         // 'mp3', 'wav', 'ogg'
  uploadedAt: string;
  
  // 音声固有設定
  volume: number;         // 0.0-1.0
  loop: boolean;          // SEの場合のループ設定
}

// アセット統計情報
export interface AssetStatistics {
  totalImageSize: number;     // 全画像サイズ合計
  totalAudioSize: number;     // 全音声サイズ合計
  totalSize: number;          // プロジェクト全体サイズ
  
  // 使用スロット数（修正: texts復活）
  usedSlots: {
    background: number;       // 0 or 1
    objects: number;          // 0-15
    texts: number;            // 0-5（データ構造保持・UI非表示）
    bgm: number;              // 0 or 1  
    se: number;               // 0-15
  };
  
  // 制限状況
  limitations: {
    isNearImageLimit: boolean;    // 画像容量80%以上
    isNearAudioLimit: boolean;    // 音声容量80%以上
    isNearTotalLimit: boolean;    // 総容量80%以上
    hasViolations: boolean;       // 制限違反あり
  };
}

// プロジェクトアセット全体管理
export interface ProjectAssets {
  // 背景（1枚固定）
  background: BackgroundAsset | null;
  
  // オブジェクト（最大15個）
  objects: ObjectAsset[];     // 最大15個
  
  // テキスト（最大5個）- データ構造保持・UI非表示
  texts: TextAsset[];         // 最大5個（空配列運用・既存コード互換性確保）
  
  // 音声
  audio: {
    bgm: AudioAsset | null;   // BGM 1個
    se: AudioAsset[];         // SE 最大15個
  };
  
  // 統計情報（自動計算）
  statistics: AssetStatistics;
  
  // 最終更新
  lastModified: string;
}

// アセット検証結果（修正: text復活）
export interface AssetValidationResult {
  isValid: boolean;
  errors: Array<{
    type: 'size' | 'format' | 'dimensions' | 'duration' | 'count';
    message: string;
    assetId?: string;
    assetType?: 'background' | 'object' | 'text' | 'bgm' | 'se'; // 'text'復活
  }>;
  warnings: Array<{
    type: 'optimization' | 'compatibility' | 'performance';
    message: string;
    suggestion?: string;
  }>;
}

// アセットアップロード設定
export interface AssetUploadOptions {
  maxSize?: number;           // バイト数制限
  allowedFormats?: string[];  // 許可フォーマット
  autoOptimize?: boolean;     // 自動最適化
  autoResize?: boolean;       // 自動リサイズ
  compressionQuality?: number; // 圧縮品質（0.1-1.0）
}

// アセット処理結果
export interface AssetProcessingResult {
  success: boolean;
  processedAsset?: AssetFrame | AudioAsset;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;   // 圧縮率
  processingTime: number;     // 処理時間(ms)
  errors?: string[];
}