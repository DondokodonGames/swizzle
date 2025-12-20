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
import * as fs from 'fs';
import * as path from 'path';

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
      minFunScore: 7,
      dryRun: this.config.dryRun
    });

    this.logicGenerator = new ImprovedLogicGenerator({
      model: 'claude-3-5-haiku-latest',
      dryRun: this.config.dryRun
    });

    this.soundGenerator = new ImprovedSoundGenerator();

    // 画像生成（常に初期化 - APIキーがなければダミー画像を生成）
    this.imageGenerator = new ImageGenerator({
      provider: this.config.imageGeneration.provider as 'openai' | 'replicate' | undefined,
      openaiApiKey: this.config.imageGeneration.apiKey
    });

    // チェッカー初期化
    this.complianceChecker = new SpecificationComplianceChecker();
    this.funEvaluator = new FunEvaluator();

    // Supabaseアップローダー初期化（dryRunでなければ、SKIP_UPLOADでなければ）
    const skipUpload = process.env.SKIP_UPLOAD === 'true';
    if (!this.config.dryRun && !skipUpload) {
      try {
        this.uploader = new SupabaseUploader();
        console.log('   ✓ SupabaseUploader initialized');
      } catch (error) {
        console.warn('   ⚠️ SupabaseUploader not available:', (error as Error).message);
      }
    } else if (skipUpload) {
      console.log('   ⏭️ Upload skipped (SKIP_UPLOAD=true)');
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

          // ローカル保存（常に実行）
          this.saveGameLocally(result);

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

    // 2. アセットID作成
    const assetRefs = this.createMockAssets(idea);

    // 3. 画像アセット生成
    console.log('   🎨 Generating images...');
    const imageAssets = await this.generateImageAssets(idea, assetRefs);

    // 4. サウンド生成
    console.log('   🔊 Generating sounds...');
    const sounds = await this.soundGenerator.generateForGame(idea);

    // 5. ロジック生成
    console.log('   🧠 Generating logic...');
    const logicResult = await this.logicGenerator.generateFromIdea(idea, assetRefs);

    // 6. アセットをプロジェクトに統合
    logicResult.project.assets = {
      background: imageAssets.background,
      objects: imageAssets.objects,
      texts: [],
      audio: {
        bgm: sounds.bgm,
        se: sounds.effects
      },
      statistics: {
        totalImageSize: 0,
        totalAudioSize: 0,
        totalSize: 0,
        usedSlots: {
          background: imageAssets.background ? 1 : 0,
          objects: imageAssets.objects.length,
          texts: 0,
          bgm: sounds.bgm ? 1 : 0,
          se: sounds.effects.length
        },
        limitations: { isNearImageLimit: false, isNearAudioLimit: false, isNearTotalLimit: false, hasViolations: false }
      },
      lastModified: new Date().toISOString()
    };

    // 7. 仕様適合チェック（参考情報として記録、ブロッキングしない）
    console.log('   📋 Checking compliance (advisory only)...');
    const compliance = this.complianceChecker.check(idea, logicResult.project);
    if (!compliance.passed) {
      console.log(`      ℹ️ Compliance advisory: score=${compliance.score}, issues=${compliance.violations.length}`);
    }

    // 8. 面白さ評価（FunEvaluatorのplayabilityチェックが重要）
    const funResult = this.funEvaluator.evaluate(logicResult.project, idea);

    // 9. 合格判定（コンプライアンスはアドバイザリーのみ、FunScoreで判定）
    const passed = funResult.funScore >= 50;

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
   * 画像アセット生成
   */
  private async generateImageAssets(idea: GameIdea, assetRefs: AssetReferences): Promise<{
    background: any;
    objects: any[];
  }> {
    if (!this.imageGenerator) {
      console.log('      ⚠️ ImageGenerator not available, using placeholders');
      return { background: null, objects: [] };
    }

    const now = new Date().toISOString();

    // メカニクスに基づいた英語プロンプトを生成
    const prompts = this.generateImagePrompts(idea);

    // 背景生成
    let background = null;
    try {
      const bgFrames = await this.imageGenerator.generateBackground({
        prompt: prompts.background,
        style: 'cute' as const,
        type: 'background',
        frameCount: 1,
        dimensions: { width: 1080, height: 1920 },
        colorPalette: ['#87CEEB', '#98FB98', '#FFB6C1', '#DDA0DD']
      });
      background = {
        id: assetRefs.backgroundId || 'bg_main',
        name: `${idea.theme} 背景`,
        frames: bgFrames,
        createdAt: now,
        lastModified: now
      };
      console.log('      ✅ Background generated');
    } catch (error) {
      console.log('      ⚠️ Background generation failed:', (error as Error).message);
    }

    // オブジェクト生成（各オブジェクトに異なる役割のプロンプト）
    const objects: any[] = [];
    for (let i = 0; i < assetRefs.objectIds.length; i++) {
      try {
        const objectPrompt = prompts.objects[i] || prompts.objects[0];
        const objFrames = await this.imageGenerator.generateObject({
          prompt: objectPrompt,
          style: 'cute' as const,
          type: 'object',
          frameCount: 1,
          dimensions: { width: 256, height: 256 },
          colorPalette: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181']
        });
        objects.push({
          id: assetRefs.objectIds[i],
          name: `オブジェクト ${i + 1}`,
          frames: objFrames,
          createdAt: now,
          lastModified: now
        });
      } catch (error) {
        console.log(`      ⚠️ Object ${i + 1} generation failed:`, (error as Error).message);
      }
    }
    console.log(`      ✅ ${objects.length} objects generated`);

    return { background, objects };
  }

  /**
   * メカニクスに基づいた英語画像プロンプトを生成
   * DALL-E 3の安全システムに引っかからないよう、英語で明確なゲームアセット指示
   */
  private generateImagePrompts(idea: GameIdea): { background: string; objects: string[] } {
    // メカニクス別のオブジェクト役割マッピング
    const mechanicPrompts: Record<string, { bg: string; objects: string[] }> = {
      'tap-target': {
        bg: 'simple colorful game background, bright sky, cheerful atmosphere',
        objects: [
          'cute round target icon, friendly face, game collectible',
          'star shaped bonus item, golden sparkle',
          'heart shaped power-up, glowing effect',
          'diamond gem icon, shiny crystal',
          'coin icon, gold medal reward'
        ]
      },
      'tap-avoid': {
        bg: 'game arena background, safe zone, clean design',
        objects: [
          'friendly character icon, cute mascot, round shape',
          'red warning circle, danger symbol, simple',
          'green safe zone marker, checkmark',
          'bonus star, golden reward icon',
          'shield icon, protection symbol'
        ]
      },
      'catch-falling': {
        bg: 'vertical game background, sky theme, clouds',
        objects: [
          'cute basket or net, catching tool',
          'falling apple fruit, red and shiny',
          'falling star, golden sparkle',
          'falling candy, colorful sweet',
          'falling coin, gold treasure'
        ]
      },
      'dodge-moving': {
        bg: 'obstacle course background, clean path',
        objects: [
          'player character, cute hero, round shape',
          'moving obstacle, simple geometric shape',
          'safe platform, green zone',
          'danger zone marker, red warning',
          'goal flag, finish line'
        ]
      },
      'timing-action': {
        bg: 'target practice background, bulls-eye theme',
        objects: [
          'moving target indicator, arrow marker',
          'success zone, green highlight area',
          'timing bar, progress indicator',
          'score multiplier, bonus icon',
          'perfect hit marker, star burst'
        ]
      },
      'collect-items': {
        bg: 'treasure hunt background, adventure theme',
        objects: [
          'treasure chest, golden box',
          'gem stone, colorful jewel',
          'golden key icon, unlock symbol',
          'magic potion bottle, glowing',
          'lucky clover, green fortune'
        ]
      },
      'chase-target': {
        bg: 'chase game background, open field',
        objects: [
          'runner character, fast motion',
          'chasing target, escaping icon',
          'speed boost, lightning symbol',
          'trap icon, slow down marker',
          'finish goal, destination marker'
        ]
      },
      'match-pattern': {
        bg: 'puzzle game background, grid pattern',
        objects: [
          'matching card, face down mystery',
          'matched pair indicator, check mark',
          'hint icon, light bulb symbol',
          'timer icon, clock symbol',
          'score star, achievement'
        ]
      },
      'reaction-test': {
        bg: 'reaction game background, focus zone',
        objects: [
          'reaction target, sudden appear icon',
          'ready signal, countdown marker',
          'go signal, green light',
          'stop signal, red light',
          'fast reaction star, quick reward'
        ]
      },
      'tap-sequence': {
        bg: 'sequence puzzle background, numbered zones',
        objects: [
          'number 1 button, first in sequence',
          'number 2 button, second in sequence',
          'number 3 button, third in sequence',
          'wrong order indicator, X mark',
          'sequence complete star'
        ]
      },
      'tap-rhythm': {
        bg: 'music rhythm background, beat pattern',
        objects: [
          'rhythm note, music beat marker',
          'perfect hit zone, timing target',
          'good hit indicator, green flash',
          'miss indicator, red flash',
          'combo counter star'
        ]
      },
      'swipe-direction': {
        bg: 'direction game background, arrow theme',
        objects: [
          'swipe arrow, direction indicator',
          'left arrow, swipe left marker',
          'right arrow, swipe right marker',
          'up arrow, swipe up marker',
          'down arrow, swipe down marker'
        ]
      },
      'drag-drop': {
        bg: 'puzzle sorting background, target zones',
        objects: [
          'draggable item, movable object',
          'drop target zone, destination area',
          'correct placement indicator, checkmark',
          'wrong placement marker, X sign',
          'completion star'
        ]
      },
      'hold-release': {
        bg: 'power charging background, energy theme',
        objects: [
          'power meter, charging bar',
          'hold button, press and hold target',
          'release zone, sweet spot indicator',
          'overcharge warning, danger zone',
          'perfect release star'
        ]
      },
      'count-objects': {
        bg: 'counting game background, clean display',
        objects: [
          'countable item, simple shape',
          'another countable, different color',
          'answer button 1, number choice',
          'answer button 2, number choice',
          'correct answer star'
        ]
      },
      'find-different': {
        bg: 'spot difference background, comparison theme',
        objects: [
          'normal item, common object',
          'different item, odd one out',
          'hint highlight, attention marker',
          'found indicator, checkmark',
          'time bonus star'
        ]
      },
      'memory-match': {
        bg: 'memory game background, card grid',
        objects: [
          'card back, face down card',
          'card front A, matching pair',
          'card front B, matching pair',
          'matched indicator, completed pair',
          'memory star, bonus reward'
        ]
      },
      'protect-target': {
        bg: 'defense game background, fortress theme',
        objects: [
          'protected target, valuable item',
          'incoming threat, danger object',
          'shield icon, defense tool',
          'damage indicator, hit marker',
          'survive bonus star'
        ]
      },
      'balance-game': {
        bg: 'balance game background, scale theme',
        objects: [
          'balance beam, tilting platform',
          'weight object, balance item',
          'center indicator, balance zone',
          'tilt warning, danger angle',
          'stability star'
        ]
      }
    };

    // デフォルトプロンプト
    const defaultPrompts = {
      bg: 'mobile game background, cheerful colors, simple clean design',
      objects: [
        'cute game character icon, friendly mascot',
        'target icon, tap here marker',
        'bonus item, reward star',
        'score indicator, points symbol',
        'game power-up, special ability'
      ]
    };

    const prompts = mechanicPrompts[idea.mainMechanic] || defaultPrompts;

    return {
      background: prompts.bg + ', mobile game asset, high quality illustration',
      objects: prompts.objects.map(obj => obj + ', game sprite, transparent background, simple icon style')
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
   * ゲームをローカルに保存
   */
  private saveGameLocally(result: GeneratedGameResult): void {
    try {
      // 保存ディレクトリ
      const outputDir = path.resolve(process.cwd(), 'public/generated-games');

      // ディレクトリがなければ作成
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`   📁 Created directory: ${outputDir}`);
      }

      // ファイル名を生成（タイトルをサニタイズ）
      const safeTitle = result.idea.titleEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const filename = `${result.id}_${safeTitle}.json`;
      const filepath = path.join(outputDir, filename);

      // ゲームデータを構築
      const gameData = {
        id: result.id,
        idea: result.idea,
        project: result.project,
        sounds: result.sounds,
        compliance: result.compliance,
        funScore: result.funScore,
        passed: result.passed,
        generationTime: result.generationTime,
        estimatedCost: result.estimatedCost,
        generatedAt: new Date().toISOString()
      };

      // JSON保存
      fs.writeFileSync(filepath, JSON.stringify(gameData, null, 2), 'utf-8');
      console.log(`   💾 Saved locally: ${filename}`);
    } catch (error) {
      console.error(`   ❌ Failed to save locally: ${(error as Error).message}`);
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
