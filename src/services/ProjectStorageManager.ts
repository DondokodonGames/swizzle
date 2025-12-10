// src/services/ProjectStorageManager.ts
// 🚀 軽量化版: listProjects()はメタデータのみ返却（詳細はloadProject()で取得）

import { GameProject } from '../types/editor/GameProject';
import { database, supabase } from '../lib/supabase';

// 🔧 軽量版プロジェクトメタデータ（一覧表示用）
// ✅ useGameProject.tsと完全一致
export interface ProjectMetadata {
  id: string;
  name: string;
  description: string | undefined;  // ✅ 完全一致
  lastModified: string;
  status: 'draft' | 'published' | 'archived';  // ✅ archived追加
  size: number;
  version: string;
  thumbnailDataUrl?: string;
  stats?: {  // ✅ optional
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

export class ProjectStorageManager {
  private static instance: ProjectStorageManager | null = null;

  private constructor() {}

  public static getInstance(): ProjectStorageManager {
    if (!ProjectStorageManager.instance) {
      ProjectStorageManager.instance = new ProjectStorageManager();
    }
    return ProjectStorageManager.instance;
  }

  // 🚀 軽量化: プロジェクト一覧取得（メタデータのみ）
  public async listProjects(userId?: string): Promise<ProjectMetadata[]> {
    try {
      console.log('[ListProjects-Manager] 📋 Loading project metadata...', { userId: userId || 'none' });

      if (!userId) {
        console.warn('[ListProjects-Manager] ⚠️ No userId provided, returning empty array');
        return [];
      }

      console.log('[ListProjects-Manager] 🔍 Fetching from Supabase...');
      const userGames = await database.userGames.getUserGames(userId);
      console.log('[ListProjects-Manager] ✅ Supabase games:', userGames?.length || 0);

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
          description: projectData.description || projectData.settings?.description || undefined,  // ✅ undefined
          lastModified: game.updated_at,
          status: (projectData.status as 'draft' | 'published' | 'archived') || (game.is_published ? 'published' : 'draft'),  // ✅ archived対応
          size: projectData.totalSize || 0,
          version: projectData.version || '1.0.0',
          thumbnailDataUrl: projectData.thumbnailDataUrl || projectData.settings?.preview?.thumbnailDataUrl,
          stats: {  // ✅ optionalだが、常に生成
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

  // ✅ プロジェクト読み込み（詳細データ取得）
  public async loadProject(id: string, userId?: string): Promise<GameProject | null> {
    try {
      console.log('[LoadProject-Manager] 📂 Loading full project...', { id, userId: userId || 'none' });

      if (!userId) {
        console.warn('[LoadProject-Manager] ⚠️ No userId provided');
        return null;
      }

      const userGames = await database.userGames.getUserGames(userId);
      console.log('[LoadProject-Manager] 🔍 Total games found:', userGames.length);

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
      
      // metadataにdatabaseIdを追加
      return {
        ...projectData,
        metadata: {
          ...projectData.metadata,
          databaseId: game.id,
          lastSyncedAt: new Date().toISOString()
        }
      };

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

      // プレミアムチェック
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('is_premium, games_created_this_month, monthly_limit')
        .eq('user_id', userId)
        .single();

      if (creditsError) {
        console.error('[SaveDB-Manager] ❌ Failed to fetch user credits:', creditsError);
        throw new Error(`クレジット情報の取得に失敗: ${creditsError.message}`);
      }

      if (!credits) {
        console.error('[SaveDB-Manager] ❌ No credits found for user:', userId);
        throw new Error('ユーザーのクレジット情報が見つかりません');
      }

      console.log('[SaveDB-Manager] 💳 User credits:', credits);

      // プレミアムでない場合のみ制限チェック
      if (!credits.is_premium && credits.games_created_this_month >= credits.monthly_limit) {
        console.warn('[SaveDB-Manager] ⚠️ Monthly limit reached:', {
          created: credits.games_created_this_month,
          limit: credits.monthly_limit
        });
        throw new Error('月間ゲーム作成制限に達しています。プレミアムプランにアップグレードしてください。');
      }

      console.log('[SaveDB-Manager] ✅ Credit check passed, saving to user_games...');

      // 既存ゲームを検索（project.idでマッチング）
      const userGames = await database.userGames.getUserGames(userId);
      const existingGame = userGames.find(g => {
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
        result = await database.userGames.save(gameData);
      }
      
      console.log('[SaveDB-Manager] ✅ Successfully saved to database:', result);
      
      // プレミアムユーザーはカウンター更新をスキップ
      if (!credits.is_premium && !existingGame) {
        console.log('[SaveDB-Manager] 📊 Updating user_credits counter...');
        try {
          const { error: updateError } = await supabase
            .from('user_credits')
            .update({ 
              games_created_this_month: credits.games_created_this_month + 1,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[SaveDB-Manager] ❌ Failed to update credits counter:', updateError);
          } else {
            console.log('[SaveDB-Manager] ✅ Credits counter updated successfully');
          }
        } catch (counterError) {
          console.error('[SaveDB-Manager] ❌ Exception while updating counter:', counterError);
        }
      } else {
        console.log('[SaveDB-Manager] 💎 Premium user or update, skipping counter update');
      }
      
    } catch (error: any) {
      console.error('[SaveDB-Manager] ❌ Failed to save project to database:', error);
      throw new Error(`データベース保存に失敗: ${error.message || 'Unknown error'}`);
    }
  }

  // ✅ プロジェクト保存（Supabaseに保存）
  public async saveProject(project: GameProject, options?: { 
    saveToDatabase?: boolean;
    userId?: string;
  }): Promise<void> {
    try {
      if (!options?.userId) {
        throw new Error('ユーザーIDが必要です');
      }

      await this.saveToDatabase(project, options.userId);
    } catch (error) {
      console.error('[SaveProject-Manager] ❌ Failed to save project:', error);
      throw error;
    }
  }

  // ✅ プロジェクト削除（Supabaseから）
  public async deleteProject(id: string, userId?: string): Promise<void> {
    try {
      console.log('[DeleteProject-Manager] 🗑️ Starting delete...', { id, userId: userId || 'none' });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      // プロジェクトを読み込んでdatabaseIdを取得
      const userGames = await database.userGames.getUserGames(userId);
      const game = userGames.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === id;
      });

      if (game) {
        console.log('[DeleteProject-Manager] 🗑️ Deleting from Supabase...', { databaseId: game.id });
        await database.userGames.delete(game.id);
        console.log('[DeleteProject-Manager] ✅ Deleted from Supabase successfully');
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
