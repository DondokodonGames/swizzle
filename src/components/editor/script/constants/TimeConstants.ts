// src/components/editor/script/constants/TimeConstants.ts
// Phase C Step 2完了版: 時間条件タイプ定義
// AdvancedRuleModal.tsx分割 - Step 1: 時間定数分離

import i18n from '../../../../i18n';

/**
 * Phase C Step 2: 時間条件タイプ定義
 */
export const getTimeConditionOptions = () => [
  { value: 'exact', label: i18n.t('conditions.time.exact.label'), icon: '⏰', description: i18n.t('conditions.time.exact.description') },
  { value: 'range', label: i18n.t('conditions.time.range.label'), icon: '📏', description: i18n.t('conditions.time.range.description') },
  { value: 'interval', label: i18n.t('conditions.time.interval.label'), icon: '🔄', description: i18n.t('conditions.time.interval.description') }
] as const;

/**
 * フラグ条件4パターン定義（Phase C Step 1-2）
 */
export const getFlagConditionOptions = () => [
  { value: 'ON', label: i18n.t('conditions.flag.on.label'), icon: '🟢', description: i18n.t('conditions.flag.on.description') },
  { value: 'OFF', label: i18n.t('conditions.flag.off.label'), icon: '🔴', description: i18n.t('conditions.flag.off.description') },
  { value: 'OFF_TO_ON', label: i18n.t('conditions.flag.offToOn.label'), icon: '🟢⬆️', description: i18n.t('conditions.flag.offToOn.description') },
  { value: 'ON_TO_OFF', label: i18n.t('conditions.flag.onToOff.label'), icon: '🔴⬇️', description: i18n.t('conditions.flag.onToOff.description') }
] as const;

/**
 * 後方互換性のための静的エクスポート
 */
export const TIME_CONDITION_OPTIONS = getTimeConditionOptions();
export const FLAG_CONDITION_OPTIONS = getFlagConditionOptions();

/**
 * 時間・フラグ定数の型定義
 */
export type TimeConditionOption = ReturnType<typeof getTimeConditionOptions>[number];
export type FlagConditionOption = ReturnType<typeof getFlagConditionOptions>[number];
export type TimeConditionType = TimeConditionOption['value'];
export type FlagConditionType = FlagConditionOption['value'];
