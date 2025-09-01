import { GameTemplateFactory, TemplateInfo } from '../game-engine/GameTemplateFactory';
import { GameConfig } from '../components/GameSelector';

/**
 * RandomGameManager - 全20テンプレート完全活用・ランダム選択システム
 * 
 * 主要機能:
 * - 20テンプレート動的読み込み
 * - 重複回避ランダム選択
 * - プレイ履歴管理
 * - 将来のテンプレート追加・削除対応
 */
export class RandomGameManager {
  private static instance: RandomGameManager;
  private allTemplates: TemplateInfo[] = [];
  private playHistory: string[] = [];
  private readonly maxHistorySize = 7; // 直近7ゲームの重複回避
  private readonly characterTypes: ('girl' | 'animal' | 'child')[] = ['girl', 'animal', 'child'];
  private readonly creators = ['あいうえお', 'ねこすき', 'たのしい', 'はやい', 'どうぶつ', 'まほう', 'げーまー'];

  private constructor() {}

  /**
   * シングルトンパターンでインスタンス取得
   */
  public static getInstance(): RandomGameManager {
    if (!RandomGameManager.instance) {
      RandomGameManager.instance = new RandomGameManager();
    }
    return RandomGameManager.instance;
  }

  /**
   * 全テンプレート動的読み込み（初期化）
   */
  public async loadAllTemplates(): Promise<TemplateInfo[]> {
    try {
      console.log('RandomGameManager: 全テンプレート読み込み開始...');
      this.allTemplates = await GameTemplateFactory.getAllTemplates();
      
      if (!this.allTemplates || this.allTemplates.length === 0) {
        throw new Error('テンプレートが見つかりません');
      }
      
      console.log(`RandomGameManager: ${this.allTemplates.length}個のテンプレート読み込み完了`);
      return this.allTemplates;
    } catch (error) {
      console.error('RandomGameManager: テンプレート読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * 重複回避ランダム選択でゲーム設定生成
   */
  public getNextRandomGame(): GameConfig {
    if (this.allTemplates.length === 0) {
      throw new Error('テンプレートが読み込まれていません。loadAllTemplates()を先に実行してください。');
    }

    // 重複回避候補の選定
    const availableTemplates = this.getAvailableTemplates();
    
    if (availableTemplates.length === 0) {
      // 全テンプレートが最近プレイされている場合、履歴をリセット
      console.log('RandomGameManager: 履歴リセット（全テンプレートが最近プレイ済み）');
      this.playHistory = [];
      return this.getNextRandomGame(); // 再帰的に再実行
    }

    // ランダム選択
    const selectedTemplate = this.selectRandomTemplate(availableTemplates);
    
    // 履歴に追加
    this.addToHistory(selectedTemplate.id);
    
    // GameConfig生成
    const gameConfig = this.generateGameConfig(selectedTemplate);
    
    console.log(`RandomGameManager: 選択されたゲーム - ${selectedTemplate.name} (${selectedTemplate.id})`);
    return gameConfig;
  }

  /**
   * 重複回避候補テンプレート取得
   */
  private getAvailableTemplates(): TemplateInfo[] {
    return this.allTemplates.filter(template => 
      !this.isRecentlyPlayed(template.id)
    );
  }

  /**
   * 重み付きランダム選択
   * 新しいテンプレートや久しぶりのテンプレートを優先
   */
  private selectRandomTemplate(availableTemplates: TemplateInfo[]): TemplateInfo {
    // シンプルなランダム選択（Phase 5では基本実装）
    const randomIndex = Math.floor(Math.random() * availableTemplates.length);
    return availableTemplates[randomIndex];
  }

  /**
   * GameConfig生成（キャラクタータイプ・作者名ランダム化）
   */
  private generateGameConfig(template: TemplateInfo): GameConfig {
    const characterType = this.getRandomCharacterType();
    const creator = this.getRandomCreator();
    
    return {
      gameType: template.id as any,
      characterType,
      difficulty: template.defaultSettings.difficulty,
      duration: template.defaultSettings.duration,
      targetScore: template.defaultSettings.targetScore,
      // 将来的にランダム化可能な要素
      // theme: this.getRandomTheme(),
      // customSettings: this.generateRandomSettings(template)
    };
  }

  /**
   * ランダムキャラクタータイプ選択
   */
  private getRandomCharacterType(): 'girl' | 'animal' | 'child' {
    const randomIndex = Math.floor(Math.random() * this.characterTypes.length);
    return this.characterTypes[randomIndex];
  }

  /**
   * ランダム作者名選択
   */
  private getRandomCreator(): string {
    const randomIndex = Math.floor(Math.random() * this.creators.length);
    return this.creators[randomIndex];
  }

  /**
   * プレイ履歴追加
   */
  public addToHistory(gameId: string): void {
    this.playHistory.push(gameId);
    
    // 履歴サイズ制限
    if (this.playHistory.length > this.maxHistorySize) {
      this.playHistory = this.playHistory.slice(-this.maxHistorySize);
    }
    
    console.log(`RandomGameManager: 履歴追加 ${gameId}, 現在の履歴: [${this.playHistory.join(', ')}]`);
  }

  /**
   * 最近プレイ済みチェック
   */
  public isRecentlyPlayed(gameId: string): boolean {
    return this.playHistory.includes(gameId);
  }

  /**
   * 状態情報取得（デバッグ用）
   */
  public getStatus(): {
    totalTemplates: number;
    playHistory: string[];
    availableTemplates: number;
  } {
    const availableTemplates = this.getAvailableTemplates();
    
    return {
      totalTemplates: this.allTemplates.length,
      playHistory: [...this.playHistory],
      availableTemplates: availableTemplates.length
    };
  }

  /**
   * 履歴リセット（必要に応じて）
   */
  public resetHistory(): void {
    this.playHistory = [];
    console.log('RandomGameManager: プレイ履歴リセット');
  }

  /**
   * テンプレート再読み込み（将来の動的追加・削除対応）
   */
  public async reloadTemplates(): Promise<void> {
    await this.loadAllTemplates();
    console.log('RandomGameManager: テンプレート再読み込み完了');
  }
}

export default RandomGameManager;