/**
 * コードゲーム バッチアップローダー
 *
 * src/ai/code/games/(系統別サブディレクトリ、production-list.csv 由来の現行制作ライン)の
 * .js ファイルを Supabase に一括登録する。template_id = 'game:NNN-name' で重複チェックするため、
 * 中断後の再実行でも安全にリジュームできる。
 *
 * src/ai/code/examples/ の797本は CLAUDE.md / docs/work-plans/68-game-list-policy.md により
 * 破棄済み(discard)。誤って再アップロードしないよう、対象にするには明示的に
 * LEGACY_EXAMPLES=true が必要(既定では一切触らない)。
 *
 * 使い方:
 *   npm run ai:upload:games                 # games/ を未登録分のみアップロード（リジューム）
 *   OVERWRITE=true npm run ai:upload:games   # 既存も含めて全件を上書き更新
 *   npm run ai:upload:games:dry              # Supabase 接続せずファイル一覧のみ表示
 *   SKIP_UPLOAD=true npm run ai:upload:games # 同上
 *   GAMES_DIR=<path> npm run ai:upload:games # 任意ディレクトリを明示指定
 *   LEGACY_EXAMPLES=true npm run ai:upload:games  # 破棄済み examples/ を明示的に対象化(通常は使わない)
 *
 * OVERWRITE=true のとき:
 *   - ローカル進捗ファイルの「登録済みスキップ」を無視して全件を処理する
 *   - 同じ template_id の既存行を insert ではなく update で上書きする
 *     （id / created_at / play_count / like_count は保持）
 *   ゲームコードを書き直した後の再アップロードに使う。
 *
 * 必須環境変数:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   MASTER_USER_ID
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { SupabaseUploader } from '../publishers/SupabaseUploader.js';
import { CodeGameValidator } from '../code/CodeGameValidator.js';
import { CodeQualityScorer } from '../code/CodeQualityScorer.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 既定は src/ai/code/games/(現行制作ライン)。破棄済み examples/ を対象にするには
// LEGACY_EXAMPLES=true を明示するか、GAMES_DIR で直接パスを指定する。
const LEGACY_EXAMPLES = process.env.LEGACY_EXAMPLES === 'true';
const TARGET_DIR = process.env.GAMES_DIR
  ? path.resolve(process.cwd(), process.env.GAMES_DIR)
  : path.resolve(__dirname, LEGACY_EXAMPLES ? '../code/examples' : '../code/games');
const TEMPLATE_PREFIX = /[/\\]examples$/.test(TARGET_DIR) ? 'example' : 'game';
function listGameFiles(dir: string, rel = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort().flatMap((f) => {
    const full = path.join(dir, f);
    const r = rel ? `${rel}/${f}` : f;
    return fs.statSync(full).isDirectory() ? listGameFiles(full, r) : f.endsWith('.js') ? [r] : [];
  });
}
const PROGRESS_FILE = path.resolve(__dirname, LEGACY_EXAMPLES ? 'upload-examples-progress.json' : 'upload-games-progress.json');

interface ProgressData {
  uploadedTemplateIds: string[];
  lastUpdated: string;
}

function loadProgress(): ProgressData {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { uploadedTemplateIds: [], lastUpdated: new Date().toISOString() };
  }
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as ProgressData;
  } catch {
    return { uploadedTemplateIds: [], lastUpdated: new Date().toISOString() };
  }
}

function saveProgress(data: ProgressData): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/** tier → 1プレイ価格(円)。PRICE_SYNC=true のときのみ適用 */
const TIER_PRICE_YEN: Record<string, number> = { S: 100, A: 50, B: 30, C: 10 };

interface GameMeta {
  filename: string;
  templateId: string;
  title: string;
  description: string;
  code: string;
  /** ヘッダーコメント // @tier: S|A|B|C */
  tier?: string;
  /** ヘッダーコメント // @mechanic: <MECHANICS_CATALOG_V2のID> */
  mechanic?: string;
  /** ヘッダーコメント // @theme: <世界観テーマ> */
  theme?: string;
  /** ヘッダーコメント // @trend: <SNSトレンド元ネタID> */
  trendSource?: string;
}

/** 先頭コメント群から // @key: value ヘッダーを解釈 */
function parseHeaderTags(lines: string[]): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const line of lines.slice(0, 20)) {
    if (!line.startsWith('//')) break;
    const m = /^\/\/\s*@(tier|mechanic|theme|trend)\s*:\s*(\S.*)$/.exec(line.trim());
    if (m) tags[m[1]] = m[2].trim();
  }
  return tags;
}

function parseGameFile(filePath: string, filename: string): GameMeta | null {
  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');

  // Line 1: // NNN-kebab-name.js
  // Line 2: // タイトル — 体験説明
  // Line 3: // 操作: ...
  // 任意:   // @tier: S  // @mechanic: timing_one_shot  // @theme: space  // @trend: xxx
  const baseName = path.basename(filename).replace(/\.js$/, '');
  const templateId = `${TEMPLATE_PREFIX}:${baseName}`;

  let title = baseName;
  let description = '';

  // 2行目からタイトルを取得
  if (lines[1] && lines[1].startsWith('// ')) {
    const raw = lines[1].slice(3).trim();
    const dashIdx = raw.indexOf(' — ');
    if (dashIdx !== -1) {
      title = raw.slice(0, dashIdx).trim();
      description = raw.slice(dashIdx + 3).trim();
    } else {
      title = raw;
    }
  }

  // 3行目から操作説明を取得（descriptionが空の場合）
  if (!description && lines[2] && lines[2].startsWith('// ')) {
    description = lines[2].slice(3).trim();
  }

  if (!description) {
    description = `Swizzle mini game: ${title}`;
  }

  const tags = parseHeaderTags(lines);
  const tier = tags.tier ? tags.tier.toUpperCase() : undefined;

  return {
    filename, templateId, title, description, code,
    tier: tier && TIER_PRICE_YEN[tier] !== undefined ? tier : undefined,
    mechanic: tags.mechanic,
    theme: tags.theme,
    trendSource: tags.trend,
  };
}

async function main() {
  console.log('🎮 Swizzle コードゲーム バッチアップローダー' + (LEGACY_EXAMPLES ? '(LEGACY: examples/)' : '(games/)'));
  console.log('====================================================\n');

  const skipUpload = process.env.SKIP_UPLOAD === 'true' || process.env.DRY_RUN === 'true';
  const overwrite = process.env.OVERWRITE === 'true' || process.env.FORCE === 'true';
  const priceSync = process.env.PRICE_SYNC === 'true';

  // 対象ディレクトリの .js ファイルを列挙（アルファベット順、系統サブディレクトリも再帰）
  const allFiles = listGameFiles(TARGET_DIR);

  console.log(`📁 ${path.relative(process.cwd(), TARGET_DIR)}/ に ${allFiles.length} 件の .js ファイルを発見\n`);

  if (skipUpload) {
    console.log('⏭️  DRY RUN モード — Supabase には接続しません\n');
    allFiles.forEach((f, i) => {
      const meta = parseGameFile(path.join(TARGET_DIR, f), f);
      if (meta) {
        console.log(`  ${String(i + 1).padStart(3)}: [${meta.templateId}] ${meta.title}`);
      }
    });
    console.log(`\n合計: ${allFiles.length} 件`);
    return;
  }

  // 進捗ロード
  const progress = loadProgress();
  const uploadedSet = new Set(progress.uploadedTemplateIds);
  console.log(`📊 前回までのアップロード済み: ${uploadedSet.size} 件`);
  if (overwrite) {
    console.log('♻️  OVERWRITE モード — 既存行も含めて全件を上書き更新します');
  }
  console.log('');

  // アップローダー初期化
  let uploader: SupabaseUploader;
  try {
    uploader = new SupabaseUploader();
  } catch (err) {
    console.error('❌ SupabaseUploader の初期化に失敗しました:');
    console.error(err instanceof Error ? err.message : err);
    console.error('\n必要な環境変数:');
    console.error('  VITE_SUPABASE_URL');
    console.error('  SUPABASE_SERVICE_KEY');
    console.error('  MASTER_USER_ID');
    process.exit(1);
  }

  const now = new Date().toISOString();
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const meta = parseGameFile(path.join(TARGET_DIR, filename), filename);
    if (!meta) {
      console.warn(`⚠️  ${filename}: パース失敗、スキップ`);
      failed++;
      continue;
    }

    const prefix = `[${String(i + 1).padStart(3)}/${allFiles.length}]`;

    // 進捗ファイルで既登録チェック（SupabaseUploader の重複チェックとは別のローカルキャッシュ）
    // OVERWRITE モードでは登録済みでもスキップせず上書き処理に進む。
    if (!overwrite && uploadedSet.has(meta.templateId)) {
      console.log(`${prefix} ⏭️  ${meta.templateId} — 登録済み`);
      skipped++;
      continue;
    }

    console.log(`\n${prefix} ⬆️  ${meta.title}`);
    console.log(`         template_id: ${meta.templateId}`);

    // 品質スコアはハードコードではなくスコアラーv2の実測値を使う
    const validation = new CodeGameValidator().validate(meta.code);
    const quality = new CodeQualityScorer().score(meta.code, null, validation);
    console.log(`         品質スコアv2: ${quality.total}/100${meta.tier ? ` / tier: ${meta.tier}` : ''}${meta.mechanic ? ` / mechanic: ${meta.mechanic}` : ''}`);

    // CodeGameProject オブジェクト構築
    const project = {
      id: randomUUID(),
      name: meta.title,
      description: meta.description,
      gameType: 'code' as const,
      code: meta.code,
      settings: {
        duration: { type: 'fixed' as const, seconds: 30 },
        difficulty: 'normal' as const,
        publishing: {
          isPublished: true,
          visibility: 'public' as const,
          allowComments: true,
          allowRemix: false,
        },
      },
      assets: {
        background: null,
        objects: [] as { id: string; name: string }[],
        audio: {
          bgm: null,
          se: [] as { id: string }[],
        },
      },
      generatedBy: 'human' as const,
      createdAt: now,
      lastModified: now,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (uploader as any).uploadGame(
        project,
        quality.total,
        {
          autoPublish: true,
          reviewStatus: 'approved' as const,
          gameType: 'code' as const,
          templateId: meta.templateId,
          overwrite,
          mechanic: meta.mechanic,
          theme: meta.theme,
          trendSource: meta.trendSource,
        }
      );

      if (result.success) {
        console.log(`         ✅ ${overwrite ? '上書き完了' : '登録完了'} — ID: ${result.gameId}`);
        if (priceSync && meta.tier && result.gameId) {
          const yen = TIER_PRICE_YEN[meta.tier];
          const ok = await uploader.syncPriceYen(result.gameId, yen);
          console.log(ok
            ? `         💴 価格連動: ${meta.tier} → ${yen}円/プレイ`
            : `         ⚠️ 価格連動に失敗 (tier ${meta.tier})`);
        }
        succeeded++;
        uploadedSet.add(meta.templateId);
        progress.uploadedTemplateIds = Array.from(uploadedSet);
        progress.lastUpdated = new Date().toISOString();
        saveProgress(progress);
      } else {
        console.error(`         ❌ 失敗: ${result.error}`);
        failed++;
      }
    } catch (err) {
      console.error(`         ❌ 例外: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`✅ 成功: ${succeeded} 件`);
  console.log(`⏭️  スキップ: ${skipped} 件（登録済み）`);
  console.log(`❌ 失敗: ${failed} 件`);
  console.log('====================================================');

  if (progress.uploadedTemplateIds.length > 0) {
    console.log(`\n📄 進捗ファイル: ${PROGRESS_FILE}`);
    console.log(`   累計アップロード済み: ${progress.uploadedTemplateIds.length} 件`);
  }

  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
