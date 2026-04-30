/**
 * neta-all.json ビルドスクリプト
 *
 * neta.json（200件）と ideas-arcade-bar.json（592件）を統合し、
 * src/ai/v2/neta-all.json（792件）を生成する。
 *
 * Usage: npx tsx src/ai/batch/build-neta-all.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

interface NetaItem {
  id: number;
  sourceId: string;       // 元のID（"neta-001", "arcade-042", "bar-005" 等）
  title: string;
  idea: string;
  mechanic: string;       // 正規化済みメカニクス名
  theme: string;
}

// ideas-arcade-bar.json の専用mechanic名 → 共通名へのマッピング
const MECHANIC_MAP: Record<string, string> = {
  timingWindow:  'timing_window',
  rapidTap:      'tap_counter',
  twoStep:       'two_step',
  choiceSelect:  'multi_choice',
  reveal:        'reveal',
  quiz:          'multi_choice',
  // neta.json 側はそのまま通す（tap/drag/swipe/flick/hold）
  tap:           'tap',
  drag:          'drag',
  swipe:         'swipe',
  flick:         'flick',
  hold:          'hold',
};

function normalizeMechanic(raw: string): string {
  return MECHANIC_MAP[raw] ?? raw;
}

const V2_DIR  = path.resolve(__dirname, '../v2');
const OUT_DIR = path.resolve(__dirname, '../v2');

const netaPath          = path.join(V2_DIR, 'neta.json');
const ideasPath         = path.join(V2_DIR, 'ideas-arcade-bar.json');
const outputPath        = path.join(OUT_DIR, 'neta-all.json');

const netaData  = JSON.parse(fs.readFileSync(netaPath,  'utf-8'));
const ideasData = JSON.parse(fs.readFileSync(ideasPath, 'utf-8'));

const items: NetaItem[] = [];

// neta.json
for (const item of netaData.items) {
  items.push({
    id:       0,  // 後で振り直す
    sourceId: `neta-${String(item.id).padStart(3, '0')}`,
    title:    item.title,
    idea:     item.idea,
    mechanic: normalizeMechanic(item.mechanic),
    theme:    item.theme,
  });
}

// ideas-arcade-bar.json
for (const item of ideasData.items) {
  items.push({
    id:       0,
    sourceId: item.sourceId,
    title:    item.title,
    idea:     item.idea,
    mechanic: normalizeMechanic(item.mechanic),
    theme:    item.theme,
  });
}

// IDを1から振り直す
items.forEach((item, idx) => { item.id = idx + 1; });

// mechanic分布を確認
const dist: Record<string, number> = {};
items.forEach(i => { dist[i.mechanic] = (dist[i.mechanic] ?? 0) + 1; });

const output = {
  version:     '1.0',
  description: `neta.json（200件）+ ideas-arcade-bar.json（592件）統合版`,
  totalCount:  items.length,
  mechanicDistribution: dist,
  items,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ neta-all.json 生成完了: ${items.length}件`);
console.log('\n📊 mechanic分布:');
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`   ${k.padEnd(20)} ${v}件`);
});
console.log(`\n💾 出力先: ${outputPath}`);
