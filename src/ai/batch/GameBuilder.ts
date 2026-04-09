/**
 * GameBuilder.ts
 * Swizzle仕様準拠のゲームJSONをコードから生成するビルダー
 */

export interface ObjectDef {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  defaultScale?: number;
  position: { x: number; y: number };
  visible?: boolean;
  zIndex?: number;
}

export interface CounterDef {
  id: string;
  name: string;
  initialValue?: number;
  minValue?: number;
  maxValue?: number;
}

export interface RuleDef {
  id: string;
  name: string;
  targetObjectId: string;
  priority?: number;
  conditions: any[];
  conditionOperator?: 'AND' | 'OR';
  actions: any[];
}

export interface GameConfig {
  id: string;
  title: string;
  description: string;
  category: 'arcade' | 'bar';
  duration: number;
  difficulty: 'easy' | 'normal' | 'hard';
  backgroundColor: string;
  objects: ObjectDef[];
  counters: CounterDef[];
  rules: RuleDef[];
  tags?: string[];
}

const ISO_NOW = new Date().toISOString();

function makeInitialStateObjects(objects: ObjectDef[]) {
  return objects.map(o => ({
    id: o.id,
    position: o.position,
    visible: o.visible ?? true,
    scale: { x: o.defaultScale ?? 2.0, y: o.defaultScale ?? 2.0 },
    rotation: 0,
    zIndex: o.zIndex ?? 1,
    animationIndex: 0,
    animationSpeed: 12,
    autoStart: false,
  }));
}

function makeLayoutObjects(objects: ObjectDef[]) {
  return objects.map(o => ({
    objectId: o.id,
    position: o.position,
    scale: { x: o.defaultScale ?? 2.0, y: o.defaultScale ?? 2.0 },
    rotation: 0,
    zIndex: o.zIndex ?? 1,
    initialState: { visible: o.visible ?? true, animation: 0, animationSpeed: 12, autoStart: false },
  }));
}

function makeAssetObject(o: ObjectDef) {
  return {
    id: o.id,
    name: o.name,
    frames: [{
      id: `${o.id}-frame-1`,
      dataUrl: o.dataUrl,
      originalName: `${o.id}.svg`,
      width: o.width,
      height: o.height,
      size: o.dataUrl.length,
    }],
    animationSettings: { speed: 12, loop: true, autoPlay: false },
    totalSize: o.dataUrl.length,
    createdAt: ISO_NOW,
    lastModified: ISO_NOW,
    defaultScale: o.defaultScale ?? 2.0,
  };
}

function makeGameRule(r: RuleDef) {
  return {
    id: r.id,
    name: r.name,
    enabled: true,
    priority: r.priority ?? 1,
    targetObjectId: r.targetObjectId,
    triggers: {
      operator: r.conditionOperator ?? 'AND',
      conditions: r.conditions,
    },
    actions: r.actions,
  };
}

export function buildGame(cfg: GameConfig): object {
  const now = ISO_NOW;
  const assetSize = cfg.objects.reduce((s, o) => s + o.dataUrl.length, 0);

  return {
    project: {
      id: cfg.id,
      name: cfg.title,
      description: cfg.description,
      createdAt: now,
      lastModified: now,
      version: '1.0.0',
      creator: { isAnonymous: true },
      status: 'draft',
      totalSize: assetSize,
      assets: {
        background: null,
        objects: cfg.objects.map(makeAssetObject),
        texts: [],
        audio: { bgm: null, se: [] },
        statistics: {
          totalImageSize: assetSize,
          totalAudioSize: 0,
          totalSize: assetSize,
          usedSlots: { background: 0, objects: cfg.objects.length, texts: 0, bgm: 0, se: 0 },
          limitations: { isNearImageLimit: false, isNearAudioLimit: false, isNearTotalLimit: false, hasViolations: false },
        },
        lastModified: now,
      },
      script: {
        initialState: {
          layout: {
            background: { visible: false, frameIndex: 0, animationSpeed: 12, autoStart: false },
            objects: makeInitialStateObjects(cfg.objects),
            texts: [],
          },
          gameState: {
            score: 0,
            counters: Object.fromEntries(cfg.counters.map(c => [c.id, c.initialValue ?? 0])),
            flags: {},
          },
        },
        layout: {
          background: { visible: false, initialAnimation: 0, animationSpeed: 12, autoStart: false },
          objects: makeLayoutObjects(cfg.objects),
          texts: [],
          stage: { backgroundColor: cfg.backgroundColor },
        },
        flags: [],
        counters: cfg.counters.map(c => ({
          id: c.id,
          name: c.name,
          initialValue: c.initialValue ?? 0,
          minValue: c.minValue ?? 0,
          maxValue: c.maxValue ?? 9999,
        })),
        rules: cfg.rules.map(makeGameRule),
        successConditions: [],
        statistics: {
          totalRules: cfg.rules.length,
          totalConditions: cfg.rules.reduce((s, r) => s + r.conditions.length, 0),
          totalActions: cfg.rules.reduce((s, r) => s + r.actions.length, 0),
          complexityScore: cfg.rules.length * 2,
          usedTriggerTypes: [...new Set(cfg.rules.flatMap(r => r.conditions.map((c: any) => c.type)))],
          usedActionTypes: [...new Set(cfg.rules.flatMap(r => r.actions.map((a: any) => a.type)))],
          flagCount: 0,
          estimatedCPUUsage: 'low',
          estimatedMemoryUsage: 0,
          maxConcurrentEffects: 2,
          counterCount: cfg.counters.length,
          usedCounterOperations: ['add'],
          usedCounterComparisons: ['greaterOrEqual'],
          randomConditionCount: 0,
          randomActionCount: 0,
          totalRandomChoices: 0,
          averageRandomProbability: 0,
          randomEventsPerSecond: 0,
          randomMemoryUsage: 0,
        },
        version: '1.0.0',
        lastModified: now,
      },
      settings: {
        name: cfg.title,
        description: cfg.description,
        duration: { type: 'fixed', seconds: cfg.duration },
        difficulty: cfg.difficulty,
        publishing: {
          isPublished: false,
          visibility: 'private',
          allowComments: true,
          allowRemix: false,
          tags: cfg.tags ?? [],
          category: 'action',
        },
        preview: {},
        export: { includeSourceData: true, compressionLevel: 'medium', format: 'json' },
      },
      editorState: {
        activeTab: 'assets',
        lastSaved: now,
        autoSaveEnabled: true,
        tabStates: {
          assets: { selectedAssetType: null, selectedAssetId: null, showAnimationEditor: false },
          script: { mode: 'layout', selectedObjectId: null, selectedRuleId: null, showRuleEditor: false },
          settings: { showTestPlay: false, lastTestResult: null },
        },
        ui: { sidebarCollapsed: false, previewVisible: true, capacityMeterExpanded: false },
      },
      metadata: {
        statistics: { totalEditTime: 0, saveCount: 0, testPlayCount: 0, publishCount: 0 },
        usage: { lastOpened: now, totalOpenCount: 1, averageSessionTime: 0 },
        performance: { lastBuildTime: 0, averageFPS: 60, memoryUsage: 0 },
      },
      versionHistory: [],
      projectSettings: {
        autoSaveInterval: 30000,
        backupEnabled: true,
        compressionEnabled: false,
        maxVersionHistory: 10,
      },
    },
    exportedAt: now,
    version: '1.0.0',
  };
}
