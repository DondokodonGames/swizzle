import React from 'react';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { type ColorTheme, EDITOR_THEME } from './editorTheme';

interface EditorCardProps {
  colorTheme: ColorTheme;
  icon: string;
  title: string;
  children: React.ReactNode;
}

export const EditorCard: React.FC<EditorCardProps> = ({ colorTheme, icon, title, children }) => {
  const { colors, marginTop } = EDITOR_THEME[colorTheme];
  return (
    <ModernCard
      variant="outlined"
      size="md"
      style={{
        backgroundColor: colors[50],
        border: `2px solid ${colors[200]}`,
        marginTop,
      }}
    >
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.base,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: colors[800],
        margin: 0,
        marginBottom: DESIGN_TOKENS.spacing[4],
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN_TOKENS.spacing[2],
      }}>
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>{icon}</span>
        {title}
      </h5>
      {children}
    </ModernCard>
  );
};
