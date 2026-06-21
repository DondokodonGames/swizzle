/**
 * CodeOrchestrator — JSサンドボックスゲーム生成パイプライン（3ステップ）
 *
 * Step 1: GameConceptGenerator  (既存クラスを再利用)
 * Step 2: CodeAssetPlanner      (新規 — 軽量アセット計画)
 * Step 3: CodeGameGenerator     (新規 — JS コード生成)
 * Step 4: AssetGenerator        (既存クラスを再利用)
 * Step 5: 組み立て & Supabaseアップロード
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { createLLMProvider } from '../v2/llm/index.js';
import { GameConceptGenerator } from '../v2/GameConceptGenerator.js';
import { AssetGenerator, AssetGeneratorConfig } from '../v2/AssetGenerator.js';
import { SupabaseUploader } from '../publishers/SupabaseUploader.js';
import { shouldAutoPublish } from '../v2/publishGate.js';
import { CodeAssetPlanner, CodeAssetPlan } from './CodeAssetPlanner.js';
import { CodeGameGenerator } from './CodeGameGenerator.js';
import { CodeGameProject } from '../../types/code-game/SwizzleGameAPI.js';
import { GameConcept, AssetPlan, ObjectPlan, SoundPlan, BgmPlan } from '../v2/types.js';

// .env と .env.local を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/** CodeAssetPlan → AssetPlan（既存AssetGeneratorの入力形式）に変換 */
function toAssetPlan(cap: CodeAssetPlan): AssetPlan {
  return {
    background: { description: cap.background.description, mood: cap.background.mood },
    objects: cap.objects.map(o => ({
      id: o.id,
      name: o.name,
      purpose: o.purpose,
      visualDescription: o.description,
      initialPosition: { x: 0.5, y: 0.5 },
      size: 'medium' as const,
    } satisfies ObjectPlan)),
    sounds: cap.sounds.map(s => ({
      id: s.id,
      trigger: s.trigger,
      type: s.type,
    } satisfies SoundPlan)),
    bgm: cap.bgm
      ? ({ id: cap.bgm.id, description: cap.bgm.description, mood: cap.bgm.mood } satisfies BgmPlan)
      : undefined,
  };
}

export interface CodeGenerationResult {
  success: boolean;
  gameId?: string;
  concept?: GameConcept;
  code?: string;
  error?: string;
}

export interface CodeOrchestratorConfig {
  dryRun?: boolean;
  skipUpload?: boolean;
  imageProvider?: 'mock' | 'claude-svg' | 'openai';
  qualityPublishThreshold?: number;
}

export class CodeOrchestrator {
  private config: CodeOrchestratorConfig;

  constructor(config: CodeOrchestratorConfig = {}) {
    this.config = {
      dryRun: false,
      skipUpload: false,
      imageProvider: 'mock',
      qualityPublishThreshold: 70,
      ...config,
    };
  }

  async generateOne(): Promise<CodeGenerationResult> {
    const isDry  = this.config.dryRun;
    const noUp   = this.config.skipUpload;
    const imgPro = this.config.imageProvider ?? 'mock';

    const llm = createLLMProvider({ provider: 'anthropic' });

    // ──────────────────────────────────────────
    // Step 1: GameConceptGenerator（既存を再利用）
    // ──────────────────────────────────────────
    console.log('\n🎮 Step 1: コンセプト生成...');
    let concept: GameConcept;

    if (isDry) {
      concept = {
        title: 'テストゲーム', titleEn: 'Test Game', description: 'テスト用のゲーム',
        duration: 10, theme: 'テスト', visualStyle: 'シンプル',
        playerGoal: 'ターゲットをタップする', playerOperation: '画面をタップ',
        successCondition: 'ターゲットを1回タップ', failureCondition: '10秒経過',
        selfEvaluation: { goalClarity: 9, operationClarity: 9, judgmentClarity: 9, acceptance: 9, reasoning: 'dry run' }
      };
    } else {
      const conceptGen = new GameConceptGenerator();
      concept = await conceptGen.generate();
    }

    console.log(`   ✅ コンセプト: ${concept.title}`);

    // ──────────────────────────────────────────
    // Step 2: CodeAssetPlanner
    // ──────────────────────────────────────────
    console.log('\n🎨 Step 2: アセット計画...');
    let assetPlan: CodeAssetPlan;

    if (isDry) {
      assetPlan = {
        background: { description: 'Simple dark background', mood: 'tense' },
        objects: [{ id: 'obj_target', name: 'ターゲット', description: 'A red circle target', purpose: 'タップ対象' }],
        sounds: [
          { id: 'se_tap',     trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時',   type: 'success' },
          { id: 'se_failure', trigger: '失敗時',   type: 'failure' },
        ],
        bgm: { id: 'bgm_main', description: 'Upbeat background music', mood: 'upbeat' },
      };
    } else {
      const planner = new CodeAssetPlanner(llm);
      assetPlan = await planner.plan(concept);
    }

    console.log(`   ✅ オブジェクト: ${assetPlan.objects.map(o => o.id).join(', ')}`);

    // ──────────────────────────────────────────
    // Step 3: CodeGameGenerator（JS コード生成）
    // ──────────────────────────────────────────
    console.log('\n💻 Step 3: JSコード生成...');
    let code: string;

    if (isDry) {
      // dry run時はサンプルゲームを使用
      try {
        const fs = await import('fs');
        const exPath = new URL('./examples/tap-target.js', import.meta.url).pathname;
        code = fs.readFileSync(exPath, 'utf-8');
      } catch {
        code = '(function(game){\n  game.onStart(function(){});\n  game.onUpdate(function(dt){ game.end.success(0); });\n})(game);';
      }
    } else {
      const codeGen = new CodeGameGenerator(llm);
      const result = await codeGen.generate(concept, assetPlan);
      code = result.code;
    }

    console.log(`   ✅ コード生成完了 (${code.length} chars)`);

    // ──────────────────────────────────────────
    // Step 4: AssetGenerator（既存を再利用）
    // ──────────────────────────────────────────
    console.log('\n🖼️  Step 4: アセット生成...');
    const assetGenConfig: AssetGeneratorConfig = {
      imageProvider: imgPro,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    };
    const assetGen = new AssetGenerator(assetGenConfig);
    const generatedAssets = await assetGen.generate(concept, toAssetPlan(assetPlan));

    console.log(`   ✅ 背景: ${generatedAssets.background ? 'OK' : 'なし'}, オブジェクト: ${generatedAssets.objects.length}個, 効果音: ${generatedAssets.sounds.length}個`);

    // ──────────────────────────────────────────
    // Step 5: CodeGameProject 組み立て
    // ──────────────────────────────────────────
    const now = new Date().toISOString();
    const gameId = randomUUID();

    const project: CodeGameProject = {
      id: gameId,
      name: concept.title,
      gameType: 'code',
      code,
      settings: {
        duration: { type: 'fixed', seconds: concept.duration },
        difficulty: 'normal',
        publishing: { isPublished: false, visibility: 'public', allowComments: true, allowRemix: false },
      },
      assets: {
        background: generatedAssets.background
          ? { id: generatedAssets.background.id, name: '背景', dataUrl: generatedAssets.background.frames[0]?.dataUrl }
          : null,
        objects: generatedAssets.objects.map(o => ({
          id: o.id,
          name: o.name,
          dataUrl: o.frames[0]?.dataUrl,
        })),
        audio: {
          bgm: generatedAssets.bgm
            ? { id: generatedAssets.bgm.id, dataUrl: generatedAssets.bgm.data }
            : null,
          se: generatedAssets.sounds.map(s => ({ id: s.id, dataUrl: s.data })),
        },
      },
      generatedBy: 'claude',
      createdAt: now,
      lastModified: now,
    };

    // ──────────────────────────────────────────
    // Step 6: Supabaseアップロード
    // ──────────────────────────────────────────
    if (noUp) {
      console.log('\n⏭️  アップロードをスキップ (SKIP_UPLOAD=true)');
      console.log('\n📋 生成コード プレビュー (最初の500文字):');
      console.log(code.slice(0, 500));
      return { success: true, gameId, concept, code };
    }

    console.log('\n☁️  Step 5: Supabaseアップロード...');
    const threshold = this.config.qualityPublishThreshold ?? 70;
    const autoPublish = shouldAutoPublish(75, threshold); // コードゲームは暫定75点

    const uploader = new SupabaseUploader();
    const uploadResult = await uploader.uploadGame(
      // CodeGameProject を GameProject キャストして渡す（JSONB として保存されるため問題なし）
      project as unknown as Parameters<typeof uploader.uploadGame>[0],
      75,
      { autoPublish, gameType: 'code', templateId: 'ai_code_generated' }
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error, concept, code };
    }

    console.log(`   ✅ アップロード完了: ${uploadResult.gameId}`);
    return { success: true, gameId: uploadResult.gameId, concept, code };
  }

  async generateBatch(count: number): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🎮 ゲーム ${i + 1} / ${count}`);
      console.log('='.repeat(50));

      try {
        const result = await this.generateOne();
        if (result.success) {
          succeeded++;
          console.log(`\n✅ 成功: ${result.concept?.title} (${result.gameId?.slice(0, 8)}...)`);
        } else {
          failed++;
          console.error(`\n❌ 失敗: ${result.error}`);
        }
      } catch (err) {
        failed++;
        console.error(`\n❌ 例外: ${err}`);
      }
    }

    return { succeeded, failed };
  }
}
