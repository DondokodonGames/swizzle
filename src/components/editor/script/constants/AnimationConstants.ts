// src/components/editor/script/constants/AnimationConstants.ts
// Phase E Step 2: アニメーション条件詳細定義
// CollisionConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

/**
 * Phase E: アニメーション条件タイプ詳細定義（GameScript.ts準拠）
 */
export const ANIMATION_CONDITIONS = [
  { value: 'start', label: '開始時', icon: '▶️', description: 'アニメーションが開始した瞬間に発動' },
  { value: 'end', label: '終了時', icon: '🏁', description: 'アニメーションが終了した瞬間に発動' },
  { value: 'frame', label: '特定フレーム', icon: '📹', description: '指定したフレーム番号に達した時に発動' },
  { value: 'loop', label: 'ループ時', icon: '🔄', description: 'アニメーションがループした瞬間に発動' }
] as const;

/**
 * Phase E: アニメーション対象選択オプション
 */
export const ANIMATION_TARGET_OPTIONS = [
  { value: 'background', label: '背景', icon: '🖼️', description: '背景のアニメーション状態' },
  { value: 'this', label: 'このオブジェクト', icon: '🎯', description: 'ルール対象オブジェクトのアニメーション' },
  { value: 'other', label: '他オブジェクト', icon: '👥', description: '指定した他オブジェクトのアニメーション' }
] as const;

/**
 * フレーム番号選択範囲（1-8フレーム対応）
 */
export const FRAME_NUMBER_OPTIONS = [
  { value: 1, label: 'フレーム1', icon: '1️⃣', description: '1番目のフレーム' },
  { value: 2, label: 'フレーム2', icon: '2️⃣', description: '2番目のフレーム' },
  { value: 3, label: 'フレーム3', icon: '3️⃣', description: '3番目のフレーム' },
  { value: 4, label: 'フレーム4', icon: '4️⃣', description: '4番目のフレーム' },
  { value: 5, label: 'フレーム5', icon: '5️⃣', description: '5番目のフレーム' },
  { value: 6, label: 'フレーム6', icon: '6️⃣', description: '6番目のフレーム' },
  { value: 7, label: 'フレーム7', icon: '7️⃣', description: '7番目のフレーム' },
  { value: 8, label: 'フレーム8', icon: '8️⃣', description: '8番目のフレーム' }
] as const;

/**
 * アニメーションインデックス選択（最大8アニメーション対応）
 */
export const ANIMATION_INDEX_OPTIONS = [
  { value: 0, label: 'アニメ1', icon: '🎭', description: '1番目のアニメーション' },
  { value: 1, label: 'アニメ2', icon: '🎪', description: '2番目のアニメーション' },
  { value: 2, label: 'アニメ3', icon: '🎨', description: '3番目のアニメーション' },
  { value: 3, label: 'アニメ4', icon: '🎬', description: '4番目のアニメーション' },
  { value: 4, label: 'アニメ5', icon: '🎵', description: '5番目のアニメーション' },
  { value: 5, label: 'アニメ6', icon: '🎭', description: '6番目のアニメーション' },
  { value: 6, label: 'アニメ7', icon: '🌟', description: '7番目のアニメーション' },
  { value: 7, label: 'アニメ8', icon: '✨', description: '8番目のアニメーション' }
] as const;

/**
 * アニメーション判定のデフォルト値
 */
export const ANIMATION_DEFAULTS = {
  target: 'this' as const,
  condition: 'end' as const,
  frameNumber: 1,
  animationIndex: 0
} as const;

/**
 * アニメーション定数の型定義（CollisionConstants.tsパターン踏襲）
 */
export type AnimationConditionOption = typeof ANIMATION_CONDITIONS[number];
export type AnimationTargetOption = typeof ANIMATION_TARGET_OPTIONS[number];
export type FrameNumberOption = typeof FRAME_NUMBER_OPTIONS[number];
export type AnimationIndexOption = typeof ANIMATION_INDEX_OPTIONS[number];
export type AnimationConditionType = AnimationConditionOption['value'];
export type AnimationTarget = AnimationTargetOption['value'];
export type FrameNumber = FrameNumberOption['value'];
export type AnimationIndex = AnimationIndexOption['value'];
export type AnimationDefaults = typeof ANIMATION_DEFAULTS;