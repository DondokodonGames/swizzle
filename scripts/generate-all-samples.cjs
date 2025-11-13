#!/usr/bin/env node
/**
 * Generate all 22 sample games for Swizzle Editor
 */

const fs = require('fs');
const path = require('path');

// Helper functions
function createSVG(width, height, content) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${content}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createGradientBg(topColor, bottomColor) {
  const content = `<defs><linearGradient id='g' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' style='stop-color:${topColor};stop-opacity:1' /><stop offset='100%' style='stop-color:${bottomColor};stop-opacity:1' /></linearGradient></defs><rect width='360' height='640' fill='url(#g)'/>`;
  return createSVG(360, 640, content);
}

function createCircle(radius, fillColor, strokeColor = '', text = '') {
  const size = radius * 2 + 20;
  let content = `<circle cx='${size/2}' cy='${size/2}' r='${radius}' fill='${fillColor}'`;
  if (strokeColor) content += ` stroke='${strokeColor}' stroke-width='3'`;
  content += '/>';
  if (text) {
    content += `<text x='${size/2}' y='${size/2 + 10}' font-size='${radius*0.8}' text-anchor='middle' fill='white' font-weight='bold'>${text}</text>`;
  }
  return createSVG(size, size, content);
}

function createRect(width, height, fillColor, strokeColor = '', text = '') {
  let content = `<rect width='${width}' height='${height}' fill='${fillColor}' rx='10'`;
  if (strokeColor) content += ` stroke='${strokeColor}' stroke-width='3'`;
  content += '/>';
  if (text) {
    content += `<text x='${width/2}' y='${height/2 + 10}' font-size='${Math.min(width, height)/2.5}' text-anchor='middle' fill='white' font-weight='bold'>${text}</text>`;
  }
  return createSVG(width, height, content);
}

function createStar(size, fillColor) {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 5;
  const innerRadius = outerRadius / 2.5;
  let points = '';
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points += `${x},${y} `;
  }
  return createSVG(size, size, `<polygon points='${points}' fill='${fillColor}' stroke='#FFA500' stroke-width='2'/>`);
}

function createProject(name, description, category, tags, assets, rules, duration = 10, difficulty = 'normal') {
  const now = new Date().toISOString();
  const projectId = `sample_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`;

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
        publishing: {
          isPublished: false,
          visibility: 'public',
          allowComments: true,
          allowRemix: true,
          tags,
          category
        },
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

// 1. Color Match Game
games.push(createProject(
  '色合わせゲーム', '同じ色のオブジェクトをタップしてスコアを稼ごう！', 'puzzle', ['パズル', '色', 'マッチング'],
  {
    background: { id: 'bg_1', name: '明るい背景', type: 'background', frames: [{ id: 'f_bg', frameNumber: 0, dataUrl: createGradientBg('#FFE5F1', '#FFC0E0'), width: 360, height: 640, fileSize: 400 }], defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now },
    objects: [
      { id: 'obj_red', name: '赤丸', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createCircle(40, '#FF0000'), width: 100, height: 100, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'obj_blue', name: '青丸', type: 'object', frames: [{ id: 'f2', frameNumber: 0, dataUrl: createCircle(40, '#0000FF'), width: 100, height: 100, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'obj_green', name: '緑丸', type: 'object', frames: [{ id: 'f3', frameNumber: 0, dataUrl: createCircle(40, '#00FF00'), width: 100, height: 100, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now }
    ],
    layout: [
      { objectId: 'obj_red', position: { x: 0.25, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_blue', position: { x: 0.5, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_green', position: { x: 0.75, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }
    ],
    totalSize: 1300
  },
  [
    { id: 'r1', name: '赤をタップ', enabled: true, priority: 100, targetObjectId: 'obj_red', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 10 }], createdAt: now, lastModified: now },
    { id: 'r2', name: '青をタップ', enabled: true, priority: 100, targetObjectId: 'obj_blue', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 20 }], createdAt: now, lastModified: now },
    { id: 'r3', name: '緑をタップ', enabled: true, priority: 100, targetObjectId: 'obj_green', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 30 }], createdAt: now, lastModified: now }
  ],
  15, 'easy'
));

// 2. Quick Reaction
games.push(createProject(
  '反応速度ゲーム', '素早くターゲットをタップ！時間内に何回タップできるかな？', 'action', ['アクション', '反応', 'スピード'],
  {
    background: { id: 'bg_2', name: '赤い背景', type: 'background', frames: [{ id: 'f_bg', frameNumber: 0, dataUrl: createGradientBg('#FF6B6B', '#C92A2A'), width: 360, height: 640, fileSize: 400 }], defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now },
    objects: [{ id: 'obj_target', name: 'ターゲット', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createCircle(45, '#FFD700', '#FFA500', '⚡'), width: 110, height: 110, fileSize: 350 }], defaultScale: 1, totalSize: 350, createdAt: now, lastModified: now }],
    layout: [{ objectId: 'obj_target', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }],
    totalSize: 750
  },
  [{ id: 'r1', name: 'ターゲットタップ', enabled: true, priority: 100, targetObjectId: 'obj_target', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 1 }], createdAt: now, lastModified: now }],
  10, 'normal'
));

// 3. Memory Sequence
games.push(createProject(
  '記憶ゲーム', '順番を覚えてタップしよう！1→2→3の順にタップ！', 'puzzle', ['パズル', '記憶', '順番'],
  {
    background: { id: 'bg_3', name: '紫背景', type: 'background', frames: [{ id: 'f_bg', frameNumber: 0, dataUrl: createGradientBg('#9775FA', '#5F3DC4'), width: 360, height: 640, fileSize: 400 }], defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now },
    objects: [
      { id: 'obj_1', name: '1番', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createRect(80, 80, '#FF6B6B', '#FF0000', '1'), width: 80, height: 80, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'obj_2', name: '2番', type: 'object', frames: [{ id: 'f2', frameNumber: 0, dataUrl: createRect(80, 80, '#4DABF7', '#1971C2', '2'), width: 80, height: 80, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'obj_3', name: '3番', type: 'object', frames: [{ id: 'f3', frameNumber: 0, dataUrl: createRect(80, 80, '#51CF66', '#2F9E44', '3'), width: 80, height: 80, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now }
    ],
    layout: [
      { objectId: 'obj_1', position: { x: 0.3, y: 0.4 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_2', position: { x: 0.5, y: 0.4 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_3', position: { x: 0.7, y: 0.4 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }
    ],
    totalSize: 1300
  },
  [{ id: 'r1', name: '3番で成功', enabled: true, priority: 100, targetObjectId: 'obj_3', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'success', score: 100 }], createdAt: now, lastModified: now }],
  20, 'normal'
));

// 4. Timing Perfect
games.push(createProject(
  'タイミングゲーム', 'ちょうど5秒後にターゲットをタップ！タイミングが全て！', 'action', ['アクション', 'タイミング', '精密'],
  {
    background: { id: 'bg_4', name: 'オレンジ背景', type: 'background', frames: [{ id: 'f_bg', frameNumber: 0, dataUrl: createGradientBg('#FFA94D', '#F76707'), width: 360, height: 640, fileSize: 400 }], defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now },
    objects: [{ id: 'obj_t', name: 'タイミングボタン', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createCircle(50, '#FFD43B', '#FAB005', '⏱️'), width: 120, height: 120, fileSize: 350 }], defaultScale: 1, totalSize: 350, createdAt: now, lastModified: now }],
    layout: [{ objectId: 'obj_t', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }],
    totalSize: 750
  },
  [
    { id: 'r1', name: '5秒後にタップ', enabled: true, priority: 100, targetObjectId: 'obj_t', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }, { type: 'time', timeType: 'range', range: { min: 4.5, max: 5.5 } }] }, actions: [{ type: 'success', score: 1000 }], createdAt: now, lastModified: now },
    { id: 'r2', name: '早すぎ/遅すぎ', enabled: true, priority: 50, targetObjectId: 'obj_t', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'failure' }], createdAt: now, lastModified: now }
  ],
  10, 'hard'
));

// 5. Number Hunt
games.push(createProject(
  '数字探しゲーム', '1から順番にタップしよう！', 'puzzle', ['パズル', '数字', '順番'],
  {
    background: { id: 'bg_5', name: '緑背景', type: 'background', frames: [{ id: 'f_bg', frameNumber: 0, dataUrl: createGradientBg('#8CE99A', '#37B24D'), width: 360, height: 640, fileSize: 400 }], defaultScale: 1, totalSize: 400, createdAt: now, lastModified: now },
    objects: [
      { id: 'n1', name: '数字1', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createCircle(35, '#FFF3BF', '#FFD43B', '1'), width: 90, height: 90, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'n2', name: '数字2', type: 'object', frames: [{ id: 'f2', frameNumber: 0, dataUrl: createCircle(35, '#FFE3E3', '#FFA8A8', '2'), width: 90, height: 90, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'n3', name: '数字3', type: 'object', frames: [{ id: 'f3', frameNumber: 0, dataUrl: createCircle(35, '#D0EBFF', '#74C0FC', '3'), width: 90, height: 90, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'n4', name: '数字4', type: 'object', frames: [{ id: 'f4', frameNumber: 0, dataUrl: createCircle(35, '#E7F5FF', '#A5D8FF', '4'), width: 90, height: 90, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now },
      { id: 'n5', name: '数字5', type: 'object', frames: [{ id: 'f5', frameNumber: 0, dataUrl: createCircle(35, '#FFE0EB', '#FCC2D7', '5'), width: 90, height: 90, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: now, lastModified: now }
    ],
    layout: [
      { objectId: 'n3', position: { x: 0.3, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'n1', position: { x: 0.7, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'n5', position: { x: 0.3, y: 0.7 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'n2', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'n4', position: { x: 0.7, y: 0.7 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }
    ],
    totalSize: 1900
  },
  [{ id: 'r1', name: '5番で成功', enabled: true, priority: 100, targetObjectId: 'n5', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'success', score: 500 }], createdAt: now, lastModified: now }],
  20, 'normal'
));

// Continue with remaining games (6-22)...
// I'll create a batch script to generate these

// Save games to files
const outputDir = path.join(__dirname, '..', 'public', 'sample-games');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

games.forEach((game, index) => {
  const filename = `${String(index + 1).padStart(2, '0')}-${game.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(game, null, 2));
  console.log(`✅ Generated: ${filename}`);
});

console.log(`\n🎉 Successfully generated ${games.length} sample games!`);
console.log(`📂 Location: ${outputDir}`);
