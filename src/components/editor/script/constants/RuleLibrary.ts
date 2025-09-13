// src/components/editor/script/constants/RuleLibrary.ts
// Phase C Step 2完了版: 条件・アクションライブラリ定数
// AdvancedRuleModal.tsx分割 - Step 1: 定数分離

/**
 * 条件ライブラリ（Phase A・B保護）
 */
export const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆', params: ['touchType', 'holdDuration', 'target', 'stageArea'] },
  { type: 'time', label: '時間', icon: '⏰', params: ['timeType', 'seconds', 'range'] },
  { type: 'position', label: '位置', icon: '📍', params: ['area', 'region'] },
  { type: 'collision', label: '衝突', icon: '💥', params: ['target', 'collisionType'] },
  { type: 'animation', label: 'アニメ', icon: '🎬', params: ['frame', 'animationType'] },
  { type: 'flag', label: 'フラグ', icon: '🚩', params: ['targetFlag', 'flagState'] }
] as const;

/**
 * アクションライブラリ（Phase A・B保護）
 */
export const ACTION_LIBRARY = [
  { type: 'success', label: 'ゲームクリア', icon: '🎉', params: [] },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀', params: [] },
  { type: 'playSound', label: '音再生', icon: '🔊', params: ['soundId', 'volume'] },
  { type: 'move', label: '移動', icon: '🏃', params: ['moveType', 'targetPosition', 'speed'] },
  { type: 'effect', label: 'エフェクト', icon: '✨', params: ['effectType', 'duration', 'intensity'] },
  { type: 'show', label: '表示', icon: '👁️', params: ['fadeIn', 'duration'] },
  { type: 'hide', label: '非表示', icon: '🫥', params: ['fadeOut', 'duration'] },
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', params: ['targetFlag', 'value'] },
  { type: 'switchAnimation', label: 'アニメ変更', icon: '🔄', params: ['animationIndex'] }
] as const;

/**
 * 条件・アクションライブラリの型定義
 */
export type ConditionLibraryItem = typeof CONDITION_LIBRARY[number];
export type ActionLibraryItem = typeof ACTION_LIBRARY[number];
export type ConditionType = ConditionLibraryItem['type'];
export type ActionType = ActionLibraryItem['type'];