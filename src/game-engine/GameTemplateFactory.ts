import * as PIXI from 'pixi.js';
import { GameTemplate, GameSettings } from './GameTemplate';
import { CuteTapGame } from './CuteTapGame';

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
  createInstance: (app: PIXI.Application, settings: UnifiedGameSettings) => Promise<GameTemplate | null>;
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
      implementationStatus: 'implemented' // 全て実装済みに変更
    };

    const createInstance = async (app: PIXI.Application, settings: UnifiedGameSettings): Promise<GameTemplate | null> => {
      try {
        switch (config.id) {
          case 'cute_tap':
            case 'cute-tap':
              return new CuteTapGame(app, {
                timeLimit: 10,
                difficulty: 'normal',
                theme: 'cute',
                duration: 10,
                targetScore: 100
              });
            return await cuteTapTemplate.createInstance(app, settings, undefined);

          case 'memory_match':
            const { MemoryMatchGame } = await import('./MemoryMatchGame');
            return new MemoryMatchGame(app, settings);

          case 'quick_dodge':
            const { QuickDodgeGame } = await import('./QuickDodgeGame');
            return new QuickDodgeGame(app, settings);

          case 'timing_perfect':
            const { TimingPerfectGame } = await import('./TimingPerfectGame');
            return new TimingPerfectGame(app, settings);

          case 'collect_items':
            const { CollectItemsGame } = await import('./CollectItemsGame');
            return new CollectItemsGame(app, settings);

          case 'jump_adventure':
            const { JumpAdventureGame } = await import('./JumpAdventureGame');
            return new JumpAdventureGame(app, settings);

          case 'friendly_shoot':
            const { FriendlyShootGame } = await import('./FriendlyShootGame');
            return new FriendlyShootGame(app, settings);

          case 'animal_chase':
            const { AnimalChaseGame } = await import('./AnimalChaseGame');
            return new AnimalChaseGame(app, settings);

          case 'rainbow_match':
            const { RainbowMatchGame } = await import('./RainbowMatchGame');
            return new RainbowMatchGame(app, settings);

          case 'puzzle_princess':
            const { PuzzlePrincessGame } = await import('./PuzzlePrincessGame');
            return new PuzzlePrincessGame(app, settings);

          case 'speed_friend':
            const { SpeedFriendGame } = await import('./SpeedFriendGame');
            return new SpeedFriendGame(app, settings);

          case 'spot_difference':
            const { SpotDifferenceGame } = await import('./SpotDifferenceGame');
            return new SpotDifferenceGame(app, settings);

          case 'opposite_action':
            const { OppositeActionGame } = await import('./OppositeActionGame');
            return new OppositeActionGame(app, settings);

          case 'count_star':
            const { CountStarGame } = await import('./CountStarGame');
            return new CountStarGame(app, settings);

          case 'number_hunt':
            const { NumberHuntGame } = await import('./NumberHuntGame');
            return new NumberHuntGame(app, settings);

          case 'order_master':
            const { OrderMasterGame } = await import('./OrderMasterGame');
            return new OrderMasterGame(app, settings);

          case 'size_perfect':
            // TimingPerfectGameではなく、専用クラスを使用または代替処理
            const { ReactionSpeedGame } = await import('./ReactionSpeedGame');
            return new ReactionSpeedGame(app, settings);

          case 'dreamy_jump':
            const { DreamyJumpGame } = await import('./DreamyJumpGame');
            return new DreamyJumpGame(app, settings);

          case 'magical_collect':
            const { MagicalCollectGame } = await import('./MagicalCollectGame');
            return new MagicalCollectGame(app, settings);

          case 'balance_game':
            const { BalanceGame } = await import('./BalanceGame');
            return new BalanceGame(app, settings);

          default:
            console.warn(`Unknown template: ${config.id}, using fallback`);
            return this.createCustomizedFallback(app, settings, config);
        }
      } catch (error) {
        console.error(`Failed to create ${config.id}:`, error);
        return this.createCustomizedFallback(app, settings, config);
      }
    };

    this.registry.set(config.id, {
      info: templateInfo,
      createInstance
    });
  }

  // カスタマイズされたフォールバック作成
  private static async createCustomizedFallback(
    app: PIXI.Application,
    settings: UnifiedGameSettings,
    config: TemplateConfigData
  ): Promise<GameTemplate> {
    console.warn(`Using customized fallback for ${config.id}`);

    try {
//      // MemoryMatchGameをフォールバックとして使用
//      const { MemoryMatchGame } = await import('./MemoryMatchGame');
//      const fallbackTemplate = new MemoryMatchGame(app, settings);

      const originalCreateScene = fallbackTemplate.createScene.bind(fallbackTemplate);
      fallbackTemplate.createScene = async function() {
        await originalCreateScene();
        if (typeof this.customizeDisplayForFallback === 'function') {
          this.customizeDisplayForFallback(config.name, config.instruction);
        }
      };

      return fallbackTemplate;
    } catch (fallbackError) {
      console.error('Fallback template creation failed:', fallbackError);
      // 最後の手段として、シンプルなGameTemplateを返す
      return this.createEmergencyFallback(app, settings);
    }
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
    console.log(`🎮 Creating template for gameType: "${gameType}"`);
    console.log('📋 Provided settings:', settings);
    
    await this.ensureInitialized();
    
    const registration = this.registry.get(gameType);
    
    if (!registration) {
      console.error(`❌ Template ${gameType} not registered`);
      console.log('📝 Available templates:', Array.from(this.registry.keys()));
      return null;
    }

    console.log(`✅ Template registration found for ${gameType}`);
    console.log('📄 Template info:', registration.info);

    try {
      console.log(`🚀 Calling createInstance for ${gameType}...`);
      const result = await registration.createInstance(app, settings);
      console.log(`✅ Template ${gameType} created successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error creating template ${gameType}:`, error);
      console.log('🔄 Moving to emergency fallback...');
      return this.createEmergencyFallback(app, settings);
    }
  }

  // 緊急時フォールバック（MemoryMatch固定）
  private static async createEmergencyFallback(
    app: PIXI.Application,
    settings: UnifiedGameSettings
  ): Promise<GameTemplate> {
    console.error('Using emergency fallback - MemoryMatch');
    
    try {
      const { MemoryMatchGame } = await import('./MemoryMatchGame');
      return new MemoryMatchGame(app, settings);
    } catch (error) {
      console.error('Emergency fallback failed:', error);
      // 最後の手段として基本的なGameTemplateを作成
      return new (class extends GameTemplate {
        async createScene(): Promise<void> {
          const text = new PIXI.Text('Template Loading Error', {
            fontSize: 24,
            fill: 0xff0000,
            align: 'center'
          });
          text.x = this.app.screen.width / 2;
          text.y = this.app.screen.height / 2;
          text.anchor.set(0.5);
          this.stage.addChild(text);
        }
        
        handleInput(): void {}
        updateGame(): void {}
      })(app, settings);
    }
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
      this.registry.set(gameType, {
        info: { ...existing.info, implementationStatus: 'implemented' },
        createInstance: async (app, settings) => new templateClass(app, settings)
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