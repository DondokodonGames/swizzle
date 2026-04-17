/**
 * generators/arcade-generator.ts
 * 392のアーケードアイデアからGameConfigを生成
 *
 * テンプレート（4種）:
 *   timingWindow  – オブジェクトがバウンド＋ゾーンマーカー。タップで得点（デフォルト）
 *   choiceSelect  – 3択。星（正解）と丸（不正解）から正解をタップ
 *   twoStep       – Aをタップ→Bが出現→Bをタップで得点
 *   rapidTap      – 大ボタン連打でカウンター到達
 *
 * 分類ロジック（concept テキストで判定）:
 *   rapidTap    : 連打 / 押し続 / mash
 *   twoStep     : 裏返 / ベル.*落 / 2段階 / (その後|次に).*タップ
 *   choiceSelect: 候補 / 扇状 / 選んで / 青旗 / 安全な.*危険 / 正しい.*形態 / 左右どちら / 色を読
 *   timingWindow: 上記以外すべて
 */

import { GameConfig, ObjectDef, CounterDef, RuleDef } from '../GameBuilder.js';
import {
  circle, rect, star, diamond, triangle, face, bomb, button, balloon, coin,
  COLORS, BG_COLORS, ColorName, BgColorName,
} from '../SvgLibrary.js';

// ---- Arcade ideas imports ----
import { arcade2014Ideas }   from '../ideas/arcade-2014.js';
import { arcade2015Ideas }   from '../ideas/arcade-2015.js';
import { arcade2016Ideas }   from '../ideas/arcade-2016.js';
import { arcade2017Ideas }   from '../ideas/arcade-2017.js';
import { arcade2018Ideas }   from '../ideas/arcade-2018.js';
import { arcade2019aIdeas }  from '../ideas/arcade-2019a.js';
import { arcade2019bIdeas }  from '../ideas/arcade-2019b.js';
import { arcade2020q1Ideas } from '../ideas/arcade-2020q1.js';
import { arcade2020q2Ideas } from '../ideas/arcade-2020q2.js';
import { arcade2020q3Ideas } from '../ideas/arcade-2020q3.js';
import { arcade2020q4Ideas } from '../ideas/arcade-2020q4.js';
import { arcade2021q1Ideas } from '../ideas/arcade-2021q1.js';
import { arcade2021q2Ideas } from '../ideas/arcade-2021q2.js';
import { arcade2021q3Ideas } from '../ideas/arcade-2021q3.js';
import { arcade2021q4Ideas } from '../ideas/arcade-2021q4.js';
import { arcade2022q1Ideas } from '../ideas/arcade-2022q1.js';
import { arcade2022q2Ideas } from '../ideas/arcade-2022q2.js';
import { arcade2022q3Ideas } from '../ideas/arcade-2022q3.js';
import { arcade2022q4Ideas } from '../ideas/arcade-2022q4.js';
import { arcade2023q1Ideas } from '../ideas/arcade-2023q1.js';
import { arcade2023q2Ideas } from '../ideas/arcade-2023q2.js';
import { arcade2023q3Ideas } from '../ideas/arcade-2023q3.js';
import { arcade2023q4Ideas } from '../ideas/arcade-2023q4.js';
import { arcade2024q1Ideas } from '../ideas/arcade-2024q1.js';
import { arcade2024q2Ideas } from '../ideas/arcade-2024q2.js';
import { arcade2024q3Ideas } from '../ideas/arcade-2024q3.js';
import { arcade2024q4Ideas } from '../ideas/arcade-2024q4.js';
import { arcade2025q1Ideas } from '../ideas/arcade-2025q1.js';
import { arcade2025q2Ideas } from '../ideas/arcade-2025q2.js';
import { arcade2025q3Ideas } from '../ideas/arcade-2025q3.js';
import { arcade2025q4Ideas } from '../ideas/arcade-2025q4.js';

// ---- Types ----
type ArcadeIdea = {
  id: string;
  title: string;
  brand: string;
  year: number;
  duration: number;
  difficulty: string;
  concept: string;
  objects: ReadonlyArray<{ shape: string; role: string; note: string }>;
  counters: ReadonlyArray<{ id: string; name: string; target: number; note: string }>;
  winTrigger: string;
  failTrigger?: string;
};

// ---- Helpers ----
const COLOR_KEYS = Object.keys(COLORS) as ColorName[];
const BG_KEYS    = Object.keys(BG_COLORS) as BgColorName[];

function getColor(n: number): string  { return COLORS[COLOR_KEYS[Math.abs(n) % COLOR_KEYS.length]]; }
function getBg(n: number):    string  { return BG_COLORS[BG_KEYS[Math.abs(n) % BG_KEYS.length]]; }

function validDuration(d: number): 5 | 10 | 15 | 20 | 30 {
  if (d <= 5)  return 5;
  if (d <= 10) return 10;
  if (d <= 15) return 15;
  if (d <= 20) return 20;
  return 30;
}

function validDifficulty(d: string): 'easy' | 'normal' | 'hard' {
  return (['easy', 'normal', 'hard'].includes(d) ? d : 'normal') as 'easy' | 'normal' | 'hard';
}

function parseWinTarget(winTrigger: string): number {
  const m = winTrigger.match(/>= ?(\d+)/);
  if (m) return parseInt(m[1], 10);
  const m2 = winTrigger.match(/(\d+)/);
  if (m2) return parseInt(m2[1], 10);
  return 5;
}

function shapeToSvg(shape: string, color: string, size = 80): string {
  switch (shape.toLowerCase()) {
    case 'circle':   return circle(color, size);
    case 'ellipse':  return circle(color, size);
    case 'rect':     return rect(color, size, Math.floor(size * 0.7));
    case 'star':     return star(color, size);
    case 'diamond':  return diamond(color, size);
    case 'triangle': return triangle(color, size);
    case 'face':     return face(color, size);
    case 'bomb':     return bomb(size);
    case 'button':   return button('TAP!', color, '#fff', size * 2, size);
    case 'coin':     return coin(color, size);
    case 'balloon':  return balloon(color, size, Math.floor(size * 1.2));
    default:         return circle(color, size);
  }
}

function truncate(s: string, n = 80): string {
  return s.length > n ? s.substring(0, n - 3) + '...' : s;
}

// Teleport destinations (cycle deterministically by game index + object index)
const TELEPORT_POS = [
  { x: 0.2, y: 0.25 }, { x: 0.8, y: 0.28 }, { x: 0.5, y: 0.55 },
  { x: 0.3, y: 0.65 }, { x: 0.7, y: 0.60 }, { x: 0.5, y: 0.22 },
  { x: 0.15, y: 0.45 }, { x: 0.85, y: 0.5 }, { x: 0.4, y: 0.75 },
];
function teleportPos(gameIdx: number, objIdx: number) {
  return TELEPORT_POS[(gameIdx * 3 + objIdx * 4) % TELEPORT_POS.length];
}

// 3つの選択肢の位置パターン（gameIdx % 3 で正解位置が変わる）
const CHOICE_LAYOUTS = [
  [{ x: 0.2, y: 0.40 }, { x: 0.5, y: 0.55 }, { x: 0.8, y: 0.40 }],  // 正解=左
  [{ x: 0.2, y: 0.55 }, { x: 0.5, y: 0.35 }, { x: 0.8, y: 0.55 }],  // 正解=中央
  [{ x: 0.2, y: 0.40 }, { x: 0.5, y: 0.55 }, { x: 0.8, y: 0.40 }],  // 正解=右（左右反転で使う）
];

// ============================================================
// Template A: timingWindow
// オブジェクトが素早くバウンド。中央にゾーンマーカーが定期的に光り、
// 視覚的なタイミングヒントを提供。タップで得点。
// ============================================================
function timingWindow(idea: ArcadeIdea, n: number): GameConfig {
  const mainColor = getColor(n);
  const altColor  = getColor(n + 7);

  const counterDef   = idea.counters[0];
  const counterName  = counterDef?.id ?? 'hits';
  const counterLabel = counterDef?.name ?? 'スコア';
  const winTarget    = Math.min(counterDef?.target ?? parseWinTarget(idea.winTrigger), 10);

  // ゾーンマーカー（中央の半透明リング）
  const zoneObj: ObjectDef = {
    id: 'zone',
    name: '目標ゾーン',
    dataUrl: circle('#ffffff55', 100),
    width: 100, height: 100, defaultScale: 1.0,
    position: { x: 0.5, y: 0.45 },
    zIndex: 0,
  };

  // ターゲットオブジェクト（最大2個）
  const numTargets = Math.min(2, Math.max(1, idea.objects.length));
  const targetObjs: ObjectDef[] = Array.from({ length: numTargets }, (_, i) => {
    const spec  = idea.objects[i];
    const color = i === 0 ? mainColor : altColor;
    return {
      id:           `target-${i}`,
      name:         spec.role.substring(0, 20),
      dataUrl:      shapeToSvg(spec.shape, color, 80),
      width:        80, height: 80, defaultScale: 1.4,
      position:     { x: 0.3 + i * 0.4, y: 0.38 },
      zIndex:       2,
    };
  });

  const objects = [zoneObj, ...targetObjs];

  const counters: CounterDef[] = [{
    id: counterName, name: counterLabel,
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [];

  // ゾーンが1.8秒ごとにパルス（タイミングの視覚ヒント）
  rules.push({
    id: 'zone-pulse', name: 'ゾーンパルス',
    targetObjectId: 'zone', priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 1.8 }],
    actions: [
      { type: 'effect', targetId: 'zone', effect: { type: 'scale', scaleAmount: 1.4, duration: 0.25 } },
      { type: 'effect', targetId: 'zone', effect: { type: 'flash', duration: 0.25 } },
    ],
  });

  // ターゲット: 速めのバウンド
  targetObjs.forEach((obj, i) => {
    rules.push({
      id: `move-${i}`, name: `移動${i}`,
      targetObjectId: obj.id, priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.07 }],
      actions: [{ type: 'move', targetId: obj.id, movement: { type: 'bounce', speed: 2.0 + (n + i) % 3 * 0.5 } }],
    });
  });

  // タップ → テレポート + 得点
  targetObjs.forEach((obj, i) => {
    const dest = teleportPos(n, i);
    rules.push({
      id: `tap-${i}`, name: `タップ${i}`,
      targetObjectId: obj.id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: obj.id, effect: { type: 'scale', scaleAmount: 1.5, duration: 0.12 } },
        { type: 'effect', targetId: obj.id, effect: {
            type: 'particles', duration: 0.6,
            particleType: 'star', particleCount: 10,
            particleColor: '#FFD700', particleSpread: 70,
          } },
        { type: 'move',    targetId: obj.id, movement: { type: 'teleport', target: dest } },
        { type: 'counter', counterName, operation: 'increment' },
        { type: 'addScore', points: 10 },
      ],
    });
  });

  // クリア条件
  rules.push({
    id: 'win', name: 'クリア',
    targetObjectId: 'stage', priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: winTarget }],
    actions: [{ type: 'success', score: 100, message: `${winTarget}回達成！クリア！` }],
  });

  return {
    id:          idea.id,
    title:       idea.title,
    description: truncate(idea.concept),
    category:    'arcade',
    duration:    validDuration(idea.duration),
    difficulty:  validDifficulty(idea.difficulty),
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['アーケード', idea.brand],
  };
}

// ============================================================
// Template B: choiceSelect
// 正解（星）と不正解（丸×2）の3択。正解を素早く選べ。
// 正解オブジェクトの位置は gameIdx % 3 で変わる。
// ============================================================
function choiceSelect(idea: ArcadeIdea, n: number): GameConfig {
  const correctColor = getColor(n);
  const wrongColor1  = getColor(n + 5);
  const wrongColor2  = getColor(n + 10);

  const counterDef   = idea.counters[0];
  const counterName  = counterDef?.id ?? 'correct';
  const counterLabel = counterDef?.name ?? '正解数';
  const winTarget    = Math.min(counterDef?.target ?? parseWinTarget(idea.winTrigger), 8);

  // 正解位置を n % 3 で変える（左・中央・右）
  const layoutIdx = n % 3;
  const layout    = CHOICE_LAYOUTS[layoutIdx];

  // layoutIdx に応じて正解オブジェクトの配置を入れ替え
  const positions = layoutIdx === 2
    ? [layout[2], layout[1], layout[0]]   // 右が正解
    : [layout[0], layout[1], layout[2]];  // 左 or 中央が正解

  const objects: ObjectDef[] = [
    {
      id: 'correct',
      name: '正解',
      dataUrl: star(correctColor, 90),
      width: 90, height: 90, defaultScale: 1.4,
      position: positions[0],
      zIndex: 2,
    },
    {
      id: 'wrong-1',
      name: 'ダミー1',
      dataUrl: circle(wrongColor1, 75),
      width: 75, height: 75, defaultScale: 1.2,
      position: positions[1],
      zIndex: 2,
    },
    {
      id: 'wrong-2',
      name: 'ダミー2',
      dataUrl: circle(wrongColor2, 75),
      width: 75, height: 75, defaultScale: 1.2,
      position: positions[2],
      zIndex: 2,
    },
  ];

  const counters: CounterDef[] = [{
    id: counterName, name: counterLabel,
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [];

  // 正解（星）がゆっくり揺れる（目立たせる）
  rules.push({
    id: 'correct-bounce', name: '正解揺れ',
    targetObjectId: 'correct', priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 0.12 }],
    actions: [{ type: 'move', targetId: 'correct', movement: { type: 'bounce', speed: 0.6 } }],
  });

  // 正解タップ → パーティクル + カウンター + シャッフル（テレポートで位置変更）
  const nextCorrectPos = teleportPos(n, 3);
  const nextWrong1Pos  = teleportPos(n, 5);
  const nextWrong2Pos  = teleportPos(n, 7);
  rules.push({
    id: 'tap-correct', name: '正解タップ',
    targetObjectId: 'correct', priority: 3,
    conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
    actions: [
      { type: 'effect', targetId: 'correct', effect: { type: 'scale', scaleAmount: 1.6, duration: 0.15 } },
      { type: 'effect', targetId: 'correct', effect: {
          type: 'particles', duration: 0.8,
          particleType: 'confetti', particleCount: 16,
          particleColor: '#FFD700', particleSpread: 100,
        } },
      { type: 'move', targetId: 'correct', movement: { type: 'teleport', target: nextCorrectPos } },
      { type: 'move', targetId: 'wrong-1', movement: { type: 'teleport', target: nextWrong1Pos } },
      { type: 'move', targetId: 'wrong-2', movement: { type: 'teleport', target: nextWrong2Pos } },
      { type: 'counter', counterName, operation: 'increment' },
      { type: 'addScore', points: 15 },
    ],
  });

  // 不正解タップ → フラッシュのみ（得点なし）
  ['wrong-1', 'wrong-2'].forEach((id, i) => {
    rules.push({
      id: `tap-wrong-${i}`, name: `不正解タップ${i}`,
      targetObjectId: id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: id, effect: { type: 'flash', duration: 0.2 } },
        { type: 'effect', targetId: id, effect: { type: 'shake', duration: 0.2 } },
      ],
    });
  });

  // クリア条件
  rules.push({
    id: 'win', name: 'クリア',
    targetObjectId: 'stage', priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: winTarget }],
    actions: [{ type: 'success', score: 100, message: `正解${winTarget}回！クリア！` }],
  });

  return {
    id:          idea.id,
    title:       idea.title,
    description: truncate(idea.concept),
    category:    'arcade',
    duration:    validDuration(idea.duration),
    difficulty:  validDifficulty(idea.difficulty),
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['アーケード', idea.brand, '選択'],
  };
}

// ============================================================
// Template C: twoStep
// STEP1（大きなオブジェクト）をタップ → STEP2（小さなオブジェクト）が出現
// → STEP2をタップで得点。counter 'step' で状態管理。
// ============================================================
function twoStep(idea: ArcadeIdea, n: number): GameConfig {
  const colorA = getColor(n);
  const colorB = getColor(n + 6);

  const counterDef   = idea.counters[0];
  const counterName  = counterDef?.id ?? 'combos';
  const counterLabel = counterDef?.name ?? 'コンボ数';
  const winTarget    = Math.min(counterDef?.target ?? parseWinTarget(idea.winTrigger), 5);

  const objects: ObjectDef[] = [
    {
      id: 'step1',
      name: 'STEP 1',
      dataUrl: button('STEP 1', colorA, '#fff', 220, 100),
      width: 220, height: 100, defaultScale: 1.4,
      position: { x: 0.5, y: 0.35 },
      zIndex: 2,
    },
    {
      id: 'step2',
      name: 'STEP 2',
      dataUrl: button('STEP 2', colorB, '#fff', 180, 85),
      width: 180, height: 85, defaultScale: 1.3,
      position: { x: 0.5, y: 0.62 },
      visible: false,  // 初期非表示。STEP1タップ後に show アクションで出現
      zIndex: 2,
    },
  ];

  // 状態管理カウンター: step=0→STEP1待ち, step=1→STEP2待ち
  const counters: CounterDef[] = [
    { id: 'step',       name: '操作ステップ', initialValue: 0, minValue: 0, maxValue: 1 },
    { id: counterName, name: counterLabel,    initialValue: 0, minValue: 0, maxValue: 999 },
  ];

  const rules: RuleDef[] = [];

  // STEP1 がゆっくりバウンド
  rules.push({
    id: 'move-step1', name: 'STEP1移動',
    targetObjectId: 'step1', priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 0.10 }],
    actions: [{ type: 'move', targetId: 'step1', movement: { type: 'bounce', speed: 0.9 + (n % 3) * 0.3 } }],
  });

  // STEP2 がバウンド（非表示中も位置計算は走る）
  rules.push({
    id: 'move-step2', name: 'STEP2移動',
    targetObjectId: 'step2', priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 0.10 }],
    actions: [{ type: 'move', targetId: 'step2', movement: { type: 'bounce', speed: 1.3 + (n % 3) * 0.4 } }],
  });

  // STEP1 タップ → STEP1 hide + STEP2 show + step=1
  rules.push({
    id: 'tap-step1', name: 'STEP1タップ',
    targetObjectId: 'step1', priority: 3,
    conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
    actions: [
      { type: 'effect', targetId: 'step1', effect: { type: 'scale', scaleAmount: 1.3, duration: 0.1 } },
      { type: 'hide',    targetId: 'step1' },
      { type: 'show',    targetId: 'step2' },
      { type: 'counter', counterName: 'step', operation: 'set', value: 1 },
    ],
  });

  // STEP2 タップ（step >= 1 のとき）→ STEP2 hide + STEP1 show + step=0 + 得点
  rules.push({
    id: 'tap-step2', name: 'STEP2タップ',
    targetObjectId: 'step2', priority: 3,
    conditions: [
      { type: 'touch',   target: 'self', touchType: 'down' },
      { type: 'counter', counterName: 'step', comparison: 'greaterOrEqual', value: 1 },
    ],
    actions: [
      { type: 'effect', targetId: 'step2', effect: { type: 'scale', scaleAmount: 1.4, duration: 0.12 } },
      { type: 'effect', targetId: 'step2', effect: {
          type: 'particles', duration: 0.7,
          particleType: 'star', particleCount: 12,
          particleColor: '#FFD700', particleSpread: 80,
        } },
      { type: 'hide',    targetId: 'step2' },
      { type: 'show',    targetId: 'step1' },
      { type: 'counter', counterName: 'step',      operation: 'set', value: 0 },
      { type: 'counter', counterName,              operation: 'increment' },
      { type: 'addScore', points: 20 },
    ],
  });

  // クリア条件
  rules.push({
    id: 'win', name: 'クリア',
    targetObjectId: 'stage', priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: winTarget }],
    actions: [{ type: 'success', score: 100, message: `${winTarget}コンボ達成！クリア！` }],
  });

  return {
    id:          idea.id,
    title:       idea.title,
    description: truncate(idea.concept),
    category:    'arcade',
    duration:    validDuration(idea.duration),
    difficulty:  validDifficulty(idea.difficulty),
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['アーケード', idea.brand, '連続操作'],
  };
}

// ============================================================
// Template D: rapidTap
// 大きなボタンを連打してカウンターが目標値に達するとクリア。
// ============================================================
function rapidTap(idea: ArcadeIdea, n: number): GameConfig {
  const color      = getColor(n);
  const counterDef = idea.counters[0];
  const counterName  = counterDef?.id ?? 'taps';
  const counterLabel = counterDef?.name ?? '連打数';
  const winTarget  = Math.min(counterDef?.target ?? parseWinTarget(idea.winTrigger), 30);

  const objects: ObjectDef[] = [{
    id: 'btn', name: 'タップボタン',
    dataUrl: button('TAP!', color, '#fff', 240, 120),
    width: 240, height: 120, defaultScale: 1.5,
    position: { x: 0.5, y: 0.5 }, zIndex: 1,
  }];

  const counters: CounterDef[] = [{
    id: counterName, name: counterLabel,
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [
    {
      id: 'tap', name: '連打',
      targetObjectId: 'btn', priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'btn', effect: { type: 'scale', scaleAmount: 1.2, duration: 0.06 } },
        { type: 'counter', counterName, operation: 'increment' },
        { type: 'addScore', points: 5 },
      ],
    },
    {
      id: 'win', name: 'クリア',
      targetObjectId: 'stage', priority: 10,
      conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: winTarget }],
      actions: [{ type: 'success', score: 100, message: `${winTarget}回達成！` }],
    },
  ];

  return {
    id:          idea.id,
    title:       idea.title,
    description: truncate(idea.concept),
    category:    'arcade',
    duration:    validDuration(idea.duration),
    difficulty:  validDifficulty(idea.difficulty),
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['アーケード', idea.brand, '連打'],
  };
}

// ============================================================
// テンプレートセレクター
// ============================================================
function buildArcadeGame(idea: ArcadeIdea, n: number): GameConfig {
  const c = idea.concept;

  // rapidTap: 連打ゲーム
  if (/連打|押し続|mash/i.test(c)) {
    return rapidTap(idea, n);
  }

  // twoStep: 2段階の順序操作
  if (/裏返|ベル.*落|落.*ベル|2段階|(その後|次に).*タップ/i.test(c)) {
    return twoStep(idea, n);
  }

  // choiceSelect: 複数の選択肢から正解を選ぶ
  if (/候補|扇状|選んで|青旗|安全な.*危険|危険.*安全|正しい.*形態|形態.*正しい|左右どちら|色を読/i.test(c)) {
    return choiceSelect(idea, n);
  }

  // timingWindow: デフォルト（タイミングゲーム全般）
  return timingWindow(idea, n);
}

// ---- Public entry point ----
export function generateArcadeGamesFromIdeas(): GameConfig[] {
  const allIdeas: ArcadeIdea[] = [
    ...arcade2014Ideas,
    ...arcade2015Ideas,
    ...arcade2016Ideas,
    ...arcade2017Ideas,
    ...arcade2018Ideas,
    ...arcade2019aIdeas,
    ...arcade2019bIdeas,
    ...arcade2020q1Ideas,
    ...arcade2020q2Ideas,
    ...arcade2020q3Ideas,
    ...arcade2020q4Ideas,
    ...arcade2021q1Ideas,
    ...arcade2021q2Ideas,
    ...arcade2021q3Ideas,
    ...arcade2021q4Ideas,
    ...arcade2022q1Ideas,
    ...arcade2022q2Ideas,
    ...arcade2022q3Ideas,
    ...arcade2022q4Ideas,
    ...arcade2023q1Ideas,
    ...arcade2023q2Ideas,
    ...arcade2023q3Ideas,
    ...arcade2023q4Ideas,
    ...arcade2024q1Ideas,
    ...arcade2024q2Ideas,
    ...arcade2024q3Ideas,
    ...arcade2024q4Ideas,
    ...arcade2025q1Ideas,
    ...arcade2025q2Ideas,
    ...arcade2025q3Ideas,
    ...arcade2025q4Ideas,
  ] as ArcadeIdea[];

  // テンプレート分布をログ出力
  const dist = { timingWindow: 0, choiceSelect: 0, twoStep: 0, rapidTap: 0 };
  allIdeas.forEach(idea => {
    const c = idea.concept;
    if (/連打|押し続|mash/i.test(c))                                                     dist.rapidTap++;
    else if (/裏返|ベル.*落|落.*ベル|2段階|(その後|次に).*タップ/i.test(c))             dist.twoStep++;
    else if (/候補|扇状|選んで|青旗|安全な.*危険|危険.*安全|正しい.*形態|形態.*正しい|左右どちら|色を読/i.test(c)) dist.choiceSelect++;
    else                                                                                   dist.timingWindow++;
  });
  console.log(`   [arcade] timingWindow:${dist.timingWindow} choiceSelect:${dist.choiceSelect} twoStep:${dist.twoStep} rapidTap:${dist.rapidTap}`);

  return allIdeas.map((idea, i) => buildArcadeGame(idea, i));
}
