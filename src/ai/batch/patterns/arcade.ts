/**
 * patterns/arcade.ts
 * アーケードゲーム 500本分のパターン定義
 * テンプレート × バリエーション で生成
 */

import { circle, balloon, face, star, diamond, triangle, basket, coin, rect, COLORS, BG_COLORS, ColorName, BgColorName } from '../SvgLibrary';
import { GameConfig, ObjectDef, CounterDef, RuleDef } from '../GameBuilder';

// ---------- バリエーションデータ ----------

const THEMES = [
  { name: 'バブル',    obj: (c: string) => circle(c, 100),    bg: 'sky'    as BgColorName },
  { name: 'フルーツ',  obj: (c: string) => circle(c, 90),     bg: 'cream'  as BgColorName },
  { name: '風船',      obj: (c: string) => balloon(c, 90, 110),bg: 'sky'    as BgColorName },
  { name: 'スター',    obj: (c: string) => star(c, 90),        bg: 'night'  as BgColorName },
  { name: 'コイン',    obj: (c: string) => coin(c, 80),        bg: 'bright' as BgColorName },
  { name: 'ジェム',    obj: (c: string) => diamond(c, 90),     bg: 'dusk'   as BgColorName },
  { name: '敵',        obj: (c: string) => face(c, 90, false), bg: 'forest' as BgColorName },
  { name: 'モンスター',obj: (c: string) => face(c, 95, false), bg: 'night'  as BgColorName },
  { name: 'ブロック',  obj: (c: string) => rect(c, 100, 60),   bg: 'dark'   as BgColorName },
  { name: 'ハート',    obj: (c: string) => circle(c, 85),      bg: 'lavender'as BgColorName },
];

const COLOR_SETS: Array<{ colors: ColorName[]; accent: string }> = [
  { colors: ['red', 'orange', 'yellow'],  accent: '#FF6B35' },
  { colors: ['blue', 'teal', 'cyan'],     accent: '#00BCD4' },
  { colors: ['purple', 'indigo', 'pink'], accent: '#9C27B0' },
  { colors: ['green', 'lime', 'teal'],    accent: '#4CAF50' },
  { colors: ['red', 'blue', 'green'],     accent: '#FF5722' },
];

const DIFFICULTIES = [
  { name: 'easy'   as const, speed: 1.0, interval: 0.15, target: 5,  duration: 20 },
  { name: 'normal' as const, speed: 1.5, interval: 0.10, target: 8,  duration: 15 },
  { name: 'hard'   as const, speed: 2.0, interval: 0.07, target: 12, duration: 12 },
];

// ---------- ヘルパー ----------

function counterDef(id: string, name: string, max = 999): CounterDef {
  return { id, name, initialValue: 0, minValue: 0, maxValue: max };
}

function tapHideRule(objId: string, counterName: string, score = 10): RuleDef {
  return {
    id: `tap-${objId}`,
    name: `${objId}をタップ`,
    targetObjectId: objId,
    priority: 2,
    conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
    actions: [
      { type: 'effect', targetId: objId, effect: { type: 'scale', scaleAmount: 1.4, duration: 0.12 } },
      { type: 'hide', targetId: objId },
      { type: 'counter', counterName, operation: 'add', value: 1 },
      { type: 'addScore', points: score },
    ],
  };
}

function winRule(counterName: string, target: number, message = 'クリア！'): RuleDef {
  return {
    id: 'win-condition',
    name: 'クリア判定',
    targetObjectId: 'stage',
    priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: target }],
    actions: [{ type: 'success', score: 100, message }],
  };
}

function floatRule(objId: string, targetX: number, speed: number): RuleDef {
  return {
    id: `float-${objId}`,
    name: `${objId}移動`,
    targetObjectId: objId,
    priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 0.1 }],
    actions: [{ type: 'move', targetId: objId, movement: { type: 'straight', target: { x: targetX, y: -0.2 }, speed } }],
  };
}

function fallRule(objId: string, targetX: number, speed: number): RuleDef {
  return {
    id: `fall-${objId}`,
    name: `${objId}落下`,
    targetObjectId: objId,
    priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 0.08 }],
    actions: [{ type: 'move', targetId: objId, movement: { type: 'straight', target: { x: targetX, y: 1.3 }, speed } }],
  };
}

// ---------- テンプレート関数 ----------

/** テンプレートA: 浮かぶ的をタップ（ギャラガ/インベーダー系）*/
function tapFloaters(idx: number): GameConfig {
  const theme = THEMES[idx % THEMES.length];
  const colorSet = COLOR_SETS[Math.floor(idx / THEMES.length) % COLOR_SETS.length];
  const diff = DIFFICULTIES[idx % DIFFICULTIES.length];
  const count = 3;
  const positions = [0.2, 0.5, 0.8];

  const objects: ObjectDef[] = colorSet.colors.slice(0, count).map((c, i) => ({
    id: `obj-${i}`,
    name: `${theme.name}${i + 1}`,
    dataUrl: theme.obj(COLORS[c]),
    width: 90, height: 90,
    defaultScale: 2.0,
    position: { x: positions[i], y: 0.75 + i * 0.05 },
    zIndex: i + 1,
  }));

  const counters: CounterDef[] = [counterDef('hit', '撃破数', 99)];
  const rules: RuleDef[] = [
    ...objects.map((o, i) => floatRule(o.id, positions[i], diff.speed + i * 0.1)),
    ...objects.map(o => tapHideRule(o.id, 'hit', 10)),
    winRule('hit', count, '全滅だ！'),
  ];

  return {
    id: `arcade-tap-float-${idx}`,
    title: `${theme.name}撃ち（${idx + 1}）`,
    description: `浮かぶ${theme.name}を全部タップして消そう！`,
    category: 'arcade',
    duration: diff.duration,
    difficulty: diff.name,
    backgroundColor: BG_COLORS[theme.bg],
    objects, counters, rules,
    tags: ['タップ', 'アーケード', theme.name],
  };
}

/** テンプレートB: 落ちてくるものをタップ（固定画面アクション）*/
function tapFallers(idx: number): GameConfig {
  const theme = THEMES[(idx + 3) % THEMES.length];
  const colorSet = COLOR_SETS[(idx + 1) % COLOR_SETS.length];
  const diff = DIFFICULTIES[idx % DIFFICULTIES.length];
  const count = 4;
  const positions = [0.15, 0.38, 0.62, 0.85];

  const objects: ObjectDef[] = Array.from({ length: count }, (_, i) => ({
    id: `faller-${i}`,
    name: `${theme.name}${i + 1}`,
    dataUrl: theme.obj(COLORS[colorSet.colors[i % colorSet.colors.length]]),
    width: 85, height: 85,
    defaultScale: 1.8,
    position: { x: positions[i], y: 0.05 + i * 0.03 },
    zIndex: i + 1,
  }));

  const counters: CounterDef[] = [counterDef('popped', '叩いた数', 99)];
  const rules: RuleDef[] = [
    ...objects.map((o, i) => fallRule(o.id, positions[i], diff.speed + i * 0.15)),
    ...objects.map(o => tapHideRule(o.id, 'popped', 15)),
    winRule('popped', count, '全部やっつけた！'),
  ];

  return {
    id: `arcade-tap-fall-${idx}`,
    title: `落下${theme.name}（${idx + 1}）`,
    description: `落ちてくる${theme.name}をタップしよう！`,
    category: 'arcade',
    duration: diff.duration,
    difficulty: diff.name,
    backgroundColor: BG_COLORS[theme.bg],
    objects, counters, rules,
    tags: ['タップ', 'アーケード', '落下'],
  };
}

/** テンプレートC: 連打カウンター（ラピッドファイア系）*/
function rapidTap(idx: number): GameConfig {
  const colorName = Object.keys(COLORS)[idx % Object.keys(COLORS).length] as ColorName;
  const target = 20 + (idx % 5) * 5;
  const duration = 10 + (idx % 4) * 2;
  const bgNames = Object.keys(BG_COLORS) as BgColorName[];
  const bgName = bgNames[idx % bgNames.length];

  const objects: ObjectDef[] = [{
    id: 'tap-target',
    name: 'タップターゲット',
    dataUrl: circle(COLORS[colorName], 140),
    width: 140, height: 140,
    defaultScale: 1.8,
    position: { x: 0.5, y: 0.45 },
    zIndex: 1,
  }];

  const counters: CounterDef[] = [counterDef('taps', 'タップ数', target + 50)];
  const rules: RuleDef[] = [
    {
      id: 'tap-count',
      name: '連打カウント',
      targetObjectId: 'tap-target',
      priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'tap-target', effect: { type: 'scale', scaleAmount: 1.2, duration: 0.08 } },
        { type: 'counter', counterName: 'taps', operation: 'add', value: 1 },
        { type: 'addScore', points: 3 },
      ],
    },
    winRule('taps', target, `${target}回達成！`),
  ];

  return {
    id: `arcade-rapid-${idx}`,
    title: `連打チャレンジ${target}（${idx + 1}）`,
    description: `${duration}秒で${target}回タップしよう！`,
    category: 'arcade',
    duration,
    difficulty: idx % 3 === 0 ? 'easy' : idx % 3 === 1 ? 'normal' : 'hard',
    backgroundColor: BG_COLORS[bgName],
    objects, counters, rules,
    tags: ['連打', 'アーケード', 'タイムアタック'],
  };
}

/** テンプレートD: タイミングタップ（左右往復ターゲット）*/
function timingTap(idx: number): GameConfig {
  const colorName = Object.keys(COLORS)[(idx * 2) % Object.keys(COLORS).length] as ColorName;
  const target = 3 + (idx % 4);
  const duration = 15 + (idx % 3) * 3;
  const speed = 1.2 + (idx % 5) * 0.2;

  const objects: ObjectDef[] = [
    {
      id: 'mover',
      name: '的',
      dataUrl: star(COLORS[colorName], 100),
      width: 100, height: 100,
      defaultScale: 1.8,
      position: { x: 0.1, y: 0.45 },
      zIndex: 2,
    },
    {
      id: 'zone',
      name: 'ゴールゾーン',
      dataUrl: circle('#00FF00', 30),
      width: 30, height: 30,
      defaultScale: 3.0,
      position: { x: 0.5, y: 0.45 },
      zIndex: 1,
    },
  ];

  const counters: CounterDef[] = [counterDef('hits', '成功数', target + 10)];
  const rules: RuleDef[] = [
    {
      id: 'move-mover',
      name: '的が往復',
      targetObjectId: 'mover',
      priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.05 }],
      actions: [{ type: 'move', targetId: 'mover', movement: { type: 'bounce', speed } }],
    },
    {
      id: 'hit-zone',
      name: 'ゾーンで当たり',
      targetObjectId: 'mover',
      priority: 2,
      conditions: [
        { type: 'touch', target: 'stage', touchType: 'down' },
        { type: 'collision', target: 'other', targetObjectId: 'zone', collisionType: 'stay', checkMode: 'hitbox' },
      ],
      actions: [
        { type: 'effect', targetId: 'mover', effect: { type: 'flash', duration: 0.2 } },
        { type: 'counter', counterName: 'hits', operation: 'add', value: 1 },
        { type: 'addScore', points: 20 },
      ],
    },
    winRule('hits', target, '完璧なタイミング！'),
  ];

  return {
    id: `arcade-timing-${idx}`,
    title: `タイミング勝負（${idx + 1}）`,
    description: `的がゾーンに重なった瞬間にタップ！${target}回成功でクリア`,
    category: 'arcade',
    duration,
    difficulty: idx % 3 === 0 ? 'easy' : idx % 3 === 1 ? 'normal' : 'hard',
    backgroundColor: BG_COLORS['dark'],
    objects, counters, rules,
    tags: ['タイミング', 'アーケード', '反射'],
  };
}

/** テンプレートE: キャッチゲーム（ドラッグバスケット）*/
function catchGame(idx: number): GameConfig {
  const colorName = Object.keys(COLORS)[(idx * 3) % Object.keys(COLORS).length] as ColorName;
  const theme = THEMES[(idx + 5) % THEMES.length];
  const target = 4 + (idx % 4);
  const duration = 15 + (idx % 3) * 3;
  const speed = 1.0 + (idx % 4) * 0.3;
  const bgNames = Object.keys(BG_COLORS) as BgColorName[];

  const objects: ObjectDef[] = [
    {
      id: 'item',
      name: 'アイテム',
      dataUrl: theme.obj(COLORS[colorName]),
      width: 90, height: 90,
      defaultScale: 1.8,
      position: { x: 0.3 + (idx % 5) * 0.1, y: 0.05 },
      zIndex: 2,
    },
    {
      id: 'catcher',
      name: 'キャッチャー',
      dataUrl: basket('#8B4513', 150, 80),
      width: 150, height: 80,
      defaultScale: 1.5,
      position: { x: 0.5, y: 0.88 },
      zIndex: 1,
    },
  ];

  const counters: CounterDef[] = [counterDef('caught', 'キャッチ数', target + 20)];
  const rules: RuleDef[] = [
    {
      id: 'fall-item',
      name: 'アイテム落下',
      targetObjectId: 'item',
      priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.07 }],
      actions: [{ type: 'move', targetId: 'item', movement: { type: 'straight', target: { x: 0.3 + (idx % 5) * 0.1, y: 1.2 }, speed } }],
    },
    {
      id: 'drag-catcher',
      name: 'バスケットドラッグ',
      targetObjectId: 'catcher',
      priority: 1,
      conditions: [{ type: 'touch', target: 'stage', touchType: 'drag' }],
      actions: [{ type: 'followDrag', targetId: 'catcher', constraint: 'horizontal', smooth: false }],
    },
    {
      id: 'catch-collision',
      name: 'キャッチ判定',
      targetObjectId: 'item',
      priority: 2,
      conditions: [{ type: 'collision', target: 'other', targetObjectId: 'catcher', collisionType: 'enter', checkMode: 'hitbox' }],
      actions: [
        { type: 'hide', targetId: 'item' },
        { type: 'counter', counterName: 'caught', operation: 'add', value: 1 },
        { type: 'addScore', points: 15 },
        { type: 'effect', targetId: 'catcher', effect: { type: 'flash', duration: 0.15 } },
      ],
    },
    winRule('caught', target, `${target}個キャッチ！`),
  ];

  return {
    id: `arcade-catch-${idx}`,
    title: `${theme.name}キャッチ（${idx + 1}）`,
    description: `落ちてくる${theme.name}をバスケットでキャッチしよう！${target}個でクリア`,
    category: 'arcade',
    duration,
    difficulty: idx % 3 === 0 ? 'easy' : idx % 3 === 1 ? 'normal' : 'hard',
    backgroundColor: BG_COLORS[bgNames[(idx + 2) % bgNames.length]],
    objects, counters, rules,
    tags: ['ドラッグ', 'キャッチ', 'アーケード'],
  };
}

// ---------- 500本生成 ----------

export function generateArcadeGames(): GameConfig[] {
  const games: GameConfig[] = [];

  // テンプレートA: 浮かぶ的タップ (100本)
  for (let i = 0; i < 100; i++) games.push(tapFloaters(i));

  // テンプレートB: 落下タップ (100本)
  for (let i = 0; i < 100; i++) games.push(tapFallers(i));

  // テンプレートC: 連打 (100本)
  for (let i = 0; i < 100; i++) games.push(rapidTap(i));

  // テンプレートD: タイミング (100本)
  for (let i = 0; i < 100; i++) games.push(timingTap(i));

  // テンプレートE: キャッチ (100本)
  for (let i = 0; i < 100; i++) games.push(catchGame(i));

  return games;
}
