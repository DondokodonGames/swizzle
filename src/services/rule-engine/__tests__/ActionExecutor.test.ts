import { describe, it, expect, beforeEach } from 'vitest';
import { ActionExecutor } from '../ActionExecutor';
import { EffectManager } from '../EffectManager';
import { CounterManager } from '../CounterManager';
import { FlagManager } from '../FlagManager';
import { RuleExecutionContext, GameObject } from '../types';
import { GameRule } from '../../../types/editor/GameScript';
import { GameCounter } from '../../../types/counterTypes';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeContext(objectsMap?: Map<string, GameObject>): RuleExecutionContext {
  return {
    gameState: {
      isPlaying: true,
      isPaused: false,
      score: 0,
      timeElapsed: 0,
      flags: new Map(),
      counters: new Map(),
    },
    objects: objectsMap ?? new Map(),
    events: [],
    canvas: { width: 1080, height: 1920 },
  };
}

function makeObject(id: string, overrides: Partial<GameObject> = {}): GameObject {
  return {
    id,
    x: 100,
    y: 200,
    width: 100,
    height: 100,
    visible: true,
    animationIndex: 0,
    animationPlaying: false,
    scale: 1,
    rotation: 0,
    ...overrides,
  };
}

function makeRule(actions: GameRule['actions']): GameRule {
  return {
    id: 'rule1',
    name: 'Test Rule',
    enabled: true,
    priority: 50,
    targetObjectId: 'obj1',
    triggers: { operator: 'AND', conditions: [] },
    actions,
    createdAt: '',
    lastModified: '',
  };
}

function makeExecutor() {
  const flagManager = new FlagManager();
  const counterManager = new CounterManager();
  counterManager.addCounterDefinition({
    id: 'score', name: 'score', initialValue: 0, currentValue: 0,
    persistence: 'game', createdAt: '', lastModified: '',
  } as GameCounter);
  const effectManager = new EffectManager();
  return { executor: new ActionExecutor(effectManager, counterManager, flagManager), flagManager, counterManager };
}

// ──────────────────────────────────────────────
// ゲーム制御
// ──────────────────────────────────────────────

describe('ActionExecutor – ゲーム制御', () => {
  it('success: pendingEndTime を Date.now()+1000 に設定する', () => {
    const { executor } = makeExecutor();
    const ctx = makeContext();
    const before = Date.now();
    const result = executor.executeActions(makeRule([{ type: 'success' }]), ctx, new Map());
    expect(result.newGameState.pendingEndTime).toBeGreaterThanOrEqual(before + 990);
    expect(result.newGameState.endReason).toBe('success');
  });

  it('success: pendingEndTime が既に設定済みなら上書きしない', () => {
    const { executor } = makeExecutor();
    const ctx = makeContext();
    ctx.gameState.pendingEndTime = 9999999;
    const result = executor.executeActions(makeRule([{ type: 'success' }]), ctx, new Map());
    expect(result.newGameState.pendingEndTime).toBeUndefined();
  });

  it('failure: pendingEndTime を設定し endReason が failure になる', () => {
    const { executor } = makeExecutor();
    const ctx = makeContext();
    const before = Date.now();
    const result = executor.executeActions(makeRule([{ type: 'failure' }]), ctx, new Map());
    expect(result.newGameState.pendingEndTime).toBeGreaterThanOrEqual(before + 990);
    expect(result.newGameState.endReason).toBe('failure');
  });

  it('addScore: スコアを加算する', () => {
    const { executor } = makeExecutor();
    const ctx = makeContext();
    const result = executor.executeActions(makeRule([{ type: 'addScore', points: 10 }]), ctx, new Map());
    expect(result.newGameState.score).toBe(10);
  });

  it('addScore: 既存スコアに加算する', () => {
    const { executor } = makeExecutor();
    const ctx = makeContext();
    ctx.gameState.score = 50;
    const result = executor.executeActions(makeRule([{ type: 'addScore', points: 25 }]), ctx, new Map());
    expect(result.newGameState.score).toBe(75);
  });
});

// ──────────────────────────────────────────────
// 表示制御
// ──────────────────────────────────────────────

describe('ActionExecutor – 表示制御', () => {
  it('show: visible = true にする', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { visible: false });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'show', targetId: 'obj1' }]), ctx, new Map());
    expect(obj.visible).toBe(true);
  });

  it('show: fadeIn 指定時に fadeDirection="in" を設定する', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { visible: false });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'show', targetId: 'obj1', fadeIn: true }]), ctx, new Map());
    expect(obj.fadeDirection).toBe('in');
    expect(obj.alpha).toBe(0);
  });

  it('hide: visible = false にする', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1');
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'hide', targetId: 'obj1' }]), ctx, new Map());
    expect(obj.visible).toBe(false);
  });

  it('hide: fadeOut 指定時に fadeDirection="out" を設定する', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1');
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'hide', targetId: 'obj1', fadeOut: true }]), ctx, new Map());
    expect(obj.fadeDirection).toBe('out');
    expect(obj.visible).toBe(true); // フェード完了後に非表示
  });

  it('show/hide: targetId が存在しない場合は何もしない（エラーなし）', () => {
    const { executor } = makeExecutor();
    const ctx = makeContext();
    expect(() => {
      executor.executeActions(makeRule([{ type: 'show', targetId: 'ghost' }]), ctx, new Map());
    }).not.toThrow();
  });
});

// ──────────────────────────────────────────────
// アニメーション制御
// ──────────────────────────────────────────────

describe('ActionExecutor – アニメーション制御', () => {
  it('switchAnimation: animationIndex を設定する', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1');
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'switchAnimation', targetId: 'obj1', animationIndex: 2 }]), ctx, new Map());
    expect(obj.animationIndex).toBe(2);
  });

  it('switchAnimation: startFrame が未指定なら 0 になる（修正済みバグ）', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { currentFrame: 5 });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'switchAnimation', targetId: 'obj1', animationIndex: 3 }]), ctx, new Map());
    expect(obj.currentFrame).toBe(0); // animationIndex(=3) ではなく 0
  });

  it('switchAnimation: startFrame 指定時はその値を使う', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1');
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'switchAnimation', targetId: 'obj1', animationIndex: 2, startFrame: 4 }]), ctx, new Map());
    expect(obj.currentFrame).toBe(4);
  });

  it('playAnimation: play=true で animationPlaying=true', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { animationPlaying: false });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'playAnimation', targetId: 'obj1', play: true }]), ctx, new Map());
    expect(obj.animationPlaying).toBe(true);
  });

  it('playAnimation: play=false で animationPlaying=false', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { animationPlaying: true });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'playAnimation', targetId: 'obj1', play: false }]), ctx, new Map());
    expect(obj.animationPlaying).toBe(false);
  });

  it('setAnimationSpeed: animationSpeed を設定する', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1');
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'setAnimationSpeed', targetId: 'obj1', speed: 24 }]), ctx, new Map());
    expect(obj.animationSpeed).toBe(24);
  });

  it('setAnimationFrame: currentFrame を設定する', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { currentFrame: 0 });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{ type: 'setAnimationFrame', targetId: 'obj1', frame: 7 }]), ctx, new Map());
    expect(obj.currentFrame).toBe(7);
  });
});

// ──────────────────────────────────────────────
// フラグ/カウンター
// ──────────────────────────────────────────────

describe('ActionExecutor – フラグ/カウンター', () => {
  it('setFlag: フラグを true に設定する', () => {
    const { executor, flagManager } = makeExecutor();
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'setFlag', flagId: 'ready', value: true }]), ctx, new Map());
    expect(flagManager.getFlag('ready')).toBe(true);
  });

  it('setFlag: フラグを false に設定する', () => {
    const { executor, flagManager } = makeExecutor();
    const ctx = makeContext();
    flagManager.setFlag('ready', true);
    executor.executeActions(makeRule([{ type: 'setFlag', flagId: 'ready', value: false }]), ctx, new Map());
    expect(flagManager.getFlag('ready')).toBe(false);
  });

  it('toggleFlag: フラグを反転する', () => {
    const { executor, flagManager } = makeExecutor();
    const ctx = makeContext();
    flagManager.setFlag('active', false);
    executor.executeActions(makeRule([{ type: 'toggleFlag', flagId: 'active' }]), ctx, new Map());
    expect(flagManager.getFlag('active')).toBe(true);
  });

  it('counter/increment: 値が +1 される', () => {
    const { executor, counterManager } = makeExecutor();
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'counter', counterName: 'score', operation: 'increment' }]), ctx, new Map());
    expect(counterManager.getCounter('score')).toBe(1);
  });

  it('counter/add: 値が +N される', () => {
    const { executor, counterManager } = makeExecutor();
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'counter', counterName: 'score', operation: 'add', value: 5 }]), ctx, new Map());
    expect(counterManager.getCounter('score')).toBe(5);
  });

  it('counter/subtract: 値が -N される', () => {
    const { executor, counterManager } = makeExecutor();
    counterManager.setCounter('score', 10);
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'counter', counterName: 'score', operation: 'subtract', value: 3 }]), ctx, new Map());
    expect(counterManager.getCounter('score')).toBe(7);
  });

  it('counter/multiply: 値が ×N される', () => {
    const { executor, counterManager } = makeExecutor();
    counterManager.setCounter('score', 4);
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'counter', counterName: 'score', operation: 'multiply', value: 3 }]), ctx, new Map());
    expect(counterManager.getCounter('score')).toBe(12);
  });

  it('counter/divide: 値が ÷N される（0除算は元値を維持）', () => {
    const { executor, counterManager } = makeExecutor();
    counterManager.setCounter('score', 10);
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'counter', counterName: 'score', operation: 'divide', value: 0 }]), ctx, new Map());
    expect(counterManager.getCounter('score')).toBe(10);
  });

  it('counter/reset: initialValue に戻る', () => {
    const { executor, counterManager } = makeExecutor();
    counterManager.setCounter('score', 99);
    const ctx = makeContext();
    executor.executeActions(makeRule([{ type: 'counter', counterName: 'score', operation: 'reset' }]), ctx, new Map());
    expect(counterManager.getCounter('score')).toBe(0);
  });
});

// ──────────────────────────────────────────────
// 移動
// ──────────────────────────────────────────────

describe('ActionExecutor – 移動', () => {
  it('move/straight (direction): vx/vy が設定される', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1');
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{
      type: 'move', targetId: 'obj1',
      movement: { type: 'straight', direction: 'right', speed: 5 }
    }]), ctx, new Map());
    expect(obj.vx).toBeGreaterThan(0);
    expect(obj.vy).toBe(0);
  });

  it('move/straight (target): moveTargetX/Y が設定される（修正済みバグ）', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { x: 0, y: 0, width: 100, height: 100 });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{
      type: 'move', targetId: 'obj1',
      movement: { type: 'straight', target: { x: 0.5, y: 0.5 }, speed: 3 }
    }]), ctx, new Map());
    expect(obj.moveTargetX).toBeDefined();
    expect(obj.moveTargetY).toBeDefined();
  });

  it('move/teleport: x/y が即座に更新される', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { x: 0, y: 0 });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{
      type: 'move', targetId: 'obj1',
      movement: { type: 'teleport', target: { x: 0.5, y: 0.5 } }
    }]), ctx, new Map());
    expect(obj.x).toBe(1080 * 0.5);
    expect(obj.y).toBe(1920 * 0.5);
  });

  it('move/stop: vx/vy が 0 になる', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { vx: 5, vy: -3 });
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{
      type: 'move', targetId: 'obj1',
      movement: { type: 'stop' }
    }]), ctx, new Map());
    expect(obj.vx).toBe(0);
    expect(obj.vy).toBe(0);
  });

  it('move/stop: moveTargetX/Y がクリアされる（修正済みバグ）', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { vx: 5, vy: -3 } as any);
    (obj as any).moveTargetX = 500;
    (obj as any).moveTargetY = 800;
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{
      type: 'move', targetId: 'obj1',
      movement: { type: 'stop' }
    }]), ctx, new Map());
    expect((obj as any).moveTargetX).toBeUndefined();
    expect((obj as any).moveTargetY).toBeUndefined();
  });

  it('move/stop: arc 移動状態がクリアされる（修正済みバグ）', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', {} as any);
    (obj as any).arcStartTime = Date.now();
    (obj as any).arcDuration = 1000;
    (obj as any).arcTargetX = 300;
    (obj as any).arcTargetY = 600;
    const ctx = makeContext(new Map([['obj1', obj]]));
    executor.executeActions(makeRule([{
      type: 'move', targetId: 'obj1',
      movement: { type: 'stop' }
    }]), ctx, new Map());
    expect((obj as any).arcStartTime).toBeUndefined();
    expect((obj as any).arcDuration).toBeUndefined();
    expect((obj as any).arcTargetX).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// ランダムアクション
// ──────────────────────────────────────────────

describe('ActionExecutor – randomAction', () => {
  it('選択されたアクションの効果が反映される', () => {
    const { executor } = makeExecutor();
    const obj = makeObject('obj1', { visible: true });
    const ctx = makeContext(new Map([['obj1', obj]]));

    // 2択: hideかshow。weights=[1,0]で必ずhideが選ばれる
    const options = [
      { action: { type: 'hide' as const, targetId: 'obj1' } },
      { action: { type: 'show' as const, targetId: 'obj1' } },
    ];
    executor.executeActions(makeRule([{
      type: 'randomAction',
      actions: options,
      weights: [1, 0], // hide=1, show=0 → hide が確実に選ばれる
    }]), ctx, new Map());
    expect(obj.visible).toBe(false);
  });
});
