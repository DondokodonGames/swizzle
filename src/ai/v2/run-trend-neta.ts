/**
 * run-trend-neta.ts — SNSバズ→ゲーム化ネタ変換 (Phase 1: 手動投入+LLM解析)
 *
 * trend-sources.json に人間が貼ったトレンド(X/TikTok/ニュースの話題)を、
 * LLM が「Swizzleのメカニクスで遊びにできるネタ」へ変換し
 * neta-trend.json (neta.json と同形式 + trendSource/寿命タグ) に追記する。
 *
 * 使い方:
 *   npm run ai:neta:trend              # 未処理のトレンドを全部ネタ化
 *   DRY_RUN=true npm run ai:neta:trend # LLMを呼ばずモックで動作確認
 *
 * 出力ネタは run-code-neta.ts 等のネタ入力として使える。
 * アップロード時は @trend ヘッダー経由で user_games.trend_source に載り、
 * フィードの「いまのネタ」セクションの抽出キーになる。
 *
 * 外部API(トレンド自動収集・SNS自動投稿)は承認後の Phase 2。
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCES_FILE = path.join(__dirname, 'trend-sources.json');
const OUTPUT_FILE = path.join(__dirname, 'neta-trend.json');

interface TrendSource {
  id: string;
  topic: string;
  context?: string;
  url?: string;
  addedAt?: string;
  processed?: boolean;
}

interface TrendNetaItem {
  id: number;
  title: string;
  idea: string;
  mechanic: string;
  theme: string;
  /** 元トレンドのID(user_games.trend_source に載る) */
  trendSource: string;
  /** ネタの賞味期限の目安: evergreen | seasonal | flash */
  lifespan: 'evergreen' | 'seasonal' | 'flash';
}

interface TrendNetaFile {
  comment: string;
  totalCount: number;
  items: TrendNetaItem[];
}

function loadSources(): { comment?: string; sources: TrendSource[] } {
  if (!fs.existsSync(SOURCES_FILE)) {
    console.error(`❌ ${SOURCES_FILE} がありません`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
}

function loadOutput(): TrendNetaFile {
  if (fs.existsSync(OUTPUT_FILE)) {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  }
  return {
    comment: 'SNSトレンド由来のゲームネタ(ai:neta:trend が生成)。neta.json と同形式 + trendSource/lifespan。',
    totalCount: 0,
    items: [],
  };
}

function buildPrompt(source: TrendSource, nextId: number): string {
  return `あなたはSNSでバズった話題を、スマホ向け5〜30秒ミニゲームの企画に変換するゲームデザイナーです。

# 入力トレンド
- 話題: ${source.topic}
- 背景: ${source.context || '(なし)'}

# タスク
このトレンドを知っている人が「あ、あれだ！」と笑って、思わずシェアしたくなるミニゲームのネタを2件、JSON配列で出力してください。

# 制約
- 操作は タップ / スワイプ / 長押し / ドラッグ / 引っ張って離す のいずれか(スマホ縦画面・片手)
- 5〜30秒で決着し、成功と失敗がはっきりある遊びにする
- プレイヤーの選択・操作に対して正解/不正解の手応えがある構造にする
- ピクセル数や色コード等の実装詳細は書かない(遊びの内容だけ)
- mechanic は次から選ぶ: timing_one_shot, mash, hold_charge, hold_release, aim_shoot, slingshot, flick_launch, dodge, drag_follow, balance, freeze, trace, slice, rub, stack, drop_timing, gap_fit, spot, judge, memory_sequence, count, sort, rhythm, duel_2p, camera_climb
- lifespan: evergreen(いつでも通じる) / seasonal(季節もの) / flash(旬が短い)

# 出力形式(JSON配列のみ、説明文なし)
[
  {
    "id": ${nextId},
    "title": "12文字以内の日本語タイトル",
    "idea": "遊びの内容を2〜4文で。何をどう操作し、何が成功/失敗かまで書く",
    "mechanic": "上のリストから1つ",
    "theme": "世界観テーマを1語(例: animal, onsen, food)",
    "lifespan": "evergreen|seasonal|flash"
  }
]`;
}

function mockItems(source: TrendSource, nextId: number): TrendNetaItem[] {
  return [
    {
      id: nextId,
      title: `${source.topic.slice(0, 8)}ゲーム`,
      idea: `(DRY_RUN モック) ${source.topic} をテーマにしたタイミングゲーム。ベストな瞬間にタップすると成功、外すと失敗。`,
      mechanic: 'timing_one_shot',
      theme: 'trend',
      trendSource: source.id,
      lifespan: 'flash',
    },
  ];
}

async function convertSource(
  client: Anthropic | null,
  source: TrendSource,
  nextId: number
): Promise<TrendNetaItem[]> {
  if (!client) return mockItems(source, nextId);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    temperature: 0.9,
    messages: [{ role: 'user', content: buildPrompt(source, nextId) }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  let text = content.text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) text = jsonMatch[1].trim();
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error(`No JSON array in response: ${text.slice(0, 200)}`);

  const raw = JSON.parse(arrayMatch[0]) as Array<Partial<TrendNetaItem>>;
  const valid: TrendNetaItem[] = [];
  for (const item of raw) {
    if (!item.title || !item.idea || !item.mechanic) continue;
    valid.push({
      id: nextId + valid.length,
      title: item.title,
      idea: item.idea,
      mechanic: item.mechanic,
      theme: item.theme || 'trend',
      trendSource: source.id,
      lifespan: (['evergreen', 'seasonal', 'flash'] as const).includes(item.lifespan as never)
        ? (item.lifespan as TrendNetaItem['lifespan'])
        : 'flash',
    });
  }
  return valid;
}

async function main() {
  console.log('📈 SNSトレンド → ゲームネタ変換');
  console.log('====================================\n');

  const dryRun = process.env.DRY_RUN === 'true';
  const sourcesFile = loadSources();
  const pending = sourcesFile.sources.filter((s) => !s.processed);

  if (pending.length === 0) {
    console.log('✅ 未処理のトレンドはありません(trend-sources.json に追記してください)');
    return;
  }
  console.log(`📥 未処理トレンド: ${pending.length} 件${dryRun ? ' (DRY_RUN)' : ''}\n`);

  let client: Anthropic | null = null;
  if (!dryRun) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY がありません (DRY_RUN=true でモック実行可)');
      process.exit(1);
    }
    client = new Anthropic({ apiKey });
  }

  const output = loadOutput();
  let nextId = output.items.reduce((max, i) => Math.max(max, i.id), 100000) + 1;
  let converted = 0;

  for (const source of pending) {
    console.log(`🔄 ${source.id}: ${source.topic}`);
    try {
      const items = await convertSource(client, source, nextId);
      for (const item of items) {
        console.log(`   ✅ #${item.id} ${item.title} [${item.mechanic}/${item.lifespan}]`);
      }
      output.items.push(...items);
      nextId += items.length;
      converted += items.length;
      source.processed = true;
    } catch (err) {
      console.error(`   ❌ 変換失敗: ${err instanceof Error ? err.message : err}`);
    }
  }

  output.totalCount = output.items.length;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(sourcesFile, null, 2), 'utf-8');

  console.log('\n====================================');
  console.log(`✅ ${converted} 件のネタを追加 → ${OUTPUT_FILE}`);
  console.log('   次: ネタからのゲーム生成は ai:code:neta 系、公開時は @trend ヘッダーで user_games.trend_source に紐付け');
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
