import { describe, it, expect } from 'vitest';
import { PhysicsManager } from '../PhysicsManager';
import { RuleExecutionContext, GameObject } from '../types';

function makeContext(objects: Record<string, Partial<GameObject>> = {}): RuleExecutionContext {
  const map = new Map<string, GameObject>();
  for (const [id, overrides] of Object.entries(objects)) {
    map.set(id, {
      id, x: 0, y: 0, width: 50, height: 50,
      visible: true, animationIndex: 0, animationPlaying: false,
      scale: 1, rotation: 0,
      ...overrides,
    } as GameObject);
  }
  return {
    gameState: {
      isPlaying: true, isPaused: false, score: 0, timeElapsed: 0,
      flags: new Map(), counters: new Map(),
    },
    objects: map,
    events: [],
    canvas: { width: 1080, height: 1920 },
  };
}

// ──────────────────────────────────────────────
// restitution クランプ（修正済みバグ）
// ──────────────────────────────────────────────

describe('PhysicsManager – restitution クランプ（修正済みバグ）', () => {
  const manager = new PhysicsManager();

  it('restitution=2.0 でも反発後の速度が入射速度を超えない（1.0 にクランプされる）', () => {
    // gravity: 1 を使用（0 は falsy で 980 にフォールバックするため小さい非ゼロ値を使う）
    const groundY = 1920 - 50; // canvas.height - obj.height
    const initialVy = 500;
    const ctx = makeContext({
      ball: {
        y: groundY,
        vy: initialVy,
        vx: 0,
        physics: { enabled: true, type: 'dynamic', gravity: 1, airResistance: 0.001, restitution: 2.0, friction: 0.001 } as any,
      },
    });

    manager.updatePhysics(ctx, 1 / 60);

    const ball = ctx.objects.get('ball')!;
    // restitution を 1.0 にクランプするので abs(vy) ≤ initialVy に近い値になる
    // （gravity と airResistance による誤差を 5% 許容）
    expect(Math.abs(ball.vy!)).toBeLessThanOrEqual(initialVy * 1.05);
  });

  it('restitution=2.0 がクランプなしの場合は速度が増幅する（クランプの効果を確認）', () => {
    // gravity=1 で両ケースとも同じ初期条件から比較する
    const groundY = 1920 - 50;
    const initialVy = 500;

    // restitution=2.0（クランプあり）→ vy の絶対値は initialVy × 1 程度
    const ctx1 = makeContext({
      ball: {
        y: groundY, vy: initialVy, vx: 0,
        physics: { enabled: true, type: 'dynamic', gravity: 1, airResistance: 0.001, restitution: 2.0, friction: 0.001 } as any,
      },
    });
    manager.updatePhysics(ctx1, 1 / 60);
    const vyWithClamp = Math.abs(ctx1.objects.get('ball')!.vy!);

    // restitution=1.0（正常値）→ vy の絶対値は initialVy と同程度
    const ctx2 = makeContext({
      ball: {
        y: groundY, vy: initialVy, vx: 0,
        physics: { enabled: true, type: 'dynamic', gravity: 1, airResistance: 0.001, restitution: 1.0, friction: 0.001 } as any,
      },
    });
    manager.updatePhysics(ctx2, 1 / 60);
    const vyNormal = Math.abs(ctx2.objects.get('ball')!.vy!);

    // クランプにより restitution=2.0 も restitution=1.0 と同等の結果になる
    expect(vyWithClamp).toBeCloseTo(vyNormal, 0);
  });

  it('friction=2.0 でも vx がゼロ以下にならない（1.0 にクランプされる）', () => {
    const groundY = 1920 - 50;
    const ctx = makeContext({
      ball: {
        y: groundY,
        vy: 100,
        vx: 50,
        physics: { enabled: true, type: 'dynamic', gravity: 1, airResistance: 0.001, restitution: 0.001, friction: 2.0 } as any,
      },
    });

    manager.updatePhysics(ctx, 1 / 60);

    const ball = ctx.objects.get('ball')!;
    // friction=1.0 にクランプ → vx * (1-1.0) = 0（負にはならない）
    expect(ball.vx).toBeGreaterThanOrEqual(0);
  });
});
