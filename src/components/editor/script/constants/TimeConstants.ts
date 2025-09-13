// src/components/editor/script/constants/TimeConstants.ts
// Phase C Step 2完了版: 時間条件タイプ定義
// AdvancedRuleModal.tsx分割 - Step 1: 時間定数分離

/**
 * Phase C Step 2: 時間条件タイプ定義
 */
export const TIME_CONDITION_OPTIONS = [
  { value: 'exact', label: '正確な時刻', icon: '⏰', description: '特定の時間に発動' },
  { value: 'range', label: '時間範囲', icon: '📏', description: '指定範囲内で発動' },
  { value: 'interval', label: '定期間隔', icon: '🔄', description: '一定間隔で繰り返し発動' }
] as const;

/**
 * フラグ条件4パターン定義（Phase C Step 1-2）
 */
export const FLAG_CONDITION_OPTIONS = [
  { value: 'ON', label: 'ON状態', icon: '🟢', description: 'フラグがONの時' },
  { value: 'OFF', label: 'OFF状態', icon: '🔴', description: 'フラグがOFFの時' },
  { value: 'OFF_TO_ON', label: 'OFF→ON', icon: '🟢⬆️', description: 'OFFからONに変化した瞬間' },
  { value: 'ON_TO_OFF', label: 'ON→OFF', icon: '🔴⬇️', description: 'ONからOFFに変化した瞬間' }
] as const;

/**
 * 時間・フラグ定数の型定義
 */
export type TimeConditionOption = typeof TIME_CONDITION_OPTIONS[number];
export type FlagConditionOption = typeof FLAG_CONDITION_OPTIONS[number];
export type TimeConditionType = TimeConditionOption['value'];
export type FlagConditionType = FlagConditionOption['value'];