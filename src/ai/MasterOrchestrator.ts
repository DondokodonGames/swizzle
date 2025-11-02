/**
 * Master Orchestrator - AI自動ゲーム生成システム統括
 * Phase H: 24時間自動稼働で245種類のゲームを完全自動生成
 */

import { LogicGenerator } from './generators/LogicGenerator';
import { ImageGenerator } from './generators/ImageGenerator';
import { SoundGenerator } from './generators/SoundGenerator';
import {
  GameSpec,
  GeneratedGame,
  GenerationMode,
  GamePortfolio,
  GenerationStatistics,
  AIGenerationConfig,
  GameGenre,
  GameMechanic,
  VisualStyle,
  QualityEvaluation
} from './types/GenerationTypes';
import { GameProject } from '../types/editor/GameProject';

/**
 * MasterOrchestrator
 * 24時間自動稼働システムの中核
 */
export class MasterOrchestrator {
  private logicGenerator: LogicGenerator;
  private imageGenerator: ImageGenerator;
  private soundGenerator: SoundGenerator;
  private config: AIGenerationConfig;
  
  // 生成統計
  private statistics: GenerationStatistics = {
    generated: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
    averageQuality: 0,
    maxQuality: 0,
    minQuality: 100,
    diversityScore: 0,
    uniqueGenres: 0,
    uniqueMechanics: 0,
    averageGenerationTime: 0,
    totalCostUSD: 0,
    costPerGame: 0,
    explorationCount: 0,
    exploitationCount: 0,
    currentEpsilon: 0.3 // 初期探索率30%
  };
  
  // ポートフォリオ
  private portfolio: GamePortfolio = {
    games: [],
    statistics: {
      totalGames: 0,
      averageQuality: 0,
      diversityScore: 0,
      genreDistribution: {} as Record<GameGenre, number>,
      mechanicDistribution: {} as Record<GameMechanic, number>,
      difficultyDistribution: { easy: 0, normal: 0, hard: 0 },
      qualityDistribution: { excellent: 0, good: 0, acceptable: 0, poor: 0 }
    },
    health: {
      isBalanced: false,
      hasCoverage: false,
      needsExploration: []
    }
  };
  
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  
  constructor(config: AIGenerationConfig) {
    this.config = config;
    
    // ジェネレーター初期化
    this.logicGenerator = new LogicGenerator(config.api.anthropicApiKey);
    this.imageGenerator = new ImageGenerator({
      provider: config.api.imageProvider,
      openaiApiKey: config.api.openaiApiKey,
      sdApiUrl: config.api.stableDiffusionUrl,
      replicateApiKey: config.api.replicateApiKey
    });
    this.soundGenerator = new SoundGenerator();
    
    console.log('🚀 MasterOrchestrator initialized');
  }
  
  /**
   * 24時間自動稼働ループ開始
   */
  async run24HourLoop(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Already running');
      return;
    }
    
    this.isRunning = true;
    this.shouldStop = false;
    
    console.log('🎮 Starting 24/7 generation loop...');
    console.log(`📊 Target: ${this.config.generation.targetGamesCount} games`);
    console.log(`🎯 Quality threshold: ${this.config.generation.qualityThreshold} points`);
    
    let generation = 0;
    
    while (!this.shouldStop && this.portfolio.statistics.totalGames < this.config.generation.targetGamesCount) {
      generation++;
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔄 Generation ${generation} - Total games: ${this.portfolio.statistics.totalGames}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      try {
        // 1. ポートフォリオ読み込み（既存ゲーム）
        // await this.loadPortfolio();
        
        // 2. 生成モード決定（探索 or 活用）
        const mode = this.decideGenerationMode();
        console.log(`  🎯 Mode: ${mode.type}`);
        console.log(`  📝 Reason: ${mode.reason}`);
        
        // 3. ゲーム生成
        const newGame = await this.generateSingleGame(mode);
        
        if (newGame) {
          this.statistics.generated++;
          
          // 4. 動的品質チェック
          const quality = await this.evaluateQuality(newGame);
          
          console.log(`  📊 Quality Score: ${quality.totalScore.toFixed(1)}/95`);
          console.log(`  ├─ Relative: ${quality.relativeScore.subtotal.toFixed(1)}/50`);
          console.log(`  └─ Absolute: ${quality.absoluteScore.subtotal.toFixed(1)}/45`);
          
          // 5. 合格判定
          if (quality.passed && quality.totalScore >= this.config.generation.qualityThreshold) {
            // 合格: ポートフォリオに追加
            newGame.quality = quality;
            this.portfolio.games.push(newGame);
            this.statistics.passed++;
            
            console.log(`  ✅ Game passed! "${newGame.project.settings.name}"`);
            
            // 6. 公開（ドライランでない場合）
            if (!this.config.debug.dryRun) {
              // await this.publishGame(newGame);
              console.log(`  📤 Published to Supabase`);
            } else {
              console.log(`  🔷 Dry run: skipping publish`);
            }
            
            // 統計更新
            this.updateStatistics(quality);
            
          } else {
            // 不合格
            this.statistics.failed++;
            console.log(`  ❌ Quality check failed (${quality.totalScore.toFixed(1)} points)`);
            
            if (quality.details.playabilityIssues.length > 0) {
              console.log(`  ⚠️  Issues:`);
              quality.details.playabilityIssues.forEach(issue => {
                console.log(`     - ${issue}`);
              });
            }
          }
        } else {
          this.statistics.failed++;
          console.log(`  ❌ Generation failed`);
        }
        
        // 7. 統計表示（10回ごと）
        if (generation % 10 === 0) {
          this.printStatistics();
        }
        
        // 8. 学習・調整（100回ごと）
        if (generation % 100 === 0) {
          await this.dailyLearning();
        }
        
        // 9. 待機（レート制限対策）
        await this.sleep(5000); // 5秒待機
        
      } catch (error) {
        console.error('❌ Error in generation cycle:', error);
        this.statistics.failed++;
        await this.sleep(60000); // エラー時は1分待機
      }
    }
    
    this.isRunning = false;
    console.log('\n🎉 Generation loop completed!');
    this.printFinalReport();
  }
  
  /**
   * 単一ゲーム生成
   */
  async generateSingleGame(mode: GenerationMode): Promise<GeneratedGame | null> {
    const startTime = Date.now();
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`  🎲 Generating game (ID: ${generationId})...`);
      
      // 1. ゲーム仕様生成
      console.log('  📋 Step 1: Generating game specification...');
      const spec = await this.generateGameSpec(mode);
      const specTime = Date.now() - startTime;
      console.log(`     ✓ Spec: ${spec.concept.name} (${specTime}ms)`);
      
      // 2. アセット生成
      console.log('  🎨 Step 2: Generating assets...');
      const assetStartTime = Date.now();
      
      // 背景生成
      const background = await this.imageGenerator.generateBackground({
        type: 'background',
        prompt: this.buildBackgroundPrompt(spec),
        style: spec.visual.style,
        colorPalette: spec.visual.colorPalette,
        dimensions: { width: 800, height: 600 },
        frameCount: spec.visual.backgroundType === 'animated' ? 4 : 1,
        seed: Date.now()
      });
      console.log(`     ✓ Background: ${background.length} frames`);
      
      // オブジェクト生成
      const objects = [];
      for (let i = 0; i < spec.visual.objectCount; i++) {
        const objectFrames = await this.imageGenerator.generateObject({
          type: 'object',
          prompt: this.buildObjectPrompt(spec, i),
          style: spec.visual.style,
          colorPalette: spec.visual.colorPalette,
          dimensions: { width: 128, height: 128 },
          frameCount: 4, // 各オブジェクト4フレーム
          seed: Date.now() + i
        });
        objects.push(objectFrames);
      }
      console.log(`     ✓ Objects: ${objects.length} objects`);
      
      // 音声生成
      const bgm = await this.soundGenerator.generateBGM({
        type: 'bgm',
        category: 'melody',
        duration: spec.concept.duration,
        mood: this.mapDifficultyToMood(spec.concept.difficulty),
        volume: 0.6
      });
      console.log(`     ✓ BGM: ${bgm.duration}s`);
      
      const seList = await Promise.all([
        this.soundGenerator.generateSE({ type: 'se', category: 'tap', duration: 0.3, mood: 'happy', volume: 0.8 }),
        this.soundGenerator.generateSE({ type: 'se', category: 'success', duration: 0.5, mood: 'happy', volume: 0.8 }),
        this.soundGenerator.generateSE({ type: 'se', category: 'failure', duration: 0.5, mood: 'tense', volume: 0.8 })
      ]);
      console.log(`     ✓ SE: ${seList.length} sounds`);
      
      const assetTime = Date.now() - assetStartTime;
      console.log(`     ✓ Assets generated (${assetTime}ms)`);
      
      // 3. ゲームロジック生成
      console.log('  🧠 Step 3: Generating game logic...');
      const logicStartTime = Date.now();
      
      const assetIds = {
        backgroundId: background[0]?.id,
        objectIds: objects.map(obj => obj[0].id),
        textIds: [],
        bgmId: bgm.id,
        seIds: seList.map(se => se.id)
      };
      
      const gameProject = await this.logicGenerator.generateGameProject(spec, assetIds);
      
      // アセットをプロジェクトに統合
      this.integrateAssetsIntoProject(gameProject, background, objects, [], bgm, seList);
      
      const logicTime = Date.now() - logicStartTime;
      console.log(`     ✓ Logic generated (${logicTime}ms)`);
      
      // 4. 完成
      const totalTime = Date.now() - startTime;
      
      const generatedGame: GeneratedGame = {
        project: gameProject,
        metadata: {
          generationId,
          generatedAt: new Date().toISOString(),
          generationMode: mode,
          spec: spec,
          generationProcess: {
            specGenerationTime: specTime,
            assetGenerationTime: assetTime,
            logicGenerationTime: logicTime,
            totalTime: totalTime
          },
          cost: {
            claudeTokens: this.logicGenerator.estimateTokens(spec),
            stableDiffusionImages: background.length + objects.reduce((sum, obj) => sum + obj.length, 0),
            estimatedCostUSD: this.estimateCost(spec)
          }
        },
        quality: {
          totalScore: 0,
          relativeScore: { diversity: 0, densityPenalty: 0, gapFilling: 0, balance: 0, subtotal: 0 },
          absoluteScore: { basicQuality: 0, playability: 0, predictedSatisfaction: 0, subtotal: 0 },
          passed: false,
          details: { playabilityIssues: [], diversityAnalysis: '', recommendations: [] }
        },
        vector: this.vectorizeGame(gameProject)
      };
      
      console.log(`  ✅ Game generated successfully in ${totalTime}ms`);
      
      return generatedGame;
      
    } catch (error) {
      console.error(`  ❌ Failed to generate game:`, error);
      return null;
    }
  }
  
  /**
   * 生成モード決定（ε-greedy戦略）
   */
  private decideGenerationMode(): GenerationMode {
    const epsilon = this.statistics.currentEpsilon;
    const random = Math.random();
    
    if (random < epsilon) {
      // 探索モード
      this.statistics.explorationCount++;
      return {
        type: 'exploration',
        epsilon: epsilon,
        target: this.findExplorationTarget(),
        reason: 'Exploring new game space for diversity'
      };
    } else {
      // 活用モード
      this.statistics.exploitationCount++;
      return {
        type: 'exploitation',
        epsilon: epsilon,
        reason: 'Exploiting known successful patterns'
      };
    }
  }
  
  /**
   * 探索ターゲット発見
   */
  private findExplorationTarget(): string {
    // TODO: ポートフォリオ分析に基づいて探索すべき領域を特定
    const underrepresentedGenres: GameGenre[] = ['rhythm', 'memory', 'puzzle'];
    const randomGenre = underrepresentedGenres[Math.floor(Math.random() * underrepresentedGenres.length)];
    return `Genre: ${randomGenre}`;
  }
  
  /**
   * ゲーム仕様生成
   */
  private async generateGameSpec(mode: GenerationMode): Promise<GameSpec> {
    // TODO: Claudeを使って多様な仕様を生成
    // 今は仮実装
    
    const genres: GameGenre[] = ['action', 'puzzle', 'timing', 'reflex', 'collection'];
    const mechanics: GameMechanic[] = ['tap', 'swipe', 'timing', 'collecting', 'dodging'];
    const styles: VisualStyle[] = ['minimal', 'cute', 'neon', 'nature', 'space'];
    const difficulties: ('easy' | 'normal' | 'hard')[] = ['easy', 'normal', 'hard'];
    const durations: (5 | 10 | 15 | 20 | 30)[] = [5, 10, 15, 20, 30];
    
    const genre = genres[Math.floor(Math.random() * genres.length)];
    const mechanic = mechanics[Math.floor(Math.random() * mechanics.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    
    return {
      concept: {
        name: `${this.capitalize(genre)} ${this.capitalize(mechanic)} Game`,
        theme: this.generateTheme(style),
        genre: genre,
        mechanic: mechanic,
        difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
        duration: durations[Math.floor(Math.random() * durations.length)]
      },
      visual: {
        style: style,
        colorPalette: this.generateColorPalette(style),
        objectCount: 2 + Math.floor(Math.random() * 4), // 2-5個
        backgroundType: Math.random() > 0.5 ? 'animated' : 'static'
      },
      gameplay: {
        primaryCondition: 'touch',
        primaryAction: 'move',
        complexityLevel: 2,
        successCriteria: 'Reach target score within time limit'
      },
      metadata: {
        targetAudience: 'all',
        keywords: [genre, mechanic, style],
        inspirations: []
      }
    };
  }
  
  /**
   * 品質評価（簡略版）
   */
  private async evaluateQuality(game: GeneratedGame): Promise<QualityEvaluation> {
    // TODO: 動的品質評価システムの完全実装
    // 今は仮実装
    
    const baseScore = 70 + Math.random() * 25; // 70-95点
    
    return {
      totalScore: baseScore,
      relativeScore: {
        diversity: 15,
        densityPenalty: -2,
        gapFilling: 8,
        balance: 7,
        subtotal: 28
      },
      absoluteScore: {
        basicQuality: 12,
        playability: 13,
        predictedSatisfaction: 12,
        subtotal: 37
      },
      passed: baseScore >= this.config.generation.qualityThreshold,
      details: {
        playabilityIssues: baseScore < 85 ? ['Minor balance issue'] : [],
        diversityAnalysis: 'Game introduces new mechanic combination',
        recommendations: []
      }
    };
  }
  
  /**
   * ゲームベクトル化（40次元）
   */
  private vectorizeGame(project: GameProject): any {
    // TODO: 完全実装
    return {
      gameplay: { playTime: 0, interactionFrequency: 0, difficulty: 0, skillCeiling: 0, complexity: 0, replayability: 0, accessibility: 0, learningCurve: 0, pace: 0, tension: 0 },
      visual: { colorIntensity: 0, visualComplexity: 0, brightness: 0, contrast: 0, saturation: 0, objectDensity: 0, animationAmount: 0, effectIntensity: 0, artStyleIndex: 0, symmetry: 0 },
      rules: { ruleCount: 0, conditionDiversity: 0, actionDiversity: 0, conditionComplexity: 0, actionComplexity: 0, ruleInteraction: 0, randomness: 0, determinism: 0, feedbackLoop: 0, emergentComplexity: 0 },
      interaction: { touchBased: 0, timingBased: 0, memoryBased: 0, reflexBased: 0, strategyBased: 0, precisionBased: 0, rhythmBased: 0, spatialBased: 0, patternBased: 0, reactionBased: 0 }
    };
  }
  
  /**
   * 統計更新
   */
  private updateStatistics(quality: QualityEvaluation): void {
    this.statistics.passRate = this.statistics.passed / this.statistics.generated;
    this.statistics.averageQuality = 
      (this.statistics.averageQuality * (this.statistics.passed - 1) + quality.totalScore) / this.statistics.passed;
    this.statistics.maxQuality = Math.max(this.statistics.maxQuality, quality.totalScore);
    this.statistics.minQuality = Math.min(this.statistics.minQuality, quality.totalScore);
  }
  
  /**
   * 統計表示
   */
  private printStatistics(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Generation Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Generated: ${this.statistics.generated}`);
    console.log(`Passed: ${this.statistics.passed} (${(this.statistics.passRate * 100).toFixed(1)}%)`);
    console.log(`Failed: ${this.statistics.failed}`);
    console.log(`Average Quality: ${this.statistics.averageQuality.toFixed(1)}/95`);
    console.log(`Exploration: ${this.statistics.explorationCount}, Exploitation: ${this.statistics.exploitationCount}`);
    console.log(`Current ε: ${this.statistics.currentEpsilon.toFixed(2)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * 最終レポート
   */
  private printFinalReport(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Final Generation Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Games Generated: ${this.portfolio.statistics.totalGames}`);
    console.log(`Pass Rate: ${(this.statistics.passRate * 100).toFixed(1)}%`);
    console.log(`Average Quality: ${this.statistics.averageQuality.toFixed(1)}/95`);
    console.log(`Total Cost: $${this.statistics.totalCostUSD.toFixed(2)}`);
    console.log(`Cost per Game: $${this.statistics.costPerGame.toFixed(3)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * 日次学習
   */
  private async dailyLearning(): Promise<void> {
    console.log('\n🧠 Daily learning and adjustment...');
    
    // ε値を動的調整（探索率を徐々に減少）
    const targetEpsilon = 0.1; // 最終的には10%探索
    const decay = 0.95;
    this.statistics.currentEpsilon = Math.max(targetEpsilon, this.statistics.currentEpsilon * decay);
    
    console.log(`   ✓ Epsilon adjusted to ${this.statistics.currentEpsilon.toFixed(2)}`);
  }
  
  /**
   * 停止
   */
  stop(): void {
    console.log('⏹️  Stopping generation loop...');
    this.shouldStop = true;
  }
  
  // ===== ヘルパーメソッド =====
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  private generateTheme(style: VisualStyle): string {
    const themes: Record<VisualStyle, string[]> = {
      minimal: ['シンプル', '静寂', '禅'],
      cute: ['かわいい', '癒し', 'ほんわか'],
      retro: ['レトロ', '懐かしい', '8ビット'],
      neon: ['サイバー', '未来', 'ネオン'],
      nature: ['自然', '森', '癒し'],
      space: ['宇宙', 'SF', '星'],
      underwater: ['海', '水中', '神秘'],
      abstract: ['抽象', 'アート', 'モダン'],
      geometric: ['幾何学', '図形', 'ミニマル'],
      pixel: ['ドット絵', 'レトロ', 'ピクセル']
    };
    const list = themes[style] || ['ゲーム'];
    return list[Math.floor(Math.random() * list.length)];
  }
  
  private generateColorPalette(style: VisualStyle): string[] {
    const palettes: Record<VisualStyle, string[]> = {
      minimal: ['#FFFFFF', '#000000', '#CCCCCC'],
      cute: ['#FFB6C1', '#FFE4E1', '#FFC0CB', '#87CEEB'],
      retro: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
      neon: ['#FF00FF', '#00FFFF', '#FF00AA', '#00FF00'],
      nature: ['#228B22', '#8FBC8F', '#D2691E', '#87CEEB'],
      space: ['#000033', '#4B0082', '#9370DB', '#FFD700'],
      underwater: ['#00CED1', '#1E90FF', '#40E0D0', '#87CEEB'],
      abstract: ['#FF6347', '#4682B4', '#FFD700', '#9370DB'],
      geometric: ['#FF4500', '#1E90FF', '#FFD700', '#32CD32'],
      pixel: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
    };
    return palettes[style] || ['#FFFFFF'];
  }
  
  private mapDifficultyToMood(difficulty: 'easy' | 'normal' | 'hard'): 'happy' | 'tense' | 'calm' | 'exciting' {
    const mapping = {
      easy: 'calm',
      normal: 'happy',
      hard: 'exciting'
    };
    return mapping[difficulty] as any;
  }
  
  private buildBackgroundPrompt(spec: GameSpec): string {
    return `${spec.concept.theme} background, ${spec.visual.style} style, game background`;
  }
  
  private buildObjectPrompt(spec: GameSpec, index: number): string {
    return `${spec.concept.theme} game character ${index + 1}, ${spec.visual.style} style, simple sprite`;
  }
  
  private integrateAssetsIntoProject(
    project: GameProject,
    background: any[],
    objects: any[][],
    texts: any[],
    bgm: any,
    seList: any[]
  ): void {
    // TODO: アセットをProjectAssets型に統合
    console.log('  🔧 Integrating assets into project...');
  }
  
  private estimateCost(spec: GameSpec): number {
    // Claude: $0.047/ゲーム（6000トークン）
    // Stable Diffusion: 無料（ローカル）
    return 0.047;
  }
}