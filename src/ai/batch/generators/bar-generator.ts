/**
 * generators/bar-generator.ts
 * 200のバーアイデアからGameConfigを生成
 *
 * テンプレート（3種）:
 *   barReveal   – カラフルなオブジェクトをタップするとresultTriggerテキストで結果表示
 *   barChoice   – A/B/Cの3択ボタンをタップして結果を発表（クイズ・診断系）
 *   barSpeedTap – 大ボタン連打でカウンター到達（連打系）
 *
 * 分類ロジック:
 *   barSpeedTap : 連打 / mash / 連続タップ / 押し続
 *   barChoice   : 3択 / 4択 / 選択肢 / 候補 / どちら.*正解
 *   barReveal   : 上記以外すべて
 */

import { GameConfig, ObjectDef, CounterDef, RuleDef } from '../GameBuilder.js';
import {
  circle, rect, star, diamond, triangle, face, bomb, button, balloon, coin,
  COLORS, BG_COLORS, ColorName, BgColorName,
} from '../SvgLibrary.js';

// ---- Bar ideas imports ----
import { bar01Ideas } from '../ideas/bar-01.js';
import { bar02Ideas } from '../ideas/bar-02.js';
import { bar03Ideas } from '../ideas/bar-03.js';
import { bar04Ideas } from '../ideas/bar-04.js';
import { bar05Ideas } from '../ideas/bar-05.js';
import { bar06Ideas } from '../ideas/bar-06.js';
import { bar07Ideas } from '../ideas/bar-07.js';
import { bar08Ideas } from '../ideas/bar-08.js';
import { bar09Ideas } from '../ideas/bar-09.js';
import { bar10Ideas } from '../ideas/bar-10.js';
import { bar11Ideas } from '../ideas/bar-11.js';
import { bar12Ideas } from '../ideas/bar-12.js';
import { bar13Ideas } from '../ideas/bar-13.js';
import { bar14Ideas } from '../ideas/bar-14.js';
import { bar15Ideas } from '../ideas/bar-15.js';
import { bar16Ideas } from '../ideas/bar-16.js';
import { bar17Ideas } from '../ideas/bar-17.js';
import { bar18Ideas } from '../ideas/bar-18.js';
import { bar19Ideas } from '../ideas/bar-19.js';
import { bar20Ideas } from '../ideas/bar-20.js';

// ---- Types ----
type BarIdea = {
  id: string;
  title: string;
  duration: number;
  concept: string;
  objects: ReadonlyArray<{ shape: string; role: string; note: string }>;
  counters: ReadonlyArray<{ id?: string; name?: string; target?: number; note?: string }>;
  winTrigger: string;
  resultTrigger: string;
};

// ---- Helpers ----
const COLOR_KEYS = Object.keys(COLORS) as ColorName[];
const BG_KEYS    = Object.keys(BG_COLORS) as BgColorName[];

function getColor(n: number): string { return COLORS[COLOR_KEYS[Math.abs(n) % COLOR_KEYS.length]]; }
function getBg(n: number):    string { return BG_COLORS[BG_KEYS[Math.abs(n) % BG_KEYS.length]]; }

function validDuration(d: number): 5 | 10 | 15 | 20 | 30 {
  if (d <= 5)  return 5;
  if (d <= 10) return 10;
  if (d <= 15) return 15;
  if (d <= 20) return 20;
  return 30;
}

function shapeToSvg(shape: string, color: string, size = 90): string {
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

// ============================================================
// Template A: barReveal
// 1〜3個のオブジェクトがふわふわ揺れる。タップするとconfettiと結果テキストで演出。
// ============================================================
function barReveal(idea: BarIdea, n: number): GameConfig {
  const resultMsg = (idea.resultTrigger ?? idea.concept).substring(0, 60);

  const numObjs = Math.min(3, Math.max(1, idea.objects.length));
  const objects: ObjectDef[] = Array.from({ length: numObjs }, (_, i) => {
    const spec  = idea.objects[i];
    const color = getColor(n + i * 5);
    const x = numObjs === 1 ? 0.5
            : numObjs === 2 ? (i === 0 ? 0.3 : 0.7)
            : 0.2 + i * 0.3;
    return {
      id:           `obj-${i}`,
      name:         spec.role.substring(0, 20),
      dataUrl:      shapeToSvg(spec.shape, color),
      width:        90, height: 90, defaultScale: 1.6,
      position:     { x, y: 0.45 },
      zIndex:       1,
    };
  });

  const rules: RuleDef[] = [];

  // ゆっくりバウンス
  objects.forEach((obj, i) => {
    rules.push({
      id: `bounce-${i}`, name: `揺れ${i}`,
      targetObjectId: obj.id, priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.1 }],
      actions: [{ type: 'move', targetId: obj.id, movement: { type: 'bounce', speed: 0.7 + i * 0.3 } }],
    });
  });

  // タップ → 結果表示
  objects.forEach((obj, i) => {
    rules.push({
      id: `tap-${i}`, name: `タップ${i}`,
      targetObjectId: obj.id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: obj.id, effect: { type: 'scale', scaleAmount: 1.5, duration: 0.15 } },
        { type: 'effect', targetId: obj.id, effect: {
            type: 'particles', duration: 1.0,
            particleType: 'confetti', particleCount: 20,
            particleColor: '#FFD700', particleSpread: 120,
          } },
        { type: 'success', score: 100, message: resultMsg },
      ],
    });
  });

  return {
    id:          idea.id,
    title:       idea.title,
    description: truncate(idea.concept),
    category:    'bar',
    duration:    validDuration(idea.duration),
    difficulty:  'easy',
    backgroundColor: getBg(n),
    objects, counters: [], rules,
    tags: ['バー', '飲み会', idea.title],
  };
}

// ============================================================
// Template B: barChoice
// A/B/Cの3択ボタンを表示。どれをタップしても結果テキストを表示。
// 診断・クイズ系バーゲームに使用。
// ============================================================
function barChoice(idea: BarIdea, n: number): GameConfig {
  const resultMsg = (idea.resultTrigger ?? idea.concept).substring(0, 60);
  const colorA = getColor(n);
  const colorB = getColor(n + 5);
  const colorC = getColor(n + 10);

  const objects: ObjectDef[] = [
    {
      id: 'btn-a',
      name: '選択肢A',
      dataUrl: button('A', colorA, '#fff', 200, 90),
      width: 200, height: 90, defaultScale: 1.3,
      position: { x: 0.5, y: 0.30 },
      zIndex: 2,
    },
    {
      id: 'btn-b',
      name: '選択肢B',
      dataUrl: button('B', colorB, '#fff', 200, 90),
      width: 200, height: 90, defaultScale: 1.3,
      position: { x: 0.5, y: 0.50 },
      zIndex: 2,
    },
    {
      id: 'btn-c',
      name: '選択肢C',
      dataUrl: button('C', colorC, '#fff', 200, 90),
      width: 200, height: 90, defaultScale: 1.3,
      position: { x: 0.5, y: 0.70 },
      zIndex: 2,
    },
  ];

  const rules: RuleDef[] = [];

  // 各ボタンに軽い揺れ
  ['btn-a', 'btn-b', 'btn-c'].forEach((id, i) => {
    rules.push({
      id: `bounce-${i}`, name: `揺れ${i}`,
      targetObjectId: id, priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.12 }],
      actions: [{ type: 'move', targetId: id, movement: { type: 'bounce', speed: 0.4 + i * 0.15 } }],
    });
  });

  // どのボタンをタップしても結果を表示
  ['btn-a', 'btn-b', 'btn-c'].forEach((id, i) => {
    rules.push({
      id: `tap-${i}`, name: `選択${i}`,
      targetObjectId: id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: id, effect: { type: 'scale', scaleAmount: 1.3, duration: 0.12 } },
        { type: 'effect', targetId: id, effect: {
            type: 'particles', duration: 0.8,
            particleType: 'confetti', particleCount: 15,
            particleColor: '#FFD700', particleSpread: 100,
          } },
        { type: 'success', score: 100, message: resultMsg },
      ],
    });
  });

  return {
    id:          idea.id,
    title:       idea.title,
    description: truncate(idea.concept),
    category:    'bar',
    duration:    validDuration(idea.duration),
    difficulty:  'easy',
    backgroundColor: getBg(n),
    objects, counters: [], rules,
    tags: ['バー', 'クイズ', idea.title],
  };
}

// ============================================================
// Template C: barSpeedTap
// 大きなTAP!ボタンを連打してカウンターを目標値まで増やす。
// ============================================================
function barSpeedTap(idea: BarIdea, n: number): GameConfig {
  const color = getColor(n);
  const counterDef = idea.counters[0];
  const counterName  = counterDef?.id ?? 'taps';
  const counterLabel = counterDef?.name ?? '連打数';
  const winTarget    = Math.min(counterDef?.target ?? 20, 30);

  const objects: ObjectDef[] = [{
    id: 'btn', name: 'タップボタン',
    dataUrl: button('TAP!', color, '#fff', 260, 120),
    width: 260, height: 120, defaultScale: 1.5,
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
    category:    'bar',
    duration:    validDuration(idea.duration),
    difficulty:  'normal',
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['バー', '連打', idea.title],
  };
}

// ============================================================
// テンプレートセレクター
// ============================================================
function buildBarGame(idea: BarIdea, n: number): GameConfig {
  const c = idea.concept;

  // barSpeedTap: 連打ゲーム
  if (/連打|連続タップ|mash|押し続/i.test(c)) {
    return barSpeedTap(idea, n);
  }

  // barChoice: クイズ・診断・選択系
  if (/[234]択|選択肢|候補|どちら.*正解|正解.*どちら/i.test(c)) {
    return barChoice(idea, n);
  }

  // barReveal: デフォルト（タップで結果発表）
  return barReveal(idea, n);
}

// ---- Public entry point ----
export function generateBarGamesFromIdeas(): GameConfig[] {
  const allIdeas: BarIdea[] = [
    ...bar01Ideas,
    ...bar02Ideas,
    ...bar03Ideas,
    ...bar04Ideas,
    ...bar05Ideas,
    ...bar06Ideas,
    ...bar07Ideas,
    ...bar08Ideas,
    ...bar09Ideas,
    ...bar10Ideas,
    ...bar11Ideas,
    ...bar12Ideas,
    ...bar13Ideas,
    ...bar14Ideas,
    ...bar15Ideas,
    ...bar16Ideas,
    ...bar17Ideas,
    ...bar18Ideas,
    ...bar19Ideas,
    ...bar20Ideas,
  ] as BarIdea[];

  // テンプレート分布をログ出力
  const dist = { barReveal: 0, barChoice: 0, barSpeedTap: 0 };
  allIdeas.forEach(idea => {
    const c = idea.concept;
    if (/連打|連続タップ|mash|押し続/i.test(c))               dist.barSpeedTap++;
    else if (/[234]択|選択肢|候補|どちら.*正解|正解.*どちら/i.test(c)) dist.barChoice++;
    else                                                         dist.barReveal++;
  });
  console.log(`   [bar] barReveal:${dist.barReveal} barChoice:${dist.barChoice} barSpeedTap:${dist.barSpeedTap}`);

  return allIdeas.map((idea, i) => buildBarGame(idea, i));
}
