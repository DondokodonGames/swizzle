// src/hooks/editor/useGameProject.ts
// 🔧 フリーズ修正版 + 軽量化対応版: ProjectMetadata対応

import { useState, useCallback, useEffect } from 'react';
import { GameProject, createDefaultGameProject } from '../../types/editor/GameProject';
import { ProjectStorageManager } from '../../services/ProjectStorageManager';
import { supabase } from '../../lib/supabase';

// ✅ ProjectMetadata型定義（ProjectStorageManager.tsと同じ）
export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
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

interface UseGameProjectReturn {
  projects: GameProject[];
  currentProject: GameProject | null;
  loading: boolean;
  error: string | null;
  
  // 基本操作
  listProjects: () => Promise<GameProject[]>; // 🔧 後方互換性のため維持（非推奨）
  listProjectMetadata: () => Promise<ProjectMetadata[]>; // ✅ 新規: 軽量版
  loadFullProject: (id: string) => Promise<GameProject>; // ✅ 新規: 詳細取得
  createProject: (name: string) => Promise<GameProject>;
  loadProject: (id: string) => Promise<void>; // 既存: エディター開く用
  saveProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string, newName: string) => Promise<GameProject>;
  exportProject: (id: string) => Promise<Blob>;
  importProject: (file: File) => Promise<GameProject>;
  clearError: () => void;
  
  // EditorApp.tsx用の追加メソッド
  hasUnsavedChanges: boolean;
  updateProject: (updates?: Partial<GameProject>) => Promise<void>;
  getTotalSize: (project?: GameProject) => number;
  getValidationErrors: (project?: GameProject) => string[];
}

// ✅ ユーザー情報キャッシュ（モジュールレベル）
let cachedUser: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 600000; // 10分間キャッシュ

// ✅ 並列実行防止フラグ
let fetchingUser: Promise<any> | null = null;

// ✅ セッション有効性チェック用フラグ
let sessionValid: boolean = false;

// ✅ ユーザー情報を取得（並列実行防止・キャッシュ延長）
async function getCachedUser(forceRefresh: boolean = false): Promise<any> {
  const now = Date.now();
  
  if (!forceRefresh && sessionValid && cachedUser && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[useGameProject] ✅ キャッシュからユーザー取得:', cachedUser.id);
    return cachedUser;
  }
  
  if (fetchingUser) {
    console.log('[useGameProject] ⏳ 実行中のユーザー取得を待機中...');
    return fetchingUser;
  }
  
  console.log('[useGameProject] 🔄 ユーザー情報を新規取得中...');
  
  fetchingUser = (async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[useGameProject] ❌ ユーザー取得エラー:', error);
        cachedUser = null;
        cacheTimestamp = 0;
        sessionValid = false;
        return null;
      }
      
      if (user) {
        cachedUser = user;
        cacheTimestamp = now;
        sessionValid = true;
        console.log('[useGameProject] ✅ ユーザー情報をキャッシュ:', user.id, '(10分間有効)');
      } else {
        cachedUser = null;
        cacheTimestamp = 0;
        sessionValid = false;
        console.log('[useGameProject] ⚠️ ユーザーが見つかりません（ゲスト状態）');
      }
      
      return cachedUser;
    } catch (error) {
      console.error('[useGameProject] ❌ ユーザー取得例外:', error);
      cachedUser = null;
      cacheTimestamp = 0;
      sessionValid = false;
      return null;
    } finally {
      fetchingUser = null;
    }
  })();
  
  return fetchingUser;
}

// キャッシュをクリア（ログアウト時に使用）
export function clearUserCache(): void {
  cachedUser = null;
  cacheTimestamp = 0;
  fetchingUser = null;
  sessionValid = false;
  console.log('[useGameProject] 🗑️ ユーザーキャッシュをクリア');
}

export const useGameProject = (): UseGameProjectReturn => {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [currentProject, setCurrentProject] = useState<GameProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const storage = ProjectStorageManager.getInstance();

  // Supabaseセッション監視（初回のみ）
  useEffect(() => {
    let isMounted = true;
    
    const initUser = async () => {
      try {
        await getCachedUser(true);
        if (isMounted) {
          console.log('[useGameProject] 🎉 初期化完了（セッション監視開始）');
        }
      } catch (err) {
        console.error('[useGameProject] ❌ 初期化エラー:', err);
      }
    };
    
    initUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useGameProject] 🔐 セッション変更:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[useGameProject] ✅ セッション有効');
        sessionValid = true;
        cachedUser = session?.user || null;
        cacheTimestamp = Date.now();
      } else if (event === 'SIGNED_OUT') {
        console.log('[useGameProject] 🚪 セッション無効');
        clearUserCache();
      }
    });
    
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ✅ 新規メソッド: 軽量版プロジェクト一覧取得
  const listProjectMetadata = useCallback(async (): Promise<ProjectMetadata[]> => {
    console.log('[ListProjectMetadata] 🚀 軽量版プロジェクト一覧取得開始...');
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        console.warn('[ListProjectMetadata] ユーザーが見つかりません。空の配列を返します。');
        return [];
      }

      console.log('[ListProjectMetadata] ユーザーID:', user.id);

      // ✅ ProjectStorageManager.listProjects()がProjectMetadata[]を返す前提
      const metadataList = await storage.listProjects(user.id);
      console.log('[ListProjectMetadata] ✅ メタデータ取得完了:', metadataList.length, '件');

      return metadataList;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[ListProjectMetadata] ❌ エラー:', err);
      setError(`プロジェクト一覧の取得に失敗しました: ${message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 新規メソッド: プロジェクト詳細取得
  const loadFullProject = useCallback(async (id: string): Promise<GameProject> => {
    console.log('[LoadFullProject] 📂 プロジェクト詳細取得開始:', id);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトをロードするにはログインが必要です');
      }

      const project = await storage.loadProject(id, user.id);

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      console.log('[LoadFullProject] ✅ プロジェクト詳細取得完了:', project.id);
      return project;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[LoadFullProject] ❌ エラー:', err);
      throw new Error(`プロジェクト詳細の取得に失敗しました: ${message}`);
    }
  }, []);

  // 🔧 既存メソッド: 重い（後方互換性のため維持、非推奨）
  const listProjects = useCallback(async (): Promise<GameProject[]> => {
    console.log('[ListProjects] ⚠️ 非推奨メソッド使用（重い）。listProjectMetadata()を推奨。');
    console.log('[ListProjects] プロジェクト一覧取得開始...');
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        console.warn('[ListProjects] ユーザーが見つかりません。空の配列を返します。');
        setProjects([]);
        return [];
      }

      console.log('[ListProjects] ユーザーID:', user.id);

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
  }, []);

  const createProject = useCallback(async (name: string): Promise<GameProject> => {
    console.log('[CreateProject] プロジェクト作成開始:', name);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトを作成するにはログインが必要です');
      }

      const project = createDefaultGameProject(name, user.id);
      console.log('[CreateProject] プロジェクト作成完了:', project.id);

      await storage.saveProject(project, { saveToDatabase: true, userId: user.id });
      console.log('[CreateProject] プロジェクト保存完了');

      setCurrentProject(project);
      setHasUnsavedChanges(false);
      
      // ✅ 軽量版メソッド使用を推奨（ただし後方互換性のためlistProjects()も実行）
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
  }, [listProjects]);

  // ✅ 既存メソッド: エディターを開く（変更なし）
  const loadProject = useCallback(async (id: string): Promise<void> => {
    console.log('[LoadProject] プロジェクトロード開始（エディター開く）:', id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
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
  }, []);

  const saveProject = useCallback(async (): Promise<void> => {
    if (!currentProject) {
      throw new Error('保存するプロジェクトがありません');
    }
    
    console.log('[SaveProject] プロジェクト保存開始:', currentProject.id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
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
  }, [currentProject, listProjects]);

  const updateProject = useCallback(async (updates?: Partial<GameProject>): Promise<void> => {
    if (!currentProject) {
      console.error('[UpdateProject] currentProjectが存在しません');
      return;
    }
    
    const updatedProject = updates 
      ? { ...currentProject, ...updates }
      : currentProject;
    
    console.log('[UpdateProject] プロジェクト更新（ローカルのみ）:', updatedProject.id);
    setHasUnsavedChanges(true);
    setCurrentProject(updatedProject);
  }, [currentProject]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    console.log('[DeleteProject] プロジェクト削除開始:', id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
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
  }, [currentProject, listProjects]);

  const duplicateProject = useCallback(async (id: string, newName: string): Promise<GameProject> => {
    console.log('[DuplicateProject] プロジェクト複製開始:', id, '→', newName);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトを複製するにはログインが必要です');
      }

      const originalProject = await storage.loadProject(id, user.id);
      
      if (!originalProject) {
        throw new Error('元のプロジェクトが見つかりません');
      }

      const duplicatedProject: GameProject = {
        ...originalProject,
        id: `project-${Date.now()}`,
        name: newName,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'draft'
      };

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
  }, [listProjects]);

  const exportProject = useCallback(async (id: string): Promise<Blob> => {
    console.log('[ExportProject] プロジェクトエクスポート開始:', id);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
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
  }, []);

  const importProject = useCallback(async (file: File): Promise<GameProject> => {
    console.log('[ImportProject] プロジェクトインポート開始:', file.name);
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
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
  }, [listProjects]);

  const getTotalSize = useCallback((project?: GameProject): number => {
    const targetProject = project || currentProject;
    if (!targetProject) return 0;
    return targetProject.totalSize || 0;
  }, [currentProject]);

  const getValidationErrors = useCallback((project?: GameProject): string[] => {
    const targetProject = project || currentProject;
    if (!targetProject) return ['プロジェクトが存在しません'];
    
    const errors: string[] = [];

    if (!targetProject.name || targetProject.name.trim() === '') {
      errors.push('プロジェクト名が空です');
    }

    if (!targetProject.assets) {
      errors.push('アセットが存在しません');
    }

    if (!targetProject.script) {
      errors.push('スクリプトが存在しません');
    }

    if (!targetProject.settings) {
      errors.push('設定が存在しません');
    }

    return errors;
  }, [currentProject]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    projects,
    currentProject,
    loading,
    error,
    listProjects, // 既存（後方互換性）
    listProjectMetadata, // ✅ 新規: 軽量版
    loadFullProject, // ✅ 新規: 詳細取得
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
