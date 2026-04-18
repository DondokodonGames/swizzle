/**
 * V2 Orchestrator (強化版パイプライン)
 *
 * 新設計に基づくゲーム生成オーケストレーター
 *
 * Step 1: GameConceptGenerator（4つの評価基準を前提に自由発想）
 * Step 2: ConceptValidator（ダブルチェック）
 * Step 3: GameDesignGenerator（ゲームデザイン生成）
 * Step 3.5: AssetPlanner（必要アセット計画）★NEW
 * Step 4: SpecificationGenerator（詳細仕様生成）
 * Step 5: EditorMapper（エディター形式へ変換）
 * Step 6: LogicValidator（100%成功前提のダブルチェック）
 * Step 6.5: ProjectValidator（全体整合チェック）★NEW
 * Step 7: AssetGenerator（計画に基づく生成）
 * Step 8: FinalAssembler（JSON整合性チェック）
 * Step 8.5: DryRunSimulator（成功パス検証）★NEW
 * Step 9: QualityScorer（参考情報）
 */

import { GameConceptGenerator } from './GameConceptGenerator';
import { ConceptValidator } from './ConceptValidator';
import { GameDesignGenerator, GameDesign } from './GameDesignGenerator';
import { AssetPlanner, EnhancedAssetPlan } from './AssetPlanner';
import { SpecificationGenerator, GameSpecification } from './SpecificationGenerator';
import { EditorMapper, EditorMapperOutput } from './EditorMapper';
import { LogicValidator } from './LogicValidator';
import { LogicRepairer } from './LogicRepairer';
import { ProjectValidator } from './ProjectValidator';
import { AssetGenerator } from './AssetGenerator';
import { FinalAssembler } from './FinalAssembler';
import { DryRunSimulator } from './DryRunSimulator';
import { QualityScorer } from './QualityScorer';
import { GenerationLogger } from './GenerationLogger';
import { FailurePatternTracker } from './FailurePatternTracker';
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
  maxGameAttempts: Infinity,
  dryRun: false,
  imageGeneration: {
    provider: 'mock'
  }
};

export class Orchestrator {
  private config: OrchestratorConfig;

  // Generators (enhanced pipeline)
  private conceptGenerator: GameConceptGenerator;
  private conceptValidator: ConceptValidator;
  private gameDesignGenerator: GameDesignGenerator;
  private assetPlanner: AssetPlanner;           // ★NEW Step 3.5
  private specificationGenerator: SpecificationGenerator;
  private editorMapper: EditorMapper;
  private logicValidator: LogicValidator;
  private logicRepairer: LogicRepairer;         // ★NEW エラー修復
  private projectValidator: ProjectValidator;   // ★NEW Step 6.5
  private assetGenerator: AssetGenerator;
  private finalAssembler: FinalAssembler;
  private dryRunSimulator: DryRunSimulator;     // ★NEW Step 8.5
  private qualityScorer: QualityScorer;

  // Logging
  private logger: GenerationLogger;

  // Dynamic hints
  private failureTracker: FailurePatternTracker;

  // Optional
  private uploader?: SupabaseUploader;

  // State
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize logger
    this.logger = new GenerationLogger();

    // Initialize failure tracker
    this.failureTracker = new FailurePatternTracker();

    // Initialize all components with logger
    this.conceptGenerator = new GameConceptGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    });
    this.conceptValidator = new ConceptValidator();

    // Enhanced pipeline components
    this.gameDesignGenerator = new GameDesignGenerator({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    }, this.logger);

    // ★NEW Step 3.5
    this.assetPlanner = new AssetPlanner({
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

    // ★NEW エラー修復
    this.logicRepairer = new LogicRepairer({
      dryRun: this.config.dryRun,
      apiKey: this.config.anthropicApiKey
    }, this.logger);

    // ★NEW Step 6.5
    this.projectValidator = new ProjectValidator(this.logger);

    this.assetGenerator = new AssetGenerator({
      imageProvider: this.config.imageGeneration.provider,
      openaiApiKey: this.config.imageGeneration.apiKey,
      anthropicApiKey: this.config.anthropicApiKey
    });
    this.finalAssembler = new FinalAssembler();

    // ★NEW Step 8.5
    this.dryRunSimulator = new DryRunSimulator(this.logger);

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

    console.log('🚀 V2 Orchestrator initialized (enhanced pipeline)');
    console.log(`   Target: ${this.config.targetGamesPerRun} games`);
    console.log(`   Max retries: ${this.config.maxRetries}`);
    const maxAttempts = this.config.maxGameAttempts ?? Infinity;
    console.log(`   Max game attempts: ${maxAttempts === Infinity ? '∞ (unlimited)' : maxAttempts}`);
    console.log(`   Image provider: ${this.config.imageGeneration.provider}`);
    console.log(`   Dry run: ${this.config.dryRun}`);
    console.log(`   Logging: ${process.env.GENERATION_LOGGING !== 'false' ? 'enabled' : 'disabled'}`);
    console.log(`   New steps: AssetPlanner, ProjectValidator, DryRunSimulator, LogicRepairer`);
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

      const retryResult = await this.generateGameWithPersistentRetry();

      if (retryResult === null) {
        failed++;
        continue;
      }

      const { result } = retryResult;

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
   * 単一ゲーム生成（強化版パイプライン）
   *
   * @param seed ネタ帳のエントリ（指定時はシードベース生成、省略時は完全ランダム生成）
   * @param prevFeedback 前回の試行で発生したエラーのフィードバック（リトライ時に使用）
   */
  private async generateSingleGame(
    seed?: { id: number; title: string; idea: string; mechanic?: string; theme?: string },
    prevFeedback?: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    let validationPassedFirstTry = true;

    // Start logging session
    this.logger.startSession();

    try {
      // Step 1: GameConceptGenerator
      console.log('   📋 Step 1: Generating concept...');
      let concept: GameConcept;
      let conceptRetries = 0;

      while (true) {
        // シードが指定されている場合はネタ帳ベースで生成、そうでなければ完全ランダム
        concept = seed
          ? await this.conceptGenerator.generateFromSeed(seed,
              conceptRetries > 0 ? 'Previous concept had issues, please improve' : undefined)
          : await this.conceptGenerator.generate(
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

      // ★NEW Step 3.5: AssetPlanner
      console.log('   🎨 Step 3.5: Planning assets...');
      let assetPlan: EnhancedAssetPlan;
      try {
        assetPlan = await this.assetPlanner.plan(concept, design);
        console.log(`      Objects: ${assetPlan.objects.length}`);
        console.log(`      Sounds: ${assetPlan.audio.sounds.length}`);
        console.log(`      Effects: ${assetPlan.effects.length}`);
        console.log(`      Policy: ${assetPlan.assetPolicy.imageFormat}`);
      } catch (error) {
        this.logger.logError('AssetPlanner', error as Error);
        throw error;
      }

      // Step 4: SpecificationGenerator (with AssetPlan)
      console.log('   📝 Step 4: Generating specifications...');
      let spec: GameSpecification;
      try {
        spec = await this.specificationGenerator.generate(concept, design, assetPlan, prevFeedback);
        console.log(`      Rules: ${spec.rules?.length ?? 0}`);
        console.log(`      Counters: ${spec.stateManagement?.counters?.length ?? 0}`);
        console.log(`      Success path: ${spec.successPath?.steps?.length ?? 0} steps`);
        console.log(`      Feedbacks: ${spec.feedbackSpec?.triggers?.length ?? 0}`);
      } catch (error) {
        this.logger.logError('SpecificationGenerator', error as Error);
        throw error;
      }

      // Step 5: EditorMapper
      console.log('   🔄 Step 5: Mapping to editor format...');
      let mapperOutput: EditorMapperOutput;
      let logicOutput: LogicGeneratorOutput;
      let logicRetries = 0;

      // 初回マッピング
      try {
        mapperOutput = await this.editorMapper.map(concept, spec, design, assetPlan);
        logicOutput = mapperOutput.logicOutput;

        // spec の priorityDesign / uiVisibility.safeZone を logicOutput に反映
        this.applySpecConstraints(logicOutput, spec);

        // Log mapping table
        this.logger.log('EditorMapper', 'output', 'Mapping table generated', {
          mappedObjects: mapperOutput.mappingTable.summary.totalObjects,
          mappedCounters: mapperOutput.mappingTable.summary.totalCounters,
          mappedRules: mapperOutput.mappingTable.summary.totalRules
        });
      } catch (error) {
        this.logger.logError('EditorMapper', error as Error);
        throw error;
      }

      // Step 6: LogicValidator + ProjectValidator + LogicRepairer ループ
      let projectValidation = this.projectValidator.validate(logicOutput, assetPlan, spec, concept);

      while (true) {
        console.log('   ✓ Step 6: Validating logic...');
        const logicValidation = this.logicValidator.validate(logicOutput);
        this.logger.logLogicValidation(logicValidation.valid, logicValidation.errors);

        // LogicValidator通過後、ProjectValidatorもチェック
        let allValid = logicValidation.valid;
        let combinedErrors = [...logicValidation.errors];

        if (logicValidation.valid) {
          console.log('      ✅ Logic validated');

          // ProjectValidatorでも検証
          console.log('   🔍 Step 6.5: Validating project integrity...');
          projectValidation = this.projectValidator.validate(logicOutput, assetPlan, spec, concept);

          if (projectValidation.valid) {
            console.log(`      ✅ Project validated (${projectValidation.summary.totalChecks} checks)`);
            break; // 両方通過
          } else {
            console.log(`      ⚠️ Project issues: ${projectValidation.summary.failed} errors, ${projectValidation.summary.warnings} warnings`);
            allValid = false;
            // ProjectValidatorのエラーをLogicValidationError形式に変換
            for (const err of projectValidation.errors) {
              combinedErrors.push({
                type: 'critical',
                code: err.code,
                message: err.message,
                fix: err.fix
              });
            }
          }
        }

        if (allValid) {
          break;
        }

        logicRetries++;
        validationPassedFirstTry = false;

        if (logicRetries >= this.config.maxRetries) {
          console.log(`      ⚠️ Validation failed after ${logicRetries} retries`);
          console.log(`      Errors: ${combinedErrors.slice(0, 5).map(e => e.message).join(', ')}${combinedErrors.length > 5 ? '...' : ''}`);
          throw new Error(`Validation failed after ${logicRetries} retries: ${combinedErrors[0]?.message}`);
        }

        console.log(`      ⚠️ Issues: ${combinedErrors.length} errors`);
        console.log(`      🔧 Step 6.1: Attempting repair (${logicRetries}/${this.config.maxRetries})...`);

        // LogicRepairerで修復を試みる（結合エラーを使用）
        const repairResult = await this.logicRepairer.repair(
          logicOutput,
          { valid: false, errors: combinedErrors },
          concept,
          spec
        );

        // 修復結果を常に適用（repairs が空でも repairedOutput を使う）
        logicOutput = repairResult.repairedOutput;
        if (repairResult.repairsApplied.length > 0) {
          console.log(`      ✅ Applied ${repairResult.repairsApplied.length} repairs`);
          for (const repair of repairResult.repairsApplied) {
            console.log(`         - ${repair.action}: ${repair.target}`);
          }
        }

        // 全体再生成が必要な場合
        if (repairResult.requiresFullRegeneration) {
          console.log(`      🔄 Step 6.2: Full regeneration required...`);
          console.log(`      Feedback: ${repairResult.regenerationFeedback?.substring(0, 100)}...`);

          this.logger.logDecision('SpecificationGenerator', 'Regenerating',
            `Structural issues: ${repairResult.regenerationFeedback}`);

          // フィードバック付きで仕様を再生成
          spec = await this.specificationGenerator.generate(concept, design, assetPlan, repairResult.regenerationFeedback);

          // 再マッピング
          try {
            mapperOutput = await this.editorMapper.map(concept, spec, design, assetPlan);
            logicOutput = mapperOutput.logicOutput;

            // spec の priorityDesign / uiVisibility.safeZone を logicOutput に反映
            this.applySpecConstraints(logicOutput, spec);

            this.logger.log('EditorMapper', 'output', 'Re-mapped after regeneration', {
              mappedObjects: mapperOutput.mappingTable.summary.totalObjects,
              mappedRules: mapperOutput.mappingTable.summary.totalRules
            });
          } catch (error) {
            this.logger.logError('EditorMapper', error as Error);
            throw error;
          }
        } else if (repairResult.success) {
          // 修復成功、再検証へ
          console.log(`      ✅ Repair successful, re-validating...`);
        } else if (repairResult.remainingErrors.length > 0) {
          // 部分的な修復のみ、残存エラーあり
          console.log(`      ⚠️ Partial repair: ${repairResult.remainingErrors.length} errors remain`);
        }
      }

      // Step 6.6: DryRunSimulator（ゲート）— アセット生成前に実行
      // 遊べないゲームにはアセットを生成しない
      console.log('   🎮 Step 6.6: Simulating gameplay (pre-asset gate)...');
      const simulation = this.dryRunSimulator.simulate(logicOutput, spec, concept.duration);
      if (simulation.summary.playable && simulation.summary.confidence !== 'low') {
        console.log(`      ✅ Game playable (confidence: ${simulation.summary.confidence})`);
        console.log(`      📊 Success path: ${simulation.success.requiredTaps} taps, ~${simulation.success.estimatedSeconds.toFixed(1)}s`);
      } else {
        const reason = simulation.summary.playable
          ? `confidence too low: ${simulation.summary.confidence}`
          : simulation.summary.reasoning;
        console.log(`      ❌ Not playable — skipping asset generation`);
        simulation.issues.filter(i => i.severity === 'error').forEach(i => {
          console.log(`         ❌ [${i.code}] ${i.message}`);
        });
        throw new Error(`Game not playable: ${reason}`);
      }

      // Step 7: AssetGenerator
      console.log('   🎨 Step 7: Generating assets...');
      // AssetPlannerのリッチな背景説明をAssetGeneratorに渡す
      // （EditorMapperは簡略化した背景説明しか生成しないため上書きが必要）
      logicOutput.assetPlan.background.description = assetPlan.background.description;
      logicOutput.assetPlan.background.mood = assetPlan.background.mood;
      const assets = await this.assetGenerator.generate(concept, logicOutput.assetPlan, design);

      // Step 8: FinalAssembler
      console.log('   🔧 Step 8: Assembling game...');
      const assemblyResult = this.finalAssembler.assemble(concept, logicOutput, assets, design, spec);

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
      const qualityScore = this.qualityScorer.score(
        concept,
        assemblyResult.project,
        validationPassedFirstTry,
        {
          playable: simulation.summary.playable,
          confidence: simulation.summary.confidence,
          requiredTaps: simulation.success.requiredTaps
        }
      );
      const overallScore = this.qualityScorer.calculateOverallScore(qualityScore);
      console.log(`      Score: ${overallScore}/100 (${this.qualityScorer.getLabel(overallScore)})`);

      const generationTime = Date.now() - startTime;
      const estimatedCost = this.estimateCost();

      const passed = assemblyResult.valid;

      // End logging session
      this.logger.endSession(passed);

      return {
        id: assemblyResult.project.id,
        concept,
        project: assemblyResult.project,
        qualityScore,
        passed,
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
   * spec の priorityDesign と uiVisibility.safeZone を logicOutput に反映する
   *
   * EditorMapper は LLM ベースのため、これらの制約を確実に適用するために
   * Orchestrator 側でポスト処理として機械的に適用する。
   */
  private applySpecConstraints(output: LogicGeneratorOutput, spec: GameSpecification): void {
    // 1. priorityDesign.rulePriorities → rule.priority に反映
    if (spec.priorityDesign?.rulePriorities?.length) {
      const priorityMap = new Map(
        spec.priorityDesign.rulePriorities.map(p => [p.ruleId, p.priority])
      );
      for (const rule of output.script.rules) {
        const priority = priorityMap.get(rule.id);
        if (priority !== undefined) {
          rule.priority = priority;
        }
      }
    }

    // 2. uiVisibility.safeZone → layout オブジェクトの座標をクランプ
    if (spec.uiVisibility?.safeZone) {
      const { top, bottom, left, right } = spec.uiVisibility.safeZone;
      // safeZone は 0.0〜1.0 のマージン値。異常値（0未満や0.5超）はスキップ
      const minX = Math.max(0, left ?? 0);
      const maxX = Math.min(1, 1 - (right ?? 0));
      const minY = Math.max(0, top ?? 0);
      const maxY = Math.min(1, 1 - (bottom ?? 0));

      // 有効な制約がある場合のみ適用（minX < maxX かつ minY < maxY）
      if (minX < maxX && minY < maxY) {
        for (const obj of output.script.layout.objects) {
          if (obj.position) {
            obj.position.x = Math.max(minX, Math.min(maxX, obj.position.x));
            obj.position.y = Math.max(minY, Math.min(maxY, obj.position.y));
          }
        }
      }
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
  private async uploadGame(
    result: GenerationResult,
    seed?: { id: number; title: string; idea: string; mechanic?: string; theme?: string }
  ): Promise<void> {
    if (!this.uploader) return;

    try {
      console.log(`   📤 Uploading...`);

      // seedがある場合は一意なtemplate_idとcategoryを付与
      const templateId = seed ? `v2_idea_${seed.id}` : undefined;
      const category = seed?.theme?.includes('アーケード') ? 'arcade'
                     : seed?.theme?.includes('バー') ? 'bar'
                     : undefined;

      const uploadResult = await this.uploader.uploadGame(
        result.project,
        this.qualityScorer.calculateOverallScore(result.qualityScore),
        true, // autoPublish
        templateId,
        category
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
    // Claude: ~$0.003/1K tokens average (blended input/output)
    // DALL-E 3: ~$0.04/image × ~6 images
    // claude-svg: ~$0.015 (haiku, 1 batch call)
    const p = this.config.imageGeneration.provider;
    const imageCost = p === 'openai' ? 0.24 : p === 'claude-svg' ? 0.015 : 0;
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
   * ネタ帳ベースのバッチ実行
   *
   * neta.json の未処理エントリを消化してゲームを生成する。
   * 全エントリ消化後は通常の完全ランダム生成（run()）にフォールバックする。
   *
   * @param netaFile neta.json のファイルパス
   * @param count 生成するゲーム数（neta.json の残件数を上限とする）
   */
  async runFromNeta(netaFile: string, count: number = 1): Promise<BatchResult> {
    if (this.isRunning) {
      throw new Error('Already running');
    }

    // ネタ帳を読み込む
    if (!fs.existsSync(netaFile)) {
      throw new Error(`neta.json not found: ${netaFile}`);
    }

    const netaData = JSON.parse(fs.readFileSync(netaFile, 'utf-8')) as {
      version: string;
      description: string;
      totalCount: number;
      items: Array<{ id: number; title: string; idea: string; mechanic?: string; theme?: string }>;
    };

    // 進捗ファイルを読み込む（入力ファイルと同じディレクトリ、basename から -progress.json を生成）
    const baseName = path.basename(netaFile, '.json');
    const progressFile = path.join(path.dirname(netaFile), `${baseName}-progress.json`);
    let processedIds: Set<number> = new Set();

    if (fs.existsSync(progressFile)) {
      const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf-8')) as { processedIds: number[] };
      processedIds = new Set(progressData.processedIds);
      console.log(`   📖 Progress: ${processedIds.size}/${netaData.totalCount} items already processed`);
    } else {
      console.log(`   📖 Starting fresh neta generation (0/${netaData.totalCount} processed)`);
    }

    // 未処理エントリを取得
    const pendingItems = netaData.items.filter(item => !processedIds.has(item.id));

    if (pendingItems.length === 0) {
      console.log('\n✅ ネタ帳消化完了！完全ランダム生成モードに切り替えます。');
      console.log('   Use: npm run ai:v2 to continue with random generation\n');
      // ネタ帳消化後は通常の run() にフォールバック
      return this.run();
    }

    // 今回処理するエントリを選択
    const itemsToProcess = pendingItems.slice(0, count);
    const remaining = pendingItems.length - itemsToProcess.length;

    console.log(`\n📓 ネタ帳モード: ${itemsToProcess.length}件を生成`);
    console.log(`   残り ${remaining} 件（${processedIds.size + itemsToProcess.length}/${netaData.totalCount} 完了後 → ランダム生成に自動切替）`);

    this.isRunning = true;
    this.shouldStop = false;

    const startTime = Date.now();
    const results: GenerationResult[] = [];
    let passed = 0;
    let failed = 0;
    let totalCost = 0;

    console.log('\n' + '='.repeat(60));
    console.log('🎮 V2 Game Generation Batch (ネタ帳モード)');
    console.log('='.repeat(60));

    for (let i = 0; i < itemsToProcess.length && !this.shouldStop; i++) {
      const seed = itemsToProcess[i];
      console.log(`\n📦 Game ${i + 1}/${itemsToProcess.length} [ネタ #${seed.id}]`);

      // ロジックが合格するまで何度でも再生成する（maxGameAttempts で上限制御）
      const retryResult = await this.generateGameWithPersistentRetry(seed);

      if (retryResult === null) {
        // maxGameAttempts 超過 → スキップして処理済みにマーク
        console.log(`   ⏭️ Skipped: ネタ #${seed.id}`);
        failed++;
        processedIds.add(seed.id);
        fs.writeFileSync(
          progressFile,
          JSON.stringify({ processedIds: Array.from(processedIds) }, null, 2),
          'utf-8'
        );
        continue;
      }

      const { result } = retryResult;

      if (result.passed) {
        passed++;
        console.log(`   ✅ Passed: ${result.concept.title}`);

        this.saveGameLocally(result);

        if (this.uploader) {
          await this.uploadGame(result, seed);
        }
      } else {
        failed++;
        console.log(`   ❌ Failed: ${result.concept.title}`);
      }

      results.push(result);
      totalCost += result.estimatedCost;

      // 合格したときだけ処理済みとしてマーク
      processedIds.add(seed.id);
      fs.writeFileSync(
        progressFile,
        JSON.stringify({ processedIds: Array.from(processedIds) }, null, 2),
        'utf-8'
      );

      await this.delay(1000);
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

    // 残りのネタ帳状況を表示
    const finalRemaining = netaData.totalCount - processedIds.size;
    if (finalRemaining <= 0) {
      console.log('\n🎉 ネタ帳200件の消化完了！次回から完全ランダム生成モードになります。');
      console.log('   Use: npm run ai:v2 (ランダム生成)');
      // 最終レポートを生成
      console.log('\n📊 最終失敗パターンレポートを生成中...');
      const report = this.failureTracker.generateFinalReport();
      console.log(report);
    } else {
      console.log(`\n📓 残り ${finalRemaining}/${netaData.totalCount} 件 → 次回: npm run ai:neta`);
    }

    return batchResult;
  }

  /**
   * ロジック検証が合格するまで何度でも再生成を繰り返す。
   *
   * maxGameAttempts が Infinity の場合は成功するまで無制限にリトライ。
   * 各リトライは前回のエラーをフィードバックとして次の生成に渡す。
   *
   * @param seed ネタ帳のエントリ
   * @returns 成功した GenerationResult、または maxGameAttempts 超過時に null
   */
  private async generateGameWithPersistentRetry(
    seed?: { id: number; title: string; idea: string; mechanic?: string; theme?: string }
  ): Promise<{ result: GenerationResult; attempts: number } | null> {
    const maxAttempts = this.config.maxGameAttempts ?? Infinity;
    let attempts = 0;
    let lastFeedback: string | undefined;

    while (!this.shouldStop) {
      attempts++;

      if (maxAttempts !== Infinity && attempts > maxAttempts) {
        console.log(`   ⚠️ maxGameAttempts(${maxAttempts}) に達しました。スキップします。`);
        return null;
      }

      if (attempts > 1) {
        console.log(`   ♻️ 試行 ${attempts} 回目（ロジック再生成）...`);
      }

      try {
        // 動的ヒントを prevFeedback に追加
        const dynamicHints = this.failureTracker.generateDynamicHints();
        const feedbackWithHints = dynamicHints
          ? (lastFeedback ? lastFeedback + '\n' + dynamicHints : dynamicHints)
          : lastFeedback;

        const result = await this.generateSingleGame(seed, feedbackWithHints);
        if (attempts > 1) {
          console.log(`   ✅ ${attempts} 回目で合格`);
        }
        this.failureTracker.recordSuccess();
        return { result, attempts };
      } catch (error) {
        const msg = (error as Error).message;
        lastFeedback = msg;

        // 致命的エラー（リトライしても解決しないもの）は即座に停止
        if (this.isFatalError(msg)) {
          console.error(`   💀 致命的エラー（リトライ不可）: ${msg.substring(0, 200)}`);
          this.shouldStop = true;
          return null;
        }

        // エラーコードを抽出してパターン記録
        const errorCodes = this.extractErrorCodes(msg);
        const gameTitle = seed?.title ?? 'unknown';
        if (errorCodes.length > 0) {
          this.failureTracker.recordFailure(errorCodes, gameTitle);
        }

        console.log(`   ❌ 試行 ${attempts} 失敗: ${msg.substring(0, 120)}`);
        console.log(`   🔄 コンセプトから再生成します...`);
        // 短い待機を挟んでAPIレートリミットを避ける
        await this.delay(500);
      }
    }

    return null;
  }

  /**
   * リトライしても解決しない致命的エラーかどうかを判定する
   */
  private isFatalError(msg: string): boolean {
    const fatalPatterns = [
      'credit balance is too low',        // Anthropic クレジット不足
      'Your credit balance',              // 同上（別フォーマット）
      'insufficient_quota',               // OpenAI クォータ超過
      'billing_not_active',               // 課金未設定
      'account_deactivated',              // アカウント無効
      'invalid_api_key',                  // APIキー無効
      'authentication_error',             // 認証エラー
      'Permission denied',                // 権限エラー
    ];
    return fatalPatterns.some(pattern => msg.toLowerCase().includes(pattern.toLowerCase()));
  }

  /**
   * エラーメッセージから既知のエラーコードを抽出する
   */
  private extractErrorCodes(msg: string): string[] {
    const knownCodes = [
      'AUTO_SUCCESS', 'AUTO_FAILURE', 'INSTANT_WIN', 'INSTANT_LOSE',
      'NO_SUCCESS', 'NO_FAILURE', 'NO_PLAYER_ACTION', 'SUCCESS_FAILURE_CONFLICT',
      'CONFLICTING_TERMINATION', 'UNREACHABLE_SUCCESS', 'MISSING_COUNTER',
      'INVALID_COMPARISON', 'POOR_HORIZONTAL_DISTRIBUTION', 'MISSING_SOUND_ID',
      'ACTION_UNDEFINED_OBJECT', 'CONDITION_UNDEFINED_OBJECT'
    ];
    return knownCodes.filter(code => msg.includes(code));
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
