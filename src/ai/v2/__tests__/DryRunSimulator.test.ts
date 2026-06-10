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

  it('equals 比較でも到達可能性がチェックされる（修正済みバグ: greaterOrEqual のみ）', () => {
    const output = makeOutput({
      counters: [{ id: 'hits', name: 'hits', initialValue: 0, currentValue: 0, min: 0, max: 99 }],
      rules: [
        {
          id: 'tap-rule', name: 'tap-rule', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'hits', operation: 'increment' }],
        },
        // equals=5 で1ルールのみ → 到達不可
        {
          id: 'win-rule', name: 'win-rule', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'counter', counterName: 'hits', comparison: 'equals', value: 5 }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const counterIssue = report.issues.find(i => i.code === 'COUNTER_UNREACHABLE');
    expect(counterIssue).toBeDefined();
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

  it('failureRules が存在しない場合 failure reachable は false（修正済みバグ: || true）', () => {
    const output = makeOutput({ rules: [] });
    const report = sim.simulate(output);
    expect(report.failure.reachable).toBe(false);
  });

  it('failure ルールが存在すれば reachable は true', () => {
    const output = makeOutput({
      rules: [
        {
          id: 'lose', name: 'lose', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'failure' }],
        },
      ],
    });
    const report = sim.simulate(output);
    expect(report.failure.reachable).toBe(true);
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

// ──────────────────────────────────────────────
// 複数カウンター条件（修正済みバグ: find→filter）
// ──────────────────────────────────────────────

describe('DryRunSimulator – 複数カウンター条件（修正済みバグ）', () => {
  const sim = new DryRunSimulator();

  it('2つの成功ルールが異なるカウンターを使うとき、両方をチェックする', () => {
    const output = makeOutput({
      counters: [
        { id: 'coins', name: 'coins', initialValue: 0, currentValue: 0, min: 0, max: 99 },
        { id: 'stars', name: 'stars', initialValue: 0, currentValue: 0, min: 0, max: 99 },
      ],
      rules: [
        // coins は1ルールのみで coins>=5 → 到達不可
        {
          id: 'coin-tap', name: 'coin-tap', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'coins', operation: 'increment' }],
        },
        {
          id: 'win-coins', name: 'win-coins', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'counter', counterName: 'coins', comparison: 'greaterOrEqual', value: 5 }] },
          actions: [{ type: 'success' }],
        },
        // stars は3ルールで stars>=3 → 到達可能（こちらが初回にfindで引っかかる）
        {
          id: 'star-tap1', name: 'star-tap1', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'stars', operation: 'increment' }],
        },
        {
          id: 'star-tap2', name: 'star-tap2', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'stars', operation: 'increment' }],
        },
        {
          id: 'star-tap3', name: 'star-tap3', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'counter', counterName: 'stars', operation: 'increment' }],
        },
        {
          id: 'win-stars', name: 'win-stars', enabled: true, priority: 50,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'counter', counterName: 'stars', comparison: 'greaterOrEqual', value: 3 }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    // coins のCOUNTER_UNREACHABLE が検出されるはず（1ルール < 5）
    const counterIssue = report.issues.find(i => i.code === 'COUNTER_UNREACHABLE' && i.message.includes('coins'));
    expect(counterIssue).toBeDefined();
  });
});

// ──────────────────────────────────────────────
// 自己hideするタップターゲット（推奨パターン）
// ──────────────────────────────────────────────

describe('DryRunSimulator – 自己hideするタップターゲット', () => {
  const sim = new DryRunSimulator();

  /** 「N個の別オブジェクトを各1回タップ（タップで自分が消える）」のフィクスチャ */
  function makeSelfHideOutput(targetCount: number, requiredValue: number): LogicGeneratorOutput {
    const ids = Array.from({ length: targetCount }, (_, i) => `target_${i + 1}`);
    return makeOutput({
      layout: {
        objects: ids.map(id => ({ objectId: id, position: { x: 0.5, y: 0.5 }, scale: 1 }))
      } as LogicGeneratorOutput['script']['layout'],
      counters: [{ id: 'progress', name: 'progress', initialValue: 0, currentValue: 0, min: 0, max: 99 }],
      rules: [
        ...ids.map(id => ({
          id: `tap_${id}`, name: `tap_${id}`, enabled: true, priority: 50,
          targetObjectId: id,
          triggers: { operator: 'AND' as const, conditions: [{ type: 'touch' as const, touchType: 'down', target: 'self' }] },
          actions: [
            { type: 'hide' as const, targetId: id },
            { type: 'counter' as const, counterName: 'progress', operation: 'increment' as const },
          ],
        })),
        {
          id: 'check_win', name: 'check_win', enabled: true, priority: 90,
          targetObjectId: 'stage',
          triggers: { operator: 'AND' as const, conditions: [{ type: 'counter' as const, counterName: 'progress', comparison: 'greaterOrEqual' as const, value: requiredValue }] },
          actions: [{ type: 'success' as const }],
        },
      ],
    });
  }

  it('3つの自己hideターゲット + counter>=3 は3タップで到達可能（モックゲームの形）', () => {
    const report = sim.simulate(makeSelfHideOutput(3, 3));
    expect(report.summary.playable).toBe(true);
    expect(report.success.requiredTaps).toBe(3);
    expect(report.success.blockers).toEqual([]);
  });

  it('自己hideは hidden_target conflict にならない', () => {
    const report = sim.simulate(makeSelfHideOutput(3, 3));
    const hiddenTargetConflicts = report.conflicts.filter(c => c.type === 'hidden_target');
    expect(hiddenTargetConflicts).toEqual([]);
  });

  it('クロスルールのhide（AがXをhide、別ルールBがXをタップ）は引き続き検出される', () => {
    const output = makeOutput({
      layout: {
        objects: [
          { objectId: 't1', position: { x: 0.3, y: 0.5 }, scale: 1 },
          { objectId: 't2', position: { x: 0.7, y: 0.5 }, scale: 1 },
        ]
      } as LogicGeneratorOutput['script']['layout'],
      rules: [
        {
          id: 'rule_a', name: 'rule_a', enabled: true, priority: 50,
          targetObjectId: 't1',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'hide', targetId: 't2' }],
        },
        {
          id: 'rule_b', name: 'rule_b', enabled: true, priority: 50,
          targetObjectId: 't2',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    const conflict = report.conflicts.find(c => c.type === 'hidden_target');
    expect(conflict).toBeDefined();
    expect(conflict!.rules).toContain('rule_a');
    expect(conflict!.rules).toContain('rule_b');
  });

  it('increment能力不足は非空のblockersで失敗し、reasoningが空にならない', () => {
    // 1つの自己hideルールしかないのに counter>=3 が必要
    const report = sim.simulate(makeSelfHideOutput(1, 3));
    expect(report.summary.playable).toBe(false);
    expect(report.success.blockers.length).toBeGreaterThan(0);
    expect(report.summary.reasoning).not.toMatch(/NOT reachable: \./);
  });

  it('既存ブロッカー分岐を通らない到達不能ケースでも汎用blockerが必ず入る', () => {
    // success条件がシミュレーション未対応のobjectState型のみ → タップ/待機ゼロで自動成功疑い
    const output = makeOutput({
      rules: [
        {
          id: 'odd_win', name: 'odd_win', enabled: true, priority: 90,
          targetObjectId: 'stage',
          triggers: { operator: 'AND', conditions: [{ type: 'objectState', target: 'ball', state: 'visible' } as never] },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    if (!report.success.reachable) {
      expect(report.success.blockers.length).toBeGreaterThan(0);
      expect(report.summary.reasoning).not.toMatch(/NOT reachable: \./);
    }
  });
});

// ──────────────────────────────────────────────
// flag条件の成功パス（PhaseCompilerのフェーズ遷移等）
// ──────────────────────────────────────────────

describe('DryRunSimulator – flag条件の成功パス', () => {
  const sim = new DryRunSimulator();

  it('touchゲートのsetter経由でflagが立つ場合は到達可能（+1タップ）', () => {
    const output = makeOutput({
      flags: [{ id: 'armed', name: 'armed', initialValue: false }],
      rules: [
        {
          id: 'arm_rule', name: 'arm_rule', enabled: true, priority: 50,
          targetObjectId: 'ball',
          triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
          actions: [{ type: 'setFlag', flagId: 'armed', value: true }],
        },
        {
          id: 'win_rule', name: 'win_rule', enabled: true, priority: 90,
          targetObjectId: 'stage',
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'flag', flagId: 'armed', condition: 'ON' },
              { type: 'touch', touchType: 'down', target: 'ball' },
            ]
          },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    expect(report.summary.playable).toBe(true);
    // armフラグのsetterタップ + win条件自体のタップ = 2
    expect(report.success.requiredTaps).toBe(2);
  });

  it('どのルールもflagを立てない場合はblockerにflagIdが含まれる', () => {
    const output = makeOutput({
      flags: [{ id: 'never_set', name: 'never_set', initialValue: false }],
      rules: [
        {
          id: 'win_rule', name: 'win_rule', enabled: true, priority: 90,
          targetObjectId: 'stage',
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'flag', flagId: 'never_set', condition: 'ON' },
              { type: 'touch', touchType: 'down', target: 'ball' },
            ]
          },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    expect(report.summary.playable).toBe(false);
    expect(report.success.blockers.some(b => b.includes('never_set'))).toBe(true);
  });

  it('initialValue: true のflag条件は追加コストなしで満たされる', () => {
    const output = makeOutput({
      flags: [{ id: 'ready', name: 'ready', initialValue: true }],
      rules: [
        {
          id: 'win_rule', name: 'win_rule', enabled: true, priority: 90,
          targetObjectId: 'stage',
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'flag', flagId: 'ready', condition: 'ON' },
              { type: 'touch', touchType: 'down', target: 'ball' },
            ]
          },
          actions: [{ type: 'success' }],
        },
      ],
    });
    const report = sim.simulate(output);
    expect(report.summary.playable).toBe(true);
    expect(report.success.requiredTaps).toBe(1);
  });
});
