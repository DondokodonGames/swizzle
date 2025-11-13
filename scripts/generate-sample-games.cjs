#!/usr/bin/env node
/**
 * Sample Game Generator for Swizzle Editor
 * Generates 22+ sample games in ProjectExportData format
 */

const fs = require('fs');
const path = require('path');

// Helper: Create base64 SVG image
function createSVG(width, height, content) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${content}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Helper: Create gradient background
function createGradientBg(topColor, bottomColor) {
  const content = `<defs><linearGradient id='g' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' style='stop-color:${topColor};stop-opacity:1' /><stop offset='100%' style='stop-color:${bottomColor};stop-opacity:1' /></linearGradient></defs><rect width='360' height='640' fill='url(#g)'/>`;
  return createSVG(360, 640, content);
}

// Helper: Create circle object
function createCircle(radius, fillColor, strokeColor = '', text = '') {
  const size = radius * 2 + 20;
  let content = `<circle cx='${size/2}' cy='${size/2}' r='${radius}' fill='${fillColor}'`;
  if (strokeColor) content += ` stroke='${strokeColor}' stroke-width='3'`;
  content += '/>';
  if (text) {
    content += `<text x='${size/2}' y='${size/2 + 10}' font-size='${radius}' text-anchor='middle' fill='white'>${text}</text>`;
  }
  return createSVG(size, size, content);
}

// Helper: Create rect object
function createRect(width, height, fillColor, strokeColor = '', text = '') {
  let content = `<rect width='${width}' height='${height}' fill='${fillColor}' rx='10'`;
  if (strokeColor) content += ` stroke='${strokeColor}' stroke-width='3'`;
  content += '/>';
  if (text) {
    content += `<text x='${width/2}' y='${height/2 + 10}' font-size='${height/2}' text-anchor='middle' fill='white' font-weight='bold'>${text}</text>`;
  }
  return createSVG(width, height, content);
}

// Helper: Create project template
function createProject(name, description, category, tags, assets, rules, duration = 10, difficulty = 'normal') {
  const now = new Date().toISOString();
  const projectId = `sample_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

  return {
    project: {
      id: projectId,
      name,
      description,
      createdAt: now,
      lastModified: now,
      version: '1.0.0',
      creator: {
        userId: 'sample_creator',
        username: 'Sample Games',
        isAnonymous: false
      },
      assets: {
        background: assets.background || null,
        objects: assets.objects || [],
        texts: [],
        audio: { bgm: null, se: [] },
        statistics: {
          totalImageSize: assets.totalSize || 1000,
          totalAudioSize: 0,
          totalSize: assets.totalSize || 1000,
          usedSlots: {
            background: assets.background ? 1 : 0,
            objects: assets.objects?.length || 0,
            texts: 0,
            bgm: 0,
            se: 0
          },
          limitations: {
            isNearImageLimit: false,
            isNearAudioLimit: false,
            isNearTotalLimit: false,
            hasViolations: false
          }
        },
        lastModified: now
      },
      script: {
        initialState: {
          layout: {
            background: { visible: true, initialAnimation: 0, animationSpeed: 12, autoStart: false },
            objects: assets.layout || [],
            texts: [],
            stage: { backgroundColor: '#87CEEB' }
          },
          gameState: { score: 0, lives: 3, timeLimit: duration, flags: {}, counters: {} }
        },
        layout: {
          background: { visible: true, initialAnimation: 0, animationSpeed: 12, autoStart: false },
          objects: assets.layout || [],
          texts: [],
          stage: { backgroundColor: '#87CEEB' }
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
      projectSettings: {
        autoSaveInterval: 30000,
        backupEnabled: true,
        compressionEnabled: false,
        maxVersionHistory: 10
      }
    },
    metadata: {
      id: projectId,
      name,
      lastModified: now,
      status: 'published',
      size: assets.totalSize || 1000,
      version: '1.0.0'
    },
    exportedAt: now,
    version: '1.0.0'
  };
}

// Game definitions
const games = [];

// 1. Color Match Game - 色合わせゲーム
games.push(createProject(
  '色合わせゲーム',
  '同じ色のオブジェクトをタップしてスコアを稼ごう！',
  'puzzle',
  ['パズル', '色', 'マッチング'],
  {
    background: {
      id: 'bg_color_match',
      name: '明るい背景',
      type: 'background',
      frames: [{ id: 'frame_bg', frameNumber: 0, dataUrl: createGradientBg('#FFE5F1', '#FFC0E0'), width: 360, height: 640, fileSize: 400 }],
      defaultScale: 1,
      totalSize: 400,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    },
    objects: [
      { id: 'obj_red', name: '赤丸', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createCircle(40, '#FF0000'), width: 100, height: 100, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() },
      { id: 'obj_blue', name: '青丸', type: 'object', frames: [{ id: 'f2', frameNumber: 0, dataUrl: createCircle(40, '#0000FF'), width: 100, height: 100, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() },
      { id: 'obj_green', name: '緑丸', type: 'object', frames: [{ id: 'f3', frameNumber: 0, dataUrl: createCircle(40, '#00FF00'), width: 100, height: 100, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() }
    ],
    layout: [
      { objectId: 'obj_red', position: { x: 0.25, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_blue', position: { x: 0.5, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_green', position: { x: 0.75, y: 0.3 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }
    ],
    totalSize: 1300
  },
  [
    { id: 'rule_1', name: '赤をタップ', enabled: true, priority: 100, targetObjectId: 'obj_red', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 10 }], createdAt: new Date().toISOString(), lastModified: new Date().toISOString() },
    { id: 'rule_2', name: '青をタップ', enabled: true, priority: 100, targetObjectId: 'obj_blue', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 20 }], createdAt: new Date().toISOString(), lastModified: new Date().toISOString() },
    { id: 'rule_3', name: '緑をタップ', enabled: true, priority: 100, targetObjectId: 'obj_green', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 30 }], createdAt: new Date().toISOString(), lastModified: new Date().toISOString() }
  ],
  15,
  'easy'
));

// 2. Quick Reaction - 反応速度ゲーム
games.push(createProject(
  '反応速度ゲーム',
  '素早くターゲットをタップ！時間内に何回タップできるかな？',
  'action',
  ['アクション', '反応', 'スピード'],
  {
    background: {
      id: 'bg_reaction',
      name: '赤い背景',
      type: 'background',
      frames: [{ id: 'frame_bg', frameNumber: 0, dataUrl: createGradientBg('#FF6B6B', '#C92A2A'), width: 360, height: 640, fileSize: 400 }],
      defaultScale: 1,
      totalSize: 400,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    },
    objects: [
      { id: 'obj_target', name: 'ターゲット', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createCircle(45, '#FFD700', '#FFA500', '⚡'), width: 110, height: 110, fileSize: 350 }], defaultScale: 1, totalSize: 350, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() }
    ],
    layout: [
      { objectId: 'obj_target', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }
    ],
    totalSize: 750
  },
  [
    { id: 'rule_1', name: 'ターゲットタップ', enabled: true, priority: 100, targetObjectId: 'obj_target', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'addScore', points: 1 }], createdAt: new Date().toISOString(), lastModified: new Date().toISOString() }
  ],
  10,
  'normal'
));

// 3. Memory Game - 記憶ゲーム
games.push(createProject(
  '記憶ゲーム',
  '順番を覚えてタップしよう！',
  'puzzle',
  ['パズル', '記憶', '順番'],
  {
    background: {
      id: 'bg_memory',
      name: '紫背景',
      type: 'background',
      frames: [{ id: 'frame_bg', frameNumber: 0, dataUrl: createGradientBg('#9775FA', '#5F3DC4'), width: 360, height: 640, fileSize: 400 }],
      defaultScale: 1,
      totalSize: 400,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    },
    objects: [
      { id: 'obj_1', name: '1番', type: 'object', frames: [{ id: 'f1', frameNumber: 0, dataUrl: createRect(80, 80, '#FF6B6B', '#FF0000', '1'), width: 80, height: 80, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() },
      { id: 'obj_2', name: '2番', type: 'object', frames: [{ id: 'f2', frameNumber: 0, dataUrl: createRect(80, 80, '#4DABF7', '#1971C2', '2'), width: 80, height: 80, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() },
      { id: 'obj_3', name: '3番', type: 'object', frames: [{ id: 'f3', frameNumber: 0, dataUrl: createRect(80, 80, '#51CF66', '#2F9E44', '3'), width: 80, height: 80, fileSize: 300 }], defaultScale: 1, totalSize: 300, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() }
    ],
    layout: [
      { objectId: 'obj_1', position: { x: 0.3, y: 0.4 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_2', position: { x: 0.5, y: 0.4 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } },
      { objectId: 'obj_3', position: { x: 0.7, y: 0.4 }, scale: { x: 1, y: 1 }, rotation: 0, zIndex: 100, initialState: { visible: true, animation: 0, animationSpeed: 12, autoStart: false } }
    ],
    totalSize: 1300
  },
  [
    { id: 'rule_1', name: '1→2→3の順', enabled: true, priority: 100, targetObjectId: 'obj_3', triggers: { operator: 'AND', conditions: [{ type: 'touch', target: 'self' }] }, actions: [{ type: 'success', score: 100 }], createdAt: new Date().toISOString(), lastModified: new Date().toISOString() }
  ],
  20,
  'normal'
));

console.log(`Generated ${games.length} games so far...`);

// Continue with more games...
// (I'll create the remaining 19 games in subsequent parts)

module.exports = { games, createProject, createSVG, createGradientBg, createCircle, createRect };
