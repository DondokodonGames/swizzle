import { describe, it, expect, beforeEach } from 'vitest';
import { LogicValidator } from '../LogicValidator';
import { LogicGeneratorOutput, GameRule } from '../types';

// ────────────────────────────────────────────────────────────
// Minimal valid output factory
// ────────────────────────────────────────────────────────────

function makeObject(id: string) {
  return {
    id,
    name: id,
    purpose: 'player',
    visualDescription: 'a ' + id,
    initialPosition: { x: 0.5, y: 0.5 },
    size: 'medium' as const,
  };
}

function makeOutput(overrides: Partial<LogicGeneratorOutput> = {}): LogicGeneratorOutput {
  const defaultRule: GameRule = {
    id: 'rule1',
    targetObjectId: 'obj1',
    triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
    actions: [{ type: 'success', score: 100 }],
  };

  return {
    script: {
      layout: {
        objects: [{
          objectId: 'obj1',
          position: { x: 0.5, y: 0.5 },
          scale: { x: 1, y: 1 },
        }],
      },
      rules: [defaultRule],
      counters: [],
      flags: [],
      initialState: { gameState: {} },
    } as any,
    assetPlan: {
      objects: [makeObject('obj1')],
      background: { description: 'plain', mood: 'neutral' },
      sounds: [],
      bgm: undefined,
    } as any,
    selfCheck: {
      hasPlayerActionOnSuccessPath: true,
      counterInitialValuesSafe: true,
      allObjectIdsValid: true,
      allCounterNamesValid: true,
      coordinatesInRange: true,
      onlyVerifiedFeaturesUsed: true,
    },
    ...overrides,
  };
}

function withRule(rule: GameRule, base?: Partial<LogicGeneratorOutput>): LogicGeneratorOutput {
  const out = makeOutput(base);
  out.script.rules = [rule];
  return out;
}

// ────────────────────────────────────────────────────────────
// Invalid action types
// ────────────────────────────────────────────────────────────

describe('LogicValidator – invalid action types', () => {
  let validator: LogicValidator;
  beforeEach(() => { validator = new LogicValidator(); });

  it('rejects showMessage as INVALID_ACTION_TYPE', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'showMessage' } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_ACTION_TYPE');
    expect(err).toBeDefined();
    expect(err?.type).toBe('critical');
    expect(err?.message).toContain('showMessage');
  });

  it('rejects setGravity as INVALID_ACTION_TYPE', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'setGravity' } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_ACTION_TYPE');
    expect(err).toBeDefined();
    expect(err?.message).toContain('setGravity');
  });

  it('rejects setPhysics as INVALID_ACTION_TYPE', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'setPhysics' } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_ACTION_TYPE');
    expect(err).toBeDefined();
    expect(err?.message).toContain('setPhysics');
  });

  it('does not reject valid action types', () => {
    const validTypes = [
      'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore',
      'effect', 'setFlag', 'toggleFlag', 'playSound', 'stopSound', 'playBGM',
      'stopBGM', 'switchAnimation', 'playAnimation', 'followDrag',
      'applyForce', 'applyImpulse', 'randomAction', 'pause', 'restart',
    ] as const;

    for (const type of validTypes) {
      const output = withRule({
        id: 'r1',
        targetObjectId: 'obj1',
        triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
        actions: [{ type } as any],
      });
      const result = validator.validate(output);
      const invalidErr = result.errors.find(
        e => e.code === 'INVALID_ACTION_TYPE' && e.message.includes(type),
      );
      expect(invalidErr, `${type} should be valid but got INVALID_ACTION_TYPE`).toBeUndefined();
    }
  });
});

// ────────────────────────────────────────────────────────────
// Invalid condition types
// ────────────────────────────────────────────────────────────

describe('LogicValidator – invalid condition types', () => {
  let validator: LogicValidator;
  beforeEach(() => { validator = new LogicValidator(); });

  it('rejects unknown condition type', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: {
        operator: 'AND',
        conditions: [{ type: 'unknownCondition' } as any],
      },
      actions: [{ type: 'success', score: 0 }],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_CONDITION_TYPE');
    expect(err).toBeDefined();
    expect(err?.type).toBe('critical');
    expect(err?.message).toContain('unknownCondition');
  });

  it('accepts all verified condition types', () => {
    const verifiedTypes = [
      'touch', 'time', 'counter', 'collision', 'flag',
      'gameState', 'position', 'animation', 'random', 'objectState', 'always',
    ] as const;

    for (const type of verifiedTypes) {
      const output = withRule({
        id: 'r1',
        targetObjectId: 'obj1',
        triggers: { operator: 'AND', conditions: [{ type } as any] },
        actions: [{ type: 'success', score: 0 }],
      });
      const result = validator.validate(output);
      const invalidErr = result.errors.find(
        e => e.code === 'INVALID_CONDITION_TYPE' && e.message.includes(type),
      );
      expect(invalidErr, `${type} should be valid`).toBeUndefined();
    }
  });
});

// ────────────────────────────────────────────────────────────
// Object ID consistency
// ────────────────────────────────────────────────────────────

describe('LogicValidator – object ID consistency', () => {
  let validator: LogicValidator;
  beforeEach(() => { validator = new LogicValidator(); });

  it('detects missing object ID in rule targetObjectId', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'nonexistent',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'success', score: 0 }],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_OBJECT_ID');
    expect(err).toBeDefined();
    expect(err?.message).toContain('nonexistent');
  });

  it('detects missing object ID in action targetId', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'hide', targetId: 'ghost_obj' }],
    });
    const result = validator.validate(output);
    const err = result.errors.find(
      e => e.code === 'INVALID_OBJECT_ID' && e.message.includes('ghost_obj'),
    );
    expect(err).toBeDefined();
  });

  it('detects missing layout object ID', () => {
    const output = makeOutput();
    output.script.layout.objects = [{
      objectId: 'missing_obj',
      position: { x: 0.5, y: 0.5 },
      scale: { x: 1, y: 1 },
    }];
    const result = validator.validate(output);
    const err = result.errors.find(
      e => e.code === 'INVALID_OBJECT_ID' && e.message.includes('missing_obj'),
    );
    expect(err).toBeDefined();
  });

  it('passes when all IDs are consistent', () => {
    const output = makeOutput();
    const result = validator.validate(output);
    const idErrors = result.errors.filter(e => e.code === 'INVALID_OBJECT_ID');
    expect(idErrors).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────
// Counter name consistency
// ────────────────────────────────────────────────────────────

describe('LogicValidator – counter name consistency', () => {
  let validator: LogicValidator;
  beforeEach(() => { validator = new LogicValidator(); });

  it('rejects undefined counter name in condition', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: {
        operator: 'AND',
        conditions: [{ type: 'counter', counterName: 'ghost_counter', comparison: 'equals', value: 1 } as any],
      },
      actions: [{ type: 'success', score: 0 }],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_COUNTER_NAME');
    expect(err).toBeDefined();
    expect(err?.message).toContain('ghost_counter');
  });

  it('rejects undefined counter name in counter action', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'counter', counterName: 'undefined_counter', operation: 'increment' }],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_COUNTER_NAME');
    expect(err).toBeDefined();
    expect(err?.message).toContain('undefined_counter');
  });

  it('passes when counter name matches defined counter', () => {
    const output = makeOutput();
    output.script.counters = [{ id: 'hits', name: 'hits', initialValue: 0 } as any];
    output.script.rules = [{
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: {
        operator: 'AND',
        conditions: [{ type: 'counter', counterName: 'hits', comparison: 'equals', value: 3 } as any],
      },
      actions: [{ type: 'success', score: 100 }],
    }];
    const result = validator.validate(output);
    const counterErrors = result.errors.filter(e => e.code === 'INVALID_COUNTER_NAME');
    expect(counterErrors).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────
// Action parameter validation
// ────────────────────────────────────────────────────────────

describe('LogicValidator – action parameter validation', () => {
  let validator: LogicValidator;
  beforeEach(() => { validator = new LogicValidator(); });

  it('rejects invalid counter operation', () => {
    const output = makeOutput();
    output.script.counters = [{ id: 'score', name: 'score', initialValue: 0 } as any];
    output.script.rules = [{
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{ type: 'counter', counterName: 'score', operation: 'multiply' } as any],
    }];
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_COUNTER_OPERATION');
    expect(err).toBeDefined();
  });

  it('rejects invalid movement type', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{
        type: 'move',
        movement: { type: 'zigzag', speed: 3 },
      } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_MOVEMENT_TYPE');
    expect(err).toBeDefined();
  });

  it('rejects negative movement speed', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{
        type: 'move',
        movement: { type: 'straight', speed: -1 },
      } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_SPEED');
    expect(err).toBeDefined();
  });

  it('rejects invalid effect type', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{
        type: 'effect',
        effect: { type: 'dissolve', duration: 1 },
      } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_EFFECT_TYPE');
    expect(err).toBeDefined();
  });

  it('rejects negative effect duration', () => {
    const output = withRule({
      id: 'r1',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'down', target: 'self' }] },
      actions: [{
        type: 'effect',
        effect: { type: 'flash', duration: -0.5 },
      } as any],
    });
    const result = validator.validate(output);
    const err = result.errors.find(e => e.code === 'INVALID_EFFECT_DURATION');
    expect(err).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────
// INSTANT_LOSE – less/lessOrEqual comparisons
// ────────────────────────────────────────────────────────────

describe('LogicValidator – INSTANT_LOSE less/lessOrEqual（修正済みバグ）', () => {
  let validator: LogicValidator;
  beforeEach(() => { validator = new LogicValidator(); });

  function makeInstantLoseOutput(comparison: string, counterInitialValue: number, threshold: number): LogicGeneratorOutput {
    return makeOutput({
      script: {
        layout: { objects: [{ objectId: 'obj1', position: { x: 0.5, y: 0.5 }, scale: 1 }] },
        counters: [{ id: 'hp', name: 'hp', initialValue: counterInitialValue, currentValue: counterInitialValue, min: 0, max: 100 }],
        rules: [
          {
            id: 'fail-rule',
            name: 'fail-rule',
            enabled: true,
            priority: 50,
            targetObjectId: 'stage',
            triggers: {
              operator: 'AND',
              conditions: [{ type: 'counter', counterName: 'hp', comparison, value: threshold }]
            },
            actions: [{ type: 'failure' }],
          }
        ],
      } as any,
    });
  }

  it('less: initialValue < threshold → INSTANT_LOSE を検出する', () => {
    const output = makeInstantLoseOutput('less', 2, 5); // 2 < 5 → 即失敗
    const result = validator.validate(output);
    expect(result.errors.find(e => e.code === 'INSTANT_LOSE')).toBeDefined();
  });

  it('less: initialValue >= threshold → 問題なし', () => {
    const output = makeInstantLoseOutput('less', 5, 3); // 5 >= 3 → 即失敗しない
    const result = validator.validate(output);
    expect(result.errors.find(e => e.code === 'INSTANT_LOSE')).toBeUndefined();
  });

  it('lessOrEqual: initialValue <= threshold → INSTANT_LOSE を検出する', () => {
    const output = makeInstantLoseOutput('lessOrEqual', 3, 3); // 3 <= 3 → 即失敗
    const result = validator.validate(output);
    expect(result.errors.find(e => e.code === 'INSTANT_LOSE')).toBeDefined();
  });

  it('lessOrEqual: initialValue > threshold → 問題なし', () => {
    const output = makeInstantLoseOutput('lessOrEqual', 5, 3); // 5 > 3 → 即失敗しない
    const result = validator.validate(output);
    expect(result.errors.find(e => e.code === 'INSTANT_LOSE')).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// getConditionSignature: swipeDirection（修正済みバグ: c.direction → c.swipeDirection）
// ──────────────────────────────────────────────

describe('LogicValidator – swipeDirection シグネチャ（修正済みバグ）', () => {
  const validator = new LogicValidator();

  it('swipeDirection が異なるスワイプ条件は別シグネチャ: SUCCESS_FAILURE_CONFLICT が発生しない', () => {
    // success=swipe-up, failure=swipe-down → 異なる方向なので衝突しない
    const swipeUp: GameRule = {
      id: 'swipe-up',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'swipe', target: 'self', swipeDirection: 'up' }] },
      actions: [{ type: 'success', score: 10 }],
    };
    const swipeDown: GameRule = {
      id: 'swipe-down',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'swipe', target: 'self', swipeDirection: 'down' }] },
      actions: [{ type: 'failure' }],
    };

    const output = makeOutput({
      script: {
        layout: { objects: [{ objectId: 'obj1', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 } }] },
        rules: [swipeUp, swipeDown],
        counters: [],
        flags: [],
        initialState: { gameState: {} },
      } as any,
    });

    const result = validator.validate(output);
    // swipeDirection が異なるため SUCCESS_FAILURE_CONFLICT は発生しない
    const conflict = result.errors.find(e => e.code === 'SUCCESS_FAILURE_CONFLICT');
    expect(conflict).toBeUndefined();
  });

  it('swipeDirection が同じスワイプ条件は同一シグネチャ: SUCCESS_FAILURE_CONFLICT が検出される', () => {
    // success=swipe-up, failure=swipe-up → 同じ方向なので衝突
    const swipeUpSuccess: GameRule = {
      id: 'swipe-up-success',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'swipe', target: 'self', swipeDirection: 'up' }] },
      actions: [{ type: 'success', score: 10 }],
    };
    const swipeUpFailure: GameRule = {
      id: 'swipe-up-failure',
      targetObjectId: 'obj1',
      triggers: { operator: 'AND', conditions: [{ type: 'touch', touchType: 'swipe', target: 'self', swipeDirection: 'up' }] },
      actions: [{ type: 'failure' }],
    };

    const output = makeOutput({
      script: {
        layout: { objects: [{ objectId: 'obj1', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 } }] },
        rules: [swipeUpSuccess, swipeUpFailure],
        counters: [],
        flags: [],
        initialState: { gameState: {} },
      } as any,
    });

    const result = validator.validate(output);
    // 同じ swipeDirection なので SUCCESS_FAILURE_CONFLICT が検出される
    const conflict = result.errors.find(e => e.code === 'SUCCESS_FAILURE_CONFLICT');
    expect(conflict).toBeDefined();
  });
});
