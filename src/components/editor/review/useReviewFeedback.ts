// src/components/editor/review/useReviewFeedback.ts
// レビューのフィードバック入力状態（評価・課題タグ・コメント）を管理する共有フック。
// ReviewQueue / GameReviewQueue で同一だったロジックを抽出（WP33 §4）。
import { useState, useCallback } from 'react';
import type { ReviewRating } from './reviewShared';

export interface ReviewFeedbackState {
  rating: ReviewRating | null;
  setRating: (r: ReviewRating) => void;
  selectedIssues: string[];
  toggleIssue: (issue: string) => void;
  comment: string;
  setComment: (v: string) => void;
  /** 次のゲームへ進む際にフィードバック入力をクリアする */
  reset: () => void;
}

export function useReviewFeedback(): ReviewFeedbackState {
  const [rating, setRating] = useState<ReviewRating | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const toggleIssue = useCallback((issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  }, []);

  const reset = useCallback(() => {
    setRating(null);
    setSelectedIssues([]);
    setComment('');
  }, []);

  return { rating, setRating, selectedIssues, toggleIssue, comment, setComment, reset };
}
