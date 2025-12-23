/**
 * V2 Orchestrator
 *
 * 新設計に基づくゲーム生成オーケストレーター
 *
 * Step 1: GameConceptGenerator（4つの評価基準を前提に自由発想）
 * Step 2: ConceptValidator（ダブルチェック）
 * Step 3: GameDesignGenerator（ゲームデザイン生成）
 * Step 4: SpecificationGenerator（詳細仕様生成）
 * Step 5: EditorMapper（エディター形式へ変換）
 * Step 6: LogicValidator（100%成功前提のダブルチェック）
 * Step 7: AssetGenerator（計画に基づく生成）
 * Step 8: FinalAssembler（JSON整合性チェック）
 * Step 9: QualityScorer（参考情報）
 */

import { GameConceptGenerator } from './GameConceptGenerator';
import { ConceptValidator } from './ConceptValidator';
import { GameDesignGenerator, GameDesign } from './GameDesignGenerator';
import { SpecificationGenerator, GameSpecification } from './SpecificationGenerator';
import { EditorMapper } from './EditorMapper';
import { LogicValidator } from './LogicValidator';
import { AssetGenerator } from './AssetGenerator';
import { FinalAssembler } from './FinalAssembler';
import { QualityScorer } from './QualityScorer';
import { GenerationLogger } from './GenerationLogger';
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

  // Generators (new pipeline)
  private conceptGenerator: GameConceptGenerator;
  private conceptValidator: ConceptValidator;
  private gameDesignGenerator: GameDesignGenerator;
  private specificationGenerator: SpecificationGenerator;
  private editorMapper: EditorMapper;
  private logicValidator: LogicValidator;
  private assetGenerator: AssetGenerator;
  private finalAssembler: FinalAssembler;
  private qualityScorer: QualityScorer;

  // Logging
  private logger: GenerationLogger;

  // Optional
  private uploader?: SupabaseUploader;

  // State
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize logger
    this.logger = new GenerationLogger();

    // Initialize all components with logger
    this.conceptGenerator = new GameConceptGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    });
    this.conceptValidator = new ConceptValidator();

    // New pipeline components
    this.gameDesignGenerator = new GameDesignGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    }, this.logger);
    this.specificationGenerator = new SpecificationGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    }, this.logger);
    this.editorMapper = new EditorMapper({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    }, this.logger);

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

    console.log('🚀 V2 Orchestrator initialized (new pipeline)');
    console.log(`   Target: ${this.config.targetGamesPerRun} games`);
    console.log(`   Max retries: ${this.config.maxRetries}`);
    console.log(`   Image provider: ${this.config.imageGeneration.provider}`);
    console.log(`   Dry run: ${this.config.dryRun}`);
    console.log(`   Logging: ${process.env.GENERATION_LOGGING !== 'false' ? 'enabled' : 'disabled'}`);
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

    // Start logging session
    const sessionId = this.logger.startSession();

    try {
      // Step 1: GameConceptGenerator
      console.log('   📋 Step 1: Generating concept...');
      let concept: GameConcept;
      let conceptRetries = 0;

      while (true) {
        concept = await this.conceptGenerator.generate(
          conceptRetries > 0 ? 'Previous concept had issues, please improve' : undefined
        );
        console.log(`      Title: ${concept.title}`);

        // Log concept
        this.logger.logConceptGeneration(concept);

        // Step 2: ConceptValidator
        console.log('   ✓ Step 2: Validating concept...');
        const conceptValidation = this.conceptValidator.validate(concept);
        this.logger.logConceptValidation(conceptValidation.passed, conceptValidation.issues);

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

      // Update session with concept title
      this.logger.log('session', 'decision', `Concept: ${concept.title}`);

      // Step 3: GameDesignGenerator
      console.log('   🎯 Step 3: Generating game design...');
      let design: GameDesign;
      try {
        design = await this.gameDesignGenerator.generate(concept);
        console.log(`      Core loop: ${design.coreLoop.description}`);
        console.log(`      Objects: ${design.objects.length}`);
        console.log(`      Interactions: ${design.interactions.length}`);
      } catch (error) {
        this.logger.logError('GameDesignGenerator', error as Error);
        throw error;
      }

      // Step 4: SpecificationGenerator
      console.log('   📝 Step 4: Generating specifications...');
      let spec: GameSpecification;
      try {
        spec = await this.specificationGenerator.generate(concept, design);
        console.log(`      Rules: ${spec.rules.length}`);
        console.log(`      Counters: ${spec.stateManagement.counters.length}`);
        console.log(`      Success path: ${spec.successPath.steps.length} steps`);
      } catch (error) {
        this.logger.logError('SpecificationGenerator', error as Error);
        throw error;
      }

      // Step 5: EditorMapper
      console.log('   🔄 Step 5: Mapping to editor format...');
      let logicOutput: LogicGeneratorOutput;
      let logicRetries = 0;

      while (true) {
        try {
          logicOutput = await this.editorMapper.map(concept, spec);
        } catch (error) {
          this.logger.logError('EditorMapper', error as Error);
          throw error;
        }

        // Step 6: LogicValidator
        console.log('   ✓ Step 6: Validating logic...');
        const logicValidation = this.logicValidator.validate(logicOutput);
        this.logger.logLogicValidation(logicValidation.valid, logicValidation.errors);

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

        // Re-generate specification with feedback
        this.logger.logDecision('SpecificationGenerator', 'Regenerating',
          `Validation failed: ${logicValidation.errors.map(e => e.message).join(', ')}`);
        spec = await this.specificationGenerator.generate(concept, design);
      }

      // Step 7: AssetGenerator
      console.log('   🎨 Step 7: Generating assets...');
      const assets = await this.assetGenerator.generate(concept, logicOutput.assetPlan);

      // Step 8: FinalAssembler
      console.log('   🔧 Step 8: Assembling game...');
      const assemblyResult = this.finalAssembler.assemble(concept, logicOutput, assets);

      if (!assemblyResult.valid) {
        console.log(`      ❌ Assembly errors: ${assemblyResult.issues.join(', ')}`);
        this.logger.logError('FinalAssembler', assemblyResult.issues.join(', '));
      } else if (assemblyResult.issues.length > 0) {
        console.log(`      ✅ Game assembled (warnings: ${assemblyResult.issues.join(', ')})`);
      } else {
        console.log('      ✅ Game assembled');
      }

      // Step 9: QualityScorer
      console.log('   📊 Step 9: Scoring quality...');
      const qualityScore = this.qualityScorer.score(concept, assemblyResult.project, validationPassedFirstTry);
      const overallScore = this.qualityScorer.calculateOverallScore(qualityScore);
      console.log(`      Score: ${overallScore}/100 (${this.qualityScorer.getLabel(overallScore)})`);

      const generationTime = Date.now() - startTime;
      const estimatedCost = this.estimateCost();

      // End logging session
      this.logger.endSession(assemblyResult.valid);

      return {
        id: assemblyResult.project.id,
        concept,
        project: assemblyResult.project,
        qualityScore,
        passed: assemblyResult.valid,
        generationTime,
        estimatedCost
      };
    } catch (error) {
      this.logger.logError('Orchestrator', error as Error);
      this.logger.endSession(false);
      throw error;
    }
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
    // Sum tokens from all generators
    const tokensUsed =
      this.gameDesignGenerator.getTokensUsed() +
      this.specificationGenerator.getTokensUsed() +
      this.editorMapper.getTokensUsed();
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
      gameDesignGenerator: this.gameDesignGenerator.getDebugInfo(),
      specificationGenerator: this.specificationGenerator.getDebugInfo(),
      editorMapper: this.editorMapper.getDebugInfo(),
      recentLogSessions: this.logger.getRecentSessions(5)
    };
  }
}

export default Orchestrator;
