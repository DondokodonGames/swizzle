// src/components/editor/review/ReviewFeedbackPanel.tsx
// プレイ完了後のフィードバック入力パネル（評価ボタン・課題タグ・コメント・送信）。
// ReviewQueue / GameReviewQueue で重複していた約70行の UI を共通化（WP33 §4）。
// タイトル・ラベル・プレースホルダ・補助スロットは props で渡し、従来の文言を完全に保持する。
import React from 'react';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernButton } from '../../ui/ModernButton';
import {
  ISSUE_OPTIONS,
  ratingColor,
  DEFAULT_RATING_LABELS,
  type ReviewRating,
  type ReviewRatingLabels,
} from './reviewShared';

export interface ReviewFeedbackPanelProps {
  title: string;
  rating: ReviewRating | null;
  onRate: (r: ReviewRating) => void;
  selectedIssues: string[];
  onToggleIssue: (issue: string) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  commentPlaceholder: string;
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit: () => void;
  /** 評価ボタンのラベル（pass の文言などを差し替え可能） */
  ratingLabels?: ReviewRatingLabels;
  /** タイトル直下に差し込む補助コンテンツ（認証エラー表示 / アセットプレビュー 等） */
  headerSlot?: React.ReactNode;
  /** 送信ボタン直前に差し込む補助コンテンツ（保存エラー表示 等） */
  errorSlot?: React.ReactNode;
}

export const ReviewFeedbackPanel: React.FC<ReviewFeedbackPanelProps> = ({
  title,
  rating,
  onRate,
  selectedIssues,
  onToggleIssue,
  comment,
  onCommentChange,
  commentPlaceholder,
  submitLabel,
  submitDisabled,
  onSubmit,
  ratingLabels = DEFAULT_RATING_LABELS,
  headerSlot,
  errorSlot,
}) => {
  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>

      {headerSlot}

      {/* Rating */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(['pass', 'fix', 'fail'] as const).map((r) => (
          <button
            key={r}
            onClick={() => onRate(r)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.15s ease',
              background: rating === r ? ratingColor(r) : DESIGN_TOKENS.colors.neutral[700],
              color: '#fff',
              transform: rating === r ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {ratingLabels[r]}
          </button>
        ))}
      </div>

      {/* Issues */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ISSUE_OPTIONS.map((issue) => (
          <button
            key={issue}
            onClick={() => onToggleIssue(issue)}
            style={{
              padding: '5px 10px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'background 0.15s',
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
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder={commentPlaceholder}
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

      {errorSlot}

      <ModernButton
        variant="primary"
        size="md"
        onClick={onSubmit}
        disabled={submitDisabled}
        style={{ width: '100%' }}
      >
        {submitLabel}
      </ModernButton>
    </>
  );
};
