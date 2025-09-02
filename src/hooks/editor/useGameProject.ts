import { useState, useCallback, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { ProjectAssets } from '../../types/editor/ProjectAssets';
import { GameScript } from '../../types/editor/GameScript';
import { GameSettings } from '../../types/editor/GameSettings';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';

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
}

// デフォルトプロジェクト作成
const createDefaultProject = (name: string): GameProject => {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0.0',
    creator: { isAnonymous: true },
    status: 'draft',
    totalSize: 0,
    
    assets: {
      background: null,
      objects: [],
      texts: [],
      audio: { bgm: null, se: [] },
      statistics: {
        totalImageSize: 0,
        totalAudioSize: 0,
        usedSlots: { objects: 0, texts: 0, sounds: 0 }
      }
    },
    
    script: {
      layout: {
        background: { visible: false, initialAnimation: 0, animationSpeed: 10, autoStart: false },
        objects: [],
        texts: [],
        stage: { backgroundColor: '#ffffff' }
      },
      flags: [],
      rules: [],
      successConditions: [],
      statistics: { totalRules: 0, totalConditions: 0, totalActions: 0, complexityScore: 0 }
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
      export: { includeSourceData: true, compressionLevel: 'medium' }
    },
    
    editorState: {
      activeTab: 'assets',
      lastSaved: new Date().toISOString(),
      autoSaveEnabled: true
    }
  };
};

// ローカルストレージキー
const STORAGE_KEYS = {
  PROJECTS: 'editor_projects',
  CURRENT_PROJECT_ID: 'editor_current_project_id',
  AUTO_SAVE_ENABLED: 'editor_auto_save_enabled'
} as const;

export const useGameProject = (): UseGameProjectReturn => {
  const [currentProject, setCurrentProject] = useState<GameProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // エラーハンドリングヘルパー
  const handleError = useCallback((operation: string, err: any) => {
    console.error(`${operation} failed:`, err);
    setError(`${operation}に失敗しました: ${err.message}`);
    setLoading(false);
  }, []);

  // ローカルストレージからプロジェクト一覧取得
  const getStoredProjects = useCallback((): GameProject[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load projects from storage:', error);
      return [];
    }
  }, []);

  // ローカルストレージにプロジェクト一覧保存
  const saveStoredProjects = useCallback((projects: GameProject[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects to storage:', error);
    }
  }, []);

  // プロジェクト作成
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
        // テンプレートベースの初期化
        console.log('Template application for:', template);
      }

      // プロジェクト一覧に追加
      const projects = getStoredProjects();
      const updatedProjects = [newProject, ...projects];
      saveStoredProjects(updatedProjects);

      // 現在のプロジェクトとして設定
      setCurrentProject(newProject);
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, newProject.id);
      setHasUnsavedChanges(false);

      return newProject;
    } catch (err: any) {
      handleError('プロジェクト作成', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getStoredProjects, saveStoredProjects, handleError]);

  // プロジェクト読み込み
  const loadProject = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const projects = getStoredProjects();
      const project = projects.find(p => p.id === id);

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      setCurrentProject(project);
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, id);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      handleError('プロジェクト読み込み', err);
    } finally {
      setLoading(false);
    }
  }, [getStoredProjects, handleError]);

  // プロジェクト保存
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
          statistics: calculateAssetStatistics(projectToSave.assets)
        },
        script: {
          ...projectToSave.script,
          statistics: calculateScriptStatistics(projectToSave.script)
        }
      };

      // プロジェクト一覧を更新
      const projects = getStoredProjects();
      const projectIndex = projects.findIndex(p => p.id === updatedProject.id);
      
      if (projectIndex >= 0) {
        projects[projectIndex] = updatedProject;
      } else {
        projects.unshift(updatedProject);
      }
      
      saveStoredProjects(projects);
      setCurrentProject(updatedProject);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      handleError('プロジェクト保存', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, getStoredProjects, saveStoredProjects, handleError]);

  // プロジェクト更新
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    if (!currentProject) return;

    const updatedProject = { ...currentProject, ...updates };
    setCurrentProject(updatedProject);
    setHasUnsavedChanges(true);
  }, [currentProject]);

  // プロジェクト削除
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const projects = getStoredProjects();
      const filteredProjects = projects.filter(p => p.id !== id);
      saveStoredProjects(filteredProjects);

      // 現在のプロジェクトが削除された場合
      if (currentProject?.id === id) {
        setCurrentProject(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
        setHasUnsavedChanges(false);
      }
    } catch (err: any) {
      handleError('プロジェクト削除', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, getStoredProjects, saveStoredProjects, handleError]);

  // プロジェクト複製
  const duplicateProject = useCallback(async (id: string, newName: string): Promise<GameProject> => {
    try {
      setLoading(true);
      setError(null);

      const projects = getStoredProjects();
      const originalProject = projects.find(p => p.id === id);

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
        }
      };

      const updatedProjects = [duplicatedProject, ...projects];
      saveStoredProjects(updatedProjects);

      return duplicatedProject;
    } catch (err: any) {
      handleError('プロジェクト複製', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getStoredProjects, saveStoredProjects, handleError]);

  // アセット更新
  const updateAssets = useCallback((assets: Partial<ProjectAssets>) => {
    if (!currentProject) return;

    updateProject({
      assets: { ...currentProject.assets, ...assets }
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
      script: { ...currentProject.script, ...script }
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

  // バリデーションエラー取得
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

    // ルールチェック
    if (currentProject.script.rules.length === 0) {
      errors.push('ゲームルールを最低1つ設定してください');
    }

    // 成功条件チェック
    if (currentProject.script.successConditions.length === 0) {
      errors.push('成功条件を設定してください');
    }

    return errors;
  }, [currentProject, getTotalSize]);

  // 初期化時に前回のプロジェクトを復元
  useEffect(() => {
    const lastProjectId = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    if (lastProjectId) {
      loadProject(lastProjectId).catch(() => {
        // 読み込みに失敗した場合は無視
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
      });
    }
  }, [loadProject]);

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
    getValidationErrors
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
    usedSlots: {
      objects: assets.objects.length,
      texts: assets.texts.length,
      sounds: assets.audio.se.length + (assets.audio.bgm ? 1 : 0)
    }
  };
};

// スクリプト統計計算
const calculateScriptStatistics = (script: GameScript): GameScript['statistics'] => {
  let totalConditions = 0;
  let totalActions = 0;

  script.rules.forEach(rule => {
    totalConditions += rule.triggers.conditions.length;
    totalActions += rule.actions.length;
  });

  // 複雑度スコア計算（0-100）
  const complexityScore = Math.min(100, Math.round(
    (script.rules.length * 10) +
    (totalConditions * 5) +
    (totalActions * 3) +
    (script.flags.length * 2) +
    (script.successConditions.length * 5)
  ));

  return {
    totalRules: script.rules.length,
    totalConditions,
    totalActions,
    complexityScore
  };
};