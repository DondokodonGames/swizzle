import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionGrid } from '../OptionGrid';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const OPTIONS = [
  { value: 'alpha', label: 'Alpha', icon: '🅰️' },
  { value: 'beta', label: 'Beta', icon: '🅱️' },
];

describe('OptionGrid', () => {
  it('renders all options', () => {
    render(
      <OptionGrid
        colorTheme="action"
        options={OPTIONS}
        selectedValue="alpha"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('calls onSelect with the option value when clicked', () => {
    const onSelect = vi.fn();
    render(
      <OptionGrid
        colorTheme="action"
        options={OPTIONS}
        selectedValue="alpha"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText('Beta').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('beta');
  });

  it('works with boolean option values', () => {
    const boolOptions = [
      { value: true, label: 'On', icon: '🟢' },
      { value: false, label: 'Off', icon: '🔴' },
    ];
    const onSelect = vi.fn();
    render(
      <OptionGrid
        colorTheme="condition"
        options={boolOptions}
        selectedValue={true}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText('Off').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith(false);
  });
});
