import React from 'react';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { type ColorTheme, EDITOR_THEME } from './editorTheme';

interface SummaryBoxProps {
  colorTheme: ColorTheme;
  children: React.ReactNode;
}

export const SummaryBox: React.FC<SummaryBoxProps> = ({ colorTheme, children }) => {
  const { colors } = EDITOR_THEME[colorTheme];
  return (
    <div style={{
      padding: DESIGN_TOKENS.spacing[3],
      backgroundColor: colors[100],
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
      color: colors[800],
    }}>
      {children}
    </div>
  );
};
