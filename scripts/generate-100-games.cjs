#!/usr/bin/env node
/**
 * Generate 100 diverse sample games for Swizzle Editor
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
    content += `<text x='${width/2}' y='${height/2}' font-size='${Math.min(width, height) * 0.4}' text-anchor='middle' dominant-baseline='middle' fill='white' font-weight='bold'>${text}</text>`;
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

function createHeart(size, fillColor) {
  const content = `<path d='M${size/2},${size*0.8} C${size/2},${size*0.8} ${size*0.1},${size*0.4} ${size*0.1},${size*0.25} C${size*0.1},${size*0.1} ${size/2},${size*0.1} ${size/2},${size*0.3} C${size/2},${size*0.1} ${size*0.9},${size*0.1} ${size*0.9},${size*0.25} C${size*0.9},${size*0.4} ${size/2},${size*0.8} ${size/2},${size*0.8}Z' fill='${fillColor}' stroke='#D91E48' stroke-width='2'/>`;
  return createSVG(size, size, content);
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

// Helper functions
const now = new Date().toISOString();

const createBg = (id, topColor, bottomColor) => ({
  id, name: '背景', type: 'background',
  frames: [{ id: 'fbg', frameNumber: 0, dataUrl: createGradientBg(topColor, bottomColor), width: 360, height: 640, fileSize: 400 }],
  defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now
});

const createObj = (id, name, dataUrl, size = 100) => ({
  id, name, type: 'object',
  frames: [{ id: `f_${id}`, frameNumber: 0, dataUrl, width: size, height: size, fileSize: 300 }],
  defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now
});

const layoutPos = (objectId, x, y, z = 100) => ({
  objectId, position: { x, y }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: z,
  initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false }
});

const touchRule = (id, name, targetId, actions, priority = 100) => ({
  id, name, enabled: true, priority, targetObjectId: targetId,
  triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] },
  actions, createdAt: now, lastModified: now
});

// Color palettes
const colors = {
  red: ['#FF0000', '#E03131'],
  orange: ['#FFA500', '#F76707'],
  yellow: ['#FFFF00', '#FFD43B'],
  green: ['#00FF00', '#2F9E44'],
  blue: ['#0000FF', '#1971C2'],
  purple: ['#9775FA', '#5F3DC4'],
  pink: ['#FF69B4', '#E64980'],
  cyan: ['#00FFFF', '#15AABF'],
  lime: ['#BFFF00', '#82C91E'],
  magenta: ['#FF00FF', '#D6336C']
};

const bgGradients = [
  ['#87CEEB', '#00BFFF'], ['#FFE5F1', '#FFC0E0'], ['#FF6B6B', '#C92A2A'],
  ['#9775FA', '#5F3DC4'], ['#FFA94D', '#F76707'], ['#8CE99A', '#37B24D'],
  ['#E0F2FE', '#BAE6FD'], ['#1E1E2E', '#11111B'], ['#FAF0E6', '#FFE4E1'],
  ['#F59E0B', '#D97706'], ['#C7F9CC', '#8CE99A'], ['#FDE68A', '#FCD34D'],
  ['#FECACA', '#FCA5A5'], ['#1E293B', '#0F172A'], ['#FEE2E2', '#FECACA'],
  ['#FDF4FF', '#FAE8FF'], ['#DBEAFE', '#BFDBFE'], ['#EDE9FE', '#DDD6FE']
];

const emojis = [
  ['⭐', '星'], ['❤️', 'ハート'], ['🌙', '月'], ['🔥', '炎'], ['🌸', '花'],
  ['💎', '宝石'], ['✨', '輝き'], ['😀', '笑顔'], ['🎯', 'ターゲット'], ['⚡', '雷'],
  ['🌟', 'スター'], ['💫', '流れ星'], ['🌈', '虹'], ['☀️', '太陽'], ['🌊', '波'],
  ['🍎', 'りんご'], ['🍊', 'オレンジ'], ['🍋', 'レモン'], ['🍇', 'ぶどう'], ['🍓', 'いちご'],
  ['🐶', '犬'], ['🐱', '猫'], ['🐭', 'ねずみ'], ['🐰', 'うさぎ'], ['🐻', 'くま'],
  ['⚽', 'サッカー'], ['🏀', 'バスケ'], ['⚾', '野球'], ['🎾', 'テニス'], ['🏐', 'バレー'],
  ['🚗', '車'], ['🚕', 'タクシー'], ['🚙', 'SUV'], ['🚌', 'バス'], ['🚎', 'トロリー'],
  ['🎵', '音符'], ['🎶', '音楽'], ['🎸', 'ギター'], ['🎹', 'ピアノ'], ['🎺', 'トランペット'],
  ['☁️', '雲'], ['⛈️', '雷雨'], ['🌤️', '晴れ'], ['🌦️', 'にわか雨'], ['🌧️', '雨'],
  ['🍕', 'ピザ'], ['🍔', 'ハンバーガー'], ['🍟', 'ポテト'], ['🍿', 'ポップコーン'], ['🍩', 'ドーナツ']
];

console.log('🎮 Generating 100 sample games...\n');

const games = [];

// Category 1: Numbers (1-20) - 数字ゲーム
for (let i = 1; i <= 20; i++) {
  const numColor = colors[Object.keys(colors)[i % Object.keys(colors).length]];
  games.push(createProject(
    `number-${i}`, `数字${i}ゲーム`, `数字${i}をタップしてクリア！`, 'puzzle', ['数字', `${i}`],
    {
      background: createBg(`bg_n${i}`, bgGradients[i % bgGradients.length][0], bgGradients[i % bgGradients.length][1]),
      objects: [createObj(`num${i}`, `数字${i}`, createCircle(45, numColor[0], numColor[1], `${i}`), 110)],
      layout: [layoutPos(`num${i}`, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', `数字${i}で成功`, `num${i}`, [{ type: 'success', score: i * 10 }])],
    10, 'easy'
  ));
}

// Category 2: Colors (21-30) - 色ゲーム
const colorNames = ['赤', '青', '緑', '黄', 'オレンジ', '紫', 'ピンク', 'シアン', 'ライム', 'マゼンタ'];
Object.keys(colors).forEach((colorKey, idx) => {
  const i = 21 + idx;
  const col = colors[colorKey];
  games.push(createProject(
    `color-${colorKey}`, `${colorNames[idx]}色ゲーム`, `${colorNames[idx]}色の丸をタップ！`, 'puzzle', ['色', colorNames[idx]],
    {
      background: createBg(`bg_c${i}`, '#F8F9FA', '#E9ECEF'),
      objects: [createObj(`col${i}`, colorNames[idx], createCircle(45, col[0], col[1]), 110)],
      layout: [layoutPos(`col${i}`, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', `${colorNames[idx]}成功`, `col${i}`, [{ type: 'success', score: 100 }])],
    10, 'easy'
  ));
});

// Category 3: Emojis (31-50) - 絵文字ゲーム
for (let i = 0; i < 20; i++) {
  const gameNum = 31 + i;
  const [emoji, name] = emojis[i % emojis.length];
  const bgPair = bgGradients[i % bgGradients.length];
  games.push(createProject(
    `emoji-${i}`, `${name}ゲーム`, `${emoji}${name}をタップしてクリア！`, 'action', ['絵文字', name],
    {
      background: createBg(`bg_e${gameNum}`, bgPair[0], bgPair[1]),
      objects: [createObj(`emoji${gameNum}`, name, createCircle(45, '#FFFFFF', '#333333', emoji), 110)],
      layout: [layoutPos(`emoji${gameNum}`, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', `${name}で成功`, `emoji${gameNum}`, [{ type: 'success', score: 100 }])],
    10, 'easy'
  ));
}

// Category 4: Shapes (51-60) - 形ゲーム
const shapes = [
  ['circle', '丸', () => createCircle(45, '#4DABF7')],
  ['square', '四角', () => createRect(90, 90, '#51CF66')],
  ['star', '星', () => createStar(90, '#FFD43B')],
  ['heart', 'ハート', () => createHeart(90, '#FF6B9D')],
  ['circle-red', '赤丸', () => createCircle(45, '#FF0000')],
  ['square-blue', '青四角', () => createRect(90, 90, '#0000FF')],
  ['star-yellow', '黄星', () => createStar(90, '#FFFF00')],
  ['circle-green', '緑丸', () => createCircle(45, '#00FF00')],
  ['square-purple', '紫四角', () => createRect(90, 90, '#9775FA')],
  ['star-orange', 'オレンジ星', () => createStar(90, '#FFA500')]
];

shapes.forEach((shape, idx) => {
  const gameNum = 51 + idx;
  const [slug, name, createFn] = shape;
  games.push(createProject(
    `shape-${slug}`, `${name}ゲーム`, `${name}をタップ！`, 'puzzle', ['形', name],
    {
      background: createBg(`bg_s${gameNum}`, bgGradients[idx % bgGradients.length][0], bgGradients[idx % bgGradients.length][1]),
      objects: [createObj(`shape${gameNum}`, name, createFn(), 100)],
      layout: [layoutPos(`shape${gameNum}`, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', `${name}成功`, `shape${gameNum}`, [{ type: 'success', score: 100 }])],
    10, 'normal'
  ));
});

// Category 5: Multi-tap games (61-70) - マルチタップゲーム
for (let i = 0; i < 10; i++) {
  const gameNum = 61 + i;
  const count = 2 + (i % 3); // 2-4個のオブジェクト
  const objIds = [];
  const objs = [];
  const layouts = [];
  const rules = [];

  for (let j = 0; j < count; j++) {
    const objId = `obj${gameNum}_${j}`;
    objIds.push(objId);
    const col = colors[Object.keys(colors)[j % Object.keys(colors).length]];
    objs.push(createObj(objId, `ボタン${j+1}`, createCircle(35, col[0], col[1], `${j+1}`), 90));
    layouts.push(layoutPos(objId, 0.2 + j * 0.25, 0.5));

    if (j < count - 1) {
      rules.push(touchRule(`r${j}`, `ボタン${j+1}`, objId, [{ type: 'addScore', points: 10 }]));
    } else {
      rules.push(touchRule(`r${j}`, `成功`, objId, [{ type: 'success', score: 100 }]));
    }
  }

  games.push(createProject(
    `multi-${i}`, `${count}連タップ`, `${count}つのボタンを順にタップ！`, 'action', ['マルチ', 'タップ'],
    {
      background: createBg(`bg_m${gameNum}`, bgGradients[i % bgGradients.length][0], bgGradients[i % bgGradients.length][1]),
      objects: objs,
      layout: layouts,
      totalSize: 700 + objs.length * 300
    },
    rules,
    15, 'normal'
  ));
}

// Category 6: Speed games (71-80) - スピードゲーム
for (let i = 0; i < 10; i++) {
  const gameNum = 71 + i;
  const duration = 5 + i; // 5-14秒
  games.push(createProject(
    `speed-${i}`, `${duration}秒チャレンジ`, `${duration}秒で何回タップできる？`, 'action', ['スピード', '時間'],
    {
      background: createBg(`bg_sp${gameNum}`, bgGradients[i % bgGradients.length][0], bgGradients[i % bgGradients.length][1]),
      objects: [createObj(`speed${gameNum}`, 'ボタン', createCircle(45, '#FFD700', '#FFA500', '⚡'), 110)],
      layout: [layoutPos(`speed${gameNum}`, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', 'タップ', `speed${gameNum}`, [{ type: 'addScore', points: 1 }])],
    duration, 'normal'
  ));
}

// Category 7: Timing games (81-90) - タイミングゲーム
for (let i = 0; i < 10; i++) {
  const gameNum = 81 + i;
  const targetTime = 3 + i * 0.5; // 3.0, 3.5, 4.0... 7.5秒
  games.push(createProject(
    `timing-${i}`, `${targetTime}秒タイミング`, `${targetTime}秒後にタップ！`, 'action', ['タイミング', '精密'],
    {
      background: createBg(`bg_t${gameNum}`, bgGradients[i % bgGradients.length][0], bgGradients[i % bgGradients.length][1]),
      objects: [createObj(`time${gameNum}`, 'タイマー', createCircle(50, '#FFD43B', '#FAB005', '⏱️'), 120)],
      layout: [layoutPos(`time${gameNum}`, 0.5, 0.5)],
      totalSize: 750
    },
    [
      { id: 'r1', name: '完璧', enabled: true, priority: 100, targetObjectId: `time${gameNum}`,
        triggers: { operator: 'AND', conditions: [
          { type: 'touch', target: 'self' },
          { type: 'time', timeType: 'range', range: { min: targetTime - 0.3, max: targetTime + 0.3 } }
        ]},
        actions: [{ type: 'success', score: 1000 }], createdAt: now, lastModified: now },
      { id: 'r2', name: '失敗', enabled: true, priority: 50, targetObjectId: `time${gameNum}`,
        triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] },
        actions: [{ type: 'failure' }], createdAt: now, lastModified: now }
    ],
    15, 'hard'
  ));
}

// Category 8: Mixed games (91-100) - ミックスゲーム
for (let i = 0; i < 10; i++) {
  const gameNum = 91 + i;
  const [emoji, name] = emojis[(20 + i) % emojis.length];
  games.push(createProject(
    `special-${i}`, `スペシャル${i+1}`, `${emoji}をタップしてボーナス獲得！`, 'action', ['スペシャル', 'ボーナス'],
    {
      background: createBg(`bg_sp${gameNum}`, bgGradients[(10 + i) % bgGradients.length][0], bgGradients[(10 + i) % bgGradients.length][1]),
      objects: [createObj(`special${gameNum}`, name, createCircle(50, '#FFD700', '#FFA500', emoji), 120)],
      layout: [layoutPos(`special${gameNum}`, 0.5, 0.5)],
      totalSize: 750
    },
    [touchRule('r1', 'ボーナス', `special${gameNum}`, [{ type: 'success', score: 500 + i * 50 }])],
    10, 'easy'
  ));
}

// Save all games
const outputDir = path.join(__dirname, '..', 'public', 'sample-games');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

games.forEach((game, index) => {
  const filename = `${String(index + 1).padStart(3, '0')}-${game.project.name.split('').filter(c => c.charCodeAt(0) < 128).join('').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'game'}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(game, null, 2));

  if ((index + 1) % 10 === 0) {
    console.log(`✅ ${String(index + 1).padStart(3, '0')}. ${game.project.name}`);
  }
});

console.log(`\n🎉 Successfully generated ${games.length} sample games!`);
console.log(`📂 Location: ${outputDir}`);
console.log(`\n📊 Categories:`);
console.log(`   1-20:  数字ゲーム (Numbers)`);
console.log(`  21-30:  色ゲーム (Colors)`);
console.log(`  31-50:  絵文字ゲーム (Emojis)`);
console.log(`  51-60:  形ゲーム (Shapes)`);
console.log(`  61-70:  マルチタップ (Multi-tap)`);
console.log(`  71-80:  スピードゲーム (Speed)`);
console.log(`  81-90:  タイミングゲーム (Timing)`);
console.log(`  91-100: スペシャル (Special)`);
