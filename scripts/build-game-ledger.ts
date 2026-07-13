/**
 * build-game-ledger.ts — 800コードゲームの個票台帳(ledger)生成
 *
 * 全ゲーム(src/ai/code/examples/*.js)を静的解析し、遊びの文法v3リファクタ
 * (docs/specifications/PLAY_GRAMMAR_V3.md / docs/work-plans/61-800-games-ledger.md)の
 * 作業割当・進捗追跡に使う3ファイルを docs/work-plans/ledger/ に出力する:
 *
 *   game-ledger.csv        計測値の個票。**完全自動生成・手編集禁止**(いつでも再生成可)
 *   game-ledger-summary.md 集計と既知事実との突合(再生成のたびに更新)
 *   game-assignments.csv   割当+進捗の台帳本体(**初回のみ生成**。以後は人間/バッチが編集)
 *
 * 使い方:
 *   npm run games:ledger                 # ledger + summary を再生成(assignments は無ければ生成)
 *   npm run games:ledger -- --reassign   # assignments も再生成(既存の進捗を破棄するので注意)
 *   npm run games:ledger -- --review     # メカニクス推定の人間監査用 mechanic-review.md も出力
 *
 * メカニクス推定は3系統(slug語彙 / ヘッダー3-4行目の日本語 / API使用)の合議 +
 * 手動確定ファイル mechanic-overrides.json(slug → mechanic ID)で上書きする。
 * 同一slugは同一メカニクスとして slug 単位で確定し、全ファイルに伝播する。
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CodeGameValidator } from '../src/ai/code/CodeGameValidator.js';
import { CodeQualityScorer } from '../src/ai/code/CodeQualityScorer.js';
// メカニクスカタログ・尺帯域・ONE_SHOT_OK は共通モジュールに集約(validator/scorer と単一の真実の源)。
// 変更は src/ai/code/mechanics-v3.ts で行う(PLAY_GRAMMAR_V3 §4/§5 と同期)。
import {
  MECHANIC_FAMILY, DURATION_BAND, DURATION_BAND_OVERRIDE, ONE_SHOT_OK,
} from '../src/ai/code/mechanics-v3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(__dirname, '../src/ai/code/examples');
const LEDGER_DIR = path.resolve(__dirname, '../docs/work-plans/ledger');
const OVERRIDES_FILE = path.join(LEDGER_DIR, 'mechanic-overrides.json');

// ── メカニクス推定ルール ─────────────────────────────────────────────────
// ヘッダー3行目(操作:)+4行目(成功/失敗)の日本語に対するルール。重みは特異性。
const JP_RULES: Array<[RegExp, string, number]> = [
  [/順に|順番にタップ|光った順|同じ順/, 'memory_sequence', 3],
  [/(同じ絵|ペア|めくっ|神経衰弱)/, 'pair_match', 3],
  [/連打/, 'mash', 3],
  [/交互/, 'alternate_tap', 3],
  [/(だるまさん|見られて|触らない|動くな|触れずに)/, 'freeze', 3],
  [/(リズム|拍に|ビート|音符)/, 'rhythm', 2.5],
  [/なぞ/, 'trace', 3],
  [/(切る|切って|切り裂|切り落|切断|斬)/, 'slice', 3],
  [/(こす|磨い|削っ)/, 'rub', 3],
  [/(円を描|ダイヤル|ネジ)/, 'rotate_gesture', 3],
  [/(方向へスワイプ|方向にスワイプ|仕分け|振り分け)/, 'swipe_direction', 3],
  [/フリック/, 'flick_launch', 3],
  [/(引いて放|引っ張って|パチンコ)/, 'slingshot', 3],
  [/(長押し|押し続け|押している間|チャージ.*離)/, 'hold_charge', 2.5],
  [/(避け|かわし|よけ)/, 'dodge', 3],
  [/(狙って|照準|撃つ|撃って|射撃)/, 'aim_shoot', 2.5],
  [/(落とし|投下|落下させ)/, 'drop_timing', 2],
  [/(積み|積む|積んで|重ねて)/, 'stack', 2.5],
  [/(隙間|穴に|通して|通過させ)/, 'gap_fit', 2],
  [/押し出/, 'push_out', 3],
  [/(並べ|整列|並び替え)/, 'drag_sort', 2.5],
  [/(つなぐ|つないで|結ぶ|結んで|配線)/, 'connect', 3],
  [/(ちょうど|ぴったり)[^。]*回/, 'count_exact', 3],
  [/(探して|見つけて|見つけたら)/, 'spot', 3],
  [/(どちらが|多い方|大きい方|速い方)/, 'size_judge', 3],
  [/数えて/, 'counting', 3],
  [/(合図|早押し|フライング)/, 'reaction_duel', 2.5],
  [/(2人|二人|対戦)/, 'duel_2p', 3],
  [/(傾き|バランス|重心|傾け)/, 'balance', 2.5],
  [/(迷路|はみ出さ|コースに沿|線路)/, 'guide_path', 2.5],
  [/(登り|登って|上昇|高度)/, 'camera_climb', 2],
  [/(ジャンプ|走り|障害物を飛)/, 'camera_run', 2],
  [/(捕まえ|捕獲)/, 'chase', 1.5],
  [/(来た瞬間|重なった(ら|瞬間)|止め(る|て)|止まった瞬間|タイミングよく|タイミングで)/, 'timing_one_shot', 2],
  [/(ゾーン内|窓|範囲内で)/, 'timing_window', 1.5],
  [/(判定|選んで|正しい方)/, 'judge', 1.5],
  [/覚え/, 'memory_sequence', 2],
  [/(数字|番号|小さい順|大きい順)を?.*順/, 'spot', 2.5],
  [/押している間だけ/, 'hold_charge', 2.5],
  [/スワイプ.*(移動|回避)/, 'dodge', 2],
];

// slug 語彙ルール(スラグをトークン分解して照合)
const SLUG_RULES: Array<[RegExp, string, number]> = [
  [/^(mash|rush|frenzy)$/, 'mash', 3],
  [/^dodge$/, 'dodge', 3],
  [/^(memory|recall|simon|echo)$/, 'memory_sequence', 2],
  [/^(match|pairs?)$/, 'pair_match', 2],
  [/^(stack|tower|pile)$/, 'stack', 2.5],
  [/^balance$/, 'balance', 3],
  [/^(maze|path|route)$/, 'guide_path', 2],
  [/^(slice|cut|slash)$/, 'slice', 3],
  [/^trace$/, 'trace', 3],
  [/^(spin|rotate|dial|crank)$/, 'rotate_gesture', 2],
  [/^(swipe|flick)$/, 'swipe_direction', 2],
  [/^(jump|run|runner|dash)$/, 'camera_run', 2],
  [/^(climb|rise|ascent)$/, 'camera_climb', 2],
  [/^(aim|snipe|sniper|shot|shoot|target)$/, 'aim_shoot', 2.5],
  [/^(count|counting)$/, 'counting', 2.5],
  [/^(spot|find|hidden|seek)$/, 'spot', 2.5],
  [/^(react|reaction|reflex|signal|duel)$/, 'reaction_duel', 2],
  [/^freeze$/, 'freeze', 3],
  [/^(rhythm|beat|tempo)$/, 'rhythm', 3],
  [/^(sort|order)$/, 'drag_sort', 1.5],
  [/^(connect|link|wire)$/, 'connect', 2],
  [/^(catch|catcher)$/, 'chase', 1],
  [/^(pop|burst)$/, 'aim_shoot', 1.5],
  [/^(hold|charge)$/, 'hold_charge', 2.5],
  [/^drop$/, 'drop_timing', 2],
  [/^(judge|quiz|choice)$/, 'judge', 2],
  [/^tap$/, 'timing_one_shot', 0.5],
];

// ── テーマ語彙プール(PLAY_GRAMMAR_V3 §テーマ表と同期を保つこと) ─────────
interface ThemeDef { id: string; jp: string; packs: string[]; kw: RegExp }
const THEMES: ThemeDef[] = [
  { id: 'space',     jp: '宇宙ステーション', packs: ['80s NEON', '70s MONO'],            kw: /宇宙|ロケット|星雲|衛星/ },
  { id: 'ocean',     jp: '深海',             packs: ['90s 16bit', '80s NEON'],           kw: /海|深海|潜水|魚|クラゲ/ },
  { id: 'forest',    jp: '森の奥地',         packs: ['90s 16bit'],                       kw: /森|ジャングル|木/ },
  { id: 'candy',     jp: 'お菓子工場',       packs: ['2000s ARCADE POP'],                kw: /菓子|キャンディ|ケーキ|チョコ/ },
  { id: 'robot',     jp: 'ロボット工房',     packs: ['70s MONO', 'NEO-RETRO'],           kw: /ロボ|機械|アンドロイド/ },
  { id: 'ninja',     jp: '忍者屋敷',         packs: ['NEO-RETRO'],                       kw: /忍者|手裏剣/ },
  { id: 'ghost',     jp: 'おばけ屋敷',       packs: ['NEO-RETRO', '80s NEON'],           kw: /おばけ|幽霊|ホラー|墓/ },
  { id: 'kitchen',   jp: 'キッチン',         packs: ['90s 16bit', '2000s ARCADE POP'],   kw: /キッチン|料理|厨房|フライパン/ },
  { id: 'sports',    jp: 'スタジアム',       packs: ['2000s ARCADE POP', '90s 16bit'],   kw: /スタジアム|スポーツ|サッカー|野球/ },
  { id: 'circus',    jp: 'サーカス',         packs: ['2000s ARCADE POP'],                kw: /サーカス|曲芸|ピエロ/ },
  { id: 'dungeon',   jp: 'ダンジョン',       packs: ['NEO-RETRO', '70s MONO'],           kw: /ダンジョン|洞窟|遺跡|地下/ },
  { id: 'witch',     jp: '魔女の工房',       packs: ['80s NEON', 'NEO-RETRO'],           kw: /魔女|魔法|錬金/ },
  { id: 'western',   jp: '西部の荒野',       packs: ['NEO-RETRO', '70s MONO'],           kw: /西部|荒野|ガンマン|決闘/ },
  { id: 'snow',      jp: '雪山',             packs: ['90s 16bit', '70s MONO'],           kw: /雪|氷|吹雪|ペンギン/ },
  { id: 'night_city',jp: '夜の街',           packs: ['80s NEON'],                        kw: /夜の街|ネオン街|ビル|都市/ },
  { id: 'farm',      jp: '牧場',             packs: ['90s 16bit', '2000s ARCADE POP'],   kw: /牧場|農場|畑|収穫/ },
  { id: 'insect',    jp: '昆虫の草むら',     packs: ['90s 16bit'],                       kw: /虫|昆虫|草むら|ハチ/ },
  { id: 'dino',      jp: '恐竜時代',         packs: ['90s 16bit'],                       kw: /恐竜|化石|原始/ },
  { id: 'pirate',    jp: '海賊船',           packs: ['90s 16bit', 'NEO-RETRO'],          kw: /海賊|宝箱|大砲/ },
  { id: 'samurai',   jp: '侍道場',           packs: ['NEO-RETRO', '70s MONO'],           kw: /侍|道場|刀|武士/ },
  { id: 'factory',   jp: '工場ライン',       packs: ['70s MONO', '80s NEON'],            kw: /工場|ライン|プレス|ベルトコンベア/ },
  { id: 'music',     jp: '音楽ステージ',     packs: ['2000s ARCADE POP', '80s NEON'],    kw: /音楽|ライブ|ステージ|コンサート/ },
  { id: 'school',    jp: '学校',             packs: ['2000s ARCADE POP', '90s 16bit'],   kw: /学校|教室|黒板|テスト/ },
  { id: 'cat',       jp: 'ネコの家',         packs: ['90s 16bit', '2000s ARCADE POP'],   kw: /ネコ|猫|子犬|ペット/ },
];
const ALL_PACKS = ['70s MONO', '80s NEON', '90s 16bit', '2000s ARCADE POP', 'NEO-RETRO'];

// メカニクス族×ムードのBGM方針(melody固有化が第一候補、プリセットは代替)
function bgmDirection(mechanic: string, themeId: string): string {
  if (mechanic === 'rhythm') return 'melody必須(拍=ゲームイベント同期)';
  const dark = new Set(['ghost', 'dungeon', 'witch']);
  const cute = new Set(['candy', 'cat', 'farm', 'school', 'circus']);
  const tense = new Set(['dodge', 'freeze', 'reaction_duel', 'duel_2p', 'balance', 'chase']);
  if (dark.has(themeId)) return 'melody(固有) / 代替bgm_dark';
  if (cute.has(themeId)) return 'melody(固有) / 代替bgm_cute';
  if (tense.has(mechanic)) return 'melody(固有) / 代替bgm_tense';
  return 'melody(固有) / 代替bgm_tense|cute';
}

// ── 解析 ─────────────────────────────────────────────────────────────────
interface GameRow {
  id: number | null;
  filename: string;
  slug: string;
  dupGroup: string;
  dupSize: number;
  title: string;
  desc: string;
  ctrlLine: string;
  winLoseLine: string;
  lines: number;
  mechanicTag: string;
  themeTag: string;
  maxTime: number | null;
  needed: number | null;
  nerfCount: number;
  finishDelayMs: number | null;
  seList: string[];
  bgmList: string[];
  usesMelody: boolean;
  usesTone: boolean;
  usesFeedback: boolean;
  fxList: string[];
  usesSprite: boolean;
  usesGradient: boolean;
  usesBest: boolean;
  usesPressMove: boolean;
  usesTouches: boolean;
  usesInputPressing: boolean;
  howToPlay: string;
  textLiteralCount: number;
  longestTextLiteral: number;
  jpInLiterals: boolean;
  fakeHiScore: boolean;
  worldview: string;
  hasScanlines: boolean;
  hasSnap: boolean;
  hasTimeBar: boolean;
  hasCoinInsert: boolean;
  hasAttract: boolean;
  scoreTotal: number;
  scoreBreakdown: string;
  validationErrors: number;
  topHints: string;
  // 推定
  mechGuess: string;
  mechConfidence: 'high' | 'med' | 'low';
  mechSource: string;
}

function headerLines(code: string): string[] {
  const out: string[] = [];
  for (const line of code.split('\n').slice(0, 12)) {
    const m = /^\s*\/\/\s?(.*)$/.exec(line);
    if (m) out.push(m[1].trim());
    else if (out.length > 0) break;
  }
  return out;
}

function extractStringLiterals(code: string): string[] {
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) out.push(m[1] ?? m[2] ?? '');
  return out;
}

function inferMechanic(
  slug: string,
  jpText: string
): { mech: string; conf: 'high' | 'med' | 'low'; source: string } {
  const slugScores: Record<string, number> = {};
  for (const token of slug.split('-')) {
    for (const [re, mech, w] of SLUG_RULES) {
      if (re.test(token)) slugScores[mech] = (slugScores[mech] || 0) + w;
    }
  }
  const jpScores: Record<string, number> = {};
  for (const [re, mech, w] of JP_RULES) {
    if (re.test(jpText)) jpScores[mech] = (jpScores[mech] || 0) + w;
  }
  const top = (s: Record<string, number>): [string, number] | null => {
    let best: [string, number] | null = null;
    for (const k in s) if (!best || s[k] > best[1]) best = [k, s[k]];
    return best;
  };
  const slugTop = top(slugScores);
  const jpTop = top(jpScores);

  if (slugTop && jpTop && slugTop[0] === jpTop[0]) {
    return { mech: slugTop[0], conf: 'high', source: 'slug+jp' };
  }
  if (jpTop && jpTop[1] >= 3) {
    return { mech: jpTop[0], conf: slugTop ? 'med' : 'med', source: 'jp' };
  }
  if (slugTop && slugTop[1] >= 2.5 && !jpTop) {
    return { mech: slugTop[0], conf: 'med', source: 'slug' };
  }
  if (jpTop) return { mech: jpTop[0], conf: 'low', source: 'jp-weak' };
  if (slugTop) return { mech: slugTop[0], conf: 'low', source: 'slug-weak' };
  return { mech: 'timing_one_shot', conf: 'low', source: 'default' };
}

function analyzeFile(filename: string, code: string, validator: CodeGameValidator, scorer: CodeQualityScorer): GameRow {
  const base = path.basename(filename, '.js');
  const numMatch = /^(\d{3})-(.+)$/.exec(base);
  const id = numMatch ? parseInt(numMatch[1], 10) : null;
  const slug = numMatch ? numMatch[2] : base;

  const hdr = headerLines(code);
  const titleLine = hdr[1] || '';
  const tSplit = titleLine.split(' — ');
  const title = (tSplit[0] || '').trim();
  const desc = (tSplit[1] || '').trim();
  const ctrlLine = (hdr.find((l) => /^操作[::]/.test(l)) || '').replace(/^操作[::]\s*/, '');
  const winLoseLine = (hdr.find((l) => /^成功[::]/.test(l)) || '').replace(/^成功[::]\s*/, '');
  const mechanicTag = (code.match(/^\/\/\s*@mechanic:\s*(\S+)/m) || [])[1] || '';
  const themeTag = (code.match(/^\/\/\s*@theme:\s*(\S+)/m) || [])[1] || '';
  const worldview = (code.match(/\/\/\s*世界観[::]\s*(.*)/) || [])[1]?.trim() || '';

  const maxTime = (() => {
    const m = code.match(/(?:MAX_TIME|TIME_LIMIT)\s*=\s*([\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  })();
  const needed = (() => {
    const m = code.match(/NEEDED\s*=\s*(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  })();
  const nerfCount = (code.match(/\/\/\s*修正/g) || []).length;
  const finishDelayMs = (() => {
    const m = code.match(/setTimeout\s*\(\s*function\s*\(\s*\)\s*\{[^}]*game\.end[^}]*\}\s*,\s*(\d+)\s*\)/);
    return m ? parseInt(m[1], 10) : null;
  })();

  const seList = [...new Set(code.match(/se_[a-z_]+/g) || [])].sort();
  const bgmList = [...new Set(code.match(/bgm_[a-z_]+/g) || [])].sort();
  const fxList = [...new Set((code.match(/game\.fx\.(burst|popup|flash|shake)/g) || []).map((s) => s.replace('game.fx.', '')))].sort();

  const literals = extractStringLiterals(code);
  const textLiterals = literals.filter((s) => s.trim().length >= 2 && !/^se_|^bgm_|^#/.test(s));
  const longest = textLiterals.reduce((a, s) => Math.max(a, s.length), 0);
  const howToPlay = (code.match(/HOW_TO_PLAY\s*=\s*(?:'([^']*)'|"([^"]*)")/) || [])[1] || '';
  const usesBest = code.includes('game.best');
  const fakeHiScore = !usesBest && literals.some((s) => /HI-?\s?SCORE/i.test(s) || /^0{2,}\d+$/.test(s.trim())) && /HI-?SCORE/i.test(code);

  const validation = validator.validate(code);
  const score = scorer.score(code, null, validation, null);

  const jpText = `${ctrlLine} ${winLoseLine} ${desc}`;
  const guess = inferMechanic(slug, jpText);

  return {
    id, filename: path.basename(filename), slug,
    dupGroup: slug, dupSize: 1,
    title, desc, ctrlLine, winLoseLine,
    lines: code.split('\n').length,
    mechanicTag, themeTag, maxTime, needed, nerfCount, finishDelayMs,
    seList, bgmList,
    usesMelody: code.includes('game.audio.melody('),
    usesTone: code.includes('game.audio.tone('),
    usesFeedback: code.includes('game.feedback.'),
    fxList,
    usesSprite: code.includes('game.draw.sprite('),
    usesGradient: code.includes('game.draw.gradient('),
    usesBest,
    usesPressMove: /game\.on(Press|Move|Release)\s*\(/.test(code),
    usesTouches: code.includes('game.touches'),
    usesInputPressing: code.includes('game.input'),
    howToPlay,
    textLiteralCount: textLiterals.length,
    longestTextLiteral: longest,
    jpInLiterals: textLiterals.some((s) => /[ぁ-んァ-ヶ一-龠]/.test(s)),
    fakeHiScore,
    worldview,
    hasScanlines: /function\s+scanlines/.test(code),
    hasSnap: /function\s+snap/.test(code),
    hasTimeBar: /function\s+timeBar/.test(code),
    hasCoinInsert: code.includes('100円'),
    hasAttract: /\bATTRACT\b/.test(code),
    scoreTotal: score.total,
    scoreBreakdown: `${score.breakdown.actionFeedback}/${score.breakdown.audioVisual}/${score.breakdown.layout}/${score.breakdown.goalEndings}/${score.breakdown.structure}/${score.breakdown.runtime}`,
    validationErrors: score.validationErrors,
    topHints: score.hints.slice(0, 3).join('; '),
    mechGuess: guess.mech, mechConfidence: guess.conf, mechSource: guess.source,
  };
}

// slug 単位でメカニクスを確定(多数決)し、override を適用して全行に伝播
function consolidateMechanics(rows: GameRow[], overrides: Record<string, string>): void {
  const bySlug = new Map<string, GameRow[]>();
  for (const r of rows) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug)!.push(r);
  }
  for (const [slug, group] of bySlug) {
    for (const r of group) r.dupSize = group.filter((g) => g.id !== null).length;
    if (overrides[slug]) {
      const mech = overrides[slug];
      if (!MECHANIC_FAMILY[mech]) {
        console.warn(`⚠️  override の ${slug} → ${mech} はカタログに無いIDです(無視)`);
        continue;
      }
      for (const r of group) { r.mechGuess = mech; r.mechConfidence = 'high'; r.mechSource = 'override'; }
      continue;
    }
    // 多数決(重み: high=3, med=2, low=1)
    const votes: Record<string, number> = {};
    for (const r of group) {
      const w = r.mechConfidence === 'high' ? 3 : r.mechConfidence === 'med' ? 2 : 1;
      votes[r.mechGuess] = (votes[r.mechGuess] || 0) + w;
    }
    let best = ''; let bestV = -1;
    for (const k in votes) if (votes[k] > bestV) { bestV = votes[k]; best = k; }
    const conf = group.some((r) => r.mechGuess === best && r.mechConfidence === 'high') ? 'high'
      : group.some((r) => r.mechGuess === best && r.mechConfidence === 'med') ? 'med' : 'low';
    for (const r of group) { r.mechGuess = best; r.mechConfidence = conf; }
  }
}

// ── 割当(assignments) ────────────────────────────────────────────────────
// 同一メカニクス内の変化軸(PLAY_GRAMMAR_V3 §2.8 と同期を保つこと)。
// メカニクス分類は管理ラベルであって「教科書形への均し」ではない — 同メカニクスの
// ゲームはフック(hook列)+プレッシャー型+スパイス+尺+テーマで必ず差別化する。
const PRESSURE_VARIATIONS = [
  '加速型(テンポが徐々に上がる)',
  '物量型(対象の数が増えていく)',
  '精度型(判定幅/隙間が狭まっていく)',
  'フェイント型(偽の予兆・ダミーが混ざる)',
  '変拍子型(間隔・速度が不規則に揺れる)',
];
const SPICE_VARIATIONS = [
  'コンボ倍率(連続成功でx2→x4→x8)',
  'フィーバータイム(中盤数秒の得点倍増)',
  '黄金ターゲット(稀に高得点のレアが出る)',
  'サドンデス演出(達成目前の1ミスの緊張を煽る)',
  '二重課題(終盤たまに2つ同時に来る)',
  '逆転ボーナス(残り3秒は得点2倍)',
];

// 帯域内で尺を散らす候補値(15秒一極集中の解消)
function bandCandidates([min, max]: [number, number]): number[] {
  const span = max - min;
  const c = [min, min + Math.round(span / 3), min + Math.round((span * 2) / 3), max];
  return [...new Set(c)];
}

interface Assignment {
  id: number;
  filename: string;
  slug: string;
  title: string;
  hook: string;
  mechanic: string;
  family: string;
  theme: string;
  themeJp: string;
  themeSource: string;
  stylePack: string;
  bgmDirection: string;
  variation: string;
  spice: string;
  durationCurrent: number | null;
  durationTarget: number | string;
  neededCurrent: number | null;
  neededAction: string;
  priority: 'P1' | 'P2' | 'P3';
  wave: number;
  batch: string;
  fixItems: string;
  keepItems: string;
  status: string;
  scoreBefore: number;
  scoreAfter: string;
  styleActual: string;
  notes: string;
}

function buildAssignments(rows: GameRow[]): Assignment[] {
  const numbered = rows.filter((r) => r.id !== null).sort((a, b) => a.id! - b.id!);
  const famOf = (r: GameRow) => MECHANIC_FAMILY[r.mechGuess] || 'A';
  const computePriority = (r: GameRow): 'P1' | 'P2' | 'P3' =>
    (r.needed === 1 && !ONE_SHOT_OK.has(r.mechGuess)) || r.scoreTotal < 50 || r.dupSize > 1 ? 'P1'
      : r.scoreTotal < 70 ? 'P2' : 'P3';
  const prioVal = (p: string) => (p === 'P1' ? 0 : p === 'P2' ? 1 : 2);

  // ── Wave 0 パイロット: A〜F 各2本(優先度順)。NEEDED=1 / 長尺(≥30s) / 重複slug を含める ──
  const pilot = new Set<number>();
  for (const fam of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const cands = numbered.filter((r) => famOf(r) === fam)
      .sort((x, y) => prioVal(computePriority(x)) - prioVal(computePriority(y)) || x.scoreTotal - y.scoreTotal);
    if (cands[0]) pilot.add(cands[0].id!);
    const second = cands.slice(1).find((r) =>
      !pilot.has(r.id!) && (
        (r.needed === 1 && !ONE_SHOT_OK.has(r.mechGuess)) ||
        (r.maxTime !== null && r.maxTime >= 30) ||
        r.dupSize > 1
      )
    ) || cands.find((r) => !pilot.has(r.id!));
    if (second) pilot.add(second.id!);
  }
  const gCand = numbered.find((r) => famOf(r) === 'G' && !pilot.has(r.id!));
  if (gCand) pilot.add(gCand.id!);
  const longCand = numbered.find((r) => !pilot.has(r.id!) && r.maxTime !== null && r.maxTime >= 30);
  if (longCand) pilot.add(longCand.id!);

  // ── バッチ編成: 全ゲームをメカニクス比率で均等分散(fraction-spread)して10本刻み ──
  // 同メカニクス・同slugを1バッチに固めると書き換えセッションがクローンを量産するため、
  // 各メカニクス内の j 番目に (j+0.5)/N のキーを与えて全体ソート → どのバッチも
  // 約8〜10種のメカニクス混成になる(バリエーション保証。PLAY_GRAMMAR_V3 §2.8)。
  // メカニクス内は優先度順に並べるため、先頭バッチほど P1 が濃くなる。
  interface Batch { name: string; games: GameRow[]; p1: number; avgScore: number }
  const pilotBatch: GameRow[] = numbered.filter((r) => pilot.has(r.id!));
  const rest = numbered.filter((r) => !pilot.has(r.id!));
  const byMech = new Map<string, GameRow[]>();
  for (const r of rest) {
    if (!byMech.has(r.mechGuess)) byMech.set(r.mechGuess, []);
    byMech.get(r.mechGuess)!.push(r);
  }
  const spreadKey = new Map<number, number>();
  for (const group of byMech.values()) {
    group.sort((x, y) => prioVal(computePriority(x)) - prioVal(computePriority(y)) || x.id! - y.id!);
    group.forEach((r, j) => spreadKey.set(r.id!, (j + 0.5) / group.length));
  }
  const ordered = [...rest].sort((x, y) => spreadKey.get(x.id!)! - spreadKey.get(y.id!)! || x.id! - y.id!);
  const chunks: GameRow[][] = [];
  for (let i = 0; i < ordered.length; i += 10) chunks.push(ordered.slice(i, i + 10));

  // 同slugが同一バッチに2本入った場合、後続バッチと入れ替えて解消(決定的な後処理)
  for (let bi = 0; bi < chunks.length; bi++) {
    const b = chunks[bi];
    for (let gi = 1; gi < b.length; gi++) {
      if (!b.some((g, k) => k < gi && g.slug === b[gi].slug)) continue;
      outer: for (let bj = bi + 1; bj < chunks.length; bj++) {
        const c = chunks[bj];
        for (let gj = 0; gj < c.length; gj++) {
          const bSlugs = b.filter((_, k) => k !== gi).map((g) => g.slug);
          const cSlugs = c.filter((_, k) => k !== gj).map((g) => g.slug);
          if (!bSlugs.includes(c[gj].slug) && !cSlugs.includes(b[gi].slug)) {
            const tmp = b[gi]; b[gi] = c[gj]; c[gj] = tmp;
            break outer;
          }
        }
      }
    }
  }

  const batches: Batch[] = chunks.map((chunk, i) => ({
    name: `B${String(i + 1).padStart(2, '0')}`,
    games: chunk,
    p1: chunk.filter((r) => computePriority(r) === 'P1').length,
    avgScore: chunk.reduce((s, r) => s + r.scoreTotal, 0) / chunk.length,
  }));
  batches.sort((x, y) => y.p1 - x.p1 || x.avgScore - y.avgScore);

  // ── バッチ順に テーマ/スタイル/尺/変化軸 を割当(バッチ内・同slug内の重複を構造的に排除) ──
  const themeCounter: Record<string, number> = {};   // テーマプール巡回(全体で1カウンタ)
  const packCounter: Record<string, number> = {};    // テーマごとの親和パック巡回
  const mechCounter: Record<string, number> = {};    // メカニクスごとの尺/変化軸巡回
  const usedByDup = new Map<string, Set<string>>();  // slug → 使用済みテーマ

  const packOf = (themeId: string, packs: string[]): string => {
    const i = packCounter[themeId] = (packCounter[themeId] || 0) + 1;
    return packs[i % packs.length];
  };

  const assignments: Assignment[] = [];
  const buildOne = (r: GameRow, wave: number, batchName: string, batchThemes: Set<string>): void => {
    const mech = r.mechGuess;
    const fam = famOf(r);
    if (!usedByDup.has(r.slug)) usedByDup.set(r.slug, new Set());
    const dupUsed = usedByDup.get(r.slug)!;

    // テーマ: 既存世界観は尊重。それ以外は族カウンタで巡回し、同slug/同バッチ内の重複をスキップ
    let theme: ThemeDef | null = null;
    let themeSource = 'assigned';
    let note = '';
    if (r.worldview) {
      theme = THEMES.find((t) => t.kw.test(r.worldview)) || null;
      themeSource = 'existing';
      note = r.worldview;
    } else {
      for (let tries = 0; tries < THEMES.length * 2; tries++) {
        const i = themeCounter.all = (themeCounter.all || 0) + 1;
        const cand = THEMES[i % THEMES.length];
        if (!dupUsed.has(cand.id) && !batchThemes.has(cand.id)) { theme = cand; break; }
        if (tries === THEMES.length * 2 - 1) theme = cand; // 安全弁(理論上ほぼ到達しない)
      }
    }
    const themeId = theme ? theme.id : 'custom';
    dupUsed.add(themeId);
    batchThemes.add(themeId);
    const themeJp = theme ? theme.jp : `(既存世界観: ${note.slice(0, 24)})`;
    const stylePack = theme ? packOf(themeId, theme.packs) : packOf('custom', ALL_PACKS);

    // 尺: 帯域内の候補値をメカニクスごとに巡回して分散(15秒一極集中の解消)
    const band = DURATION_BAND_OVERRIDE[mech] || DURATION_BAND[fam];
    const mi = mechCounter[mech] = (mechCounter[mech] || 0) + 1;
    let durationTarget: number | string;
    if (r.maxTime === null) durationTarget = `目視(${band[0]}-${band[1]}s)`;
    else {
      const cands = bandCandidates(band);
      durationTarget = cands[mi % cands.length];
    }

    // 変化軸: プレッシャー型×スパイスをメカニクスごとに巡回(5×6=30通りで同メカ内を差別化)
    const variation = PRESSURE_VARIATIONS[mi % PRESSURE_VARIATIONS.length];
    const spice = SPICE_VARIATIONS[mi % SPICE_VARIATIONS.length];

    let neededAction = '維持';
    if (r.needed === 1 && !ONE_SHOT_OK.has(mech)) neededAction = '再調整(1→尺10秒あたり3〜8アクション)';
    else if (r.needed !== null && r.needed <= 3 && (r.maxTime || 0) >= 15) neededAction = '見直し(密度低: 尺に対して要求が少ない)';

    const fix: string[] = ['TEXTLESS', 'DEMO', 'TAGS'];
    if (r.seList.length < 3) fix.push(`SE(現${r.seList.length}種)`);
    if (!r.usesMelody && (r.bgmList.length === 0 || (r.bgmList.length === 1 && r.bgmList[0] === 'bgm_main'))) fix.push('BGM');
    if (!r.usesSprite) fix.push('SPRITE');
    if (!r.usesGradient) fix.push('GRAD');
    if (!r.usesFeedback) fix.push('FEEDBACK');
    if (!r.usesBest) fix.push(r.fakeHiScore ? 'BEST(偽HI-SCORE)' : 'BEST');
    if (!r.worldview) fix.push('THEME');
    if (typeof durationTarget === 'number' && r.maxTime !== null && Math.round(r.maxTime) !== durationTarget) {
      fix.push(`DUR(${r.maxTime}→${durationTarget}s)`);
    }
    if (neededAction !== '維持') fix.push(`NEEDED(${r.needed})`);

    const keep = ['メカニクス', '勝敗条件', '固有フック(hook列)', '筐体骨格', 'slug/ファイル名'];
    if (themeSource === 'existing') keep.push('既存世界観');

    assignments.push({
      id: r.id!, filename: r.filename, slug: r.slug,
      title: r.title, hook: r.desc,
      mechanic: mech, family: fam,
      theme: themeId, themeJp, themeSource, stylePack,
      bgmDirection: bgmDirection(mech, themeId),
      variation, spice,
      durationCurrent: r.maxTime, durationTarget,
      neededCurrent: r.needed, neededAction,
      priority: computePriority(r), wave, batch: batchName,
      fixItems: fix.join(' '), keepItems: keep.join('/'),
      status: 'todo', scoreBefore: r.scoreTotal, scoreAfter: '', styleActual: '',
      notes: themeSource === 'existing' ? note : '',
    });
  };

  // 既存世界観のゲームを各バッチで先に処理し、そのテーマをバッチ使用済みに登録してから
  // 残りを割当てる(既存テーマとの衝突回避)
  const inWorldviewFirst = (games: GameRow[]): GameRow[] =>
    [...games.filter((r) => r.worldview), ...games.filter((r) => !r.worldview)];

  const pilotThemes = new Set<string>();
  for (const r of inWorldviewFirst(pilotBatch)) buildOne(r, 0, 'W0', pilotThemes);
  batches.forEach((b, i) => {
    const wave = Math.floor(i / 10) + 1;
    const batchThemes = new Set<string>();
    for (const r of inWorldviewFirst(b.games)) buildOne(r, wave, b.name, batchThemes);
  });

  assignments.sort((a, b) => a.id - b.id);
  return assignments;
}

// ── 出力 ─────────────────────────────────────────────────────────────────
function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeLedgerCsv(rows: GameRow[]): void {
  const header = [
    'id', 'filename', 'slug', 'dup_size', 'title', 'desc', 'ctrl_line', 'winlose_line', 'lines',
    'mechanic_tag', 'theme_tag', 'mech_guess', 'mech_confidence', 'mech_source',
    'max_time', 'needed', 'nerf_count', 'finish_delay_ms',
    'distinct_se', 'se_list', 'bgm_list', 'uses_melody', 'uses_tone',
    'uses_feedback', 'fx_list', 'uses_sprite', 'uses_gradient', 'uses_best',
    'uses_press_move', 'uses_touches', 'uses_input',
    'how_to_play', 'text_literals', 'longest_literal', 'jp_in_literals', 'fake_hiscore',
    'worldview', 'has_scanlines', 'has_snap', 'has_timebar', 'has_coin', 'has_attract',
    'score_total', 'score_breakdown', 'validation_errors', 'top_hints',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.id, r.filename, r.slug, r.dupSize, r.title, r.desc, r.ctrlLine, r.winLoseLine, r.lines,
      r.mechanicTag, r.themeTag, r.mechGuess, r.mechConfidence, r.mechSource,
      r.maxTime, r.needed, r.nerfCount, r.finishDelayMs,
      r.seList.length, r.seList.join(' '), r.bgmList.join(' '), r.usesMelody, r.usesTone,
      r.usesFeedback, r.fxList.join(' '), r.usesSprite, r.usesGradient, r.usesBest,
      r.usesPressMove, r.usesTouches, r.usesInputPressing,
      r.howToPlay, r.textLiteralCount, r.longestTextLiteral, r.jpInLiterals, r.fakeHiScore,
      r.worldview, r.hasScanlines, r.hasSnap, r.hasTimeBar, r.hasCoinInsert, r.hasAttract,
      r.scoreTotal, r.scoreBreakdown, r.validationErrors, r.topHints,
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(path.join(LEDGER_DIR, 'game-ledger.csv'), lines.join('\n') + '\n', 'utf-8');
}

function writeAssignmentsCsv(assignments: Assignment[]): void {
  const header = [
    'id', 'filename', 'slug', 'title', 'hook', 'mechanic', 'family', 'theme', 'theme_jp', 'theme_source',
    'style_pack', 'bgm_direction', 'variation', 'spice', 'duration_current', 'duration_target',
    'needed_current', 'needed_action', 'priority', 'wave', 'batch',
    'fix_items', 'keep_items', 'status', 'score_before', 'score_after', 'style_actual', 'notes',
  ];
  const lines = [header.join(',')];
  for (const a of assignments) {
    lines.push([
      a.id, a.filename, a.slug, a.title, a.hook, a.mechanic, a.family, a.theme, a.themeJp, a.themeSource,
      a.stylePack, a.bgmDirection, a.variation, a.spice, a.durationCurrent, a.durationTarget,
      a.neededCurrent, a.neededAction, a.priority, a.wave, a.batch,
      a.fixItems, a.keepItems, a.status, a.scoreBefore, a.scoreAfter, a.styleActual, a.notes,
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(path.join(LEDGER_DIR, 'game-assignments.csv'), lines.join('\n') + '\n', 'utf-8');
}

function hist<T>(items: T[], key: (t: T) => string): Array<[string, number]> {
  const m: Record<string, number> = {};
  for (const it of items) m[key(it)] = (m[key(it)] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function writeSummary(rows: GameRow[], assignments: Assignment[] | null): void {
  const numbered = rows.filter((r) => r.id !== null);
  const fmt = (pairs: Array<[string, number]>, limit = 999) =>
    pairs.slice(0, limit).map(([k, v]) => `| ${k} | ${v} |`).join('\n');

  const dupGroups = hist(numbered, (r) => r.slug).filter(([, n]) => n > 1);
  const known = [
    // 既知値258は MAX_TIME のみの grep。TIME_LIMIT=15 の 192-sprint-dash を含めると 259
    ['MAX_TIME/TIME_LIMIT=15 のゲーム数', numbered.filter((r) => r.maxTime === 15).length, 259],
    ['NEEDED=1 のゲーム数', numbered.filter((r) => r.needed === 1).length, 79],
    ['世界観コメントあり', numbered.filter((r) => r.worldview).length, 91],
    ['distinct slug 数', new Set(numbered.map((r) => r.slug)).size, 565],
    ['scanlines 自前実装', numbered.filter((r) => r.hasScanlines).length, 797],
  ] as Array<[string, number, number]>;

  const md = `# game-ledger 集計サマリ(自動生成 — 手編集禁止)

生成: ${new Date().toISOString()} / 対象: ${rows.length}本(番号付き ${numbered.length} + few-shot原型 ${rows.length - numbered.length})

## 既知事実との突合(検証)

| 指標 | 計測値 | 既知値 | 一致 |
|---|---|---|---|
${known.map(([label, v, expect]) => `| ${label} | ${v} | ${expect} | ${v === expect ? '✅' : '❌'}`).join('\n')}

## メカニクス分布(推定・slug単位確定後)

| mechanic | 本数 |
|---|---|
${fmt(hist(numbered, (r) => r.mechGuess))}

推定確度: high ${numbered.filter((r) => r.mechConfidence === 'high').length} / med ${numbered.filter((r) => r.mechConfidence === 'med').length} / low ${numbered.filter((r) => r.mechConfidence === 'low').length}(low/med は mechanic-overrides.json で確定させる)

## 族分布

| family | 本数 |
|---|---|
${fmt(hist(numbered, (r) => MECHANIC_FAMILY[r.mechGuess] || '?'))}

## MAX_TIME 分布

| 秒 | 本数 |
|---|---|
${fmt(hist(numbered.filter((r) => r.maxTime !== null), (r) => String(r.maxTime)), 15)}

(未検出: ${numbered.filter((r) => r.maxTime === null).length}本)

## NEEDED 分布

| 値 | 本数 |
|---|---|
${fmt(hist(numbered.filter((r) => r.needed !== null), (r) => String(r.needed)), 12)}

## SE / BGM / v2 API 採用状況

| 指標 | 本数 |
|---|---|
| distinct SE ≥3 | ${numbered.filter((r) => r.seList.length >= 3).length} |
| melody 使用 | ${numbered.filter((r) => r.usesMelody).length} |
| bgm_main 以外のBGM | ${numbered.filter((r) => r.bgmList.some((b) => b !== 'bgm_main')).length} |
| feedback 使用 | ${numbered.filter((r) => r.usesFeedback).length} |
| sprite 使用 | ${numbered.filter((r) => r.usesSprite).length} |
| gradient 使用 | ${numbered.filter((r) => r.usesGradient).length} |
| game.best 使用 | ${numbered.filter((r) => r.usesBest).length} |
| 偽HI-SCORE疑い | ${numbered.filter((r) => r.fakeHiScore).length} |
| @mechanic タグあり | ${numbered.filter((r) => r.mechanicTag).length} |

## スコア分布

| 帯 | 本数 |
|---|---|
${fmt(hist(numbered, (r) => r.scoreTotal >= 80 ? '80+' : r.scoreTotal >= 70 ? '70-79' : r.scoreTotal >= 50 ? '50-69' : '<50'))}

## スラグ重複グループ(上位30)

| slug | 本数 |
|---|---|
${fmt(dupGroups, 30)}

(重複グループ計: ${dupGroups.length}グループ / ${dupGroups.reduce((s, [, n]) => s + n, 0)}本)
${assignments ? `
## 割当の分布(assignments)

### スタイルパック(目標: 各130〜190本)

| pack | 本数 |
|---|---|
${fmt(hist(assignments, (a) => a.stylePack))}

### テーマ

| theme | 本数 |
|---|---|
${fmt(hist(assignments, (a) => a.theme))}

### 優先度 / Wave

| priority | 本数 |
|---|---|
${fmt(hist(assignments, (a) => a.priority))}

| wave | 本数 |
|---|---|
${fmt(hist(assignments, (a) => `Wave ${a.wave}`))}

### 尺の目標分布(duration_target — 帯域内分散の確認)

| 秒 | 本数 |
|---|---|
${fmt(hist(assignments.filter((a) => typeof a.durationTarget === 'number'), (a) => String(a.durationTarget)), 20)}

### 変化軸の分布

| プレッシャー型 | 本数 |
|---|---|
${fmt(hist(assignments, (a) => a.variation))}

| スパイス | 本数 |
|---|---|
${fmt(hist(assignments, (a) => a.spice))}

### バッチ多様性検査(クローン量産の構造的防止)

${(() => {
    const byBatch = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (!byBatch.has(a.batch)) byBatch.set(a.batch, []);
      byBatch.get(a.batch)!.push(a);
    }
    let maxSameMech = 0; let maxSameSlug = 0; let themeCollisions = 0; let distinctMechSum = 0;
    for (const games of byBatch.values()) {
      const mech = hist(games, (g) => g.mechanic);
      const slug = hist(games, (g) => g.slug);
      const themes = hist(games, (g) => g.theme).filter(([t, n]) => t !== 'custom' && n > 1);
      maxSameMech = Math.max(maxSameMech, mech[0]?.[1] || 0);
      maxSameSlug = Math.max(maxSameSlug, slug[0]?.[1] || 0);
      themeCollisions += themes.reduce((s, [, n]) => s + n - 1, 0);
      distinctMechSum += mech.length;
    }
    const avgMech = (distinctMechSum / byBatch.size).toFixed(1);
    return `- バッチ数: ${byBatch.size} / バッチ内の distinct メカニクス平均: ${avgMech}
- 同一メカニクスの1バッチ内最大本数: ${maxSameMech}(目標≤3)
- 同一slugの1バッチ内最大本数: ${maxSameSlug}(目標1)
- バッチ内テーマ重複(custom除く): ${themeCollisions}件(目標0)`;
  })()}
` : '\n(assignments は既存のため分布は再計算していない — --reassign で再生成)\n'}`;
  fs.writeFileSync(path.join(LEDGER_DIR, 'game-ledger-summary.md'), md, 'utf-8');
}

function writeReview(rows: GameRow[]): void {
  const numbered = rows.filter((r) => r.id !== null);
  const bySlug = new Map<string, GameRow[]>();
  for (const r of numbered) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug)!.push(r);
  }
  const entries = [...bySlug.entries()].sort((a, b) => {
    const confVal = (c: string) => (c === 'low' ? 0 : c === 'med' ? 1 : 2);
    return confVal(a[1][0].mechConfidence) - confVal(b[1][0].mechConfidence) || (a[0] < b[0] ? -1 : 1);
  });
  const lines = ['# メカニクス推定レビュー(slug単位・確度昇順)', '',
    '確認して誤りを mechanic-overrides.json に `"slug": "mechanic_id"` で記入 → 再生成。', ''];
  for (const [slug, group] of entries) {
    const r = group[0];
    lines.push(`## ${slug} → **${r.mechGuess}** (${r.mechConfidence}, ${r.mechSource}) ×${group.length}本`);
    lines.push(`- 例 #${String(r.id).padStart(3, '0')}: ${r.title} — ${r.desc}`);
    lines.push(`- 操作: ${r.ctrlLine}`);
    lines.push(`- 成功/失敗: ${r.winLoseLine}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(LEDGER_DIR, 'mechanic-review.md'), lines.join('\n'), 'utf-8');
}

// ── main ─────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const reassign = argv.includes('--reassign');
  const review = argv.includes('--review');

  fs.mkdirSync(LEDGER_DIR, { recursive: true });
  const overrides: Record<string, string> = fs.existsSync(OVERRIDES_FILE)
    ? JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'))
    : {};

  const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.js')).sort();
  console.log(`🎮 解析対象: ${files.length}本 (overrides: ${Object.keys(overrides).length}件)`);

  const validator = new CodeGameValidator();
  const scorer = new CodeQualityScorer();
  const rows: GameRow[] = [];
  for (const f of files) {
    const code = fs.readFileSync(path.join(EXAMPLES_DIR, f), 'utf-8');
    rows.push(analyzeFile(f, code, validator, scorer));
  }
  consolidateMechanics(rows, overrides);

  writeLedgerCsv(rows);
  console.log(`📄 game-ledger.csv (${rows.length}行)`);

  const assignmentsPath = path.join(LEDGER_DIR, 'game-assignments.csv');
  let assignments: Assignment[] | null = null;
  if (!fs.existsSync(assignmentsPath) || reassign) {
    assignments = buildAssignments(rows);
    writeAssignmentsCsv(assignments);
    console.log(`📄 game-assignments.csv (${assignments.length}行) ${reassign ? '← --reassign で再生成' : '← 新規生成'}`);
  } else {
    console.log('📄 game-assignments.csv は既存のためスキップ(--reassign で再生成)');
  }

  writeSummary(rows, assignments);
  console.log('📄 game-ledger-summary.md');

  if (review) {
    writeReview(rows);
    console.log('📄 mechanic-review.md(人間監査用 — コミット不要)');
  }

  const low = rows.filter((r) => r.id !== null && r.mechConfidence === 'low').length;
  const med = rows.filter((r) => r.id !== null && r.mechConfidence === 'med').length;
  console.log(`\n✅ 完了。メカニクス確度: low ${low} / med ${med}(要オーバーライド確認)`);
}

main();
