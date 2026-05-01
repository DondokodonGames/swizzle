/**
 * run-produce-games.ts  ─ Phase 2: テンプレート → 実ゲーム量産
 *
 * templates/*.json (ゲームロジック) を読み込み、
 * AssetGenerator → FinalAssembler → SupabaseUploader を通して
 * プレイ可能なゲームを DB に登録する。
 *
 * Usage:
 *   npx tsx src/ai/v2/run-produce-games.ts
 *   npx tsx src/ai/v2/run-produce-games.ts --from 1 --to 100
 *   npx tsx src/ai/v2/run-produce-games.ts --variations 5    # 1テンプレート×5テーマ
 *   npx tsx src/ai/v2/run-produce-games.ts --dry-run         # アップロードしない
 *   IMAGE_PROVIDER=mock npx tsx src/ai/v2/run-produce-games.ts  # 画像なし（テスト）
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY   必須（ゲームロジック補完 + claude-svg）
 *   SUPABASE_URL        アップロード先
 *   SUPABASE_ANON_KEY   アップロード先
 *   SKIP_UPLOAD=true    DB登録をスキップ（ローカル保存のみ）
 *   IMAGE_PROVIDER      'claude-svg' | 'mock'（デフォルト: claude-svg）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// .env 読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { AssetGenerator } from './AssetGenerator.js';
import { FinalAssembler } from './FinalAssembler.js';
import { DryRunSimulator } from './DryRunSimulator.js';
import { SupabaseUploader } from '../publishers/SupabaseUploader.js';
import type { GameConcept, LogicGeneratorOutput, AssetPlan } from './types.js';
import type { FactoryOutput } from './template-factories/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- パス設定 ----
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const OUTPUT_DIR = path.join(__dirname, 'produced-games');
const PROGRESS_PATH = path.join(__dirname, 'produce-progress.json');

// ---- バリエーションテーマ（25種）----
// 同じゲームロジックを異なるビジュアルテーマで量産する
const VISUAL_THEMES = [
  { name: 'original',    style: 'colorful cartoon',    palette: 'vivid' },
  { name: 'nature',      style: 'nature illustration', palette: 'green and brown' },
  { name: 'space',       style: 'sci-fi pixel art',    palette: 'dark blue and cyan' },
  { name: 'food',        style: 'cute food character', palette: 'warm orange and yellow' },
  { name: 'sports',      style: 'sports icon flat',    palette: 'red and white' },
  { name: 'japanese',    style: 'Japanese pop art',    palette: 'red, white, black' },
  { name: 'retro',       style: '8bit pixel game',     palette: 'limited 4 colors' },
  { name: 'fantasy',     style: 'fantasy RPG art',     palette: 'purple and gold' },
  { name: 'ocean',       style: 'underwater watercolor','palette': 'blue and teal' },
  { name: 'halloween',   style: 'spooky Halloween',    palette: 'orange and black' },
  { name: 'winter',      style: 'snowy Christmas',     palette: 'white and red' },
  { name: 'neon',        style: 'neon glow cyberpunk', palette: 'pink and blue neon' },
  { name: 'pastel',      style: 'soft pastel kawaii',  palette: 'light pink and mint' },
  { name: 'monochrome',  style: 'black and white ink', palette: 'black, white, gray' },
  { name: 'jungle',      style: 'jungle adventure',    palette: 'deep green and brown' },
  { name: 'candy',       style: 'candy land sweet',    palette: 'pink, purple, yellow' },
  { name: 'robot',       style: 'mecha robot metal',   palette: 'gray and orange' },
  { name: 'ancient',     style: 'ancient ruin stone',  palette: 'beige and dark brown' },
  { name: 'cloud',       style: 'sky and cloud fluffy','palette': 'sky blue and white' },
  { name: 'fire',        style: 'fire and lava hot',   palette: 'red, orange, yellow' },
  { name: 'ice',         style: 'ice crystal frozen',  palette: 'light blue and white' },
  { name: 'garden',      style: 'flower garden spring','palette': 'pink and light green' },
  { name: 'circus',      style: 'circus carnival pop', palette: 'red, yellow, blue' },
  { name: 'underwater',  style: 'bubble fish cute',    palette: 'aqua and coral' },
  { name: 'minimal',     style: 'flat design minimal', palette: 'primary colors' },
];

// ---- 進捗管理 ----
interface ProduceProgress {
  done: string[];          // "neta_001_original" 等のキー
  errors: Record<string, string>;
}

function loadProgress(): ProduceProgress {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  }
  return { done: [], errors: {} };
}

function saveProgress(p: ProduceProgress): void {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

// ---- FactoryOutput → LogicGeneratorOutput 変換 ----
function toLogicOutput(factory: FactoryOutput): LogicGeneratorOutput {
  return {
    script: factory.script as unknown as LogicGeneratorOutput['script'],
    assetPlan: factory.assetPlan as unknown as AssetPlan,
    selfCheck: {
      hasPlayerActionOnSuccessPath: true,
      counterInitialValuesSafe: true,
      allObjectIdsValid: true,
      allCounterNamesValid: true,
      coordinatesInRange: true,
      onlyVerifiedFeaturesUsed: true,
      noRuleConflicts: true,
      allCountersFullyImplemented: true,
      counterUsedOnlyWhenNecessary: true,
    },
  };
}

// ---- 合成 GameConcept 生成 ----
function buildConcept(
  neta: { id: number; title: string; idea: string; theme: string; mechanic: string },
  theme: typeof VISUAL_THEMES[0],
  duration: number
): GameConcept {
  const titleEn = neta.title
    .replace(/[ぁ-ん]/g, '')
    .replace(/[ァ-ン]/g, '')
    .replace(/[一-龥]/g, '')
    .trim()
    .slice(0, 30) || `game_${neta.id}`;

  return {
    title: neta.title,
    titleEn: `${titleEn}_${theme.name}`,
    description: neta.idea.slice(0, 100),
    duration,
    theme: `${neta.theme}/${theme.name}`,
    visualStyle: `${theme.style}, ${theme.palette}`,
    playerGoal: neta.idea.slice(0, 60),
    playerOperation: `${neta.mechanic}でプレイ`,
    successCondition: '目標達成',
    failureCondition: '時間切れ',
    selfEvaluation: {
      goalClarity: 8,
      operationClarity: 8,
      judgmentClarity: 8,
      acceptance: 8,
      reasoning: 'factory generated',
    },
  };
}

// ---- テンプレートファイル一覧取得 ----
function getTemplateFiles(fromId: number, toId: number): string[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    return [];
  }
  return fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.startsWith('neta_') && f.endsWith('.json') && !f.includes('reference'))
    .filter(f => {
      const id = parseInt(f.replace('neta_', '').replace('.json', ''));
      return id >= fromId && id <= toId;
    })
    .sort();
}

// ---- メイン ----
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const fromArg = args.indexOf('--from');
  const toArg = args.indexOf('--to');
  const variationsArg = args.indexOf('--variations');
  const fromId = fromArg >= 0 ? parseInt(args[fromArg + 1]) : 1;
  const toId = toArg >= 0 ? parseInt(args[toArg + 1]) : Infinity;
  const variationCount = variationsArg >= 0 ? parseInt(args[variationsArg + 1]) : 1;
  const imageProvider = (process.env.IMAGE_PROVIDER as 'claude-svg' | 'mock') ?? 'claude-svg';

  if (!process.env.ANTHROPIC_API_KEY && imageProvider !== 'mock') {
    console.error('Error: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  const skipUpload = dryRun || process.env.SKIP_UPLOAD === 'true';

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const templateFiles = getTemplateFiles(fromId, toId);
  const themes = VISUAL_THEMES.slice(0, variationCount);

  console.log(`\n🎮 Phase 2: テンプレート → ゲーム量産`);
  console.log(`   テンプレート数: ${templateFiles.length}件`);
  console.log(`   バリエーション: ${variationCount}種 × ${templateFiles.length} = 最大${templateFiles.length * variationCount}本`);
  console.log(`   画像プロバイダー: ${imageProvider}`);
  console.log(`   アップロード: ${skipUpload ? 'スキップ' : '有効'}\n`);

  // コンポーネント初期化
  const assetGenerator = new AssetGenerator({
    imageProvider,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });
  const finalAssembler = new FinalAssembler();
  const simulator = new DryRunSimulator();
  let uploader: SupabaseUploader | undefined;
  if (!skipUpload) {
    try {
      uploader = new SupabaseUploader();
    } catch {
      console.warn('⚠️  SupabaseUploader 初期化失敗（アップロードをスキップ）');
    }
  }

  const progress = loadProgress();
  let produced = 0;
  let failed = 0;

  for (const file of templateFiles) {
    const templatePath = path.join(TEMPLATES_DIR, file);
    const raw = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    // テンプレートが FactoryOutput 形式か確認
    const netaId: number = raw._netaId ?? 0;
    const netaTitle: string = raw._title ?? raw.title ?? 'Unknown';
    const netaMechanic: string = raw._mechanic ?? raw.mechanic ?? 'tap';
    const netaTheme: string = (raw.assetPlan?.background?.mood) ?? 'general';
    const gameDuration: number = raw.gameDuration ?? 10;

    const factoryOutput: FactoryOutput = {
      mechanic: netaMechanic,
      gameDuration,
      script: raw.script,
      assetPlan: raw.assetPlan,
    };

    const logicOutput = toLogicOutput(factoryOutput);

    // DryRunSimulator で検証（1回だけ、バリエーションが変わっても同じロジックなので）
    const sim = simulator.simulate(logicOutput, undefined, gameDuration);
    if (!sim.summary.playable || sim.summary.confidence === 'low') {
      console.log(`  ⏭  neta #${netaId} ${netaTitle} — DryRun NG: ${sim.summary.reasoning}`);
      continue;
    }

    for (const theme of themes) {
      const key = `${path.basename(file, '.json')}_${theme.name}`;

      if (progress.done.includes(key)) {
        continue;
      }

      const concept = buildConcept(
        { id: netaId, title: netaTitle, idea: raw.assetPlan?.background?.description ?? '', theme: netaTheme, mechanic: netaMechanic },
        theme,
        gameDuration
      );

      // assetPlan のビジュアル説明をテーマに合わせて上書き
      const themedAssetPlan: AssetPlan = {
        ...factoryOutput.assetPlan as unknown as AssetPlan,
        background: {
          description: `${concept.visualStyle} background for ${concept.theme}`,
          mood: factoryOutput.assetPlan.background.mood as AssetPlan['background']['mood'],
        },
      };
      logicOutput.assetPlan = themedAssetPlan;

      process.stdout.write(`  🎨 #${netaId} ${netaTitle} [${theme.name}] ... `);

      try {
        // Step 1: アセット生成
        const assets = await assetGenerator.generate(concept, themedAssetPlan);

        // Step 2: GameProject JSON 組み立て
        const assembly = finalAssembler.assemble(concept, logicOutput, assets);
        if (!assembly.valid && assembly.issues.some(i => i.includes('Missing asset'))) {
          throw new Error(`Assembly issues: ${assembly.issues.join(', ')}`);
        }

        // Step 3: ローカル保存
        const outputPath = path.join(OUTPUT_DIR, `${key}.json`);
        if (!dryRun) {
          fs.writeFileSync(outputPath, JSON.stringify(assembly.project, null, 2));
        }

        // Step 4: Supabase アップロード
        if (uploader && !dryRun) {
          const uploadResult = await uploader.uploadGame(
            assembly.project,
            80,           // qualityScore
            true,         // autoPublish
            key,          // templateId (重複チェック用)
            netaMechanic  // category
          );
          if (!uploadResult.success) {
            console.log(`⚠️ アップロード失敗: ${uploadResult.error}`);
          } else {
            console.log(`✅ (${uploadResult.gameId})`);
          }
        } else {
          console.log(`✅`);
        }

        progress.done.push(key);
        delete progress.errors[key];
        produced++;

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        progress.errors[key] = msg;
        failed++;
        console.log(`❌  ${msg.slice(0, 80)}`);
      }

      // 進捗保存（10件ごと）
      if ((produced + failed) % 10 === 0) {
        if (!dryRun) saveProgress(progress);
        console.log(`\n  📊 ${produced + failed}件処理 / 成功${produced} / 失敗${failed}\n`);
      }

      // レート制限（claude-svg は Haiku なので 60 RPM）
      await new Promise(r => setTimeout(r, 150));
    }
  }

  if (!dryRun) saveProgress(progress);

  console.log(`\n✨ 完了`);
  console.log(`   生成: ${produced}本 (${OUTPUT_DIR})`);
  console.log(`   失敗: ${failed}件`);
  console.log(`   アップロード: ${uploader ? '済み' : 'スキップ'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
