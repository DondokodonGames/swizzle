/**
 * dup-plays.ts — 「題材だけ違う同じゲーム」を検出し、空きセルへの振り替え案を出す
 *
 * 800本には同じ遊びの重複が埋まっている（例: gravity-flip 12本は数値と世界観が違うだけで
 * 「タップで重力反転して隙間を抜ける」という同じ遊び）。
 * 一方 WP56 の書き換えは「メカニクスと勝敗条件は変えない」ため、磨いても重複は残る。
 *
 * このスクリプトは重複の束を出し、余剰分を **在庫が薄いメカニクス** へ振り替える案を作る。
 * 重複を消すのではなく、空きセル（G族=1台で2人 / H族=射幸演出 など）に変換して在庫にする。
 *
 * 使い方:
 *   npm run games:dup            # examples/(破棄済み797本)の重複の束と振り替え案
 *   npm run games:dup -- --csv   # docs/work-plans/ledger/dup-conversion-proposal.csv に書き出す
 *   npm run games:dup -- --json
 *
 *   npm run games:dup -- --games # games/(現行制作ライン)の類似度スキャン。examples/と違い
 *                                 # ファイル名が production-list.csv 由来で毎回一意なので
 *                                 # 「同じslugの束」は存在しない。全ペア総当たりでコード骨格/
 *                                 # 操作文の類似度を出し、上位を目視レビューできるようにする。
 *   npm run games:dup -- --games --csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { MECHANIC_FAMILY } from '../src/ai/code/mechanics-v3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EX = path.resolve(__dirname, '../src/ai/code/examples');
const GAMES_DIR = path.resolve(__dirname, '../src/ai/code/games');
const LEDGER_DIR = path.resolve(__dirname, '../docs/work-plans/ledger');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const writeCsv = args.includes('--csv');
const scanGames = args.includes('--games');

// ── 類似度: コード骨格(4-gram) と 操作文(数値を無視した2-gram) ──────────────
function skeleton(code: string): string[] {
  const body = code
    .replace(/\/\/[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "'S'").replace(/\b\d+(\.\d+)?\b/g, 'N');
  return body.match(/game\.[a-zA-Z.]+|\b(if|else|for|while|switch|case|return|function|var)\b/g) ?? [];
}
const shingle = (toks: string[], k = 4) => {
  const s = new Set<string>();
  for (let i = 0; i + k <= toks.length; i++) s.add(toks.slice(i, i + k).join('>'));
  return s;
};
const textGram = (s: string) => {
  const t = s.replace(/\d+/g, 'N').replace(/[\s、。・（）()]/g, '');
  const g = new Set<string>();
  for (let i = 0; i + 2 <= t.length; i++) g.add(t.slice(i, i + 2));
  return g;
};
const jaccard = (A: Set<string>, B: Set<string>) => {
  if (!A.size || !B.size) return 0;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / (A.size + B.size - n);
};

// 無作為な2本でも 0.35 前後は一致する（全ゲームが同じエンジンAPIを同じ順で叩くため）。
// 重複判定はこのベースラインより明確に上、かつ操作文も一致することを条件にする。
const CODE_THRESHOLD = 0.45;
const TEXT_THRESHOLD = 0.35;

// ── --games モード: games/(現行制作ライン)の全ペア総当たり類似度スキャン ──────
// examples/と違い production-list.csv 由来でファイル名が毎回一意なため、
// 「同じslugの束」を探す下のロジックは適用できない(束が常にゼロになる)。
// 全ペアの類似度を出し、上位を目視レビューできるようにするだけに留める
// (自動の「残す/振り替え」判定はしない — 判断は人間に委ねる)。
function walkGames(dir: string): string[] {
  return fs.readdirSync(dir).sort().flatMap((f) => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory() ? walkGames(full) : f.endsWith('.js') ? [full] : [];
  });
}
if (scanGames) {
  interface GG { file: string; rel: string; slug: string; family: string; title: string; ctrl: string; win: string; mechanic: string; code: string }
  const files = walkGames(GAMES_DIR);
  const gg: GG[] = files.map((full) => {
    const code = fs.readFileSync(full, 'utf-8');
    const lines = code.split('\n');
    const L = (i: number) => (lines[i] ?? '').replace(/^\/\/\s*/, '').trim();
    const rel = path.relative(GAMES_DIR, full);
    const family = rel.split(path.sep)[0] ?? '';
    const mechM = /^\/\/\s*@mechanic\s*:\s*(\S+)/m.exec(code);
    return {
      file: path.basename(full), rel, family,
      slug: path.basename(full).replace(/\.js$/, ''),
      title: L(1).split('—')[0].trim(), ctrl: L(2).replace(/^操作:\s*/, ''),
      win: L(3).replace(/^終わり:\s*/, ''), mechanic: mechM ? mechM[1] : '', code,
    };
  });

  const codeSh = new Map(gg.map((g) => [g.file, shingle(skeleton(g.code))]));
  const textSh = new Map(gg.map((g) => [g.file, textGram(g.ctrl + g.win)]));

  interface Pair { a: GG; b: GG; codeSim: number; textSim: number; sameMechanic: boolean }
  const pairs: Pair[] = [];
  for (let i = 0; i < gg.length; i++) for (let j = i + 1; j < gg.length; j++) {
    const a = gg[i], b = gg[j];
    const codeSim = jaccard(codeSh.get(a.file)!, codeSh.get(b.file)!);
    const textSim = jaccard(textSh.get(a.file)!, textSh.get(b.file)!);
    pairs.push({ a, b, codeSim, textSim, sameMechanic: !!a.mechanic && a.mechanic === b.mechanic });
  }
  pairs.sort((p, q) => Math.max(q.codeSim, q.textSim) - Math.max(p.codeSim, p.textSim));
  const flagged = pairs.filter((p) => p.codeSim >= CODE_THRESHOLD || p.textSim >= TEXT_THRESHOLD);

  if (asJson) {
    console.log(JSON.stringify({
      total: gg.length, pairs: pairs.length, flagged: flagged.length,
      top: pairs.slice(0, 30).map((p) => ({
        a: p.a.slug, b: p.b.slug, mechanicA: p.a.mechanic, mechanicB: p.b.mechanic,
        codeSim: +p.codeSim.toFixed(3), textSim: +p.textSim.toFixed(3), sameMechanic: p.sameMechanic,
      })),
    }, null, 2));
  } else {
    console.log(`\ngames/ 類似度スキャン(全ペア総当たり、examples/のslug束ねロジックは不使用)`);
    console.log(`  対象: ${gg.length} 本 / 総ペア数 ${pairs.length}`);
    console.log(`  しきい値超え(要目視確認候補): ${flagged.length} 組(coding≥${CODE_THRESHOLD} or text≥${TEXT_THRESHOLD})\n`);
    console.log('  コード一致  操作文一致  mechanic一致  slug A                    slug B');
    for (const p of pairs.slice(0, 25)) {
      console.log(`  ${p.codeSim.toFixed(2).padStart(9)}  ${p.textSim.toFixed(2).padStart(9)}  ${(p.sameMechanic ? p.a.mechanic : '—').padEnd(12)} ${p.a.slug.padEnd(26)} ${p.b.slug}`);
    }
    if (pairs.length > 25) console.log(`  ...他 ${pairs.length - 25} 組(--json で全件)`);
  }

  if (writeCsv) {
    const out = path.join(LEDGER_DIR, 'dup-scan-games.csv');
    const rows = ['slug_a,slug_b,mechanic_a,mechanic_b,same_mechanic,code_sim,text_sim,flagged'];
    for (const p of pairs) rows.push(`${p.a.slug},${p.b.slug},${p.a.mechanic},${p.b.mechanic},${p.sameMechanic},${p.codeSim.toFixed(3)},${p.textSim.toFixed(3)},${p.codeSim >= CODE_THRESHOLD || p.textSim >= TEXT_THRESHOLD}`);
    fs.writeFileSync(out, rows.join('\n') + '\n', 'utf-8');
    console.log(`\n書き出し: ${path.relative(process.cwd(), out)}（${pairs.length} 行）`);
  }
  process.exit(0);
}

// ── ヘッダーと本文を読む(examples/、破棄済み797本の重複調査) ─────────────────
interface Game { file: string; slug: string; id: number; title: string; ctrl: string; win: string; code: string }
const games: Game[] = fs.readdirSync(EX).filter((f) => /^\d{3}-/.test(f)).sort().map((f) => {
  const code = fs.readFileSync(path.join(EX, f), 'utf-8');
  const lines = code.split('\n');
  const L = (i: number) => (lines[i] ?? '').replace(/^\/\/\s*/, '').trim();
  return {
    file: f, slug: f.replace(/^\d{3}-|\.js$/g, ''), id: parseInt(f.slice(0, 3), 10),
    title: L(1).split('—')[0].trim(), ctrl: L(2).replace(/^操作:\s*/, ''), win: L(3), code,
  };
});

const codeSh = new Map(games.map((g) => [g.file, shingle(skeleton(g.code))]));
const textSh = new Map(games.map((g) => [g.file, textGram(g.ctrl + g.win)]));

// ── 同一slug群のなかで「同じ遊び」を束ねる ──────────────────────────────────
const bySlug = new Map<string, Game[]>();
for (const g of games) bySlug.set(g.slug, [...(bySlug.get(g.slug) ?? []), g]);

interface DupGroup { slug: string; members: Game[]; keep: Game; convert: Game[]; codeAvg: number; textAvg: number }
const groups: DupGroup[] = [];
for (const [slug, members] of bySlug) {
  if (members.length < 2) continue;
  let codeSum = 0, textSum = 0, pairs = 0, same = 0;
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    const c = jaccard(codeSh.get(members[i].file)!, codeSh.get(members[j].file)!);
    const t = jaccard(textSh.get(members[i].file)!, textSh.get(members[j].file)!);
    codeSum += c; textSum += t; pairs++;
    if (c >= CODE_THRESHOLD || t >= TEXT_THRESHOLD) same++;
  }
  // 群の過半のペアが「同じ遊び」なら重複群とみなす
  if (same * 2 < pairs) continue;
  const sorted = [...members].sort((a, b) => a.id - b.id);
  groups.push({
    slug, members: sorted, keep: sorted[0], convert: sorted.slice(1),
    codeAvg: codeSum / pairs, textAvg: textSum / pairs,
  });
}
groups.sort((a, b) => b.convert.length - a.convert.length);

// ── 振り替え先: 在庫が薄いメカニクス ───────────────────────────────────────
const ledgerCsv = path.join(LEDGER_DIR, 'game-ledger.csv');
const counts = new Map<string, number>();
if (fs.existsSync(ledgerCsv)) {
  const lines = fs.readFileSync(ledgerCsv, 'utf-8').split('\n').filter((l) => l.trim());
  const head = lines[0].split(',');
  const mi = head.indexOf('mech_guess');
  for (const line of lines.slice(1)) {
    const mech = line.split(',')[mi];
    if (mech) counts.set(mech, (counts.get(mech) ?? 0) + 1);
  }
}
const thinCells = Object.keys(MECHANIC_FAMILY)
  .map((m) => ({ mechanic: m, family: MECHANIC_FAMILY[m], games: counts.get(m) ?? 0 }))
  .sort((a, b) => a.games - b.games);

const totalConvert = groups.reduce((s, g) => s + g.convert.length, 0);
const proposals: Array<{ file: string; slug: string; from: string; to: string; family: string }> = [];
let cursor = 0;
for (const g of groups) {
  for (const m of g.convert) {
    const target = thinCells[cursor % thinCells.length];
    cursor++;
    proposals.push({ file: m.file, slug: m.slug, from: g.slug, to: target.mechanic, family: target.family });
  }
}

if (asJson) {
  console.log(JSON.stringify({ groups: groups.map((g) => ({ slug: g.slug, n: g.members.length, keep: g.keep.file, convert: g.convert.map((c) => c.file), codeAvg: g.codeAvg, textAvg: g.textAvg })), proposals }, null, 2));
} else {
  console.log(`\n重複した遊びの検出（無作為な2本のベースライン一致度は約0.35）`);
  console.log(`  重複群: ${groups.length} 個 / 該当 ${groups.reduce((s, g) => s + g.members.length, 0)} 本`);
  console.log(`  1本ずつ残して余剰: **${totalConvert} 本**\n`);
  console.log('  slug               本数  コード一致  操作文一致  残す           振り替え');
  for (const g of groups.slice(0, 15)) {
    console.log(`  ${g.slug.padEnd(18)} ${String(g.members.length).padStart(3)}  ${g.codeAvg.toFixed(2).padStart(9)}  ${g.textAvg.toFixed(2).padStart(9)}  ${g.keep.file.padEnd(14)} ${g.convert.length}本`);
  }
  if (groups.length > 15) console.log(`  ...他 ${groups.length - 15} 群`);

  console.log(`\n振り替え先の候補（在庫が薄い順）:`);
  thinCells.slice(0, 8).forEach((c) => console.log(`  ${c.mechanic.padEnd(18)} 族${c.family}  現在 ${c.games} 本`));

  console.log(`\n振り替え案（先頭10件）:`);
  proposals.slice(0, 10).forEach((p) => console.log(`  ${p.file.padEnd(26)} ${p.from} → ${p.to}（族${p.family}）`));
  console.log(`\n--csv で全 ${proposals.length} 件を docs/work-plans/ledger/dup-conversion-proposal.csv に書き出す`);
}

if (writeCsv) {
  const out = path.join(LEDGER_DIR, 'dup-conversion-proposal.csv');
  const rows = ['filename,slug,duplicate_of,proposed_mechanic,family'];
  for (const p of proposals) rows.push(`${p.file},${p.slug},${p.from},${p.to},${p.family}`);
  fs.writeFileSync(out, rows.join('\n') + '\n', 'utf-8');
  console.log(`\n書き出し: ${path.relative(process.cwd(), out)}（${proposals.length} 行）`);
}
