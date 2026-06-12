// src/components/editor/review/__tests__/ReviewFeedbackPanel.test.tsx
// スモークテスト（WP33 §4/§8）: 共有フィードバックパネルの表示と操作。
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewFeedbackPanel } from '../ReviewFeedbackPanel';
import { ISSUE_OPTIONS } from '../reviewShared';

function setup(overrides: Partial<React.ComponentProps<typeof ReviewFeedbackPanel>> = {}) {
  const props: React.ComponentProps<typeof ReviewFeedbackPanel> = {
    title: 'テストタイトル',
    rating: null,
    onRate: vi.fn(),
    selectedIssues: [],
    onToggleIssue: vi.fn(),
    comment: '',
    onCommentChange: vi.fn(),
    commentPlaceholder: 'メモ',
    submitLabel: '次へ',
    submitDisabled: false,
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<ReviewFeedbackPanel {...props} />);
  return props;
}

describe('ReviewFeedbackPanel', () => {
  it('タイトル・課題タグ・送信ラベルを表示する', () => {
    setup({ title: '🎮 プレイ完了', submitLabel: '次へ → (1/3)' });
    expect(screen.getByText('🎮 プレイ完了')).toBeInTheDocument();
    expect(screen.getByText('次へ → (1/3)')).toBeInTheDocument();
    for (const issue of ISSUE_OPTIONS) {
      expect(screen.getByText(issue)).toBeInTheDocument();
    }
  });

  it('評価ボタンのラベルを差し替えられる', () => {
    setup({ ratingLabels: { pass: '✅ 合格（公開する）', fix: '🔄 要修正', fail: '❌ 不合格' } });
    expect(screen.getByText('✅ 合格（公開する）')).toBeInTheDocument();
  });

  it('評価ボタンと課題タグのクリックでコールバックが呼ばれる', () => {
    const props = setup();
    fireEvent.click(screen.getByText('✅ 合格（公開）'));
    expect(props.onRate).toHaveBeenCalledWith('pass');
    fireEvent.click(screen.getByText('動かない'));
    expect(props.onToggleIssue).toHaveBeenCalledWith('動かない');
  });

  it('submitDisabled で送信ボタンが無効になる', () => {
    setup({ submitLabel: '保存中...', submitDisabled: true });
    expect(screen.getByText('保存中...').closest('button')).toBeDisabled();
  });

  it('headerSlot / errorSlot を表示する', () => {
    setup({
      headerSlot: <div>ヘッダー補助</div>,
      errorSlot: <div>保存失敗</div>,
    });
    expect(screen.getByText('ヘッダー補助')).toBeInTheDocument();
    expect(screen.getByText('保存失敗')).toBeInTheDocument();
  });
});
