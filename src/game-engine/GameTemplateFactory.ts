import * as PIXI from 'pixi.js';
import { GameTemplate, GameSettings } from './GameTemplate';
import { CuteTapGame, CuteTapSettings } from './CuteTapGame';

// 動的に拡張可能なゲームタイプ（将来1000種類対応）
export type GameType = string;

// 基本ゲームタイプ（最初の20種類）
export type BaseGameType = 
  | 'cute_tap'
  | 'memory_match'
  | 'quick_dodge' 
  | 'timing_perfect'
  | 'collect_items'
  | 'jump_adventure'
  | 'friendly_shoot'
  | 'animal_chase'
  | 'rainbow_match'
  | 'puzzle_princess'
  | 'speed_friend'
  | 'spot_difference'
  | 'opposite_action'
  | 'count_star'
  | 'number_hunt'
  | 'order_master'
  | 'size_perfect'
  | 'dreamy_jump'
  | 'magical_collect'
  | 'balance_game';

// キャラクタータイプ
export type CharacterType = 'girl' | 'animal' | 'child';

// 難易度
export type DifficultyType = 'easy' | 'normal' | 'hard';

// 統一設定インターフェース
export interface UnifiedGameSettings extends GameSettings {
  gameType: GameType;
  characterType: CharacterType;
  difficulty: DifficultyType;
  duration: number;
  targetScore: number;
  customSettings?: Record<string, any>;
}

// テンプレート情報（外部ファイル対応）
export interface TemplateInfo {
  id: GameType;
  name: string;
  description: string;
  instruction: string;
  category: 'action' | 'puzzle' | 'timing' | 'reaction';
  defaultSettings: {
    duration: number;
    targetScore: number;
    difficulty: DifficultyType;
  };
  implementationStatus: 'implemented' | 'fallback' | 'missing';
}

// テンプレート登録情報
interface TemplateRegistration {
  info: TemplateInfo;
  createInstance: (app: PIXI.Application, settings: UnifiedGameSettings) => GameTemplate | null;
}

// テンプレート設定データ型（JSON/外部ファイル用）
interface TemplateConfigData {
  id: string;
  name: string;
  description: string;
  instruction: string;
  category: 'action' | 'puzzle' | 'timing' | 'reaction';
  duration: number;
  targetScore: number;
  difficulty?: DifficultyType;
}

// 拡張可能CuteTapSettings（カスタム表示対応）
interface ExtendedCuteTapSettings extends CuteTapSettings {
  displayName?: string;
  displayInstruction?: string;
}

// ゲームテンプレートファクトリ
export class GameTemplateFactory {
  // テンプレート登録レジストリ
  private static registry = new Map<GameType, TemplateRegistration>();
  
  // 外部設定データキャッシュ
  private static configCache = new Map<string, TemplateConfigData[]>();

  // 初期化フラグ
  private static initialized = false;

  // 遅延初期化
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadTemplateConfigurations();
    this.registerCoreTemplates();
    this.initialized = true;
    
    console.log(`Template Factory initialized: ${this.registry.size} templates registered`);
  }

  // 外部設定ファイルの読み込み（将来的にJSON/CSV対応）
  private static async loadTemplateConfigurations(): Promise<void> {
    // Phase 1: 埋め込み設定データ
    const embeddedConfig: TemplateConfigData[] = [
      {
        id: 'cute_tap',
        name: 'キュートタップ',
        description: 'キャラクターをタップしてスコアを稼ごう！',
        instruction: 'キャラクターをタップして\n魔力を集めよう！',
        category: 'action',
        duration: 10,
        targetScore: 30
      },
      {
        id: 'memory_match',
        name: 'メモリーマッチ',
        description: '同じ絵柄のペアを見つけよう！',
        instruction: 'カードをめくって\n同じ絵柄を見つけて！',
        category: 'puzzle',
        duration: 30,
        targetScore: 8
      },
      {
        id: 'quick_dodge',
        name: 'クイックドッジ',
        description: '落ちてくる障害物を避け続けよう！',
        instruction: 'スワイプで移動して\n障害物を避けて！',
        category: 'action',
        duration: 15,
        targetScore: 10
      },
      {
        id: 'timing_perfect',
        name: 'パーフェクトタイミング',
        description: 'ベストタイミングでタップしよう！',
        instruction: '針がぴったりの位置で\nタップして！',
        category: 'timing',
        duration: 20,
        targetScore: 5
      },
      {
        id: 'collect_items',
        name: 'アイテムコレクト',
        description: 'アイテムを集めて目標を達成！',
        instruction: 'ドラッグしてアイテムを\n集めよう！',
        category: 'action',
        duration: 15,
        targetScore: 20
      },
      {
        id: 'jump_adventure',
        name: 'ジャンプアドベンチャー',
        description: 'ジャンプして穴を避けてゴールへ！',
        instruction: 'タップでジャンプして\n穴を飛び越えて！',
        category: 'action',
        duration: 20,
        targetScore: 1
      },
      {
        id: 'friendly_shoot',
        name: 'フレンドリーシュート',
        description: '愛情弾で敵を友達にしよう！',
        instruction: 'タップして愛情弾で\n敵を友達にして！',
        category: 'action',
        duration: 25,
        targetScore: 10
      },
      {
        id: 'animal_chase',
        name: 'アニマルチェイス',
        description: '動物を優しく追いかけよう！',
        instruction: '線をなぞって動物を\n優しく捕まえて！',
        category: 'action',
        duration: 30,
        targetScore: 5
      },
      {
        id: 'rainbow_match',
        name: 'レインボーマッチ',
        description: '色が変わる瞬間にタップ！',
        instruction: '指定された色になったら\nすぐにタップ！',
        category: 'reaction',
        duration: 15,
        targetScore: 10
      },
      {
        id: 'puzzle_princess',
        name: 'パズルプリンセス',
        description: 'パズルを完成させてお姫様を助けよう！',
        instruction: 'ピースをドラッグして\n美しい絵を完成させて！',
        category: 'puzzle',
        duration: 60,
        targetScore: 1
      },
      {
        id: 'speed_friend',
        name: 'スピードフレンド',
        description: '素早く正答して友達クイズ！',
        instruction: '友達についての問題に\n素早く答えて！',
        category: 'reaction',
        duration: 20,
        targetScore: 10
      },
      {
        id: 'spot_difference',
        name: 'スポットザディファレンス',
        description: '2つの絵の違いを見つけよう！',
        instruction: '2つの絵を比べて\n違いを見つけてタップ！',
        category: 'puzzle',
        duration: 45,
        targetScore: 3
      },
      {
        id: 'opposite_action',
        name: 'オポジットアクション',
        description: '指示と逆の行動をしよう！',
        instruction: '指示と反対のことを\nしてね！',
        category: 'reaction',
        duration: 20,
        targetScore: 10
      },
      {
        id: 'count_star',
        name: 'カウントスター',
        description: '夜空の星を正確に数えよう！',
        instruction: '画面の星の数を数えて\n正しい数をタップ！',
        category: 'puzzle',
        duration: 15,
        targetScore: 5
      },
      {
        id: 'number_hunt',
        name: 'ナンバーハント',
        description: '隠された数字を見つけよう！',
        instruction: '計算して正しい答えを\n見つけてタップ！',
        category: 'puzzle',
        duration: 30,
        targetScore: 5
      },
      {
        id: 'order_master',
        name: 'オーダーマスター',
        description: '正しい順序に並び替えよう！',
        instruction: 'アイテムをドラッグして\n正しい順番に並べて！',
        category: 'puzzle',
        duration: 40,
        targetScore: 3
      },
      {
        id: 'size_perfect',
        name: 'サイズパーフェクト',
        description: '指定サイズでぴったりストップ！',
        instruction: '拡大する円が指定サイズに\nなったらタップ！',
        category: 'timing',
        duration: 25,
        targetScore: 5
      },
      {
        id: 'dreamy_jump',
        name: 'ドリーミージャンプ',
        description: '雲の上をジャンプして夢の世界へ！',
        instruction: '雲から雲へジャンプして\n夢の世界を冒険！',
        category: 'action',
        duration: 30,
        targetScore: 20
      },
      {
        id: 'magical_collect',
        name: 'マジカルコレクト',
        description: '魔法のアイテムを集めよう！',
        instruction: '魔法の素材をドラッグで\n集めて魔法を完成！',
        category: 'action',
        duration: 20,
        targetScore: 15
      },
      {
        id: 'balance_game',
        name: 'バランスゲーム',
        description: 'バランスを保って落とさないで！',
        instruction: 'デバイスを傾けて\nボールを落とさないで！',
        category: 'timing',
        duration: 30,
        targetScore: 1
      }
    ];

    this.configCache.set('embedded', embeddedConfig);

    // Phase 2: 外部ファイル読み込み（将来実装）
    // const externalConfig = await this.loadFromExternalSource('/api/templates');
    // this.configCache.set('external', externalConfig);
  }

  // 外部ファイルからの設定読み込み（将来実装）
  private static async loadFromExternalSource(url: string): Promise<TemplateConfigData[]> {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.warn(`Failed to load external templates from ${url}:`, error);
      return [];
    }
  }

  // コアテンプレート登録
  private static registerCoreTemplates(): void {
    const allConfigs = Array.from(this.configCache.values()).flat();
    
    allConfigs.forEach(config => {
      this.registerTemplateFromConfig(config);
    });
  }

  // 設定からテンプレート登録
  private static registerTemplateFromConfig(config: TemplateConfigData): void {
    const templateInfo: TemplateInfo = {
      id: config.id,
      name: config.name,
      description: config.description,
      instruction: config.instruction,
      category: config.category,
      defaultSettings: {
        duration: config.duration,
        targetScore: config.targetScore,
        difficulty: config.difficulty || 'normal'
      },
      implementationStatus: (config.id === 'cute_tap' || config.id === 'memory_match') ? 'implemented' : 'fallback'
    };

    const createInstance = async (app: PIXI.Application, settings: UnifiedGameSettings): Promise<GameTemplate | null> => {
      if (config.id === 'cute_tap') {
        // 完全実装版
        return new CuteTapGame(app, {
          duration: settings.duration,
          targetScore: settings.targetScore,
          targetTaps: settings.targetScore,
          difficulty: settings.difficulty,
          characterType: settings.characterType
        });
      } else if (config.id === 'memory_match') {
        // Memory Match 完全実装版
        try {
          const { MemoryMatchGame } = await import('./MemoryMatchGame');
          return new MemoryMatchGame(app, {
            duration: settings.duration,
            targetScore: settings.targetScore,
            cardPairs: settings.targetScore || 8,
            difficulty: settings.difficulty,
            characterType: settings.characterType
          });
        } catch (error) {
          console.error('Failed to import MemoryMatchGame:', error);
          return this.createCustomizedFallback(app, settings, config);
        }
      } else {
        // フォールバック版（CuteTapベースで表示カスタマイズ）
        return this.createCustomizedFallback(app, settings, config);
      }
    };

    this.registry.set(config.id, {
      info: templateInfo,
      createInstance
    });
  }

  // カスタマイズされたフォールバック作成
  private static createCustomizedFallback(
    app: PIXI.Application,
    settings: UnifiedGameSettings,
    config: TemplateConfigData
  ): GameTemplate {
    console.warn(`Using customized fallback for ${config.id}`);

    // CuteTapGameをベースにカスタム表示
    const fallbackTemplate = new CuteTapGame(app, {
      duration: settings.duration,
      targetScore: settings.targetScore,
      targetTaps: settings.targetScore,
      difficulty: settings.difficulty,
      characterType: settings.characterType
    });

    // 表示内容をカスタマイズ（CuteTapGameの内部を修正せずに）
    const originalCreateScene = fallbackTemplate.createScene.bind(fallbackTemplate);
    fallbackTemplate.createScene = async function() {
      await originalCreateScene();
      // タイトルと説明をカスタマイズ
      this.customizeDisplayForFallback(config.name, config.instruction);
    };

    return fallbackTemplate;
  }

  // 遅延初期化の確保
  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // メインの作成メソッド
  static async createTemplate(
    gameType: GameType,
    app: PIXI.Application, 
    settings: UnifiedGameSettings
  ): Promise<GameTemplate | null> {
    await this.ensureInitialized();
    
    const registration = this.registry.get(gameType);
    
    if (!registration) {
      console.error(`Template ${gameType} not registered`);
      return null;
    }

    try {
      return await registration.createInstance(app, settings);
    } catch (error) {
      console.error(`Error creating template ${gameType}:`, error);
      // 最終フォールバック
      return this.createEmergencyFallback(app, settings);
    }
  }

  // 緊急時フォールバック（CuteTap固定）
  private static createEmergencyFallback(
    app: PIXI.Application,
    settings: UnifiedGameSettings
  ): GameTemplate {
    console.error('Using emergency fallback - CuteTap');
    
    return new CuteTapGame(app, {
      duration: settings.duration,
      targetScore: settings.targetScore,
      targetTaps: settings.targetScore,
      difficulty: settings.difficulty,
      characterType: settings.characterType
    });
  }

  // 実装済みテンプレートの動的アップグレード
  static async upgradeToImplemented(
    gameType: GameType,
    templateClass: new (app: PIXI.Application, settings: UnifiedGameSettings) => GameTemplate
  ): Promise<boolean> {
    await this.ensureInitialized();
    
    const existing = this.registry.get(gameType);
    if (!existing) {
      console.error(`Template ${gameType} not found for upgrade`);
      return false;
    }

    try {
      // 新しい登録情報で上書き
      this.registry.set(gameType, {
        info: { ...existing.info, implementationStatus: 'implemented' },
        createInstance: (app, settings) => new templateClass(app, settings)
      });
      
      console.log(`Template ${gameType} upgraded to implemented`);
      return true;
    } catch (error) {
      console.error(`Failed to upgrade template ${gameType}:`, error);
      return false;
    }
  }

  // 実装状況確認
  static async checkImplementationStatus(gameType: GameType): Promise<{
    implemented: boolean;
    hasFile: boolean;
    isRegistered: boolean;
    status: 'implemented' | 'fallback' | 'missing';
    error?: string;
  }> {
    await this.ensureInitialized();
    
    const registration = this.registry.get(gameType);
    
    if (!registration) {
      return {
        implemented: false,
        hasFile: false,
        isRegistered: false,
        status: 'missing',
        error: 'テンプレート未登録'
      };
    }

    try {
      const canvas = document.createElement('canvas');
      const dummyApp = new PIXI.Application({
        view: canvas,
        width: 100,
        height: 100,
      });
      
      const testSettings: UnifiedGameSettings = {
        gameType,
        characterType: 'girl',
        difficulty: 'normal',
        duration: 10,
        targetScore: 10
      };
      
      const template = await registration.createInstance(dummyApp, testSettings);
      dummyApp.destroy(true);
      
      if (template) {
        return {
          implemented: registration.info.implementationStatus === 'implemented',
          hasFile: true,
          isRegistered: true,
          status: registration.info.implementationStatus,
          error: undefined
        };
      } else {
        return {
          implemented: false,
          hasFile: false,
          isRegistered: true,
          status: 'missing',
          error: 'インスタンス作成失敗'
        };
      }
      
    } catch (error: any) {
      return {
        implemented: false,
        hasFile: true,
        isRegistered: true,
        status: 'fallback',
        error: `エラー: ${error.message?.slice(0, 50) || 'Unknown'}`
      };
    }
  }

  // 全テンプレート実装状況チェック
  static async checkAllImplementations(): Promise<Record<GameType, Awaited<ReturnType<typeof GameTemplateFactory.checkImplementationStatus>>>> {
    await this.ensureInitialized();
    
    const results: Record<string, any> = {};
    
    for (const [gameType] of this.registry) {
      results[gameType] = await this.checkImplementationStatus(gameType);
    }
    
    return results;
  }

  // テンプレート情報取得
  static async getTemplateInfo(gameType: GameType): Promise<TemplateInfo | null> {
    await this.ensureInitialized();
    const registration = this.registry.get(gameType);
    return registration?.info || null;
  }

  // 全テンプレート情報取得
  static async getAllTemplates(): Promise<TemplateInfo[]> {
    await this.ensureInitialized();
    return Array.from(this.registry.values()).map(reg => reg.info);
  }

  // デバッグ情報
  static async getDebugInfo(): Promise<{
    totalRegistered: number;
    implemented: number;
    fallback: number;
    missing: number;
    implementationRate: string;
  }> {
    const all = await this.getAllTemplates();
    const implemented = all.filter(t => t.implementationStatus === 'implemented').length;
    const fallback = all.filter(t => t.implementationStatus === 'fallback').length;
    const missing = all.filter(t => t.implementationStatus === 'missing').length;
    
    return {
      totalRegistered: all.length,
      implemented,
      fallback,
      missing,
      implementationRate: `${Math.round((implemented / all.length) * 100)}%`
    };
  }
}

// 1000種類対応の大規模拡張API
export class MassTemplateManager {
  // CSVファイルからテンプレート定義を一括読み込み
  static async loadFromCSV(csvContent: string): Promise<number> {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    let loaded = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;

      const config: TemplateConfigData = {
        id: values[0],
        name: values[1],
        description: values[2],
        instruction: values[3],
        category: values[4] as any,
        duration: parseInt(values[5]),
        targetScore: parseInt(values[6])
      };

      await GameTemplateFactory['registerTemplateFromConfig'](config);
      loaded++;
    }

    return loaded;
  }

  // JSONファイルからテンプレート定義を一括読み込み
  static async loadFromJSON(jsonContent: string): Promise<number> {
    try {
      const data = JSON.parse(jsonContent);
      const templates = data.templates || data;
      let loaded = 0;

      for (const template of templates) {
        await GameTemplateFactory['registerTemplateFromConfig'](template);
        loaded++;
      }

      return loaded;
    } catch (error) {
      console.error('Failed to load from JSON:', error);
      return 0;
    }
  }

  // 動的テンプレート作成（AI生成対応）
  static async createDynamicTemplate(
    id: string,
    metadata: Omit<TemplateConfigData, 'id'>,
    generatedCode?: string
  ): Promise<boolean> {
    try {
      const config: TemplateConfigData = { id, ...metadata };
      await GameTemplateFactory['registerTemplateFromConfig'](config);
      
      // 生成コードがある場合は実装テンプレートとして登録
      if (generatedCode) {
        // 動的コード実行（サンドボックス環境推奨）
        const TemplateClass = this.compileTemplateCode(generatedCode);
        if (TemplateClass) {
          await GameTemplateFactory.upgradeToImplemented(id, TemplateClass);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to create dynamic template ${id}:`, error);
      return false;
    }
  }

  // 動的コンパイル（セキュリティ注意）
  private static compileTemplateCode(code: string): any {
    try {
      // 本番環境では適切なサンドボックスを使用
      const TemplateClass = new Function('GameTemplate', 'PIXI', `
        ${code}
        return TemplateClass;
      `)(GameTemplate, PIXI);
      
      return TemplateClass;
    } catch (error) {
      console.error('Code compilation failed:', error);
      return null;
    }
  }

  // 統計情報
  static async getStatistics(): Promise<{
    totalTemplates: number;
    categoriesBreakdown: Record<string, number>;
    implementationProgress: number;
    averageDuration: number;
    popularCategories: string[];
  }> {
    const templates = await GameTemplateFactory.getAllTemplates();
    
    const categoriesBreakdown = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const implemented = templates.filter(t => t.implementationStatus === 'implemented').length;
    const averageDuration = templates.reduce((sum, t) => sum + t.defaultSettings.duration, 0) / templates.length;
    
    const popularCategories = Object.entries(categoriesBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([category]) => category);

    return {
      totalTemplates: templates.length,
      categoriesBreakdown,
      implementationProgress: Math.round((implemented / templates.length) * 100),
      averageDuration: Math.round(averageDuration),
      popularCategories
    };
  }
}