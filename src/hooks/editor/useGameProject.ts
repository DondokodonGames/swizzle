// src/hooks/editor/useGameProject.ts
// 完全修正版 - saveProject()引数なし対応

import { useState, useCallback, useEffect } from 'react';
import { GameProject, createDefaultGameProject } from '../../types/editor/GameProject';
import { ProjectStorageManager } from '../../services/ProjectStorageManager';
import { supabase } from '../../lib/supabase';

interface UseGameProjectReturn {
  projects: GameProject[];
  currentProject: GameProject | null;
  loading: boolean;
  error: string | null;
  
  // 基本操作
  listProjects: () => Promise<GameProject[]>;
  createProject: (name: string) => Promise<GameProject>;
  loadProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;  // ✅ 引数なしに変更
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string, newName: string) => Promise<GameProject>;
  exportProject: (id: string) => Promise<Blob>;
  importProject: (file: File) => Promise<GameProject>;
  clearError: () => void;
  
  // EditorApp.tsx用の追加メソッド
  hasUnsavedChanges: boolean;
  updateProject: (project: GameProject) => Promise<void>;
  getTotalSize: (project: GameProject) => number;
  getValidationErrors: (project: GameProject) => string[];
}

// ユーザー情報キャッシュ
let cachedUser: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1分間キャッシュ

// ユーザー情報を取得（キャッシュ付き）
async function getCachedUser(forceRefresh: boolean = false): Promise<any> {
  const now = Date.now();
  
  if (!forceRefresh && cachedUser && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[useGameProject] ✅ キャッシュからユーザー取得:', cachedUser.id);
    return cachedUser;
  }
  
  console.log('[useGameProject] 🔄 ユーザー情報を新規取得中...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('[useGameProject] ❌ ユーザー取得エラー:', error);
      cachedUser = null;
      cacheTimestamp = 0;
      return null;
    }
    
    if (user) {
      cachedUser = user;
      cacheTimestamp = now;
      console.log('[useGameProject] ✅ ユーザー情報をキャッシュ:', user.id);
    } else {
      cachedUser = null;
      cacheTimestamp = 0;
      console.log('[useGameProject] ⚠️ ユーザーが見つかりません（ゲスト状態）');
    }
    
    return cachedUser;
  } catch (error) {
    console.error('[useGameProject] ❌ ユーザー取得例外:', error);
    cachedUser = null;
    cacheTimestamp = 0;
    return null;
  }
}

// キャッシュをクリア（ログアウト時に使用）
export function clearUserCache(): void {
  cachedUser = null;
  cacheTimestamp = 0;
  console.log('[useGameProject] 🗑️ ユーザーキャッシュをクリア');
}

export const useGameProject = (): UseGameProjectReturn => {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [currentProject, setCurrentProject] = useState<GameProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const storage = ProjectStorageManager.getInstance();

  // 初回マウント時にユーザー情報を取得してキャッシュ
  useEffect(() => {
    getCachedUser(true);
  }, []);

  const listProjects = useCallback(async (): Promise<GameProject[]> => {
    console.log('[ListProjects] プロジェクト一覧取得開始...');
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        console.warn('[ListProjects] ユーザーが見つかりません。空の配列を返します。');
        setProjects([]);
        return [];
      }

      console.log('[ListProjects] ユーザーID:', user.id);

      // メタデータ一覧を取得
      const metadataList = await storage.listProjects(user.id);
      console.log('[ListProjects] メタデータ取得完了:', metadataList.length, '件');

      const loadedProjects: GameProject[] = [];

      for (const meta of metadataList) {
        try {
          console.log(`[ListProjects] プロジェクトロード中: ${meta.id} (${meta.name})`);
          
          const project = await storage.loadProject(meta.id, user.id);
          
          if (project) {
            loadedProjects.push(project);
          } else {
            console.warn(`[ListProjects] プロジェクトが見つかりません: ${meta.id}`);
          }
        } catch (loadError) {
          console.error(`[ListProjects] プロジェクトロードエラー: ${meta.id}`, loadError);
        }
      }

      console.log('[ListProjects] ロード完了:', loadedProjects.length, '件');
      setProjects(loadedProjects);
      return loadedProjects;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[ListProjects] エラー:', err);
      setError(`プロジェクト一覧の取得に失敗しました: ${message}`);
      setProjects([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [storage]);

  const createProject = useCallback(async (name: string): Promise<GameProject> => {
    console.log('[CreateProject] プロジェクト作成開始:', name);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトを作成するにはログインが必要です');
      }

      const project = createDefaultGameProject(name, user.id);
      console.log('[CreateProject] プロジェクト作成完了:', project.id);

      await storage.saveProject(project, { saveToDatabase: true, userId: user.id });
      console.log('[CreateProject] プロジェクト保存完了');

      setCurrentProject(project);
      setHasUnsavedChanges(false);
      await listProjects();

      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[CreateProject] エラー:', err);
      setError(`プロジェクトの作成に失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, listProjects]);

  const loadProject = useCallback(async (id: string): Promise<void> => {
    console.log('[LoadProject] プロジェクトロード開始:', id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトをロードするにはログインが必要です');
      }

      const project = await storage.loadProject(id, user.id);

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      console.log('[LoadProject] プロジェクトロード完了:', project.id);
      setCurrentProject(project);
      setHasUnsavedChanges(false);

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[LoadProject] エラー:', err);
      setError(`プロジェクトの読み込みに失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage]);

  // ✅ 修正: saveProject()を引数なしに変更
  const saveProject = useCallback(async (): Promise<void> => {
    if (!currentProject) {
      throw new Error('保存するプロジェクトがありません');
    }
    
    console.log('[SaveProject] プロジェクト保存開始:', currentProject.id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトを保存するにはログインが必要です');
      }

      await storage.saveProject(currentProject, { saveToDatabase: true, userId: user.id });
      console.log('[SaveProject] プロジェクト保存完了');

      setHasUnsavedChanges(false);
      await listProjects();

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[SaveProject] エラー:', err);
      setError(`プロジェクトの保存に失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject, storage, listProjects]);

  // updateProjectを追加
  const updateProject = useCallback(async (project: GameProject): Promise<void> => {
    console.log('[UpdateProject] プロジェクト更新:', project.id);
    setHasUnsavedChanges(true);
    setCurrentProject(project);
    // 自動保存は行わず、ユーザーが明示的にsaveProjectを呼ぶまで待つ
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    console.log('[DeleteProject] プロジェクト削除開始:', id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトを削除するにはログインが必要です');
      }

      await storage.deleteProject(id, user.id);
      console.log('[DeleteProject] プロジェクト削除完了');

      if (currentProject?.id === id) {
        setCurrentProject(null);
        setHasUnsavedChanges(false);
      }

      await listProjects();

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[DeleteProject] エラー:', err);
      setError(`プロジェクトの削除に失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, currentProject, listProjects]);

  const duplicateProject = useCallback(async (id: string, newName: string): Promise<GameProject> => {
    console.log('[DuplicateProject] プロジェクト複製開始:', id, '→', newName);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトを複製するにはログインが必要です');
      }

      // 元のプロジェクトをロード
      const originalProject = await storage.loadProject(id, user.id);
      
      if (!originalProject) {
        throw new Error('元のプロジェクトが見つかりません');
      }

      // 新しいプロジェクトを作成
      const duplicatedProject: GameProject = {
        ...originalProject,
        id: `project-${Date.now()}`,
        name: newName,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'draft'
      };

      // 保存
      await storage.saveProject(duplicatedProject, { saveToDatabase: true, userId: user.id });
      console.log('[DuplicateProject] プロジェクト複製完了:', duplicatedProject.id);

      await listProjects();

      return duplicatedProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[DuplicateProject] エラー:', err);
      setError(`プロジェクトの複製に失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, listProjects]);

  const exportProject = useCallback(async (id: string): Promise<Blob> => {
    console.log('[ExportProject] プロジェクトエクスポート開始:', id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトをエクスポートするにはログインが必要です');
      }

      const project = await storage.loadProject(id, user.id);

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

      console.log('[ExportProject] プロジェクトエクスポート完了');
      return blob;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[ExportProject] エラー:', err);
      setError(`プロジェクトのエクスポートに失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage]);

  const importProject = useCallback(async (file: File): Promise<GameProject> => {
    console.log('[ImportProject] プロジェクトインポート開始:', file.name);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser();
      
      if (!user) {
        throw new Error('プロジェクトをインポートするにはログインが必要です');
      }

      const project = await storage.importProject(file, user.id);
      console.log('[ImportProject] プロジェクトインポート完了:', project.id);

      setCurrentProject(project);
      setHasUnsavedChanges(false);
      await listProjects();

      return project;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[ImportProject] エラー:', err);
      setError(`プロジェクトのインポートに失敗しました: ${message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, listProjects]);

  const getTotalSize = useCallback((project: GameProject): number => {
    return project.totalSize || 0;
  }, []);

  const getValidationErrors = useCallback((project: GameProject): string[] => {
    const errors: string[] = [];

    // プロジェクト名チェック
    if (!project.name || project.name.trim() === '') {
      errors.push('プロジェクト名が空です');
    }

    // アセットチェック
    if (!project.assets) {
      errors.push('アセットが存在しません');
    }

    // スクリプトチェック
    if (!project.script) {
      errors.push('スクリプトが存在しません');
    }

    // 設定チェック
    if (!project.settings) {
      errors.push('設定が存在しません');
    }

    return errors;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    projects,
    currentProject,
    loading,
    error,
    listProjects,
    createProject,
    loadProject,
    saveProject,
    deleteProject,
    duplicateProject,
    exportProject,
    importProject,
    clearError,
    hasUnsavedChanges,
    updateProject,
    getTotalSize,
    getValidationErrors
  };
};
