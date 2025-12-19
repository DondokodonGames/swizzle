/**
 * ImprovedMasterOrchestrator テスト実行
 *
 * 実行方法:
 *   npx tsx src/ai/run-improved.ts
 *
 * ドライラン（API呼び出しなし）:
 *   VITE_AI_DRY_RUN=true npx tsx src/ai/run-improved.ts
 *
 * 10本だけ生成:
 *   TARGET_GAMES=10 npx tsx src/ai/run-improved.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込み
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { ImprovedMasterOrchestrator, OrchestratorConfig } from './ImprovedMasterOrchestrator';

/**
 * 環境変数チェック
 */
function checkEnvironment(): void {
  // ドライランの場合はAPIキー不要
  if (process.env.VITE_AI_DRY_RUN === 'true') {
    console.log('🧪 Dry run mode - skipping API key check');
    return;
  }

  const required = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Create .env.local with:');
    console.error('   OPENAI_API_KEY=sk-...');
    console.error('   ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  // Supabase（オプション - アップロードに必要）
  const supabaseVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'MASTER_USER_ID'];
  const missingSupabase = supabaseVars.filter(key => !process.env[key]);
  if (missingSupabase.length > 0) {
    console.warn('⚠️ Supabase not configured - games will not be uploaded');
    console.warn('   Missing:', missingSupabase.join(', '));
  }
}

/**
 * 設定構築
 */
function buildConfig(): Partial<OrchestratorConfig> {
  return {
    targetGamesPerRun: parseInt(process.env.TARGET_GAMES || '10'),
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5'),
    costLimitPerGame: parseFloat(process.env.COST_LIMIT || '0.1'),
    qualityThreshold: parseFloat(process.env.QUALITY_THRESHOLD || '60'),
    dryRun: process.env.VITE_AI_DRY_RUN === 'true',
    privateMode: process.env.PRIVATE_MODE !== 'false', // デフォルトはtrue（レビュー用）
    imageGeneration: {
      provider: process.env.OPENAI_API_KEY ? 'openai' : 'mock',
      apiKey: process.env.OPENAI_API_KEY
    }
  };
}

/**
 * メイン
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🎮 Improved AI Game Generation System');
  console.log('='.repeat(60));

  // 環境チェック
  checkEnvironment();

  // 設定
  const config = buildConfig();
  console.log('\n📋 Configuration:');
  console.log(`   Target Games: ${config.targetGamesPerRun}`);
  console.log(`   Dry Run: ${config.dryRun ? 'YES' : 'NO'}`);
  console.log(`   Private Mode: ${config.privateMode ? 'YES (review)' : 'NO (publish)'}`);
  console.log(`   Quality Threshold: ${config.qualityThreshold}`);
  console.log(`   Cost Limit: $${config.costLimitPerGame}/game`);

  // Orchestrator初期化
  console.log('\n🚀 Initializing...');
  const orchestrator = new ImprovedMasterOrchestrator(config);

  // Ctrl+C で停止
  process.on('SIGINT', () => {
    console.log('\n\n⏹️ Stopping...');
    orchestrator.stop();
    setTimeout(() => {
      console.log('👋 Bye!');
      process.exit(0);
    }, 2000);
  });

  // 実行
  console.log('\n▶️ Starting generation...\n');
  const result = await orchestrator.run();

  // 結果サマリー
  console.log('\n✅ Generation completed!');
  console.log(`   Pass rate: ${(result.passRate * 100).toFixed(1)}%`);
  console.log(`   Total cost: $${result.totalCost.toFixed(4)}`);

  process.exit(0);
}

// 実行
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
