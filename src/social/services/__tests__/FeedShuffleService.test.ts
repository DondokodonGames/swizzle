import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashString,
  getUserSeed,
  dailyKey,
  dailyShuffle,
  getPlayedIds,
  markPlayed,
  prioritizeUnplayed,
  interleaveByKey,
  personalizeOrder,
} from '../FeedShuffleService';

const games = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `game-${i}` }));

describe('FeedShuffleService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('hashString', () => {
    it('is deterministic and spreads values', () => {
      expect(hashString('abc')).toBe(hashString('abc'));
      expect(hashString('abc')).not.toBe(hashString('abd'));
    });
  });

  describe('getUserSeed', () => {
    it('prefers the userId when given', () => {
      expect(getUserSeed('user-1')).toBe('user-1');
    });

    it('generates and persists a device seed', () => {
      const seed = getUserSeed();
      expect(seed.length).toBeGreaterThan(5);
      expect(getUserSeed()).toBe(seed); // stable across calls
    });
  });

  describe('dailyShuffle', () => {
    const items = games(30);
    const day = new Date('2026-07-05T12:00:00');

    it('is deterministic for the same seed and day', () => {
      const a = dailyShuffle(items, 'seed-a', day);
      const b = dailyShuffle(items, 'seed-a', day);
      expect(a.map((g) => g.id)).toEqual(b.map((g) => g.id));
    });

    it('produces different orders for different seeds (different users)', () => {
      const a = dailyShuffle(items, 'seed-a', day).map((g) => g.id);
      const b = dailyShuffle(items, 'seed-b', day).map((g) => g.id);
      expect(a).not.toEqual(b);
    });

    it('produces different orders on different days', () => {
      const a = dailyShuffle(items, 'seed-a', day).map((g) => g.id);
      const b = dailyShuffle(items, 'seed-a', new Date('2026-07-06T12:00:00')).map((g) => g.id);
      expect(a).not.toEqual(b);
    });

    it('keeps all items and does not mutate the input', () => {
      const input = games(10);
      const before = input.map((g) => g.id);
      const out = dailyShuffle(input, 's', day);
      expect(input.map((g) => g.id)).toEqual(before);
      expect([...out.map((g) => g.id)].sort()).toEqual([...before].sort());
    });

    it('dailyKey embeds the calendar date', () => {
      expect(dailyKey('s', day)).toBe('s:2026-07-05');
    });
  });

  describe('play history', () => {
    it('starts empty and records plays', () => {
      expect(getPlayedIds().size).toBe(0);
      markPlayed('g1');
      markPlayed('g2');
      expect([...getPlayedIds()]).toEqual(['g1', 'g2']);
    });

    it('moves a replayed game to the most recent position without duplicating', () => {
      markPlayed('g1');
      markPlayed('g2');
      markPlayed('g1');
      expect([...getPlayedIds()]).toEqual(['g2', 'g1']);
    });

    it('prioritizeUnplayed puts unplayed first, keeping relative order', () => {
      const items = games(5);
      const out = prioritizeUnplayed(items, new Set(['game-0', 'game-3']));
      expect(out.map((g) => g.id)).toEqual([
        'game-1', 'game-2', 'game-4', 'game-0', 'game-3',
      ]);
    });
  });

  describe('interleaveByKey', () => {
    it('avoids adjacent items with the same key when possible', () => {
      const items = [
        { id: '1', k: 'tap' }, { id: '2', k: 'tap' }, { id: '3', k: 'tap' },
        { id: '4', k: 'swipe' }, { id: '5', k: 'swipe' }, { id: '6', k: 'hold' },
      ];
      const out = interleaveByKey(items, (i) => i.k);
      expect(out).toHaveLength(6);
      let adjacent = 0;
      for (let i = 1; i < out.length; i++) {
        if (out[i].k === out[i - 1].k) adjacent++;
      }
      // 3 tap / 2 swipe / 1 hold は完全回避可能
      expect(adjacent).toBe(0);
    });

    it('degrades gracefully when one key dominates (keeps all items)', () => {
      const items = [
        { id: '1', k: 'tap' }, { id: '2', k: 'tap' }, { id: '3', k: 'tap' }, { id: '4', k: 'swipe' },
      ];
      const out = interleaveByKey(items, (i) => i.k);
      expect(out.map((i) => i.id).sort()).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('personalizeOrder', () => {
    it('deprioritizes played games and stays deterministic per user/day', () => {
      const items = games(20);
      const day = new Date('2026-07-05T12:00:00');
      markPlayed('game-3');
      markPlayed('game-7');

      const out = personalizeOrder(items, { userId: 'u1', date: day });
      expect(out).toHaveLength(20);
      // プレイ済み2本は末尾側に来る
      const idx3 = out.findIndex((g) => g.id === 'game-3');
      const idx7 = out.findIndex((g) => g.id === 'game-7');
      expect(idx3).toBeGreaterThanOrEqual(18 - 1);
      expect(idx7).toBeGreaterThanOrEqual(18 - 1);

      const again = personalizeOrder(items, { userId: 'u1', date: day });
      expect(again.map((g) => g.id)).toEqual(out.map((g) => g.id));
    });
  });
});
