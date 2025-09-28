import { GameProject } from '../types/editor/GameProject';
import { EDITOR_LIMITS } from '../constants/EditorLimits';
import { database } from '../lib/supabase';

// ストレージキー定数
const STORAGE_KEYS = {
  PROJECTS: 'editor_projects',
  PROJECT_PREFIX: 'editor_project_',
  METADATA: 'editor_metadata',
  SETTINGS: 'editor_settings'
} as const;

// ストレージ設定
interface StorageSettings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  maxProjects: number;
  compressionEnabled: boolean;
}

// プロジェクトメタデータ
interface ProjectMetadata {
  id: string;
  name: string;
  lastModified: string;
  status: GameProject['status'];
  size: number;
  version: string;
}

// ストレージ統計
interface StorageStats {
  totalProjects: number;
  totalSize: number;
  availableSpace: number;
  lastCleanup: string;
}

// エクスポート/インポート用の型
interface ProjectExportData {
  project: GameProject;
  metadata: ProjectMetadata;
  exportedAt: string;
  version: string;
}

export class ProjectStorageManager {
  private static instance: ProjectStorageManager | null = null;
  private settings: StorageSettings;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private constructor() {
    this.settings = this.loadSettings();
    this.initIndexedDB();
  }

  // シングルトンパターン
  public static getInstance(): ProjectStorageManager {
    if (!ProjectStorageManager.instance) {
      ProjectStorageManager.instance = new ProjectStorageManager();
    }
    return ProjectStorageManager.instance;
  }

  // IndexedDB初期化
  private initIndexedDB(): void {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('IndexedDB is not available, falling back to localStorage');
      return;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('GameEditorDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // プロジェクトストア
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('lastModified', 'lastModified', { unique: false });
          projectStore.createIndex('status', 'status', { unique: false });
        }
        
        // アセットストア（大容量ファイル用）
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
          assetStore.createIndex('projectId', 'projectId', { unique: false });
          assetStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  // 設定読み込み
  private loadSettings(): StorageSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load storage settings:', error);
      return this.getDefaultSettings();
    }
  }

  // デフォルト設定
  private getDefaultSettings(): StorageSettings {
    return {
      autoSaveEnabled: true,
      autoSaveInterval: EDITOR_LIMITS.PROJECT.AUTO_SAVE_INTERVAL,
      maxProjects: 50,
      compressionEnabled: true
    };
  }

  // 設定保存
  public saveSettings(settings: Partial<StorageSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
  }

  // プロジェクト一覧取得
  public async listProjects(): Promise<ProjectMetadata[]> {
    try {
      // IndexedDBが利用可能な場合
      if (this.dbPromise) {
        const db = await this.dbPromise;
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const projects = request.result.map((project: GameProject): ProjectMetadata => ({
              id: project.id,
              name: project.name,
              lastModified: project.lastModified,
              status: project.status,
              size: project.totalSize || 0,
              version: project.version
            }));
            
            // 最終更新日でソート
            projects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
            resolve(projects);
          };
          request.onerror = () => reject(request.error);
        });
      }

      // localStorageフォールバック
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      const projects: GameProject[] = stored ? JSON.parse(stored) : [];
      
      return projects.map((project): ProjectMetadata => ({
        id: project.id,
        name: project.name,
        lastModified: project.lastModified,
        status: project.status,
        size: project.totalSize || 0,
        version: project.version
      })).sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  // 🔧 新機能: Supabaseデータベース保存
  public async saveToDatabase(project: GameProject, userId: string): Promise<void> {
    try {
      console.log('Saving project to Supabase database:', { 
        projectId: project.id, 
        projectName: project.settings?.name || project.name,
        userId,
        isPublished: project.status === 'published' 
      });

      // user_gamesテーブルに保存するデータを準備
      const gameData = {
        creator_id: userId,
        title: project.settings?.name || project.name || 'Untitled Game',
        description: project.settings?.description || '',
        template_id: 'editor_created',
        game_data: project,
        is_published: project.status === 'published',
        thumbnail_url: project.metadata?.thumbnailUrl || null,
        // オプショナルフィールド
        //difficulty_level: project.metadata?.difficulty || 'medium',
        //estimated_play_time: project.metadata?.estimatedPlayTime || 60,
        //tags: project.settings?.publishing?.tags || []
      };

      // Supabaseに保存
      const result = await database.userGames.save(gameData);
      
      console.log('✅ Successfully saved to database:', result);
      
      // ローカルプロジェクトにデータベースIDを記録（今後の更新用）
      if (result && 'id' in result) {
        project.metadata = {
          ...project.metadata,
          databaseId: result.id,
          lastSyncedAt: new Date().toISOString()
        };
        
        // ローカルストレージも更新
        await this.saveProject(project);
      }
      
    } catch (error: any) {
      console.error('Failed to save project to database:', error);
      
      // エラーの詳細をログ出力
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.details) {
        console.error('Error details:', error.details);
      }
      
      // エラーを再スロー（呼び出し元でハンドリング）
      throw new Error(`データベース保存に失敗: ${error.message || 'Unknown error'}`);
    }
  }

  // 🔧 拡張: プロジェクト保存（ローカル + オプションでデータベース）
  public async saveProject(project: GameProject, options?: { 
    saveToDatabase?: boolean;
    userId?: string;
  }): Promise<void> {
    try {
      // バリデーション
      this.validateProject(project);
      
      // 容量制限チェック
      if (project.totalSize && project.totalSize > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) {
        throw new Error(`プロジェクトサイズが制限を超えています (${(project.totalSize / 1024 / 1024).toFixed(1)}MB)`);
      }

      // ローカル保存
      await this.saveProjectLocal(project);
      
      // データベース保存（オプション）
      if (options?.saveToDatabase && options?.userId) {
        await this.saveToDatabase(project, options.userId);
      }

    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }

  // ローカル保存のみ（元のsaveProject関数）
  private async saveProjectLocal(project: GameProject): Promise<void> {
    // IndexedDBが利用可能な場合
    if (this.dbPromise) {
      const db = await this.dbPromise;
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      
      return new Promise((resolve, reject) => {
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // localStorageフォールバック
    const projects = await this.loadAllProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.unshift(project);
    }

    // プロジェクト数制限
    if (projects.length > this.settings.maxProjects) {
      projects.splice(this.settings.maxProjects);
    }

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }

  // プロジェクト読み込み
  public async loadProject(id: string): Promise<GameProject | null> {
    try {
      // IndexedDBが利用可能な場合
      if (this.dbPromise) {
        const db = await this.dbPromise;
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.get(id);
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      }

      // localStorageフォールバック
      const projects = await this.loadAllProjects();
      return projects.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Failed to load project:', error);
      return null;
    }
  }

  // プロジェクト削除
  public async deleteProject(id: string): Promise<void> {
    try {
      // IndexedDBが利用可能な場合
      if (this.dbPromise) {
        const db = await this.dbPromise;
        const transaction = db.transaction(['projects', 'assets'], 'readwrite');
        
        // プロジェクト削除
        const projectStore = transaction.objectStore('projects');
        const deleteProjectRequest = projectStore.delete(id);
        
        // 関連アセット削除
        const assetStore = transaction.objectStore('assets');
        const assetIndex = assetStore.index('projectId');
        const assetRequest = assetIndex.openCursor(IDBKeyRange.only(id));
        
        return new Promise((resolve, reject) => {
          let completed = 0;
          const checkCompletion = () => {
            completed++;
            if (completed >= 2) resolve();
          };

          deleteProjectRequest.onsuccess = checkCompletion;
          deleteProjectRequest.onerror = () => reject(deleteProjectRequest.error);
          
          assetRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              checkCompletion();
            }
          };
          assetRequest.onerror = () => reject(assetRequest.error);
        });
      }

      // localStorageフォールバック
      const projects = await this.loadAllProjects();
      const filteredProjects = projects.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filteredProjects));
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  // プロジェクト複製
  public async duplicateProject(id: string, newName: string): Promise<GameProject> {
    const originalProject = await this.loadProject(id);
    if (!originalProject) {
      throw new Error('複製するプロジェクトが見つかりません');
    }

    const duplicatedProject: GameProject = {
      ...originalProject,
      id: crypto.randomUUID(),
      name: newName.trim(),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'draft',
      settings: {
        ...originalProject.settings,
        name: newName.trim(),
        publishing: {
          ...originalProject.settings.publishing,
          isPublished: false
        }
      },
      // データベース関連メタデータをクリア
      metadata: {
        ...originalProject.metadata,
        databaseId: undefined,
        lastSyncedAt: undefined
      }
    };

    await this.saveProject(duplicatedProject);
    return duplicatedProject;
  }

  // プロジェクトエクスポート
  public async exportProject(id: string): Promise<Blob> {
    const project = await this.loadProject(id);
    if (!project) {
      throw new Error('エクスポートするプロジェクトが見つかりません');
    }

    const exportData: ProjectExportData = {
      project,
      metadata: {
        id: project.id,
        name: project.name,
        lastModified: project.lastModified,
        status: project.status,
        size: project.totalSize || 0,
        version: project.version
      },
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    return new Blob([jsonData], { type: 'application/json' });
  }

  // プロジェクトインポート
  public async importProject(file: File): Promise<GameProject> {
    try {
      const text = await file.text();
      const importData: ProjectExportData = JSON.parse(text);
      
      if (!importData.project || !importData.metadata) {
        throw new Error('無効なプロジェクトファイルです');
      }

      // 新しいIDを生成（重複防止）
      const importedProject: GameProject = {
        ...importData.project,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'draft',
        // データベース関連メタデータをクリア
        metadata: {
          ...importData.project.metadata,
          databaseId: undefined,
          lastSyncedAt: undefined
        }
      };

      // バリデーション
      this.validateProject(importedProject);
      
      await this.saveProject(importedProject);
      return importedProject;
    } catch (error) {
      console.error('Failed to import project:', error);
      throw new Error('プロジェクトのインポートに失敗しました');
    }
  }

  // ストレージ統計取得
  public async getStorageStats(): Promise<StorageStats> {
    const projects = await this.loadAllProjects();
    const totalSize = projects.reduce((sum, project) => sum + (project.totalSize || 0), 0);
    
    // ブラウザストレージの利用可能容量を推定
    let availableSpace = 0;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        availableSpace = quota - used;
      } catch (error) {
        console.warn('Could not estimate storage:', error);
        availableSpace = 100 * 1024 * 1024; // 100MBとして推定
      }
    } else {
      availableSpace = 50 * 1024 * 1024; // 50MBとして推定
    }

    return {
      totalProjects: projects.length,
      totalSize,
      availableSpace,
      lastCleanup: localStorage.getItem('editor_last_cleanup') || 'never'
    };
  }

  // ストレージクリーンアップ
  public async cleanupStorage(): Promise<void> {
    try {
      const projects = await this.loadAllProjects();
      
      // 古いプロジェクトを削除（30日以上更新されていない下書き）
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const projectsToDelete = projects.filter(project => 
        project.status === 'draft' && 
        new Date(project.lastModified).getTime() < thirtyDaysAgo
      );

      for (const project of projectsToDelete) {
        await this.deleteProject(project.id);
      }

      // クリーンアップ実行日時を記録
      localStorage.setItem('editor_last_cleanup', new Date().toISOString());
      
      console.log(`Cleaned up ${projectsToDelete.length} old projects`);
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  // 全プロジェクト読み込み（内部用）
  private async loadAllProjects(): Promise<GameProject[]> {
    try {
      // IndexedDBが利用可能な場合
      if (this.dbPromise) {
        const db = await this.dbPromise;
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }

      // localStorageフォールバック
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load all projects:', error);
      return [];
    }
  }

  // プロジェクトバリデーション
  private validateProject(project: GameProject): void {
    if (!project.id) {
      throw new Error('プロジェクトIDが必要です');
    }
    
    if (!project.name.trim()) {
      throw new Error('プロジェクト名が必要です');
    }
    
    if (project.name.length > 50) {
      throw new Error('プロジェクト名は50文字以内にしてください');
    }
    
    if (!project.version) {
      throw new Error('プロジェクトバージョンが必要です');
    }

    if (!project.assets) {
      throw new Error('アセット情報が必要です');
    }

    if (!project.script) {
      throw new Error('スクリプト情報が必要です');
    }

    if (!project.settings) {
      throw new Error('設定情報が必要です');
    }
  }

  // 設定取得
  public getSettings(): StorageSettings {
    return { ...this.settings };
  }

  // 容量制限チェック
  public async checkStorageCapacity(additionalSize: number = 0): Promise<{
    canStore: boolean;
    currentUsage: number;
    availableSpace: number;
    warningLevel: 'safe' | 'warning' | 'critical';
  }> {
    const stats = await this.getStorageStats();
    const totalUsage = stats.totalSize + additionalSize;
    const usagePercentage = (totalUsage / stats.availableSpace) * 100;

    return {
      canStore: totalUsage < stats.availableSpace,
      currentUsage: totalUsage,
      availableSpace: stats.availableSpace,
      warningLevel: usagePercentage > 90 ? 'critical' : 
                   usagePercentage > 75 ? 'warning' : 'safe'
    };
  }

  // アセット最適化（圧縮・リサイズ）
  public async optimizeAssets(project: GameProject): Promise<GameProject> {
    if (!this.settings.compressionEnabled) {
      return project;
    }

    // TODO: 画像圧縮・リサイズ処理
    // この関数では実際の最適化処理のフレームワークのみ提供
    console.log('Asset optimization for project:', project.name);
    
    return {
      ...project,
      lastModified: new Date().toISOString()
    };
  }

  // プロジェクト検索
  public async searchProjects(query: string): Promise<ProjectMetadata[]> {
    const allProjects = await this.listProjects();
    
    if (!query.trim()) {
      return allProjects;
    }

    const searchTerm = query.toLowerCase();
    
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      project.id.toLowerCase().includes(searchTerm)
    );
  }

  // バックアップ作成
  public async createBackup(): Promise<Blob> {
    try {
      const projects = await this.loadAllProjects();
      const stats = await this.getStorageStats();
      
      const backupData = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        stats,
        projects
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      return new Blob([jsonData], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('バックアップの作成に失敗しました');
    }
  }

  // バックアップ復元
  public async restoreBackup(file: File, mergeMode: 'replace' | 'merge' = 'merge'): Promise<void> {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (!backupData.projects || !Array.isArray(backupData.projects)) {
        throw new Error('無効なバックアップファイルです');
      }

      if (mergeMode === 'replace') {
        // 既存プロジェクトを全削除
        const existingProjects = await this.listProjects();
        for (const project of existingProjects) {
          await this.deleteProject(project.id);
        }
      }

      // プロジェクトを復元
      for (const project of backupData.projects) {
        // 新しいIDを生成（重複防止）
        const restoredProject: GameProject = {
          ...project,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          // データベース関連メタデータをクリア
          metadata: {
            ...project.metadata,
            databaseId: undefined,
            lastSyncedAt: undefined
          }
        };
        
        await this.saveProject(restoredProject);
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw new Error('バックアップの復元に失敗しました');
    }
  }

  // 自動保存設定
  public enableAutoSave(): void {
    this.saveSettings({ autoSaveEnabled: true });
  }

  public disableAutoSave(): void {
    this.saveSettings({ autoSaveEnabled: false });
  }

  public isAutoSaveEnabled(): boolean {
    return this.settings.autoSaveEnabled;
  }

  // IndexedDB利用可否チェック
  public isIndexedDBAvailable(): boolean {
    return this.dbPromise !== null;
  }

  // ストレージタイプ取得
  public getStorageType(): 'indexeddb' | 'localstorage' {
    return this.dbPromise ? 'indexeddb' : 'localstorage';
  }
}