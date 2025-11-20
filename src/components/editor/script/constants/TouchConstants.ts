// src/components/editor/script/constants/TouchConstants.ts
// Phase C Step 1-1完了版: タッチ条件詳細定義
// AdvancedRuleModal.tsx分割 - Step 1: タッチ定数分離

import i18n from '../../../../i18n';

/**
 * Phase C Step 1-1: タッチタイプ詳細定義（保護）
 */
export const getTouchTypeOptions = () => [
  { value: 'down', label: i18n.t('conditions.touch.down.label'), icon: '👇', description: i18n.t('conditions.touch.down.description') },
  { value: 'up', label: i18n.t('conditions.touch.up.label'), icon: '👆', description: i18n.t('conditions.touch.up.description') },
  { value: 'hold', label: i18n.t('conditions.touch.hold.label'), icon: '⏱️', description: i18n.t('conditions.touch.hold.description') }
] as const;

/**
 * Phase C Step 1-1: タッチターゲット詳細定義（保護）
 */
export const getTouchTargetOptions = () => [
  { value: 'self', label: i18n.t('conditions.touch.targets.self.label'), icon: '🎯', description: i18n.t('conditions.touch.targets.self.description') },
  { value: 'stage', label: i18n.t('conditions.touch.targets.stage.label'), icon: '🖼️', description: i18n.t('conditions.touch.targets.stage.description') },
  { value: 'stageArea', label: i18n.t('conditions.touch.targets.stageArea.label'), icon: '📐', description: i18n.t('conditions.touch.targets.stageArea.description') }
] as const;

/**
 * 後方互換性のための静的エクスポート
 */
export const TOUCH_TYPE_OPTIONS = getTouchTypeOptions();
export const TOUCH_TARGET_OPTIONS = getTouchTargetOptions();

/**
 * タッチ定数の型定義
 */
export type TouchTypeOption = ReturnType<typeof getTouchTypeOptions>[number];
export type TouchTargetOption = ReturnType<typeof getTouchTargetOptions>[number];
export type TouchType = TouchTypeOption['value'];
export type TouchTarget = TouchTargetOption['value'];
