// src/components/editor/script/ModalDesignConstants.ts
// AdvancedRuleModal用のデザイン定数

export const COLORS = {
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 500: '#8b5cf6', 600: '#7c3aed', 800: '#5b21b6' },
  success: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 500: '#22c55e', 600: '#16a34a', 800: '#166534' },
  warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 800: '#92400e' },
  primary: { 50: '#eff6ff', 200: '#bfdbfe', 500: '#3b82f6', 700: '#1d4ed8', 800: '#1e40af' },
  neutral: { 0: '#ffffff', 50: '#f9fafb', 200: '#e5e7eb', 300: '#d1d5db', 500: '#6b7280', 600: '#4b5563', 700: '#374151' },
  error: { 800: '#991b1b' }
};

export const SPACING = { 
  1: '4px', 
  2: '8px', 
  3: '12px', 
  4: '16px', 
  6: '24px' 
};

export const BORDER_RADIUS = { 
  md: '6px', 
  lg: '8px', 
  xl: '12px', 
  '3xl': '24px', 
  full: '50%' 
};

export const SHADOWS = { 
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', 
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)' 
};

export const Z_INDEX = { 
  modal: 50, 
  notification: 60 
};