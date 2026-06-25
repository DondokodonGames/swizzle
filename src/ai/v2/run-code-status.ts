/**
 * コードゲーム生成ステータスレポート
 *
 * 使い方:
 *   npm run ai:code:status
 *
 * ファイルのみ参照（Supabase接続なし）:
 *   - neta-code-progress.json  (コードゲームのネタ帳進捗)
 *   - neta-progress.json       (ルールゲームのネタ帳進捗・比較用)
 *   - neta.json                (ネタ帳総件数)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readProgress(file: string): number[] {
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return (data.processedIds ?? []) as number[];
  } catch {
    return [];
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

async function main() {
  console.log('\n📊 コードゲーム生成ステータス');
  console.log('================================\n');

  const netaFile = path.join(__dirname, 'neta.json');
  let totalCount = 0;
  if (fs.existsSync(netaFile)) {
    try {
      const neta = JSON.parse(fs.readFileSync(netaFile, 'utf-8'));
      totalCount = neta.totalCount ?? neta.items?.length ?? 0;
    } catch { /* ignore */ }
  }

  const codeProgressFile = path.join(__dirname, 'neta-code-progress.json');
  const rulesProgressFile = path.join(__dirname, 'neta-progress.json');

  const codeProcessed  = readProgress(codeProgressFile);
  const rulesProcessed = readProgress(rulesProgressFile);

  // コードゲーム進捗
  console.log('📖 ネタ帳進捗（コードゲーム）:');
  if (!fs.existsSync(codeProgressFile)) {
    console.log('   未開始（neta-code-progress.json なし）');
  } else {
    console.log(`   総件数: ${totalCount}`);
    console.log(`   処理済: ${codeProcessed.length} (${pct(codeProcessed.length, totalCount)})`);
    console.log(`   残り:   ${Math.max(0, totalCount - codeProcessed.length)}`);
    if (codeProcessed.length > 0) {
      const last5 = codeProcessed.slice(-5);
      console.log(`   直近ID: ${last5.join(', ')}`);
    }
    // lastUpdated
    try {
      const raw = JSON.parse(fs.readFileSync(codeProgressFile, 'utf-8'));
      if (raw.lastUpdated) console.log(`   更新日時: ${raw.lastUpdated}`);
    } catch { /* ignore */ }
  }

  console.log('');

  // ルールゲーム進捗（比較用）
  console.log('📖 ネタ帳進捗（ルールゲーム・比較用）:');
  if (!fs.existsSync(rulesProgressFile)) {
    console.log('   未開始（neta-progress.json なし）');
  } else {
    console.log(`   総件数: ${totalCount}`);
    console.log(`   処理済: ${rulesProcessed.length} (${pct(rulesProcessed.length, totalCount)})`);
    console.log(`   残り:   ${Math.max(0, totalCount - rulesProcessed.length)}`);
  }

  console.log('\n================================');
  console.log('実行コマンド:');
  console.log('  npm run ai:code:neta:dry     # ドライラン確認');
  console.log('  npm run ai:code:neta:local   # ローカル生成（アップロードなし）');
  console.log('  npm run ai:code:neta:1       # 1本生成・保存');
  console.log('  npm run ai:code:neta:5       # 5本生成・保存');
}

main().catch((err) => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
