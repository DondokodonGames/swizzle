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

// テーマグループ（バッチごとに異なるテーマを強制）
const THEME_GROUPS = [
  '動物・自然（猫、犬、鳥、虫、魚、花、木、海、山、空）',
  '食べ物・料理（寿司、ラーメン、スイーツ、果物、野菜、料理器具）',
  'スポーツ・体育（野球、サッカー、テニス、水泳、体操、格闘技）',
  '日本文化（忍者、侍、妖怪、神社、お祭り、茶道、相撲）',
  'ファンタジー・魔法（魔法使い、ドラゴン、勇者、宝箱、魔王）',
  '宇宙・SF（宇宙人、ロケット、惑星、ロボット、タイムマシン）',
  '職業・仕事（医者、料理人、消防士、警察、農家、パン屋）',
  '乗り物・交通（電車、飛行機、車、船、自転車、バイク）',
  '音楽・楽器（ギター、ドラム、ピアノ、歌、DJ、オーケストラ）',
  '歴史・伝説（恐竜、古代エジプト、騎士、海賊、探検家）',
  '天気・季節（雨、雪、台風、虹、落ち葉、桜）',
  '学校・勉強（算数、理科、体育、図工、テスト、部活）',
  'ゲーム・アニメ（レトロゲーム風、マンガ風、アーケード風）',
  '海・水中（サメ、クジラ、タコ、珊瑚、宝物、潜水艦）',
  '夜・夢・不思議（幽霊、夢の中、影、鏡、記憶、時間）',
  '都市・街（渋谷、秋葉原、縁日、工事現場、デパート）',
  '科学・実験（化学反応、電気、磁石、顕微鏡、ロケット燃料）',
  '農業・植物（種まき、水やり、収穫、虫退治、天気管理）',
  '芸術・工作（絵描き、粘土、折り紙、陶芸、木工）',
  'スイーツ・お菓子（チョコレート、アイス、ケーキ、飴、クッキー）',
  'お正月・行事（初日の出、福笑い、凧揚げ、餅つき、おみくじ）',
  'アウトドア・冒険（キャンプ、釣り、登山、サバイバル、宝探し）',
  '動物園・サーカス（ライオン、ゾウ、空中ブランコ、綱渡り）',
  '幼稚園・おもちゃ（積み木、だるまさん、おままごと、シャボン玉）',
  '医療・健康（注射、包帯、薬、体温計、手術、歯医者）',
  'レストラン・接客（注文、料理提供、お会計、席案内）',
  '空想・SFギミック（透明、縮小、分身、テレポート、タイムループ）',
  '伝統芸能（歌舞伎、能、落語、和太鼓、三味線）',
  '感情・心理（喜怒哀楽、共感、記憶、トラウマ克服）',
  '建築・工事（ビル建設、橋、トンネル、解体）',
];

// メカニクス例示（各バッチで違うメカニクスを優先）
const MECHANIC_ROTATIONS = [
  'タイミング一発タップ（移動するものが特定位置に来た瞬間だけタップ）',
  'ドラッグ配置（オブジェクトを正しい場所にドラッグ）',
  '方向スワイプ判断（見て正しい方向にスワイプ）',
  '長押しチャージ（ちょうどよいタイミングで離す）',
  '正解を1つ選ぶ（複数の中から条件に合う1つをタップ）',
  '順序タップ（2〜3個を正しい順番でタップ）',
  '回避生存（障害物をドラッグで避け続ける）',
  'ドラッグでゴール到達（ゴール地点まで誘導する）',
  '仲間外れを見つけてタップ（1つだけ違うものをタップ）',
  'フリック発射（フリックして目標に当てる）',
  'ちょうどN回タップ（超えると失敗）',
  '選別タップ（安全なものだけタップ、危険なものは触れない）',
  'シルエット合わせ（正しいオブジェクトをシルエットに重ねる）',
  'チャンスウィンドウタップ（特定の瞬間だけタップ有効）',
  '長押し時間調整（正確にN秒間だけ押す）',
  '左右交互タップ（交互にリズムよくタップ）',
  'A→B接続ドラッグ（始点から終点までドラッグして繋ぐ）',
  '大小・違い瞬間判断（最も大きい/違うものを瞬時にタップ）',
  '仕分けドラッグ（複数をカテゴリ別にドラッグして仕分け）',
  'ペア発見タップ（対になる2つを見つけてタップ）',
];

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

// ==========================================
// プロンプト生成
// ==========================================

function buildPrompt(
  batchIndex: number,
  startId: number,
  themeGroup: string,
  mechanic: string,
  count: number
): string {
  return `あなたはスマホ向け超短時間ミニゲームのアイデアを大量生成するアシスタントです。

# タスク
${count}件のミニゲームアイデアをJSON配列で生成してください。
- 今回のテーマグループ: **${themeGroup}**
- 優先するメカニクス: **${mechanic}**
- IDは ${startId} から ${startId + count - 1} を使用

# 記述粒度（重要）

**良い例（中程度の粒度）:**
\`\`\`
「ビルの窓が左右交互に光る。左窓と右窓が同時に光った0.5秒の間だけ壁に掴める。タイミングを見極めて交互タップで頂上まで登れ。
成功条件: 10回掴んで頂上到達
失敗条件: タイミングを外したら落下」

「3匹の魚が泳いでいる。1匹だけ違う向きを向いている。仲間外れを素早く見つけてタップせよ。
成功条件: 仲間外れをタップ
失敗条件: 間違いをタップ」

「スシが高速ベルトコンベアで流れてくる。注文の品（上部に表示）が来た瞬間だけタップして取れ。
成功条件: 注文通りのネタを3つ取る
失敗条件: 違うネタをタップ、または時間切れ」
\`\`\`

**NGな例（詳細すぎる / ピクセル指定）:**
\`\`\`
「赤白モンスターボール（SVG円100×100px、上半分#FF0000、下半分#FFFFFF）が0.2秒ごとに±5度揺れる。30回タップ、タップで1.2倍拡大+赤パルス（0.1秒）」
\`\`\`
↑ 色コード、ピクセルサイズ、アニメーション詳細は書かない。ゲームプレイの本質だけ書く。

# ルール
1. 各アイデアは2〜5文で簡潔に（長すぎない）
2. 「何が見えるか」「何をするか」「成功/失敗条件」を含める
3. 操作はタップ/スワイプ/ドラッグ/フリック/長押しのどれか1種類
4. 5〜15秒で完結するミニゲーム
5. テーマが分かるタイトル（日本語10文字以内）
6. 「mechanic」フィールド: tap / swipe / drag / flick / hold のどれかを使用
7. 「theme」フィールド: 短い日本語テーマ（例: 食べ物、動物、宇宙）

# 出力フォーマット
JSON配列のみを出力してください（コードブロックなし）:
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
  count: number
): Promise<NetaItem[]> {
  const themeGroup = THEME_GROUPS[batchIndex % THEME_GROUPS.length];
  const mechanic = MECHANIC_ROTATIONS[batchIndex % MECHANIC_ROTATIONS.length];
  const prompt = buildPrompt(batchIndex, startId, themeGroup, mechanic, count);

  console.log(`   📝 バッチ ${batchIndex + 1}: ID ${startId}〜${startId + count - 1}`);
  console.log(`      テーマ: ${themeGroup.split('（')[0]}`);
  console.log(`      メカニクス: ${mechanic.split('（')[0]}`);

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
    if (item.idea.includes('px') || item.idea.includes('#FF') || item.idea.includes('#00')) {
      console.warn(`      ⚠️  ID ${item.id} にピクセル指定が含まれています（スキップ）: ${item.title}`);
      return false;
    }
    return true;
  });

  // IDを正規化（LLMがずれた場合の補正）
  valid.forEach((item, i) => { item.id = startId + i; });

  console.log(`      ✅ ${valid.length}/${items.length} 件を生成`);
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

  let totalCost = 0;

  for (let b = 0; b < batchCount && !stopped; b++) {
    const stillRemaining = NEW_ITEMS - progress.totalGenerated;
    if (stillRemaining <= 0) break;

    const thisCount = Math.min(BATCH_SIZE, stillRemaining);
    const startId = EXISTING_COUNT + progress.totalGenerated + 1;

    try {
      const items = await generateBatch(client, progress.batches, startId, thisCount);

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
