// src/components/editor/review/__tests__/useReviewFeedback.test.ts
// スモークテスト（WP33 §4/§8）: レビューUI共通のフィードバック入力フック。
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReviewFeedback } from '../useReviewFeedback';

describe('useReviewFeedback', () => {
  it('初期状態は未入力', () => {
    const { result } = renderHook(() => useReviewFeedback());
    expect(result.current.rating).toBeNull();
    expect(result.current.selectedIssues).toEqual([]);
    expect(result.current.comment).toBe('');
  });

  it('toggleIssue は課題タグを追加/削除する', () => {
    const { result } = renderHook(() => useReviewFeedback());
    act(() => result.current.toggleIssue('動かない'));
    expect(result.current.selectedIssues).toEqual(['動かない']);
    act(() => result.current.toggleIssue('仕様違い'));
    expect(result.current.selectedIssues).toEqual(['動かない', '仕様違い']);
    act(() => result.current.toggleIssue('動かない'));
    expect(result.current.selectedIssues).toEqual(['仕様違い']);
  });

  it('reset は評価・課題・コメントをすべてクリアする', () => {
    const { result } = renderHook(() => useReviewFeedback());
    act(() => {
      result.current.setRating('pass');
      result.current.toggleIssue('動かない');
      result.current.setComment('メモ');
    });
    expect(result.current.rating).toBe('pass');
    expect(result.current.selectedIssues).toEqual(['動かない']);
    expect(result.current.comment).toBe('メモ');

    act(() => result.current.reset());
    expect(result.current.rating).toBeNull();
    expect(result.current.selectedIssues).toEqual([]);
    expect(result.current.comment).toBe('');
  });
});
