/**
 * ゲーム設定型定義
 * Phase 6: ゲームエディター実装用
 */

// ゲーム時間設定
export interface GameDuration {
  type: 'fixed' | 'unlimited'; // 固定時間 or 成功条件まで無制限
  seconds?: 5 | 10 | 15 | 20 | 30; // 固定時間の場合
  maxSeconds?: number; // 無制限の場合の最大時間（安全措置）
}

// プレビュー設定
export interface GamePreview {
  thumbnailDataUrl?: string; // ゲームサムネイル
  previewGif?: string; // プレビューGIFアニメーション
  screenshots?: string[]; // スクリーンショット
}

// 公開設定
export interface PublishingSettings {
  isPublished: boolean;
  publishedAt?: string;
  visibility: 'public' | 'unlisted' | 'private';
  allowComments: boolean;
  allowRemix: boolean; // 他ユーザーによる改変を許可
  tags?: string[]; // タグ
}

// エクスポート設定
export interface ExportSettings {
  includeSourceData: boolean; // ソースデータを含めるか
  compressionLevel: 'low' | 'medium' | 'high'; // 圧縮レベル
  format: 'json' | 'zip'; // 出力形式
}

// ゲーム設定全体
export interface GameSettings {
  // 基本設定
  name: string; // ゲーム名
  description?: string; // ゲーム説明（50文字以内）
  
  // ゲーム時間設定
  duration: GameDuration;
  
  // 難易度設定
  difficulty: 'easy' | 'normal' | 'hard';
  
  // 公開設定
  publishing: PublishingSettings;
  
  // プレビュー設定
  preview: GamePreview;
  
  // エクスポート設定
  export: ExportSettings;
}