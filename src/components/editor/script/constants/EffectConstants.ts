// src/components/editor/script/constants/EffectConstants.ts
// Phase C Step 2完了版: エフェクトタイプ詳細定義
// AdvancedRuleModal.tsx分割 - Step 1: エフェクト定数分離

import i18n from '../../../../i18n';

/**
 * Phase C Step 2: エフェクトタイプ詳細定義
 */
export const getEffectTypeOptions = () => [
  { value: 'glow', label: i18n.t('effects.glow.label'), icon: '✨', description: i18n.t('effects.glow.description') },
  { value: 'shake', label: i18n.t('effects.shake.label'), icon: '📳', description: i18n.t('effects.shake.description') },
  { value: 'confetti', label: i18n.t('effects.confetti.label'), icon: '🎉', description: i18n.t('effects.confetti.description') },
  { value: 'monochrome', label: i18n.t('effects.monochrome.label'), icon: '⚫⚪', description: i18n.t('effects.monochrome.description') }
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
export type EffectTypeOption = ReturnType<typeof getEffectTypeOptions>[number];
export type EffectType = EffectTypeOption['value'];
export type EffectDefaults = typeof EFFECT_DEFAULTS;
export type EffectRanges = typeof EFFECT_RANGES;
