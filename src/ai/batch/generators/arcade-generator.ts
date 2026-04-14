/**
 * generators/arcade-generator.ts
 * 392のアーケードアイデアからGameConfigを生成
 *
 * テンプレート:
 *   tapFloaters  – オブジェクトがバウンド。タップで得点、カウンターが目標到達でクリア（デフォルト）
 *   rapidTap     – 大きなボタン連打でカウンターが目標到達でクリア（「連打」ゲーム用）
 */

import { GameConfig, ObjectDef, CounterDef, RuleDef } from '../GameBuilder.js';
import {
  circle, rect, star, diamond, triangle, face, bomb, button, balloon, coin,
  COLORS, BG_COLORS, ColorName, BgColorName,
} from '../SvgLibrary.js';

// ---- Arcade ideas imports ----
import { arcade2014Ideas }  from '../ideas/arcade-2014.js';
import { arcade2015Ideas }  from '../ideas/arcade-2015.js';
import { arcade2016Ideas }  from '../ideas/arcade-2016.js';
import { arcade2017Ideas }  from '../ideas/arcade-2017.js';
import { arcade2018Ideas }  from '../ideas/arcade-2018.js';
import { arcade2019aIdeas } from '../ideas/arcade-2019a.js';
import { arcade2019bIdeas } from '../ideas/arcade-2019b.js';
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

// Teleport destinations (cycle deterministically by game index + object index)
const TELEPORT_POS = [
  { x: 0.2, y: 0.25 }, { x: 0.8, y: 0.28 }, { x: 0.5, y: 0.55 },
  { x: 0.3, y: 0.65 }, { x: 0.7, y: 0.6  }, { x: 0.5, y: 0.22 },
  { x: 0.15, y: 0.45 }, { x: 0.85, y: 0.5 }, { x: 0.4, y: 0.75 },
];
function teleportPos(gameIdx: number, objIdx: number) {
  return TELEPORT_POS[(gameIdx * 3 + objIdx * 4) % TELEPORT_POS.length];
}

// ---- Template A: tapFloaters ----
// Objects bounce around; tapping teleports them and increments counter.
function tapFloaters(idea: ArcadeIdea, n: number): GameConfig {
  const mainColor = getColor(n);
  const altColor  = getColor(n + 7);

  const counterDef   = idea.counters[0];
  const counterName  = counterDef?.id ?? 'hits';
  const counterLabel = counterDef?.name ?? 'スコア';
  const winTarget    = Math.min(counterDef?.target ?? parseWinTarget(idea.winTrigger), 15);

  // Up to 3 target objects from idea's object list
  const numObjs = Math.min(3, Math.max(1, idea.objects.length));
  const objects: ObjectDef[] = Array.from({ length: numObjs }, (_, i) => {
    const spec  = idea.objects[i];
    const color = i === 0 ? mainColor : altColor;
    const x = numObjs === 1 ? 0.5 : 0.2 + (i / (numObjs - 1)) * 0.6;
    const y = 0.3 + (i % 2) * 0.25;
    return {
      id:           `obj-${i}`,
      name:         spec.role.substring(0, 20),
      dataUrl:      shapeToSvg(spec.shape, color),
      width:        80, height: 80,
      defaultScale: 1.5,
      position:     { x, y },
      zIndex:       1,
    };
  });

  const counters: CounterDef[] = [{
    id: counterName, name: counterLabel,
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [];

  // Bounce movement
  objects.forEach((obj, i) => {
    rules.push({
      id: `move-${i}`, name: `移動${i}`,
      targetObjectId: obj.id, priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.08 }],
      actions: [{ type: 'move', targetId: obj.id, movement: { type: 'bounce', speed: 1.5 + (n + i) % 3 * 0.5 } }],
    });
  });

  // Tap → teleport + score
  objects.forEach((obj, i) => {
    const dest = teleportPos(n, i);
    rules.push({
      id: `tap-${i}`, name: `タップ${i}`,
      targetObjectId: obj.id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: obj.id, effect: { type: 'scale', scaleAmount: 1.4, duration: 0.1 } },
        { type: 'effect', targetId: obj.id, effect: { type: 'particles', duration: 0.5, particleType: 'star', particleCount: 8, particleColor: '#FFD700', particleSpread: 60 } },
        { type: 'move',   targetId: obj.id, movement: { type: 'teleport', target: dest } },
        { type: 'counter', counterName, operation: 'increment' },
        { type: 'addScore', points: 10 },
      ],
    });
  });

  // Win
  rules.push({
    id: 'win', name: 'クリア',
    targetObjectId: 'stage', priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: winTarget }],
    actions: [{ type: 'success', score: 100, message: `${winTarget}回達成！クリア！` }],
  });

  return {
    id:          idea.id,
    title:       idea.title,
    description: idea.concept.length > 80 ? idea.concept.substring(0, 77) + '...' : idea.concept,
    category:    'arcade',
    duration:    validDuration(idea.duration),
    difficulty:  (['easy', 'normal', 'hard'].includes(idea.difficulty)
                    ? idea.difficulty : 'normal') as 'easy' | 'normal' | 'hard',
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['アーケード', idea.brand],
  };
}

// ---- Template B: rapidTap ----
// Single large button; rapid tapping fills counter.
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
    description: idea.concept.length > 80 ? idea.concept.substring(0, 77) + '...' : idea.concept,
    category:    'arcade',
    duration:    validDuration(idea.duration),
    difficulty:  (['easy', 'normal', 'hard'].includes(idea.difficulty)
                    ? idea.difficulty : 'normal') as 'easy' | 'normal' | 'hard',
    backgroundColor: getBg(n),
    objects, counters, rules,
    tags: ['アーケード', idea.brand, '連打'],
  };
}

// ---- Template selector ----
function buildArcadeGame(idea: ArcadeIdea, n: number): GameConfig {
  const c = idea.concept.toLowerCase();
  if (c.includes('連打') || c.includes('押し続') || c.includes('mash')) {
    return rapidTap(idea, n);
  }
  return tapFloaters(idea, n);
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

  return allIdeas.map((idea, i) => buildArcadeGame(idea, i));
}
