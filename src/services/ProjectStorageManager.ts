// src/services/ProjectStorageManager.ts - 実際のファイルベース修正版

// 🔧 インポート修正: 個別ファイルから直接インポート + createDefaultInitialState追加
import { GameProject } from '../types/editor/GameProject';
import { ProjectAssets } from '../types/editor/ProjectAssets';
import { GameScript, createDefaultInitialState } from '../types/editor/GameScript';
import { GameSettings } from '../types/editor/GameSettings';

// インターフェース定義（設計書準拠）
interface SaveOptions {
  createVersion?: boolean;
  versionName?: string;
  syncToCloud?: boolean;
  createBackup?: boolean;
  saveLocal?: boolean;
}

interface SaveResult {
  success: boolean;
  localSaved: boolean;
  cloudSaved: boolean;
  backupCreated: boolean;
  size: number;
  duration: number;
  versionId?: string;
  errors: string[];
}

interface ProjectCacheEntry {
  project: GameProject;
  timestamp: number;
  dirty: boolean;
}

// 🔧 ProjectSummary型修正: 日付型をstringに統一
interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  createdAt: string;    // 🔧 Date → string
  updatedAt: string;    // 🔧 Date → string
  size: number;
  version: string;
}

// 自動保存管理システム
interface AutoSaveOptions {
  interval: number;          // 30秒間隔
  maxRetries: number;        // 最大リトライ回数
  onSave: () => Promise<SaveResult | null>;
  onError: (error: Error) => void;
}

class AutoSaveManager {
  private intervalId: number | null = null;
  private isRunning: boolean = false;
  private retryCount: number = 0;

  start(projectId: string, options: AutoSaveOptions): void {
    if (this.isRunning) {
      this.stop();
    }

    this.isRunning = true;
    this.retryCount = 0;

    this.intervalId = window.setInterval(async () => {
      try {
        const result = await options.onSave();
        if (result) {
          console.log(`Auto-save successful for project ${projectId}:`, result);
          this.retryCount = 0;
        }
      } catch (error) {
        this.retryCount++;
        console.error(`Auto-save failed (attempt ${this.retryCount}):`, error);
        
        if (this.retryCount >= options.maxRetries) {
          options.onError(error as Error);
          this.stop();
        }
      }
    }, options.interval);
  }

  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.retryCount = 0;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// メインプロジェクトストレージマネージャー
export class ProjectStorageManager {
  private memoryCache: Map<string, ProjectCacheEntry> = new Map();
  private autoSaveManager = new AutoSaveManager();
  private indexedDB: IDBDatabase | null = null;

  constructor() {
    this.initializeIndexedDB();
  }

  // IndexedDB初期化（設計書準拠）
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GameProjectsDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // プロジェクトストア
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('lastModified', 'lastModified', { unique: false }); // 🔧 updatedAt → lastModified
        }
        
        // バージョンストア
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', { keyPath: 'id' });
          versionStore.createIndex('projectId', 'projectId', { unique: false });
          versionStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // 新規プロジェクト作成（設計書準拠）
  async createProject(name: string, template?: string): Promise<GameProject> {
    const projectId = this.generateProjectId();
    const now = new Date().toISOString(); // 🔧 文字列に統一

    const project: GameProject = {
      id: projectId,
      name: name,
      description: '',
      version: '1.0.0',
      createdAt: now, // 🔧 string型
      lastModified: now, // 🔧 updatedAt → lastModified

      // プロジェクトデータ初期化
      assets: {
        background: null,
        objects: [],
        texts: [], // 🔧 ProjectAssets型に合わせて追加
        audio: {
          bgm: null,
          se: []
        },
        statistics: {
          totalSize: 0,
          totalImageSize: 0,
          totalAudioSize: 0,
          usedSlots: {
            background: 0,
            objects: 0,
            texts: 0,
            bgm: 0,
            se: 0
          },
          limitations: {
            isNearImageLimit: false,
            isNearAudioLimit: false,
            isNearTotalLimit: false,
            hasViolations: false
          }
        },
        lastModified: now // 🔧 ProjectAssets型に合わせて追加
      },
      script: {
        // 🔧 修正: initialState追加
        initialState: createDefaultInitialState(),
        rules: [],
        layout: {
          background: {
            visible: true,
            initialAnimation: 0,
            animationSpeed: 1,
            autoStart: false
          },
          objects: [],
          texts: [], // 🔧 GameLayout型に合わせて追加
          stage: {
            backgroundColor: "#ffffff"
          }
        },
        flags: [],
        successConditions: [],
        statistics: {
          totalConditions: 0,
          totalActions: 0,
          totalRules: 0,
          complexityScore: 0,
          usedTriggerTypes: [],
          usedActionTypes: [],
          flagCount: 0,
          estimatedCPUUsage: 'medium',
          estimatedMemoryUsage: 0,
          maxConcurrentEffects: 0
        },
        version: '1.0.0',
        lastModified: now
      },
      settings: {
        // 🔧 GameSettings型に存在するプロパティのみ使用
        name: name,
        difficulty: "normal",
        duration: {
          type: 'fixed',
          seconds: 10
        },
        publishing: {
          isPublished: false,
          publishedAt: undefined,
          visibility: 'public',
          allowComments: false,
          allowRemix: false,
          tags: undefined,
          category: undefined
        },
        preview: {
          thumbnailDataUrl: undefined,
          previewGif: undefined,
          screenshotDataUrls: undefined
        },
        export: {
          includeSourceData: false,
          compressionLevel: 'medium',
          format: 'json'
        }
      },

      // メタデータ
      metadata: {
        statistics: {
          totalEditTime: 0,
          saveCount: 0,
          testPlayCount: 0,
          publishCount: 0
        },
        usage: {
          lastOpened: now,
          totalOpenCount: 0,
          averageSessionTime: 0
        },
        performance: {
          lastBuildTime: 0,
          averageFPS: 0,
          memoryUsage: 0
        }
      },
      creator: {
        userId: undefined,
        username: undefined,
        isAnonymous: false
      },
      status: 'draft',
      totalSize: 0,
      versionHistory: [],
      projectSettings: {
        autoSaveInterval: 30000,
        backupEnabled: false,
        compressionEnabled: false,
        maxVersionHistory: 10
      }
    };

    // メモリキャッシュに保存
    this.memoryCache.set(projectId, {
      project,
      timestamp: Date.now(),
      dirty: true
    });

    // 永続化
    await this.saveProject(project, { saveLocal: true });

    return project;
  }

  // プロジェクト読み込み（階層的取得・設計書準拠）
  async getProject(projectId: string): Promise<GameProject | null> {
    try {
      // Level 1: メモリキャッシュ
      const cached = this.memoryCache.get(projectId);
      if (cached && !this.isExpired(cached)) {
        return cached.project;
      }

      // Level 2: IndexedDB
      const local = await this.getProjectFromIndexedDB(projectId);
      if (local) {
        this.memoryCache.set(projectId, {
          project: local,
          timestamp: Date.now(),
          dirty: false
        });
        return local;
      }

      return null;
    } catch (error) {
      console.error('Failed to get project:', error);
      throw new Error(`プロジェクトの読み込みに失敗しました: ${error}`);
    }
  }

  // プロジェクト保存（階層的保存・設計書準拠）
  async saveProject(project: GameProject, options: SaveOptions = {}): Promise<SaveResult> {
    const startTime = performance.now();
    const result: SaveResult = {
      success: false,
      localSaved: false,
      cloudSaved: false,
      backupCreated: false,
      size: 0,
      duration: 0,
      errors: []
    };

    try {
      // プロジェクトデータ更新
      project.lastModified = new Date().toISOString(); // 🔧 string型に統一

      // Level 1: メモリキャッシュ更新
      this.memoryCache.set(project.id, {
        project: { ...project },
        timestamp: Date.now(),
        dirty: true
      });

      // Level 2: IndexedDB保存（高速）
      if (options.saveLocal !== false) {
        await this.saveProjectToIndexedDB(project);
        result.localSaved = true;
      }

      // サイズ計算
      result.size = this.calculateProjectSize(project);
      result.success = true;
      result.duration = performance.now() - startTime;

      console.log(`Project saved successfully: ${project.name} (${result.size} bytes, ${result.duration.toFixed(2)}ms)`);

    } catch (error) {
      result.errors.push((error as Error).message);
      console.error('Save failed:', error);
      throw error;
    }

    return result;
  }

  // プロジェクト一覧取得
  async listProjects(): Promise<ProjectSummary[]> {
    try {
      if (!this.indexedDB) {
        await this.initializeIndexedDB();
      }

      return new Promise((resolve, reject) => {
        const transaction = this.indexedDB!.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();

        request.onsuccess = () => {
          const projects = request.result.map((project: GameProject) => ({
            id: project.id,
            name: project.name,
            description: project.description || '', // 🔧 undefined対策
            thumbnail: project.metadata?.thumbnail,  // 🔧 オプショナルチェーン
            createdAt: project.createdAt,           // 🔧 string型
            updatedAt: project.lastModified,        // 🔧 lastModified使用
            size: this.calculateProjectSize(project),
            version: project.version
          }));

          // 更新日時でソート
          projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(projects);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  // プロジェクト削除
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      // メモリキャッシュから削除
      this.memoryCache.delete(projectId);

      // IndexedDBから削除
      if (!this.indexedDB) {
        await this.initializeIndexedDB();
      }

      return new Promise((resolve, reject) => {
        const transaction = this.indexedDB!.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        const request = store.delete(projectId);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  // 自動保存開始
  startAutoSave(projectId: string): void {
    this.autoSaveManager.start(projectId, {
      interval: 30000,          // 30秒間隔
      maxRetries: 3,
      onSave: async () => {
        const cached = this.memoryCache.get(projectId);
        if (cached?.dirty) {
          return await this.saveProject(cached.project, { 
            saveLocal: true,
            syncToCloud: false  // 自動保存はローカルのみ
          });
        }
        return null;
      },
      onError: (error) => {
        console.error('Auto-save failed:', error);
        this.showAutoSaveError(projectId, error);
      }
    });
  }

  // 自動保存停止
  stopAutoSave(): void {
    this.autoSaveManager.stop();
  }

  // ヘルパーメソッド
  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isExpired(cached: ProjectCacheEntry): boolean {
    const TTL = 5 * 60 * 1000; // 5分
    return Date.now() - cached.timestamp > TTL;
  }

  private async getProjectFromIndexedDB(projectId: string): Promise<GameProject | null> {
    if (!this.indexedDB) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(projectId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveProjectToIndexedDB(project: GameProject): Promise<void> {
    if (!this.indexedDB) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private calculateProjectSize(project: GameProject): number {
    return JSON.stringify(project).length;
  }

  private showAutoSaveError(projectId: string, error: Error): void {
    // TODO: ユーザーフレンドリーなエラー通知実装
    console.error(`Auto-save error for project ${projectId}:`, error);
    // UI通知システムと連携
  }
}

// デフォルトエクスポート
export default ProjectStorageManager;