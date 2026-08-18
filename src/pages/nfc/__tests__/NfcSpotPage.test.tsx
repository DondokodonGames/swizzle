// 拠点到着の導線テスト。
// ここが動かないと拠点データは1行も貯まらないので、
// (1) spot コンテキストの設定 (2) 到着計測 (3) ラインナップ巡回出題
// (4) 旧・単体ゲーム設定へのフォールバック を固定する。
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const mockState = vi.hoisted(() => ({
  spot: null as null | { game_id: string | null; active?: boolean },
  lineup: [] as Array<{ game_id: string; sort_order: number; enabled: boolean }>,
  navigated: [] as string[],
  tracked: [] as Array<{ type: string; props: Record<string, unknown> }>,
  spotContext: null as string | null,
}));

vi.mock('../../../lib/supabase', () => {
  const builder = (table: string) => {
    const api: Record<string, unknown> = {};
    const chain = () => api;
    api.select = chain;
    api.eq = chain;
    api.order = () =>
      Promise.resolve({ data: mockState.lineup.filter((l) => l.enabled), error: null });
    api.maybeSingle = () =>
      Promise.resolve({ data: mockState.spot, error: mockState.spot ? null : new Error('not found') });
    return table === 'nfc_spot_games' ? api : api;
  };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }),
        signInAnonymously: () => Promise.resolve({ error: null }),
      },
      from: (table: string) => builder(table),
    },
  };
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ spotId: 'spot_test' }),
  useNavigate: () => (to: string) => mockState.navigated.push(to),
}));

vi.mock('../../../services/analytics/Analytics', () => ({
  track: (type: string, props: Record<string, unknown>) => mockState.tracked.push({ type, props }),
  setSpotContext: (id: string | null) => {
    mockState.spotContext = id;
  },
}));

import { NfcSpotPage } from '../NfcSpotPage';

describe('NfcSpotPage', () => {
  beforeEach(() => {
    mockState.spot = { game_id: null, active: true };
    mockState.lineup = [];
    mockState.navigated = [];
    mockState.tracked = [];
    mockState.spotContext = null;
    localStorage.clear();
  });

  it('到着時に spot コンテキストを張る（以後の全イベントに spot_id が付く前提）', async () => {
    mockState.lineup = [{ game_id: 'g1', sort_order: 0, enabled: true }];
    render(<NfcSpotPage />);
    await waitFor(() => expect(mockState.navigated).toHaveLength(1));
    expect(mockState.spotContext).toBe('spot_test');
  });

  it('ラインナップから出題し、spot_enter を記録してから /play へ送る', async () => {
    mockState.lineup = [
      { game_id: 'g1', sort_order: 0, enabled: true },
      { game_id: 'g2', sort_order: 1, enabled: true },
    ];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<NfcSpotPage />);
    await waitFor(() => expect(mockState.navigated).toHaveLength(1));

    const enter = mockState.tracked.find((t) => t.type === 'spot_enter');
    expect(enter).toBeTruthy();
    expect(enter!.props.lineupSize).toBe(2);
    expect(enter!.props.gameId).toBe('g1');
    expect(mockState.navigated[0]).toBe('/play/g1');
    vi.restoreAllMocks();
  });

  it('ラインナップが空なら旧・単体ゲーム設定にフォールバックする', async () => {
    mockState.spot = { game_id: 'legacy_game', active: true };
    mockState.lineup = [];
    render(<NfcSpotPage />);
    await waitFor(() => expect(mockState.navigated).toHaveLength(1));
    expect(mockState.navigated[0]).toBe('/play/legacy_game');
    expect(mockState.tracked[0].props.lineupSize).toBe(0);
    expect(mockState.tracked[0].props.lineupIndex).toBeNull();
  });

  it('ゲームが1本も無いスポットでは遷移せずエラーを出す', async () => {
    mockState.spot = { game_id: null, active: true };
    mockState.lineup = [];
    const { findByText } = render(<NfcSpotPage />);
    expect(await findByText(/ゲームが設定されていません/)).toBeTruthy();
    expect(mockState.navigated).toHaveLength(0);
  });
});
