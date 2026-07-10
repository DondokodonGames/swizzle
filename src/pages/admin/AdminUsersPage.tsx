import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { useIsAdmin } from '../../hooks/useIsAdmin';

interface AdminUserRow {
  id: string;
  username: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  game_count: number;
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
  input: {
    width: '100%',
    maxWidth: 400,
    padding: '10px 14px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 20,
  } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', color: '#94a3b8', borderBottom: '1px solid #334155' },
  td: { padding: '8px 12px', borderBottom: '1px solid #1e293b' },
  btn: {
    padding: '6px 12px',
    background: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 6,
  } as React.CSSProperties,
  btnDanger: {
    padding: '6px 12px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 6,
  } as React.CSSProperties,
};

export const AdminUsersPage: React.FC = () => {
  const { user } = useSupabaseUser();
  const { isAdmin, adminLoading } = useIsAdmin(user);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback((q: string) => {
    setLoading(true);
    supabase
      .rpc('admin_search_users', { p_query: q, p_limit: 50 })
      .then(({ data, error }) => {
        if (!error) setUsers((data as AdminUserRow[]) || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isAdmin) load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(query);
  };

  const handleBan = async (u: AdminUserRow) => {
    if (!window.confirm(`${u.username} の公開ゲームを全て非公開にしますか？`)) return;
    setBusyId(u.id);
    const { data, error } = await supabase.rpc('admin_ban_user_games', { p_user_id: u.id });
    setBusyId(null);
    if (error) {
      setMessage(`失敗: ${error.message}`);
    } else {
      setMessage(`${u.username}: ${data}件のゲームを非公開にしました`);
      load(query);
    }
  };

  const handleToggleAdmin = async (u: AdminUserRow) => {
    const next = !u.is_admin;
    if (!window.confirm(`${u.username} の管理者権限を${next ? '付与' : '剥奪'}しますか？`)) return;
    setBusyId(u.id);
    const { error } = await supabase.rpc('admin_set_is_admin', { p_user_id: u.id, p_is_admin: next });
    setBusyId(null);
    if (error) {
      setMessage(`失敗: ${error.message}`);
    } else {
      load(query);
    }
  };

  if (!adminLoading && !isAdmin) {
    return (
      <div style={s.center}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔒 Admin only</div>
        <div style={{ color: '#94a3b8' }}>profiles.is_admin = true のアカウントでログインしてください。</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>👥 ユーザー管理</div>
      <form onSubmit={handleSearch}>
        <input
          style={s.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ユーザー名で検索..."
        />
      </form>
      {message && <div style={{ color: '#fbbf24', marginBottom: 16 }}>{message}</div>}
      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>ユーザー名</th>
              <th style={s.th}>ゲーム数</th>
              <th style={s.th}>登録日</th>
              <th style={s.th}>管理者</th>
              <th style={s.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={s.td}>{u.username}{u.display_name ? ` (${u.display_name})` : ''}</td>
                <td style={s.td}>{u.game_count}</td>
                <td style={s.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={s.td}>{u.is_admin ? '✅' : '—'}</td>
                <td style={s.td}>
                  <button style={s.btnDanger} disabled={busyId === u.id} onClick={() => handleBan(u)}>
                    ゲーム一括非公開
                  </button>
                  <button style={s.btn} disabled={busyId === u.id} onClick={() => handleToggleAdmin(u)}>
                    {u.is_admin ? '管理者を剥奪' : '管理者にする'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td style={s.td} colSpan={5}>該当ユーザーがいません</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminUsersPage;
