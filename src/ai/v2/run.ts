/**
 * V2 Game Generation Runner
 *
 * Usage:
 *   npx ts-node src/ai/v2/run.ts [count]
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY - Required for AI generation
 *   OPENAI_API_KEY    - Optional, enables DALL-E 3 image generation
 *   IMAGE_PROVIDER    - 'openai' | 'claude-svg' | 'mock' (default: auto-detect)
 *   SKIP_UPLOAD       - Set to 'true' to skip Supabase upload
 *   DRY_RUN           - Set to 'true' for dry run mode
 *   IMAGE_QA          - 'true' | 'false'（既定: openai プロバイダ時に有効）
 *   IMAGE_QA_MAX_RETRIES - QA不合格時の再生成上限（既定1、最大2）
 *   QUALITY_PUBLISH_THRESHOLD - このスコア未満は pending_review で未公開保存（既定70）
 *   SIMILARITY_GATE   - 'false' で類似度ゲートを無効化
 *   MAX_GAME_ATTEMPTS - ゲーム1本あたりの再生成上限（既定: 無制限、DRY_RUN時は5）
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Orchestrator } from './Orchestrator';
import { resolveImageQAFromEnv } from './AssetGenerator';

// .envと.env.localの両方を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🎮 V2 AI Game Generator');
  console.log('========================\n');

  // 環境変数のデバッグ出力
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const dryRun = process.env.DRY_RUN === 'true';

  // IMAGE_PROVIDER で明示指定、なければ鍵の有無で自動判定
  const imageProvider = (process.env.IMAGE_PROVIDER as 'openai' | 'mock' | 'claude-svg' | undefined)
    ?? (openaiApiKey ? 'openai' : 'mock');

  console.log(`🔑 ANTHROPIC_API_KEY: ${anthropicKey ? `設定済み (${anthropicKey.substring(0, 15)}...)` : '❌ 未設定'}`);
  console.log(`🔑 OPENAI_API_KEY: ${openaiApiKey ? `設定済み` : '未設定'}`);

  if (!anthropicKey && !dryRun) {
    console.error('❌ エラー: ANTHROPIC_API_KEY が設定されていません');
    console.error('   .env または .env.local に ANTHROPIC_API_KEY=sk-ant-... を設定してください');
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 1;

  console.log(`Target: ${count} games`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Image provider: ${imageProvider}`);
  console.log('');

  const maxGameAttempts = process.env.MAX_GAME_ATTEMPTS
    ? Math.max(1, parseInt(process.env.MAX_GAME_ATTEMPTS, 10))
    : undefined;

  // Create orchestrator
  const orchestrator = new Orchestrator({
    targetGamesPerRun: count,
    maxRetries: 3,
    ...(maxGameAttempts !== undefined ? { maxGameAttempts } : {}),
    dryRun,
    anthropicApiKey: anthropicKey,
    imageGeneration: {
      provider: imageProvider,
      apiKey: openaiApiKey,
      imageQA: resolveImageQAFromEnv(imageProvider)
    }
  });

  // Handle interruption
  process.on('SIGINT', () => {
    console.log('\n\n⏹️ Received SIGINT, stopping...');
    orchestrator.stop();
  });

  // Run
  try {
    const result = await orchestrator.run();

    console.log('\n📊 Summary:');
    console.log(`   Generated: ${result.totalGenerated}`);
    console.log(`   Passed: ${result.passed} (${(result.passRate * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Time: ${(result.totalTime / 1000).toFixed(1)}s`);
    console.log(`   Cost: $${result.totalCost.toFixed(4)}`);

    process.exit(result.passed > 0 ? 0 : 1);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
