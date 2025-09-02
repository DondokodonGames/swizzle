/**
 * ゲームプロジェクト全体管理型定義
 * Phase 6: ゲームエディター実装用
 */

import { ProjectAssets } from './ProjectAssets';
import { GameScript } from './GameScript';
import { EditorTab, ProjectStatus, DifficultyLevel, GameDurationOption } from '../../constants/EditorLimits';

// ゲーム設定
export interface GameSettings {
  // 基本設定
  name: string;                           // ゲーム名（1-50文字）
  description?: string;                   // ゲーム説明（0-200文字）
  
  // ゲーム時間設定
  duration: {
    type: 'fixed' | 'unlimited';         // 固定時間 or 成功条件まで無制限
    seconds?: GameDurationOption;         // 固定時間の場合（5,10,15,20,30）
    maxSeconds?: number;                  // 無制限の場合の最大時間（安全措置、60-300）
  };
  
  // 難易度設定
  difficulty: DifficultyLevel;            // 'easy' | 'normal' | 'hard'
  
  // 公開設定
  publishing: {
    isPublished: boolean;
    publishedAt?: string;                 // ISO日時文字列
    visibility: 'public' | 'unlisted' | 'private';
    allowComments: boolean;
    allowRemix: boolean;                  // 他ユーザーによる改変を許可
    
    // メタデータ
    tags?: string[];                      // 検索用タグ
    category?: string;                    // カテゴリ
  };
  
  // プレビュー設定
  preview: {
    thumbnailDataUrl?: string;            // ゲームサムネイル（base64）
    previewGif?: string;                  // プレビューGIFアニメーション（base64）
    screenshotDataUrls?: string[];        // スクリーンショット（最大5枚）
  };
  
  // エクスポート設定
  export: {
    includeSourceData: boolean;           // ソースデータを含めるか
    compressionLevel: 'low' | 'medium' | 'high'; // 圧縮レベル
    format: 'json' | 'zip';               // 出力形式
  };
}

// エディター状態管理
export interface EditorState {
  activeTab: EditorTab;                   // 現在のタブ
  lastSaved: string;                      // 最終保存日時（ISO文字列）
  autoSaveEnabled: boolean;               // 自動保存ON/OFF
  
  // 各タブの状態
  tabStates: {
    assets: {
      selectedAssetType: 'background' | 'objects' | 'texts' | null;
      selectedAssetId: string | null;
      showAnimationEditor: boolean;
    };
    audio: {
      selectedAudioType: 'bgm' | 'se' | null;
      selectedAudioId: string | null;
      isPlaying: boolean;
    };
    script: {
      mode: 'layout' | 'rules';
      selectedObjectId: string | null;
      selectedRuleId: string | null;
      showRuleEditor: boolean;
    };
    settings: {
      showTestPlay: boolean;
      lastTestResult: 'success' | 'failure' | null;
    };
  };
  
  // UI状態
  ui: {
    sidebarCollapsed: boolean;
    previewVisible: boolean;
    capacityMeterExpanded: boolean;
  };
}

// プロジェクトメタデータ
export interface ProjectMetadata {
  // 統計情報
  statistics: {
    totalEditTime: number;                // 編集時間（秒）
    saveCount: number;                    // 保存回数
    testPlayCount: number;                // テストプレイ回数
    publishCount: number;                 // 公開回数
  };
  
  // 利用状況
  usage: {
    lastOpened: string;                   // 最終オープン日時
    totalOpenCount: number;               // オープン回数
    averageSessionTime: number;           // 平均セッション時間（秒）
  };
  
  // パフォーマンス
  performance: {
    lastBuildTime: number;                // 最終ビルド時間（ms）
    averageFPS: number;                   // 平均FPS
    memoryUsage: number;                  // メモリ使用量（MB）
  };
}

// バージョン履歴
export interface VersionHistory {
  id: string;
  version: string;                        // セマンティックバージョン（1.0.0）
  createdAt: string;                      // 作成日時
  description: string;                    // 変更内容
  author: string;                         // 作成者
  
  // 変更内容詳細
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    category: 'assets' | 'audio' | 'script' | 'settings';
    description: string;
    affectedItems?: string[];             // 影響を受けたアイテムID
  }>;
  
  // スナップショットデータ（軽量化）
  snapshot?: {
    assetsCount: { background: number; objects: number; texts: number; bgm: number; se: number };
    rulesCount: number;
    totalSize: number;
  };
}

// メインのGameProjectインターフェース
export interface GameProject {
  // 基本情報
  id: string;                             // UUID
  name: string;                           // プロジェクト名
  createdAt: string;                      // 作成日時（ISO文字列）
  lastModified: string;                   // 最終更新日時（ISO文字列）
  version: string;                        // プロジェクトバージョン
  
  // 作成者情報
  creator: {
    userId?: string;                      // 作成者ID（認証時）
    username?: string;                    // 作成者名
    isAnonymous: boolean;                 // 匿名作成か
  };
  
  // アセット管理
  assets: ProjectAssets;
  
  // スクリプト・ロジック
  script: GameScript;
  
  // ゲーム設定
  settings: GameSettings;
  
  // ステータス・メタデータ
  status: ProjectStatus;                  // 'draft' | 'testing' | 'published'
  totalSize: number;                      // 現在の総容量（bytes）
  
  // エディター固有情報
  editorState?: EditorState;
  
  // メタデータ
  metadata: ProjectMetadata;
  
  // バージョン履歴（最新10件）
  versionHistory: VersionHistory[];
  
  // プロジェクト設定
  projectSettings: {
    autoSaveInterval: number;             // 自動保存間隔（ms）
    backupEnabled: boolean;               // バックアップ有効
    compressionEnabled: boolean;          // 圧縮有効
    maxVersionHistory: number;            // 最大履歴保持数
  };
}

// プロジェクト作成オプション
export interface CreateProjectOptions {
  name: string;
  templateId?: string;                    // ベーステンプレート
  copyFromProjectId?: string;             // 既存プロジェクトからコピー
  
  // 初期設定
  initialSettings?: Partial<GameSettings>;
  
  // アセット事前設定
  initialAssets?: {
    backgroundUrl?: string;
    characterUrls?: string[];
    audioUrls?: string[];
  };
}

// プロジェクト検索・フィルタ
export interface ProjectFilter {
  // 基本フィルタ
  status?: ProjectStatus | ProjectStatus[];
  createdAfter?: string;                  // ISO日時文字列
  createdBefore?: string;                 // ISO日時文字列
  
  // サイズフィルタ
  minSize?: number;                       // bytes
  maxSize?: number;                       // bytes
  
  // タグ・カテゴリフィルタ
  tags?: string[];
  category?: string;
  
  // 検索クエリ
  searchQuery?: string;                   // 名前・説明文検索
  
  // ソート設定
  sortBy?: 'name' | 'createdAt' | 'lastModified' | 'totalSize';
  sortOrder?: 'asc' | 'desc';
  
  // ページネーション
  page?: number;
  limit?: number;                         // 1-50
}

// プロジェクト一覧項目（軽量版）
export interface ProjectListItem {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  lastModified: string;
  totalSize: number;
  
  // プレビュー情報
  thumbnailDataUrl?: string;
  description?: string;
  
  // 統計情報（軽量）
  assetsCounts: {
    background: number;
    objects: number;
    texts: number;
    bgm: number;
    se: number;
  };
  
  rulesCount: number;
  
  // 公開情報
  isPublished: boolean;
  visibility?: 'public' | 'unlisted' | 'private';
}

// プロジェクト操作結果
export interface ProjectOperationResult {
  success: boolean;
  projectId?: string;
  message?: string;
  errors?: string[];
  
  // 操作詳細
  operation: 'create' | 'save' | 'load' | 'delete' | 'publish' | 'export';
  duration: number;                       // 処理時間（ms）
  
  // 結果データ
  resultData?: {
    project?: GameProject;
    exportUrl?: string;
    publishUrl?: string;
  };
}

// プロジェクト検証結果
export interface ProjectValidationResult {
  isValid: boolean;
  
  // 各分野の検証結果
  assetsValidation: import('./ProjectAssets').AssetValidationResult;
  scriptValidation: import('./GameScript').ScriptValidationResult;
  
  // プロジェクト全体の検証
  projectErrors: Array<{
    type: 'missing_assets' | 'broken_references' | 'size_limit' | 'configuration';
    message: string;
    severity: 'error' | 'warning';
  }>;
  
  // 公開準備チェック
  publishReadiness: {
    canPublish: boolean;
    requiredFixes: string[];
    recommendations: string[];
  };
}