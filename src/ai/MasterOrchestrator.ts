/**
 * Master Orchestrator - AI自動ゲーム生成システム統括
 * Phase H Day 5統合版: AutoPublisher統合完了
 */

import { LogicGenerator } from './generators/LogicGenerator';
import { ImageGenerator } from './generators/ImageGenerator';
import { SoundGenerator } from './generators/SoundGenerator';
import { GamePortfolioAnalyzer } from './analyzers/GamePortfolioAnalyzer';
import { DynamicQualityChecker } from './checkers/DynamicQualityChecker';
import { AdaptiveStandards } from './standards/AdaptiveStandards';
import { PlayabilitySimulator } from './simulators/PlayabilitySimulator';
// ✨ NEW: AutoPublisher統合
import { AutoPublisher, PublicationConfig } from './publishers/AutoPublisher';
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
 * 24時間自動稼働システムの中核（Phase H Day 5統合版）
 */
export class MasterOrchestrator {
  private logicGenerator: LogicGenerator;
  private imageGenerator: ImageGenerator;
  private soundGenerator: SoundGenerator;
  
  // Phase H Day 2-3: 動的品質管理システム
  private portfolioAnalyzer: GamePortfolioAnalyzer;
  private qualityChecker: DynamicQualityChecker;
  private adaptiveStandards: AdaptiveStandards;
  private playabilitySimulator: PlayabilitySimulator;
  
  // ✨ NEW: Phase H Day 5: 自動公開システム
  private autoPublisher: AutoPublisher;
  
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
    
    // Phase H Day 2-3: 動的品質管理システム初期化
    this.portfolioAnalyzer = new GamePortfolioAnalyzer();
    this.qualityChecker = new DynamicQualityChecker(config.generation.qualityThreshold);
    this.adaptiveStandards = new AdaptiveStandards(config.generation.qualityThreshold);
    this.playabilitySimulator = new PlayabilitySimulator();
    
    // ✨ NEW: Phase H Day 5: AutoPublisher初期化
    const publishConfig: PublicationConfig = {
      publishToSupabase: !config.debug.dryRun, // ドライランではSupabase公開しない
      registerFreeAssets: false, // 現時点では無効（後で実装）
      postToSocialMedia: false, // 現時点では無効（後で実装）
      socialMediaLanguages: ['en', 'ja'],
      autoPublish: true
    };
    this.autoPublisher = new AutoPublisher(publishConfig);
    
    console.log('🚀 MasterOrchestrator initialized (Phase H Complete)');
    console.log('   ✓ Dynamic Quality Management System enabled');
    console.log('   ✓ Auto Publisher System enabled');
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
    console.log(`🎯 Initial quality threshold: ${this.adaptiveStandards.getQualityThreshold()} points`);
    console.log(`🔍 Exploration rate: ${this.statistics.currentEpsilon.toFixed(2)}`);
    
    let generation = 0;
    
    while (!this.shouldStop && generation < this.config.generation.targetGamesCount) {
      generation++;
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔄 Generation ${generation}/${this.config.generation.targetGamesCount} - Passed: ${this.portfolio.statistics.totalGames}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      try {
        // 1. ポートフォリオ統計更新
        this.portfolioAnalyzer.updatePortfolioStatistics(this.portfolio);
        
        // 2. 生成モード決定（探索 or 活用）
        const mode = this.decideGenerationMode();
        console.log(`  🔍 Generation Mode: ${mode.type.toUpperCase()} (${(this.statistics.currentEpsilon * 100).toFixed(0)}%)`);
        console.log(`  🎯 Mode: ${mode.type}`);
        console.log(`  📝 Reason: ${mode.reason}`);
        
        // 3. ゲーム生成
        const newGame = await this.generateSingleGame(mode);
        
        if (newGame) {
          this.statistics.generated++;
          
          // 4. 動的品質チェック（Phase H Day 2-3）
          console.log(`  🔍 Dynamic Quality Check...`);
          const quality = await this.qualityChecker.evaluateQuality(
            newGame,
            this.portfolio.games
          );
          
          console.log(`     ├─ Relative: ${quality.relativeScore.subtotal.toFixed(1)}/50`);
          console.log(`     └─ Absolute: ${quality.absoluteScore.subtotal.toFixed(1)}/45`);
          console.log(`  📊 Quality Score: ${quality.totalScore.toFixed(1)}/95`);
          console.log(`  ├─ Relative: ${quality.relativeScore.subtotal.toFixed(1)}/50`);
          console.log(`  │  ├─ Diversity: ${quality.relativeScore.diversity.toFixed(1)}/20`);
          console.log(`  │  ├─ Density: ${quality.relativeScore.densityPenalty.toFixed(1)}/-10`);
          console.log(`  │  ├─ Gap Fill: ${quality.relativeScore.gapFilling.toFixed(1)}/10`);
          console.log(`  │  └─ Balance: ${quality.relativeScore.balance.toFixed(1)}/10`);
          console.log(`  └─ Absolute: ${quality.absoluteScore.subtotal.toFixed(1)}/45`);
          console.log(`     ├─ Basic: ${quality.absoluteScore.basicQuality.toFixed(1)}/15`);
          console.log(`     ├─ Playability: ${quality.absoluteScore.playability.toFixed(1)}/15`);
          console.log(`     └─ Satisfaction: ${quality.absoluteScore.predictedSatisfaction.toFixed(1)}/15`);
          
          // 5. 合格判定（適応的基準）
          const threshold = this.adaptiveStandards.getQualityThreshold();
          const passed = quality.passed && quality.totalScore >= threshold;
          
          if (passed) {
            // 合格: ポートフォリオに追加
            newGame.quality = quality;
            this.portfolio.games.push(newGame);
            this.portfolio.statistics.totalGames++;
            this.statistics.passed++;
            
            console.log(`  ✅ Game passed! "${newGame.project.settings.name}"`);
            console.log(`  📈 Portfolio: ${this.portfolio.statistics.totalGames} games`);
            
            // ✨ MODIFIED: Phase H Day 5: AutoPublisher統合
            // 6. 公開（ドライランでない場合）
            if (!this.config.debug.dryRun) {
              await this.publishGame(newGame);
            } else {
              console.log(`  🔷 Dry run: skipping publish`);
            }
            
            // 統計更新
            this.updateStatistics(quality);
            
            // ✨ NEW: 探索率調整（合格時）
            this.adjustExplorationRate(true);
            
          } else {
            // 不合格
            this.statistics.failed++;
            console.log(`  ❌ Quality check failed (${quality.totalScore.toFixed(1)} < ${threshold} points)`);
            
            if (quality.details.playabilityIssues.length > 0) {
              console.log(`  ⚠️  Issues:`);
              quality.details.playabilityIssues.slice(0, 3).forEach(issue => {
                console.log(`     - ${issue}`);
              });
            }
            
            if (quality.details.recommendations.length > 0) {
              console.log(`  💡 Recommendations:`);
              quality.details.recommendations.slice(0, 2).forEach(rec => {
                console.log(`     - ${rec}`);
              });
            }
            
            // ✨ NEW: 探索率調整（不合格時）
            this.adjustExplorationRate(false);
          }
        } else {
          this.statistics.failed++;
          console.log(`  ❌ Generation failed`);
        }
        
        // 7. 統計表示（10回ごと）
        if (generation % 10 === 0) {
          this.printStatistics();
        }
        
        // 8. 適応的学習（50回ごと）
        if (generation % 50 === 0) {
          await this.adaptiveLearning();
        }
        
        // 9. 待機（レート制限対策）
        await this.sleep(this.config.debug.dryRun ? 1000 : 5000);
        
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
   * ✨ NEW: Phase H Day 5: ゲーム公開
   */
  private async publishGame(game: GeneratedGame): Promise<void> {
    try {
      const result = await this.autoPublisher.publishGame(game, true);
      
      if (result.success) {
        console.log(`  📤 Published to Supabase: ${result.gameId}`);
        if (result.supabaseUrl) {
          console.log(`  🔗 URL: ${result.supabaseUrl}`);
        }
      } else {
        console.error(`  ❌ Publication failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`  ❌ Publication error:`, error);
    }
  }
  
  /**
   * ✨ NEW: 探索率の動的調整
   */
  private adjustExplorationRate(success: boolean): void {
    const currentRate = this.statistics.currentEpsilon;
    const passRate = this.statistics.passRate;
    
    // 合格率に基づいて探索率を調整
    if (passRate < 0.3) {
      // 合格率30%未満: 探索率を上げる（最大50%）
      this.statistics.currentEpsilon = Math.min(0.5, currentRate + 0.02);
    } else if (passRate > 0.7) {
      // 合格率70%以上: 探索率を下げる（最小10%）
      this.statistics.currentEpsilon = Math.max(0.1, currentRate - 0.01);
    }
    
    // 合格時は若干探索率を下げ、不合格時は上げる
    if (success) {
      this.statistics.currentEpsilon = Math.max(0.1, currentRate * 0.99);
    } else {
      this.statistics.currentEpsilon = Math.min(0.5, currentRate * 1.01);
    }
    
    // ログは5%以上変化した時のみ
    const change = Math.abs(this.statistics.currentEpsilon - currentRate);
    if (change >= 0.05) {
      console.log(`  📊 Exploration rate adjusted: ${(currentRate * 100).toFixed(0)}% → ${(this.statistics.currentEpsilon * 100).toFixed(0)}%`);
    }
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
          frameCount: 4,
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
      
      // 4. ゲームベクトル化（Phase H Day 2-3）
      const gameVector = this.portfolioAnalyzer.vectorizeGame(gameProject);
      
      // 5. 完成
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
        vector: gameVector // Phase H Day 2-3: 完全なベクトル
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
   * 探索ターゲット発見（Phase H Day 2-3統合）
   */
  private findExplorationTarget(): string {
    // ポートフォリオ健全性から探索方向を決定
    const needs = this.portfolio.health.needsExploration;
    
    if (needs.length > 0) {
      return needs[0]; // 最優先の探索方向
    }
    
    // ギャップ領域を検出
    const gapAreas = this.portfolioAnalyzer.findGapAreas(this.portfolio.games);
    
    if (gapAreas.length > 0) {
      return gapAreas[0].description;
    }
    
    // デフォルト: ランダム探索
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
        objectCount: 2 + Math.floor(Math.random() * 4),
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
   * 統計更新
   */
  private updateStatistics(quality: QualityEvaluation): void {
    this.statistics.passRate = this.statistics.passed / this.statistics.generated;
    this.statistics.averageQuality = 
      (this.statistics.averageQuality * (this.statistics.passed - 1) + quality.totalScore) / this.statistics.passed;
    this.statistics.maxQuality = Math.max(this.statistics.maxQuality, quality.totalScore);
    this.statistics.minQuality = Math.min(this.statistics.minQuality, quality.totalScore);
    this.statistics.diversityScore = this.portfolio.statistics.diversityScore;
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
    console.log(`Quality Range: ${this.statistics.minQuality.toFixed(1)} - ${this.statistics.maxQuality.toFixed(1)}`);
    console.log(`Portfolio Diversity: ${(this.statistics.diversityScore * 100).toFixed(1)}%`);
    console.log(`Exploration: ${this.statistics.explorationCount}, Exploitation: ${this.statistics.exploitationCount}`);
    console.log(`Current ε: ${this.statistics.currentEpsilon.toFixed(2)}`);
    console.log(`Quality Threshold: ${this.adaptiveStandards.getQualityThreshold()}`);
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
    console.log(`Portfolio Diversity: ${(this.statistics.diversityScore * 100).toFixed(1)}%`);
    console.log(`Total Cost: $${this.statistics.totalCostUSD.toFixed(2)}`);
    console.log(`Cost per Game: $${this.statistics.costPerGame.toFixed(3)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 適応的基準レポート
    console.log(this.adaptiveStandards.generateReport());
    
    // ✨ NEW: 探索-活用バランスレポート
    this.printExplorationReport();
  }
  
  /**
   * ✨ NEW: 探索-活用バランスレポート
   */
  private printExplorationReport(): void {
    const totalDecisions = this.statistics.explorationCount + this.statistics.exploitationCount;
    const explorationRate = totalDecisions > 0 
      ? (this.statistics.explorationCount / totalDecisions * 100).toFixed(1)
      : '0.0';
    const exploitationRate = totalDecisions > 0
      ? (this.statistics.exploitationCount / totalDecisions * 100).toFixed(1)
      : '0.0';
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Exploration-Exploitation Balance Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Decisions: ${totalDecisions}`);
    console.log(`  ├─ Exploration: ${this.statistics.explorationCount} (${explorationRate}%)`);
    console.log(`  └─ Exploitation: ${this.statistics.exploitationCount} (${exploitationRate}%)`);
    console.log('');
    console.log(`Current Exploration Rate: ${(this.statistics.currentEpsilon * 100).toFixed(0)}%`);
    console.log('');
    console.log('Recent Performance:');
    console.log(`  ├─ Avg Diversity: ${(this.statistics.diversityScore * 100).toFixed(1)}%`);
    console.log(`  └─ Avg Success: ${(this.statistics.passRate * 100).toFixed(1)}%`);
    console.log('');
    
    // 状態評価
    if (this.statistics.diversityScore < 0.3) {
      console.log('Status: ⚠️ Warning - Low diversity, increase exploration');
    } else if (this.statistics.diversityScore > 0.7) {
      console.log('Status: ✅ Excellent - High diversity maintained');
    } else {
      console.log('Status: 👍 Good - Balanced diversity');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * 適応的学習（Phase H Day 2-3）
   */
  private async adaptiveLearning(): Promise<void> {
    console.log('\n🧠 Adaptive learning and adjustment...');
    
    // 統計に基づいて基準を自動調整
    this.adaptiveStandards.autoAdjust(this.statistics);
    
    // ε値の最適化（より緩やかな減衰）
    const targetEpsilon = 0.15; // 最小探索率を15%に設定
    const decay = 0.98; // より緩やかな減衰
    this.statistics.currentEpsilon = Math.max(targetEpsilon, this.statistics.currentEpsilon * decay);
    
    console.log(`   ✓ Epsilon adjusted to ${this.statistics.currentEpsilon.toFixed(2)}`);
    console.log(`   ✓ Quality threshold: ${this.adaptiveStandards.getQualityThreshold()}`);
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
    return 0.047;
  }
}