// src/components/editor/script/constants/EffectConstants.ts
// Phase C Step 2完了版: エフェクトタイプ詳細定義
// AdvancedRuleModal.tsx分割 - Step 1: エフェクト定数分離

/**
 * Phase C Step 2: エフェクトタイプ詳細定義
 */
export const EFFECT_TYPE_OPTIONS = [
  { value: 'glow', label: '光る', icon: '✨', description: 'オブジェクトを光らせる' },
  { value: 'shake', label: '揺れる', icon: '📳', description: 'オブジェクトを振動させる' },
  { value: 'confetti', label: '紙吹雪', icon: '🎉', description: '紙吹雪エフェクト' },
  { value: 'monochrome', label: 'モノクロ', icon: '⚫⚪', description: 'モノクロ化エフェクト' }
] as const;

/**
 * エフェクトパラメータのデフォルト値
 */
export const EFFECT_DEFAULTS = {
  duration: 1.0,    // 秒
  intensity: 0.8    // 0-1の範囲
} as const;

/**
 * エフェクト強度・時間の範囲設定
 */
export const EFFECT_RANGES = {
  intensity: { min: 0.1, max: 1, step: 0.1 },
  duration: { min: 0.1, max: 10, step: 0.1 }
} as const;

/**
 * エフェクト定数の型定義
 */
export type EffectTypeOption = typeof EFFECT_TYPE_OPTIONS[number];
export type EffectType = EffectTypeOption['value'];
export type EffectDefaults = typeof EFFECT_DEFAULTS;
export type EffectRanges = typeof EFFECT_RANGES;