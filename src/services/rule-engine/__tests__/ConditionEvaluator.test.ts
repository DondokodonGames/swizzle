import { describe, it, expect, beforeEach } from 'vitest';
import { ConditionEvaluator } from '../ConditionEvaluator';
import { FlagManager } from '../FlagManager';
import { CounterManager } from '../CounterManager';
import { CollisionDetector } from '../CollisionDetector';
import { RuleExecutionContext } from '../types';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

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

function makeTouchEvent(data: Record<string, unknown>) {
  return { type: 'touch', timestamp: Date.now(), data };
}

function makeEvaluator() {
  const flagManager = new FlagManager();
  const counterManager = new CounterManager();
  const collisionDetector = new CollisionDetector();
  return new ConditionEvaluator(flagManager, counterManager, collisionDetector);
}

// ────────────────────────────────────────────────────────────
// Touch: down / up
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – touch down/up', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  it('down: matches when touchType and target match', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'obj1', x: 100, y: 200 })],
    });
    const result = ev.evaluateCondition(
      { type: 'touch', touchType: 'down', target: 'self' },
      ctx,
      'obj1',
    );
    expect(result).toBe(true);
  });

  it('down: no match when touchType differs', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'up', target: 'obj1', x: 100, y: 200 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'down', target: 'self' },
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('up: matches on self', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'up', target: 'obj1', x: 0, y: 0 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'up', target: 'self' },
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('down: matches stage touch', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'stage', x: 0, y: 0 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'down', target: 'stage' },
      ctx,
      'anything',
    )).toBe(true);
  });

  it('down: no match when object id differs', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'other', x: 0, y: 0 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'down', target: 'self' },
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('returns false when there are no touch events', () => {
    const ctx = makeContext({ events: [] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'down', target: 'self' },
      ctx,
      'obj1',
    )).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Touch: down with region (stage)
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – touch down with stage region', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  it('rect region: hit inside', () => {
    // canvas 1080x1920; region 0,0 with 0.5x0.5 → 0..540, 0..960
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'stage', x: 100, y: 100 })],
    });
    expect(ev.evaluateCondition(
      {
        type: 'touch', touchType: 'down', target: 'stage',
        region: { shape: 'rect', x: 0, y: 0, width: 0.5, height: 0.5 },
      } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('rect region: miss outside', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'stage', x: 600, y: 100 })],
    });
    expect(ev.evaluateCondition(
      {
        type: 'touch', touchType: 'down', target: 'stage',
        region: { shape: 'rect', x: 0, y: 0, width: 0.5, height: 0.5 },
      } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('circle region: hit inside', () => {
    // center (0.5, 0.5) → (540, 960), radius 0.2 * 1080 = 216
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'stage', x: 540, y: 960 })],
    });
    expect(ev.evaluateCondition(
      {
        type: 'touch', touchType: 'down', target: 'stage',
        region: { shape: 'circle', x: 0.5, y: 0.5, radius: 0.2 },
      } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('circle region: miss outside', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'stage', x: 0, y: 0 })],
    });
    expect(ev.evaluateCondition(
      {
        type: 'touch', touchType: 'down', target: 'stage',
        region: { shape: 'circle', x: 0.5, y: 0.5, radius: 0.2 },
      } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Touch: hold
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – touch hold', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  it('matches when holdState is complete and duration >= threshold', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({
        type: 'hold', touchType: 'hold', target: 'obj1',
        currentDuration: 1200, holdState: 'complete',
      })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'hold', target: 'self', holdDuration: 1000 },
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('no match when holdState is progress (not yet complete)', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({
        type: 'hold', touchType: 'hold', target: 'obj1',
        currentDuration: 500, holdState: 'progress',
      })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'hold', target: 'self', holdDuration: 1000 },
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('checkProgress: matches when progress >= threshold', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({
        type: 'hold', touchType: 'hold', target: 'obj1',
        currentDuration: 800, holdState: 'progress',
      })],
    });
    expect(ev.evaluateCondition(
      {
        type: 'touch', touchType: 'hold', target: 'self',
        holdDuration: 1000, checkProgress: true, progressThreshold: 0.7,
      } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('checkProgress: no match when progress < threshold', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({
        type: 'hold', touchType: 'hold', target: 'obj1',
        currentDuration: 400, holdState: 'progress',
      })],
    });
    expect(ev.evaluateCondition(
      {
        type: 'touch', touchType: 'hold', target: 'self',
        holdDuration: 1000, checkProgress: true, progressThreshold: 0.7,
      } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('no match when target differs', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({
        type: 'hold', touchType: 'hold', target: 'other',
        currentDuration: 1200, holdState: 'complete',
      })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'hold', target: 'self', holdDuration: 1000 },
      ctx,
      'obj1',
    )).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Touch: swipe
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – touch swipe', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  function swipeEvent(overrides: Record<string, unknown> = {}) {
    return makeTouchEvent({
      type: 'swipe', touchType: 'swipe', target: 'stage',
      distance: 200, duration: 300, velocity: 600, direction: 'right',
      ...overrides,
    });
  }

  it('matches with valid swipe params', () => {
    const ctx = makeContext({ events: [swipeEvent()] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('no match when distance < minDistance', () => {
    const ctx = makeContext({ events: [swipeEvent({ distance: 50 })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe', minDistance: 100 } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('no match when duration > maxDuration', () => {
    const ctx = makeContext({ events: [swipeEvent({ duration: 600 })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe', maxDuration: 500 } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('no match when velocity < minVelocity', () => {
    const ctx = makeContext({ events: [swipeEvent({ velocity: 300 })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe', minVelocity: 500 } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('matches specific direction', () => {
    const ctx = makeContext({ events: [swipeEvent({ direction: 'up' })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe', direction: 'up' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('no match for wrong direction', () => {
    const ctx = makeContext({ events: [swipeEvent({ direction: 'right' })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe', direction: 'up' } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('"any" direction matches regardless', () => {
    const ctx = makeContext({ events: [swipeEvent({ direction: 'left' })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'swipe', direction: 'any' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// Touch: flick
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – touch flick', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  function flickEvent(overrides: Record<string, unknown> = {}) {
    return makeTouchEvent({
      type: 'flick', touchType: 'flick', target: 'stage',
      distance: 80, duration: 100, velocity: 1200, direction: 'up',
      ...overrides,
    });
  }

  it('matches valid flick', () => {
    const ctx = makeContext({ events: [flickEvent()] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'flick' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('no match when velocity < minVelocity', () => {
    const ctx = makeContext({ events: [flickEvent({ velocity: 800 })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'flick', minVelocity: 1000 } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('no match when distance > maxDistance', () => {
    const ctx = makeContext({ events: [flickEvent({ distance: 200 })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'flick', maxDistance: 150 } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('no match when duration > maxDuration', () => {
    const ctx = makeContext({ events: [flickEvent({ duration: 300 })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'flick', maxDuration: 200 } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });

  it('direction filter works', () => {
    const ctx = makeContext({ events: [flickEvent({ direction: 'right' })] });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'flick', direction: 'up' } as any,
      ctx,
      'obj1',
    )).toBe(false);
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'flick', direction: 'right' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// Touch: drag
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – touch drag', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  it('matches drag start', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ type: 'drag', touchType: 'drag', dragState: 'start', target: 'obj1', x: 0, y: 0 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'drag', dragType: 'start', target: 'self' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('matches drag dragging', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ type: 'drag', touchType: 'drag', dragState: 'dragging', target: 'obj1', x: 10, y: 10 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'drag', dragType: 'dragging', target: 'self' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('matches drag end', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ type: 'drag', touchType: 'drag', dragState: 'end', target: 'obj1', x: 50, y: 50 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'drag', dragType: 'end', target: 'self' } as any,
      ctx,
      'obj1',
    )).toBe(true);
  });

  it('no match when target differs', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ type: 'drag', touchType: 'drag', dragState: 'start', target: 'other', x: 0, y: 0 })],
    });
    expect(ev.evaluateCondition(
      { type: 'touch', touchType: 'drag', dragType: 'start', target: 'self' } as any,
      ctx,
      'obj1',
    )).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Multiple rules can react to the same tap (no consumed-events block)
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – multiple rules on same tap', () => {
  it('two separate evaluators (rules) both match the same down event', () => {
    const ev1 = makeEvaluator();
    const ev2 = makeEvaluator();
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'obj1', x: 0, y: 0 })],
    });
    const condition = { type: 'touch' as const, touchType: 'down' as const, target: 'self' };

    const r1 = ev1.evaluateCondition(condition, ctx, 'obj1');
    const r2 = ev2.evaluateCondition(condition, ctx, 'obj1');

    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });

  it('same evaluator evaluates same event twice (different rules, same context)', () => {
    const ev = makeEvaluator();
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'obj1', x: 0, y: 0 })],
    });
    const condition = { type: 'touch' as const, touchType: 'down' as const, target: 'self' };

    expect(ev.evaluateCondition(condition, ctx, 'obj1')).toBe(true);
    // Calling again simulates a second rule evaluating the same context
    expect(ev.evaluateCondition(condition, ctx, 'obj1')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// Counter conditions
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – counter conditions', () => {
  let ev: ConditionEvaluator;
  let counterManager: CounterManager;

  beforeEach(() => {
    const flagManager = new FlagManager();
    counterManager = new CounterManager();
    const collisionDetector = new CollisionDetector();
    ev = new ConditionEvaluator(flagManager, counterManager, collisionDetector);

    counterManager.addCounterDefinition({
      id: 'score',
      name: 'score',
      initialValue: 0,
      currentValue: 0,
      min: 0,
      max: 999,
      persistence: 'game',
      createdAt: '',
      lastModified: '',
    });
  });

  function ctx() { return makeContext(); }

  it('equals: true when value matches', () => {
    counterManager.setCounter('score', 5);
    expect(ev.evaluateCondition(
      { type: 'counter', counterName: 'score', comparison: 'equals', value: 5 } as any,
      ctx(), 'obj',
    )).toBe(true);
  });

  it('equals: false when value differs', () => {
    counterManager.setCounter('score', 3);
    expect(ev.evaluateCondition(
      { type: 'counter', counterName: 'score', comparison: 'equals', value: 5 } as any,
      ctx(), 'obj',
    )).toBe(false);
  });

  it('greaterOrEqual: true when value >= threshold', () => {
    counterManager.setCounter('score', 10);
    expect(ev.evaluateCondition(
      { type: 'counter', counterName: 'score', comparison: 'greaterOrEqual', value: 10 } as any,
      ctx(), 'obj',
    )).toBe(true);
  });

  it('greater: false when equal', () => {
    counterManager.setCounter('score', 10);
    expect(ev.evaluateCondition(
      { type: 'counter', counterName: 'score', comparison: 'greater', value: 10 } as any,
      ctx(), 'obj',
    )).toBe(false);
  });

  it('less: true when below threshold', () => {
    counterManager.setCounter('score', 3);
    expect(ev.evaluateCondition(
      { type: 'counter', counterName: 'score', comparison: 'less', value: 5 } as any,
      ctx(), 'obj',
    )).toBe(true);
  });

  it('lessOrEqual: true when equal', () => {
    counterManager.setCounter('score', 5);
    expect(ev.evaluateCondition(
      { type: 'counter', counterName: 'score', comparison: 'lessOrEqual', value: 5 } as any,
      ctx(), 'obj',
    )).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// Flag conditions
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – flag conditions', () => {
  let ev: ConditionEvaluator;
  let flagManager: FlagManager;

  beforeEach(() => {
    flagManager = new FlagManager();
    const counterManager = new CounterManager();
    const collisionDetector = new CollisionDetector();
    ev = new ConditionEvaluator(flagManager, counterManager, collisionDetector);
    flagManager.addFlagDefinition('active', false);
  });

  it('ON: true when flag is on', () => {
    flagManager.setFlag('active', true);
    expect(ev.evaluateCondition(
      { type: 'flag', flagId: 'active', condition: 'ON' } as any,
      makeContext(), 'obj',
    )).toBe(true);
  });

  it('OFF: true when flag is off', () => {
    expect(ev.evaluateCondition(
      { type: 'flag', flagId: 'active', condition: 'OFF' } as any,
      makeContext(), 'obj',
    )).toBe(true);
  });

  it('CHANGED: true after setFlag changes value', () => {
    flagManager.setFlag('active', true); // was false → now true
    expect(ev.evaluateCondition(
      { type: 'flag', flagId: 'active', condition: 'CHANGED' } as any,
      makeContext(), 'obj',
    )).toBe(true);
  });

  it('CHANGED: false when value unchanged', () => {
    flagManager.updatePreviousFlags();
    expect(ev.evaluateCondition(
      { type: 'flag', flagId: 'active', condition: 'CHANGED' } as any,
      makeContext(), 'obj',
    )).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Time conditions
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – time conditions', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  it('exact: true when time is within tolerance', () => {
    const ctx = makeContext();
    ctx.gameState.timeElapsed = 5.05;
    expect(ev.evaluateCondition(
      { type: 'time', timeType: 'exact', seconds: 5.0 } as any,
      ctx, 'obj',
    )).toBe(true);
  });

  it('exact: false when time is outside tolerance', () => {
    const ctx = makeContext();
    ctx.gameState.timeElapsed = 5.2;
    expect(ev.evaluateCondition(
      { type: 'time', timeType: 'exact', seconds: 5.0 } as any,
      ctx, 'obj',
    )).toBe(false);
  });

  it('range: true when time is within range', () => {
    const ctx = makeContext();
    ctx.gameState.timeElapsed = 3.0;
    expect(ev.evaluateCondition(
      { type: 'time', timeType: 'range', range: { min: 2.0, max: 5.0 } } as any,
      ctx, 'obj',
    )).toBe(true);
  });

  it('range: false when time is out of range', () => {
    const ctx = makeContext();
    ctx.gameState.timeElapsed = 6.0;
    expect(ev.evaluateCondition(
      { type: 'time', timeType: 'range', range: { min: 2.0, max: 5.0 } } as any,
      ctx, 'obj',
    )).toBe(false);
  });

  it('interval: true when time is multiple of interval', () => {
    const ctx = makeContext();
    ctx.gameState.timeElapsed = 2.05; // 2 % 2 ≈ 0 < 0.1
    expect(ev.evaluateCondition(
      { type: 'time', timeType: 'interval', interval: 2 } as any,
      ctx, 'obj',
    )).toBe(true);
  });

  it('interval: false when time is not near a multiple', () => {
    const ctx = makeContext();
    ctx.gameState.timeElapsed = 2.5;
    expect(ev.evaluateCondition(
      { type: 'time', timeType: 'interval', interval: 2 } as any,
      ctx, 'obj',
    )).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// AND / OR evaluation
// ────────────────────────────────────────────────────────────

describe('ConditionEvaluator – evaluateConditions AND/OR', () => {
  let ev: ConditionEvaluator;
  beforeEach(() => { ev = makeEvaluator(); });

  it('AND: returns true only when all conditions match', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'obj1', x: 0, y: 0 })],
    });
    ctx.gameState.timeElapsed = 3.0;

    const result = ev.evaluateConditions(
      {
        operator: 'AND',
        conditions: [
          { type: 'touch', touchType: 'down', target: 'self' },
          { type: 'time', timeType: 'range', range: { min: 2, max: 5 } } as any,
        ],
      },
      ctx,
      'obj1',
    );
    expect(result.shouldExecute).toBe(true);
    expect(result.conditionResults).toEqual([true, true]);
  });

  it('AND: returns false when one condition fails', () => {
    const ctx = makeContext({
      events: [makeTouchEvent({ touchType: 'down', target: 'obj1', x: 0, y: 0 })],
    });
    ctx.gameState.timeElapsed = 10.0;

    const result = ev.evaluateConditions(
      {
        operator: 'AND',
        conditions: [
          { type: 'touch', touchType: 'down', target: 'self' },
          { type: 'time', timeType: 'range', range: { min: 2, max: 5 } } as any,
        ],
      },
      ctx,
      'obj1',
    );
    expect(result.shouldExecute).toBe(false);
    expect(result.conditionResults).toEqual([true, false]);
  });

  it('OR: returns true when any condition matches', () => {
    const ctx = makeContext({ events: [] });
    ctx.gameState.timeElapsed = 3.0;

    const result = ev.evaluateConditions(
      {
        operator: 'OR',
        conditions: [
          { type: 'touch', touchType: 'down', target: 'self' }, // false (no events)
          { type: 'time', timeType: 'range', range: { min: 2, max: 5 } } as any, // true
        ],
      },
      ctx,
      'obj1',
    );
    expect(result.shouldExecute).toBe(true);
    expect(result.conditionResults).toEqual([false, true]);
  });

  it('OR: returns false when all conditions fail', () => {
    const ctx = makeContext({ events: [] });
    ctx.gameState.timeElapsed = 10.0;

    const result = ev.evaluateConditions(
      {
        operator: 'OR',
        conditions: [
          { type: 'touch', touchType: 'down', target: 'self' },
          { type: 'time', timeType: 'range', range: { min: 2, max: 5 } } as any,
        ],
      },
      ctx,
      'obj1',
    );
    expect(result.shouldExecute).toBe(false);
  });
});
