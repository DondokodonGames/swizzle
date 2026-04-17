/**
 * ネタ帳バッチ生成スクリプト
 *
 * LLMを使って neta.json のゲームアイデアを 800件まで拡張する。
 * 20件ずつバッチ生成し、進捗を保存するため中断・再開可能。
 *
 * 使い方:
 *   npx tsx src/ai/v2/generate-neta.ts           # 20件生成して保存
 *   npx tsx src/ai/v2/generate-neta.ts 5         # 5バッチ(100件)生成
 *   npx tsx src/ai/v2/generate-neta.ts --all     # 全件生成（600件）
 *   npx tsx src/ai/v2/generate-neta.ts --status  # 進捗確認
 *   npx tsx src/ai/v2/generate-neta.ts --commit  # 生成済みをneta.jsonにマージ
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY  必須
 *
 * 出力:
 *   neta-generate-progress.json  生成済みアイテムの一時保存
 *   neta.json                    --commit 時に既存200件 + 新規をマージ
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ==========================================
// 定数
// ==========================================

const NETA_FILE = path.join(__dirname, 'neta.json');
const PROGRESS_FILE = path.join(__dirname, 'neta-generate-progress.json');

const EXISTING_COUNT = 200;  // 現在のneta.jsonの件数
const TARGET_TOTAL = 800;    // 目標総件数
const NEW_ITEMS = TARGET_TOTAL - EXISTING_COUNT;  // 600件追加
const BATCH_SIZE = 20;       // 1回のAPIコールで生成する件数


// ==========================================
// 進捗管理
// ==========================================

interface Progress {
  generatedItems: NetaItem[];
  totalGenerated: number;
  batches: number;
  startedAt: string;
  updatedAt: string;
}

interface NetaItem {
  id: number;
  title: string;
  idea: string;
  mechanic?: string;
  theme?: string;
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {
    generatedItems: [],
    totalGenerated: 0,
    batches: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function saveProgress(progress: Progress): void {
  progress.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

function loadExistingTitles(progress: Progress): string[] {
  const titles: string[] = [];

  if (fs.existsSync(NETA_FILE)) {
    try {
      const neta = JSON.parse(fs.readFileSync(NETA_FILE, 'utf-8'));
      titles.push(...(neta.items ?? []).map((i: NetaItem) => i.title));
    } catch { /* ignore */ }
  }

  titles.push(...progress.generatedItems.map(i => i.title));
  return titles;
}

// ==========================================
// プロンプト生成
// ==========================================

function buildPrompt(
  startId: number,
  count: number,
  existingTitles: string[]
): string {
  return `あなたはスマホ向け超短時間ミニゲームのアイデアを大量生成するアシスタントです。

# タスク
${count}件のミニゲームアイデアをJSON配列で生成してください。
IDは ${startId} から ${startId + count - 1} を使用。

# 自由に発想してください
テーマもメカニクスも指定しません。
あなたが面白いと思うゲームを自由に考えてください。
ただし以下の多様性ルールを守ってください:

## 多様性ルール（1バッチ${count}件の中で）
- 同じテーマを3回以上使わない（例: 動物系が多すぎない）
- 同じ操作（タップ/スワイプ/ドラッグ/長押し）を5回以上使わない
- 類似したゲームプレイを繰り返さない（例: 「○○が来たらタップ」ばかりにならない）

## 操作の種類（必ずどれか1つ選ぶ）
- tap: 何かをタップする
- swipe: 方向にスワイプする
- drag: オブジェクトをドラッグして移動
- hold: 長押しで時間・力加減を調整
- flick: フリックして飛ばす

# 記述粒度（重要）

**良い例（中程度の粒度）:**
「3匹の魚が泳いでいる。1匹だけ違う向きを向いている。仲間外れを素早く見つけてタップせよ。
成功条件: 仲間外れをタップ
失敗条件: 間違いをタップ」

**NGな例（詳細すぎる / ピクセル指定）:**
「赤白ボール（SVG円100×100px、上半分#FF0000）が0.2秒ごとに揺れる」
↑ 色コード・ピクセルサイズ・アニメーション詳細は書かない

# ルール
1. 各アイデアは2〜5文で簡潔に
2. 「何が見えるか」「何をするか」「成功/失敗条件」を含める
3. 操作はtap/swipe/drag/hold/flickのどれか1種類
4. 5〜15秒で完結するミニゲーム（WarioWare感覚）
5. テーマが分かるタイトル（日本語10文字以内）
6. themeフィールド: 短い日本語テーマ（例: 宇宙、動物、料理）
${existingTitles.length > 0 ? `
# 既存タイトル（重複厳禁）
以下とは全く異なるゲームを作ってください:
${existingTitles.map(t => `- ${t}`).join('\n')}
` : ''}
# 出力フォーマット
JSON配列のみを出力してください（コードブロックなし、前置きなし）:
[
  {
    "id": ${startId},
    "title": "タイトル",
    "idea": "ゲームの説明。何が見えるか。プレイヤーが何をするか。\\n成功条件: ..\\n失敗条件: ..",
    "mechanic": "tap",
    "theme": "テーマ"
  },
  ...
]`;
}

// ==========================================
// バッチ生成
// ==========================================

async function generateBatch(
  client: Anthropic,
  batchIndex: number,
  startId: number,
  count: number,
  existingTitles: string[]
): Promise<NetaItem[]> {
  const prompt = buildPrompt(startId, count, existingTitles.slice(-30));

  console.log(`   📝 バッチ ${batchIndex + 1}: ID ${startId}〜${startId + count - 1}（自由生成）`);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    temperature: 1.0,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  let text = content.text.trim();

  // JSONブロックが含まれている場合は抽出
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) text = jsonMatch[1].trim();

  // 配列部分を抽出
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error(`No JSON array found in response: ${text.substring(0, 200)}`);

  const items: NetaItem[] = JSON.parse(arrayMatch[0]);

  // バリデーション
  const valid = items.filter(item => {
    if (!item.id || !item.title || !item.idea) return false;
    if (item.idea.includes('px') || /\#[0-9A-Fa-f]{3,6}/.test(item.idea)) {
      console.warn(`      ⚠️  ID ${item.id} にピクセル指定が含まれています（スキップ）: ${item.title}`);
      return false;
    }
    return true;
  });

  // IDを正規化（LLMがずれた場合の補正）
  valid.forEach((item, i) => { item.id = startId + i; });

  const themes = [...new Set(valid.map(i => i.theme ?? '不明'))];
  const mechanics = valid.reduce<Record<string, number>>((acc, i) => {
    const m = i.mechanic ?? '?';
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`      ✅ ${valid.length}/${items.length} 件を生成`);
  console.log(`      📊 テーマ: ${themes.slice(0, 6).join(', ')}${themes.length > 6 ? ' ...' : ''}`);
  console.log(`      🎮 操作分布: ${Object.entries(mechanics).map(([k, v]) => `${k}:${v}`).join(', ')}`);
  return valid;
}

// ==========================================
// --commit: neta.jsonにマージ
// ==========================================

function commitToNeta(progress: Progress): void {
  if (progress.generatedItems.length === 0) {
    console.log('❌ 生成済みアイテムがありません。先に生成してください。');
    return;
  }

  const netaData = JSON.parse(fs.readFileSync(NETA_FILE, 'utf-8'));
  const existingItems: NetaItem[] = netaData.items;

  // 既存IDセット
  const existingIds = new Set(existingItems.map((i: NetaItem) => i.id));

  // 重複除外
  const newItems = progress.generatedItems.filter(i => !existingIds.has(i.id));

  const merged = [...existingItems, ...newItems];

  const output = {
    version: '2.0',
    description: `${merged.length}件のミニゲームネタ帳（LLM生成 + オリジナル）`,
    totalCount: merged.length,
    items: merged,
  };

  fs.writeFileSync(NETA_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ neta.json を更新しました: ${existingItems.length} + ${newItems.length} = ${merged.length} 件`);
}

// ==========================================
// --status
// ==========================================

function showStatus(): void {
  const progress = loadProgress();
  const remaining = NEW_ITEMS - progress.totalGenerated;
  const batchesLeft = Math.ceil(remaining / BATCH_SIZE);

  console.log('\n📊 ネタ帳生成進捗:');
  console.log(`   目標: ${TARGET_TOTAL} 件（既存 ${EXISTING_COUNT} + 新規 ${NEW_ITEMS}）`);
  console.log(`   生成済み: ${progress.totalGenerated} / ${NEW_ITEMS} 件`);
  console.log(`   残り: ${remaining} 件（${batchesLeft} バッチ）`);
  console.log(`   進捗: ${((progress.totalGenerated / NEW_ITEMS) * 100).toFixed(1)}%`);
  if (progress.batches > 0) {
    console.log(`   実行バッチ数: ${progress.batches}`);
    console.log(`   最終更新: ${progress.updatedAt}`);
  }

  // neta.json の現状
  if (fs.existsSync(NETA_FILE)) {
    const neta = JSON.parse(fs.readFileSync(NETA_FILE, 'utf-8'));
    console.log(`\n   neta.json 現在: ${neta.totalCount} 件`);
  }
  console.log('');
}

// ==========================================
// メイン
// ==========================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    showStatus();
    return;
  }

  if (args.includes('--commit')) {
    const progress = loadProgress();
    commitToNeta(progress);
    return;
  }

  console.log('📓 ネタ帳バッチ生成スクリプト');
  console.log('================================\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY が設定されていません。');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const progress = loadProgress();

  showStatus();

  // 何バッチ実行するか
  const remaining = NEW_ITEMS - progress.totalGenerated;
  if (remaining <= 0) {
    console.log('🎉 全件生成済みです！ --commit で neta.json にマージできます。');
    return;
  }

  const allFlag = args.includes('--all');
  const batchCount = allFlag
    ? Math.ceil(remaining / BATCH_SIZE)
    : parseInt(args[0] ?? '1', 10);

  if (isNaN(batchCount) || batchCount < 1) {
    console.error('❌ バッチ数は1以上の整数で指定してください。');
    process.exit(1);
  }

  console.log(`🚀 ${Math.min(batchCount, Math.ceil(remaining / BATCH_SIZE))} バッチ（最大 ${Math.min(batchCount * BATCH_SIZE, remaining)} 件）を生成します\n`);

  let stopped = false;
  process.on('SIGINT', () => {
    stopped = true;
    console.log('\n\n⏹️ 中断します（進捗は保存済みです）...');
  });

  for (let b = 0; b < batchCount && !stopped; b++) {
    const stillRemaining = NEW_ITEMS - progress.totalGenerated;
    if (stillRemaining <= 0) break;

    const thisCount = Math.min(BATCH_SIZE, stillRemaining);
    const startId = EXISTING_COUNT + progress.totalGenerated + 1;

    try {
      const existingTitles = loadExistingTitles(progress);
      const items = await generateBatch(client, progress.batches, startId, thisCount, existingTitles);

      progress.generatedItems.push(...items);
      progress.totalGenerated += items.length;
      progress.batches += 1;
      saveProgress(progress);

      // 進捗表示
      const pct = ((progress.totalGenerated / NEW_ITEMS) * 100).toFixed(1);
      console.log(`   📈 累計: ${progress.totalGenerated}/${NEW_ITEMS} (${pct}%)\n`);

      // API rate limit 対策：バッチ間に少し待機
      if (b < batchCount - 1 && !stopped) {
        await new Promise(r => setTimeout(r, 1500));
      }

    } catch (err) {
      console.error(`   ❌ バッチ ${progress.batches + 1} でエラー:`, err);
      console.log('   進捗を保存して次のバッチへ...\n');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n✅ 生成完了！');
  showStatus();

  if (progress.totalGenerated >= NEW_ITEMS) {
    console.log('🎉 全600件の生成が完了しました！');
    console.log('   以下のコマンドで neta.json にマージしてください:');
    console.log('   npx tsx src/ai/v2/generate-neta.ts --commit\n');
  } else {
    console.log('📌 続きを実行するには:');
    console.log('   npx tsx src/ai/v2/generate-neta.ts       # 20件ずつ');
    console.log('   npx tsx src/ai/v2/generate-neta.ts 5     # 5バッチ(100件)');
    console.log('   npx tsx src/ai/v2/generate-neta.ts --all # 全件\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
