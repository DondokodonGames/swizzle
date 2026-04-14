/**
 * run.ts — バッチ生成エントリーポイント
 *
 * 使い方:
 *   npm run ai:batch            # 本番実行（Supabase書き込みあり）
 *   npm run ai:batch:dry        # ドライラン（DB書き込みなし）
 *   npm run ai:batch:status     # 進捗確認のみ
 *
 * 必要な環境変数（.env.local に書く）:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...（service_roleキー）
 *   MASTER_USER_ID=（ゲームを所有させるユーザーのUUID）
 */

import * as path from 'path';

// .env.local を手動読み込み（dotenv不要）
import { readFileSync, existsSync } from 'fs';
function loadEnv() {
  const files = ['.env', '.env.local'];
  for (const file of files) {
    const p = path.resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}
loadEnv();

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { BatchRunner } from './BatchRunner.js';
import { generateArcadeGamesFromIdeas } from './generators/arcade-generator.js';
import { generateBarGamesFromIdeas }    from './generators/bar-generator.js';
import { generateNetaGames }            from './generators/neta-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function showStatus() {
  const progressFile = path.join(__dirname, 'batch-progress.json');
  if (!fs.existsSync(progressFile)) {
    console.log('進捗ファイルなし（まだ未実行）');
    return;
  }
  const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  const total = p.total ?? ((p.arcade ?? 0) + (p.bar ?? 0));
  console.log(`\n📊 バッチ進捗:`);
  console.log(`   完了: ${total}/792`);
  console.log(`   エラー: ${p.errorCount ?? 0}\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    await showStatus();
    return;
  }

  console.log('🎮 バッチ生成スクリプト v2 (792本)');
  console.log('=====================================\n');

  // ゲームデータを事前生成（3ソース合計792本）
  console.log('📦 ゲームデータを生成中...');
  const netaGames   = generateNetaGames();
  const arcadeGames = generateArcadeGamesFromIdeas();
  const barGames    = generateBarGamesFromIdeas();

  const allGames = [...netaGames, ...arcadeGames, ...barGames];
  console.log(`   ネタ:    ${netaGames.length}本`);
  console.log(`   アーケード: ${arcadeGames.length}本`);
  console.log(`   バー:    ${barGames.length}本`);
  console.log(`   合計:    ${allGames.length}本\n`);

  const runner = new BatchRunner();

  // Ctrl+C で安全に停止
  process.on('SIGINT', () => {
    console.log('\n\n⏹️ 中断します（進捗は保存済みです）...');
    runner.stop();
  });

  await runner.run(allGames);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
