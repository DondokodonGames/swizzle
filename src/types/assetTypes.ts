// ショートゲームプラットフォーム - アセット型定義
// Phase 4: 容量優先アセット仕様の型安全性確保

/**
 * アセットサイズカテゴリ
 */
export type ImageSizeCategory = 'BACKGROUND' | 'XL' | 'L' | 'M' | 'S';
export type AudioCategory = 'BGM' | 'SE';

/**
 * 画像アセット仕様
 */
export interface ImageAssetSpec {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeKB: number;
  format: 'webp' | 'png' | 'jpeg';
  quality: number;
}

/**
 * 音声アセット仕様
 */
export interface AudioAssetSpec {
  maxDuration: number;  // 秒
  maxSizeKB: number;
  bitrate: number;      // kbps
  format: 'mp3' | 'ogg';
  loop: boolean;
}

/**
 * アセットファイル情報
 */
export interface AssetFile {
  id: string;
  name: string;
  type: 'image' | 'audio';
  category: ImageSizeCategory | AudioCategory;
  url: string;
  localPath?: string;
  size: number;        // バイト
  width?: number;      // 画像の場合
  height?: number;     // 画像の場合
  duration?: number;   // 音声の場合（秒）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 画像アセット
 */
export interface ImageAsset extends AssetFile {
  type: 'image';
  category: ImageSizeCategory;
  width: number;
  height: number;
  format: 'webp' | 'png' | 'jpeg';
  hasTransparency: boolean;
}

/**
 * 音声アセット
 */
export interface AudioAsset extends AssetFile {
  type: 'audio';
  category: AudioCategory;
  duration: number;
  format: 'mp3' | 'ogg';
  bitrate: number;
  channels: number;
  sampleRate: number;
}

/**
 * アセット検証結果
 */
export interface AssetValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  recommendations?: string[];
}

/**
 * アセットアップロード進捗
 */
export interface AssetUploadProgress {
  assetId: string;
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * アセットライブラリ検索フィルター
 */
export interface AssetLibraryFilter {
  type?: 'image' | 'audio' | 'all';
  category?: ImageSizeCategory | AudioCategory;
  maxSize?: number;     // KB
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * アセットライブラリ検索結果
 */
export interface AssetLibrarySearchResult {
  assets: AssetFile[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * ゲームテンプレート用アセット要求仕様
 */
export interface GameTemplateAssetRequirements {
  templateId: string;
  templateName: string;
  
  required: {
    images: {
      [K in ImageSizeCategory]?: {
        count: number;
        description: string;
        examples?: string[];
      };
    };
    audio: {
      [K in AudioCategory]?: {
        count: number;
        description: string;
        examples?: string[];
      };
    };
  };
  
  optional: {
    images?: {
      [K in ImageSizeCategory]?: {
        count: number;
        description: string;
      };
    };
    audio?: {
      [K in AudioCategory]?: {
        count: number;
        description: string;
      };
    };
  };
}

/**
 * アセット最適化設定
 */
export interface AssetOptimizationSettings {
  images: {
    enableWebP: boolean;
    jpegQuality: number;     // 1-100
    pngCompression: number;  // 0-9
    resizeAlgorithm: 'lanczos' | 'cubic' | 'mitchell';
    stripMetadata: boolean;
  };
  
  audio: {
    enableMP3: boolean;
    mp3Quality: number;      // 0-9
    normalizeVolume: boolean;
    removesSilence: boolean;
  };
}

/**
 * アセット統計情報
 */
export interface AssetLibraryStats {
  totalAssets: number;
  totalSizeMB: number;
  
  byType: {
    images: {
      count: number;
      sizeMB: number;
    };
    audio: {
      count: number;
      sizeMB: number;
    };
  };
  
  byCategory: {
    [category: string]: {
      count: number;
      sizeMB: number;
    };
  };
  
  recentlyAdded: AssetFile[];
  mostUsed: AssetFile[];
  largestFiles: AssetFile[];
}

/**
 * アセット使用履歴
 */
export interface AssetUsageHistory {
  assetId: string;
  gameId?: string;
  templateId?: string;
  userId: string;
  usedAt: Date;
  context: 'game_creation' | 'template_development' | 'testing';
}

/**
 * アセットタグシステム
 */
export interface AssetTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdBy: string;
  usageCount: number;
}

/**
 * タグ付きアセット
 */
export interface TaggedAsset extends AssetFile {
  tags: AssetTag[];
}

/**
 * アセット変換ジョブ
 */
export interface AssetConversionJob {
  id: string;
  sourceAssetId: string;
  targetFormat: string;
  targetQuality?: number;
  targetSize?: { width: number; height: number };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  resultAssetId?: string;
  error?: string;
}

/**
 * アセット依存関係
 */
export interface AssetDependency {
  assetId: string;
  dependsOn: string[];  // 他のアセットのID
  usedBy: string[];     // このアセットを使用するゲーム/テンプレートのID
}

/**
 * バッチアセット操作
 */
export interface BatchAssetOperation {
  id: string;
  type: 'upload' | 'convert' | 'delete' | 'tag' | 'move';
  assetIds: string[];
  parameters: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 型ガード関数
 */
export function isImageAsset(asset: AssetFile): asset is ImageAsset {
  return asset.type === 'image';
}

export function isAudioAsset(asset: AssetFile): asset is AudioAsset {
  return asset.type === 'audio';
}

export function isImageCategory(category: string): category is ImageSizeCategory {
  return ['BACKGROUND', 'XL', 'L', 'M', 'S'].includes(category);
}

export function isAudioCategory(category: string): category is AudioCategory {
  return ['BGM', 'SE'].includes(category);
}

/**
 * アセット仕様定数
 */
export const ASSET_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILES_PER_UPLOAD: 50,
  MAX_TAGS_PER_ASSET: 10,
  SUPPORTED_IMAGE_FORMATS: ['webp', 'png', 'jpeg', 'jpg'] as const,
  SUPPORTED_AUDIO_FORMATS: ['mp3', 'ogg', 'wav'] as const,
  DEFAULT_IMAGE_QUALITY: 60,
  DEFAULT_AUDIO_BITRATE: 64,
} as const;

/**
 * エラー定数
 */
export const ASSET_ERRORS = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const;

export type AssetError = typeof ASSET_ERRORS[keyof typeof ASSET_ERRORS];