// src/services/ProjectStorageManager.ts
// ✅ キャッシュシステム追加版（フリーズ解消・getUserGames修正版）

import { GameProject } from '../types/editor/GameProject';
import { database, supabase } from '../lib/supabase';
import { getErrorMessage } from '../utils/errorUtils';

// 🔧 軽量版プロジェクトメタデータ（一覧表示用）
export interface ProjectMetadata {
  id: string;
  name: string;
  description: string | undefined;
  lastModified: string;
  status: 'draft' | 'published' | 'archived';
  size: number;
  version: string;
  thumbnailDataUrl?: string;
  stats?: {
    objectsCount: number;
    soundsCount: number;
    rulesCount: number;
  };
}

// エクスポート/インポート用の型
interface ProjectExportData {
  project: GameProject;
  metadata?: ProjectMetadata;
  exportedAt?: string;
  version?: string;
}

// ✅ キャッシュ型定義
interface UserGamesCache {
  userId: string;
  games: any[];
  timestamp: number;
  expiresIn: number; // ミリ秒
}

export class ProjectStorageManager {
  private static instance: ProjectStorageManager | null = null;
  
  // ✅ キャッシュ（シングルトンパターンで共有）
  private userGamesCache: UserGamesCache | null = null;

  private constructor() {}

  public static getInstance(): ProjectStorageManager {
    if (!ProjectStorageManager.instance) {
      ProjectStorageManager.instance = new ProjectStorageManager();
    }
    return ProjectStorageManager.instance;
  }

  // ✅ キャッシュチェック
  private isCacheValid(userId: string): boolean {
    if (!this.userGamesCache) {
      console.log('[Cache-Manager] ❌ キャッシュが存在しません');
      return false;
    }

    if (this.userGamesCache.userId !== userId) {
      console.log('[Cache-Manager] ❌ ユーザーIDが異なります');
      return false;
    }

    const now = Date.now();
    const age = now - this.userGamesCache.timestamp;
    const isValid = age < this.userGamesCache.expiresIn;

    console.log('[Cache-Manager] チェック:', {
      age: `${(age / 1000).toFixed(1)}秒`,
      expiresIn: `${(this.userGamesCache.expiresIn / 1000).toFixed(1)}秒`,
      isValid
    });

    return isValid;
  }

  // ✅ キャッシュ取得または新規取得
  private async getUserGames(userId: string): Promise<any[]> {
    // キャッシュチェック
    if (this.isCacheValid(userId)) {
      console.log('[Cache-Manager] ✅ キャッシュから返却:', this.userGamesCache!.games.length, '件');
      return this.userGamesCache!.games;
    }

    // Supabaseから取得（✅ 修正：直接配列を返す）
    console.log('[Cache-Manager] 🔄 Supabaseから取得中...');
    const games = await database.userGames.getUserGames(userId);

    console.log('[Cache-Manager] ✅ 取得完了:', games.length, '件');

    // キャッシュ更新
    this.userGamesCache = {
      userId,
      games,
      timestamp: Date.now(),
      expiresIn: 5 * 60 * 1000 // 5分間有効
    };
    console.log('[Cache-Manager] ✅ キャッシュ更新');

    return games;
  }

  // ✅ キャッシュクリア
  private clearCache() {
    this.userGamesCache = null;
    console.log('[Cache-Manager] 🗑️ キャッシュクリア');
  }

  // 🚀 軽量化: プロジェクト一覧取得（メタデータのみ）
  public async listProjects(userId?: string): Promise<ProjectMetadata[]> {
    try {
      console.log('[ListProjects-Manager] 📋 Loading project metadata...', { userId: userId || 'none' });

      if (!userId) {
        console.warn('[ListProjects-Manager] ⚠️ No userId provided, returning empty array');
        return [];
      }

      console.log('[ListProjects-Manager] 🔍 Fetching from Supabase/Cache...');
      
      // ✅ キャッシュ優先で取得
      const userGames = await this.getUserGames(userId);
      
      console.log('[ListProjects-Manager] ✅ Games:', userGames?.length || 0);

      // 重複IDを除去しつつメタデータ生成
      const projectMap = new Map<string, ProjectMetadata>();
      
      for (const game of userGames) {
        const projectData = game.project_data as any as GameProject;
        
        if (!projectData) {
          console.warn('[ListProjects-Manager] ⚠️ Game has no project_data:', game.id);
          continue;
        }

        const projectId = projectData.id;
        const existing = projectMap.get(projectId);
        
        // 同じIDがある場合は新しい方を優先
        if (existing && new Date(game.updated_at) <= new Date(existing.lastModified)) {
          continue;
        }

        // 🔧 軽量版メタデータ生成（詳細データは含まない）
        const metadata: ProjectMetadata = {
          id: projectData.id,
          name: game.title || projectData.name || projectData.settings?.name || 'Untitled',
          description: projectData.description || projectData.settings?.description || undefined,
          lastModified: game.updated_at,
          status: (projectData.status as 'draft' | 'published' | 'archived') || (game.is_published ? 'published' : 'draft'),
          size: projectData.totalSize || 0,
          version: projectData.version || '1.0.0',
          thumbnailDataUrl: projectData.thumbnailDataUrl || projectData.settings?.preview?.thumbnailDataUrl,
          stats: {
            objectsCount: projectData.assets?.objects?.length || 0,
            soundsCount: (projectData.assets?.audio?.bgm ? 1 : 0) + (projectData.assets?.audio?.se?.length || 0),
            rulesCount: projectData.script?.rules?.length || 0
          }
        };

        projectMap.set(projectId, metadata);
      }

      const projects = Array.from(projectMap.values());

      console.log('[ListProjects-Manager] ✅ Processed metadata:', projects.length);
      console.log('[ListProjects-Manager] 💾 Total size:', projects.reduce((sum, p) => sum + p.size, 0), 'bytes');

      // 最終更新日でソート
      return projects.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

    } catch (error) {
      console.error('[ListProjects-Manager] ❌ Failed to list projects:', error);
      return [];
    }
  }

  // ✅ プロジェクト読み込み（詳細データ取得・キャッシュ優先）
  public async loadProject(id: string, userId?: string): Promise<GameProject | null> {
    try {
      console.log('[LoadProject-Manager] 📂 Loading full project...', { id, userId: userId || 'none' });

      if (!userId) {
        console.warn('[LoadProject-Manager] ⚠️ No userId provided');
        return null;
      }

      // ✅ キャッシュ優先で取得
      console.log('[LoadProject-Manager] 🔍 キャッシュから検索中...');
      const userGames = await this.getUserGames(userId);
      
      console.log('[LoadProject-Manager] 🔍 Total games:', userGames.length);

      // project_data.idでマッチング
      const game = userGames.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === id;
      });

      if (!game) {
        console.warn('[LoadProject-Manager] ⚠️ Project not found:', id);
        return null;
      }

      console.log('[LoadProject-Manager] ✅ Project found:', game.title);

      const projectData = game.project_data as any as GameProject;

      // DBのtitle/descriptionをproject_dataにマージ（metadata-only saveで更新された場合に対応）
      const mergedProject: GameProject = {
        ...projectData,
        name: game.title || projectData.name,  // DBのtitleを優先
        description: game.description || projectData.description,
        settings: {
          ...projectData.settings,
          name: game.title || projectData.settings?.name,  // settingsにも反映
          description: game.description || projectData.settings?.description
        },
        metadata: {
          ...projectData.metadata,
          databaseId: game.id,
          lastSyncedAt: new Date().toISOString()
        }
      };

      return mergedProject;

    } catch (error) {
      console.error('[LoadProject-Manager] ❌ Failed to load project:', error);
      return null;
    }
  }

  // ✅ プロジェクト保存（Supabaseデータベース）
  public async saveToDatabase(project: GameProject, userId: string): Promise<void> {
    try {
      console.log('[SaveDB-Manager] 💾 Saving project to Supabase database:', {
        projectId: project.id,
        projectName: project.settings?.name || project.name,
        userId,
        isPublished: project.status === 'published'
      });

      // ✅ キャッシュから検索して新規作成かどうかを先に確認
      const userGamesForCheck = await this.getUserGames(userId);
      const isNewGame = !userGamesForCheck.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === project.id;
      });

      // 新規ゲーム作成時のみウォレット残高チェック（ペイ・パー・プレイモデル）
      if (isNewGame) {
        const { data: canPlay, error: walletCheckError } = await supabase.rpc('check_wallet_can_play');

        if (walletCheckError) {
          console.error('[SaveDB-Manager] ❌ Wallet check error:', walletCheckError);
          throw new Error('残高確認に失敗しました。しばらくしてから再試行してください。');
        }

        if (!canPlay) {
          console.warn('[SaveDB-Manager] ⚠️ Insufficient wallet balance for new game creation');
          throw new Error('残高が不足しています。チャージしてからゲームを作成してください。');
        }

        console.log('[SaveDB-Manager] ✅ Wallet check passed, creating new game...');
      } else {
        console.log('[SaveDB-Manager] ✅ Updating existing game, no wallet check needed.');
      }

      // ✅ キャッシュから検索（上で取得済みのキャッシュを再利用）
      const userGames = userGamesForCheck;
      const existingGame = isNewGame ? undefined : userGames.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === project.id;
      });

      // user_gamesテーブルに保存するデータを準備
      const gameData = {
        creator_id: userId,
        title: project.settings?.name || project.name || 'Untitled Game',
        description: project.settings?.description || '',
        template_id: 'editor_created',
        game_data: {},
        project_data: project,
        is_published: project.status === 'published',
        thumbnail_url: project.metadata?.thumbnailUrl || null,
      };

      let result;
      if (existingGame) {
        // 既存ゲームを更新
        console.log('[SaveDB-Manager] 🔄 Updating existing game:', existingGame.id);
        result = await database.userGames.update(existingGame.id, gameData);
      } else {
        // 新規ゲームを作成
        console.log('[SaveDB-Manager] ✨ Creating new game');

        // ✅ 修正: INSERT時のエラーハンドリング改善
        try {
          result = await database.userGames.save(gameData);
        } catch (saveError: any) {
          // ✅ 409エラー（UNIQUE制約違反）の場合、updateで再試行
          if (saveError.message?.includes('409') || saveError.message?.includes('duplicate')) {
            console.warn('[SaveDB-Manager] ⚠️ Duplicate detected, trying update instead...');
            const conflictGame = userGames.find(g => {
              const projectData = g.project_data as any as GameProject;
              return projectData && projectData.id === project.id;
            });

            if (conflictGame) {
              result = await database.userGames.update(conflictGame.id, gameData);
            } else {
              // それでも見つからない場合はエラーを再スロー
              throw saveError;
            }
          } else {
            throw saveError;
          }
        }
      }

      console.log('[SaveDB-Manager] ✅ Successfully saved to database:', result);

      // ✅ キャッシュクリア（保存後は再取得が必要）
      this.clearCache();

      // ✅ 修正: カウンター更新は非同期で行い、失敗してもプロジェクト保存は成功とする
      // トリガーが既にカウントアップしているため、ここでの更新はスキップ
      // （トリガーとの二重カウントを防止）
      console.log('[SaveDB-Manager] 💎 Counter update handled by database trigger');
      
    } catch (error: unknown) {
      console.error('[SaveDB-Manager] ❌ Failed to save project to database:', error);
      throw new Error(`データベース保存に失敗: ${getErrorMessage(error)}`);
    }
  }

  // ✅ プロジェクト保存（Supabaseに保存）
  public async saveProject(project: GameProject, options?: {
    saveToDatabase?: boolean;
    userId?: string;
    metadataOnly?: boolean;  // メタデータのみ更新（高速）
  }): Promise<void> {
    try {
      if (!options?.userId) {
        throw new Error('ユーザーIDが必要です');
      }

      // メタデータのみ更新モード（タイトル・説明変更時など）
      if (options.metadataOnly) {
        await this.updateMetadataOnly(project, options.userId);
      } else {
        await this.saveToDatabase(project, options.userId);
      }
    } catch (error) {
      console.error('[SaveProject-Manager] ❌ Failed to save project:', error);
      throw error;
    }
  }

  // ✅ メタデータのみ更新（高速・軽量）
  public async updateMetadataOnly(project: GameProject, userId: string): Promise<void> {
    try {
      console.log('[SaveDB-Manager] ⚡ Fast metadata update:', {
        projectId: project.id,
        title: project.settings?.name || project.name
      });

      // キャッシュから既存ゲームを検索
      const userGames = await this.getUserGames(userId);
      const existingGame = userGames.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === project.id;
      });

      if (!existingGame) {
        console.log('[SaveDB-Manager] ⚠️ Game not found, falling back to full save');
        await this.saveToDatabase(project, userId);
        return;
      }

      // メタデータのみ更新
      await database.userGames.updateMetadata(existingGame.id, {
        title: project.settings?.name || project.name || 'Untitled Game',
        description: project.settings?.description || '',
        is_published: project.status === 'published',
        thumbnail_url: project.metadata?.thumbnailUrl || null,
      });

      console.log('[SaveDB-Manager] ✅ Metadata updated successfully');
      this.clearCache();
    } catch (error: unknown) {
      console.error('[SaveDB-Manager] ❌ Metadata update failed:', error);
      throw new Error(`メタデータ更新に失敗: ${getErrorMessage(error)}`);
    }
  }

  // ✅ プロジェクト削除（Supabaseから）
  public async deleteProject(id: string, userId?: string): Promise<void> {
    try {
      console.log('[DeleteProject-Manager] 🗑️ Starting delete...', { id, userId: userId || 'none' });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      // ✅ キャッシュから検索
      const userGames = await this.getUserGames(userId);
      const game = userGames.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === id;
      });

      if (game) {
        console.log('[DeleteProject-Manager] 🗑️ Deleting from Supabase...', { databaseId: game.id });
        await database.userGames.delete(game.id);
        console.log('[DeleteProject-Manager] ✅ Deleted from Supabase successfully');
        
        // ✅ キャッシュクリア
        this.clearCache();
      } else {
        console.warn('[DeleteProject-Manager] ⚠️ Project not found in Supabase:', id);
      }

    } catch (error) {
      console.error('[DeleteProject-Manager] ❌ Failed to delete project:', error);
      throw error;
    }
  }

  // ✅ プロジェクト複製（Supabaseに保存）
  public async duplicateProject(id: string, newName: string, userId?: string): Promise<GameProject> {
    console.log('[DuplicateProject-Manager] 📋 Starting duplicate...', { id, newName, userId: userId || 'none' });

    if (!userId) {
      throw new Error('ユーザーIDが必要です');
    }

    const originalProject = await this.loadProject(id, userId);
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
      metadata: {
        ...originalProject.metadata,
        databaseId: undefined,
        lastSyncedAt: undefined
      }
    };

    await this.saveToDatabase(duplicatedProject, userId);
    console.log('[DuplicateProject-Manager] ✅ Saved to Supabase successfully');

    return duplicatedProject;
  }

  // ✅ プロジェクトエクスポート（ProjectExportData形式）
  public async exportProject(id: string, userId?: string): Promise<Blob> {
    try {
      console.log('[ExportProject-Manager] 📦 Starting export...', { id, userId: userId || 'none' });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const project = await this.loadProject(id, userId);

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      const exportData = {
        project: project,
        metadata: {
          id: project.id,
          name: project.name,
          lastModified: project.lastModified,
          status: project.status,
          size: project.totalSize,
          version: project.version
        },
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      console.log('[ExportProject-Manager] ✅ Export completed successfully');
      return blob;

    } catch (error) {
      console.error('[ExportProject-Manager] ❌ Failed to export project:', error);
      throw new Error(`プロジェクトのエクスポートに失敗しました: ${(error as any).message}`);
    }
  }

  // ✅ プロジェクトインポート（Supabaseに保存）
  public async importProject(file: File, userId?: string): Promise<GameProject> {
    try {
      console.log('[ImportProject-Manager] 📥 Starting import...', { 
        fileName: file.name, 
        fileSize: file.size, 
        userId: userId || 'none' 
      });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const text = await file.text();
      console.log('[ImportProject-Manager] 📄 File read successfully, length:', text.length);

      const importData: ProjectExportData = JSON.parse(text);
      console.log('[ImportProject-Manager] ✅ JSON parsed successfully');

      if (!importData.project) {
        throw new Error('無効なプロジェクトファイルです');
      }

      const metadata = importData.metadata || {
        id: importData.project.id,
        name: importData.project.name || importData.project.settings?.name || 'Untitled',
        lastModified: importData.project.lastModified || new Date().toISOString(),
        status: importData.project.status || 'draft',
        size: importData.project.totalSize || 0,
        version: importData.project.version || '1.0.0'
      };

      console.log('[ImportProject-Manager] 📋 Metadata generated:', metadata);

      const importedProject: GameProject = {
        ...importData.project,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'draft',
        metadata: {
          ...importData.project.metadata,
          databaseId: undefined,
          lastSyncedAt: undefined
        }
      };

      console.log('[ImportProject-Manager] 💾 Saving project to Supabase...');
      await this.saveToDatabase(importedProject, userId);
      console.log('[ImportProject-Manager] ✅ Project saved to Supabase successfully');

      return importedProject;
    } catch (error) {
      console.error('[ImportProject-Manager] ❌ Failed to import project:', error);
      throw new Error(`プロジェクトのインポートに失敗しました: ${(error as any).message}`);
    }
  }

  // ✅ プロジェクト検索（メタデータから）
  public async searchProjects(query: string, userId?: string): Promise<ProjectMetadata[]> {
    const allProjects = await this.listProjects(userId);
    
    if (!query.trim()) {
      return allProjects;
    }

    const searchTerm = query.toLowerCase();
    
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      (project.description?.toLowerCase().includes(searchTerm) ?? false)
    );
  }

  // ✅ バックアップ作成
  public async createBackup(userId?: string): Promise<Blob> {
    try {
      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const metadata = await this.listProjects(userId);
      const projects: GameProject[] = [];

      for (const meta of metadata) {
        const project = await this.loadProject(meta.id, userId);
        if (project) {
          projects.push(project);
        }
      }
      
      const backupData = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        projects
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      return new Blob([jsonData], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('バックアップの作成に失敗しました');
    }
  }

  // ✅ バックアップ復元
  public async restoreBackup(file: File, mergeMode: 'replace' | 'merge' = 'merge', userId?: string): Promise<void> {
    try {
      console.log('[RestoreBackup-Manager] 📥 Starting restore...', { mergeMode, userId: userId || 'none' });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.projects || !Array.isArray(backupData.projects)) {
        throw new Error('無効なバックアップファイルです');
      }

      if (mergeMode === 'replace') {
        const existingProjects = await this.listProjects(userId);
        for (const project of existingProjects) {
          await this.deleteProject(project.id, userId);
        }
      }

      for (const project of backupData.projects) {
        const restoredProject: GameProject = {
          ...project,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          metadata: {
            ...project.metadata,
            databaseId: undefined,
            lastSyncedAt: undefined
          }
        };

        await this.saveProject(restoredProject, {
          saveToDatabase: true,
          userId
        });
      }

      console.log('[RestoreBackup-Manager] ✅ Restored', backupData.projects.length, 'projects successfully');
    } catch (error) {
      console.error('[RestoreBackup-Manager] ❌ Failed to restore backup:', error);
      throw new Error('バックアップの復元に失敗しました');
    }
  }
}