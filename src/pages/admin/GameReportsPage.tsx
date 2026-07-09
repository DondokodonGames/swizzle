import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useIsAdmin } from '../../hooks/useIsAdmin';

interface GameReportRow {
  id: string;
  game_id: string;
  reporter_id: string | null;
  reason: string;
  detail: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  user_games: { title: string; is_published: boolean } | null;
}

const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
  } as React.CSSProperties,
  header: { fontSize: 22, fontWeight: 700, marginBottom: 24 } as React.CSSProperties,
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  btn: {
    padding: '8px 16px',
    background: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 8,
  } as React.CSSProperties,
  btnDanger: {
    padding: '8px 16px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 8,
  } as React.CSSProperties,
};

export const GameReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, adminLoading } = useIsAdmin(user);
  const [reports, setReports] = useState<GameReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    supabase
      .from('game_reports')
      .select('id, game_id, reporter_id, reason, detail, status, created_at, user_games(title, is_published)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setReports((data as unknown as GameReportRow[]) || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const unpublishAndResolve = async (report: GameReportRow) => {
    setBusyId(report.id);
    await supabase.from('user_games').update({ is_published: false }).eq('id', report.game_id);
    await supabase
      .from('game_reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq('id', report.id);
    setBusyId(null);
    load();
  };

  const dismiss = async (report: GameReportRow) => {
    setBusyId(report.id);
    await supabase
      .from('game_reports')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq('id', report.id);
    setBusyId(null);
    load();
  };

  if (!adminLoading && !isAdmin) {
    return (
      <div style={s.center}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔒 Admin only</div>
        <div style={{ color: '#94a3b8' }}>
          profiles.is_admin = true のアカウントでログインしてください。
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>🚩 通報キュー（未対応 {reports.length} 件）</div>
      {loading && <div>読み込み中...</div>}
      {!loading && reports.length === 0 && <div style={{ color: '#94a3b8' }}>未対応の通報はありません。</div>}
      {reports.map((r) => (
        <div key={r.id} style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {r.user_games?.title || r.game_id}{' '}
            {r.user_games?.is_published === false && (
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>(非公開済み)</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
            理由: {r.reason}{r.detail ? ` — ${r.detail}` : ''}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            {new Date(r.created_at).toLocaleString()} / game_id: {r.game_id}
          </div>
          <button
            style={s.btnDanger}
            disabled={busyId === r.id}
            onClick={() => unpublishAndResolve(r)}
          >
            非公開にして解決
          </button>
          <button style={s.btn} disabled={busyId === r.id} onClick={() => dismiss(r)}>
            却下（問題なし）
          </button>
        </div>
      ))}
    </div>
  );
};

export default GameReportsPage;
