// src/components/editor/script/constants/MovementConstants.ts
// Phase C Step 2完了版: 移動タイプ詳細定義
// AdvancedRuleModal.tsx分割 - Step 1: 移動定数分離

import i18n from '../../../../i18n';

/**
 * Phase C Step 2: 移動タイプ詳細定義
 */
export const getMovementTypeOptions = () => [
  { value: 'straight', label: i18n.t('movements.straight.label'), icon: '→', description: i18n.t('movements.straight.description') },
  { value: 'teleport', label: i18n.t('movements.teleport.label'), icon: '⚡', description: i18n.t('movements.teleport.description') },
  { value: 'wander', label: i18n.t('movements.wander.label'), icon: '🌀', description: i18n.t('movements.wander.description') },
  { value: 'stop', label: i18n.t('movements.stop.label'), icon: '⏹️', description: i18n.t('movements.stop.description') },
  { value: 'swap', label: i18n.t('movements.swap.label'), icon: '🔄', description: i18n.t('movements.swap.description') },
  { value: 'approach', label: i18n.t('movements.approach.label'), icon: '🎯', description: i18n.t('movements.approach.description') },
  { value: 'orbit', label: i18n.t('movements.orbit.label'), icon: '🔄', description: i18n.t('movements.orbit.description') },
  { value: 'bounce', label: i18n.t('movements.bounce.label'), icon: '⬆️', description: i18n.t('movements.bounce.description') }
] as const;

/**
 * 移動パラメータのデフォルト値
 */
export const MOVEMENT_DEFAULTS = {
  speed: 300,      // px/秒
  duration: 2.0,   // 秒
  teleportDuration: 0.1,  // 瞬間移動用
  target: { x: 0.5, y: 0.5 }  // デフォルト座標（中央）
} as const;

/**
 * 移動速度・時間の範囲設定
 */
export const MOVEMENT_RANGES = {
  speed: { min: 50, max: 1000, step: 50 },
  duration: { min: 0.1, max: 10, step: 0.1 },
  coordinates: { min: 0, max: 1, step: 0.01 }
} as const;

/**
 * 移動定数の型定義
 */
export type MovementTypeOption = ReturnType<typeof getMovementTypeOptions>[number];
export type MovementType = MovementTypeOption['value'];
export type MovementDefaults = typeof MOVEMENT_DEFAULTS;
export type MovementRanges = typeof MOVEMENT_RANGES;
