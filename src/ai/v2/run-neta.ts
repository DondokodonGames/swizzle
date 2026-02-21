/**
 * ネタ帳ベースのゲーム生成ランナー
 *
 * 使い方:
 *   npx tsx src/ai/v2/run-neta.ts [count]
 *
 * 動作:
 *   - neta.json の未処理エントリを1件ずつ消化してゲームを生成する
 *   - 進捗は neta-progress.json に自動保存される（中断・再開可能）
 *   - 200件全て消化後は完全ランダム生成（run.ts と同じ動作）に自動切替
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY - AI生成に必須
 *   OPENAI_API_KEY    - 画像生成（省略時はモック）
 *   SKIP_UPLOAD       - 'true' で Supabase アップロードをスキップ
 *   DRY_RUN           - 'true' でドライラン
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { Orchestrator } from './Orchestrator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('📓 ネタ帳ベース ゲームジェネレーター');
  console.log('====================================\n');

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const dryRun = process.env.DRY_RUN === 'true';

  console.log(`🔑 ANTHROPIC_API_KEY: ${anthropicKey ? `設定済み (${anthropicKey.substring(0, 15)}...)` : '❌ 未設定'}`);
  console.log(`🔑 OPENAI_API_KEY: ${openaiApiKey ? '設定済み' : '未設定 (mockを使用)'}`);

  if (!anthropicKey && !dryRun) {
    console.error('❌ エラー: ANTHROPIC_API_KEY が設定されていません');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 1;

  const netaFile = path.join(__dirname, 'neta.json');

  if (!fs.existsSync(netaFile)) {
    console.error(`❌ neta.json が見つかりません: ${netaFile}`);
    process.exit(1);
  }

  // 残件数を表示
  const netaData = JSON.parse(fs.readFileSync(netaFile, 'utf-8'));
  const progressFile = path.join(__dirname, 'neta-progress.json');
  let processedCount = 0;
  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    processedCount = (progress.processedIds || []).length;
  }
  const remaining = netaData.totalCount - processedCount;

  console.log(`\n📊 ネタ帳状況:`);
  console.log(`   総件数: ${netaData.totalCount}`);
  console.log(`   処理済: ${processedCount}`);
  console.log(`   残り:   ${remaining}`);
  console.log(`   今回:   ${Math.min(count, remaining)} 件を生成`);
  if (remaining <= 0) {
    console.log('\n   ⚠️  ネタ帳消化済み → 完全ランダム生成モードで起動します\n');
  }
  console.log(`   Dry run: ${dryRun}`);
  console.log(`   Image provider: ${openaiApiKey ? 'openai' : 'mock'}`);
  console.log('');

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

  process.on('SIGINT', () => {
    console.log('\n\n⏹️ 中断します（進捗は保存済みです）...');
    orchestrator.stop();
  });

  try {
    const result = await orchestrator.runFromNeta(netaFile, count);

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
