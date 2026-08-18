/**
 * check-ip-safety.ts — 権利安全性の一括スキャン
 *
 * 800本のコードゲーム(src/ai/code/examples/*.js)を走査し、
 * 権利上寄りすぎている固有名詞を検出する。canon は
 * docs/specifications/IP_SAFETY_RULES.md。
 *
 * 使い方:
 *   npm run games:ip              # 違反サマリを標準出力（error があれば exit 1）
 *   npm run games:ip -- --all     # 警告レベルも含めて全件表示
 *   npm run games:ip -- --json    # 機械可読出力
 *   npm run games:ip -- <path>    # 任意のファイル/ディレクトリを対象にする
 *   npm run games:ip -- --no-neta # ネタ帳(src/ai/v2/neta*.json)のスキャンを省く
 *
 * ネタ帳側の違反は生成時に自動で除外される(filterIpSafeNetas)ため exit code には
 * 影響しないが、書き換えるまでそのネタは永久に生成されない。定期的に潰すこと。
 *
 * 自動量産では「1本ずつなら気づくこと」が見逃される。量産の蛇口を開ける前に
 * 通す関門であり、既存800本の棚卸しにも使う。
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { checkIpSafety, filterIpSafeNetas, IpViolation } from '../src/ai/code/IpSafetyChecker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = path.resolve(__dirname, '../src/ai/code/examples');
const NETA_DIR = path.resolve(__dirname, '../src/ai/v2');

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const asJson = args.includes('--json');
const targetArg = args.find((a) => !a.startsWith('--'));
const target = targetArg ? path.resolve(targetArg) : DEFAULT_DIR;

function collectFiles(p: string): string[] {
  const stat = fs.statSync(p);
  if (stat.isFile()) return [p];
  return fs
    .readdirSync(p)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => path.join(p, f));
}

interface FileReport {
  file: string;
  violations: IpViolation[];
  licensed: Array<{ term: string; owner: string }>;
}

const files = collectFiles(target);
const reports: FileReport[] = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const result = checkIpSafety(code, { filename: path.basename(file) });
  if (result.violations.length > 0 || result.licensedHits.length > 0) {
    reports.push({
      file: path.relative(process.cwd(), file),
      violations: result.violations,
      licensed: result.licensedHits.map(({ term, owner }) => ({ term, owner })),
    });
  }
}

const errorFiles = reports.filter((r) => r.violations.some((v) => v.severity === 'error'));
const warnFiles = reports.filter(
  (r) => !r.violations.some((v) => v.severity === 'error') && r.violations.length > 0
);
const licensedFiles = reports.filter((r) => r.licensed.length > 0);

if (asJson) {
  console.log(JSON.stringify({ scanned: files.length, reports }, null, 2));
} else {
  console.log(`\n権利安全性スキャン: ${files.length} 本`);
  console.log(`  error   : ${errorFiles.length} 本（公開前に必ず修正）`);
  console.log(`  warning : ${warnFiles.length} 本（公開名に使わない等の注意）`);
  console.log(`  許諾済みIP(CAPCOM/SNK)の語を含む: ${licensedFiles.length} 本\n`);

  for (const r of errorFiles) {
    console.log(`✖ ${r.file}`);
    for (const v of r.violations.filter((x) => x.severity === 'error')) {
      console.log(`    [${v.owner}] ${v.term}  L${v.line}: ${v.excerpt}`);
      console.log(`      → ${v.note}`);
    }
  }

  if (showAll) {
    for (const r of warnFiles) {
      console.log(`△ ${r.file}`);
      for (const v of r.violations) {
        console.log(`    [${v.owner}] ${v.term}  L${v.line}: ${v.excerpt}`);
        console.log(`      → ${v.note}`);
      }
    }
    for (const r of licensedFiles) {
      console.log(`◎ ${r.file}  許諾済み: ${r.licensed.map((l) => `${l.term}(${l.owner})`).join(', ')}`);
    }
  } else if (warnFiles.length > 0 || licensedFiles.length > 0) {
    console.log('\n（--all で warning と許諾済みIPの一覧も表示）');
  }
}

// ── ネタ帳（アイデア段階）のスキャン ────────────────────────────────────
// ネタに固有名詞が入っていると、そこから生成されるゲームは寄る。生成時には
// filterIpSafeNetas が自動で落とすので、ここは「書き換え待ちの棚卸し」。
if (!args.includes('--no-neta') && !targetArg && !asJson) {
  const netaFiles = fs
    .readdirSync(NETA_DIR)
    .filter((f) => /^(neta|ideas)/.test(f) && f.endsWith('.json'))
    .sort();

  let totalRejected = 0;
  const lines: string[] = [];

  for (const f of netaFiles) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(NETA_DIR, f), 'utf-8'));
    } catch {
      continue;
    }
    const items: Array<{ id: number; title: string; idea?: string }> = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        const o = node as Record<string, unknown>;
        if (typeof o.title === 'string' && typeof o.id === 'number') {
          items.push({ id: o.id, title: o.title, idea: typeof o.idea === 'string' ? o.idea : '' });
        } else {
          Object.values(o).forEach(walk);
        }
      }
    };
    walk(parsed);
    if (items.length === 0) continue;

    const { rejected } = filterIpSafeNetas(items);
    if (rejected.length === 0) continue;
    totalRejected += rejected.length;
    lines.push(`  ${f}: ${rejected.length}/${items.length} 件`);
    if (showAll) {
      for (const r of rejected) lines.push(`      #${r.id} ${r.title} — ${r.terms.join(', ')}`);
    }
  }

  console.log(`\nネタ帳（生成時に自動除外される＝書き換えるまで生成されない）: ${totalRejected} 件`);
  for (const l of lines) console.log(l);
  if (totalRejected > 0 && !showAll) console.log('  （--all で内訳を表示）');
}

process.exit(errorFiles.length > 0 ? 1 : 0);
