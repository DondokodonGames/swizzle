import React from 'react';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { type ColorTheme, EDITOR_THEME } from './editorTheme';

interface FormLabelProps {
  colorTheme: ColorTheme;
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({ colorTheme, children }) => {
  const { colors } = EDITOR_THEME[colorTheme];
  return (
    <label style={{
      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
      color: colors[800],
      marginBottom: DESIGN_TOKENS.spacing[2],
      display: 'block',
    }}>
      {children}
    </label>
  );
};
