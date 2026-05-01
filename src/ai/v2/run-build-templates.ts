/**
 * run-build-templates.ts
 *
 * neta-all.json の全792件をファクトリーでゲームロジックJSONに変換し、
 * src/ai/v2/templates/ に保存する。
 *
 * Usage:
 *   npx tsx src/ai/v2/run-build-templates.ts
 *   npx tsx src/ai/v2/run-build-templates.ts --from 1 --to 100
 *   npx tsx src/ai/v2/run-build-templates.ts --dry-run
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY  Claude API キー（必須）
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ParameterExtractor, FactoryName } from './ParameterExtractor.js';
import {
  MECHANIC_TO_FACTORY,
  buildCounterTap,
  buildTimingWindow,
  buildMultiChoice,
  buildDragDrop,
  buildScrollDodge,
  buildProjectile,
  buildHold,
  type FactoryOutput,
  type CounterTapParams,
  type TimingWindowParams,
  type MultiChoiceParams,
  type DragDropParams,
  type ScrollDodgeParams,
  type ProjectileParams,
  type HoldParams,
} from './template-factories/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- パス設定 ----
const NETA_ALL_PATH = path.join(__dirname, 'neta-all.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const PROGRESS_PATH = path.join(__dirname, 'template-build-progress.json');

// ---- ネタ型 ----
interface NetaItem {
  id: number;
  sourceId: string;
  title: string;
  idea: string;
  mechanic: string;
  theme: string;
}

interface NetaAll {
  items: NetaItem[];
}

// ---- 進捗管理 ----
interface BuildProgress {
  done: number[];
  errors: Record<number, string>;
  skipped: number[];
}

function loadProgress(): BuildProgress {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  }
  return { done: [], errors: {}, skipped: [] };
}

function saveProgress(progress: BuildProgress): void {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// ---- ファクトリー呼び出し ----
function callFactory(factoryName: FactoryName, params: unknown): FactoryOutput {
  switch (factoryName) {
    case 'CounterTap':   return buildCounterTap(params as CounterTapParams);
    case 'TimingWindow': return buildTimingWindow(params as TimingWindowParams);
    case 'MultiChoice':  return buildMultiChoice(params as MultiChoiceParams);
    case 'DragDrop':     return buildDragDrop(params as DragDropParams);
    case 'ScrollDodge':  return buildScrollDodge(params as ScrollDodgeParams);
    case 'Projectile':   return buildProjectile(params as ProjectileParams);
    case 'Hold':         return buildHold(params as HoldParams);
    default:
      throw new Error(`Unknown factory: ${factoryName}`);
  }
}

// ---- メイン ----
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fromArg = args.indexOf('--from');
  const toArg = args.indexOf('--to');
  const fromId = fromArg >= 0 ? parseInt(args[fromArg + 1]) : 1;
  const toId = toArg >= 0 ? parseInt(args[toArg + 1]) : Infinity;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

  const netaAll: NetaAll = JSON.parse(fs.readFileSync(NETA_ALL_PATH, 'utf-8'));
  const items = netaAll.items.filter(i => i.id >= fromId && i.id <= toId);

  const progress = loadProgress();
  const extractor = new ParameterExtractor();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  console.log(`\n🚀 テンプレートビルド開始`);
  console.log(`   対象: neta #${fromId}〜${isFinite(toId) ? toId : items[items.length - 1]?.id ?? '?'} (${items.length}件)`);
  console.log(`   モード: ${dryRun ? 'ドライラン' : '本番'}\n`);

  for (const neta of items) {
    // スキップ済みチェック
    if (progress.done.includes(neta.id)) {
      skipped++;
      continue;
    }

    // ファクトリー解決
    const factoryName = MECHANIC_TO_FACTORY[neta.mechanic] as FactoryName | undefined;
    if (!factoryName) {
      const reason = `mechanic '${neta.mechanic}' に対応するファクトリーなし`;
      progress.skipped.push(neta.id);
      console.log(`  ⏭  #${neta.id} ${neta.title} — スキップ: ${reason}`);
      skipped++;
      continue;
    }

    processed++;
    const outputPath = path.join(TEMPLATES_DIR, `neta_${String(neta.id).padStart(3, '0')}.json`);

    try {
      // パラメータ抽出（Haiku）
      process.stdout.write(`  🔍 #${neta.id} ${neta.title} [${factoryName}] ... `);
      const params = await extractor.extract(neta, factoryName);

      // ファクトリーでゲームロジック生成
      const output = callFactory(factoryName, params);

      const template = {
        _netaId: neta.id,
        _sourceId: neta.sourceId,
        _title: neta.title,
        _mechanic: neta.mechanic,
        _factory: factoryName,
        ...output,
      };

      if (!dryRun) {
        fs.writeFileSync(outputPath, JSON.stringify(template, null, 2));
      }

      progress.done.push(neta.id);
      delete progress.errors[neta.id];
      succeeded++;
      console.log(`✅`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      progress.errors[neta.id] = msg;
      failed++;
      console.log(`❌  ${msg.slice(0, 80)}`);
    }

    // 10件ごとに進捗保存
    if (processed % 10 === 0) {
      if (!dryRun) saveProgress(progress);
      const pct = Math.round((succeeded / processed) * 100);
      console.log(`\n  📊 進捗: ${processed}件処理 / 成功${succeeded} / 失敗${failed} (成功率${pct}%)\n`);
    }

    // レート制限対策（Haikuは60 RPM）
    await new Promise(r => setTimeout(r, 100));
  }

  if (!dryRun) saveProgress(progress);

  console.log(`\n✨ 完了`);
  console.log(`   処理: ${processed}件`);
  console.log(`   成功: ${succeeded}件 → ${TEMPLATES_DIR}`);
  console.log(`   失敗: ${failed}件 → template-build-progress.json の errors を確認`);
  console.log(`   スキップ: ${skipped}件（既存 or ファクトリー未対応）`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
