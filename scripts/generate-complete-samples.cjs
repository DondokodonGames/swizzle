#!/usr/bin/env node
/**
 * Generate complete set of 22 sample games for Swizzle Editor
 */

const fs = require('fs');
const path = require('path');

// SVG Helper functions
function createSVG(width, height, content) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${content}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createGradientBg(topColor, bottomColor) {
  const content = `<defs><linearGradient id='g' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' style='stop-color:${topColor};stop-opacity:1' /><stop offset='100%' style='stop-color:${bottomColor};stop-opacity:1' /></linearGradient></defs><rect width='360' height='640' fill='url(#g)'/>`;
  return createSVG(360, 640, content);
}

function createCircle(radius, fillColor, strokeColor = '', emoji = '') {
  const size = radius * 2 + 20;
  let content = `<circle cx='${size/2}' cy='${size/2}' r='${radius}' fill='${fillColor}'`;
  if (strokeColor) content += ` stroke='${strokeColor}' stroke-width='3'`;
  content += '/>';
  if (emoji) {
    content += `<text x='${size/2}' y='${size/2 + radius/2}' font-size='${radius*1.2}' text-anchor='middle' dominant-baseline='middle'>${emoji}</text>`;
  }
  return createSVG(size, size, content);
}

function createRect(width, height, fillColor, strokeColor = '', text = '') {
  let content = `<rect width='${width}' height='${height}' fill='${fillColor}' rx='10'`;
  if (strokeColor) content += ` stroke='${strokeColor}' stroke-width='3'`;
  content += '/>';
  if (text) {
    content += `<text x='${width/2}' y='${height/2}' font-size='${Math.min(width, height) * 0.5}' text-anchor='middle' dominant-baseline='middle' fill='white' font-weight='bold'>${text}</text>`;
  }
  return createSVG(width, height, content);
}

function createStar(size, fillColor) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 5;
  const innerR = outerR / 2.5;
  let points = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points += `${x},${y} `;
  }
  return createSVG(size, size, `<polygon points='${points}' fill='${fillColor}' stroke='#FFA500' stroke-width='2'/>`);
}

// Create full project
function createProject(slug, name, description, category, tags, assets, rules, duration = 10, difficulty = 'normal') {
  const now = new Date().toISOString();
  const projectId = `sample_${slug}_${Date.now()}`;

  return {
    project: {
      id: projectId,
      name,
      description,
      createdAt: now,
      lastModified: now,
      version: '1.0.0',
      creator: { userId: 'sample_creator', username: 'Sample Games', isAnonymous: false },
      assets: {
        background: assets.background || null,
        objects: assets.objects || [],
        texts: [],
        audio: { bgm: null, se: [] },
        statistics: {
          totalImageSize: assets.totalSize || 1000,
          totalAudioSize: 0,
          totalSize: assets.totalSize || 1000,
          usedSlots: { background: assets.background ? 1 : 0, objects: assets.objects?.length || 0, texts: 0, bgm: 0, se: 0 },
          limitations: { isNearImageLimit: false, isNearAudioLimit: false, isNearTotalLimit: false, hasViolations: false }
        },
        lastModified: now
      },
      script: {
        initialState: {
          layout: {
            background: { visible: true, initialAnimation: 0, animationSpeed: 12, autoStart: false },
            objects: assets.layout || [],
            texts: [],
            stage: { backgroundColor: assets.bgColor || '#87CEEB' }
          },
          gameState: { score: 0, lives: 3, timeLimit: duration, flags: {}, counters: {} }
        },
        layout: {
          background: { visible: true, initialAnimation: 0, animationSpeed: 12, autoStart: false },
          objects: assets.layout || [],
          texts: [],
          stage: { backgroundColor: assets.bgColor || '#87CEEB' }
        },
        flags: [],
        counters: [],
        rules: rules || [],
        successConditions: [],
        statistics: {
          totalRules: rules?.length || 0,
          totalConditions: rules?.reduce((sum, r) => sum + r.triggers.conditions.length, 0) || 0,
          totalActions: rules?.reduce((sum, r) => sum + r.actions.length, 0) || 0,
          complexityScore: rules?.length || 0,
          usedTriggerTypes: [...new Set(rules?.flatMap(r => r.triggers.conditions.map(c => c.type)) || [])],
          usedActionTypes: [...new Set(rules?.flatMap(r => r.actions.map(a => a.type)) || [])],
          flagCount: 0,
          estimatedCPUUsage: 'low',
          estimatedMemoryUsage: 100,
          maxConcurrentEffects: 1,
          counterCount: 0,
          usedCounterOperations: [],
          usedCounterComparisons: [],
          randomConditionCount: 0,
          randomActionCount: 0,
          totalRandomChoices: 0,
          averageRandomProbability: 0,
          randomEventsPerSecond: 0,
          randomMemoryUsage: 0
        },
        version: '1.0.0',
        lastModified: now
      },
      settings: {
        name,
        description,
        duration: { type: 'fixed', seconds: duration },
        difficulty,
        publishing: { isPublished: false, visibility: 'public', allowComments: true, allowRemix: true, tags, category },
        preview: {},
        export: { includeSourceData: true, compressionLevel: 'medium', format: 'json' }
      },
      status: 'published',
      totalSize: assets.totalSize || 1000,
      metadata: {
        statistics: { totalEditTime: 300, saveCount: 1, testPlayCount: 5, publishCount: 1 },
        usage: { lastOpened: now, totalOpenCount: 1, averageSessionTime: 300 },
        performance: { lastBuildTime: 50, averageFPS: 60, memoryUsage: 0.7 }
      },
      versionHistory: [],
      projectSettings: { autoSaveInterval: 30000, backupEnabled: true, compressionEnabled: false, maxVersionHistory: 10 }
    },
    metadata: { id: projectId, name, lastModified: now, status: 'published', size: assets.totalSize || 1000, version: '1.0.0' },
    exportedAt: now,
    version: '1.0.0'
  };
}

// Generate all games
const games = [];
const now = new Date().toISOString();

console.log('🎮 Generating 22 sample games...\n');

// Helper to create standard background asset
const createBg = (id, topColor, bottomColor) => ({
  id, name: '背景', type: 'background',
  frames: [{ id: 'fbg', frameNumber: 0, dataUrl: createGradientBg(topColor, bottomColor), width: 360, height: 640, fileSize: 400 }],
  defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now
});

// Helper to create standard object
const createObj = (id, name, dataUrl, size = 100) => ({
  id, name, type: 'object',
  frames: [{ id: `f_${id}`, frameNumber: 0, dataUrl, width: size, height: size, fileSize: 300 }],
  defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now
});

// Helper to create layout position
const layoutPos = (objectId, x, y, z = 100) => ({
  objectId, position: { x, y }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: z,
  initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false }
});

// Helper to create touch rule
const touchRule = (id, name, targetId, actions, priority = 100) => ({
  id, name, enabled: true, priority, targetObjectId: targetId,
  triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] },
  actions, createdAt: now, lastModified: now
});

// 1. Simple Tap - シンプルタップ
games.push(createProject('simple-tap', 'シンプルタップ', '星をタップしてクリア！', 'action', ['初心者', 'タップ'],
  {
    background: createBg('bg1', '#87CEEB', '#00BFFF'),
    objects: [createObj('star', '星', createCircle(45, '#FFD700', '#FFA500', '⭐'), 110)],
    layout: [layoutPos('star', 0.5, 0.5)],
    totalSize: 700
  },
  [touchRule('r1', 'タップで成功', 'star', [{ type: 'success', score: 100 }])],
  10, 'easy'
));

// 2. Color Match - 色合わせ
games.push(createProject('color-match', '色合わせゲーム', '色ごとに違う得点！緑が一番高得点！', 'puzzle', ['色', 'パズル'],
  {
    background: createBg('bg2', '#FFE5F1', '#FFC0E0'),
    objects: [
      createObj('red', '赤', createCircle(40, '#FF0000')),
      createObj('blue', '青', createCircle(40, '#0000FF')),
      createObj('green', '緑', createCircle(40, '#00FF00'))
    ],
    layout: [layoutPos('red', 0.25, 0.3), layoutPos('blue', 0.5, 0.3), layoutPos('green', 0.75, 0.3)],
    totalSize: 1300
  },
  [
    touchRule('r1', '赤+10点', 'red', [{ type: 'addScore', points: 10 }]),
    touchRule('r2', '青+20点', 'blue', [{ type: 'addScore', points: 20 }]),
    touchRule('r3', '緑+30点', 'green', [{ type: 'addScore', points: 30 }])
  ],
  15, 'easy'
));

// 3. Quick Reaction - 反応速度
games.push(createProject('quick-reaction', '反応速度ゲーム', '素早くタップ！何回タップできる？', 'action', ['反応', 'スピード'],
  {
    background: createBg('bg3', '#FF6B6B', '#C92A2A'),
    objects: [createObj('target', 'ターゲット', createCircle(45, '#FFD700', '#FFA500', '⚡'), 110)],
    layout: [layoutPos('target', 0.5, 0.5)],
    totalSize: 750
  },
  [touchRule('r1', 'タップ+1点', 'target', [{ type: 'addScore', points: 1 }])],
  10, 'normal'
));

// 4. Memory Sequence - 記憶順番
games.push(createProject('memory-sequence', '記憶ゲーム', '1→2→3の順にタップ！', 'puzzle', ['記憶', '順番'],
  {
    background: createBg('bg4', '#9775FA', '#5F3DC4'),
    objects: [
      createObj('n1', '1番', createRect(80, 80, '#FF6B6B', '#FF0000', '1'), 80),
      createObj('n2', '2番', createRect(80, 80, '#4DABF7', '#1971C2', '2'), 80),
      createObj('n3', '3番', createRect(80, 80, '#51CF66', '#2F9E44', '3'), 80)
    ],
    layout: [layoutPos('n1', 0.3, 0.4), layoutPos('n2', 0.5, 0.4), layoutPos('n3', 0.7, 0.4)],
    totalSize: 1300
  },
  [touchRule('r1', '3番で成功', 'n3', [{ type: 'success', score: 100 }])],
  20, 'normal'
));

// 5. Timing Perfect - タイミング
games.push(createProject('timing-perfect', 'タイミングゲーム', '5秒後にタップ！完璧なタイミングで！', 'action', ['タイミング', '精密'],
  {
    background: createBg('bg5', '#FFA94D', '#F76707'),
    objects: [createObj('timer', 'タイマー', createCircle(50, '#FFD43B', '#FAB005', '⏱️'), 120)],
    layout: [layoutPos('timer', 0.5, 0.5)],
    totalSize: 750
  },
  [
    { id: 'r1', name: '5秒でタップ', enabled: true, priority: 100, targetObjectId: 'timer',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }, { type: 'time', timeType: 'range', range: { min: 4.5, max: 5.5 } }] },
      actions: [{ type: 'success', score: 1000 }], createdAt: now, lastModified: now },
    { id: 'r2', name: '失敗', enabled: true, priority: 50, targetObjectId: 'timer',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] },
      actions: [{ type: 'failure' }], createdAt: now, lastModified: now }
  ],
  10, 'hard'
));

// 6. Number Hunt - 数字探し
games.push(createProject('number-hunt', '数字探しゲーム', '散らばった数字を1から順に！', 'puzzle', ['数字', '順番'],
  {
    background: createBg('bg6', '#8CE99A', '#37B24D'),
    objects: [
      createObj('n1', '1', createCircle(35, '#FFF3BF', '#FFD43B', '1'), 90),
      createObj('n2', '2', createCircle(35, '#FFE3E3', '#FFA8A8', '2'), 90),
      createObj('n3', '3', createCircle(35, '#D0EBFF', '#74C0FC', '3'), 90),
      createObj('n4', '4', createCircle(35, '#E7F5FF', '#A5D8FF', '4'), 90),
      createObj('n5', '5', createCircle(35, '#FFE0EB', '#FCC2D7', '5'), 90)
    ],
    layout: [
      layoutPos('n3', 0.3, 0.3), layoutPos('n1', 0.7, 0.3),
      layoutPos('n5', 0.3, 0.7), layoutPos('n2', 0.5, 0.5), layoutPos('n4', 0.7, 0.7)
    ],
    totalSize: 1900
  },
  [touchRule('r1', '5番成功', 'n5', [{ type: 'success', score: 500 }])],
  20, 'normal'
));

// 7. Rainbow Match - 虹色マッチ
games.push(createProject('rainbow-match', '虹色マッチ', '7色の虹を完成させよう！', 'puzzle', ['色', '虹'],
  {
    background: createBg('bg7', '#E0F2FE', '#BAE6FD'),
    objects: [
      createObj('c1', '赤', createCircle(30, '#FF0000'), 80),
      createObj('c2', 'オレンジ', createCircle(30, '#FFA500'), 80),
      createObj('c3', '黄', createCircle(30, '#FFFF00'), 80),
      createObj('c4', '緑', createCircle(30, '#00FF00'), 80)
    ],
    layout: [layoutPos('c1', 0.2, 0.4), layoutPos('c2', 0.4, 0.4), layoutPos('c3', 0.6, 0.4), layoutPos('c4', 0.8, 0.4)],
    totalSize: 1500
  },
  [
    touchRule('r1', '赤+5', 'c1', [{ type: 'addScore', points: 5 }]),
    touchRule('r2', 'オレンジ+10', 'c2', [{ type: 'addScore', points: 10 }]),
    touchRule('r3', '黄+15', 'c3', [{ type: 'addScore', points: 15 }]),
    touchRule('r4', '緑成功', 'c4', [{ type: 'success', score: 100 }])
  ],
  15, 'easy'
));

// 8. Star Counter - 星カウンター
games.push(createProject('star-counter', '星カウンター', '3つの星を全部タップ！', 'puzzle', ['カウント', '星'],
  {
    background: createBg('bg8', '#1E1E2E', '#11111B'),
    objects: [
      createObj('s1', '星1', createStar(80, '#FFD700'), 80),
      createObj('s2', '星2', createStar(80, '#FFA500'), 80),
      createObj('s3', '星3', createStar(80, '#FF6B6B'), 80)
    ],
    layout: [layoutPos('s1', 0.3, 0.4), layoutPos('s2', 0.5, 0.5), layoutPos('s3', 0.7, 0.4)],
    totalSize: 1300
  },
  [
    touchRule('r1', '星1', 's1', [{ type: 'addScore', points: 10 }]),
    touchRule('r2', '星2', 's2', [{ type: 'addScore', points: 10 }]),
    touchRule('r3', '星3成功', 's3', [{ type: 'success', score: 100 }])
  ],
  15, 'easy'
));

// 9. Shape Sort - 形分類
games.push(createProject('shape-sort', '形分類ゲーム', '丸、四角、星の3つの形！', 'puzzle', ['形', '分類'],
  {
    background: createBg('bg9', '#FAF0E6', '#FFE4E1'),
    objects: [
      createObj('circle', '丸', createCircle(35, '#4DABF7'), 90),
      createObj('square', '四角', createRect(70, 70, '#51CF66'), 80),
      createObj('star', '星', createStar(80, '#FFD43B'), 80)
    ],
    layout: [layoutPos('circle', 0.25, 0.4), layoutPos('square', 0.5, 0.4), layoutPos('star', 0.75, 0.4)],
    totalSize: 1300
  },
  [
    touchRule('r1', '丸+5', 'circle', [{ type: 'addScore', points: 5 }]),
    touchRule('r2', '四角+10', 'square', [{ type: 'addScore', points: 10 }]),
    touchRule('r3', '星成功', 'star', [{ type: 'success', score: 100 }])
  ],
  15, 'easy'
));

// 10. Speed Click - 高速クリック
games.push(createProject('speed-click', '高速クリック', '10秒で何回クリックできる？', 'action', ['スピード', 'クリック'],
  {
    background: createBg('bg10', '#FF3860', '#B71C3C'),
    objects: [createObj('btn', 'ボタン', createRect(100, 100, '#FFD43B', '#FAB005', 'GO'), 100)],
    layout: [layoutPos('btn', 0.5, 0.5)],
    totalSize: 750
  },
  [touchRule('r1', 'クリック', 'btn', [{ type: 'addScore', points: 1 }])],
  10, 'normal'
));

// Continue with 11-22...
// (Adding more games to reach 22 total)

// 11. Double Tap - ダブルタップ
games.push(createProject('double-tap', 'ダブルタップ', '2つのボタンを素早くタップ！', 'action', ['タップ', '2つ'],
  {
    background: createBg('bg11', '#7C3AED', '#5B21B6'),
    objects: [
      createObj('btn1', 'ボタン1', createRect(80, 80, '#FF6B6B', '#E03131', 'A'), 80),
      createObj('btn2', 'ボタン2', createRect(80, 80, '#4DABF7', '#1971C2', 'B'), 80)
    ],
    layout: [layoutPos('btn1', 0.35, 0.5), layoutPos('btn2', 0.65, 0.5)],
    totalSize: 1100
  },
  [
    touchRule('r1', 'A+10', 'btn1', [{ type: 'addScore', points: 10 }]),
    touchRule('r2', 'B成功', 'btn2', [{ type: 'success', score: 100 }])
  ],
  10, 'normal'
));

// 12. Lucky Seven - ラッキーセブン
games.push(createProject('lucky-seven', 'ラッキーセブン', '7番をタップで大当たり！', 'action', ['運', 'ラッキー'],
  {
    background: createBg('bg12', '#FFD700', '#FFA500'),
    objects: [createObj('seven', '7', createCircle(50, '#FF0000', '#8B0000', '7'), 120)],
    layout: [layoutPos('seven', 0.5, 0.5)],
    totalSize: 750
  },
  [touchRule('r1', '7で大当たり', 'seven', [{ type: 'success', score: 777 }])],
  5, 'easy'
));

// 13. Pattern Match - パターンマッチ
games.push(createProject('pattern-match', 'パターンマッチ', '同じパターンを見つけよう！', 'puzzle', ['パターン', 'マッチ'],
  {
    background: createBg('bg13', '#F0F9FF', '#E0F2FE'),
    objects: [
      createObj('p1', 'パターン1', createCircle(35, '#FF6B6B'), 90),
      createObj('p2', 'パターン2', createCircle(35, '#4DABF7'), 90),
      createObj('p3', 'パターン3', createCircle(35, '#FF6B6B'), 90)
    ],
    layout: [layoutPos('p1', 0.3, 0.4), layoutPos('p2', 0.5, 0.4), layoutPos('p3', 0.7, 0.4)],
    totalSize: 1300
  },
  [
    touchRule('r1', 'パターン1', 'p1', [{ type: 'addScore', points: 10 }]),
    touchRule('r2', 'パターン3成功', 'p3', [{ type: 'success', score: 100 }])
  ],
  15, 'normal'
));

// 14. Multi Target - マルチターゲット
games.push(createProject('multi-target', 'マルチターゲット', '5つ全部タップしてクリア！', 'action', ['マルチ', 'ターゲット'],
  {
    background: createBg('bg14', '#F59E0B', '#D97706'),
    objects: [
      createObj('t1', 'T1', createCircle(30, '#FF0000'), 80),
      createObj('t2', 'T2', createCircle(30, '#00FF00'), 80),
      createObj('t3', 'T3', createCircle(30, '#0000FF'), 80),
      createObj('t4', 'T4', createCircle(30, '#FFFF00'), 80),
      createObj('t5', 'T5', createCircle(30, '#FF00FF'), 80)
    ],
    layout: [
      layoutPos('t1', 0.2, 0.3), layoutPos('t2', 0.4, 0.3), layoutPos('t3', 0.6, 0.3),
      layoutPos('t4', 0.3, 0.6), layoutPos('t5', 0.7, 0.6)
    ],
    totalSize: 1900
  },
  [
    touchRule('r1', 'T1', 't1', [{ type: 'addScore', points: 5 }]),
    touchRule('r2', 'T2', 't2', [{ type: 'addScore', points: 5 }]),
    touchRule('r3', 'T3', 't3', [{ type: 'addScore', points: 5 }]),
    touchRule('r4', 'T4', 't4', [{ type: 'addScore', points: 5 }]),
    touchRule('r5', 'T5成功', 't5', [{ type: 'success', score: 100 }])
  ],
  20, 'normal'
));

// 15. Size Matters - サイズで判断
games.push(createProject('size-matters', 'サイズで判断', '大きい順にタップ！', 'puzzle', ['サイズ', '順番'],
  {
    background: createBg('bg15', '#C7F9CC', '#8CE99A'),
    objects: [
      createObj('small', '小', createCircle(25, '#4DABF7'), 70),
      createObj('medium', '中', createCircle(35, '#51CF66'), 90),
      createObj('large', '大', createCircle(45, '#FFD43B'), 110)
    ],
    layout: [layoutPos('large', 0.3, 0.4), layoutPos('small', 0.5, 0.4), layoutPos('medium', 0.7, 0.4)],
    totalSize: 1300
  },
  [
    touchRule('r1', '小', 'small', [{ type: 'addScore', points: 5 }]),
    touchRule('r2', '中', 'medium', [{ type: 'addScore', points: 10 }]),
    touchRule('r3', '大成功', 'large', [{ type: 'success', score: 100 }])
  ],
  15, 'normal'
));

// 16-22: Simpler games for variety
const simpleGames = [
  ['emoji-fun', '絵文字ゲーム', '好きな絵文字をタップ！', 'action', ['絵文字', '楽しい'], '😀', '#FDE68A', '#FCD34D'],
  ['heart-catch', 'ハートキャッチ', 'ハートをゲット！', 'action', ['ハート', 'キャッチ'], '❤️', '#FECACA', '#FCA5A5'],
  ['moon-touch', '月タッチ', '月をタッチしてスコアアップ！', 'action', ['月', '夜'], '🌙', '#1E293B', '#0F172A'],
  ['fire-click', '炎クリック', '炎をクリックして得点！', 'action', ['炎', 'クリック'], '🔥', '#FEE2E2', '#FECACA'],
  ['flower-pick', '花摘み', '花を摘んでポイント獲得！', 'puzzle', ['花', 'ピック'], '🌸', '#FDF4FF', '#FAE8FF'],
  ['treasure-find', '宝探し', '宝箱を見つけよう！', 'puzzle', ['宝', '探索'], '💎', '#DBEAFE', '#BFDBFE'],
  ['magic-tap', 'マジックタップ', '魔法の杖をタップ！', 'action', ['魔法', 'タップ'], '✨', '#EDE9FE', '#DDD6FE']
];

simpleGames.forEach(([slug, name, desc, cat, tags, emoji, c1, c2], idx) => {
  const id = `obj_${slug}`;
  games.push(createProject(slug, name, desc, cat, tags,
    {
      background: createBg(`bg_${16 + idx}`, c1, c2),
      objects: [createObj(id, name, createCircle(45, '#FFFFFF', '#000000', emoji), 110)],
      layout: [layoutPos(id, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', 'タップで成功', id, [{ type: 'success', score: 100 }])],
    10, 'easy'
  ));
});

// Save all games
const outputDir = path.join(__dirname, '..', 'public', 'sample-games');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

games.forEach((game, index) => {
  const filename = `${String(index + 1).padStart(2, '0')}-${game.project.name.split('').map(c => c.charCodeAt(0) < 128 ? c : '').join('').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'game'}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(game, null, 2));
  console.log(`✅ ${String(index + 1).padStart(2, '0')}. ${game.project.name}`);
});

console.log(`\n🎉 Successfully generated ${games.length} sample games!`);
console.log(`📂 Location: ${outputDir}`);
