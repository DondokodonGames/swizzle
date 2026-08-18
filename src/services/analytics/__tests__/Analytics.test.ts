// WP41: アナリティクス計測フックの挙動を固定する。
// 重点: (1) ベストエフォート（例外を投げない）、(2) バッチ INSERT、(3) session_id 安定、
//       (4) gameId の専用カラム振り分け、(5) startSession の 1 回限り発火。
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockState = vi.hoisted(() => ({
  insertRows: [] as Array<Record<string, unknown>>,
  insertCalls: 0,
  insertShouldReject: false,
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      insert: (rows: Array<Record<string, unknown>>) => {
        mockState.insertCalls++;
        if (mockState.insertShouldReject) return Promise.reject(new Error('boom'));
        mockState.insertRows.push(...rows);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  },
}));

import { track, startSession, _queueSize, _resetForTest, getSessionId_public, setSpotContext, getSpotId } from '../Analytics';

describe('Analytics.track', () => {
  beforeEach(() => {
    mockState.insertRows = [];
    mockState.insertCalls = 0;
    mockState.insertShouldReject = false;
    sessionStorage.clear();
    _resetForTest();
  });

  it('イベントをキューに積む（即時 INSERT はしない）', () => {
    track('like', { gameId: 'g1' });
    expect(_queueSize()).toBe(1);
    expect(mockState.insertCalls).toBe(0);
  });

  it('MAX_BATCH 到達でフラッシュし、gameId を専用カラムに振り分ける', async () => {
    for (let i = 0; i < 20; i++) {
      track('play_start', { gameId: 'g1', index: i });
    }
    // フラッシュは非同期。マイクロタスクを消化する。
    await Promise.resolve();
    await Promise.resolve();

    expect(mockState.insertCalls).toBe(1);
    expect(mockState.insertRows).toHaveLength(20);
    const row = mockState.insertRows[0];
    expect(row.event_type).toBe('play_start');
    expect(row.game_id).toBe('g1');
    // gameId は properties から取り除かれている
    expect((row.properties as Record<string, unknown>).gameId).toBeUndefined();
    expect((row.properties as Record<string, unknown>).index).toBe(0);
    expect(row.user_id).toBeNull();
    expect(typeof row.session_id).toBe('string');
  });

  it('INSERT が失敗してもアプリは壊れない（例外を投げない）', async () => {
    mockState.insertShouldReject = true;
    expect(() => {
      for (let i = 0; i < 20; i++) track('share', { gameId: 'g1', platform: 'twitter' });
    }).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    // キューは drain 済み（無限増殖しない）
    expect(_queueSize()).toBe(0);
  });

  it('session_id は呼び出し間で安定する', () => {
    const a = getSessionId_public();
    const b = getSessionId_public();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('gameId 未指定なら game_id は null', async () => {
    for (let i = 0; i < 20; i++) track('session_start', {});
    await Promise.resolve();
    await Promise.resolve();
    expect(mockState.insertRows[0].game_id).toBeNull();
  });
});

describe('Analytics.startSession', () => {
  beforeEach(() => {
    mockState.insertRows = [];
    sessionStorage.clear();
    _resetForTest();
  });

  it('1 セッションにつき session_start は 1 回のみ', () => {
    startSession();
    startSession();
    startSession();
    expect(_queueSize()).toBe(1);
  });
});

// 拠点(NFCスポット)帰属 — 設置台の数字を拠点別に切り分けるための次元
describe('Analytics 拠点コンテキスト', () => {
  beforeEach(() => {
    mockState.insertRows = [];
    mockState.insertCalls = 0;
    sessionStorage.clear();
    _resetForTest();
  });

  it('拠点コンテキスト未設定なら spot_id は null（通常のWeb流入）', async () => {
    for (let i = 0; i < 20; i++) track('play_start', { gameId: 'g1' });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockState.insertRows[0].spot_id).toBeNull();
  });

  it('setSpotContext 以降の全イベントに spot_id が付く', async () => {
    setSpotContext('spot_abc');
    expect(getSpotId()).toBe('spot_abc');
    for (let i = 0; i < 20; i++) track('play_start', { gameId: 'g1' });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockState.insertRows.every((r) => r.spot_id === 'spot_abc')).toBe(true);
    // spotId は properties に残さない（専用カラムへ振り分け）
    expect((mockState.insertRows[0].properties as Record<string, unknown>).spotId).toBeUndefined();
  });

  it('拠点コンテキストは sessionStorage 経由で復元される', () => {
    setSpotContext('spot_xyz');
    _resetForTest();
    expect(getSpotId()).toBe('spot_xyz');
  });

  it('spotId を明示的に null 指定すればコンテキストを上書きできる', async () => {
    setSpotContext('spot_abc');
    for (let i = 0; i < 20; i++) track('purchase', { gameId: 'g1', spotId: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockState.insertRows[0].spot_id).toBeNull();
  });

  it('setSpotContext(null) でコンテキストを解除できる', () => {
    setSpotContext('spot_abc');
    setSpotContext(null);
    expect(getSpotId()).toBeNull();
  });
});
