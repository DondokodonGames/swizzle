// src/components/editor/script/constants/FlagConstants.ts
// Phase D Step 2-B-1: フラグ操作アクション定数定義
// TimeConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

/**
 * Phase D: フラグ操作アクションタイプ定義（GameScript.ts準拠）
 */
export const FLAG_ACTION_OPTIONS = [
  { value: 'setFlag', label: 'フラグ設定', icon: '🚩', description: 'フラグを指定の値に設定' },
  { value: 'toggleFlag', label: 'フラグ切替', icon: '🔄', description: 'フラグのON/OFFを切り替え' }
] as const;

/**
 * Phase D: フラグ値設定オプション（setFlag用）
 */
export const FLAG_VALUE_OPTIONS = [
  { value: true, label: 'ON', icon: '🟢', description: 'フラグをON状態に設定' },
  { value: false, label: 'OFF', icon: '🔴', description: 'フラグをOFF状態に設定' }
] as const;

/**
 * Phase D: フラグ操作の効果表示用
 */
export const FLAG_OPERATION_EFFECTS = {
  setFlag: {
    true: { icon: '🟢', description: '→ ON状態に設定' },
    false: { icon: '🔴', description: '→ OFF状態に設定' }
  },
  toggleFlag: {
    description: '→ 現在の状態を反転（ON⇔OFF）'
  }
} as const;

/**
 * フラグ操作のデフォルト値
 */
export const FLAG_ACTION_DEFAULTS = {
  actionType: 'setFlag' as const,
  value: true
} as const;

/**
 * フラグ操作定数の型定義
 */
export type FlagActionOption = typeof FLAG_ACTION_OPTIONS[number];
export type FlagValueOption = typeof FLAG_VALUE_OPTIONS[number];
export type FlagActionType = FlagActionOption['value'];
export type FlagValue = FlagValueOption['value'];
export type FlagActionDefaults = typeof FLAG_ACTION_DEFAULTS;
export type FlagOperationEffects = typeof FLAG_OPERATION_EFFECTS;