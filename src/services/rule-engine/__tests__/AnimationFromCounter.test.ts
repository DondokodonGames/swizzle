import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../RuleEngine';
import { RuleExecutionContext, GameObject } from '../types';
import { GameRule } from '../../../types/editor/GameScript';
import { GameCounter } from '../../../types/counterTypes';

function makeObject(id: string): GameObject {
  return {
    id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    visible: true,
    animationIndex: 0,
    animationPlaying: false,
    scale: 1,
    rotation: 0,
    currentFrame: 0,
  };
}

function makeContext(timeElapsed: number = 0): RuleExecutionContext {
  return {
    gameState: {
      isPlaying: true,
      isPaused: false,
      score: 0,
      timeElapsed,
      flags: new Map(),
      counters: new Map(),
    },
    objects: new Map(),
    events: [],
    canvas: { width: 1080, height: 1920 },
  };
}

function alwaysRule(id: string, actions: GameRule['actions']): GameRule {
  return {
    id,
    name: id,
    enabled: true,
    priority: 50,
    targetObjectId: 'stage',
    triggers: { operator: 'AND', conditions: [] },
    actions,
    createdAt: '',
    lastModified: '',
  };
}

function makeCounter(name: string, value: number): GameCounter {
  return {
    id: name,
    name,
    initialValue: value,
    currentValue: value,
    persistence: 'game',
    createdAt: '',
    lastModified: '',
  };
}

describe('setAnimationFromCounter', () => {
  it('sets currentFrame from counter value', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition(makeCounter('hp', 5));
    engine.addRule(alwaysRule('r', [{
      type: 'setAnimationFromCounter',
      targetId: 'obj1',
      counterName: 'hp',
      maxFrame: 10,
    }]));

    const ctx = makeContext();
    const obj = makeObject('obj1');
    ctx.objects.set('obj1', obj);

    engine.evaluateAndExecuteRules(ctx);

    expect(obj.currentFrame).toBe(5);
  });

  it('clamps at minFrame when counter is below min', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition(makeCounter('hp', -3));
    engine.addRule(alwaysRule('r', [{
      type: 'setAnimationFromCounter',
      targetId: 'obj1',
      counterName: 'hp',
      minFrame: 0,
      maxFrame: 10,
      clamp: true,
    }]));

    const ctx = makeContext();
    const obj = makeObject('obj1');
    ctx.objects.set('obj1', obj);

    engine.evaluateAndExecuteRules(ctx);

    expect(obj.currentFrame).toBe(0);
  });

  it('clamps at maxFrame when counter exceeds max', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition(makeCounter('hp', 15));
    engine.addRule(alwaysRule('r', [{
      type: 'setAnimationFromCounter',
      targetId: 'obj1',
      counterName: 'hp',
      maxFrame: 10,
      clamp: true,
    }]));

    const ctx = makeContext();
    const obj = makeObject('obj1');
    ctx.objects.set('obj1', obj);

    engine.evaluateAndExecuteRules(ctx);

    expect(obj.currentFrame).toBe(10);
  });

  it('does not crash when counter is missing (defaults to 0)', () => {
    const engine = new RuleEngine();
    // No counter definition for 'missing'
    engine.addRule(alwaysRule('r', [{
      type: 'setAnimationFromCounter',
      targetId: 'obj1',
      counterName: 'missing',
      maxFrame: 10,
    }]));

    const ctx = makeContext();
    const obj = makeObject('obj1');
    ctx.objects.set('obj1', obj);

    expect(() => engine.evaluateAndExecuteRules(ctx)).not.toThrow();
    expect(obj.currentFrame).toBe(0); // counter missing → 0
  });

  it('does not crash when targetId is missing', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition(makeCounter('hp', 5));
    engine.addRule(alwaysRule('r', [{
      type: 'setAnimationFromCounter',
      targetId: 'nonexistent',
      counterName: 'hp',
      maxFrame: 10,
    }]));

    const ctx = makeContext();

    expect(() => engine.evaluateAndExecuteRules(ctx)).not.toThrow();
  });
});

describe('bindAnimationToCounter', () => {
  it('tickBindings updates frame based on counter value', () => {
    const engine = new RuleEngine();
    engine.addCounterDefinition(makeCounter('score', 3));

    // Fire the bind action once (alwaysRule will trigger it)
    engine.addRule(alwaysRule('bind', [{
      type: 'bindAnimationToCounter',
      targetId: 'obj1',
      counterName: 'score',
      minFrame: 0,
      maxFrame: 10,
    }]));

    const ctx = makeContext();
    const obj = makeObject('obj1');
    ctx.objects.set('obj1', obj);

    // evaluateAndExecuteRules registers the binding
    engine.evaluateAndExecuteRules(ctx);

    // Change the counter value
    engine.setCounter('score', 7);

    // tickBindings should apply the new counter value to the frame
    engine.tickBindings(ctx);

    expect(obj.currentFrame).toBe(7);
  });
});
