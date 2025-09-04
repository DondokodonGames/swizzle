// src/services/editor/TemplateIntegrator.ts
import { GameProject } from '../../types/editor/GameProject';
import { GameTemplateFactory, UnifiedGameSettings, TemplateInfo } from '../../game-engine/GameTemplateFactory';

/**
 * エディター ←→ ゲームテンプレート統合システム（完全修正版）
 */
export class TemplateIntegrator {
  // GameProjectからUnifiedGameSettingsに変換
  static projectToGameSettings(project: GameProject): UnifiedGameSettings {
    return {
      gameType: (project as any).templateId || 'cute_tap',
      characterType: 'girl',
      difficulty: project.settings.difficulty,
      duration: project.settings.duration.seconds || 10,
      targetScore: 10,
      customSettings: {
        assets: project.assets,
        script: project.script
      }
    };
  }

  // 有効な時間オプションに変換
  private static getValidDuration(duration: number): 5 | 10 | 15 | 20 | 30 {
    if (duration <= 5) return 5;
    if (duration <= 10) return 10;
    if (duration <= 15) return 15;
    if (duration <= 20) return 20;
    return 30;
  }

  // テンプレート情報からGameProjectに変換
  static async templateInfoToProject(templateInfo: TemplateInfo): Promise<GameProject> {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const project: GameProject = {
      // 基本情報
      id: projectId,
      name: templateInfo.name,
      description: templateInfo.description || '',
      createdAt: now,
      lastModified: now,
      version: '1.0.0',
      thumbnailDataUrl: undefined,
      
      // アセット管理
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
        lastModified: now
      },
      
      // スクリプト管理
      script: {
        layout: {
          background: {
            visible: true,
            initialAnimation: 0,
            animationSpeed: 1,
            autoStart: true
          },
          objects: [],
          texts: [],
          stage: {
            backgroundColor: '#87CEEB'
          }
        },
        flags: [],
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
          estimatedCPUUsage: 'low' as const,
          memoryFootprint: 0,
          performanceScore: 100
        },
        version: '1.0.0',
        lastModified: now
      },
      
      // ゲーム設定
      settings: {
        name: templateInfo.name,
        description: templateInfo.description || '',
        duration: {
          type: 'fixed',
          seconds: this.getValidDuration(templateInfo.defaultSettings.duration)
        },
        difficulty: templateInfo.defaultSettings.difficulty,
        publishing: {
          isPublished: false,
          publishedAt: undefined,
          visibility: 'private',
          allowComments: true,
          allowRemix: true,
          tags: [],
          category: templateInfo.category
        },
        preview: {
          thumbnailDataUrl: undefined,
          previewGif: undefined
        },
        export: {
          includeSourceData: true,
          compressionLevel: 'medium',
          format: 'json'
        }
      },
      
      // ステータス・メタデータ
      status: 'draft',
      totalSize: 0,
      
      // エディター状態（手動定義）
      editorState: {
        activeTab: 'assets' as const,
        lastSaved: now,
        autoSaveEnabled: true,
        tabStates: {
          assets: {
            selectedAssetType: null,
            selectedAssetId: null,
            showAnimationEditor: false
          },
          audio: {
            selectedAudioType: 'bgm' as const,
            selectedAudioId: null,
            previewPlaying: false
          },
          script: {
            selectedRuleId: null,
            previewMode: false,
            showAdvancedEditor: false
          },
          settings: {
            showAdvanced: false,
            previewSettings: null
          }
        },
        ui: {
          sidebarCollapsed: false,
          previewPanelVisible: true,
          zoom: 1.0,
          gridVisible: true,
          showHints: true
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
          totalOpenCount: 1,
          averageSessionTime: 0
        },
        templateType: templateInfo.id,
        templateVersion: '1.0.0',
        createdWith: 'SGP-Editor-v1.0',
        platform: 'web',
        compatibility: {
          minEditorVersion: '1.0.0',
          supportedPlatforms: ['web', 'mobile']
        },
        tags: [],
        language: 'ja'
      },
      
      // バージョン履歴
      versionHistory: [{
        id: `version_${Date.now()}`,
        version: '1.0.0',
        createdAt: now,
        description: 'プロジェクト作成',
        author: 'system',
        changes: [{
          type: 'added',
          category: 'assets',
          description: 'プロジェクト初期化',
          affectedItems: []
        }],
        size: 0
      }],
      
      // プロジェクト設定
      projectSettings: {
        autoSaveInterval: 30000,
        backupEnabled: true,
        compressionEnabled: true,
        maxVersionHistory: 10
      }
    };
    
    return project;
  }

  // 全テンプレートからプロジェクト候補を作成
  static async getAllProjectTemplates(): Promise<GameProject[]> {
    const templates = await GameTemplateFactory.getAllTemplates();
    const projects = await Promise.all(
      templates.map(template => this.templateInfoToProject(template))
    );
    return projects;
  }

  // テンプレート情報のみ取得（軽量版）
  static async getAllTemplateInfos(): Promise<TemplateInfo[]> {
    return await GameTemplateFactory.getAllTemplates();
  }
}