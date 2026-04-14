/**
 * generators/neta-generator.ts
 * src/ai/v2/neta.json の 200エントリからGameConfigを生成
 *
 * テンプレート（mechanic別）:
 *   tap   – オブジェクトをバウンド。タップで得点 → カウンター目標達成でクリア
 *   drag  – ドラッグ&ドロップでゾーンへ。衝突ごとにカウンター増加
 *   swipe – スワイプでオブジェクトを動かして得点
 *   flick – フリックで得点
 *   hold  – 長押しでカウンター充填 → クリア
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { GameConfig, ObjectDef, CounterDef, RuleDef } from '../GameBuilder.js';
import {
  circle, rect, star, diamond, triangle, face, bomb, button, balloon, coin,
  COLORS, BG_COLORS, ColorName, BgColorName,
} from '../SvgLibrary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---- Type ----
interface NetaItem {
  id:       number;
  title:    string;
  idea:     string;
  mechanic: 'tap' | 'drag' | 'swipe' | 'flick' | 'hold';
  theme:    string;
}

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

/** idea テキストから秒数を抽出（例: "10秒" → 10） */
function parseDurationFromIdea(idea: string): number {
  const m = idea.match(/(\d+)秒/);
  return m ? parseInt(m[1], 10) : 15;
}

/** idea テキストから勝利目標数を抽出 */
function parseWinTargetFromIdea(idea: string): number {
  // "30回", "10個", "5体", "3本", "5枚", "4つ", "3人" など
  const m = idea.match(/(\d+)[回個体本枚つ匹人]/);
  if (m) return Math.min(parseInt(m[1], 10), 20);
  return 10;
}

const SHAPES = ['circle', 'star', 'diamond', 'triangle', 'face', 'rect',
                'circle', 'star', 'circle', 'diamond'];
function getShape(n: number): string { return SHAPES[n % SHAPES.length]; }

function shapeToSvg(shape: string, color: string, size = 80): string {
  switch (shape) {
    case 'circle':   return circle(color, size);
    case 'rect':     return rect(color, size, Math.floor(size * 0.7));
    case 'star':     return star(color, size);
    case 'diamond':  return diamond(color, size);
    case 'triangle': return triangle(color, size);
    case 'face':     return face(color, size);
    default:         return circle(color, size);
  }
}

const TELEPORT_POS = [
  { x: 0.2,  y: 0.25 }, { x: 0.8,  y: 0.28 }, { x: 0.5, y: 0.55 },
  { x: 0.3,  y: 0.65 }, { x: 0.7,  y: 0.60 }, { x: 0.5, y: 0.22 },
  { x: 0.15, y: 0.45 }, { x: 0.85, y: 0.50 }, { x: 0.4, y: 0.75 },
];
function teleportPos(n: number, i: number) {
  return TELEPORT_POS[(n * 3 + i * 4) % TELEPORT_POS.length];
}

// ---- Template: tapGame ----
function tapGame(neta: NetaItem, n: number): GameConfig {
  const mainColor = getColor(n);
  const altColor  = getColor(n + 7);
  const winTarget = parseWinTargetFromIdea(neta.idea);
  const dur       = parseDurationFromIdea(neta.idea);

  const objects: ObjectDef[] = [
    {
      id: 'tgt-0', name: 'ターゲット',
      dataUrl: shapeToSvg(getShape(n), mainColor),
      width: 90, height: 90, defaultScale: 1.5,
      position: { x: 0.35, y: 0.40 }, zIndex: 1,
    },
    {
      id: 'tgt-1', name: 'ターゲット2',
      dataUrl: shapeToSvg(getShape(n + 4), altColor, 80),
      width: 80, height: 80, defaultScale: 1.5,
      position: { x: 0.65, y: 0.55 }, zIndex: 1,
    },
  ];

  const counters: CounterDef[] = [{
    id: 'taps', name: 'タップ数',
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [];

  objects.forEach((obj, i) => {
    // Bounce
    rules.push({
      id: `move-${i}`, name: `移動${i}`,
      targetObjectId: obj.id, priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.1 }],
      actions: [{ type: 'move', targetId: obj.id, movement: { type: 'bounce', speed: 1.5 + i * 0.4 } }],
    });
    // Tap
    const dest = teleportPos(n, i);
    rules.push({
      id: `tap-${i}`, name: `タップ${i}`,
      targetObjectId: obj.id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: obj.id, effect: { type: 'scale', scaleAmount: 1.4, duration: 0.1 } },
        { type: 'effect', targetId: obj.id, effect: { type: 'particles', duration: 0.5, particleType: 'star', particleCount: 6, particleColor: '#FFD700', particleSpread: 50 } },
        { type: 'move',   targetId: obj.id, movement: { type: 'teleport', target: dest } },
        { type: 'counter', counterName: 'taps', operation: 'increment' },
        { type: 'addScore', points: 10 },
      ],
    });
  });

  rules.push({
    id: 'win', name: 'クリア',
    targetObjectId: 'stage', priority: 10,
    conditions: [{ type: 'counter', counterName: 'taps', comparison: 'greaterOrEqual', value: winTarget }],
    actions: [{ type: 'success', score: 100, message: 'クリア！' }],
  });

  return {
    id: `neta-${neta.id}`, title: neta.title,
    description: neta.idea.length > 80 ? neta.idea.substring(0, 77) + '...' : neta.idea,
    category: 'arcade', duration: validDuration(dur), difficulty: 'normal',
    backgroundColor: getBg(n), objects, counters, rules,
    tags: ['ネタ', neta.theme, 'タップ'],
  };
}

// ---- Template: dragGame ----
function dragGame(neta: NetaItem, n: number): GameConfig {
  const mainColor = getColor(n);
  const zoneColor = getColor(n + 8);
  const winTarget = Math.min(parseWinTargetFromIdea(neta.idea), 8);
  const dur       = parseDurationFromIdea(neta.idea);

  const objects: ObjectDef[] = [
    // Draggable
    {
      id: 'drag', name: 'ドラッグ対象',
      dataUrl: shapeToSvg(getShape(n), mainColor),
      width: 80, height: 80, defaultScale: 1.5,
      position: { x: 0.5, y: 0.25 }, zIndex: 2,
    },
    // Three drop zones
    {
      id: 'zone-0', name: 'ゾーン1',
      dataUrl: rect(zoneColor, 100, 100, { rx: 15, stroke: '#ffffff' }),
      width: 100, height: 100, defaultScale: 1.4,
      position: { x: 0.2, y: 0.75 }, zIndex: 1,
    },
    {
      id: 'zone-1', name: 'ゾーン2',
      dataUrl: rect(zoneColor, 100, 100, { rx: 15, stroke: '#ffffff' }),
      width: 100, height: 100, defaultScale: 1.4,
      position: { x: 0.5, y: 0.78 }, zIndex: 1,
    },
    {
      id: 'zone-2', name: 'ゾーン3',
      dataUrl: rect(zoneColor, 100, 100, { rx: 15, stroke: '#ffffff' }),
      width: 100, height: 100, defaultScale: 1.4,
      position: { x: 0.8, y: 0.75 }, zIndex: 1,
    },
  ];

  const counters: CounterDef[] = [{
    id: 'drops', name: 'ドロップ数',
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const dropAction = (zoneId: string) => ([
    { type: 'effect', targetId: 'drag', effect: { type: 'particles', duration: 0.5, particleType: 'confetti', particleCount: 12, particleColor: '#FFD700', particleSpread: 70 } },
    { type: 'move',   targetId: 'drag', movement: { type: 'teleport', target: { x: 0.5, y: 0.25 } } },
    { type: 'counter', counterName: 'drops', operation: 'increment' },
    { type: 'addScore', points: 20 },
  ]);

  const rules: RuleDef[] = [
    // Drag
    {
      id: 'drag-rule', name: 'ドラッグ',
      targetObjectId: 'drag', priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'drag' }],
      actions: [{ type: 'followDrag', targetId: 'drag' }],
    },
    // Drop on zone-0
    {
      id: 'drop-0', name: 'ゾーン0ドロップ',
      targetObjectId: 'drag', priority: 2,
      conditions: [{ type: 'collision', target: 'other', targetObjectId: 'zone-0', collisionType: 'enter', checkMode: 'hitbox' }],
      actions: dropAction('zone-0'),
    },
    // Drop on zone-1
    {
      id: 'drop-1', name: 'ゾーン1ドロップ',
      targetObjectId: 'drag', priority: 2,
      conditions: [{ type: 'collision', target: 'other', targetObjectId: 'zone-1', collisionType: 'enter', checkMode: 'hitbox' }],
      actions: dropAction('zone-1'),
    },
    // Drop on zone-2
    {
      id: 'drop-2', name: 'ゾーン2ドロップ',
      targetObjectId: 'drag', priority: 2,
      conditions: [{ type: 'collision', target: 'other', targetObjectId: 'zone-2', collisionType: 'enter', checkMode: 'hitbox' }],
      actions: dropAction('zone-2'),
    },
    // Win
    {
      id: 'win', name: 'クリア',
      targetObjectId: 'stage', priority: 10,
      conditions: [{ type: 'counter', counterName: 'drops', comparison: 'greaterOrEqual', value: winTarget }],
      actions: [{ type: 'success', score: 100, message: `${winTarget}回投入成功！クリア！` }],
    },
  ];

  return {
    id: `neta-${neta.id}`, title: neta.title,
    description: neta.idea.length > 80 ? neta.idea.substring(0, 77) + '...' : neta.idea,
    category: 'arcade', duration: validDuration(dur), difficulty: 'normal',
    backgroundColor: getBg(n), objects, counters, rules,
    tags: ['ネタ', neta.theme, 'ドラッグ'],
  };
}

// ---- Template: swipeGame ----
function swipeGame(neta: NetaItem, n: number): GameConfig {
  const mainColor = getColor(n);
  const altColor  = getColor(n + 6);
  const winTarget = parseWinTargetFromIdea(neta.idea);
  const dur       = parseDurationFromIdea(neta.idea);

  const objects: ObjectDef[] = [
    {
      id: 'swipe-0', name: 'スワイプ対象',
      dataUrl: shapeToSvg(getShape(n), mainColor, 100),
      width: 100, height: 100, defaultScale: 1.5,
      position: { x: 0.5, y: 0.45 }, zIndex: 1,
    },
    {
      id: 'swipe-1', name: 'スワイプ対象2',
      dataUrl: shapeToSvg(getShape(n + 3), altColor, 80),
      width: 80, height: 80, defaultScale: 1.5,
      position: { x: 0.3, y: 0.6 }, zIndex: 1,
    },
  ];

  const counters: CounterDef[] = [{
    id: 'swipes', name: 'スワイプ数',
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [];

  // Wander movement
  objects.forEach((obj, i) => {
    rules.push({
      id: `wander-${i}`, name: `徘徊${i}`,
      targetObjectId: obj.id, priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.1 }],
      actions: [{ type: 'move', targetId: obj.id, movement: { type: 'wander', wanderRadius: 100, speed: 1.0 + i * 0.3 } }],
    });
    // Swipe on object
    const dest = teleportPos(n, i);
    rules.push({
      id: `swipe-${i}`, name: `スワイプ${i}`,
      targetObjectId: obj.id, priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'swipe' }],
      actions: [
        { type: 'effect', targetId: obj.id, effect: { type: 'scale', scaleAmount: 1.5, duration: 0.12 } },
        { type: 'effect', targetId: obj.id, effect: { type: 'particles', duration: 0.6, particleType: 'sparkle', particleCount: 10, particleColor: '#FFD700', particleSpread: 80 } },
        { type: 'move',   targetId: obj.id, movement: { type: 'teleport', target: dest } },
        { type: 'counter', counterName: 'swipes', operation: 'increment' },
        { type: 'addScore', points: 15 },
      ],
    });
  });

  rules.push({
    id: 'win', name: 'クリア',
    targetObjectId: 'stage', priority: 10,
    conditions: [{ type: 'counter', counterName: 'swipes', comparison: 'greaterOrEqual', value: winTarget }],
    actions: [{ type: 'success', score: 100, message: 'スワイプ達成！クリア！' }],
  });

  return {
    id: `neta-${neta.id}`, title: neta.title,
    description: neta.idea.length > 80 ? neta.idea.substring(0, 77) + '...' : neta.idea,
    category: 'arcade', duration: validDuration(dur), difficulty: 'normal',
    backgroundColor: getBg(n), objects, counters, rules,
    tags: ['ネタ', neta.theme, 'スワイプ'],
  };
}

// ---- Template: flickGame ----
function flickGame(neta: NetaItem, n: number): GameConfig {
  const mainColor = getColor(n);
  const winTarget = Math.min(parseWinTargetFromIdea(neta.idea), 10);
  const dur       = parseDurationFromIdea(neta.idea);

  const objects: ObjectDef[] = [{
    id: 'flick-obj', name: 'フリック対象',
    dataUrl: shapeToSvg(getShape(n), mainColor, 100),
    width: 100, height: 100, defaultScale: 1.5,
    position: { x: 0.5, y: 0.55 }, zIndex: 1,
  }];

  const counters: CounterDef[] = [{
    id: 'flicks', name: 'フリック数',
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [
    {
      id: 'move', name: '揺れ',
      targetObjectId: 'flick-obj', priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.08 }],
      actions: [{ type: 'move', targetId: 'flick-obj', movement: { type: 'bounce', speed: 1.5 } }],
    },
    {
      id: 'flick-rule', name: 'フリック',
      targetObjectId: 'flick-obj', priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'flick' }],
      actions: [
        { type: 'effect', targetId: 'flick-obj', effect: { type: 'scale', scaleAmount: 1.6, duration: 0.1 } },
        { type: 'effect', targetId: 'flick-obj', effect: { type: 'particles', duration: 0.7, particleType: 'sparkle', particleCount: 12, particleColor: '#FFD700', particleSpread: 80 } },
        { type: 'move',   targetId: 'flick-obj', movement: { type: 'teleport', target: teleportPos(n, 0) } },
        { type: 'counter', counterName: 'flicks', operation: 'increment' },
        { type: 'addScore', points: 15 },
      ],
    },
    {
      id: 'win', name: 'クリア',
      targetObjectId: 'stage', priority: 10,
      conditions: [{ type: 'counter', counterName: 'flicks', comparison: 'greaterOrEqual', value: winTarget }],
      actions: [{ type: 'success', score: 100, message: `${winTarget}回フリック達成！` }],
    },
  ];

  return {
    id: `neta-${neta.id}`, title: neta.title,
    description: neta.idea.length > 80 ? neta.idea.substring(0, 77) + '...' : neta.idea,
    category: 'arcade', duration: validDuration(dur), difficulty: 'normal',
    backgroundColor: getBg(n), objects, counters, rules,
    tags: ['ネタ', neta.theme, 'フリック'],
  };
}

// ---- Template: holdGame ----
function holdGame(neta: NetaItem, n: number): GameConfig {
  const color     = getColor(n);
  const winTarget = 5;
  const dur       = parseDurationFromIdea(neta.idea);

  const objects: ObjectDef[] = [{
    id: 'hold-btn', name: '長押しボタン',
    dataUrl: button('HOLD!', color, '#fff', 260, 130),
    width: 260, height: 130, defaultScale: 1.5,
    position: { x: 0.5, y: 0.5 }, zIndex: 1,
  }];

  const counters: CounterDef[] = [{
    id: 'holds', name: '長押し数',
    initialValue: 0, minValue: 0, maxValue: 999,
  }];

  const rules: RuleDef[] = [
    {
      id: 'hold-rule', name: '長押し',
      targetObjectId: 'hold-btn', priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'hold', holdDuration: 1.5 }],
      actions: [
        { type: 'effect', targetId: 'hold-btn', effect: { type: 'scale', scaleAmount: 1.3, duration: 0.2 } },
        { type: 'effect', targetId: 'hold-btn', effect: { type: 'particles', duration: 0.8, particleType: 'confetti', particleCount: 15, particleColor: '#FFD700', particleSpread: 90 } },
        { type: 'counter', counterName: 'holds', operation: 'increment' },
        { type: 'addScore', points: 20 },
      ],
    },
    {
      id: 'win', name: 'クリア',
      targetObjectId: 'stage', priority: 10,
      conditions: [{ type: 'counter', counterName: 'holds', comparison: 'greaterOrEqual', value: winTarget }],
      actions: [{ type: 'success', score: 100, message: '長押し成功！クリア！' }],
    },
  ];

  return {
    id: `neta-${neta.id}`, title: neta.title,
    description: neta.idea.length > 80 ? neta.idea.substring(0, 77) + '...' : neta.idea,
    category: 'arcade', duration: validDuration(dur), difficulty: 'normal',
    backgroundColor: getBg(n), objects, counters, rules,
    tags: ['ネタ', neta.theme, '長押し'],
  };
}

// ---- Template selector ----
function buildNetaGame(neta: NetaItem, n: number): GameConfig {
  switch (neta.mechanic) {
    case 'drag':  return dragGame(neta, n);
    case 'swipe': return swipeGame(neta, n);
    case 'flick': return flickGame(neta, n);
    case 'hold':  return holdGame(neta, n);
    default:      return tapGame(neta, n);
  }
}

// ---- Public entry point ----
export function generateNetaGames(): GameConfig[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../v2/neta.json'), 'utf-8')
  ) as { items: NetaItem[] };
  return raw.items.map((neta, i) => buildNetaGame(neta, i));
}
