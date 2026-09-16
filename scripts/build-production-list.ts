/**
 * build-production-list.ts — 元データ(sources/)から制作リスト CSV を生成する
 *
 * 「作るべきゲーム」を棚(A〜L)ごとに1行1タイトルで並べた台帳を作る。
 * タイトルは指標であって生成入力ではない(固有名詞を含む)。実際に作るのは
 * play 列に書く「固有名詞を含まない遊びの一文」で、そこを埋めるのが制作の本体。
 *
 * 入力:
 *   docs/work-plans/ledger/sources/raw/*.txt     機械取得(手編集しない)
 *   docs/work-plans/ledger/sources/*.txt         貼り込み(I/J/K/D/Switch/ACA)
 * 出力:
 *   docs/work-plans/ledger/production-list.csv
 *
 * 使い方:
 *   npm run games:list            # 生成(冪等。入力が同じなら出力も同じ)
 *   npm run games:list -- --stats # 棚ごとの件数だけ表示して書かない
 *
 * ID は入力順の連番。貼り込みファイルは末尾に足せば既存 ID が動かない。
 * 既存の CSV に play / status が書かれていれば id で突き合わせて保持する。
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_DIR = path.resolve(__dirname, '../docs/work-plans/ledger');
const SRC_DIR = path.join(LEDGER_DIR, 'sources');
const RAW_DIR = path.join(SRC_DIR, 'raw');
const OUT_FILE = path.join(LEDGER_DIR, 'production-list.csv');

const statsOnly = process.argv.includes('--stats');

interface Row {
  id: string;
  shelf: string;
  platform: string;
  title: string;
  source: string;
  play: string;
  status: string;
}

const HEADER = ['id', 'shelf', 'platform', 'title', 'source', 'play', 'status'];

// ── 入力の読み方 ─────────────────────────────────────────────────────────
function readLines(p: string): string[] {
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, 'utf-8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * 貼り込み書式: `# 区分` 行が以降の行の platform になる。それ以外はタイトル。
 * `#! source=memory` のような先頭指令でファイル全体の出どころを上書きできる
 * (検証済み一覧を貼ったら指令を消せば source=paste に戻る)。
 */
function readPaste(file: string): { platform: string; title: string; source: string }[] {
  const out: { platform: string; title: string; source: string }[] = [];
  let platform = '';
  let source = 'paste';
  for (const l of readLines(path.join(SRC_DIR, file))) {
    if (l.startsWith('#!')) {
      const m = l.match(/source\s*=\s*(\S+)/);
      if (m) source = m[1];
      continue;
    }
    if (l.startsWith('#')) {
      platform = l.replace(/^#+\s*/, '');
      continue;
    }
    out.push({ platform, title: l, source });
  }
  return out;
}

/** 連番は (棚, 機種) ごと。機種は ID 用に英数字だけに寄せる */
const counters = new Map<string, number>();
function nextId(shelf: string, platform: string): string {
  const tag = platform.replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || 'X';
  const key = `${shelf}-${tag}`;
  const n = (counters.get(key) ?? 0) + 1;
  counters.set(key, n);
  return `${key}-${String(n).padStart(4, '0')}`;
}

// ── 既存 CSV の play / status を引き継ぐ ──────────────────────────────────
function loadExisting(): Map<string, { play: string; status: string }> {
  const m = new Map<string, { play: string; status: string }>();
  if (!fs.existsSync(OUT_FILE)) return m;
  const lines = fs.readFileSync(OUT_FILE, 'utf-8').split(/\r?\n/);
  const cols = parseCsvLine(lines[0] ?? '');
  const iId = cols.indexOf('id');
  const iPlay = cols.indexOf('play');
  const iStatus = cols.indexOf('status');
  if (iId < 0 || iPlay < 0 || iStatus < 0) return m;
  for (const l of lines.slice(1)) {
    if (!l.trim()) continue;
    const c = parseCsvLine(l);
    if (c[iPlay] || (c[iStatus] && c[iStatus] !== 'todo')) {
      m.set(c[iId], { play: c[iPlay] ?? '', status: c[iStatus] ?? 'todo' });
    }
  }
  return m;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// ── 棚ごとに行を作る ──────────────────────────────────────────────────────
const rows: Row[] = [];
const push = (shelf: string, platform: string, title: string, source: string, play = '', status = 'todo') =>
  rows.push({ id: nextId(shelf, platform), shelf, platform, title, source, play, status });

// D スマホ(貼り込み)
for (const { platform, title, source } of readPaste('mobile.txt')) push('D', platform || 'MOBILE', title, source);

// E ハード別(raw) + Switch(貼り込み)
const rawFiles = fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).sort() : [];
for (const f of rawFiles) {
  const m = f.match(/^E-([A-Za-z0-9]+)\.txt$/);
  if (!m) continue;
  const plat = m[1];
  // No-Intro はカートリッジ系、Redump はディスク系。E-*.txt の元がどちらかは機種で決まる
  const source = /^(PS|PS2|PS3|PSP|SS|DC|GC|Wii|XBOX|X360|PCECD|MCD|NGCD|PCFX|PC98|CDI)$/.test(plat) ? 'redump' : 'no-intro';
  for (const title of readLines(path.join(RAW_DIR, f))) push('E', plat, title, source);
}
for (const { platform, title, source } of readPaste('switch.txt')) push('E', platform || 'NSW', title, source);

// F アーケード(raw)。アーケードアーカイブスの貼り込みがあれば該当行に印
const aca = new Set(readPaste('arcade-archives.txt').map((r) => r.title.toLowerCase()));
for (const title of readLines(path.join(RAW_DIR, 'F-arcade.txt'))) {
  push('F', 'ARCADE', title, aca.has(title.toLowerCase()) ? 'mame+aca' : 'mame');
}
// 貼り込みにあって MAME 側に無いものは F に足す(表記ゆれで突き合わなかった分)
const fTitles = new Set(rows.filter((r) => r.shelf === 'F').map((r) => r.title.toLowerCase()));
for (const { platform, title, source } of readPaste('arcade-archives.txt')) {
  if (!fTitles.has(title.toLowerCase())) push('F', platform || 'ACA', title, source);
}

// G/H SIMPLE 題材(raw: 機種<TAB>タイトル)
for (const l of readLines(path.join(RAW_DIR, 'GH-simple.txt'))) {
  const [plat, title] = l.split('\t');
  if (title) push('GH', plat, title, 'redump');
}

// I / J / K(貼り込み)
for (const { platform, title, source } of readPaste('warioware.txt')) push('I', platform || 'WARIOWARE', title, source);
for (const { platform, title, source } of readPaste('marioparty.txt')) push('J', platform || 'MARIOPARTY', title, source);
for (const { platform, title, source } of readPaste('rhythm.txt')) push('K', platform || 'RHYTHM', title, source);

// L 既存(raw: `L-NNN タイトル / slug — フック`)。フックは play に入れて existing 扱い
for (const l of readLines(path.join(RAW_DIR, 'L-existing-797.txt'))) {
  const m = l.match(/^L-(\d{3})\s+(.*?)\s+\/\s+(\S+)\s+—\s*(.*)$/);
  if (!m) continue;
  rows.push({ id: `L-${m[1]}`, shelf: 'L', platform: 'swizzle', title: `${m[2]} / ${m[3]}`, source: 'repo', play: m[4], status: 'existing' });
}

// ── 既存の play / status を引き継いで書く ─────────────────────────────────
const existing = loadExisting();
for (const r of rows) {
  const e = existing.get(r.id);
  if (e) { r.play = e.play || r.play; r.status = e.status || r.status; }
}

const byShelf = new Map<string, number>();
for (const r of rows) byShelf.set(r.shelf, (byShelf.get(r.shelf) ?? 0) + 1);
console.log('制作リスト');
for (const s of ['A', 'B', 'C', 'D', 'E', 'F', 'GH', 'I', 'J', 'K', 'L']) {
  console.log(`  ${s.padEnd(3)} ${String(byShelf.get(s) ?? 0).padStart(6)}`);
}
console.log(`  計  ${String(rows.length).padStart(6)}`);
const empty = ['D', 'I', 'J', 'K'].filter((s) => !byShelf.get(s));
if (empty.length) console.log(`  貼り込み待ち: ${empty.join(' / ')}  (sources/README.md)`);

if (statsOnly) process.exit(0);

const csv = [HEADER.join(','), ...rows.map((r) => HEADER.map((h) => csvCell((r as unknown as Record<string, string>)[h])).join(','))].join('\n') + '\n';
fs.writeFileSync(OUT_FILE, csv, 'utf-8');
console.log(`📄 ${path.relative(process.cwd(), OUT_FILE)} (${rows.length}行)`);
