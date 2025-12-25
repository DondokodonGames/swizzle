/**
 * PromptEvolver Runner
 *
 * ロジックのみを生成・検証し、エラーパターンを分析して
 * プロンプト改善提案を生成する自己回帰的改善システム
 *
 * Usage:
 *   npm run ai:evolve       # デフォルト10本
 *   npm run ai:evolve:100   # 100本テスト
 *   npm run ai:evolve:1000  # 1000本テスト
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PromptEvolver } from './PromptEvolver';

// .envと.env.localの両方を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🧬 PromptEvolver - Self-Improving Prompt System');
  console.log('================================================\n');

  // 環境変数チェック
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  console.log(`🔑 ANTHROPIC_API_KEY: ${anthropicKey ? `設定済み (${anthropicKey.substring(0, 15)}...)` : '❌ 未設定'}`);

  if (!anthropicKey) {
    console.error('❌ エラー: ANTHROPIC_API_KEY が設定されていません');
    console.error('   .env または .env.local に ANTHROPIC_API_KEY=sk-ant-... を設定してください');
    process.exit(1);
  }

  // 引数パース
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 10;

  console.log(`📊 Configuration:`);
  console.log(`   Target count: ${count} games (logic only)`);
  console.log(`   Image generation: DISABLED (logic validation only)`);
  console.log('');

  // PromptEvolver作成
  const evolver = new PromptEvolver(anthropicKey);

  // 中断ハンドラ
  let interrupted = false;
  process.on('SIGINT', async () => {
    if (interrupted) {
      console.log('\n\n⚠️ Force exit');
      process.exit(1);
    }
    interrupted = true;
    console.log('\n\n⏹️ Received SIGINT, generating report with current data...');

    try {
      const report = await evolver.generateReport();
      evolver.printReport(report);
    } catch (error) {
      console.error('Error generating report:', error);
    }

    process.exit(0);
  });

  // 実行
  try {
    console.log('🚀 Starting logic-only batch...\n');
    const startTime = Date.now();

    await evolver.runLogicBatch(count);

    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️ Total time: ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`   Average: ${(elapsed / count / 1000).toFixed(2)}s per game`);

    // レポート生成
    console.log('\n📊 Generating evolution report...');
    const report = await evolver.generateReport();

    // レポート表示
    evolver.printReport(report);

    // 終了
    const exitCode = report.successCount > 0 ? 0 : 1;
    console.log(`\n✅ Done. Exit code: ${exitCode}`);
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
