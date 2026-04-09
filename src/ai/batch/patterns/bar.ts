/**
 * patterns/bar.ts
 * 飲み屋・バー向け会話ゲーム 200本分のパターン定義
 */

import { circle, button, face, star, diamond, bomb, rect, COLORS, BG_COLORS, ColorName, BgColorName } from '../SvgLibrary';
import { GameConfig, ObjectDef, CounterDef, RuleDef } from '../GameBuilder';

// ---------- テーマデータ ----------

const DARE_THEMES = [
  '乾杯', '自己紹介', '隣の人', '告白', 'ダンス',
  '歌う', '一気', 'ものまね', '罰ゲーム', 'お題',
  '右隣', '左隣', '幹事', '新人', 'ベテラン',
  '早口', '質問', 'チャレンジ', '交換', '決定',
];

const QUIZ_TOPICS = [
  '動物', '食べ物', '国旗', 'スポーツ', '映画',
  '音楽', '歴史', '地理', '科学', '芸術',
  'ゲーム', 'アニメ', 'マンガ', 'TV番組', '乗り物',
  '植物', '職業', '建物', 'お酒', '季節',
];

const SPEED_NAMES = [
  '指相撲', 'タップバトル', '早押し', '反応速度', '連打王',
  '親指力', '最速', '即反応', 'ハイスピード', '電光石火',
];

// ---------- ヘルパー ----------

function bigButton(label: string, color: string, pos = { x: 0.5, y: 0.5 }): ObjectDef {
  return {
    id: 'main-btn',
    name: 'ボタン',
    dataUrl: button(label, color, '#fff', 260, 120),
    width: 260, height: 120,
    defaultScale: 1.6,
    position: pos,
    zIndex: 1,
  };
}

function rapidTapRule(counterName: string): RuleDef {
  return {
    id: 'tap-count',
    name: '連打',
    targetObjectId: 'main-btn',
    priority: 1,
    conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
    actions: [
      { type: 'effect', targetId: 'main-btn', effect: { type: 'scale', scaleAmount: 1.15, duration: 0.07 } },
      { type: 'counter', counterName, operation: 'add', value: 1 },
      { type: 'addScore', points: 5 },
    ],
  };
}

function winRule(counterName: string, target: number, msg: string): RuleDef {
  return {
    id: 'win',
    name: 'クリア',
    targetObjectId: 'stage',
    priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: target }],
    actions: [{ type: 'success', score: 100, message: msg }],
  };
}

// ---------- テンプレートI: 連打バトル（誰が一番多くタップできるか）----------

function speedTap(idx: number): GameConfig {
  const name = SPEED_NAMES[idx % SPEED_NAMES.length];
  const target = 30 + (idx % 5) * 5;
  const duration = 10;
  const colorName = Object.keys(COLORS)[(idx * 4) % Object.keys(COLORS).length] as ColorName;
  const bgNames = Object.keys(BG_COLORS) as BgColorName[];

  return {
    id: `bar-speed-${idx}`,
    title: `${name}（${idx + 1}）`,
    description: `${duration}秒で${target}回タップ！一番早くクリアした人が勝ち`,
    category: 'bar',
    duration,
    difficulty: 'normal',
    backgroundColor: BG_COLORS[bgNames[(idx * 2) % bgNames.length]],
    objects: [bigButton('TAP!', COLORS[colorName])],
    counters: [{ id: 'taps', name: 'タップ数', initialValue: 0, minValue: 0, maxValue: 999 }],
    rules: [
      rapidTapRule('taps'),
      winRule('taps', target, `${target}回達成！あなたの勝ち！`),
    ],
    tags: ['スピード', '対決', 'バー'],
  };
}

// ---------- テンプレートII: ルーレット（誰が選ばれるか）----------

function roulette(idx: number): GameConfig {
  const theme = DARE_THEMES[idx % DARE_THEMES.length];
  const colorNames = Object.keys(COLORS) as ColorName[];
  const colors = [
    COLORS[colorNames[idx % colorNames.length]],
    COLORS[colorNames[(idx + 3) % colorNames.length]],
    COLORS[colorNames[(idx + 6) % colorNames.length]],
  ];

  const objects: ObjectDef[] = [
    {
      id: 'spinner',
      name: 'ルーレット',
      dataUrl: star(colors[0], 150),
      width: 150, height: 150,
      defaultScale: 1.8,
      position: { x: 0.5, y: 0.4 },
      zIndex: 2,
    },
    {
      id: 'stop-btn',
      name: 'ストップ',
      dataUrl: button('STOP', colors[1], '#fff', 200, 90),
      width: 200, height: 90,
      defaultScale: 1.5,
      position: { x: 0.5, y: 0.82 },
      zIndex: 1,
    },
  ];

  const rules: RuleDef[] = [
    {
      id: 'spin',
      name: 'スピン',
      targetObjectId: 'spinner',
      priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.05 }],
      actions: [{ type: 'effect', targetId: 'spinner', effect: { type: 'rotate', duration: 0.5, rotationAmount: 30, rotationSpeed: 360, rotationDirection: 'clockwise' } }],
    },
    {
      id: 'stop',
      name: 'ストップ！',
      targetObjectId: 'stop-btn',
      priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'spinner', effect: { type: 'particles', duration: 1.0, particleType: 'confetti', particleCount: 20, particleColor: colors[2], particleSpread: 100 } },
        { type: 'success', score: 100, message: `${theme}！選ばれた人の出番！` },
      ],
    },
  ];

  return {
    id: `bar-roulette-${idx}`,
    title: `ルーレット${theme}（${idx + 1}）`,
    description: `ルーレットを回して止まったら「${theme}」が当選！`,
    category: 'bar',
    duration: 30,
    difficulty: 'easy',
    backgroundColor: BG_COLORS['lavender'],
    objects,
    counters: [],
    rules,
    tags: ['ルーレット', '運試し', 'バー', theme],
  };
}

// ---------- テンプレートIII: 爆弾タイマー（最後にタップした人が負け）----------

function hotPotato(idx: number): GameConfig {
  const theme = DARE_THEMES[(idx + 5) % DARE_THEMES.length];
  const duration = 15 + (idx % 6) * 3;

  const objects: ObjectDef[] = [
    {
      id: 'bomb',
      name: '爆弾',
      dataUrl: bomb(160),
      width: 160, height: 160,
      defaultScale: 1.6,
      position: { x: 0.5, y: 0.38 },
      zIndex: 2,
    },
    {
      id: 'pass-btn',
      name: 'パスボタン',
      dataUrl: button('PASS!', '#E53935', '#fff', 220, 100),
      width: 220, height: 100,
      defaultScale: 1.5,
      position: { x: 0.5, y: 0.82 },
      zIndex: 1,
    },
  ];

  const rules: RuleDef[] = [
    {
      id: 'shake-bomb',
      name: '爆弾が震える',
      targetObjectId: 'bomb',
      priority: 1,
      conditions: [{ type: 'time', timeType: 'interval', interval: 0.5 }],
      actions: [{ type: 'effect', targetId: 'bomb', effect: { type: 'shake', duration: 0.3, intensity: 0.5 } }],
    },
    {
      id: 'pass',
      name: 'パス',
      targetObjectId: 'pass-btn',
      priority: 2,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'pass-btn', effect: { type: 'scale', scaleAmount: 1.2, duration: 0.1 } },
        { type: 'addScore', points: 1 },
      ],
    },
    {
      id: 'explode',
      name: '爆発！',
      targetObjectId: 'stage',
      priority: 10,
      conditions: [{ type: 'time', timeType: 'exact', interval: duration - 0.5 }],
      actions: [
        { type: 'effect', targetId: 'bomb', effect: { type: 'particles', duration: 1.0, particleType: 'explosion', particleCount: 30, particleColor: '#FF4444', particleSpread: 150 } },
        { type: 'failure', message: `爆発！「${theme}」は持っていた人の罰ゲーム！` },
      ],
    },
  ];

  return {
    id: `bar-hotpotato-${idx}`,
    title: `爆弾${theme}（${idx + 1}）`,
    description: `${duration}秒でPASSを回せ！爆発したら「${theme}」は持っていた人の罰ゲーム`,
    category: 'bar',
    duration,
    difficulty: 'easy',
    backgroundColor: BG_COLORS['dark'],
    objects,
    counters: [],
    rules,
    tags: ['爆弾', '罰ゲーム', 'バー', '心理戦'],
  };
}

// ---------- テンプレートIV: クイズ（○か×か）----------

function quizGame(idx: number): GameConfig {
  const topic = QUIZ_TOPICS[idx % QUIZ_TOPICS.length];
  const colorO = COLORS['blue'];
  const colorX = COLORS['red'];

  const objects: ObjectDef[] = [
    {
      id: 'btn-o',
      name: '○ボタン',
      dataUrl: button('○', colorO, '#fff', 180, 180),
      width: 180, height: 180,
      defaultScale: 1.5,
      position: { x: 0.25, y: 0.65 },
      zIndex: 1,
    },
    {
      id: 'btn-x',
      name: '×ボタン',
      dataUrl: button('×', colorX, '#fff', 180, 180),
      width: 180, height: 180,
      defaultScale: 1.5,
      position: { x: 0.75, y: 0.65 },
      zIndex: 1,
    },
    {
      id: 'question',
      name: '問題表示',
      dataUrl: rect('#FFFFFF', 300, 140, { rx: 12, stroke: '#CCCCCC' }),
      width: 300, height: 140,
      defaultScale: 1.5,
      position: { x: 0.5, y: 0.25 },
      zIndex: 2,
    },
  ];

  const rules: RuleDef[] = [
    {
      id: 'answer-o',
      name: '○を選択',
      targetObjectId: 'btn-o',
      priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'btn-o', effect: { type: 'scale', scaleAmount: 1.3, duration: 0.15 } },
        { type: 'addScore', points: 50 },
        { type: 'success', score: 100, message: `${topic}クイズ答えた！みんなで答え合わせ！` },
      ],
    },
    {
      id: 'answer-x',
      name: '×を選択',
      targetObjectId: 'btn-x',
      priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'btn-x', effect: { type: 'scale', scaleAmount: 1.3, duration: 0.15 } },
        { type: 'addScore', points: 50 },
        { type: 'success', score: 100, message: `${topic}クイズ答えた！みんなで答え合わせ！` },
      ],
    },
  ];

  return {
    id: `bar-quiz-${idx}`,
    title: `${topic}クイズ（${idx + 1}）`,
    description: `${topic}に関するクイズに○か×で答えよう！みんなで議論！`,
    category: 'bar',
    duration: 20,
    difficulty: 'easy',
    backgroundColor: BG_COLORS['cream'],
    objects,
    counters: [],
    rules,
    tags: ['クイズ', '会話', 'バー', topic],
  };
}

// ---------- テンプレートV: 早押し（最初にタップした人が勝ち）----------

function quickDraw(idx: number): GameConfig {
  const colorName = Object.keys(COLORS)[(idx * 5) % Object.keys(COLORS).length] as ColorName;
  const dare = DARE_THEMES[(idx + 10) % DARE_THEMES.length];
  const bgNames = Object.keys(BG_COLORS) as BgColorName[];

  const objects: ObjectDef[] = [
    {
      id: 'ready-btn',
      name: '早押しボタン',
      dataUrl: button('押せ！', COLORS[colorName], '#fff', 280, 280),
      width: 280, height: 280,
      defaultScale: 1.5,
      position: { x: 0.5, y: 0.45 },
      zIndex: 1,
    },
  ];

  const rules: RuleDef[] = [
    {
      id: 'quick-tap',
      name: '早押し',
      targetObjectId: 'ready-btn',
      priority: 1,
      conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
      actions: [
        { type: 'effect', targetId: 'ready-btn', effect: { type: 'particles', duration: 0.8, particleType: 'star', particleCount: 20, particleColor: '#FFD700', particleSpread: 120 } },
        { type: 'success', score: 100, message: `最初に押した人が「${dare}」の権利を獲得！` },
      ],
    },
  ];

  return {
    id: `bar-quick-${idx}`,
    title: `早押し${dare}（${idx + 1}）`,
    description: `合図で一番早く押した人が「${dare}」の権利を獲得！`,
    category: 'bar',
    duration: 15,
    difficulty: 'easy',
    backgroundColor: BG_COLORS[bgNames[(idx * 3) % bgNames.length]],
    objects,
    counters: [],
    rules,
    tags: ['早押し', '対決', 'バー', dare],
  };
}

// ---------- 200本生成 ----------

export function generateBarGames(): GameConfig[] {
  const games: GameConfig[] = [];

  // テンプレートI: 連打バトル (40本)
  for (let i = 0; i < 40; i++) games.push(speedTap(i));

  // テンプレートII: ルーレット (40本)
  for (let i = 0; i < 40; i++) games.push(roulette(i));

  // テンプレートIII: 爆弾回し (40本)
  for (let i = 0; i < 40; i++) games.push(hotPotato(i));

  // テンプレートIV: クイズ (40本)
  for (let i = 0; i < 40; i++) games.push(quizGame(i));

  // テンプレートV: 早押し (40本)
  for (let i = 0; i < 40; i++) games.push(quickDraw(i));

  return games;
}
