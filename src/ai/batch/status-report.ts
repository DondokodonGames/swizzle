#!/usr/bin/env tsx
/**
 * AI generation pipeline status report.
 * Usage: npm run ai:status
 */

import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

const ROOT = path.resolve(import.meta.dirname, '../..');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ── helpers ──────────────────────────────────────────────────────────────────

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

// ── neta progress ─────────────────────────────────────────────────────────────

interface NetaJson { totalCount: number }
interface NetaProgress { processedIds: string[] }

const neta = readJson<NetaJson>(path.join(ROOT, 'ai/v2/neta.json'), { totalCount: 0 });
const progress = readJson<NetaProgress>(path.join(ROOT, 'ai/v2/neta-progress.json'), { processedIds: [] });
const total = neta.totalCount;
const done = progress.processedIds.length;
const remaining = Math.max(0, total - done);

// ── generation logs ───────────────────────────────────────────────────────────

interface GameLog {
  quality?: number;
  failureReasons?: string[];
  validationErrors?: Array<{ code: string }>;
  status?: string;
}

const logsDir = path.join(ROOT, 'ai/v2/logs');
const logFiles = fs.existsSync(logsDir)
  ? fs.readdirSync(logsDir).filter(f => f.endsWith('.json'))
  : [];

let highQuality = 0;   // ≥75
let midQuality = 0;    // 60-74
let lowQuality = 0;    // <60
let totalGames = 0;
const failureCounts: Record<string, number> = {};

for (const file of logFiles) {
  const log = readJson<GameLog>(path.join(logsDir, file), {});
  if (log.quality === undefined) continue;
  totalGames++;

  if (log.quality >= 75) highQuality++;
  else if (log.quality >= 60) midQuality++;
  else lowQuality++;

  for (const reason of log.failureReasons ?? []) {
    failureCounts[reason] = (failureCounts[reason] ?? 0) + 1;
  }
  for (const err of log.validationErrors ?? []) {
    const key = `validation:${err.code}`;
    failureCounts[key] = (failureCounts[key] ?? 0) + 1;
  }
}

// ── output ────────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════');
console.log('  Swizzle AI Generation Status');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Neta progress:  ${done} / ${total}  (${remaining} remaining)\n`);

if (totalGames > 0) {
  console.log('Game quality breakdown:');
  console.log(`  ✅ quality ≥ 75: ${highQuality} games  (${pct(highQuality, totalGames)})`);
  console.log(`  ⚠️  quality 60-74: ${midQuality} games  (${pct(midQuality, totalGames)})`);
  console.log(`  ❌ quality < 60:  ${lowQuality} games  (${pct(lowQuality, totalGames)})`);
  console.log(`  Total logged:     ${totalGames} games\n`);

  const topFailures = Object.entries(failureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topFailures.length > 0) {
    console.log('Top failure reasons:');
    for (const [reason, count] of topFailures) {
      console.log(`  ${String(count).padStart(3)}  ${reason}`);
    }
    console.log();
  }
} else {
  console.log('No game logs found. Run the generation pipeline to populate logs.\n');
}

// ── pending review (Supabase) ─────────────────────────────────────────────────
// 認証情報がある場合のみ審査待ち件数を表示。なければ静かにスキップ。

async function reportPendingReview(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await client
      .from('user_games')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'pending_review');

    if (error) return;
    if ((count ?? 0) > 0) {
      console.log(`⏳ 審査待ち: ${count} 件`);
      console.log('   → npm run dev → エディター → AIゲームレビュー で承認/却下\n');
    } else {
      console.log('⏳ 審査待ち: 0 件\n');
    }
  } catch {
    // ネットワーク障害等は無視（ローカル統計の表示を妨げない）
  }
}

await reportPendingReview();

console.log('═══════════════════════════════════════════════════\n');
