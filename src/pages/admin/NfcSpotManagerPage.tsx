import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';

interface NfcSpot {
  id: string;
  name: string | null;
  game_id: string | null;
  created_at: string;
}

interface PublishedGame {
  id: string;
  title: string;
}

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
  success: {
    color: '#4ade80',
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
  spotId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#94a3b8',
  } as React.CSSProperties,
};

export function NfcSpotManagerPage() {
  const [spots, setSpots] = useState<NfcSpot[]>([]);
  const [games, setGames] = useState<PublishedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 新規作成フォーム
  const [newName, setNewName] = useState('');
  const [newGameId, setNewGameId] = useState('');
  const [creating, setCreating] = useState(false);

  // QR表示対象
  const [qrSpotId, setQrSpotId] = useState<string | null>(null);

  // NFC書き込み状態
  const [nfcWriting, setNfcWriting] = useState<string | null>(null);
  const [nfcMsg, setNfcMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: spotsData }, { data: gamesData }] = await Promise.all([
      supabase.from('nfc_spots').select('id, name, game_id, created_at').order('created_at', { ascending: false }),
      supabase.from('user_games').select('id, title').eq('is_published', true).order('title'),
    ]);
    setSpots(spotsData ?? []);
    setGames(gamesData ?? []);
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
      game_id: newGameId || null,
    });
    setCreating(false);
    if (insertErr) {
      setError('作成に失敗しました: ' + insertErr.message);
      return;
    }
    setNewName('');
    setNewGameId('');
    load();
  };

  const handleGameChange = async (spotId: string, gameId: string) => {
    await supabase.from('nfc_spots').update({ game_id: gameId || null, updated_at: new Date().toISOString() }).eq('id', spotId);
    load();
  };

  const handleDelete = async (spotId: string) => {
    if (!window.confirm(`スポット "${spotId}" を削除しますか？`)) return;
    await supabase.from('nfc_spots').delete().eq('id', spotId);
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
        <p style={s.label}>紐づけるゲーム（任意）</p>
        <select
          style={s.select}
          value={newGameId}
          onChange={(e) => setNewGameId(e.target.value)}
        >
          <option value="">— ゲームを選択 —</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
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
        spots.map((spot) => (
          <div key={spot.id} style={s.card}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{spot.name ?? '(名前なし)'}</p>
            <p style={{ ...s.spotId, margin: '0 0 12px' }}>{spot.id}</p>

            <p style={s.label}>紐づけるゲーム</p>
            <select
              style={s.select}
              value={spot.game_id ?? ''}
              onChange={(e) => handleGameChange(spot.id, e.target.value)}
            >
              <option value="">— 設定なし —</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>

            {/* QRコード表示トグル */}
            {qrSpotId === spot.id ? (
              <div style={{ marginBottom: 12 }}>
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
        ))
      )}
    </div>
  );
}
