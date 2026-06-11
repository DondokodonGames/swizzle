import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlagConditionEditor } from '../FlagConditionEditor';
import type { TriggerCondition, GameFlag } from '../../../../../types/editor/GameScript';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('../../../../../i18n', () => ({
  default: { t: (k: string) => k },
}));
vi.mock('../../constants/TimeConstants', () => ({
  FLAG_CONDITION_OPTIONS: [
    { value: 'is', label: 'Is On', icon: '🟢', description: 'flag is on' },
    { value: 'not', label: 'Is Off', icon: '🔴', description: 'flag is off' },
  ],
}));

const makeCondition = (overrides: Partial<TriggerCondition> = {}): TriggerCondition & { type: 'flag' } => ({
  type: 'flag',
  flagId: 'flag1',
  condition: 'is',
  ...overrides,
} as any);

const FLAGS: GameFlag[] = [
  { id: 'flag1', name: 'HasKey', initialValue: false },
];

describe('FlagConditionEditor', () => {
  it('renders without crashing', () => {
    render(
      <FlagConditionEditor
        condition={makeCondition()}
        index={0}
        projectFlags={FLAGS}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText('editor.flagCondition.title')).toBeTruthy();
  });

  it('renders flag options in select', () => {
    render(
      <FlagConditionEditor
        condition={makeCondition()}
        index={0}
        projectFlags={FLAGS}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('calls onUpdate when flag select changes', () => {
    const onUpdate = vi.fn();
    render(
      <FlagConditionEditor
        condition={makeCondition()}
        index={1}
        projectFlags={FLAGS}
        onUpdate={onUpdate}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'flag1' } });
    expect(onUpdate).toHaveBeenCalledWith(1, { flagId: 'flag1' });
  });

  it('calls onUpdate when condition type button clicked', () => {
    const onUpdate = vi.fn();
    render(
      <FlagConditionEditor
        condition={makeCondition({ condition: 'is' })}
        index={0}
        projectFlags={FLAGS}
        onUpdate={onUpdate}
      />
    );
    fireEvent.click(screen.getByText('Is Off').closest('button')!);
    expect(onUpdate).toHaveBeenCalledWith(0, { condition: 'not' });
  });
});
