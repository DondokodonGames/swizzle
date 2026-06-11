import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';

export type ColorTheme = 'action' | 'condition';

export const EDITOR_THEME = {
  action: {
    colors: DESIGN_TOKENS.colors.success,
    marginTop: DESIGN_TOKENS.spacing[3],
  },
  condition: {
    colors: DESIGN_TOKENS.colors.purple,
    marginTop: DESIGN_TOKENS.spacing[4],
  },
} as const;
