import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionDetector } from '../CollisionDetector';
import { RuleExecutionContext, GameObject } from '../types';

function makeContext(objects: Map<string, GameObject>): RuleExecutionContext {
  return {
    gameState: { isPlaying: true, isPaused: false, score: 0, timeElapsed: 0, flags: new Map(), counters: new Map() },
    objects,
    events: [],
    canvas: { width: 1080, height: 1920 },
  };
}

function makeObject(id: string, x: number, y: number, w = 100, h = 100): GameObject {
  return { id, x, y, width: w, height: h, visible: true, animationIndex: 0, animationPlaying: false, scale: 1, rotation: 0 };
}

// ──────────────────────────────────────────────
// AABB 衝突判定
// ──────────────────────────────────────────────

describe('CollisionDetector – AABB 衝突判定', () => {
  let cd: CollisionDetector;

  beforeEach(() => { cd = new CollisionDetector(); });

  it('重なっているオブジェクト同士は enter を検出する', () => {
    const a = makeObject('a', 0, 0);      // (0,0)-(100,100)
    const b = makeObject('b', 50, 50);    // (50,50)-(150,150) → 重なる
    const ctx = makeContext(new Map([['a', a], ['b', b]]));
    const result = cd.evaluateCollisionCondition(
      { type: 'collision', target: 'b', collisionType: 'enter' },
      ctx,
      'a'
    );
    expect(result).toBe(true);
  });

  it('重なっていない場合は false', () => {
    const a = makeObject('a', 0, 0);      // (0,0)-(100,100)
    const b = makeObject('b', 200, 200);  // 離れている
    const ctx = makeContext(new Map([['a', a], ['b', b]]));
    const result = cd.evaluateCollisionCondition(
      { type: 'collision', target: 'b', collisionType: 'enter' },
      ctx,
      'a'
    );
    expect(result).toBe(false);
  });

  it('次フレームも重なっていれば stay を返す', () => {
    const a = makeObject('a', 0, 0);
    const b = makeObject('b', 50, 50);
    const ctx = makeContext(new Map([['a', a], ['b', b]]));

    // 1フレーム目: enter
    cd.evaluateCollisionCondition({ type: 'collision', target: 'b', collisionType: 'enter' }, ctx, 'a');
    cd.updateCollisionCache();

    // 2フレーム目: stay
    const result = cd.evaluateCollisionCondition(
      { type: 'collision', target: 'b', collisionType: 'stay' },
      ctx,
      'a'
    );
    expect(result).toBe(true);
  });

  it('離れたフレームで exit を返す', () => {
    const a = makeObject('a', 0, 0);
    const b = makeObject('b', 50, 50);
    const ctx = makeContext(new Map([['a', a], ['b', b]]));

    // 1フレーム目: 衝突中
    cd.evaluateCollisionCondition({ type: 'collision', target: 'b', collisionType: 'enter' }, ctx, 'a');
    cd.updateCollisionCache();

    // 2フレーム目: bを遠ざける
    b.x = 500;
    b.y = 500;

    const result = cd.evaluateCollisionCondition(
      { type: 'collision', target: 'b', collisionType: 'exit' },
      ctx,
      'a'
    );
    expect(result).toBe(true);
  });

  it('invisible なオブジェクトは衝突しない', () => {
    const a = makeObject('a', 0, 0);
    const b = makeObject('b', 50, 50);
    b.visible = false;
    const ctx = makeContext(new Map([['a', a], ['b', b]]));
    const result = cd.evaluateCollisionCondition(
      { type: 'collision', target: 'b', collisionType: 'enter' },
      ctx,
      'a'
    );
    expect(result).toBe(false);
  });
});

// ──────────────────────────────────────────────
// stageArea 衝突判定
// ──────────────────────────────────────────────

describe('CollisionDetector – stageArea', () => {
  let cd: CollisionDetector;

  beforeEach(() => { cd = new CollisionDetector(); });

  it('stageArea 内に入ったとき enter を検出する', () => {
    const a = makeObject('a', 500, 900); // キャンバス中央付近
    const ctx = makeContext(new Map([['a', a]]));

    // region: (0.4, 0.4) から幅0.2 × 高さ0.2 = キャンバス中央の小さな矩形
    const result = cd.evaluateCollisionCondition({
      type: 'collision',
      target: 'stageArea',
      collisionType: 'enter',
      region: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
    }, ctx, 'a');
    expect(result).toBe(true);
  });

  it('stageArea の外にいれば false', () => {
    const a = makeObject('a', 0, 0); // 左上隅
    const ctx = makeContext(new Map([['a', a]]));

    const result = cd.evaluateCollisionCondition({
      type: 'collision',
      target: 'stageArea',
      collisionType: 'enter',
      region: { x: 0.8, y: 0.8, width: 0.1, height: 0.1 }, // 右下隅
    }, ctx, 'a');
    expect(result).toBe(false);
  });

  it('region が未指定なら false', () => {
    const a = makeObject('a', 0, 0);
    const ctx = makeContext(new Map([['a', a]]));
    const result = cd.evaluateCollisionCondition(
      { type: 'collision', target: 'stageArea', collisionType: 'enter' },
      ctx,
      'a'
    );
    expect(result).toBe(false);
  });
});
