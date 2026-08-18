import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';

// 拠点(NFCスポット)の運用画面。
// 「どの拠点でどれが当たるか」を取るには、1拠点に複数ゲームを並べて巡回出題し、
// 拠点メタ(業態/客層)で切って比較する必要がある。この画面はその設定と結果表示を担う。
// 集計は admin_spot_stats / admin_spot_game_stats(20260818_venue_analytics.sql)。

interface NfcSpot {
  id: string;
  name: string | null;
  game_id: string | null;   // 【非推奨】ラインナップが空のときだけ使われるフォールバック
  venue_type: string | null;
  audience: string | null;
  area: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
}

interface PublishedGame {
  id: string;
  title: string;
}

interface LineupRow {
  spot_id: string;
  game_id: string;
  sort_order: number;
  enabled: boolean;
}

interface SpotStat {
  spot_id: string;
  sessions: number;
  plays: number;
  plays_per_session: number | null;
  revenue_yen: number | null;
  revenue_per_30d: number | null;
}

interface SpotGameStat {
  spot_id: string;
  game_id: string;
  title: string | null;
  starts: number;
  completion_pct: number | null;
  plays_per_session: number | null;
  revenue_yen: number | null;
}

const VENUE_TYPES = [
  { value: '', label: '— 業態 —' },
  { value: 'izakaya', label: '居酒屋' },
  { value: 'bar', label: 'Bar' },
  { value: 'shokudo', label: '食堂' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'arcade', label: 'ゲームセンター' },
  { value: 'hotel', label: 'ホテル/宿' },
  { value: 'event', label: 'イベント' },
  { value: 'other', label: 'その他' },
];

const AUDIENCES = [
  { value: '', label: '— 客層 —' },
  { value: 'local', label: '地元客' },
  { value: 'inbound', label: '訪日客' },
  { value: 'mixed', label: '混在' },
];

const BASE_URL = window.location.origin;

const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
  } as React.CSSProperties,
  header: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 24,
  } as React.CSSProperties,
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    marginBottom: 12,
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    marginBottom: 12,
  } as React.CSSProperties,
  btn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnSm: {
    padding: '6px 14px',
    background: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    marginRight: 8,
  } as React.CSSProperties,
  btnDanger: {
    padding: '6px 14px',
    background: '#7f1d1d',
    color: '#fca5a5',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  } as React.CSSProperties,
  error: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 12,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginTop: 12,
  } as React.CSSProperties,
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
  } as React.CSSProperties,
  spotId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#94a3b8',
  } as React.CSSProperties,
  statRow: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
    padding: '10px 0',
    borderTop: '1px solid #334155',
    marginTop: 12,
  } as React.CSSProperties,
  statLabel: { fontSize: 11, color: '#94a3b8' } as React.CSSProperties,
  statValue: { fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12, marginTop: 8 },
  th: { textAlign: 'left' as const, padding: '6px 8px', color: '#94a3b8', borderBottom: '1px solid #334155' },
  td: { padding: '6px 8px', borderBottom: '1px solid #0f172a' },
  lineupItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
  } as React.CSSProperties,
};

function fmtYen(n: number | null | undefined): string {
  return `¥${Math.round(Number(n ?? 0)).toLocaleString()}`;
}

export function NfcSpotManagerPage() {
  const [spots, setSpots] = useState<NfcSpot[]>([]);
  const [games, setGames] = useState<PublishedGame[]>([]);
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [spotStats, setSpotStats] = useState<SpotStat[]>([]);
  const [spotGameStats, setSpotGameStats] = useState<SpotGameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 新規作成フォーム
  const [newName, setNewName] = useState('');
  const [newVenueType, setNewVenueType] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newArea, setNewArea] = useState('');
  const [creating, setCreating] = useState(false);

  // QR表示対象
  const [qrSpotId, setQrSpotId] = useState<string | null>(null);

  // NFC書き込み状態
  const [nfcWriting, setNfcWriting] = useState<string | null>(null);
  const [nfcMsg, setNfcMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: spotsData }, { data: gamesData }, { data: lineupData }, statsRes, gameStatsRes] =
      await Promise.all([
        supabase
          .from('nfc_spots')
          .select('id, name, game_id, venue_type, audience, area, active, notes, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('user_games').select('id, title').eq('is_published', true).order('title'),
        supabase.from('nfc_spot_games').select('spot_id, game_id, sort_order, enabled').order('sort_order'),
        // 数字は取れなくても設定作業は続けられるべきなので、失敗しても致命扱いしない
        supabase.rpc('admin_spot_stats', { p_days: 30 }),
        supabase.rpc('admin_spot_game_stats', { p_days: 30, p_min_plays: 0 }),
      ]);
    setSpots((spotsData ?? []) as NfcSpot[]);
    setGames(gamesData ?? []);
    setLineups((lineupData ?? []) as LineupRow[]);
    setSpotStats((statsRes.data ?? []) as SpotStat[]);
    setSpotGameStats((gameStatsRes.data ?? []) as SpotGameStat[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('スポット名を入力してください');
      return;
    }
    setCreating(true);
    setError('');
    const id = 'spot_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const { error: insertErr } = await supabase.from('nfc_spots').insert({
      id,
      name: newName.trim(),
      venue_type: newVenueType || null,
      audience: newAudience || null,
      area: newArea.trim() || null,
    });
    setCreating(false);
    if (insertErr) {
      setError('作成に失敗しました: ' + insertErr.message);
      return;
    }
    setNewName('');
    setNewVenueType('');
    setNewAudience('');
    setNewArea('');
    load();
  };

  const updateSpot = async (spotId: string, patch: Partial<NfcSpot>) => {
    const { error: updErr } = await supabase
      .from('nfc_spots')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', spotId);
    if (updErr) {
      setError('更新に失敗しました: ' + updErr.message);
      return;
    }
    setSpots((prev) => prev.map((sp) => (sp.id === spotId ? { ...sp, ...patch } : sp)));
  };

  const handleDelete = async (spotId: string) => {
    if (!window.confirm(`スポット "${spotId}" を削除しますか？`)) return;
    await supabase.from('nfc_spots').delete().eq('id', spotId);
    load();
  };

  // ---- ラインナップ操作 ----------------------------------------------------
  const lineupOf = (spotId: string) =>
    lineups.filter((l) => l.spot_id === spotId).sort((a, b) => a.sort_order - b.sort_order);

  const handleAddGame = async (spotId: string, gameId: string) => {
    if (!gameId) return;
    const current = lineupOf(spotId);
    if (current.some((l) => l.game_id === gameId)) return;
    const { error: insErr } = await supabase.from('nfc_spot_games').insert({
      spot_id: spotId,
      game_id: gameId,
      sort_order: current.length,
      enabled: true,
    });
    if (insErr) {
      setError('ラインナップ追加に失敗しました: ' + insErr.message);
      return;
    }
    load();
  };

  const handleRemoveGame = async (spotId: string, gameId: string) => {
    await supabase.from('nfc_spot_games').delete().eq('spot_id', spotId).eq('game_id', gameId);
    load();
  };

  const handleToggleGame = async (spotId: string, gameId: string, enabled: boolean) => {
    await supabase
      .from('nfc_spot_games')
      .update({ enabled })
      .eq('spot_id', spotId)
      .eq('game_id', gameId);
    setLineups((prev) =>
      prev.map((l) => (l.spot_id === spotId && l.game_id === gameId ? { ...l, enabled } : l))
    );
  };

  const handleMoveGame = async (spotId: string, gameId: string, direction: -1 | 1) => {
    const current = lineupOf(spotId);
    const idx = current.findIndex((l) => l.game_id === gameId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= current.length) return;
    const a = current[idx];
    const b = current[swapIdx];
    await Promise.all([
      supabase.from('nfc_spot_games').update({ sort_order: b.sort_order }).eq('spot_id', spotId).eq('game_id', a.game_id),
      supabase.from('nfc_spot_games').update({ sort_order: a.sort_order }).eq('spot_id', spotId).eq('game_id', b.game_id),
    ]);
    load();
  };

  const handleWriteNfc = async (spotId: string) => {
    const url = `${BASE_URL}/nfc/${spotId}`;
    if (!('NDEFReader' in window)) {
      setNfcMsg('このブラウザはWeb NFC APIに対応していません（Android Chrome が必要です）');
      return;
    }
    setNfcWriting(spotId);
    setNfcMsg('NFCタグにかざしてください...');
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [{ recordType: 'url', data: url }] });
      setNfcMsg(`書き込み完了: ${url}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNfcMsg('書き込み失敗: ' + msg);
    } finally {
      setNfcWriting(null);
    }
  };

  const spotUrl = (id: string) => `${BASE_URL}/nfc/${id}`;
  const titleOf = (gameId: string) => games.find((g) => g.id === gameId)?.title ?? gameId;

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.header}>NFCスポット管理</h1>

      {/* 新規作成 */}
      <div style={s.card}>
        <p style={{ fontWeight: 600, marginTop: 0, marginBottom: 16 }}>新しいスポットを作成</p>
        {error && <p style={s.error}>{error}</p>}
        <p style={s.label}>スポット名（設置場所メモ）</p>
        <input
          style={s.input}
          placeholder="例: 渋谷店 入口"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div style={s.grid3}>
          <div>
            <p style={s.label}>業態</p>
            <select style={s.select} value={newVenueType} onChange={(e) => setNewVenueType(e.target.value)}>
              {VENUE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <p style={s.label}>客層</p>
            <select style={s.select} value={newAudience} onChange={(e) => setNewAudience(e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <p style={s.label}>エリア</p>
            <input style={s.input} placeholder="例: 浅草" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
          </div>
        </div>
        <button style={s.btn} onClick={handleCreate} disabled={creating}>
          {creating ? '作成中...' : 'スポットを作成'}
        </button>
      </div>

      {/* NFC書き込み結果 */}
      {nfcMsg && (
        <div style={s.card}>
          <p style={{ margin: 0, color: nfcMsg.includes('完了') ? '#4ade80' : '#f87171', fontSize: 13 }}>
            {nfcMsg}
          </p>
        </div>
      )}

      {/* スポット一覧 */}
      {spots.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>スポットがまだありません</p>
      ) : (
        spots.map((spot) => {
          const lineup = lineupOf(spot.id);
          const stat = spotStats.find((st) => st.spot_id === spot.id);
          const perGame = spotGameStats.filter((st) => st.spot_id === spot.id);
          const addable = games.filter((g) => !lineup.some((l) => l.game_id === g.id));

          return (
            <div key={spot.id} style={{ ...s.card, opacity: spot.active ? 1 : 0.6 }}>
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{spot.name ?? '(名前なし)'}</p>
              <p style={{ ...s.spotId, margin: '0 0 12px' }}>{spot.id}</p>

              {/* 拠点メタ */}
              <div style={s.grid3}>
                <div>
                  <p style={s.label}>業態</p>
                  <select
                    style={s.select}
                    value={spot.venue_type ?? ''}
                    onChange={(e) => updateSpot(spot.id, { venue_type: e.target.value || null })}
                  >
                    {VENUE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={s.label}>客層</p>
                  <select
                    style={s.select}
                    value={spot.audience ?? ''}
                    onChange={(e) => updateSpot(spot.id, { audience: e.target.value || null })}
                  >
                    {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={s.label}>エリア</p>
                  <input
                    style={s.input}
                    value={spot.area ?? ''}
                    onChange={(e) => setSpots((prev) => prev.map((sp) => sp.id === spot.id ? { ...sp, area: e.target.value } : sp))}
                    onBlur={(e) => updateSpot(spot.id, { area: e.target.value || null })}
                  />
                </div>
              </div>

              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={spot.active}
                  onChange={(e) => updateSpot(spot.id, { active: e.target.checked })}
                />
                稼働中（外すと拠点別集計から除外）
              </label>

              {/* ラインナップ */}
              <p style={s.label}>ラインナップ（タップごとに巡回出題）</p>
              {lineup.length === 0 && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px' }}>
                  未設定（この状態では旧・単体ゲーム設定にフォールバックします）
                </p>
              )}
              {lineup.map((l, i) => (
                <div key={l.game_id} style={s.lineupItem}>
                  <span style={{ ...s.spotId, width: 20 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{titleOf(l.game_id)}</span>
                  <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={l.enabled}
                      onChange={(e) => handleToggleGame(spot.id, l.game_id, e.target.checked)}
                    />
                    有効
                  </label>
                  <button style={s.btnSm} onClick={() => handleMoveGame(spot.id, l.game_id, -1)} disabled={i === 0}>↑</button>
                  <button style={s.btnSm} onClick={() => handleMoveGame(spot.id, l.game_id, 1)} disabled={i === lineup.length - 1}>↓</button>
                  <button style={s.btnDanger} onClick={() => handleRemoveGame(spot.id, l.game_id)}>外す</button>
                </div>
              ))}
              <select
                style={{ ...s.select, marginTop: 8 }}
                value=""
                onChange={(e) => handleAddGame(spot.id, e.target.value)}
              >
                <option value="">＋ ゲームを追加</option>
                {addable.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>

              {/* 直近30日の数字 */}
              <div style={s.statRow}>
                <div>
                  <div style={s.statLabel}>セッション(30日)</div>
                  <div style={s.statValue}>{stat?.sessions ?? 0}</div>
                </div>
                <div>
                  <div style={s.statLabel}>プレイ(30日)</div>
                  <div style={s.statValue}>{stat?.plays ?? 0}</div>
                </div>
                <div>
                  <div style={s.statLabel}>プレイ/セッション</div>
                  <div style={s.statValue}>{stat?.plays_per_session ?? '—'}</div>
                </div>
                <div>
                  <div style={s.statLabel}>売上(30日)</div>
                  <div style={s.statValue}>{fmtYen(stat?.revenue_yen)}</div>
                </div>
              </div>

              {perGame.length > 0 && (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>ゲーム</th>
                      <th style={s.th}>プレイ</th>
                      <th style={s.th}>完走率</th>
                      <th style={s.th}>プレイ/セッション</th>
                      <th style={s.th}>売上</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perGame.map((st) => (
                      <tr key={st.game_id}>
                        <td style={s.td}>{st.title ?? titleOf(st.game_id)}</td>
                        <td style={s.td}>{st.starts}</td>
                        <td style={s.td}>{st.completion_pct ?? '—'}%</td>
                        <td style={s.td}>{st.plays_per_session ?? '—'}</td>
                        <td style={s.td}>{fmtYen(st.revenue_yen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* QRコード表示トグル */}
              {qrSpotId === spot.id ? (
                <div style={{ marginTop: 12 }}>
                  <QRCodeSVG value={spotUrl(spot.id)} size={160} />
                  <p style={{ ...s.spotId, marginTop: 8 }}>{spotUrl(spot.id)}</p>
                  <button style={s.btnSm} onClick={() => setQrSpotId(null)}>閉じる</button>
                </div>
              ) : null}

              <div style={s.row}>
                <button style={s.btnSm} onClick={() => setQrSpotId(qrSpotId === spot.id ? null : spot.id)}>
                  QRコード
                </button>
                <button
                  style={s.btnSm}
                  onClick={() => handleWriteNfc(spot.id)}
                  disabled={nfcWriting === spot.id}
                >
                  {nfcWriting === spot.id ? '書き込み中...' : 'NFCタグに書き込む'}
                </button>
                <button style={s.btnDanger} onClick={() => handleDelete(spot.id)}>
                  削除
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
