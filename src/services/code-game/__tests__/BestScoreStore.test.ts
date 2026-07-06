import { describe, it, expect, beforeEach } from 'vitest';
import { BestScoreStore } from '../BestScoreStore';

describe('BestScoreStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns 0 for an unknown game', () => {
    expect(BestScoreStore.get('nope')).toBe(0);
  });

  it('records a first score without celebrating a new record', () => {
    const r = BestScoreStore.record('g1', 500);
    expect(r).toEqual({ best: 500, isNewRecord: false });
    expect(BestScoreStore.get('g1')).toBe(500);
  });

  it('celebrates only when beating an existing best', () => {
    BestScoreStore.record('g1', 500);
    const worse = BestScoreStore.record('g1', 300);
    expect(worse).toEqual({ best: 500, isNewRecord: false });
    const better = BestScoreStore.record('g1', 900);
    expect(better).toEqual({ best: 900, isNewRecord: true });
    expect(BestScoreStore.get('g1')).toBe(900);
  });

  it('ignores zero, negative and non-finite scores', () => {
    expect(BestScoreStore.record('g1', 0).best).toBe(0);
    expect(BestScoreStore.record('g1', -5).best).toBe(0);
    expect(BestScoreStore.record('g1', NaN).best).toBe(0);
    expect(BestScoreStore.get('g1')).toBe(0);
  });

  it('keys scores per game', () => {
    BestScoreStore.record('g1', 100);
    BestScoreStore.record('g2', 200);
    expect(BestScoreStore.get('g1')).toBe(100);
    expect(BestScoreStore.get('g2')).toBe(200);
  });

  it('handles missing gameId gracefully', () => {
    expect(BestScoreStore.get(undefined)).toBe(0);
    expect(BestScoreStore.record(undefined, 100)).toEqual({ best: 0, isNewRecord: false });
  });

  it('floors fractional scores', () => {
    expect(BestScoreStore.record('g1', 123.9).best).toBe(123);
  });

  it('treats corrupt stored values as 0', () => {
    window.localStorage.setItem('swizzle:best:g1', 'garbage');
    expect(BestScoreStore.get('g1')).toBe(0);
  });
});
