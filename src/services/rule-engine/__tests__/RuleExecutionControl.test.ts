import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../RuleEngine';
import { RuleExecutionContext, GameObject } from '../types';
import { GameRule } from '../../../types/editor/GameScript';

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

function alwaysRule(
  id: string,
  actions: GameRule['actions'],
  execution?: GameRule['execution'],
  priority: number = 50
): GameRule {
  return {
    id,
    name: id,
    enabled: true,
    priority,
    targetObjectId: 'stage',
    triggers: { operator: 'AND', conditions: [] },
    actions,
    execution,
    createdAt: '',
    lastModified: '',
  };
}

describe('RuleExecutionControl – once:true', () => {
  it('fires only once over 5 frames', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('r', [{ type: 'addScore', points: 10 }], { once: true }));
    const ctx = makeContext();

    for (let i = 0; i < 5; i++) {
      ctx.gameState.timeElapsed = i * (1 / 60);
      engine.evaluateAndExecuteRules(ctx);
    }

    expect(ctx.gameState.score).toBe(10);
  });
});

describe('RuleExecutionControl – limit', () => {
  it('fires exactly limit times', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('r', [{ type: 'addScore', points: 1 }], { limit: 3 }));
    const ctx = makeContext();

    for (let i = 0; i < 10; i++) {
      ctx.gameState.timeElapsed = i * (1 / 60);
      engine.evaluateAndExecuteRules(ctx);
    }

    expect(ctx.gameState.score).toBe(3);
  });
});

describe('RuleExecutionControl – cooldown', () => {
  it('blocks at t=0.3 but allows at t=0.6 with cooldown:0.5', () => {
    const engine = new RuleEngine();
    engine.addRule(alwaysRule('r', [{ type: 'addScore', points: 1 }], { cooldown: 0.5 }));

    // Frame 1: t=0 → fires (score=1)
    const ctx = makeContext(0);
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(1);

    // Frame 2: t=0.3 → blocked (within cooldown)
    ctx.gameState.timeElapsed = 0.3;
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(1);

    // Frame 3: t=0.6 → allowed (cooldown elapsed)
    ctx.gameState.timeElapsed = 0.6;
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(2);
  });
});

describe('RuleExecutionControl – blocked rule does not consume touch events', () => {
  it('a once-blocked rule does not consume a touch event so a second rule can still fire', () => {
    const engine = new RuleEngine();

    // Rule 1: once, reacts to touch on 'obj1', adds 100
    const touchRule1: GameRule = {
      id: 'touch-once',
      name: 'touch-once',
      enabled: true,
      priority: 10,
      targetObjectId: 'obj1',
      triggers: {
        operator: 'AND',
        conditions: [{ type: 'touch', target: 'obj1', touchType: 'down' }],
      },
      actions: [{ type: 'addScore', points: 100 }],
      execution: { once: true },
      createdAt: '',
      lastModified: '',
    };

    // Rule 2: no limit, reacts to touch on 'obj1', adds 1
    const touchRule2: GameRule = {
      id: 'touch-always',
      name: 'touch-always',
      enabled: true,
      priority: 20,
      targetObjectId: 'obj1',
      triggers: {
        operator: 'AND',
        conditions: [{ type: 'touch', target: 'obj1', touchType: 'down' }],
      },
      actions: [{ type: 'addScore', points: 1 }],
      createdAt: '',
      lastModified: '',
    };

    engine.addRule(touchRule1);
    engine.addRule(touchRule2);

    const ctx = makeContext(0);
    ctx.events.push({
      type: 'touch',
      timestamp: Date.now(),
      data: { target: 'obj1', touchType: 'down' },
    });

    // Frame 1: both rules fire
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(101);

    // Frame 2: rule1 is blocked (once), but rule2 still fires
    ctx.gameState.timeElapsed = 1 / 60;
    ctx.events.push({
      type: 'touch',
      timestamp: Date.now(),
      data: { target: 'obj1', touchType: 'down' },
    });
    engine.evaluateAndExecuteRules(ctx);
    expect(ctx.gameState.score).toBe(102);
  });
});
