// src/components/editor/script/constants/TouchConstants.ts
// Phase C Step 1-1完了版: タッチ条件詳細定義
// AdvancedRuleModal.tsx分割 - Step 1: タッチ定数分離

/**
 * Phase C Step 1-1: タッチタイプ詳細定義（保護）
 */
export const TOUCH_TYPE_OPTIONS = [
  { value: 'down', label: 'タッチ開始', icon: '👇', description: 'タッチした瞬間' },
  { value: 'up', label: 'タッチ終了', icon: '👆', description: '指を離した瞬間' },
  { value: 'hold', label: '長押し', icon: '⏱️', description: '一定時間押し続ける' }
] as const;

/**
 * Phase C Step 1-1: タッチターゲット詳細定義（保護）
 */
export const TOUCH_TARGET_OPTIONS = [
  { value: 'self', label: 'このオブジェクト', icon: '🎯', description: '設定中のオブジェクト' },
  { value: 'stage', label: 'ステージ全体', icon: '🖼️', description: 'ゲーム画面全体' },
  { value: 'stageArea', label: 'ステージ範囲指定', icon: '📐', description: 'ステージの一部範囲' }
] as const;

/**
 * タッチ定数の型定義
 */
export type TouchTypeOption = typeof TOUCH_TYPE_OPTIONS[number];
export type TouchTargetOption = typeof TOUCH_TARGET_OPTIONS[number];
export type TouchType = TouchTypeOption['value'];
export type TouchTarget = TouchTargetOption['value'];