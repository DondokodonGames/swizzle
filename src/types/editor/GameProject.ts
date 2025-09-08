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
  [x: string]: any;
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
  description?: string;                   // プロジェクト説明 ← 追加
  createdAt: string;                      // 作成日時（ISO文字列）
  lastModified: string;                   // 最終更新日時（ISO文字列）
  version: string;                        // プロジェクトバージョン
  thumbnailDataUrl?: string;              // サムネイル画像 ← 追加
  
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

// ★★★ 以下、SettingsTab対応用のデフォルト値・ヘルパー関数を追加 ★★★

/**
 * デフォルトゲーム設定
 */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  name: '',
  description: '',
  duration: {
    type: 'fixed',
    seconds: 10
  },
  difficulty: 'normal',
  publishing: {
    isPublished: false,
    visibility: 'private',
    allowComments: true,
    allowRemix: false
  },
  preview: {},
  export: {
    includeSourceData: true,
    compressionLevel: 'medium',
    format: 'json'
  }
};

/**
 * デフォルトエディター状態
 */
export const DEFAULT_EDITOR_STATE: EditorState = {
  activeTab: 'assets',
  lastSaved: new Date().toISOString(),
  autoSaveEnabled: true,
  tabStates: {
    assets: {
      selectedAssetType: null,
      selectedAssetId: null,
      showAnimationEditor: false
    },
    audio: {
      selectedAudioType: null,
      selectedAudioId: null,
      isPlaying: false
    },
    script: {
      mode: 'layout',
      selectedObjectId: null,
      selectedRuleId: null,
      showRuleEditor: false
    },
    settings: {
      showTestPlay: false,
      lastTestResult: null
    }
  },
  ui: {
    sidebarCollapsed: false,
    previewVisible: true,
    capacityMeterExpanded: false
  }
};

/**
 * デフォルトプロジェクトメタデータ
 */
export const DEFAULT_PROJECT_METADATA: ProjectMetadata = {
  statistics: {
    totalEditTime: 0,
    saveCount: 0,
    testPlayCount: 0,
    publishCount: 0
  },
  usage: {
    lastOpened: new Date().toISOString(),
    totalOpenCount: 1,
    averageSessionTime: 0
  },
  performance: {
    lastBuildTime: 0,
    averageFPS: 60,
    memoryUsage: 0
  }
};

/**
 * デフォルトプロジェクト作成関数 - 修正版
 */
export const createDefaultGameProject = (name: string, userId?: string): GameProject => {
  const now = new Date().toISOString();
  const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: projectId,
    name: name || 'New Game Project',
    createdAt: now,
    lastModified: now,
    version: '1.0.0',
    
    creator: {
      userId: userId,
      username: userId ? undefined : 'Anonymous',
      isAnonymous: !userId
    },
    
    // アセット（ProjectAssets型に準拠）
    assets: {
      background: null,
      objects: [],
      texts: [],
      audio: {
        bgm: null,
        se: []
      },
      statistics: {
        totalImageSize: 0,
        totalAudioSize: 0,
        totalSize: 0,
        usedSlots: {
          background: 0,
          objects: 0,
          texts: 0,
          bgm: 0,
          se: 0
        },
        // ProjectAssets.tsで定義されている正しい型構造に修正
        limitations: {
          isNearImageLimit: false,
          isNearAudioLimit: false,
          isNearTotalLimit: false,
          hasViolations: false
        }
      },
      lastModified: now  // ProjectAssets型で必須のlastModifiedプロパティを追加
    },
    
    // スクリプト（空の初期状態）
    script: {
      layout: {
        background: {
          visible: false,
          initialAnimation: 0,
          animationSpeed: 12,
          autoStart: false
        },
        objects: [],
        texts: [],
        stage: {
          backgroundColor: '#87CEEB'  // スカイブルー
        }
      },
      flags: [],
      rules: [],
      successConditions: [],
      statistics: {
        totalRules: 0,
        totalConditions: 0,
        totalActions: 0,
        complexityScore: 0,
        usedTriggerTypes: [],
        usedActionTypes: [],
        flagCount: 0,
        estimatedCPUUsage: 'low',
        estimatedMemoryUsage: 0,
        maxConcurrentEffects: 0
      },
      version: '1.0.0',
      lastModified: now
    },
    
    // ゲーム設定（SettingsTabで使用）
    settings: {
      ...DEFAULT_GAME_SETTINGS,
      name: name || 'My Awesome Game'
    },
    
    status: 'draft',
    totalSize: 0,
    
    editorState: DEFAULT_EDITOR_STATE,
    metadata: DEFAULT_PROJECT_METADATA,
    versionHistory: [],
    
    projectSettings: {
      autoSaveInterval: 30000,  // 30秒
      backupEnabled: true,
      compressionEnabled: false,
      maxVersionHistory: 10
    }
  };
};

/**
 * プロジェクト設定更新ヘルパー関数
 */
export const updateProjectSettings = (
  project: GameProject, 
  settingsUpdate: Partial<GameSettings>
): GameProject => {
  return {
    ...project,
    settings: {
      ...project.settings,
      ...settingsUpdate
    },
    lastModified: new Date().toISOString()
  };
};

/**
 * プロジェクト検証関数（基本版）
 */
export const validateGameProject = (project: GameProject): ProjectValidationResult => {
  const errors: Array<{
    type: 'missing_assets' | 'broken_references' | 'size_limit' | 'configuration';
    message: string;
    severity: 'error' | 'warning';
  }> = [];
  
  // 基本チェック
  if (!project.settings.name?.trim()) {
    errors.push({
      type: 'configuration',
      message: 'ゲーム名が設定されていません',
      severity: 'error'
    });
  }
  
  if (!project.assets.objects.length && !project.assets.background) {
    errors.push({
      type: 'missing_assets',
      message: '最低1つのオブジェクトまたは背景が必要です',
      severity: 'error'
    });
  }
  
  if (!project.script.rules.length && !project.script.successConditions.length) {
    errors.push({
      type: 'configuration',
      message: 'ゲームルールまたは成功条件を設定してください',
      severity: 'warning'
    });
  }
  
  // サイズ制限チェック（50MBを超えている場合）
  const SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
  if (project.totalSize > SIZE_LIMIT) {
    errors.push({
      type: 'size_limit',
      message: `プロジェクトサイズが制限(${SIZE_LIMIT / 1024 / 1024}MB)を超えています`,
      severity: 'error'
    });
  }
  
  const hasErrors = errors.some(e => e.severity === 'error');
  
  return {
    isValid: !hasErrors,
    assetsValidation: { isValid: true, errors: [], warnings: [] } as any, // 簡略化
    scriptValidation: { isValid: true, errors: [], warnings: [] } as any,  // 簡略化
    projectErrors: errors,
    publishReadiness: {
      canPublish: !hasErrors,
      requiredFixes: errors.filter(e => e.severity === 'error').map(e => e.message),
      recommendations: errors.filter(e => e.severity === 'warning').map(e => e.message)
    }
  };
};