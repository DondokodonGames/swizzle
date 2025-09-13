// src/components/editor/script/constants/MovementConstants.ts
// Phase C Step 2完了版: 移動タイプ詳細定義
// AdvancedRuleModal.tsx分割 - Step 1: 移動定数分離

/**
 * Phase C Step 2: 移動タイプ詳細定義
 */
export const MOVEMENT_TYPE_OPTIONS = [
  { value: 'straight', label: '直線移動', icon: '→', description: '指定座標まで直線移動' },
  { value: 'teleport', label: '瞬間移動', icon: '⚡', description: '瞬時に目標位置へ移動' },
  { value: 'wander', label: 'ランダム移動', icon: '🌀', description: '範囲内をランダムに移動' },
  { value: 'stop', label: '移動停止', icon: '⏹️', description: '現在の移動を停止' },
  { value: 'swap', label: '位置交換', icon: '🔄', description: '他オブジェクトと位置交換' },
  { value: 'approach', label: '接近移動', icon: '🎯', description: '対象に近づく' },
  { value: 'orbit', label: '軌道移動', icon: '🔄', description: '円軌道で移動' },
  { value: 'bounce', label: '跳ね返り移動', icon: '⬆️', description: '壁で跳ね返る移動' }
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
export type MovementTypeOption = typeof MOVEMENT_TYPE_OPTIONS[number];
export type MovementType = MovementTypeOption['value'];
export type MovementDefaults = typeof MOVEMENT_DEFAULTS;
export type MovementRanges = typeof MOVEMENT_RANGES;