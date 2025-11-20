// src/components/editor/script/constants/FlagConstants.ts
// Phase D Step 2-B-1: フラグ操作アクション定数定義
// TimeConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

import i18n from '../../../../i18n';

/**
 * Phase D: フラグ操作アクションタイプ定義（GameScript.ts準拠）
 */
export const getFlagActionOptions = () => [
  { value: 'setFlag', label: i18n.t('actions.flags.setFlag.label'), icon: '🚩', description: i18n.t('actions.flags.setFlag.description') },
  { value: 'toggleFlag', label: i18n.t('actions.flags.toggleFlag.label'), icon: '🔄', description: i18n.t('actions.flags.toggleFlag.description') }
] as const;

/**
 * Phase D: フラグ値設定オプション（setFlag用）
 */
export const getFlagValueOptions = () => [
  { value: true, label: i18n.t('actions.flags.values.on.label'), icon: '🟢', description: i18n.t('actions.flags.values.on.description') },
  { value: false, label: i18n.t('actions.flags.values.off.label'), icon: '🔴', description: i18n.t('actions.flags.values.off.description') }
] as const;

/**
 * Phase D: フラグ操作の効果表示用
 */
export const getFlagOperationEffects = () => ({
  setFlag: {
    true: { icon: '🟢', description: i18n.t('actions.flags.effects.setOn') },
    false: { icon: '🔴', description: i18n.t('actions.flags.effects.setOff') }
  },
  toggleFlag: {
    description: i18n.t('actions.flags.effects.toggle')
  }
} as const);

/**
 * フラグ操作のデフォルト値
 */
export const FLAG_ACTION_DEFAULTS = {
  actionType: 'setFlag' as const,
  value: true
} as const;

/**
 * 後方互換性のための静的エクスポート
 */
export const FLAG_ACTION_OPTIONS = getFlagActionOptions();
export const FLAG_VALUE_OPTIONS = getFlagValueOptions();
export const FLAG_OPERATION_EFFECTS = getFlagOperationEffects();

/**
 * フラグ操作定数の型定義
 */
export type FlagActionOption = ReturnType<typeof getFlagActionOptions>[number];
export type FlagValueOption = ReturnType<typeof getFlagValueOptions>[number];
export type FlagActionType = FlagActionOption['value'];
export type FlagValue = FlagValueOption['value'];
export type FlagActionDefaults = typeof FLAG_ACTION_DEFAULTS;
export type FlagOperationEffects = ReturnType<typeof getFlagOperationEffects>;
