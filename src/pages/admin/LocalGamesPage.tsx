// src/pages/admin/LocalGamesPage.tsx
// src/ai/code/games/ をSupabaseへのアップロード無しでそのまま再生できる管理者向けレビュー画面。
// ビルド時に import.meta.glob(raw)でJSソースをバンドルへ直接埋め込むため、
// dev環境だけでなく Vercel 等のデプロイ先でも(admin権限さえあれば)そのまま動く。
// 量産ラインで Supabase へ本アップロードする前の「まず動くものを見る」ためのステップ。
import React, { useMemo, useState } from 'react';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { CodeGamePlayer } from '../../components/code-game/CodeGamePlayer';
import { CodeGameProject } from '../../types/code-game/SwizzleGameAPI';
import { parseGameHeader, GameHeaderMeta } from '../../ai/code/parseGameHeader';

// ビルド時にファイル内容を文字列として直接バンドルする(実行時fetch無し = Supabase非依存)。
const RAW_MODULES = import.meta.glob('/src/ai/code/games/**/*.js', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface LocalGame {
  path: string;
  filename: string;
  family: string;
  code: string;
  meta: GameHeaderMeta;
}

// 系統フォルダ → 表示ラベル(games:list / games:ledger と同じ対応)
const FAMILY_LABEL: Record<string, string> = {
  shoot: '撃つ', fight: '殴る・斬る', race: '競う速さ', sports: '球技・スポーツ',
  board: '盤・札', luck: '賭け・運', puzzle: '解く', quiz: '答える', run: '走る・跳ぶ',
  rhythm: '音に乗る', fish: '狩る・釣る', sim: '育てる・回す', adv: '探す・選ぶ',
};

function buildGameList(): LocalGame[] {
  const games: LocalGame[] = [];
  for (const path of Object.keys(RAW_MODULES).sort()) {
    const code = RAW_MODULES[path];
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const family = parts[parts.length - 2] ?? '';
    const baseName = filename.replace(/\.js$/, '');
    games.push({ path, filename, family, code, meta: parseGameHeader(code, baseName) });
  }
  return games;
}

function buildProject(game: LocalGame): CodeGameProject {
  const now = new Date().toISOString();
  return {
    id: `local:${game.filename.replace(/\.js$/, '')}`,
    name: game.meta.title,
    gameType: 'code',
    code: game.code,
    settings: {
      duration: { type: 'fixed', seconds: 30 },
      difficulty: 'normal',
      publishing: { isPublished: false, visibility: 'private', allowComments: false, allowRemix: false },
    },
    assets: { background: null, objects: [], audio: { bgm: null, se: [] } },
    generatedBy: 'human',
    createdAt: now,
    lastModified: now,
  };
}

const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
  } as React.CSSProperties,
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
  } as React.CSSProperties,
  header: { fontSize: 22, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
  subheader: { fontSize: 13, color: '#94a3b8', marginBottom: 20 } as React.CSSProperties,
  toolbar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const },
  input: {
    background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 220,
  } as React.CSSProperties,
  select: {
    background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: 8, padding: '8px 12px', fontSize: 14,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  } as React.CSSProperties,
  card: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
    padding: 14, cursor: 'pointer', textAlign: 'left' as const,
  } as React.CSSProperties,
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#94a3b8' },
  backBtn: {
    background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer', marginBottom: 12,
  } as React.CSSProperties,
  gameWrap: {
    width: '100vw', height: '100vh', backgroundColor: '#000',
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const,
  } as React.CSSProperties,
  canvas: { width: '100%', height: '100%', maxWidth: 'calc(100vh * 9 / 16)', position: 'relative' as const } as React.CSSProperties,
  closeBtn: {
    position: 'absolute' as const, top: 12, right: 12, zIndex: 10,
    background: 'rgba(0,0,0,0.6)', color: '#e2e8f0', border: '1px solid #475569',
    borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer',
  } as React.CSSProperties,
} as const;

export const LocalGamesPage: React.FC = () => {
  const { user, loading: userLoading } = useSupabaseUser();
  const { isAdmin, adminLoading } = useIsAdmin(user);

  const allGames = useMemo(() => buildGameList(), []);
  const [query, setQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [selected, setSelected] = useState<LocalGame | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const families = useMemo(() => {
    const set = new Set(allGames.map((g) => g.family));
    return Array.from(set).sort();
  }, [allGames]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allGames.filter((g) => {
      if (familyFilter && g.family !== familyFilter) return false;
      if (!q) return true;
      return (
        g.filename.toLowerCase().includes(q) ||
        g.meta.title.toLowerCase().includes(q) ||
        (g.meta.mechanic ?? '').toLowerCase().includes(q)
      );
    });
  }, [allGames, query, familyFilter]);

  if (!userLoading && !adminLoading && !isAdmin) {
    return (
      <div style={s.center}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔒 Admin only</div>
        <div style={{ color: '#94a3b8' }}>profiles.is_admin = true のアカウントでログインしてください。</div>
      </div>
    );
  }

  if (selected) {
    const project = buildProject(selected);
    return (
      <div style={s.gameWrap}>
        <button style={s.closeBtn} onClick={() => { setSelected(null); setErrorMsg(null); }}>
          ← 一覧へ戻る
        </button>
        <div style={s.canvas}>
          <CodeGamePlayer
            project={project}
            gameId={project.id}
            onEnd={() => { /* ローカル審査モードなので記録しない */ }}
            onError={(msg) => setErrorMsg(msg)}
          />
        </div>
        {errorMsg && (
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: '#f87171', background: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 8 }}>
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>ローカルゲーム再生(Supabase未公開・審査用)</div>
      <div style={s.subheader}>
        src/ai/code/games/ をビルドバンドルから直接再生します。Supabaseへの公開は行いません。
        全{allGames.length}本中 {filtered.length}本を表示。
      </div>
      <div style={s.toolbar}>
        <input
          style={s.input}
          placeholder="タイトル・ファイル名・mechanicで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select style={s.select} value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
          <option value="">全系統</option>
          {families.map((f) => (
            <option key={f} value={f}>{FAMILY_LABEL[f] ?? f}({f})</option>
          ))}
        </select>
      </div>
      <div style={s.grid}>
        {filtered.map((g) => (
          <button key={g.path} style={s.card} onClick={() => setSelected(g)}>
            <div style={s.cardTitle}>{g.meta.title}</div>
            <div style={s.cardMeta}>{FAMILY_LABEL[g.family] ?? g.family} / {g.meta.mechanic ?? '—'}</div>
            <div style={s.cardMeta}>{g.filename}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LocalGamesPage;
