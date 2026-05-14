import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectManager } from '../EffectManager';
import { RuleExecutionContext, GameObject } from '../types';

function makeContext(objects: Record<string, Partial<GameObject>> = {}): RuleExecutionContext {
  const map = new Map<string, GameObject>();
  for (const [id, overrides] of Object.entries(objects)) {
    map.set(id, {
      id, x: 0, y: 0, width: 100, height: 100,
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
// Flash endEffect: baseOpacity 復元（修正済みバグ）
// ──────────────────────────────────────────────

describe('EffectManager – Flash endEffect baseOpacity 復元（修正済みバグ）', () => {
  it('flashエフェクト終了後に alpha が baseOpacity に復元される', () => {
    const manager = new EffectManager();
    const ctx = makeContext({ obj: {} });
    const obj = ctx.objects.get('obj')!;

    // baseOpacity を 0.5 に設定してフラッシュエフェクトを模擬
    obj.baseOpacity = 0.5;
    obj.effectType = 'flash' as any;
    obj.effectStartTime = performance.now() - 9999; // 十分に過去 → 即終了
    obj.effectDuration = 100;
    obj.flashValue = 0.8;

    manager.updateEffects(ctx);

    // endEffect が呼ばれ alpha が baseOpacity に戻る
    expect(obj.alpha).toBe(0.5);
    expect(obj.baseOpacity).toBeUndefined();
    expect(obj.flashValue).toBe(0);
    expect(obj.effectType).toBeUndefined();
  });

  it('baseOpacity が未設定の場合は alpha を変更しない', () => {
    const manager = new EffectManager();
    const ctx = makeContext({ obj: {} });
    const obj = ctx.objects.get('obj')!;

    obj.effectType = 'flash' as any;
    obj.effectStartTime = performance.now() - 9999;
    obj.effectDuration = 100;
    obj.flashValue = 0.5;
    // baseOpacity は設定しない

    manager.updateEffects(ctx);

    expect(obj.flashValue).toBe(0);
    expect(obj.effectType).toBeUndefined();
    // alpha は undefined のまま（変更なし）
    expect(obj.alpha).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// reset: エフェクト状態クリア（修正済みバグ）
// ──────────────────────────────────────────────

describe('EffectManager – reset', () => {
  it('reset 後にすべてのエフェクトプロパティがクリアされる', () => {
    const manager = new EffectManager();
    const ctx = makeContext({ obj: {} });
    const obj = ctx.objects.get('obj')!;

    // エフェクト状態を設定
    obj.effectType = 'shake' as any;
    obj.effectStartTime = performance.now();
    obj.effectDuration = 500;
    obj.shakeOffsetX = 3;
    obj.shakeOffsetY = -2;
    obj.baseOpacity = 0.8;
    obj.flashValue = 0.5;
    obj.baseScale = 1.5;

    manager.reset(ctx);

    expect(obj.effectType).toBeUndefined();
    expect(obj.effectStartTime).toBeUndefined();
    expect(obj.effectDuration).toBeUndefined();
    expect(obj.shakeOffsetX).toBeUndefined();
    expect(obj.shakeOffsetY).toBeUndefined();
    expect(obj.baseOpacity).toBeUndefined();
    expect(obj.flashValue).toBeUndefined();
    expect(obj.baseScale).toBeUndefined();
  });

  it('複数オブジェクトのエフェクトが一括クリアされる', () => {
    const manager = new EffectManager();
    const ctx = makeContext({ a: {}, b: {} });

    ctx.objects.get('a')!.effectType = 'flash' as any;
    ctx.objects.get('b')!.effectType = 'shake' as any;

    manager.reset(ctx);

    expect(ctx.objects.get('a')!.effectType).toBeUndefined();
    expect(ctx.objects.get('b')!.effectType).toBeUndefined();
  });
});
