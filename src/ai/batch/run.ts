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
import { BatchRunner } from './BatchRunner';
import { generateArcadeGames } from './patterns/arcade';
import { generateBarGames } from './patterns/bar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




async function showStatus() {
  const progressFile = path.join(__dirname, 'batch-progress.json');
  if (!fs.existsSync(progressFile)) {
    console.log('進捗ファイルなし（まだ未実行）');
    return;
  }
  const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  console.log(`\n📊 バッチ進捗:`);
  console.log(`   arcade: ${p.arcade}/500`);
  console.log(`   bar:    ${p.bar}/200`);
  console.log(`   エラー: ${p.errorCount}`);
  console.log(`   合計:   ${p.arcade + p.bar}/700\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    await showStatus();
    return;
  }

  console.log('🎮 アーケードルネサンス バッチ生成スクリプト');
  console.log('==========================================\n');

  // ゲームパターンを事前生成
  console.log('📦 ゲームパターンを生成中...');
  const arcadeGames = generateArcadeGames();
  const barGames = generateBarGames();
  console.log(`   アーケード: ${arcadeGames.length}本`);
  console.log(`   バー:       ${barGames.length}本\n`);

  const runner = new BatchRunner();

  // Ctrl+C で安全に停止
  process.on('SIGINT', () => {
    console.log('\n\n⏹️ 中断します（進捗は保存済みです）...');
    runner.stop();
  });

  await runner.run(arcadeGames, barGames);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
