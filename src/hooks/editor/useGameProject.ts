// src/hooks/editor/useGameProject.ts
// ✅ キャッシュシステム追加版（元のインターフェース維持・フリーズ解消）

import { useState, useCallback, useRef } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { ProjectStorageManager } from '../../services/ProjectStorageManager';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

// ✅ ProjectMetadataを完全統一
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

// ✅ キャッシュ型定義
interface ProjectsCache {
  userId: string;
  projects: GameProject[];
  timestamp: number;
  expiresIn: number; // ミリ秒
}

export const useGameProject = () => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [currentProject, setCurrentProject] = useState<GameProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ✅ キャッシュ用ref（コンポーネント再レンダリングでもデータ保持）
  const projectsCacheRef = useRef<ProjectsCache | null>(null);

  const storage = ProjectStorageManager.getInstance();

  // ユーザーキャッシュ
  const cachedUserRef = useRef<{ user: User | null; timestamp: number } | null>(null);
  const USER_CACHE_TTL = 5 * 60 * 1000; // 5分

  const getCachedUser = useCallback(async (forceRefresh = false): Promise<User | null> => {
    const now = Date.now();
    
    if (!forceRefresh && cachedUserRef.current && (now - cachedUserRef.current.timestamp < USER_CACHE_TTL)) {
      console.log('[useGameProject] ✅ キャッシュからユーザー取得:', cachedUserRef.current.user?.id);
      return cachedUserRef.current.user;
    }

    console.log('[useGameProject] 🔄 Supabaseからユーザー取得中...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[useGameProject] ❌ ユーザー取得エラー:', userError);
      return null;
    }

    cachedUserRef.current = { user, timestamp: now };
    console.log('[useGameProject] ✅ ユーザー取得成功:', user?.id);
    return user;
  }, []);

  // ✅ キャッシュチェック関数
  const isCacheValid = useCallback((userId: string): boolean => {
    if (!projectsCacheRef.current) {
      console.log('[Cache] ❌ キャッシュが存在しません');
      return false;
    }

    if (projectsCacheRef.current.userId !== userId) {
      console.log('[Cache] ❌ ユーザーIDが異なります');
      return false;
    }

    const now = Date.now();
    const age = now - projectsCacheRef.current.timestamp;
    const isValid = age < projectsCacheRef.current.expiresIn;

    console.log('[Cache] チェック:', {
      age: `${(age / 1000).toFixed(1)}秒`,
      expiresIn: `${(projectsCacheRef.current.expiresIn / 1000).toFixed(1)}秒`,
      isValid
    });

    return isValid;
  }, []);

  // ✅ キャッシュからプロジェクト取得
  const getProjectFromCache = useCallback((projectId: string): GameProject | null => {
    if (!projectsCacheRef.current) {
      console.log('[Cache] ❌ キャッシュが存在しません');
      return null;
    }

    const project = projectsCacheRef.current.projects.find(p => p.id === projectId);
    
    if (project) {
      console.log('[Cache] ✅ キャッシュからプロジェクト取得:', projectId);
    } else {
      console.log('[Cache] ❌ プロジェクトがキャッシュに存在しません:', projectId);
    }

    return project || null;
  }, []);

  // ✅ キャッシュクリア
  const clearCache = useCallback(() => {
    projectsCacheRef.current = null;
    console.log('[Cache] 🗑️ キャッシュクリア');
  }, []);

  // 既存メソッド: listProjects（後方互換性）
  const listProjects = useCallback(async (): Promise<ProjectMetadata[]> => {
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトを読み込むにはログインが必要です');
      }

      const projectList = await storage.listProjects(user.id);
      setProjects(projectList);
      return projectList;
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      console.error('Failed to list projects:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [storage, getCachedUser]);

  // ✅ 新規メソッド: 軽量版プロジェクト一覧取得（メタデータのみ）
  const listProjectMetadata = useCallback(async (): Promise<ProjectMetadata[]> => {
    console.log('[ListProjectMetadata] 🚀 開始');
    
    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        console.warn('[ListProjectMetadata] ⚠️ ユーザー未ログイン');
        return [];
      }

      // ✅ キャッシュチェック
      if (isCacheValid(user.id)) {
        console.log('[ListProjectMetadata] 💾 キャッシュから返却');
        return projectsCacheRef.current!.projects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          lastModified: p.lastModified,
          status: p.status as 'draft' | 'published' | 'archived',
          size: p.totalSize || 0,
          version: p.version,
          thumbnailDataUrl: p.thumbnailDataUrl,
          stats: {
            objectsCount: p.assets?.objects?.length || 0,
            soundsCount: (p.assets?.audio?.bgm ? 1 : 0) + (p.assets?.audio?.se?.length || 0),
            rulesCount: p.script?.rules?.length || 0
          }
        }));
      }

      console.log('[ListProjectMetadata] 🔄 Supabaseから取得中...');
      const metadataList = await storage.listProjects(user.id);
      
      console.log('[ListProjectMetadata] ✅ メタデータ取得完了:', metadataList.length);
      return metadataList;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[ListProjectMetadata] ❌ エラー:', err);
      setError(message);
      return [];
    }
  }, [storage, getCachedUser, isCacheValid]);

  // ✅ 新規メソッド: プロジェクト詳細取得（キャッシュ優先）
  const loadFullProject = useCallback(async (id: string): Promise<GameProject> => {
    console.log('[LoadFullProject] 📂 プロジェクト詳細取得開始:', id);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトをロードするにはログインが必要です');
      }

      // ✅ キャッシュから検索
      if (isCacheValid(user.id)) {
        const cachedProject = getProjectFromCache(id);
        if (cachedProject) {
          console.log('[LoadFullProject] ✅ キャッシュからプロジェクト返却:', id);
          return cachedProject;
        }
      }

      // ✅ キャッシュにない場合のみSupabaseから取得
      console.log('[LoadFullProject] 🔄 Supabaseから取得中...');
      const project = await storage.loadProject(id, user.id);

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      // ✅ 取得したプロジェクトをキャッシュに追加
      if (projectsCacheRef.current && projectsCacheRef.current.userId === user.id) {
        const existingIndex = projectsCacheRef.current.projects.findIndex(p => p.id === id);
        if (existingIndex >= 0) {
          projectsCacheRef.current.projects[existingIndex] = project;
        } else {
          projectsCacheRef.current.projects.push(project);
        }
        console.log('[LoadFullProject] ✅ キャッシュに追加:', id);
      }

      console.log('[LoadFullProject] ✅ プロジェクト詳細取得完了:', project.id);
      return project;

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('[LoadFullProject] ❌ エラー:', err);
      throw new Error(`プロジェクト詳細の取得に失敗しました: ${message}`);
    }
  }, [storage, getCachedUser, isCacheValid, getProjectFromCache]);

  // 既存メソッド: createProject
  const createProject = useCallback(async (name: string): Promise<GameProject> => {
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトを作成するにはログインが必要です');
      }

      const newProject: GameProject = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: '',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0',
        creator: {
          userId: user.id,
          username: user.email || 'Anonymous',
          isAnonymous: false
        },
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
            limitations: {
              isNearImageLimit: false,
              isNearAudioLimit: false,
              isNearTotalLimit: false,
              hasViolations: false
            }
          },
          lastModified: new Date().toISOString()
        },
        script: {
          initialState: {
            layout: {
              background: {
                visible: false,
                frameIndex: 0,
                animationSpeed: 12,
                autoStart: false
              },
              objects: [],
              texts: []
            },
            audio: {
              bgm: null,
              masterVolume: 0.8,
              seVolume: 0.8
            },
            gameState: {
              flags: {},
              score: 0,
              counters: {}
            },
            autoRules: [],
            metadata: {
              version: '1.0.0',
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            }
          },
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
              backgroundColor: '#87CEEB'
            }
          },
          flags: [],
          counters: [],
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
            counterCount: 0,
            usedCounterOperations: [],
            usedCounterComparisons: [],
            randomConditionCount: 0,
            randomActionCount: 0,
            totalRandomChoices: 0,
            averageRandomProbability: 0,
            estimatedCPUUsage: 'low',
            estimatedMemoryUsage: 0,
            maxConcurrentEffects: 0,
            randomEventsPerSecond: 0,
            randomMemoryUsage: 0
          },
          version: '1.0.0',
          lastModified: new Date().toISOString()
        },
        settings: {
          name: name.trim(),
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
        },
        status: 'draft',
        totalSize: 0,
        metadata: {
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
        },
        versionHistory: [],
        projectSettings: {
          autoSaveInterval: 30000,
          backupEnabled: true,
          compressionEnabled: false,
          maxVersionHistory: 10
        }
      };

      await storage.saveProject(newProject, {
        saveToDatabase: true,
        userId: user.id
      });

      setCurrentProject(newProject);
      setHasUnsavedChanges(false);

      // ✅ キャッシュクリア（新規作成時）
      clearCache();

      return newProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, getCachedUser, clearCache]);

  // 既存メソッド: loadProject
  const loadProject = useCallback(async (id: string): Promise<void> => {
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

      setCurrentProject(project);
      setHasUnsavedChanges(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, getCachedUser]);

  // ✅ 新規: 外部からロード済みプロジェクトを設定（二重ロード防止）
  const setCurrentProjectDirectly = useCallback((project: GameProject) => {
    console.log('[SetCurrentProjectDirectly] プロジェクトを直接設定:', project.id, project.name);
    setCurrentProject(project);
    setHasUnsavedChanges(false);
  }, []);

  // ✅ 修正: saveProject（引数なし、currentProjectを使用）
  const saveProject = useCallback(async (options?: { metadataOnly?: boolean }): Promise<void> => {
    if (!currentProject) {
      throw new Error('保存するプロジェクトが選択されていません');
    }

    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);

      if (!user) {
        throw new Error('プロジェクトを保存するにはログインが必要です');
      }

      const updatedProject = {
        ...currentProject,
        lastModified: new Date().toISOString(),
        metadata: {
          ...currentProject.metadata,
          statistics: {
            ...currentProject.metadata.statistics,
            saveCount: (currentProject.metadata.statistics?.saveCount || 0) + 1
          }
        }
      };

      await storage.saveProject(updatedProject, {
        saveToDatabase: true,
        userId: user.id,
        metadataOnly: options?.metadataOnly  // 軽量更新オプション
      });

      setCurrentProject(updatedProject);
      setHasUnsavedChanges(false);

      // ✅ キャッシュクリア（保存時）
      clearCache();

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject, storage, getCachedUser, clearCache]);

  // ✅ 新規: メタデータのみ保存（タイトル・説明変更時の高速保存）
  const saveMetadataOnly = useCallback(async (): Promise<void> => {
    return saveProject({ metadataOnly: true });
  }, [saveProject]);

  // 既存メソッド: deleteProject
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトを削除するにはログインが必要です');
      }

      await storage.deleteProject(id, user.id);

      if (currentProject?.id === id) {
        setCurrentProject(null);
      }

      setProjects(prev => prev.filter(p => p.id !== id));

      // ✅ キャッシュクリア（削除時）
      clearCache();

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, currentProject, getCachedUser, clearCache]);

  // ✅ 修正: duplicateProject（2引数に戻す）
  const duplicateProject = useCallback(async (id: string, newName: string): Promise<GameProject> => {
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトを複製するにはログインが必要です');
      }

      const duplicated = await storage.duplicateProject(id, newName, user.id);

      // ✅ キャッシュクリア（複製時）
      clearCache();

      return duplicated;
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, getCachedUser, clearCache]);

  // 既存メソッド: exportProject
  const exportProject = useCallback(async (id: string): Promise<void> => {
    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトをエクスポートするにはログインが必要です');
      }

      const blob = await storage.exportProject(id, user.id);

      const projectName = projects.find(p => p.id === id)?.name || 'project';
      const fileName = `${projectName}_${new Date().toISOString().split('T')[0]}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    }
  }, [storage, projects, getCachedUser]);

  // 既存メソッド: importProject
  const importProject = useCallback(async (file: File): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const user = await getCachedUser(false);
      
      if (!user) {
        throw new Error('プロジェクトをインポートするにはログインが必要です');
      }

      const imported = await storage.importProject(file, user.id);
      setCurrentProject(imported);

      // ✅ キャッシュクリア（インポート時）
      clearCache();

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, getCachedUser, clearCache]);

  // その他のメソッド
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ✅ updateProject（元のまま：updater関数を受け取る）
  const updateProject = useCallback((updater: (project: GameProject) => GameProject) => {
    if (!currentProject) return;
    
    const updated = updater(currentProject);
    setCurrentProject(updated);
    setHasUnsavedChanges(true);
  }, [currentProject]);

  // ✅ 修正: getTotalSize（引数なし、currentProjectを使用）
  const getTotalSize = useCallback((): number => {
    if (!currentProject) return 0;
    return currentProject.totalSize || 0;
  }, [currentProject]);

  // ✅ 修正: getValidationErrors（引数なし、currentProjectを使用）
  const getValidationErrors = useCallback((): string[] => {
    if (!currentProject) return ['プロジェクトが選択されていません'];

    const errors: string[] = [];

    if (!currentProject.name || currentProject.name.trim() === '') {
      errors.push('プロジェクト名が設定されていません');
    }

    if (currentProject.totalSize > 10 * 1024 * 1024) {
      errors.push('プロジェクトサイズが10MBを超えています');
    }

    return errors;
  }, [currentProject]);

  return {
    projects,
    currentProject,
    loading,
    error,
    listProjects,
    listProjectMetadata,
    loadFullProject,
    createProject,
    loadProject,
    saveProject,
    saveMetadataOnly,
    deleteProject,
    duplicateProject,
    exportProject,
    importProject,
    clearError,
    hasUnsavedChanges,
    updateProject,
    getTotalSize,
    getValidationErrors,
    setCurrentProjectDirectly
  };
};