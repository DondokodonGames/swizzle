#!/usr/bin/env tsx
/**
 * AI generation pipeline status report.
 * Usage: npm run ai:status
 */

import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { GamePatternAnalyzer } from '../v2/GamePatternAnalyzer';

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

// ── diversity metrics (Supabase) ──────────────────────────────────────────────
// WP12: 量産の多様性を計測する。既存データソースを集計するのみ（新規収集なし）。
// 認証情報がある場合のみ表示。なければ静かにスキップ（reportPendingReview と同じパターン）。

interface ConceptLike {
  theme?: string;
  genre?: string;
  playerOperation?: string;
}

/** project_data から concept を取り出す（GamePatternAnalyzer と同じ探索順） */
function extractConcept(projectData: any): ConceptLike {
  return projectData?.concept || projectData?.metadata?.concept || {};
}

/** project_data.script.flags から flag id 一覧を取り出す（配列／オブジェクト両形式に対応） */
function extractFlagIds(projectData: any): string[] {
  const flags = projectData?.script?.flags;
  if (Array.isArray(flags)) {
    return flags.map((f: any) => (typeof f === 'string' ? f : f?.id)).filter(Boolean);
  }
  if (flags && typeof flags === 'object') {
    return Object.keys(flags);
  }
  return [];
}

async function reportDiversity(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseUrl, supabaseKey);

    // 直近100件（ai_generated=true, created_at降順）
    const { data, error } = await client
      .from('user_games')
      .select('project_data, ai_quality_score, ai_image_score, created_at')
      .eq('ai_generated', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) return;

    const games = data as Array<{ project_data: any; ai_quality_score: number | null; ai_image_score: number | null }>;
    const n = games.length;

    console.log('🎲 多様性レポート（直近' + n + '件）');

    // 1. メカニクス分布 ─ playerOperation を分類し最頻メカニクスの占有率を出す
    const mechanicCounts = new Map<string, number>();
    for (const g of games) {
      const op = extractConcept(g.project_data).playerOperation || '';
      const mech = GamePatternAnalyzer.extractMechanic(op) ?? '（未分類）';
      mechanicCounts.set(mech, (mechanicCounts.get(mech) ?? 0) + 1);
    }
    const sortedMechanics = [...mechanicCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedMechanics.length > 0) {
      const [topMech, topCount] = sortedMechanics[0];
      console.log(`  メカニクス分布: 最頻「${topMech}」${pct(topCount, n)} 占有 / ${mechanicCounts.size}種`);
      const breakdown = sortedMechanics.slice(0, 6).map(([m, c]) => `${m} ${c}`).join(' · ');
      console.log(`    ${breakdown}`);
    }

    // 2. テーマ/ジャンル分布
    const themes = new Set<string>();
    const genreCounts = new Map<string, number>();
    for (const g of games) {
      const c = extractConcept(g.project_data);
      if (c.theme) themes.add(c.theme);
      if (c.genre) genreCounts.set(c.genre, (genreCounts.get(c.genre) ?? 0) + 1);
    }
    console.log(`  テーマ: ユニーク ${themes.size} 種 / ${n}件`);
    const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topGenres.length > 0) {
      console.log(`  ジャンル Top5: ${topGenres.map(([gn, c]) => `${gn}(${c})`).join(', ')}`);
    }

    // 3. 類似度ゲート ─ failure_patterns.json の CONCEPT_TOO_SIMILAR を集計
    const fpStore = readJson<{ totalAttempts?: number; patterns?: Record<string, { count?: number }> }>(
      path.resolve(process.cwd(), 'logs/generation/failure_patterns.json'),
      {}
    );
    const tooSimilar = fpStore.patterns?.CONCEPT_TOO_SIMILAR?.count ?? 0;
    const attempts = fpStore.totalAttempts ?? 0;
    if (attempts > 0) {
      console.log(`  類似度ゲート: CONCEPT_TOO_SIMILAR ${tooSimilar}回 / 全試行 ${attempts} (${pct(tooSimilar, attempts)})`);
    } else {
      console.log('  類似度ゲート: 計測データなし（logs/generation/failure_patterns.json）');
    }

    // 4. フェーズ使用率 ─ phase_ 始まりのフラグを持つゲームの割合
    let phaseGames = 0;
    for (const g of games) {
      if (extractFlagIds(g.project_data).some(id => id.startsWith('phase_'))) phaseGames++;
    }
    console.log(`  フェーズ使用率: ${phaseGames} / ${n} (${pct(phaseGames, n)})`);

    // 5. 画像品質 ─ ai_image_score の平均と分布（null=未計測も）
    const imageScores = games.map(g => g.ai_image_score).filter((s): s is number => typeof s === 'number');
    const measured = imageScores.length;
    const unmeasured = n - measured;
    if (measured > 0) {
      const avg = imageScores.reduce((sum, s) => sum + s, 0) / measured;
      const hi = imageScores.filter(s => s >= 80).length;
      const mid = imageScores.filter(s => s >= 60 && s < 80).length;
      const lo = imageScores.filter(s => s < 60).length;
      console.log(`  画像品質: 平均 ${avg.toFixed(1)} (計測 ${measured}件, 未計測 ${unmeasured}件)`);
      console.log(`    ≥80: ${hi} · 60-79: ${mid} · <60: ${lo}`);
    } else {
      console.log(`  画像品質: 計測データなし (未計測 ${unmeasured}件)`);
    }

    console.log();
  } catch {
    // ネットワーク障害・スキーマ差異等は無視（ローカル統計の表示を妨げない）
  }
}

await reportDiversity();

console.log('═══════════════════════════════════════════════════\n');
