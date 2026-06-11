import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorCard } from '../EditorCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe('EditorCard', () => {
  it('renders icon and title for action theme', () => {
    render(
      <EditorCard colorTheme="action" icon="🚩" title="Flag Action">
        <span>content</span>
      </EditorCard>
    );
    expect(screen.getByText('🚩')).toBeTruthy();
    expect(screen.getByText('Flag Action')).toBeTruthy();
  });

  it('renders icon and title for condition theme', () => {
    render(
      <EditorCard colorTheme="condition" icon="🎮" title="Game State">
        <span>child content</span>
      </EditorCard>
    );
    expect(screen.getByText('🎮')).toBeTruthy();
    expect(screen.getByText('Game State')).toBeTruthy();
  });

  it('renders children', () => {
    render(
      <EditorCard colorTheme="action" icon="🔊" title="Sound">
        <div data-testid="child">inner</div>
      </EditorCard>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});
