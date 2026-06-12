// src/components/editor/GameReviewQueue.tsx
// Supabase から AI 生成ゲームを quality 順に取得してバッチレビューするコンポーネント。
// ローカルJSONアップロード型の ReviewQueue.tsx と同じ操作感（プレイ → 評価 → 次へ）だが
// ゲームリストを Supabase から自動フェッチする。
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { supabase } from '../../lib/supabase';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';
import { useAuth } from '../../hooks/useAuth';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { reviewStyles } from './review/reviewShared';
import { useReviewFeedback } from './review/useReviewFeedback';
import { useGamePlayback } from './review/useGamePlayback';
import { ReviewFeedbackPanel } from './review/ReviewFeedbackPanel';

interface AiGame {
  id: string;
  title: string;
  ai_quality_score: number | null;
  ai_image_score: number | null;
  review_status: string | null;
  review_notes: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  project_data: GameProject;
}

/** frames は dataUrl（インライン）と storageUrl（Storage最適化済み）の両形式がある */
const frameUrl = (frame: unknown): string | null => {
  const f = frame as { dataUrl?: string; storageUrl?: string } | undefined;
  return f?.dataUrl ?? f?.storageUrl ?? null;
};

/** 背景+各オブジェクトの1フレーム目をサムネイル表示する（プレイせずに画像品質を確認） */
const AssetPreviewGrid: React.FC<{ project: GameProject; size?: number }> = ({ project, size = 48 }) => {
  const previews: { id: string; url: string }[] = [];
  const bg = project?.assets?.background;
  const bgUrl = bg?.frames?.[0] ? frameUrl(bg.frames[0]) : null;
  if (bgUrl) previews.push({ id: 'bg', url: bgUrl });
  for (const obj of project?.assets?.objects ?? []) {
    const url = obj?.frames?.[0] ? frameUrl(obj.frames[0]) : null;
    if (url) previews.push({ id: obj.id, url });
  }
  if (previews.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {previews.map((p) => (
        <img
          key={p.id}
          src={p.url}
          alt={p.id}
          title={p.id}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: 6,
            backgroundColor: DESIGN_TOKENS.colors.neutral[700],
            border: `1px solid ${DESIGN_TOKENS.colors.neutral[600]}`,
          }}
        />
      ))}
    </div>
  );
};

interface GameReviewQueueProps {
  onExit: () => void;
}

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
  const { user } = useAuth();
  const { isAdmin, adminLoading } = useIsAdmin(user);
  const [games, setGames] = useState<AiGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'list' | 'playing' | 'feedback' | 'done'>('list');
  const { rating, setRating, selectedIssues, toggleIssue, comment, setComment, reset: resetFeedback } = useReviewFeedback();
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const [filterTab, setFilterTab] = useState<'pending' | 'low' | 'mid' | 'high'>('pending');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch all AI-generated games
  useEffect(() => {
    setLoading(true);
    supabase
      .from('user_games')
      .select('id, title, ai_quality_score, ai_image_score, review_status, review_notes, thumbnail_url, is_published, created_at, project_data')
      .eq('ai_generated', true)
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
    // pending = 審査待ち（公開ゲートで止まったゲーム）
    return g.review_status === 'pending_review';
  });

  const currentGame = filteredGames[index];

  // ゲーム起動/停止のライフサイクルは共有フックに委譲（WP33 §4）
  const { stopGame } = useGamePlayback({
    canvasRef,
    project: currentGame?.project_data,
    active: phase === 'playing',
    playKey: index,
    replayCount,
    onEnd: () => setPhase('feedback'),
  });

  const handleStartReview = useCallback(() => {
    setIndex(0);
    setPhase('playing');
  }, []);

  const handleReplay = useCallback(() => {
    stopGame();
    resetFeedback();
    setPhase('playing');
    setReplayCount((c) => c + 1);
  }, [stopGame, resetFeedback]);

  const handleJudgeNow = useCallback(() => {
    stopGame();
    setPhase('feedback');
  }, [stopGame]);

  const handleSubmit = useCallback(async () => {
    if (!rating || !currentGame) return;
    setSubmitting(true);
    setUpdateError(null);

    // 課題タグ + コメントをレビューノートとして保存
    const notes = [
      selectedIssues.length > 0 ? `[${selectedIssues.join(', ')}]` : '',
      comment.trim()
    ].filter(Boolean).join(' ') || null;

    const reviewFields = {
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
      review_notes: notes,
      updated_at: new Date().toISOString(),
    };

    // pass → 公開+承認 / fail → 非公開+却下 / fix → pending のままノートだけ保存
    const updateData =
      rating === 'pass' ? { ...reviewFields, is_published: true, review_status: 'approved' }
      : rating === 'fail' ? { ...reviewFields, is_published: false, review_status: 'rejected' }
      : reviewFields;

    const { error } = await supabase
      .from('user_games')
      .update(updateData)
      .eq('id', currentGame.id);

    if (error) {
      setUpdateError(`保存失敗: ${error.message}`);
      setSubmitting(false);
      return;
    }

    setGames((prev) =>
      prev.map((g) => (g.id === currentGame.id ? { ...g, ...updateData } as AiGame : g))
    );

    setSubmitting(false);
    const next = index + 1;
    if (next >= filteredGames.length) {
      setPhase('done');
    } else {
      setIndex(next);
      resetFeedback();
      setPhase('playing');
    }
  }, [rating, currentGame, index, filteredGames.length, selectedIssues, comment, user, resetFeedback]);

  const handleSkip = useCallback(() => {
    stopGame();
    const next = index + 1;
    if (next >= filteredGames.length) {
      setPhase('done');
    } else {
      setIndex(next);
      resetFeedback();
      setPhase('playing');
    }
  }, [index, filteredGames.length, stopGame, resetFeedback]);

  // Inline publish/unpublish from list view
  const handleTogglePublish = useCallback(async (game: AiGame) => {
    setUpdatingId(game.id);
    setUpdateError(null);
    const next = !game.is_published;
    const updateData = next
      ? {
          is_published: true,
          review_status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        }
      : { is_published: false, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('user_games')
      .update(updateData)
      .eq('id', game.id);
    if (error) {
      setUpdateError(`更新失敗: ${error.message}`);
    } else {
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, ...updateData } as AiGame : g))
      );
    }
    setUpdatingId(null);
  }, [user]);

  // ── Admin guard ──────────────────────────────────────────────────────────
  if (!adminLoading && !isAdmin) {
    return (
      <div style={styles.center}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔒 管理者専用</div>
        <div style={{ color: DESIGN_TOKENS.colors.neutral[400], marginBottom: 24, textAlign: 'center' }}>
          AIゲームレビューには管理者権限が必要です。<br />
          （profiles.is_admin = true のアカウントでログインしてください）
        </div>
        <ModernButton variant="secondary" size="md" onClick={onExit}>
          戻る
        </ModernButton>
      </div>
    );
  }

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
            <ModernButton variant="secondary" size="sm" onClick={() => { stopGame(); setPhase('list'); setIndex(0); }}>
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
              <ReviewFeedbackPanel
                title="🎮 プレイ完了 — フィードバック"
                rating={rating}
                onRate={setRating}
                selectedIssues={selectedIssues}
                onToggleIssue={toggleIssue}
                comment={comment}
                onCommentChange={setComment}
                commentPlaceholder="メモ（任意）"
                submitLabel={submitting ? '保存中...' : `次へ → (${index + 1}/${filteredGames.length})`}
                submitDisabled={!rating || submitting}
                onSubmit={handleSubmit}
                ratingLabels={{ pass: '✅ 合格（公開する）', fix: '🔄 要修正', fail: '❌ 不合格' }}
                headerSlot={currentGame ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: DESIGN_TOKENS.colors.neutral[400] }}>
                      🖼️ アセット
                      {currentGame.ai_image_score !== null && (
                        <span style={{ marginLeft: 8, color: qualityColor(currentGame.ai_image_score), fontWeight: 600 }}>
                          画像QA {currentGame.ai_image_score}/100
                        </span>
                      )}
                    </div>
                    <AssetPreviewGrid project={currentGame.project_data} size={44} />
                  </div>
                ) : undefined}
                errorSlot={updateError ? (
                  <div style={{ color: '#ef4444', fontSize: 12 }}>{updateError}</div>
                ) : undefined}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view (default) ─────────────────────────────────────────────────
  const tabs: { key: typeof filterTab; label: string; count: number }[] = [
    { key: 'pending', label: '⏳ 審査待ち', count: games.filter((g) => g.review_status === 'pending_review').length },
    { key: 'low',     label: '❌ <60',  count: games.filter((g) => g.ai_quality_score !== null && g.ai_quality_score < 60).length },
    { key: 'mid',     label: '⚠️ 60-74', count: games.filter((g) => g.ai_quality_score !== null && g.ai_quality_score >= 60 && g.ai_quality_score < 75).length },
    { key: 'high',    label: '✅ ≥75',  count: games.filter((g) => g.ai_quality_score !== null && g.ai_quality_score >= 75).length },
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

      {(loading || adminLoading) && (
        <div style={styles.center}>
          <div>読み込み中...</div>
        </div>
      )}
      {fetchError && (
        <div style={{ padding: 20, color: '#ef4444' }}>エラー: {fetchError}</div>
      )}
      {updateError && (
        <div style={{ padding: '8px 20px', color: '#ef4444', fontSize: 13 }}>{updateError}</div>
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
            {game.ai_image_score !== null && (
              <span style={{
                fontSize: 11,
                color: qualityColor(game.ai_image_score),
                flexShrink: 0,
              }} title="画像QAスコア">
                🖼️{game.ai_image_score}
              </span>
            )}
            <span style={{
              flex: 1,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {game.title}
            </span>
            <AssetPreviewGrid project={game.project_data} size={28} />
            <span style={{ fontSize: 12, color: DESIGN_TOKENS.colors.neutral[400], flexShrink: 0 }}>
              {new Date(game.created_at).toLocaleDateString('ja-JP')}
            </span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              background: game.is_published ? '#16a34a33'
                : game.review_status === 'rejected' ? '#ef444433'
                : game.review_status === 'pending_review' ? '#f59e0b33'
                : DESIGN_TOKENS.colors.neutral[700],
              color: game.is_published ? '#4ade80'
                : game.review_status === 'rejected' ? '#f87171'
                : game.review_status === 'pending_review' ? '#fbbf24'
                : DESIGN_TOKENS.colors.neutral[400],
              flexShrink: 0,
            }}>
              {game.is_published ? '公開中'
                : game.review_status === 'rejected' ? '却下'
                : game.review_status === 'pending_review' ? '審査待ち'
                : '非公開'}
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
  // header / progressBar / progressFill / canvasArea / canvas / feedbackPanel は共有（reviewShared）
  ...reviewStyles,
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: DESIGN_TOKENS.colors.neutral[900],
    color: '#fff',
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
