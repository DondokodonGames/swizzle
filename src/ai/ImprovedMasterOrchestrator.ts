/**
 * ImprovedMasterOrchestrator
 *
 * 改善されたAI自動ゲーム生成システム
 * - GameIdeaGenerator: 動的テーマ・アイデア生成
 * - ImprovedLogicGenerator: エンジン仕様準拠のロジック生成
 * - ImprovedSoundGenerator: Web Audio API効果音
 * - SpecificationComplianceChecker: 仕様適合性チェック
 * - 100本/日 → 1000本/日へスケール可能な設計
 */

import { GameIdeaGenerator, GameIdea } from './generators/GameIdeaGenerator';
import { ImprovedLogicGenerator, AssetReferences } from './generators/ImprovedLogicGenerator';
import { ImprovedSoundGenerator, SoundAssets } from './generators/ImprovedSoundGenerator';
import { ImageGenerator } from './generators/ImageGenerator';
import { SpecificationComplianceChecker, ComplianceResult } from './checkers/SpecificationComplianceChecker';
import { FunEvaluator } from './checkers/FunEvaluator';
import { SupabaseUploader } from './publishers/SupabaseUploader';
import { GameProject } from '../types/editor/GameProject';

// 設定
export interface OrchestratorConfig {
  targetGamesPerRun: number;     // 1回の実行で生成するゲーム数
  maxConcurrency: number;        // 最大並列数
  costLimitPerGame: number;      // 1ゲームあたりのコスト上限（USD）
  qualityThreshold: number;      // 品質閾値（0-100）
  dryRun: boolean;               // ドライラン（公開しない）
  privateMode: boolean;          // プライベートモード（レビュー用）
  imageGeneration: {
    provider: 'openai' | 'replicate' | 'mock';
    apiKey?: string;
  };
}

// 生成結果
export interface GeneratedGameResult {
  id: string;
  idea: GameIdea;
  project: GameProject;
  sounds: SoundAssets;
  compliance: ComplianceResult;
  funScore: number;
  passed: boolean;
  generationTime: number;
  estimatedCost: number;
}

// バッチ結果
export interface BatchResult {
  totalGenerated: number;
  passed: number;
  failed: number;
  passRate: number;
  totalTime: number;
  totalCost: number;
  games: GeneratedGameResult[];
}

// デフォルト設定
const DEFAULT_CONFIG: OrchestratorConfig = {
  targetGamesPerRun: 100,
  maxConcurrency: 10,
  costLimitPerGame: 0.1,
  qualityThreshold: 60,
  dryRun: false,
  privateMode: true,
  imageGeneration: {
    provider: 'mock'
  }
};

/**
 * ImprovedMasterOrchestrator
 */
export class ImprovedMasterOrchestrator {
  private config: OrchestratorConfig;
  private ideaGenerator: GameIdeaGenerator;
  private logicGenerator: ImprovedLogicGenerator;
  private soundGenerator: ImprovedSoundGenerator;
  private imageGenerator?: ImageGenerator;
  private complianceChecker: SpecificationComplianceChecker;
  private funEvaluator: FunEvaluator;
  private uploader?: SupabaseUploader;

  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // ジェネレーター初期化
    this.ideaGenerator = new GameIdeaGenerator({
      provider: 'openai',
      minFunScore: 7
    });

    this.logicGenerator = new ImprovedLogicGenerator({
      model: 'claude-3-5-haiku-latest'
    });

    this.soundGenerator = new ImprovedSoundGenerator();

    // 画像生成（オプション）
    if (this.config.imageGeneration.provider !== 'mock' && this.config.imageGeneration.apiKey) {
      this.imageGenerator = new ImageGenerator({
        provider: this.config.imageGeneration.provider as 'openai',
        openaiApiKey: this.config.imageGeneration.apiKey
      });
    }

    // チェッカー初期化
    this.complianceChecker = new SpecificationComplianceChecker();
    this.funEvaluator = new FunEvaluator();

    // Supabaseアップローダー初期化（dryRunでなければ）
    if (!this.config.dryRun) {
      try {
        this.uploader = new SupabaseUploader();
        console.log('   ✓ SupabaseUploader initialized');
      } catch (error) {
        console.warn('   ⚠️ SupabaseUploader not available:', (error as Error).message);
      }
    }

    console.log('🚀 ImprovedMasterOrchestrator initialized');
    console.log(`   Target: ${this.config.targetGamesPerRun} games`);
    console.log(`   Cost limit: $${this.config.costLimitPerGame}/game`);
    console.log(`   Mode: ${this.config.privateMode ? 'Private (review)' : 'Public'}`);
  }

  /**
   * ゲーム生成バッチ実行
   */
  async run(): Promise<BatchResult> {
    if (this.isRunning) {
      throw new Error('Already running');
    }

    this.isRunning = true;
    this.shouldStop = false;

    const startTime = Date.now();
    const results: GeneratedGameResult[] = [];
    let passed = 0;
    let failed = 0;
    let totalCost = 0;

    console.log('\n' + '='.repeat(60));
    console.log('🎮 Starting game generation batch');
    console.log('='.repeat(60));

    for (let i = 0; i < this.config.targetGamesPerRun && !this.shouldStop; i++) {
      console.log(`\n📦 Game ${i + 1}/${this.config.targetGamesPerRun}`);

      try {
        const result = await this.generateSingleGame();

        if (result.passed) {
          passed++;
          console.log(`   ✅ Passed: ${result.idea.title} (score: ${result.compliance.score})`);

          // 公開処理（ドライランでなければ）
          if (!this.config.dryRun) {
            await this.publishGame(result);
          }
        } else {
          failed++;
          console.log(`   ❌ Failed: ${result.idea.title}`);
          console.log(`      Violations: ${result.compliance.violations.map(v => v.message).join(', ')}`);
        }

        results.push(result);
        totalCost += result.estimatedCost;

        // 進捗表示（10ゲームごと）
        if ((i + 1) % 10 === 0) {
          this.printProgress(i + 1, passed, failed, totalCost);
        }

        // レート制限対策
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
      passRate: passed / results.length,
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
  private async generateSingleGame(): Promise<GeneratedGameResult> {
    const startTime = Date.now();
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 1. アイデア生成
    console.log('   📋 Generating idea...');
    const idea = await this.ideaGenerator.generate();
    console.log(`      Title: ${idea.title} (${idea.mainMechanic})`);

    // 2. モックアセット作成（画像生成は別途実装）
    const assets = this.createMockAssets(idea);

    // 3. ロジック生成
    console.log('   🧠 Generating logic...');
    const logicResult = await this.logicGenerator.generateFromIdea(idea, assets);

    // 4. サウンド生成
    console.log('   🔊 Generating sounds...');
    const sounds = await this.soundGenerator.generateForGame(idea);

    // 5. 仕様適合チェック
    console.log('   📋 Checking compliance...');
    const compliance = this.complianceChecker.check(idea, logicResult.project);

    // 6. 面白さ評価
    const funResult = this.funEvaluator.evaluate(logicResult.project, idea);

    // 7. 合格判定
    const passed = compliance.passed &&
                   compliance.score >= this.config.qualityThreshold &&
                   funResult.funScore >= 50;

    const generationTime = Date.now() - startTime;
    const estimatedCost = this.estimateCost(logicResult.tokensUsed);

    return {
      id: gameId,
      idea,
      project: logicResult.project,
      sounds,
      compliance,
      funScore: funResult.funScore,
      passed,
      generationTime,
      estimatedCost
    };
  }

  /**
   * モックアセット作成
   */
  private createMockAssets(idea: GameIdea): AssetReferences {
    const objectCount = idea.objectCount || 5;
    const objectIds = Array(objectCount).fill(null).map((_, i) =>
      `${idea.titleEn.toLowerCase().replace(/\s+/g, '_')}_obj_${i + 1}`
    );

    return {
      backgroundId: `bg_${idea.theme.replace(/[・\s]/g, '_')}`,
      objectIds,
      textIds: ['text_score', 'text_timer'],
      seIds: ['se_tap', 'se_success', 'se_failure', 'se_collect']
    };
  }

  /**
   * ゲーム公開（Supabaseへアップロード）
   */
  private async publishGame(result: GeneratedGameResult): Promise<void> {
    if (!this.uploader) {
      console.log(`   ⚠️ Uploader not available, skipping publish`);
      return;
    }

    console.log(`   📤 Uploading: ${result.idea.title}`);

    // プライベートモードの場合は is_published = false
    const autoPublish = !this.config.privateMode;

    const uploadResult = await this.uploader.uploadGame(
      result.project,
      result.compliance.score,
      autoPublish
    );

    if (uploadResult.success) {
      console.log(`   ✅ Uploaded: ${uploadResult.gameId}`);
      console.log(`      URL: ${uploadResult.url}`);
      console.log(`      Published: ${autoPublish}`);
    } else {
      console.error(`   ❌ Upload failed: ${uploadResult.error}`);
    }
  }

  /**
   * コスト見積もり
   */
  private estimateCost(tokensUsed: number): number {
    // Claude Haiku: $0.25/1M input, $1.25/1M output (roughly $0.004/game)
    // GPT-4o-mini: $0.15/1M input, $0.6/1M output (roughly $0.001/game)
    // Combined estimate
    return tokensUsed * 0.0000015; // rough average
  }

  /**
   * 進捗表示
   */
  private printProgress(current: number, passed: number, failed: number, cost: number): void {
    const passRate = (passed / current * 100).toFixed(1);
    console.log(`\n   📊 Progress: ${current}/${this.config.targetGamesPerRun}`);
    console.log(`      Passed: ${passed} (${passRate}%)`);
    console.log(`      Failed: ${failed}`);
    console.log(`      Cost: $${cost.toFixed(4)}`);
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
    console.log(`Avg Cost/Game: $${(result.totalCost / result.totalGenerated).toFixed(6)}`);
    console.log('='.repeat(60));

    // テーマ・メカニクスの分布
    const themes = result.games.map(g => g.idea.theme);
    const mechanics = result.games.map(g => g.idea.mainMechanic);
    console.log(`\nUnique Themes: ${new Set(themes).size}`);
    console.log(`Unique Mechanics: ${new Set(mechanics).size}`);

    // 合格ゲームのリスト
    if (result.passed > 0) {
      console.log('\n✅ Passed Games:');
      result.games
        .filter(g => g.passed)
        .forEach((g, i) => {
          console.log(`   ${i + 1}. ${g.idea.title} (${g.idea.mainMechanic}) - Score: ${g.compliance.score}`);
        });
    }
  }

  /**
   * 停止
   */
  stop(): void {
    console.log('⏹️ Stopping...');
    this.shouldStop = true;
  }

  /**
   * キャッシュリセット
   */
  resetCache(): void {
    this.ideaGenerator.clearCache();
    console.log('🔄 Cache cleared');
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
      ideaGenerator: this.ideaGenerator.getDebugInfo(),
      logicGenerator: this.logicGenerator.getDebugInfo()
    };
  }
}

// デフォルトエクスポート
export default ImprovedMasterOrchestrator;
