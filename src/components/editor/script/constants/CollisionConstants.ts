// src/components/editor/script/constants/CollisionConstants.ts
// Phase D Step 1-1: 衝突条件詳細定義
// TouchConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

/**
 * Phase D: 衝突タイプ詳細定義（GameScript.ts準拠）
 */
export const COLLISION_TYPE_OPTIONS = [
  { value: 'enter', label: '接触開始', icon: '🔥', description: '接触した瞬間に発動' },
  { value: 'stay', label: '接触継続', icon: '🤝', description: '接触している間継続発動' },
  { value: 'exit', label: '接触終了', icon: '👋', description: '離れた瞬間に発動' }
] as const;

/**
 * Phase D: 衝突対象詳細定義（GameScript.ts準拠）
 */
export const COLLISION_TARGET_OPTIONS = [
  { value: 'background', label: '背景', icon: '🖼️', description: '背景との衝突判定' },
  { value: 'stage', label: 'ステージ端', icon: '🔲', description: 'ステージ境界との衝突' },
  { value: 'object', label: '他オブジェクト', icon: '🎯', description: '指定オブジェクトとの衝突' }
] as const;

/**
 * Phase D: 衝突判定方式詳細定義（GameScript.ts準拠）
 */
export const COLLISION_CHECK_OPTIONS = [
  { value: 'hitbox', label: 'ヒットボックス', icon: '📦', description: '高速・軽量な矩形判定' },
  { value: 'pixel', label: 'ピクセル判定', icon: '🔍', description: '精密・高品質なピクセル判定' }
] as const;

/**
 * 衝突判定のデフォルト値
 */
export const COLLISION_DEFAULTS = {
  target: 'background' as const,
  collisionType: 'enter' as const,
  checkMode: 'hitbox' as const
} as const;

/**
 * 衝突定数の型定義（TouchConstants.tsパターン踏襲）
 */
export type CollisionTypeOption = typeof COLLISION_TYPE_OPTIONS[number];
export type CollisionTargetOption = typeof COLLISION_TARGET_OPTIONS[number];
export type CollisionCheckOption = typeof COLLISION_CHECK_OPTIONS[number];
export type CollisionType = CollisionTypeOption['value'];
export type CollisionTarget = CollisionTargetOption['value'];
export type CollisionCheckMode = CollisionCheckOption['value'];
export type CollisionDefaults = typeof COLLISION_DEFAULTS;