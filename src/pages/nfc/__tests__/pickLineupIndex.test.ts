// 拠点ラインナップの出題順。
// 「どの拠点でどれが当たるか」を比較するには、同一拠点内の各ゲームが
// 比較可能な露出量を得る必要がある。その前提を固定するテスト。
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { pickLineupIndex } from '../lineupRotation';

describe('pickLineupIndex', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ラインナップが空なら 0 を返す', () => {
    expect(pickLineupIndex('spot_a', 0)).toBe(0);
  });

  it('初回はランダムな開始位置（先頭に偏らない）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    expect(pickLineupIndex('spot_a', 4)).toBe(3);
  });

  it('同一端末の2回目以降は +1 で巡回する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickLineupIndex('spot_a', 3)).toBe(0);
    expect(pickLineupIndex('spot_a', 3)).toBe(1);
    expect(pickLineupIndex('spot_a', 3)).toBe(2);
    expect(pickLineupIndex('spot_a', 3)).toBe(0);
  });

  it('拠点ごとに巡回位置が独立している', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    pickLineupIndex('spot_a', 3);
    pickLineupIndex('spot_a', 3);
    expect(pickLineupIndex('spot_b', 3)).toBe(0);
  });

  it('ラインナップが縮んでも範囲外を返さない', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    localStorage.setItem('swizzle_spot_rotation_spot_a', '9');
    const idx = pickLineupIndex('spot_a', 3);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(3);
  });

  it('localStorage が使えなくても例外を投げずランダム出題にフォールバックする', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(() => pickLineupIndex('spot_a', 4)).not.toThrow();
    expect(pickLineupIndex('spot_a', 4)).toBe(2);
  });
});
