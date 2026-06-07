// src/components/editor/GameReviewQueue.tsx
// Supabase から AI 生成ゲームを quality 順に取得してバッチレビューするコンポーネント。
// ローカルJSONアップロード型の ReviewQueue.tsx と同じ操作感（プレイ → 評価 → 次へ）だが
// ゲームリストを Supabase から自動フェッチする。
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EditorGameBridge } from '../../services/editor/EditorGameBridge';
import { supabase } from '../../lib/supabase';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';

interface AiGame {
  id: string;
  title: string;
  ai_quality_score: number | null;
  is_published: boolean;
  created_at: string;
  project_data: GameProject;
}

interface GameReviewQueueProps {
  onExit: () => void;
}

const ISSUE_OPTIONS = [
  '動かない',
  'タッチ反応しない',
  '仕様違い',
  'バランス悪い',
  'ゲームにならない',
  'その他',
];

const qualityColor = (score: number | null): string => {
  if (score === null) return DESIGN_TOKENS.colors.neutral[400];
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

const qualityLabel = (score: number | null): string => {
  if (score === null) return '?';
  if (score >= 75) return `✅ ${score}`;
  if (score >= 60) return `⚠️ ${score}`;
  return `❌ ${score}`;
};

export const GameReviewQueue: React.FC<GameReviewQueueProps> = ({ onExit }) => {
  const [games, setGames] = useState<AiGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'list' | 'playing' | 'feedback' | 'done'>('list');
  const [rating, setRating] = useState<'pass' | 'fix' | 'fail' | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const [filterTab, setFilterTab] = useState<'unreviewed' | 'low' | 'mid' | 'high'>('unreviewed');
  const canvasRef = useRef<HTMLDivElement>(null);
  const bridge = useRef(EditorGameBridge.getInstance());

  // Fetch all AI-generated games (with ai_quality_score)
  useEffect(() => {
    setLoading(true);
    supabase
      .from('user_games')
      .select('id, title, ai_quality_score, is_published, created_at, project_data')
      .not('ai_quality_score', 'is', null)
      .order('ai_quality_score', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          setFetchError(error.message);
        } else {
          setGames((data as AiGame[]) || []);
        }
        setLoading(false);
      });
  }, []);

  const filteredGames = games.filter((g) => {
    const s = g.ai_quality_score;
    if (filterTab === 'low') return s !== null && s < 60;
    if (filterTab === 'mid') return s !== null && s >= 60 && s < 75;
    if (filterTab === 'high') return s !== null && s >= 75;
    // unreviewed = not published
    return !g.is_published;
  });

  const currentGame = filteredGames[index];

  // Launch game when phase becomes 'playing'
  useEffect(() => {
    if (phase !== 'playing' || !currentGame) return;
    let cancelled = false;
    bridge.current.stopGame();

    requestAnimationFrame(async () => {
      if (cancelled || !canvasRef.current) return;
      try {
        await bridge.current.launchFullGame(
          currentGame.project_data,
          canvasRef.current,
          () => { if (!cancelled) setPhase('feedback'); }
        );
      } catch {
        if (!cancelled) setPhase('feedback');
      }
    });

    return () => {
      cancelled = true;
      bridge.current.stopGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, replayCount]);

  const handleStartReview = useCallback(() => {
    setIndex(0);
    setPhase('playing');
  }, []);

  const handleReplay = useCallback(() => {
    bridge.current.stopGame();
    setRating(null);
    setSelectedIssues([]);
    setComment('');
    setPhase('playing');
    setReplayCount((c) => c + 1);
  }, []);

  const handleJudgeNow = useCallback(() => {
    bridge.current.stopGame();
    setPhase('feedback');
  }, []);

  const handleToggleIssue = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!rating || !currentGame) return;
    setSubmitting(true);

    // 合格 → is_published = true
    if (rating === 'pass') {
      const { error } = await supabase
        .from('user_games')
        .update({ is_published: true, updated_at: new Date().toISOString() })
        .eq('id', currentGame.id);
      if (!error) {
        setGames((prev) =>
          prev.map((g) => (g.id === currentGame.id ? { ...g, is_published: true } : g))
        );
      }
    }

    setSubmitting(false);
    const next = index + 1;
    if (next >= filteredGames.length) {
      setPhase('done');
    } else {
      setIndex(next);
      setRating(null);
      setSelectedIssues([]);
      setComment('');
      setPhase('playing');
    }
  }, [rating, currentGame, index, filteredGames.length]);

  const handleSkip = useCallback(() => {
    bridge.current.stopGame();
    const next = index + 1;
    if (next >= filteredGames.length) {
      setPhase('done');
    } else {
      setIndex(next);
      setRating(null);
      setSelectedIssues([]);
      setComment('');
      setPhase('playing');
    }
  }, [index, filteredGames.length]);

  // Inline publish/unpublish from list view
  const handleTogglePublish = useCallback(async (game: AiGame) => {
    setUpdatingId(game.id);
    const next = !game.is_published;
    const { error } = await supabase
      .from('user_games')
      .update({ is_published: next, updated_at: new Date().toISOString() })
      .eq('id', game.id);
    if (!error) {
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, is_published: next } : g))
      );
    }
    setUpdatingId(null);
  }, []);

  // ── Done screen ──────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div style={styles.center}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🎉 レビュー完了</div>
        <div style={{ fontSize: 18, marginBottom: 24 }}>
          {filteredGames.length} ゲームをレビューしました
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <ModernButton variant="primary" size="md" onClick={() => { setPhase('list'); setIndex(0); }}>
            リストに戻る
          </ModernButton>
          <ModernButton variant="secondary" size="md" onClick={onExit}>
            終了
          </ModernButton>
        </div>
      </div>
    );
  }

  // ── Play/Feedback screen ─────────────────────────────────────────────────
  if (phase === 'playing' || phase === 'feedback') {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>🤖 AIゲームレビュー</span>
            <span style={{ color: DESIGN_TOKENS.colors.neutral[400], fontSize: 14 }}>
              {index + 1} / {filteredGames.length}
            </span>
            <span style={{
              fontSize: 13,
              color: DESIGN_TOKENS.colors.neutral[300],
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {currentGame?.title}
            </span>
            {currentGame && (
              <span style={{ fontSize: 13, color: qualityColor(currentGame.ai_quality_score), fontWeight: 600 }}>
                {qualityLabel(currentGame.ai_quality_score)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ModernButton variant="outline" size="sm" onClick={handleReplay}>
              🔄 やり直し
            </ModernButton>
            {phase === 'playing' && (
              <ModernButton variant="outline" size="sm" onClick={handleJudgeNow}>
                📝 途中判定
              </ModernButton>
            )}
            <ModernButton variant="outline" size="sm" onClick={handleSkip}>
              次へ →
            </ModernButton>
            <ModernButton variant="secondary" size="sm" onClick={() => { bridge.current.stopGame(); setPhase('list'); setIndex(0); }}>
              リスト
            </ModernButton>
            <ModernButton variant="secondary" size="sm" onClick={onExit}>
              終了
            </ModernButton>
          </div>
        </div>

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(index / filteredGames.length) * 100}%` }} />
        </div>

        <div style={styles.canvasArea}>
          <div ref={canvasRef} style={styles.canvas} />

          {phase === 'feedback' && (
            <div style={styles.feedbackPanel}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>🎮 プレイ完了 — フィードバック</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['pass', 'fix', 'fail'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      transition: 'all 0.15s ease',
                      background: rating === r
                        ? r === 'pass' ? '#22c55e' : r === 'fix' ? '#f59e0b' : '#ef4444'
                        : DESIGN_TOKENS.colors.neutral[700],
                      color: '#fff',
                      transform: rating === r ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {r === 'pass' ? '✅ 合格（公開する）' : r === 'fix' ? '🔄 要修正' : '❌ 不合格'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ISSUE_OPTIONS.map((issue) => (
                  <button
                    key={issue}
                    onClick={() => handleToggleIssue(issue)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: selectedIssues.includes(issue)
                        ? DESIGN_TOKENS.colors.primary[600]
                        : DESIGN_TOKENS.colors.neutral[700],
                      color: '#fff',
                    }}
                  >
                    {issue}
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="メモ（任意）"
                style={{
                  width: '100%',
                  backgroundColor: DESIGN_TOKENS.colors.neutral[700],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[600]}`,
                  borderRadius: 8,
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
                rows={3}
              />

              <ModernButton
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={!rating || submitting}
                style={{ width: '100%' }}
              >
                {submitting ? '保存中...' : `次へ → (${index + 1}/${filteredGames.length})`}
              </ModernButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view (default) ─────────────────────────────────────────────────
  const tabs: { key: typeof filterTab; label: string; count: number }[] = [
    { key: 'unreviewed', label: '未公開', count: games.filter((g) => !g.is_published).length },
    { key: 'low',        label: '❌ <60',  count: games.filter((g) => g.ai_quality_score !== null && g.ai_quality_score < 60).length },
    { key: 'mid',        label: '⚠️ 60-74', count: games.filter((g) => g.ai_quality_score !== null && g.ai_quality_score >= 60 && g.ai_quality_score < 75).length },
    { key: 'high',       label: '✅ ≥75',  count: games.filter((g) => g.ai_quality_score !== null && g.ai_quality_score >= 75).length },
  ];

  return (
    <div style={{ ...styles.root, overflow: 'auto' }}>
      <div style={styles.header}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🤖 AIゲームレビュー</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {filteredGames.length > 0 && (
            <ModernButton variant="primary" size="sm" onClick={handleStartReview}>
              ▶ レビュー開始（{filteredGames.length}件）
            </ModernButton>
          )}
          <ModernButton variant="secondary" size="sm" onClick={onExit}>
            終了
          </ModernButton>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[700]}`, paddingLeft: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilterTab(tab.key); setIndex(0); }}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: filterTab === tab.key ? `2px solid ${DESIGN_TOKENS.colors.primary[500]}` : '2px solid transparent',
              color: filterTab === tab.key ? '#fff' : DESIGN_TOKENS.colors.neutral[400],
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: filterTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading && (
        <div style={styles.center}>
          <div>読み込み中...</div>
        </div>
      )}
      {fetchError && (
        <div style={{ padding: 20, color: '#ef4444' }}>エラー: {fetchError}</div>
      )}

      {!loading && !fetchError && filteredGames.length === 0 && (
        <div style={styles.center}>
          <div style={{ color: DESIGN_TOKENS.colors.neutral[400] }}>該当するゲームがありません</div>
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredGames.map((game, i) => (
          <div
            key={game.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: DESIGN_TOKENS.colors.neutral[800],
              borderRadius: 8,
              border: `1px solid ${DESIGN_TOKENS.colors.neutral[700]}`,
            }}
          >
            <span style={{
              minWidth: 52,
              fontWeight: 700,
              fontSize: 13,
              color: qualityColor(game.ai_quality_score),
            }}>
              {game.ai_quality_score ?? '?'}点
            </span>
            <span style={{
              flex: 1,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {game.title}
            </span>
            <span style={{ fontSize: 12, color: DESIGN_TOKENS.colors.neutral[400], flexShrink: 0 }}>
              {new Date(game.created_at).toLocaleDateString('ja-JP')}
            </span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              background: game.is_published ? '#16a34a33' : DESIGN_TOKENS.colors.neutral[700],
              color: game.is_published ? '#4ade80' : DESIGN_TOKENS.colors.neutral[400],
              flexShrink: 0,
            }}>
              {game.is_published ? '公開中' : '非公開'}
            </span>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => { setIndex(i); setPhase('playing'); }}
            >
              ▶ プレイ
            </ModernButton>
            <ModernButton
              variant={game.is_published ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => handleTogglePublish(game)}
              disabled={updatingId === game.id}
            >
              {updatingId === game.id ? '...' : game.is_published ? '非公開にする' : '公開する'}
            </ModernButton>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: DESIGN_TOKENS.colors.neutral[900],
    color: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: DESIGN_TOKENS.colors.neutral[800],
    borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[700]}`,
    flexShrink: 0,
  },
  progressBar: {
    height: 4,
    backgroundColor: DESIGN_TOKENS.colors.neutral[700],
    flexShrink: 0,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DESIGN_TOKENS.colors.primary[500],
    transition: 'width 0.3s ease',
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    overflow: 'hidden',
    backgroundColor: DESIGN_TOKENS.colors.neutral[900],
    padding: 16,
  },
  canvas: {
    width: '100%',
    maxWidth: '360px',
    height: '640px',
    flexShrink: 0,
    position: 'relative',
    borderRadius: DESIGN_TOKENS.borderRadius.lg,
    boxShadow: DESIGN_TOKENS.shadows.xl,
    overflow: 'hidden',
  },
  feedbackPanel: {
    width: 360,
    height: '640px',
    flexShrink: 0,
    backgroundColor: DESIGN_TOKENS.colors.neutral[800],
    borderRadius: DESIGN_TOKENS.borderRadius.lg,
    border: `1px solid ${DESIGN_TOKENS.colors.neutral[700]}`,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
};
