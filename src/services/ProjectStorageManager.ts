// src/services/ProjectStorageManager.ts
// Supabase専用版（ローカルストレージ機能削除）

import { GameProject } from '../types/editor/GameProject';
import { database, supabase } from '../lib/supabase';

// プロジェクトメタデータ
interface ProjectMetadata {
  id: string;
  name: string;
  lastModified: string;
  status: GameProject['status'];
  size: number;
  version: string;
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

  private constructor() {
    // 初期化処理なし（Supabase専用）
  }

  // シングルトンパターン
  public static getInstance(): ProjectStorageManager {
    if (!ProjectStorageManager.instance) {
      ProjectStorageManager.instance = new ProjectStorageManager();
    }
    return ProjectStorageManager.instance;
  }

  // ✅ プロジェクト一覧取得（Supabaseから）
  public async listProjects(userId?: string): Promise<ProjectMetadata[]> {
    try {
      console.log('[ListProjects-Manager] Loading projects...', { userId: userId || 'none' });

      if (!userId) {
        console.warn('[ListProjects-Manager] No userId provided, returning empty array');
        return [];
      }

      console.log('[ListProjects-Manager] Fetching from Supabase...');
      const userGames = await database.userGames.getUserGames(userId);
      console.log('[ListProjects-Manager] Supabase games:', userGames?.length || 0);

      // 🔧 修正: project_dataのIDを正しく使用
      const projectMap = new Map<string, any>();
      for (const game of userGames) {
        const projectData = game.project_data as any as GameProject;
        
        // project_dataが存在しない場合はスキップ
        if (!projectData) {
          console.warn('[ListProjects-Manager] Game has no project_data:', game.id);
          continue;
        }

        const projectId = projectData.id; // プロジェクト自体のID

        // 同じproject.idがある場合は新しい方を優先
        const existing = projectMap.get(projectId);
        if (!existing || new Date(game.updated_at) > new Date(existing.updated_at)) {
          projectMap.set(projectId, { game, projectData });
        }
      }

      const projects = Array.from(projectMap.values()).map(({ game, projectData }): ProjectMetadata => ({
        id: projectData.id,  // ✅ プロジェクトID（loadProjectで使用）
        databaseId: game.id, // ✅ データベースID（削除時に使用）
        name: game.title,
        lastModified: game.updated_at,
        status: game.is_published ? 'published' : 'draft',
        size: projectData.totalSize || 0,
        version: projectData.version || '1.0.0'
      } as any));

      console.log('[ListProjects-Manager] Processed projects:', projects.length);
      console.log('[ListProjects-Manager] Project IDs:', projects.map(p => ({ id: p.id, name: p.name })));

      // 最終更新日でソート
      return projects.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

    } catch (error) {
      console.error('[ListProjects-Manager] Failed to list projects:', error);
      return [];
    }
  }

  // ✅ プロジェクト読み込み（Supabaseから）
  public async loadProject(id: string, userId?: string): Promise<GameProject | null> {
    try {
      console.log('[LoadProject-Manager] Loading project...', { id, userId: userId || 'none' });

      if (!userId) {
        console.warn('[LoadProject-Manager] No userId provided');
        return null;
      }

      const userGames = await database.userGames.getUserGames(userId);
      console.log('[LoadProject-Manager] Total games found:', userGames.length);

      // 🔧 修正: project_data.idでマッチング
      const game = userGames.find(g => {
        const projectData = g.project_data as any as GameProject;
        return projectData && projectData.id === id;
      });

      if (!game) {
        console.warn('[LoadProject-Manager] Project not found:', id);
        return null;
      }

      console.log('[LoadProject-Manager] Project found:', game.title);

      const projectData = game.project_data as any as GameProject;
      
      // ✅ metadataにdatabaseIdを追加
      return {
        ...projectData,
        metadata: {
          ...projectData.metadata,
          databaseId: game.id,
          lastSyncedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[LoadProject-Manager] Failed to load project:', error);
      return null;
    }
  }

  // ✅ プロジェクト保存（Supabaseデータベース）
  public async saveToDatabase(project: GameProject, userId: string): Promise<void> {
    try {
      console.log('[SaveDB-Manager] Saving project to Supabase database:', { 
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
        console.error('[SaveDB-Manager] Failed to fetch user credits:', creditsError);
        throw new Error(`クレジット情報の取得に失敗: ${creditsError.message}`);
      }

      if (!credits) {
        console.error('[SaveDB-Manager] No credits found for user:', userId);
        throw new Error('ユーザーのクレジット情報が見つかりません');
      }

      console.log('[SaveDB-Manager] User credits:', credits);

      // プレミアムでない場合のみ制限チェック
      if (!credits.is_premium && credits.games_created_this_month >= credits.monthly_limit) {
        console.warn('[SaveDB-Manager] Monthly limit reached:', {
          created: credits.games_created_this_month,
          limit: credits.monthly_limit
        });
        throw new Error('月間ゲーム作成制限に達しています。プレミアムプランにアップグレードしてください。');
      }

      console.log('[SaveDB-Manager] Credit check passed, saving to user_games...');

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
        console.log('[SaveDB-Manager] Updating existing game:', existingGame.id);
        result = await database.userGames.update(existingGame.id, gameData);
      } else {
        // 新規ゲームを作成
        console.log('[SaveDB-Manager] Creating new game');
        result = await database.userGames.save(gameData);
      }
      
      console.log('[SaveDB-Manager] ✅ Successfully saved to database:', result);
      
      // プレミアムユーザーはカウンター更新をスキップ
      if (!credits.is_premium && !existingGame) {
        console.log('[SaveDB-Manager] Updating user_credits counter...');
        try {
          const { error: updateError } = await supabase
            .from('user_credits')
            .update({ 
              games_created_this_month: credits.games_created_this_month + 1,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[SaveDB-Manager] Failed to update credits counter:', updateError);
          } else {
            console.log('[SaveDB-Manager] Credits counter updated successfully');
          }
        } catch (counterError) {
          console.error('[SaveDB-Manager] Exception while updating counter:', counterError);
        }
      } else {
        console.log('[SaveDB-Manager] Premium user or update, skipping counter update');
      }
      
    } catch (error: any) {
      console.error('[SaveDB-Manager] Failed to save project to database:', error);
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

      // Supabaseに保存
      await this.saveToDatabase(project, options.userId);

    } catch (error) {
      console.error('[SaveProject-Manager] Failed to save project:', error);
      throw error;
    }
  }

  // ✅ プロジェクト削除（Supabaseから）
  public async deleteProject(id: string, userId?: string): Promise<void> {
    try {
      console.log('[DeleteProject-Manager] Starting delete...', { id, userId: userId || 'none' });

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
        console.log('[DeleteProject-Manager] Deleting from Supabase...', { databaseId: game.id });
        await database.userGames.delete(game.id);
        console.log('[DeleteProject-Manager] Deleted from Supabase successfully');
      } else {
        console.warn('[DeleteProject-Manager] Project not found in Supabase:', id);
      }

    } catch (error) {
      console.error('[DeleteProject-Manager] Failed to delete project:', error);
      throw error;
    }
  }

  // ✅ プロジェクト複製（Supabaseに保存）
  public async duplicateProject(id: string, newName: string, userId?: string): Promise<GameProject> {
    console.log('[DuplicateProject-Manager] Starting duplicate...', { id, newName, userId: userId || 'none' });

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

    // Supabaseに保存
    await this.saveToDatabase(duplicatedProject, userId);
    console.log('[DuplicateProject-Manager] Saved to Supabase successfully');

    return duplicatedProject;
  }

  // ✅ プロジェクトエクスポート
  public async exportProject(id: string): Promise<Blob> {
    // 🔧 注意: loadProjectにはuserIdが必要だが、エクスポート時には不要
    // useGameProject.tsで事前にプロジェクトを取得してから呼び出すことを想定
    throw new Error('exportProject requires userId. Use storage.loadProject() first.');
  }

  // ✅ プロジェクトインポート（Supabaseに保存）
  public async importProject(file: File, userId?: string): Promise<GameProject> {
    try {
      console.log('[ImportProject-Manager] Starting import...', { 
        fileName: file.name, 
        fileSize: file.size, 
        userId: userId || 'none' 
      });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const text = await file.text();
      console.log('[ImportProject-Manager] File read successfully, length:', text.length);

      const importData: ProjectExportData = JSON.parse(text);
      console.log('[ImportProject-Manager] JSON parsed successfully');

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
        metadata: {
          ...importData.project.metadata,
          databaseId: undefined,
          lastSyncedAt: undefined
        }
      };

      console.log('[ImportProject-Manager] Saving project to Supabase...');
      await this.saveToDatabase(importedProject, userId);
      console.log('[ImportProject-Manager] Project saved to Supabase successfully');

      return importedProject;
    } catch (error) {
      console.error('[ImportProject-Manager] Failed to import project:', error);
      throw new Error(`プロジェクトのインポートに失敗しました: ${(error as any).message}`);
    }
  }

  // ✅ プロジェクト検索（Supabaseから）
  public async searchProjects(query: string, userId?: string): Promise<ProjectMetadata[]> {
    const allProjects = await this.listProjects(userId);
    
    if (!query.trim()) {
      return allProjects;
    }

    const searchTerm = query.toLowerCase();
    
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      project.id.toLowerCase().includes(searchTerm)
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
      console.log('[RestoreBackup-Manager] Starting restore...', { mergeMode, userId: userId || 'none' });

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.projects || !Array.isArray(backupData.projects)) {
        throw new Error('無効なバックアップファイルです');
      }

      if (mergeMode === 'replace') {
        // 既存プロジェクトを全削除
        const existingProjects = await this.listProjects(userId);
        for (const project of existingProjects) {
          await this.deleteProject(project.id, userId);
        }
      }

      // プロジェクトを復元
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

      console.log('[RestoreBackup-Manager] Restored', backupData.projects.length, 'projects successfully');
    } catch (error) {
      console.error('[RestoreBackup-Manager] Failed to restore backup:', error);
      throw new Error('バックアップの復元に失敗しました');
    }
  }
}
