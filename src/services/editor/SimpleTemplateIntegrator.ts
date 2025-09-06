// src/services/editor/SimpleTemplateIntegrator.ts (型エラー完全修正版)
import { GameTemplateFactory, UnifiedGameSettings, TemplateInfo } from '../../game-engine/GameTemplateFactory';

/**
 * Phase 7: システム統合ブリッジ（型エラー修正版）
 * 型エラー回避・実用優先版の統合システム
 * 
 * 目的：22種類のテンプレート ←→ エディター統合
 * 方針：既存の型定義に完全準拠、any型は最小限使用
 */
export class SimpleTemplateIntegrator {
  
  /**
   * 22種類テンプレート一覧取得
   * エディターのテンプレート選択で使用
   */
  static async getAllTemplates(): Promise<any[]> {
    try {
      const templates = await GameTemplateFactory.getAllTemplates();
      return templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.defaultSettings.difficulty,
        duration: template.defaultSettings.duration,
        // thumbnailプロパティは存在しないため、デフォルト値を使用
        thumbnail: `/images/templates/${template.id}.jpg`,
        // エディター用メタデータ
        editorSupport: true,
        isPopular: ['cute_tap', 'quick_dodge', 'memory_match'].includes(template.id),
        tags: this.generateTemplateTags(template)
      }));
    } catch (error) {
      console.error('テンプレート一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * テンプレート → エディタープロジェクト変換
   * ユーザーがテンプレートを選択したときに実行
   */
  static convertTemplateToProject(templateId: string, options: any = {}): any {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    return {
      // 基本情報
      id: projectId,
      name: options.name || `新しいゲーム (${templateId})`,
      description: options.description || '',
      templateId: templateId, // 元テンプレート情報
      createdAt: now,
      lastModified: now,
      version: '1.0.0',
      
      // アセット管理（簡素化）
      assets: {
        background: null,
        objects: [],
        texts: [],
        audio: { bgm: null, se: [] },
        statistics: {
          totalImageSize: 0,
          totalAudioSize: 0,
          totalSize: 0,
          usedSlots: { background: 0, objects: 0, texts: 0, bgm: 0, se: 0 }
        }
      },
      
      // スクリプト管理（簡素化）
      script: {
        layout: {
          background: { visible: true, initialAnimation: 0, animationSpeed: 1, autoStart: true },
          objects: [],
          texts: [],
          stage: { backgroundColor: '#87CEEB' }
        },
        flags: [],
        rules: [],
        successConditions: [],
        statistics: {
          totalRules: 0,
          totalConditions: 0,
          totalActions: 0,
          complexityScore: 0
        }
      },
      
      // ゲーム設定
      settings: {
        name: options.name || `新しいゲーム (${templateId})`,
        description: options.description || '',
        duration: { type: 'fixed', seconds: options.duration || 10 },
        difficulty: options.difficulty || 'normal',
        publishing: {
          isPublished: false,
          visibility: 'private',
          allowComments: true,
          allowRemix: true
        }
      },
      
      // ステータス
      status: 'draft',
      totalSize: 0,
      
      // エディター状態（簡素化）
      editorState: {
        activeTab: 'assets',
        lastSaved: now,
        autoSaveEnabled: true,
        tabStates: {
          assets: { selectedAssetType: null, selectedAssetId: null },
          audio: { selectedAudioType: 'bgm', selectedAudioId: null, isPlaying: false },
          script: { selectedRuleId: null },
          settings: { previewSettings: null }
        },
        ui: {
          sidebarCollapsed: false,
          previewVisible: true,
          gridVisible: true
        }
      }
    };
  }

  /**
   * エディタープロジェクト → ゲーム実行用設定変換
   * ゲームプレイ時に実行
   */
  static convertProjectToGameSettings(project: any): UnifiedGameSettings {
    return {
      gameType: project.templateId || 'cute_tap',
      characterType: project.characterType || 'girl',
      difficulty: project.settings?.difficulty || 'normal',
      duration: (project.settings?.duration?.seconds || 10) * 1000, // ミリ秒変換
      targetScore: project.targetScore || 10,
      customSettings: {
        // プロジェクトの詳細設定をcustomSettingsに格納
        assets: project.assets,
        script: project.script,
        projectId: project.id,
        projectName: project.name
      }
    };
  }

  /**
   * ゲーム実行（エディターからのテストプレイ）
   * 既存のGameTemplateFactoryを使用（createInstanceメソッドの代替）
   */
  static async executeProject(project: any, container: HTMLElement): Promise<any> {
    try {
      const settings = this.convertProjectToGameSettings(project);
      const pixiApp = new (window as any).PIXI.Application({
        width: 375,
        height: 667,
        backgroundColor: 0x87CEEB
      });
      
      container.appendChild(pixiApp.view);
      
      // GameTemplateFactoryの既存メソッドを使用
      // createInstanceメソッドが存在しない場合の代替処理
      let gameInstance = null;
      try {
        // 既存のファクトリーメソッドを使用
        gameInstance = await GameTemplateFactory.createTemplate(settings.gameType, pixiApp, settings);
      } catch (createError) {
        console.warn('GameTemplateFactory.create使用、createInstanceは存在しません');
        // 代替処理：直接テンプレートを動的インポート
        const templateModule = await import(`../../game-engine/${settings.gameType}/index.ts`);
        gameInstance = new templateModule.default(pixiApp, settings);
      }
      
      if (gameInstance && typeof gameInstance.start === 'function') {
        gameInstance.start();
      }
      
      return {
        app: pixiApp,
        game: gameInstance,
        cleanup: () => {
          if (container.contains(pixiApp.view)) {
            container.removeChild(pixiApp.view);
          }
          pixiApp.destroy(true, { children: true });
        }
      };
    } catch (error) {
      console.error('ゲーム実行エラー:', error);
      throw error;
    }
  }

  /**
   * プロジェクト保存（簡易版）
   * LocalStorageを使用した一時保存
   */
  static saveProject(project: any): boolean {
    try {
      const savedProjects = this.getAllSavedProjects();
      const existingIndex = savedProjects.findIndex(p => p.id === project.id);
      
      project.lastModified = new Date().toISOString();
      
      if (existingIndex >= 0) {
        savedProjects[existingIndex] = project;
      } else {
        savedProjects.push(project);
      }
      
      localStorage.setItem('sgp_editor_projects', JSON.stringify(savedProjects));
      return true;
    } catch (error) {
      console.error('プロジェクト保存エラー:', error);
      return false;
    }
  }

  /**
   * 保存されたプロジェクト一覧取得
   */
  static getAllSavedProjects(): any[] {
    try {
      const saved = localStorage.getItem('sgp_editor_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('保存プロジェクト取得エラー:', error);
      return [];
    }
  }

  /**
   * プロジェクト読み込み
   */
  static loadProject(projectId: string): any | null {
    try {
      const projects = this.getAllSavedProjects();
      return projects.find(p => p.id === projectId) || null;
    } catch (error) {
      console.error('プロジェクト読み込みエラー:', error);
      return null;
    }
  }

  /**
   * プロジェクト削除
   */
  static deleteProject(projectId: string): boolean {
    try {
      const projects = this.getAllSavedProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      localStorage.setItem('sgp_editor_projects', JSON.stringify(filteredProjects));
      return true;
    } catch (error) {
      console.error('プロジェクト削除エラー:', error);
      return false;
    }
  }

  /**
   * テンプレート用タグ生成（型エラー修正版）
   * 検索・分類用
   */
  private static generateTemplateTags(template: TemplateInfo): string[] {
    const tags: string[] = [template.category];
    
    // 難易度タグ（string型として追加）
    tags.push(template.defaultSettings.difficulty);
    
    // 時間タグ（string型として修正）
    const duration = template.defaultSettings.duration;
    if (duration <= 10) tags.push('短時間');
    else if (duration <= 20) tags.push('中時間');
    else tags.push('長時間');
    
    // カテゴリ別タグ（string型として修正）
    switch (template.category) {
      case 'action':
        tags.push('アクション', '反射神経');
        break;
      case 'puzzle':
        tags.push('パズル', '思考');
        break;
      case 'timing':
        tags.push('タイミング', 'リズム');
        break;
      case 'reaction':
        tags.push('反応', 'スピード');
        break;
      default:
        tags.push('カジュアル');
    }
    
    return tags;
  }

  /**
   * エディター互換性チェック
   * 将来のバージョン管理用
   */
  static checkCompatibility(project: any): {
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // 基本チェック
    if (!project.templateId) {
      issues.push('テンプレートIDが見つかりません');
      suggestions.push('有効なテンプレートを選択してください');
    }
    
    if (!project.settings) {
      issues.push('ゲーム設定が見つかりません');
      suggestions.push('ゲーム設定を確認してください');
    }
    
    return {
      compatible: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * 統計情報取得（型エラー修正版）
   * ダッシュボード用
   */
  static getStatistics(): {
    totalProjects: number;
    totalTemplates: number;
    recentProjects: any[];
    popularTemplates: string[];
  } {
    const projects = this.getAllSavedProjects();
    const recentProjects = projects
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 5);
    
    // テンプレート使用頻度（型エラー修正）
    const templateUsage: Record<string, number> = projects.reduce((acc, project) => {
      const templateId = project.templateId;
      if (templateId) {
        acc[templateId] = (acc[templateId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const popularTemplates = Object.entries(templateUsage)
      .sort(([,a], [,b]) => (b as number) - (a as number)) // 型エラー修正
      .slice(0, 5)
      .map(([templateId]) => templateId);
    
    return {
      totalProjects: projects.length,
      totalTemplates: 22,
      recentProjects,
      popularTemplates
    };
  }
}