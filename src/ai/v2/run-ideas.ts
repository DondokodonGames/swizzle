/**
 * arcadeとbarのゲームアイデアをLLMで個別生成するランナー
 *
 * 使い方:
 *   npx tsx src/ai/v2/run-ideas.ts [count]        # count 件ずつ処理（デフォルト1）
 *   npm run ai:ideas                               # 1件ずつ処理
 *   npm run ai:ideas -- 10                         # 10件まとめて処理
 *   npm run ai:ideas:status                        # 進捗確認のみ
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY  - AI生成に必須
 *   SKIP_UPLOAD        - 'true' で Supabase アップロードをスキップ
 *   DRY_RUN            - 'true' でドライラン
 *
 * 進捗:
 *   src/ai/v2/ideas-arcade-bar-progress.json に自動保存（中断・再開可能）
 *   592件全て処理済みになると完了メッセージを表示して終了。
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { Orchestrator } from './Orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const IDEAS_FILE = path.join(__dirname, 'ideas-arcade-bar.json');
const PROGRESS_FILE = path.join(__dirname, 'ideas-arcade-bar-progress.json');
const TOTAL = 592;

function showStatus() {
  if (!fs.existsSync(IDEAS_FILE)) {
    console.log('❌ ideas-arcade-bar.json が見つかりません。先に export-ideas.ts を実行してください。');
    console.log('   npx tsx src/ai/batch/export-ideas.ts');
    return;
  }

  let processed = 0;
  if (fs.existsSync(PROGRESS_FILE)) {
    const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    processed = (p.processedIds ?? []).length;
  }

  console.log('\n📊 個別生成 進捗:');
  console.log(`   完了: ${processed} / ${TOTAL}`);
  console.log(`   残り: ${TOTAL - processed}`);
  console.log(`   進捗: ${((processed / TOTAL) * 100).toFixed(1)}%\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    showStatus();
    return;
  }

  console.log('🎮 アイデア個別生成ランナー（arcade + bar 592件）');
  console.log('================================================\n');

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const dryRun = process.env.DRY_RUN === 'true';

  console.log(`🔑 ANTHROPIC_API_KEY: ${anthropicKey ? `設定済み (${anthropicKey.substring(0, 15)}...)` : '❌ 未設定'}`);

  if (!anthropicKey && !dryRun) {
    console.error('❌ エラー: ANTHROPIC_API_KEY が設定されていません。');
    console.error('   .env.local に ANTHROPIC_API_KEY=sk-ant-... を設定してください。');
    process.exit(1);
  }

  if (!fs.existsSync(IDEAS_FILE)) {
    console.error('❌ ideas-arcade-bar.json が見つかりません。');
    console.error('   先に実行: npx tsx src/ai/batch/export-ideas.ts');
    process.exit(1);
  }

  const count = parseInt(args[0] ?? '1', 10);
  if (isNaN(count) || count < 1) {
    console.error('❌ count は1以上の整数で指定してください。');
    process.exit(1);
  }

  // 現在の進捗を表示
  showStatus();

  const orchestrator = new Orchestrator({
    targetGamesPerRun: count,
    maxRetries: 3,
    dryRun,
    anthropicApiKey: anthropicKey,
    imageGeneration: { provider: 'mock' },  // バッチ生成はSVGアセットを使うためmock
  });

  process.on('SIGINT', () => {
    console.log('\n\n⏹️ 中断します（進捗は保存済みです）...');
    orchestrator.stop();
  });

  try {
    const result = await orchestrator.runFromNeta(IDEAS_FILE, count);

    console.log('\n📊 Summary:');
    console.log(`   Generated: ${result.totalGenerated}`);
    console.log(`   Passed:    ${result.passed} (${(result.passRate * 100).toFixed(1)}%)`);
    console.log(`   Failed:    ${result.failed}`);
    console.log(`   Time:      ${(result.totalTime / 1000).toFixed(1)}s`);
    console.log(`   Cost:      $${result.totalCost.toFixed(4)}`);

    // 全件完了チェック
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      const done = (p.processedIds ?? []).length;
      if (done >= TOTAL) {
        console.log('\n🎉 全592件の個別生成が完了しました！');
      } else {
        console.log(`\n📌 次回実行: npm run ai:ideas -- ${count}`);
        console.log(`   残り ${TOTAL - done} 件`);
      }
    }

    process.exit(result.passed > 0 ? 0 : 1);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
