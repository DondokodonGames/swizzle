// src/components/editor/review/reviewShared.ts
// ReviewQueue（ローカルJSON）と GameReviewQueue（Supabase）で共有する
// プレイ→評価→次へ フローの定数・スタイル・型（WP33 §4 / 候補#1: 共通化）。
// データソースだけを各コンポーネントが差し替える。
import React from 'react';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';

export type ReviewRating = 'pass' | 'fix' | 'fail';

/** フィードバックパネルの課題タグ候補（両レビューUIで共通） */
export const ISSUE_OPTIONS = [
  '動かない',
  'タッチ反応しない',
  '仕様違い',
  'バランス悪い',
  'ゲームにならない',
  'その他',
] as const;

/** 評価ボタンのラベル。pass ラベルだけ呼び出し側で差し替えられる（公開/公開する 等）。 */
export interface ReviewRatingLabels {
  pass: string;
  fix: string;
  fail: string;
}

export const DEFAULT_RATING_LABELS: ReviewRatingLabels = {
  pass: '✅ 合格（公開）',
  fix: '🔄 要修正',
  fail: '❌ 不合格',
};

/** 評価に対応する背景色（選択時） */
export const ratingColor = (r: ReviewRating): string =>
  r === 'pass' ? '#22c55e' : r === 'fix' ? '#f59e0b' : '#ef4444';

/**
 * プレイ/フィードバック画面で両レビューUIが共有するスタイル。
 * （root / center はコンポーネントごとに差異があるため共有しない）
 */
export const reviewStyles: Record<string, React.CSSProperties> = {
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
};
