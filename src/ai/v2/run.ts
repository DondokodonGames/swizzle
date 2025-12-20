/**
 * V2 Game Generation Runner
 *
 * Usage:
 *   npx ts-node src/ai/v2/run.ts [count]
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY - Required for AI generation
 *   OPENAI_API_KEY - Optional for DALL-E 3 image generation
 *   SKIP_UPLOAD - Set to 'true' to skip Supabase upload
 *   DRY_RUN - Set to 'true' for dry run mode
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Orchestrator } from './Orchestrator';

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

  console.log(`🔑 ANTHROPIC_API_KEY: ${anthropicKey ? `設定済み (${anthropicKey.substring(0, 15)}...)` : '❌ 未設定'}`);
  console.log(`🔑 OPENAI_API_KEY: ${openaiApiKey ? `設定済み` : '未設定 (mockを使用)'}`);

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
  console.log(`Image provider: ${openaiApiKey ? 'openai' : 'mock'}`);
  console.log('');

  // Create orchestrator
  const orchestrator = new Orchestrator({
    targetGamesPerRun: count,
    maxRetries: 3,
    dryRun,
    anthropicApiKey: anthropicKey,
    imageGeneration: {
      provider: openaiApiKey ? 'openai' : 'mock',
      apiKey: openaiApiKey
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
