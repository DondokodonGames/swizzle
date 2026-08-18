/**
 * neta-space.ts — ネタ空間の在庫を測る（「何度考えても似たパターンに収束する」への対処）
 *
 * ネタが似るのは発想力の問題ではなく、**手持ちの在庫が見えないまま自由連想している**から。
 * 既存800本とネタ帳を同じ物差し（メカニクス40+ID / 族A〜H）で数え、
 * 埋まっているセルと空いているセルを出す。次に考えるべきは空いているセル。
 *
 * 使い方:
 *   npm run ai:neta:space              # 在庫マップ + 空きセル + 次に狙うべき10件
 *   npm run ai:neta:space -- --full    # 全メカニクスの表を出す
 *   npm run ai:neta:space -- --json    # 機械可読
 *
 * 物差し:
 *   - 800本 … docs/work-plans/ledger/game-ledger.csv（人間確定済みメカニクス）
 *   - ネタ … src/ai/v2/neta*.json / ideas*.json を重複排除して分類器で推定
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { MECHANIC_FAMILY } from '../src/ai/code/mechanics-v3.js';
import { inferMechanic } from '../src/ai/code/mechanicClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.resolve(__dirname, '../docs/work-plans/ledger/game-ledger.csv');
const NETA_DIR = path.resolve(__dirname, '../src/ai/v2');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const full = args.includes('--full');

const FAMILY_LABEL: Record<string, string> = {
  A: 'A タイミング/連打',
  B: 'B 狙って飛ばす',
  C: 'C 動かし続ける',
  D: 'D なぞる/切る',
  E: 'E 積む/揃える',
  F: 'F 見抜く/覚える',
  G: 'G 1台で2人',
  H: 'H 射幸/演出',
};

// ── 1. 既存800本の在庫（台帳の確定メカニクス）─────────────────────────────
function parseCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, 'utf-8');
  const lines = text.split('\n').filter((l) => l.trim());
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // 引用符付きフィールドに対応した最小パーサ
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === ',' && !quoted) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

const gameCounts = new Map<string, number>();
for (const row of parseCsv(LEDGER)) {
  const mech = row.mech_guess;
  if (!mech) continue;
  gameCounts.set(mech, (gameCounts.get(mech) ?? 0) + 1);
}

// ── 2. ネタ帳の在庫（重複排除 → 分類）──────────────────────────────────────
interface Neta { id: number; title: string; idea: string; src: string }
const rawNetas: Neta[] = [];
for (const f of fs.readdirSync(NETA_DIR).filter((f) => /^(neta|ideas)/.test(f) && f.endsWith('.json'))) {
  let parsed: unknown;
  try { parsed = JSON.parse(fs.readFileSync(path.join(NETA_DIR, f), 'utf-8')); } catch { continue; }
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      if (typeof o.title === 'string' && typeof o.id === 'number') {
        rawNetas.push({ id: o.id, title: o.title, idea: String(o.idea ?? ''), src: f });
      } else Object.values(o).forEach(walk);
    }
  };
  walk(parsed);
}
const uniqMap = new Map<string, Neta>();
for (const n of rawNetas) {
  const key = `${n.title}|${n.idea}`;
  if (!uniqMap.has(key)) uniqMap.set(key, n);
}
const netas = [...uniqMap.values()];
const duplicateCount = rawNetas.length - netas.length;

// 分類器が既定値に落ちたもの(= ネタ本文から遊びが読み取れないもの)は
// メカニクスに畳み込まず「未分類」として別に数える。畳み込むと地図が嘘になる
// (実測では約半数が既定値に落ちる = ネタが遊びを指定していない)。
const netaCounts = new Map<string, number>();
let unclassified = 0;
for (const n of netas) {
  const { mech, source } = inferMechanic('', `${n.title} ${n.idea}`);
  if (source === 'default') { unclassified++; continue; }
  netaCounts.set(mech, (netaCounts.get(mech) ?? 0) + 1);
}

// ── 3. 集計 ────────────────────────────────────────────────────────────────
const mechanics = Object.keys(MECHANIC_FAMILY);
const rows = mechanics.map((m) => ({
  mechanic: m,
  family: MECHANIC_FAMILY[m],
  games: gameCounts.get(m) ?? 0,
  netas: netaCounts.get(m) ?? 0,
})).sort((a, b) => (a.family + a.mechanic).localeCompare(b.family + b.mechanic));

const famAgg = new Map<string, { games: number; netas: number; mechs: number; empty: number }>();
for (const r of rows) {
  const cur = famAgg.get(r.family) ?? { games: 0, netas: 0, mechs: 0, empty: 0 };
  cur.games += r.games; cur.netas += r.netas; cur.mechs += 1;
  if (r.games === 0) cur.empty += 1;
  famAgg.set(r.family, cur);
}

const totalGames = rows.reduce((s, r) => s + r.games, 0);
const emptyCells = rows.filter((r) => r.games === 0);
// 「次に狙うべき」= ゲーム在庫が薄い順。族ごと全滅しているものを最優先に持ち上げる
const targets = [...rows]
  .map((r) => ({ ...r, priority: (famAgg.get(r.family)!.games === 0 ? 0 : 1000) + r.games }))
  .sort((a, b) => a.priority - b.priority || a.netas - b.netas)
  .slice(0, 10);

if (asJson) {
  console.log(JSON.stringify({ totalGames, netas: netas.length, duplicateCount, unclassified, rows, targets }, null, 2));
} else {
  console.log(`\nネタ空間の在庫`);
  console.log(`  既存ゲーム: ${totalGames} 本 / ネタ: 延べ ${rawNetas.length} → ユニーク ${netas.length}（ファイル間コピー ${duplicateCount} 件）`);
  console.log(`  うち遊びが読み取れないネタ: ${unclassified} 件 (${(100 * unclassified / Math.max(netas.length, 1)).toFixed(0)}%) — 下の表には入れていない`);
  console.log(`  ※ ネタ本文が「何を指で行う遊びか」を書いていないと、生成側は既定の遊び（タップ/タイミング）に落ちる\n`);

  console.log('【族ごとの埋まり方】');
  console.log('  族                      ゲーム   ネタ   未使用メカニクス');
  for (const [fam, a] of [...famAgg.entries()].sort()) {
    const bar = '█'.repeat(Math.round((a.games / Math.max(totalGames, 1)) * 40));
    console.log(`  ${FAMILY_LABEL[fam].padEnd(20)} ${String(a.games).padStart(5)} ${String(a.netas).padStart(6)}   ${a.empty}/${a.mechs}  ${bar}`);
  }

  console.log(`\n【一本も作っていないメカニクス】 ${emptyCells.length} 件`);
  for (const r of emptyCells) {
    console.log(`  ${r.mechanic.padEnd(18)} (${FAMILY_LABEL[r.family]})  ネタ在庫 ${r.netas}`);
  }

  console.log('\n【次に考えるべきセル（在庫が薄い順・族まるごと空きを優先）】');
  targets.forEach((t, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${t.mechanic.padEnd(18)} ${FAMILY_LABEL[t.family].padEnd(16)} ゲーム${String(t.games).padStart(4)}本 / ネタ${String(t.netas).padStart(4)}件`);
  });

  if (full) {
    console.log('\n【全メカニクスの在庫】');
    for (const r of rows) {
      console.log(`  ${r.family} ${r.mechanic.padEnd(18)} ゲーム${String(r.games).padStart(4)} / ネタ${String(r.netas).padStart(4)}`);
    }
  } else {
    console.log('\n（--full で全メカニクスの表、--json で機械可読）');
  }

  console.log(`\n使い方: 上の空きセルを1つ選び、「そのメカニクスで、完全オリジナルの見た目」で考える。`);
  console.log(`自由連想で考えると既に厚いセル（timing_one_shot / judge）へ必ず戻る。`);
}
