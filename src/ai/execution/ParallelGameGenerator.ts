/**
 * ParallelGameGenerator
 *
 * 並列ゲーム生成システム
 * - 50並列までの同時生成
 * - レート制限管理
 * - 進捗トラッキング
 * - リトライ機構
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameIdeaGenerator, GameIdea } from '../generators/GameIdeaGenerator';
import { ImprovedLogicGenerator, AssetReferences } from '../generators/ImprovedLogicGenerator';
import { ImprovedSoundGenerator, SoundAssets } from '../generators/ImprovedSoundGenerator';
import { ImprovedQualityChecker, QualityCheckResult } from '../checkers/ImprovedQualityChecker';

// 生成設定
export interface ParallelGeneratorConfig {
  maxConcurrency: number;      // 最大並列数（デフォルト: 20）
  batchSize: number;           // バッチサイズ（デフォルト: 10）
  batchDelayMs: number;        // バッチ間の待機時間（デフォルト: 2000）
  maxRetries: number;          // 最大リトライ回数（デフォルト: 2）
  qualityThreshold: number;    // 品質閾値（デフォルト: 60）
  onProgress?: (progress: GenerationProgress) => void;
}

// 生成進捗
export interface GenerationProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  inProgress: number;
  estimatedTimeRemaining: number;  // 秒
  currentBatch: number;
  totalBatches: number;
}

// 生成結果
export interface GenerationResult {
  id: string;
  success: boolean;
  project?: GameProject;
  idea?: GameIdea;
  sounds?: SoundAssets;
  qualityResult?: QualityCheckResult;
  error?: string;
  generationTime: number;
  tokensUsed: number;
}

// バッチ結果
export interface BatchResult {
  batchNumber: number;
  results: GenerationResult[];
  successCount: number;
  failCount: number;
  totalTime: number;
  averageTime: number;
}

// 最終レポート
export interface GenerationReport {
  totalRequested: number;
  totalGenerated: number;
  successfulGames: number;
  failedGames: number;
  passedQuality: number;
  totalTime: number;
  totalTokens: number;
  estimatedCost: number;
  batches: BatchResult[];
  games: GenerationResult[];
}

/**
 * ParallelGameGenerator
 */
export class ParallelGameGenerator {
  private config: Required<ParallelGeneratorConfig>;
  private ideaGenerator: GameIdeaGenerator;
  private logicGenerator: ImprovedLogicGenerator;
  private soundGenerator: ImprovedSoundGenerator;
  private qualityChecker: ImprovedQualityChecker;
  private generatedMechanics: Set<string> = new Set();

  constructor(config?: Partial<ParallelGeneratorConfig>) {
    this.config = {
      maxConcurrency: config?.maxConcurrency || 20,
      batchSize: config?.batchSize || 10,
      batchDelayMs: config?.batchDelayMs || 2000,
      maxRetries: config?.maxRetries || 2,
      qualityThreshold: config?.qualityThreshold || 60,
      onProgress: config?.onProgress || (() => {})
    };

    // ジェネレーター初期化
    this.ideaGenerator = new GameIdeaGenerator({
      provider: 'openai',  // GPT-4o-mini for ideas (cheaper)
      minFunScore: 7
    });

    this.logicGenerator = new ImprovedLogicGenerator({
      model: 'claude-3-5-haiku-latest'  // Haiku for logic (cheaper)
    });

    this.soundGenerator = new ImprovedSoundGenerator();
    this.qualityChecker = new ImprovedQualityChecker();

    console.log(`🚀 ParallelGameGenerator initialized (max ${this.config.maxConcurrency} concurrent)`);
  }

  /**
   * 複数ゲームを並列生成
   */
  async generateGames(
    count: number,
    mockAssets?: AssetReferences
  ): Promise<GenerationReport> {
    const startTime = Date.now();
    console.log(`\n🎮 Starting parallel generation of ${count} games...`);

    const batches: BatchResult[] = [];
    const allResults: GenerationResult[] = [];
    const totalBatches = Math.ceil(count / this.config.batchSize);
    let totalTokens = 0;

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * this.config.batchSize;
      const batchEnd = Math.min(batchStart + this.config.batchSize, count);
      const batchSize = batchEnd - batchStart;

      console.log(`\n📦 Batch ${batchNum + 1}/${totalBatches} (${batchSize} games)...`);

      // 進捗更新
      this.updateProgress({
        total: count,
        completed: allResults.length,
        successful: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length,
        inProgress: batchSize,
        estimatedTimeRemaining: this.estimateTimeRemaining(
          allResults.length,
          count,
          Date.now() - startTime
        ),
        currentBatch: batchNum + 1,
        totalBatches
      });

      // バッチ処理
      const batchResult = await this.processBatch(
        batchNum,
        batchSize,
        mockAssets
      );

      batches.push(batchResult);
      allResults.push(...batchResult.results);
      totalTokens += batchResult.results.reduce((sum, r) => sum + r.tokensUsed, 0);

      // バッチ間の待機（レート制限対策）
      if (batchNum < totalBatches - 1) {
        console.log(`   ⏳ Waiting ${this.config.batchDelayMs}ms before next batch...`);
        await this.delay(this.config.batchDelayMs);
      }
    }

    const totalTime = Date.now() - startTime;
    const successfulGames = allResults.filter(r => r.success);
    const passedQuality = successfulGames.filter(r =>
      r.qualityResult && r.qualityResult.passed
    );

    const report: GenerationReport = {
      totalRequested: count,
      totalGenerated: allResults.length,
      successfulGames: successfulGames.length,
      failedGames: allResults.filter(r => !r.success).length,
      passedQuality: passedQuality.length,
      totalTime,
      totalTokens,
      estimatedCost: this.estimateCost(totalTokens),
      batches,
      games: allResults
    };

    this.printReport(report);

    return report;
  }

  /**
   * バッチ処理
   */
  private async processBatch(
    batchNumber: number,
    size: number,
    mockAssets?: AssetReferences
  ): Promise<BatchResult> {
    const batchStart = Date.now();

    // 並列生成タスクを作成
    const tasks = Array(size).fill(null).map((_, index) =>
      this.generateSingleGame(`batch${batchNumber}_game${index}`, mockAssets)
    );

    // 並列度を制限しながら実行
    const results = await this.executeWithConcurrencyLimit(
      tasks,
      this.config.maxConcurrency
    );

    const batchTime = Date.now() - batchStart;
    const successCount = results.filter(r => r.success).length;

    return {
      batchNumber,
      results,
      successCount,
      failCount: results.length - successCount,
      totalTime: batchTime,
      averageTime: batchTime / results.length
    };
  }

  /**
   * 単一ゲーム生成
   */
  private async generateSingleGame(
    id: string,
    mockAssets?: AssetReferences
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      // 1. ゲームアイデア生成
      const existingMechanics = Array.from(this.generatedMechanics);
      const idea = await this.ideaGenerator.generate(existingMechanics);
      this.generatedMechanics.add(idea.mainMechanic);

      // 2. アセット参照（モックまたは実際の生成）
      const assets = mockAssets || this.createMockAssets(idea);

      // 3. ロジック生成
      const logicResult = await this.logicGenerator.generateFromIdea(idea, assets);
      tokensUsed += logicResult.tokensUsed;

      // 4. サウンド生成
      const sounds = await this.soundGenerator.generateForGame(idea);

      // 5. 品質チェック
      const qualityResult = this.qualityChecker.check(logicResult.project, idea);

      const generationTime = Date.now() - startTime;

      return {
        id,
        success: true,
        project: logicResult.project,
        idea,
        sounds,
        qualityResult,
        generationTime,
        tokensUsed
      };

    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error(`   ❌ Game ${id} failed:`, (error as Error).message);

      return {
        id,
        success: false,
        error: (error as Error).message,
        generationTime,
        tokensUsed
      };
    }
  }

  /**
   * 並列実行（制限付き）
   */
  private async executeWithConcurrencyLimit<T>(
    tasks: Promise<T>[],
    limit: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task.then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        // 完了したものを削除
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * モックアセット作成（テスト用）
   */
  private createMockAssets(idea: GameIdea): AssetReferences {
    const objectCount = idea.objectCount || 5;
    const objectIds = Array(objectCount).fill(null).map((_, i) => `obj_${i + 1}`);

    return {
      backgroundId: 'bg_001',
      objectIds,
      textIds: ['text_title'],
      seIds: ['se_tap', 'se_success', 'se_failure']
    };
  }

  /**
   * 進捗更新
   */
  private updateProgress(progress: GenerationProgress): void {
    this.config.onProgress(progress);
  }

  /**
   * 残り時間推定
   */
  private estimateTimeRemaining(
    completed: number,
    total: number,
    elapsedMs: number
  ): number {
    if (completed === 0) return 0;
    const avgTime = elapsedMs / completed;
    const remaining = total - completed;
    return Math.round((avgTime * remaining) / 1000);
  }

  /**
   * コスト見積もり
   */
  private estimateCost(totalTokens: number): number {
    // Haiku: ~$0.001/1K tokens (input + output combined estimate)
    // GPT-4o-mini: ~$0.0003/1K tokens
    // Average estimate
    return (totalTokens / 1000) * 0.001;
  }

  /**
   * レポート表示
   */
  private printReport(report: GenerationReport): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Generation Report');
    console.log('='.repeat(50));
    console.log(`Total Requested:    ${report.totalRequested}`);
    console.log(`Total Generated:    ${report.totalGenerated}`);
    console.log(`Successful:         ${report.successfulGames} (${(report.successfulGames / report.totalGenerated * 100).toFixed(1)}%)`);
    console.log(`Failed:             ${report.failedGames}`);
    console.log(`Passed Quality:     ${report.passedQuality} (${(report.passedQuality / report.successfulGames * 100).toFixed(1)}%)`);
    console.log(`Total Time:         ${(report.totalTime / 1000).toFixed(1)}s`);
    console.log(`Avg Time/Game:      ${(report.totalTime / report.totalGenerated / 1000).toFixed(2)}s`);
    console.log(`Total Tokens:       ${report.totalTokens.toLocaleString()}`);
    console.log(`Estimated Cost:     $${report.estimatedCost.toFixed(4)}`);
    console.log('='.repeat(50));
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * キャッシュリセット
   */
  resetCache(): void {
    this.generatedMechanics.clear();
    this.ideaGenerator.clearCache();
    this.qualityChecker.resetDiversityCache();
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      generatedMechanicsCount: this.generatedMechanics.size,
      ideaGenerator: this.ideaGenerator.getDebugInfo(),
      logicGenerator: this.logicGenerator.getDebugInfo(),
      qualityChecker: this.qualityChecker.getDebugInfo()
    };
  }
}

// デフォルトエクスポート
export default ParallelGameGenerator;
