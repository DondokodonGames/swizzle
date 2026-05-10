// src/components/editor/ReviewQueue.tsx
// Batch review queue for admin: load JSON files, play each, submit feedback, export CSV
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EditorGameBridge } from '../../services/editor/EditorGameBridge';
import { ProjectStorageManager } from '../../services/ProjectStorageManager';
import { database } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';

export interface ReviewResult {
  filename: string;
  projectName: string;
  rating: 'pass' | 'fix' | 'fail';
  issues: string[];
  comment: string;
  savedGameId?: string;
}

interface ReviewQueueProps {
  files: File[];
  onDone: (results: ReviewResult[]) => void;
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

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ files, onDone, onExit }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<{ file: File; project: GameProject }[]>([]);
  const [index, setIndex] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'playing' | 'feedback' | 'done'>('loading');
  const [rating, setRating] = useState<'pass' | 'fix' | 'fail' | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const bridge = useRef(EditorGameBridge.getInstance());

  // Parse all JSON files on mount
  useEffect(() => {
    const parsed: { file: File; project: GameProject }[] = [];
    const errors: string[] = [];
    let done = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          // ProjectExportData形式（{project: GameProject}）の場合はアンラップする
          const raw: GameProject = jsonData.project ?? jsonData;
          // Codex生成JSONが settings を持たない場合に補完する
          const project: GameProject = {
            ...raw,
            name: raw.name || raw.settings?.name || file.name.replace('.json', ''),
            settings: Object.assign(
              {
                duration: { type: 'fixed', seconds: 15 },
                difficulty: 'normal',
                publishing: { isPublished: false, visibility: 'public', allowComments: true, allowRemix: false },
                preview: {},
                export: { includeSourceData: false, compressionLevel: 'medium', format: 'json' },
              },
              raw.settings || {},
              {
                name: raw.settings?.name || raw.name || file.name.replace('.json', ''),
                description: raw.settings?.description || raw.description || '',
              }
            ),
            assets: raw.assets || { objects: [], audio: { se: [] } },
            script: raw.script || { rules: [], flags: [], counters: [] },
          };
          parsed.push({ file, project });
        } catch {
          errors.push(file.name);
        }
        done++;
        if (done === files.length) {
          parsed.sort((a, b) => a.file.name.localeCompare(b.file.name));
          setProjects(parsed);
          if (errors.length > 0) {
            setParseError(`解析失敗: ${errors.join(', ')}`);
          }
          setPhase('playing');
        }
      };
      reader.readAsText(file);
    });
  }, [files]);

  // Launch game when index or phase changes to 'playing'
  useEffect(() => {
    if (phase !== 'playing' || projects.length === 0) return;
    const current = projects[index];
    if (!current) return;

    let cancelled = false;
    bridge.current.stopGame();

    // Wait for canvas to be in DOM and laid out
    const launch = () => {
      requestAnimationFrame(async () => {
        if (cancelled || !canvasRef.current) return;
        try {
          await bridge.current.launchFullGame(
            current.project,
            canvasRef.current,
            () => {
              if (!cancelled) setPhase('feedback');
            }
          );
        } catch (err) {
          console.error('[ReviewQueue] ゲーム起動エラー:', err);
          if (!cancelled) setPhase('feedback');
        }
      });
    };
    launch();

    return () => {
      cancelled = true;
      bridge.current.stopGame();
    };
  }, [index, phase, projects, replayCount]);

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
    if (!rating) return;
    setSubmitting(true);

    const current = projects[index];
    const result: ReviewResult = {
      filename: current.file.name,
      projectName: current.project.name || current.project.settings?.name || current.file.name,
      rating,
      issues: selectedIssues,
      comment,
    };

    try {
      if (user) {
        const storage = ProjectStorageManager.getInstance();
        // Inject review metadata and set status for publish
        const projectToSave: GameProject = {
          ...current.project,
          id: current.project.id || crypto.randomUUID(),
          status: rating === 'pass' ? 'published' : 'draft',
          metadata: {
            ...current.project.metadata,
            review: {
              rating,
              issues: selectedIssues,
              comment,
              reviewedAt: new Date().toISOString(),
              reviewerUserId: user.id,
            } as any,
          },
        };

        await storage.saveToDatabase(projectToSave, user.id);
        // Retrieve the DB row id after save
        const saved = await database.userGames.findByProjectId(user.id, projectToSave.id);
        if (saved?.id) result.savedGameId = saved.id;
      }
    } catch (saveErr) {
      console.error('[ReviewQueue] 保存失敗:', saveErr);
      // Save failure is non-blocking — review result is still recorded locally
    }

    setResults((prev) => [...prev, result]);
    setSubmitting(false);

    // Advance to next
    const nextIndex = index + 1;
    if (nextIndex >= projects.length) {
      setPhase('done');
    } else {
      setIndex(nextIndex);
      setRating(null);
      setSelectedIssues([]);
      setComment('');
      setPhase('playing');
    }
  }, [rating, projects, index, selectedIssues, comment, user]);

  const handleSkip = useCallback(() => {
    const current = projects[index];
    setResults((prev) => [
      ...prev,
      {
        filename: current.file.name,
        projectName: current.project.name || current.file.name,
        rating: 'fail',
        issues: ['スキップ'],
        comment: '',
      },
    ]);
    bridge.current.stopGame();
    const nextIndex = index + 1;
    if (nextIndex >= projects.length) {
      setPhase('done');
    } else {
      setIndex(nextIndex);
      setRating(null);
      setSelectedIssues([]);
      setComment('');
      setPhase('playing');
    }
  }, [projects, index]);

  const exportCSV = useCallback(() => {
    const header = 'filename,projectName,rating,issues,comment,savedGameId';
    const rows = results.map((r) =>
      [
        `"${r.filename}"`,
        `"${r.projectName}"`,
        r.rating,
        `"${r.issues.join('|')}"`,
        `"${r.comment.replace(/"/g, '""')}"`,
        r.savedGameId || '',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const passCount = results.filter((r) => r.rating === 'pass').length;
  const fixCount = results.filter((r) => r.rating === 'fix').length;
  const failCount = results.filter((r) => r.rating === 'fail').length;

  if (phase === 'done') {
    return (
      <div style={styles.center}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🎉 レビュー完了</div>
        <div style={{ fontSize: 18, marginBottom: 8 }}>全 {results.length} ゲーム</div>
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <span style={{ color: '#22c55e' }}>✅ 合格 {passCount}</span>
          <span style={{ color: '#f59e0b' }}>🔄 要修正 {fixCount}</span>
          <span style={{ color: '#ef4444' }}>❌ 不合格 {failCount}</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <ModernButton variant="primary" size="md" onClick={exportCSV}>
            📥 CSVエクスポート
          </ModernButton>
          <ModernButton variant="secondary" size="md" onClick={() => onDone(results)}>
            終了
          </ModernButton>
        </div>
      </div>
    );
  }

  const current = projects[index];

  return (
    <div style={styles.root}>
      {/* Loading overlay */}
      {phase === 'loading' && (
        <div style={{ ...styles.overlay }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>📋 JSONを解析中...</div>
          {parseError && <div style={{ color: '#ef4444' }}>{parseError}</div>}
        </div>
      )}

      {/* Header */}
      <div style={{ ...styles.header, visibility: phase === 'loading' ? 'hidden' : 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>📋 バッチレビュー</span>
          <span style={{ color: DESIGN_TOKENS.colors.neutral[400], fontSize: 14 }}>
            {index + 1} / {projects.length}
          </span>
          <span style={{
            fontSize: 13,
            color: DESIGN_TOKENS.colors.neutral[300],
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {current?.project?.name || current?.file?.name || ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {results.length > 0 && (
            <ModernButton variant="secondary" size="sm" onClick={exportCSV}>
              📥 CSV
            </ModernButton>
          )}
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
          <ModernButton variant="secondary" size="sm" onClick={onExit}>
            終了
          </ModernButton>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${((index) / projects.length) * 100}%` }} />
      </div>

      {/* Canvas */}
      <div style={styles.canvasArea}>
        <div ref={canvasRef} style={styles.canvas} />

        {/* Feedback panel — shown after game ends */}
        {phase === 'feedback' && (
          <div style={styles.feedbackPanel}>
            <div style={styles.feedbackTitle}>🎮 プレイ完了 — フィードバックを入力</div>

            {/* Rating */}
            <div style={styles.ratingRow}>
              {(['pass', 'fix', 'fail'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  style={{
                    ...styles.ratingBtn,
                    background: rating === r
                      ? r === 'pass' ? '#22c55e' : r === 'fix' ? '#f59e0b' : '#ef4444'
                      : DESIGN_TOKENS.colors.neutral[700],
                    color: '#fff',
                    transform: rating === r ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {r === 'pass' ? '✅ 合格（公開）' : r === 'fix' ? '🔄 要修正' : '❌ 不合格'}
                </button>
              ))}
            </div>

            {/* Issues */}
            <div style={styles.issueRow}>
              {ISSUE_OPTIONS.map((issue) => (
                <button
                  key={issue}
                  onClick={() => handleToggleIssue(issue)}
                  style={{
                    ...styles.issueBtn,
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

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Codexへのメモ（任意）"
              style={styles.textarea}
              rows={3}
            />

            <ModernButton
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!rating || submitting}
              style={{ width: '100%' }}
            >
              {submitting ? '保存中...' : `次へ → (${index + 1}/${projects.length})`}
            </ModernButton>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative' as const,
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
  feedbackTitle: {
    fontWeight: 600,
    fontSize: 15,
  },
  ratingRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  ratingBtn: {
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.15s ease',
  },
  issueRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  issueBtn: {
    padding: '5px 10px',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'background 0.15s',
  },
  textarea: {
    width: '100%',
    backgroundColor: DESIGN_TOKENS.colors.neutral[700],
    border: `1px solid ${DESIGN_TOKENS.colors.neutral[600]}`,
    borderRadius: 8,
    color: '#fff',
    padding: '10px 12px',
    fontSize: 13,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: DESIGN_TOKENS.colors.neutral[900],
    color: '#fff',
  },
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.colors.neutral[900],
    color: '#fff',
  },
};
