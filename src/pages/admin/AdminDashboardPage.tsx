import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useIsAdmin } from '../../hooks/useIsAdmin';

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
  cardRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 16, marginBottom: 32 },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 20,
    minWidth: 160,
  } as React.CSSProperties,
  cardLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 6 } as React.CSSProperties,
  cardValue: { fontSize: 28, fontWeight: 700 } as React.CSSProperties,
  section: { marginBottom: 32 } as React.CSSProperties,
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', color: '#94a3b8', borderBottom: '1px solid #334155' },
  td: { padding: '8px 12px', borderBottom: '1px solid #1e293b' },
};

function fmtYen(n: number | null): string {
  if (n === null || n === undefined) return '¥0';
  return `¥${Math.round(n).toLocaleString()}`;
}

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, adminLoading } = useIsAdmin(user);
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<any>(null);
  const [monetization, setMonetization] = useState<any>(null);
  const [dau, setDau] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [revenueByGame, setRevenueByGame] = useState<any[]>([]);
  const [revenueByMethod, setRevenueByMethod] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);

    Promise.all([
      supabase.rpc('admin_dau_stats', { p_days: 30 }),
      supabase.rpc('admin_funnel_stats', { p_days: 30 }),
      supabase.rpc('admin_monetization_funnel', { p_days: 30 }),
      supabase.rpc('admin_game_completion_stats', { p_days: 30, p_min_plays: 10 }),
      supabase.rpc('admin_revenue_by_game', { p_days: 30 }),
      supabase.rpc('admin_revenue_by_method', { p_days: 30 }),
    ])
      .then(([dauRes, funnelRes, monetizationRes, gameStatsRes, revGameRes, revMethodRes]) => {
        if (dauRes.error) throw dauRes.error;
        if (funnelRes.error) throw funnelRes.error;
        if (monetizationRes.error) throw monetizationRes.error;
        if (gameStatsRes.error) throw gameStatsRes.error;
        if (revGameRes.error) throw revGameRes.error;
        if (revMethodRes.error) throw revMethodRes.error;

        setDau(dauRes.data || []);
        setFunnel(funnelRes.data?.[0] || null);
        setMonetization(monetizationRes.data?.[0] || null);
        setGameStats((gameStatsRes.data || []).slice(0, 20));
        setRevenueByGame((revGameRes.data || []).slice(0, 20));
        setRevenueByMethod(revMethodRes.data || []);
      })
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!adminLoading && !isAdmin) {
    return (
      <div style={s.center}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔒 Admin only</div>
        <div style={{ color: '#94a3b8' }}>profiles.is_admin = true のアカウントでログインしてください。</div>
      </div>
    );
  }

  const totalRevenue30d = revenueByMethod.reduce((sum, r) => sum + Number(r.revenue_yen || 0), 0);
  const todayDau = dau[0]?.dau_logged_in ?? 0;
  const todaySessions = dau[0]?.active_sessions ?? 0;

  return (
    <div style={s.page}>
      <div style={s.header}>📊 管理ダッシュボード（直近30日）</div>
      {(loading || adminLoading) && <div>読み込み中...</div>}
      {error && <div style={{ color: '#f87171', marginBottom: 16 }}>{error}</div>}

      {!loading && (
        <>
          <div style={s.cardRow}>
            <div style={s.card}>
              <div style={s.cardLabel}>本日のDAU（ログイン）</div>
              <div style={s.cardValue}>{todayDau}</div>
            </div>
            <div style={s.card}>
              <div style={s.cardLabel}>本日のアクティブセッション</div>
              <div style={s.cardValue}>{todaySessions}</div>
            </div>
            <div style={s.card}>
              <div style={s.cardLabel}>30日間の総売上</div>
              <div style={s.cardValue}>{fmtYen(totalRevenue30d)}</div>
            </div>
            {funnel && (
              <div style={s.card}>
                <div style={s.cardLabel}>プレイ到達率</div>
                <div style={s.cardValue}>{funnel.pct_play ?? 0}%</div>
              </div>
            )}
            {monetization && (
              <div style={s.card}>
                <div style={s.cardLabel}>チャージ転換率</div>
                <div style={s.cardValue}>{monetization.topup_conv_pct ?? 0}%</div>
              </div>
            )}
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>DAU / アクティブセッション（日別）</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>日付</th>
                  <th style={s.th}>DAU（ログイン）</th>
                  <th style={s.th}>アクティブセッション</th>
                </tr>
              </thead>
              <tbody>
                {dau.slice(0, 14).map((d) => (
                  <tr key={d.day}>
                    <td style={s.td}>{d.day}</td>
                    <td style={s.td}>{d.dau_logged_in}</td>
                    <td style={s.td}>{d.active_sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>収益手段別の内訳</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>手段</th>
                  <th style={s.th}>件数</th>
                  <th style={s.th}>売上</th>
                </tr>
              </thead>
              <tbody>
                {revenueByMethod.map((r) => (
                  <tr key={r.method}>
                    <td style={s.td}>{r.method}</td>
                    <td style={s.td}>{r.purchase_count}</td>
                    <td style={s.td}>{fmtYen(r.revenue_yen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>ゲーム別売上ランキング（NFC/QR課金）</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ゲーム</th>
                  <th style={s.th}>購入件数</th>
                  <th style={s.th}>売上</th>
                </tr>
              </thead>
              <tbody>
                {revenueByGame.map((r) => (
                  <tr key={r.game_id}>
                    <td style={s.td}>{r.title || r.game_id}</td>
                    <td style={s.td}>{r.purchase_count}</td>
                    <td style={s.td}>{fmtYen(r.revenue_yen)}</td>
                  </tr>
                ))}
                {revenueByGame.length === 0 && (
                  <tr><td style={s.td} colSpan={3}>データがありません</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>ゲーム別 完走率・スキップ率（母数10プレイ以上）</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ゲーム</th>
                  <th style={s.th}>プレイ数</th>
                  <th style={s.th}>完走率</th>
                  <th style={s.th}>スキップ率</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((g) => (
                  <tr key={g.game_id}>
                    <td style={s.td}>{g.title || g.game_id}</td>
                    <td style={s.td}>{g.starts}</td>
                    <td style={s.td}>{g.completion_pct ?? '-'}%</td>
                    <td style={s.td}>{g.skip_pct ?? '-'}%</td>
                  </tr>
                ))}
                {gameStats.length === 0 && (
                  <tr><td style={s.td} colSpan={4}>データがありません</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
