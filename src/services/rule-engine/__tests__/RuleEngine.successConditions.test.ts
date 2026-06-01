import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../RuleEngine';
import { RuleExecutionContext, GameObject } from '../types';
import { GameRule, SuccessCondition } from '../../../types/editor/GameScript';
import { GameCounter } from '../../../types/counterTypes';

function makeContext(overrides: Partial<RuleExecutionContext> = {}): RuleExecutionContext {
  return {
    gameState: { isPlaying: true, isPaused: false, score: 0, timeElapsed: 0, flags: new Map(), counters: new Map() },
    objects: new Map(),
    events: [],
    canvas: { width: 1080, height: 1920 },
    ...overrides,
  };
}

function makeObject(id: string, visible: boolean): GameObject {
  return { id, x: 0, y: 0, width: 100, height: 100, visible, animationIndex: 0, animationPlaying: false, scale: 1, rotation: 0 };
}

function alwaysRule(id: string, actions: GameRule['actions']): GameRule {
  return {
    id, name: id, enabled: true, priority: 50, targetObjectId: 'stage',
    triggers: { operator: 'AND', conditions: [] }, actions, createdAt: '', lastModified: '',
  };
}

function sc(conditions: SuccessCondition['conditions'], operator: 'AND' | 'OR' = 'AND'): SuccessCondition[] {
  return [{ id: 'win', name: 'win', operator, conditions }];
}

describe('RuleEngine.evaluateSuccessConditions', () => {
  it('successConditions が未指定なら null', () => {
    const engine = new RuleEngine();
    expect(engine.evaluateSuccessConditions(undefined, makeContext())).toBeNull();
    expect(engine.evaluateSuccessConditions([], makeContext())).toBeNull();
  });

  it('counter 条件: CounterManager の値で判定される', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition({ id: 'popped', name: 'popped', initialValue: 3, currentValue: 3, min: 0, max: 9999, persistence: 'game', createdAt: '', lastModified: '' } as GameCounter);
    const ctx = makeContext();
    const conds = sc([{ type: 'counter', counterName: 'popped', counterComparison: 'greaterOrEqual', counterValue: 3 }]);
    expect(engine.evaluateSuccessConditions(conds, ctx)).not.toBeNull();

    const failConds = sc([{ type: 'counter', counterName: 'popped', counterComparison: 'greaterOrEqual', counterValue: 4 }]);
    expect(engine.evaluateSuccessConditions(failConds, ctx)).toBeNull();
  });

  it('flag 条件: FlagManager の値で判定される', () => {
    const engine = new RuleEngine();
    engine.setFlag('cleared', true);
    const ctx = makeContext();
    expect(engine.evaluateSuccessConditions(sc([{ type: 'flag', flagId: 'cleared', flagValue: true }]), ctx)).not.toBeNull();
    expect(engine.evaluateSuccessConditions(sc([{ type: 'flag', flagId: 'cleared', flagValue: false }]), ctx)).toBeNull();
  });

  it('score / time 条件: gameState の値で判定される', () => {
    const engine = new RuleEngine();
    const ctx = makeContext({ gameState: { isPlaying: true, isPaused: false, score: 10, timeElapsed: 5, flags: new Map(), counters: new Map() } });
    expect(engine.evaluateSuccessConditions(sc([{ type: 'score', scoreComparison: '>=', scoreValue: 10 }]), ctx)).not.toBeNull();
    expect(engine.evaluateSuccessConditions(sc([{ type: 'time', timeComparison: '>=', timeValue: 6 }]), ctx)).toBeNull();
  });

  it('objectState 条件: 可視状態で判定される', () => {
    const engine = new RuleEngine();
    const objects = new Map<string, GameObject>([['goal', makeObject('goal', false)]]);
    const ctx = makeContext({ objects });
    expect(engine.evaluateSuccessConditions(sc([{ type: 'objectState', objectId: 'goal', objectCondition: 'hidden' }]), ctx)).not.toBeNull();
    expect(engine.evaluateSuccessConditions(sc([{ type: 'objectState', objectId: 'goal', objectCondition: 'visible' }]), ctx)).toBeNull();
  });

  it('AND / OR 演算子が機能する', () => {
    const engine = new RuleEngine();
    engine.setFlag('a', true);
    const ctx = makeContext({ gameState: { isPlaying: true, isPaused: false, score: 0, timeElapsed: 0, flags: new Map(), counters: new Map() } });
    const mixed: SuccessCondition['conditions'] = [
      { type: 'flag', flagId: 'a', flagValue: true },
      { type: 'flag', flagId: 'b', flagValue: true }, // b は false
    ];
    expect(engine.evaluateSuccessConditions(sc(mixed, 'AND'), ctx)).toBeNull();
    expect(engine.evaluateSuccessConditions(sc(mixed, 'OR'), ctx)).not.toBeNull();
  });
});

describe('pause / restart アクション', () => {
  it('pause アクションで isPaused と pauseUntil が設定される', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('p', [{ type: 'pause', duration: 2 }]));
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.isPaused).toBe(true);
    expect(ctx.gameState.pauseUntil).toBeGreaterThan(Date.now());
  });

  it('restart アクションで pendingRestart が設定される', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('r', [{ type: 'restart' }]));
    const ctx = makeContext();
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.pendingRestart).toBe(true);
  });
});

describe('always 条件', () => {
  it('always 条件は常に true として評価される', () => {
    const engine = new RuleEngine();
    engine.addRule({
      id: 'a', name: 'a', enabled: true, priority: 50, targetObjectId: 'stage',
      triggers: { operator: 'AND', conditions: [{ type: 'always' }] },
      actions: [{ type: 'addScore', points: 5 }], createdAt: '', lastModified: '',
    });
    const ctx = makeContext();
    const results = engine.evaluateAndExecuteRules(ctx);
    expect(results.length).toBe(1);
    expect(ctx.gameState.score).toBe(5);
  });
});
