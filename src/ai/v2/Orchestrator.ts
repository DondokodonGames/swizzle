/**
 * V2 Orchestrator
 *
 * 新設計に基づくゲーム生成オーケストレーター
 *
 * Step 1: GameConceptGenerator（4つの評価基準を前提に自由発想）
 * Step 2: ConceptValidator（ダブルチェック）
 * Step 3: LogicGenerator（エディター仕様厳密、アセット計画出力）
 * Step 4: LogicValidator（100%成功前提のダブルチェック）
 * Step 5: AssetGenerator（計画に基づく生成）
 * Step 6: FinalAssembler（JSON整合性チェック）
 * Step 7: QualityScorer（参考情報）
 */

import { GameConceptGenerator } from './GameConceptGenerator';
import { ConceptValidator } from './ConceptValidator';
import { LogicGenerator } from './LogicGenerator';
import { LogicValidator } from './LogicValidator';
import { AssetGenerator } from './AssetGenerator';
import { FinalAssembler } from './FinalAssembler';
import { QualityScorer } from './QualityScorer';
import { SupabaseUploader } from '../publishers/SupabaseUploader';
import {
  GameConcept,
  LogicGeneratorOutput,
  GenerationResult,
  BatchResult,
  OrchestratorConfig
} from './types';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CONFIG: OrchestratorConfig = {
  targetGamesPerRun: 10,
  maxRetries: 3,
  dryRun: false,
  imageGeneration: {
    provider: 'mock'
  }
};

export class Orchestrator {
  private config: OrchestratorConfig;

  // Generators
  private conceptGenerator: GameConceptGenerator;
  private conceptValidator: ConceptValidator;
  private logicGenerator: LogicGenerator;
  private logicValidator: LogicValidator;
  private assetGenerator: AssetGenerator;
  private finalAssembler: FinalAssembler;
  private qualityScorer: QualityScorer;

  // Optional
  private uploader?: SupabaseUploader;

  // State
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize all components
    this.conceptGenerator = new GameConceptGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    });
    this.conceptValidator = new ConceptValidator();
    this.logicGenerator = new LogicGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    });
    this.logicValidator = new LogicValidator();
    this.assetGenerator = new AssetGenerator({
      imageProvider: this.config.imageGeneration.provider,
      openaiApiKey: this.config.imageGeneration.apiKey
    });
    this.finalAssembler = new FinalAssembler();
    this.qualityScorer = new QualityScorer();

    // Initialize uploader if not dry run
    const skipUpload = process.env.SKIP_UPLOAD === 'true';
    if (!this.config.dryRun && !skipUpload) {
      try {
        this.uploader = new SupabaseUploader();
        console.log('   ✓ SupabaseUploader initialized');
      } catch (error) {
        console.warn('   ⚠️ SupabaseUploader not available:', (error as Error).message);
      }
    }

    console.log('🚀 V2 Orchestrator initialized');
    console.log(`   Target: ${this.config.targetGamesPerRun} games`);
    console.log(`   Max retries: ${this.config.maxRetries}`);
    console.log(`   Image provider: ${this.config.imageGeneration.provider}`);
    console.log(`   Dry run: ${this.config.dryRun}`);
  }

  /**
   * バッチ実行
   */
  async run(): Promise<BatchResult> {
    if (this.isRunning) {
      throw new Error('Already running');
    }

    this.isRunning = true;
    this.shouldStop = false;

    const startTime = Date.now();
    const results: GenerationResult[] = [];
    let passed = 0;
    let failed = 0;
    let totalCost = 0;

    console.log('\n' + '='.repeat(60));
    console.log('🎮 V2 Game Generation Batch');
    console.log('='.repeat(60));

    for (let i = 0; i < this.config.targetGamesPerRun && !this.shouldStop; i++) {
      console.log(`\n📦 Game ${i + 1}/${this.config.targetGamesPerRun}`);

      try {
        const result = await this.generateSingleGame();

        if (result.passed) {
          passed++;
          console.log(`   ✅ Passed: ${result.concept.title}`);

          // Save locally
          this.saveGameLocally(result);

          // Upload if available
          if (this.uploader) {
            await this.uploadGame(result);
          }
        } else {
          failed++;
          console.log(`   ❌ Failed: ${result.concept.title}`);
        }

        results.push(result);
        totalCost += result.estimatedCost;

        // Rate limiting
        await this.delay(1000);

      } catch (error) {
        console.error(`   ❌ Error: ${(error as Error).message}`);
        failed++;
      }
    }

    this.isRunning = false;

    const totalTime = Date.now() - startTime;
    const batchResult: BatchResult = {
      totalGenerated: results.length,
      passed,
      failed,
      passRate: results.length > 0 ? passed / results.length : 0,
      totalTime,
      totalCost,
      games: results
    };

    this.printFinalReport(batchResult);

    return batchResult;
  }

  /**
   * 単一ゲーム生成
   */
  private async generateSingleGame(): Promise<GenerationResult> {
    const startTime = Date.now();
    let validationPassedFirstTry = true;

    // Step 1: GameConceptGenerator
    console.log('   📋 Step 1: Generating concept...');
    let concept: GameConcept;
    let conceptRetries = 0;

    while (true) {
      concept = await this.conceptGenerator.generate(
        conceptRetries > 0 ? 'Previous concept had issues, please improve' : undefined
      );
      console.log(`      Title: ${concept.title}`);

      // Step 2: ConceptValidator
      console.log('   ✓ Step 2: Validating concept...');
      const conceptValidation = this.conceptValidator.validate(concept);

      if (conceptValidation.passed) {
        console.log('      ✅ Concept validated');
        break;
      }

      conceptRetries++;
      if (conceptRetries >= this.config.maxRetries) {
        console.log(`      ⚠️ Concept validation failed after ${conceptRetries} retries, proceeding anyway`);
        validationPassedFirstTry = false;
        break;
      }

      console.log(`      ⚠️ Issues: ${conceptValidation.issues.join(', ')}`);
      console.log(`      🔄 Retrying (${conceptRetries}/${this.config.maxRetries})...`);
    }

    // Step 3: LogicGenerator
    console.log('   🧠 Step 3: Generating logic...');
    let logicOutput: LogicGeneratorOutput;
    let logicRetries = 0;

    while (true) {
      logicOutput = await this.logicGenerator.generate(
        concept,
        logicRetries > 0 ? this.logicValidator.formatFeedback(
          this.logicValidator.validate(logicOutput!)
        ) : undefined
      );

      // Step 4: LogicValidator
      console.log('   ✓ Step 4: Validating logic...');
      const logicValidation = this.logicValidator.validate(logicOutput);

      if (logicValidation.valid) {
        console.log('      ✅ Logic validated');
        break;
      }

      logicRetries++;
      validationPassedFirstTry = false;

      if (logicRetries >= this.config.maxRetries) {
        console.log(`      ⚠️ Logic validation failed after ${logicRetries} retries`);
        console.log(`      Errors: ${logicValidation.errors.map(e => e.message).join(', ')}`);
        // Continue anyway - the game might still work
        break;
      }

      console.log(`      ⚠️ Issues: ${logicValidation.errors.length} errors`);
      console.log(`      🔄 Retrying (${logicRetries}/${this.config.maxRetries})...`);
    }

    // Step 5: AssetGenerator
    console.log('   🎨 Step 5: Generating assets...');
    const assets = await this.assetGenerator.generate(concept, logicOutput.assetPlan);

    // Step 6: FinalAssembler
    console.log('   🔧 Step 6: Assembling game...');
    const assemblyResult = this.finalAssembler.assemble(concept, logicOutput, assets);

    if (!assemblyResult.valid) {
      console.log(`      ❌ Assembly errors: ${assemblyResult.issues.join(', ')}`);
    } else if (assemblyResult.issues.length > 0) {
      console.log(`      ✅ Game assembled (warnings: ${assemblyResult.issues.join(', ')})`);
    } else {
      console.log('      ✅ Game assembled');
    }

    // Step 7: QualityScorer
    console.log('   📊 Step 7: Scoring quality...');
    const qualityScore = this.qualityScorer.score(concept, assemblyResult.project, validationPassedFirstTry);
    const overallScore = this.qualityScorer.calculateOverallScore(qualityScore);
    console.log(`      Score: ${overallScore}/100 (${this.qualityScorer.getLabel(overallScore)})`);

    const generationTime = Date.now() - startTime;
    const estimatedCost = this.estimateCost();

    return {
      id: assemblyResult.project.id,
      concept,
      project: assemblyResult.project,
      qualityScore,
      passed: assemblyResult.valid,
      generationTime,
      estimatedCost
    };
  }

  /**
   * ゲームをローカル保存
   */
  private saveGameLocally(result: GenerationResult): void {
    try {
      const outputDir = path.resolve(process.cwd(), 'public/generated-games');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const safeTitle = result.concept.titleEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const filename = `${result.id}_${safeTitle}.json`;
      const filepath = path.join(outputDir, filename);

      const gameData = {
        id: result.id,
        concept: result.concept,
        project: result.project,
        qualityScore: result.qualityScore,
        passed: result.passed,
        generationTime: result.generationTime,
        estimatedCost: result.estimatedCost,
        generatedAt: new Date().toISOString()
      };

      fs.writeFileSync(filepath, JSON.stringify(gameData, null, 2), 'utf-8');
      console.log(`   💾 Saved: ${filename}`);
    } catch (error) {
      console.error(`   ❌ Save failed: ${(error as Error).message}`);
    }
  }

  /**
   * ゲームをアップロード
   */
  private async uploadGame(result: GenerationResult): Promise<void> {
    if (!this.uploader) return;

    try {
      console.log(`   📤 Uploading...`);
      const uploadResult = await this.uploader.uploadGame(
        result.project,
        this.qualityScorer.calculateOverallScore(result.qualityScore),
        false // privateMode
      );

      if (uploadResult.success) {
        console.log(`   ✅ Uploaded: ${uploadResult.gameId}`);
      } else {
        console.error(`   ❌ Upload failed: ${uploadResult.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Upload error: ${(error as Error).message}`);
    }
  }

  /**
   * コスト見積もり
   */
  private estimateCost(): number {
    const tokensUsed = this.logicGenerator.getTokensUsed();
    // Claude: ~$0.003/1K tokens average
    // DALL-E 3: ~$0.04/image
    const imageCost = this.config.imageGeneration.provider === 'openai' ? 0.2 : 0;
    return tokensUsed * 0.000003 + imageCost;
  }

  /**
   * 最終レポート
   */
  private printFinalReport(result: BatchResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Report');
    console.log('='.repeat(60));
    console.log(`Total Generated: ${result.totalGenerated}`);
    console.log(`Passed: ${result.passed} (${(result.passRate * 100).toFixed(1)}%)`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Total Time: ${(result.totalTime / 1000 / 60).toFixed(1)} minutes`);
    console.log(`Total Cost: $${result.totalCost.toFixed(4)}`);

    if (result.passed > 0) {
      console.log('\n✅ Passed Games:');
      result.games
        .filter(g => g.passed)
        .forEach((g, i) => {
          const score = this.qualityScorer.calculateOverallScore(g.qualityScore);
          console.log(`   ${i + 1}. ${g.concept.title} - Score: ${score}`);
        });
    }

    // Theme diversity
    const themes = new Set(result.games.map(g => g.concept.theme));
    console.log(`\nUnique Themes: ${themes.size}`);
    console.log('='.repeat(60));
  }

  /**
   * 停止
   */
  stop(): void {
    console.log('⏹️ Stopping...');
    this.shouldStop = true;
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      isRunning: this.isRunning,
      conceptGenerator: this.conceptGenerator.getDebugInfo(),
      logicGenerator: this.logicGenerator.getDebugInfo()
    };
  }
}

export default Orchestrator;
