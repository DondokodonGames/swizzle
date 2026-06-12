import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlagActionEditor } from '../FlagActionEditor';
import type { GameAction, GameFlag } from '../../../../../types/editor/GameScript';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('../../../../../i18n', () => ({
  default: { t: (k: string) => k },
}));

const makeAction = (overrides: Partial<GameAction> = {}): GameAction & { type: 'setFlag' | 'toggleFlag' } => ({
  type: 'setFlag',
  flagId: 'flag1',
  value: true,
  ...overrides,
} as any);

const FLAGS: GameFlag[] = [
  { id: 'flag1', name: 'HasItem', initialValue: false },
];

describe('FlagActionEditor', () => {
  it('renders without crashing', () => {
    render(
      <FlagActionEditor
        action={makeAction()}
        index={0}
        projectFlags={FLAGS}
        onUpdate={vi.fn()}
        onShowNotification={vi.fn()}
      />
    );
    expect(screen.getByText('editor.flagAction.title')).toBeTruthy();
  });

  it('shows warning when no flags exist', () => {
    render(
      <FlagActionEditor
        action={makeAction({ flagId: '' })}
        index={0}
        projectFlags={[]}
        onUpdate={vi.fn()}
        onShowNotification={vi.fn()}
      />
    );
    expect(screen.getByText('editor.flagAction.noFlagsWarning')).toBeTruthy();
  });

  it('calls onUpdate when flag select changes', () => {
    const onUpdate = vi.fn();
    render(
      <FlagActionEditor
        action={makeAction()}
        index={2}
        projectFlags={FLAGS}
        onUpdate={onUpdate}
        onShowNotification={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'flag1' } });
    expect(onUpdate).toHaveBeenCalledWith(2, { flagId: 'flag1' });
  });
});
