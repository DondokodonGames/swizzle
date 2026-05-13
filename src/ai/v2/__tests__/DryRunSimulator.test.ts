import { describe, it, expect } from 'vitest';
import { DryRunSimulator } from '../DryRunSimulator';
import { LogicGeneratorOutput } from '../types';

function makeOutput(overrides: Partial<LogicGeneratorOutput['script']> = {}): LogicGeneratorOutput {
  return {
    script: {
      layout: { objects: [{ objectId: 'ball', position: { x: 0.5, y: 0.5 }, scale: 1 }] },
      counters: [],
      rules: [],
      ...overrides,
    },
    assetPlan: { objects: [], background: null as any, sounds: [] },
    selfCheck: {
      hasPlayerActionOnSuccessPath: true,
      counterInitialValuesSafe: true,
      allObjectIdsValid: true,
      allCounterNamesValid: true,
      coordinatesInRange: true,
      onlyVerifiedFeaturesUsed: true,
    },
  };
}

// ──────────────────────────────────────────────
// カウンター到達可能性
// ──────────────────────────────────────────────

describe('DryRunSimulator – カウンター到達可能性', () => {
  const sim = new DryRunSimulator();

  it('increment 操作が 3 回あれば greaterOrEqual=3 の成功条件が到達可能', () => {
    const output = makeOutput({
      counters: [{ id: 'hits', name: 'hits', initialValue: 0, currentValue: 0, min: 0, max: 99 }],
      rules: [
        {
          id: 'tap-rule', name: 'tap-rule', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'increment' }],
        },
        {
          id: 'tap-rule2', name: 'tap-rule2', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'increment' }],
        },
        {
          id: 'tap-rule3', name: 'tap-rule3', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'increment' }],
        },
        {
          id: 'win-rule', name: 'win-rule', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'counter', counterName: 'hits', comparison: 'greaterOrEqual', value: 3 }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const counterIssue = report.issues.find(i => i.code === 'COUNTER_UNREACHABLE');
    expect(counterIssue).toBeUndefined();
  });

  it('add 操作ルールも到達可能とみなされる（修正済みバグ: 演算子優先度）', () => {
    const output = makeOutput({
      counters: [{ id: 'hits', name: 'hits', initialValue: 0, currentValue: 0, min: 0, max: 99 }],
      rules: [
        {
          id: 'tap-rule', name: 'tap-rule', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'add', value: 1 }],
        },
        {
          id: 'tap-rule2', name: 'tap-rule2', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'add', value: 1 }],
        },
        {
          id: 'tap-rule3', name: 'tap-rule3', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'add', value: 1 }],
        },
        {
          id: 'win-rule', name: 'win-rule', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'counter', counterName: 'hits', comparison: 'greaterOrEqual', value: 3 }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const counterIssue = report.issues.find(i => i.code === 'COUNTER_UNREACHABLE');
    expect(counterIssue).toBeUndefined();
  });

  it('increment ルールが目標値より少ない場合 COUNTER_UNREACHABLE エラー', () => {
    const output = makeOutput({
      counters: [{ id: 'hits', name: 'hits', initialValue: 0, currentValue: 0, min: 0, max: 99 }],
      rules: [
        {
          id: 'tap-rule', name: 'tap-rule', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'increment' }],
        },
        // 1ルールのみで目標値=5 → 到達不可
        {
          id: 'win-rule', name: 'win-rule', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'counter', counterName: 'hits', comparison: 'greaterOrEqual', value: 5 }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const counterIssue = report.issues.find(i => i.code === 'COUNTER_UNREACHABLE');
    expect(counterIssue).toBeDefined();
  });
});

// ──────────────────────────────────────────────
// 衝突到達可能性
// ──────────────────────────────────────────────

describe('DryRunSimulator – 衝突到達可能性', () => {
  const sim = new DryRunSimulator();

  it('衝突対象 (ball) を動かすタッチトリガールールがある場合は到達可能', () => {
    const output = makeOutput({
      rules: [
        {
          id: 'launch', name: 'launch', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'move', targetId: 'ball', movement: { type: 'straight', direction: 'up', speed: 5 } }],
        },
        {
          id: 'win', name: 'win', enabled: true, priority: 50,
          targetObjectId: 'target',
          triggers: { operator: 'AND', conditions: [{ type: 'collision', target: 'ball', collisionType: 'enter' }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const collisionIssue = report.issues.find(i => i.code === 'AUTO_SUCCESS_COLLISION');
    expect(collisionIssue).toBeUndefined();
  });

  it('衝突対象 (ball) を動かすルールがない場合 AUTO_SUCCESS_COLLISION エラー（修正済みバグ）', () => {
    const output = makeOutput({
      rules: [
        {
          // このルールは 'other' というオブジェクトを動かすが、衝突対象 'ball' ではない
          id: 'move-other', name: 'move-other', enabled: true, priority: 50,
          targetObjectId: 'other',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'move', targetId: 'other', movement: { type: 'straight', direction: 'up', speed: 5 } }],
        },
        {
          id: 'win', name: 'win', enabled: true, priority: 50,
          targetObjectId: 'target',
          triggers: { operator: 'AND', conditions: [{ type: 'collision', target: 'ball', collisionType: 'enter' }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const collisionIssue = report.issues.find(i => i.code === 'AUTO_SUCCESS_COLLISION');
    expect(collisionIssue).toBeDefined();
  });
});
