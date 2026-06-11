import React from 'react';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernButton } from '../../../ui/ModernButton';
import { type ColorTheme, EDITOR_THEME } from './editorTheme';

export type OptionValue = string | number | boolean;

export interface OptionItem {
  value: OptionValue;
  label: string;
  icon?: string;
}

interface OptionGridProps {
  colorTheme: ColorTheme;
  options: OptionItem[];
  selectedValue: OptionValue | null | undefined;
  onSelect: (value: OptionValue) => void;
  /** minmax width for auto-fit columns (default 140) */
  minWidth?: number;
  /** override gridTemplateColumns entirely */
  columns?: string;
  /** padding on each button (default spacing[3]) */
  buttonPadding?: string;
}

export const OptionGrid: React.FC<OptionGridProps> = ({
  colorTheme,
  options,
  selectedValue,
  onSelect,
  minWidth = 140,
  columns,
  buttonPadding,
}) => {
  const { colors } = EDITOR_THEME[colorTheme];
  const gridTemplateColumns = columns ?? `repeat(auto-fit, minmax(${minWidth}px, 1fr))`;
  const padding = buttonPadding ?? DESIGN_TOKENS.spacing[3];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns,
      gap: DESIGN_TOKENS.spacing[2],
    }}>
      {options.map((option) => {
        const isActive = option.value === selectedValue;
        return (
          <ModernButton
            key={String(option.value)}
            variant={isActive ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onSelect(option.value)}
            style={{
              borderColor: isActive ? colors[500] : colors[200],
              backgroundColor: isActive ? colors[500] : 'transparent',
              color: isActive ? DESIGN_TOKENS.colors.neutral[0] : colors[800],
              padding,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[1],
            }}
          >
            {option.icon && (
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>{option.icon}</span>
            )}
            <span style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              textAlign: 'center',
            }}>
              {option.label}
            </span>
          </ModernButton>
        );
      })}
    </div>
  );
};
