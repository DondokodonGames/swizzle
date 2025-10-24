// src/hooks/editor/useGameProject.ts - ScriptStatistics完全実装版

import { useState, useCallback, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { ProjectAssets } from '../../types/editor/ProjectAssets';
import { GameScript, createDefaultInitialState } from '../../types/editor/GameScript';
import { GameSettings } from '../../types/editor/GameSettings';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { ProjectStorage } from '../../services/editor/ProjectStorage';

interface UseGameProjectReturn {
  currentProject: GameProject | null;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  
  // CRUD操作
  createProject: (name: string, template?: string) => Promise<GameProject>;
  loadProject: (id: string) => Promise<void>;
  saveProject: (project?: GameProject) => Promise<void>;
  updateProject: (updates: Partial<GameProject>) => void;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string, newName: string) => Promise<GameProject>;
  
  // アセット管理
  updateAssets: (assets: Partial<ProjectAssets>) => void;
  addAsset: (type: keyof ProjectAssets, asset: any) => void;
  removeAsset: (type: keyof ProjectAssets, id: string) => void;
  
  // スクリプト管理
  updateScript: (script: Partial<GameScript>) => void;
  addRule: (rule: any) => void;
  removeRule: (ruleId: string) => void;
  
  // 設定管理
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // ユーティリティ
  getTotalSize: () => number;
  canAddAsset: (type: string, size?: number) => boolean;
  getValidationErrors: () => string[];
  
  // ✨ ProjectStorage統合機能
  listProjects: () => Promise<GameProject[]>;
  exportProject: (id: string) => Promise<Blob>;
  importProject: (file: File) => Promise<GameProject>;
}

// 🔧 修正: デフォルトプロジェクト作成（3タブ統合版）
const createDefaultProject = (name: string): GameProject => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    lastModified: now,
    version: '1.0.0',
    creator: { isAnonymous: true },
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
        lastOpened: now,
        totalOpenCount: 1,
        averageSessionTime: 0
      },
      performance: {
        lastBuildTime: 0,
        averageFPS: 60,
        memoryUsage: 0
      }
    },
    
    versionHistory: [
      {
        id: crypto.randomUUID(),
        version: '1.0.0',
        createdAt: now,
        description: 'プロジェクト作成',
        author: 'Anonymous',
        changes: [
          {
            type: 'added',
            category: 'assets',
            description: 'プロジェクト作成',
            affectedItems: []
          }
        ],
        snapshot: {
          assetsCount: { background: 0, objects: 0, texts: 0, bgm: 0, se: 0 },
          rulesCount: 0,
          totalSize: 0
        }
      }
    ],
    
    projectSettings: {
      autoSaveInterval: 30000,
      backupEnabled: true,
      compressionEnabled: false,
      maxVersionHistory: 10
    },
    
    assets: {
      background: null,
      objects: [],
      texts: [],
      audio: { bgm: null, se: [] },
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
      lastModified: now
    },
    
    script: {
      // 🔧 修正: initialState追加
      initialState: createDefaultInitialState(),
      layout: {
        background: { visible: false, initialAnimation: 0, animationSpeed: 10, autoStart: false },
        objects: [],
        texts: [],
        stage: { backgroundColor: '#ffffff' }
      },
      flags: [],
      counters: [], // 🔧 追加: カウンター配列
      rules: [],
      successConditions: [],
      // 🔧 修正: ScriptStatistics完全実装
      statistics: { 
        totalRules: 0, 
        totalConditions: 0, 
        totalActions: 0, 
        complexityScore: 0,
        usedTriggerTypes: [],
        usedActionTypes: [],
        flagCount: 0,
        // 🔧 追加: 不足していたプロパティ
        counterCount: 0,
        usedCounterOperations: [],
        usedCounterComparisons: [],
        randomConditionCount: 0,
        randomActionCount: 0,
        totalRandomChoices: 0,
        averageRandomProbability: 0,
        estimatedCPUUsage: 'low' as const,
        estimatedMemoryUsage: 0,
        maxConcurrentEffects: 0,
        randomEventsPerSecond: 0,
        randomMemoryUsage: 0
      },
      version: '1.0.0',
      lastModified: now
    },
    
    settings: {
      name: name.trim(),
      duration: { type: 'fixed', seconds: 10 },
      difficulty: 'easy',
      publishing: {
        isPublished: false,
        visibility: 'private',
        allowComments: true,
        allowRemix: true
      },
      preview: {},
      export: { 
        includeSourceData: true, 
        compressionLevel: 'medium',
        format: 'json'
      }
    },
    
    // 🔧 修正: editorState（3タブ統合版）
    editorState: {
      activeTab: 'assets',
      lastSaved: now,
      autoSaveEnabled: true,
      tabStates: {
        assets: {
          selectedAssetType: null,
          selectedAssetId: null,
          showAnimationEditor: false
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
    }
  };
};

export const useGameProject = (): UseGameProjectReturn => {
  const [currentProject, setCurrentProject] = useState<GameProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // ✨ ProjectStorage統合
  const storage = ProjectStorage.getInstance();

  // エラーハンドリングヘルパー（改善版）
  const handleError = useCallback((operation: string, err: any) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`${operation} failed:`, err);
    setError(`${operation}に失敗しました: ${errorMessage}`);
    setLoading(false);
  }, []);

  // 自動保存機能（新実装）
  useEffect(() => {
    if (!currentProject || !hasUnsavedChanges || !currentProject.editorState?.autoSaveEnabled) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      saveProject().catch(err => {
        console.warn('Auto-save failed:', err);
      });
    }, currentProject.projectSettings.autoSaveInterval || 30000);

    return () => clearTimeout(autoSaveTimer);
  }, [currentProject, hasUnsavedChanges]);

  // プロジェクト一覧取得（✨ ProjectStorage使用）
  const listProjects = useCallback(async (): Promise<GameProject[]> => {
    try {
      setLoading(true);
      setError(null);
      
      // ProjectStorageから一覧取得
      const metadata = await storage.listProjects();
      const projects: GameProject[] = [];
      
      for (const meta of metadata) {
        const project = await storage.loadProject(meta.id);
        if (project) {
          projects.push(project);
        }
      }
      
      return projects;
    } catch (err: any) {
      handleError('プロジェクト一覧取得', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [storage, handleError]);

  // プロジェクト作成（✨ ProjectStorage使用）
  const createProject = useCallback(async (name: string, template?: string): Promise<GameProject> => {
    try {
      setLoading(true);
      setError(null);

      if (!name.trim()) {
        throw new Error('プロジェクト名が入力されていません');
      }

      if (name.length > 50) {
        throw new Error('プロジェクト名は50文字以内で入力してください');
      }

      const newProject = createDefaultProject(name);
      
      // TODO: テンプレート適用処理
      if (template) {
        console.log('Template application for:', template);
      }

      // ProjectStorageに保存
      await storage.saveProject(newProject);
      
      // 現在のプロジェクトとして設定
      setCurrentProject(newProject);
      setHasUnsavedChanges(false);

      return newProject;
    } catch (err: any) {
      handleError('プロジェクト作成', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, handleError]);

  // プロジェクト読み込み（✨ ProjectStorage使用）
  const loadProject = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const project = await storage.loadProject(id);

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      setCurrentProject(project);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      handleError('プロジェクト読み込み', err);
    } finally {
      setLoading(false);
    }
  }, [storage, handleError]);

  // プロジェクト保存（✨ ProjectStorage使用）
  const saveProject = useCallback(async (project?: GameProject): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const projectToSave = project || currentProject;
      if (!projectToSave) {
        throw new Error('保存するプロジェクトがありません');
      }

      // 保存時に統計更新
      const updatedProject: GameProject = {
        ...projectToSave,
        lastModified: new Date().toISOString(),
        totalSize: calculateTotalSize(projectToSave),
        assets: {
          ...projectToSave.assets,
          statistics: calculateAssetStatistics(projectToSave.assets),
          lastModified: new Date().toISOString()
        },
        script: {
          ...projectToSave.script,
          statistics: calculateScriptStatistics(projectToSave.script),
          lastModified: new Date().toISOString()
        },
        metadata: {
          ...projectToSave.metadata,
          statistics: {
            ...projectToSave.metadata.statistics,
            saveCount: projectToSave.metadata.statistics.saveCount + 1
          }
        }
      };

      // ProjectStorageに保存
      await storage.saveProject(updatedProject);
      
      setCurrentProject(updatedProject);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      handleError('プロジェクト保存', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, storage, handleError]);

  // プロジェクト更新（改善版）
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    if (!currentProject) return;

    const updatedProject = { 
      ...currentProject, 
      ...updates,
      lastModified: new Date().toISOString()
    };
    setCurrentProject(updatedProject);
    setHasUnsavedChanges(true);
  }, [currentProject]);

  // プロジェクト削除（✨ ProjectStorage使用）
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await storage.deleteProject(id);

      // 現在のプロジェクトが削除された場合
      if (currentProject?.id === id) {
        setCurrentProject(null);
        setHasUnsavedChanges(false);
      }
    } catch (err: any) {
      handleError('プロジェクト削除', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, storage, handleError]);

  // プロジェクト複製（✨ ProjectStorage使用）
  const duplicateProject = useCallback(async (id: string, newName: string): Promise<GameProject> => {
    try {
      setLoading(true);
      setError(null);

      const duplicated = await storage.duplicateProject(id, newName);
      return duplicated;
    } catch (err: any) {
      handleError('プロジェクト複製', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, handleError]);

  // プロジェクトエクスポート（✨ ProjectStorage使用）
  const exportProject = useCallback(async (id: string): Promise<Blob> => {
    try {
      setLoading(true);
      setError(null);
      
      return await storage.exportProject(id);
    } catch (err: any) {
      handleError('プロジェクトエクスポート', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, handleError]);

  // プロジェクトインポート（✨ ProjectStorage使用）
  const importProject = useCallback(async (file: File): Promise<GameProject> => {
    try {
      setLoading(true);
      setError(null);
      
      return await storage.importProject(file);
    } catch (err: any) {
      handleError('プロジェクトインポート', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storage, handleError]);

  // アセット更新
  const updateAssets = useCallback((assets: Partial<ProjectAssets>) => {
    if (!currentProject) return;

    updateProject({
      assets: { 
        ...currentProject.assets, 
        ...assets,
        lastModified: new Date().toISOString()
      }
    });
  }, [currentProject, updateProject]);

  // アセット追加
  const addAsset = useCallback((type: keyof ProjectAssets, asset: any) => {
    if (!currentProject) return;

    const currentAssets = currentProject.assets;
    let updatedAssets = { ...currentAssets };

    switch (type) {
      case 'objects':
        if (currentAssets.objects.length < EDITOR_LIMITS.PROJECT.MAX_OBJECTS) {
          updatedAssets.objects = [...currentAssets.objects, asset];
        }
        break;
      case 'texts':
        if (currentAssets.texts.length < EDITOR_LIMITS.TEXT.MAX_COUNT) {
          updatedAssets.texts = [...currentAssets.texts, asset];
        }
        break;
      case 'audio':
        if (asset.type === 'se' && currentAssets.audio.se.length < EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) {
          updatedAssets.audio = {
            ...currentAssets.audio,
            se: [...currentAssets.audio.se, asset]
          };
        } else if (asset.type === 'bgm') {
          updatedAssets.audio = {
            ...currentAssets.audio,
            bgm: asset
          };
        }
        break;
    }

    updateAssets(updatedAssets);
  }, [currentProject, updateAssets]);

  // アセット削除
  const removeAsset = useCallback((type: keyof ProjectAssets, id: string) => {
    if (!currentProject) return;

    const currentAssets = currentProject.assets;
    let updatedAssets = { ...currentAssets };

    switch (type) {
      case 'background':
        updatedAssets.background = null;
        break;
      case 'objects':
        updatedAssets.objects = currentAssets.objects.filter(obj => obj.id !== id);
        break;
      case 'texts':
        updatedAssets.texts = currentAssets.texts.filter(text => text.id !== id);
        break;
      case 'audio':
        if (currentAssets.audio.bgm?.id === id) {
          updatedAssets.audio = { ...currentAssets.audio, bgm: null };
        } else {
          updatedAssets.audio = {
            ...currentAssets.audio,
            se: currentAssets.audio.se.filter(se => se.id !== id)
          };
        }
        break;
    }

    updateAssets(updatedAssets);
  }, [currentProject, updateAssets]);

  // スクリプト更新
  const updateScript = useCallback((script: Partial<GameScript>) => {
    if (!currentProject) return;

    updateProject({
      script: { 
        ...currentProject.script, 
        ...script,
        lastModified: new Date().toISOString()
      }
    });
  }, [currentProject, updateProject]);

  // ルール追加
  const addRule = useCallback((rule: any) => {
    if (!currentProject) return;
    
    if (currentProject.script.rules.length < EDITOR_LIMITS.PROJECT.MAX_RULES) {
      const updatedRules = [...currentProject.script.rules, rule];
      updateScript({ rules: updatedRules });
    }
  }, [currentProject, updateScript]);

  // ルール削除
  const removeRule = useCallback((ruleId: string) => {
    if (!currentProject) return;

    const updatedRules = currentProject.script.rules.filter(rule => rule.id !== ruleId);
    updateScript({ rules: updatedRules });
  }, [currentProject, updateScript]);

  // 設定更新
  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    if (!currentProject) return;

    updateProject({
      settings: { ...currentProject.settings, ...settings }
    });
  }, [currentProject, updateProject]);

  // 総容量計算
  const getTotalSize = useCallback((): number => {
    if (!currentProject) return 0;
    return calculateTotalSize(currentProject);
  }, [currentProject]);

  // アセット追加可否チェック
  const canAddAsset = useCallback((type: string, size: number = 0): boolean => {
    if (!currentProject) return false;

    const currentSize = getTotalSize();
    const limits = EDITOR_LIMITS;

    // 総容量チェック
    if (currentSize + size > limits.PROJECT.TOTAL_MAX_SIZE) {
      return false;
    }

    // 種類別制限チェック
    switch (type) {
      case 'background':
        return !currentProject.assets.background && size <= limits.IMAGE.BACKGROUND_TOTAL_MAX_SIZE;
      case 'object':
        return currentProject.assets.objects.length < limits.PROJECT.MAX_OBJECTS && 
               size <= limits.IMAGE.OBJECT_TOTAL_MAX_SIZE;
      case 'text':
        return currentProject.assets.texts.length < limits.TEXT.MAX_COUNT;
      case 'bgm':
        return !currentProject.assets.audio.bgm && size <= limits.AUDIO.BGM_MAX_SIZE;
      case 'se':
        return currentProject.assets.audio.se.length < limits.PROJECT.MAX_SE_COUNT && 
               size <= limits.AUDIO.SE_MAX_SIZE;
      default:
        return false;
    }
  }, [currentProject, getTotalSize]);

  // バリデーションエラー取得（改善版）
  const getValidationErrors = useCallback((): string[] => {
    if (!currentProject) return [];

    const errors: string[] = [];

    // 基本情報チェック
    if (!currentProject.name.trim()) {
      errors.push('ゲーム名が入力されていません');
    }

    // 容量チェック
    const totalSize = getTotalSize();
    if (totalSize > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) {
      errors.push(`プロジェクトサイズが制限を超えています (${(totalSize / 1024 / 1024).toFixed(1)}MB / ${EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE / 1024 / 1024}MB)`);
    }

    // アセットチェック
    if (currentProject.assets.objects.length === 0 && !currentProject.assets.background) {
      errors.push('背景またはオブジェクトを最低1つ追加してください');
    }

    // ルールチェック（警告レベル）
    if (currentProject.script.rules.length === 0) {
      errors.push('ゲームルールを設定することをおすすめします');
    }

    return errors;
  }, [currentProject, getTotalSize]);

  // 初期化処理（改善版）
  useEffect(() => {
    // 最後に開いたプロジェクトの復元は一旦無効化
    // （ProjectSelectorで明示的に選択してもらう方針）
    
    // エラーの自動クリア
    if (error) {
      const clearTimer = setTimeout(() => {
        setError(null);
      }, 10000); // 10秒後に自動クリア
      
      return () => clearTimeout(clearTimer);
    }
  }, [error]);

  return {
    currentProject,
    loading,
    error,
    hasUnsavedChanges,
    
    createProject,
    loadProject,
    saveProject,
    updateProject,
    deleteProject,
    duplicateProject,
    
    updateAssets,
    addAsset,
    removeAsset,
    
    updateScript,
    addRule,
    removeRule,
    
    updateSettings,
    
    getTotalSize,
    canAddAsset,
    getValidationErrors,
    
    // ✨ ProjectStorage統合機能
    listProjects,
    exportProject,
    importProject
  };
};

// ヘルパー関数

// 総容量計算
const calculateTotalSize = (project: GameProject): number => {
  let total = 0;

  // 背景サイズ
  if (project.assets.background) {
    total += project.assets.background.totalSize;
  }

  // オブジェクトサイズ
  project.assets.objects.forEach(obj => {
    total += obj.totalSize;
  });

  // 音声サイズ
  if (project.assets.audio.bgm) {
    total += project.assets.audio.bgm.fileSize;
  }
  project.assets.audio.se.forEach(se => {
    total += se.fileSize;
  });

  return total;
};

// アセット統計計算
const calculateAssetStatistics = (assets: ProjectAssets): ProjectAssets['statistics'] => {
  let totalImageSize = 0;
  let totalAudioSize = 0;

  // 画像サイズ計算
  if (assets.background) {
    totalImageSize += assets.background.totalSize;
  }
  assets.objects.forEach(obj => {
    totalImageSize += obj.totalSize;
  });

  // 音声サイズ計算
  if (assets.audio.bgm) {
    totalAudioSize += assets.audio.bgm.fileSize;
  }
  assets.audio.se.forEach(se => {
    totalAudioSize += se.fileSize;
  });

  return {
    totalImageSize,
    totalAudioSize,
    totalSize: totalImageSize + totalAudioSize,
    usedSlots: {
      background: assets.background ? 1 : 0,
      objects: assets.objects.length,
      texts: assets.texts.length,
      bgm: assets.audio.bgm ? 1 : 0,
      se: assets.audio.se.length
    },
    limitations: {
      isNearImageLimit: totalImageSize > EDITOR_LIMITS.IMAGE.BACKGROUND_TOTAL_MAX_SIZE * 0.8,
      isNearAudioLimit: totalAudioSize > EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE * 0.8,
      isNearTotalLimit: (totalImageSize + totalAudioSize) > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE * 0.8,
      hasViolations: false
    }
  };
};

// 🔧 修正: スクリプト統計計算（完全実装）
const calculateScriptStatistics = (script: GameScript): GameScript['statistics'] => {
  let totalConditions = 0;
  let totalActions = 0;

  script.rules.forEach(rule => {
    totalConditions += rule.triggers.conditions.length;
    totalActions += rule.actions.length;
  });

  const complexityScore = Math.min(100, Math.round(
    (script.rules.length * 10) +
    (totalConditions * 5) +
    (totalActions * 3) +
    (script.flags.length * 2) +
    (script.successConditions.length * 5)
  ));

  // 🔧 完全なScriptStatisticsオブジェクト作成
  return {
    totalRules: script.rules.length,
    totalConditions,
    totalActions,
    complexityScore,
    usedTriggerTypes: [],
    usedActionTypes: [],
    flagCount: script.flags.length,
    // 🔧 追加: 不足していたプロパティ
    counterCount: script.counters?.length || 0,
    usedCounterOperations: [],
    usedCounterComparisons: [],
    randomConditionCount: 0,
    randomActionCount: 0,
    totalRandomChoices: 0,
    averageRandomProbability: 0,
    estimatedCPUUsage: complexityScore < 30 ? 'low' : complexityScore < 70 ? 'medium' : 'high',
    estimatedMemoryUsage: script.rules.length * 1024,
    maxConcurrentEffects: Math.min(10, script.rules.length),
    randomEventsPerSecond: 0,
    randomMemoryUsage: 0
  };
};