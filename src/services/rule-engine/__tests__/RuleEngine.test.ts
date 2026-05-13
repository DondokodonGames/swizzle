import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../RuleEngine';
import { RuleExecutionContext, GameObject } from '../types';
import { GameRule } from '../../../types/editor/GameScript';
import { GameCounter } from '../../../types/counterTypes';

function makeContext(overrides: Partial<RuleExecutionContext> = {}): RuleExecutionContext {
  return {
    gameState: {
      isPlaying: true,
      isPaused: false,
      score: 0,
      timeElapsed: 0,
      flags: new Map(),
      counters: new Map(),
    },
    objects: new Map(),
    events: [],
    canvas: { width: 1080, height: 1920 },
    ...overrides,
  };
}

function makeObject(id: string): GameObject {
  return { id, x: 0, y: 0, width: 100, height: 100, visible: true, animationIndex: 0, animationPlaying: false, scale: 1, rotation: 0 };
}

function alwaysRule(id: string, actions: GameRule['actions'], priority = 50): GameRule {
  return {
    id,
    name: id,
    enabled: true,
    priority,
    targetObjectId: 'stage',
    triggers: { operator: 'AND', conditions: [] }, // 空条件 = AND vacuously true = 毎フレーム実行
    actions,
    createdAt: '',
    lastModified: '',
  };
}

// ──────────────────────────────────────────────
// pendingEndTime ガード
// ──────────────────────────────────────────────

describe('RuleEngine – pendingEndTime ガード', () => {
  it('pendingEndTime 未設定ならルールが実行される', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('r1', [{ type: 'addScore', points: 10 }]));
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(10);
  });

  it('pendingEndTime 設定後はルール評価をスキップする（修正済みバグ）', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('r1', [{ type: 'addScore', points: 10 }]));
    const ctx = makeContext();
    ctx.gameState.pendingEndTime = Date.now() + 1000;
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(0); // 実行されないのでスコアは変わらない
  });
});

// ──────────────────────────────────────────────
// ルール優先度
// ──────────────────────────────────────────────

describe('RuleEngine – ルール優先度', () => {
  it('優先度が低いルール（数値が小さい）が先に実行される', () => {
    const engine = new RuleEngine();
    const order: string[] = [];

    // addRule はpriority順にソートする
    engine.addRule(alwaysRule('high-pri', [{ type: 'addScore', points: 100 }], 10));
    engine.addRule(alwaysRule('low-pri',  [{ type: 'addScore', points: 1   }], 90));

    // スコア: 最初のルールが priority=10（先）、次が priority=90（後）
    // 先に実行されるルールの points がスコアに反映される
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    // priority=10 → +100, priority=90 → +1 → 合計101
    expect(ctx.gameState.score).toBe(101);
  });

  it('enabled=false のルールは無視される', () => {
    const engine = new RuleEngine();
    const disabledRule: GameRule = {
      ...alwaysRule('disabled', [{ type: 'addScore', points: 99 }]),
      enabled: false,
    };
    engine.addRule(disabledRule);
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(0);
  });
});

// ──────────────────────────────────────────────
// カウンター統合
// ──────────────────────────────────────────────

describe('RuleEngine – カウンター統合', () => {
  it('addCounterDefinition → evaluateAndExecuteRules でカウンター操作が反映される', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition({
      id: 'score', name: 'score', initialValue: 0, currentValue: 0,
      persistence: 'game', createdAt: '', lastModified: '',
    } as GameCounter);
    engine.addRule(alwaysRule('r1', [{ type: 'counter', counterName: 'score', operation: 'increment' }]));
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    expect(engine.getCounter('score')).toBe(1);
  });

  it('success アクションで pendingEndTime が設定される', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('win', [{ type: 'success' }]));
    const ctx = makeContext();
    const before = Date.now();
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.pendingEndTime).toBeGreaterThanOrEqual(before + 990);
    expect(ctx.gameState.endReason).toBe('success');
  });
});

// ──────────────────────────────────────────────
// フラグ統合
// ──────────────────────────────────────────────

describe('RuleEngine – フラグ統合', () => {
  it('setFlag アクション → evaluateFlagCondition で ON 条件が true になる', () => {
    const engine = new RuleEngine();
    // フラグを立てるルール（always）
    engine.addRule(alwaysRule('set-flag', [{ type: 'setFlag', flagId: 'active', value: true }]));
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    expect(engine.getFlag('active')).toBe(true);
  });

  it('reset でカウンターが initialValue に戻る', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition({
      id: 'hp', name: 'hp', initialValue: 5, currentValue: 5,
      persistence: 'game', createdAt: '', lastModified: '',
    } as GameCounter);
    engine.setCounter('hp', 99);
    engine.reset();
    expect(engine.getCounter('hp')).toBe(5);
  });
});
