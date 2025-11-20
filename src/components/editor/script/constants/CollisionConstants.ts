// src/components/editor/script/constants/CollisionConstants.ts
// Phase D Step 1-1: 衝突条件詳細定義
// TouchConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

import i18n from '../../../../i18n';

/**
 * Phase D: 衝突タイプ詳細定義（GameScript.ts準拠）
 */
export const getCollisionTypeOptions = () => [
  { value: 'enter', label: i18n.t('conditions.collision.types.enter.label'), icon: '🔥', description: i18n.t('conditions.collision.types.enter.description') },
  { value: 'stay', label: i18n.t('conditions.collision.types.stay.label'), icon: '🤝', description: i18n.t('conditions.collision.types.stay.description') },
  { value: 'exit', label: i18n.t('conditions.collision.types.exit.label'), icon: '👋', description: i18n.t('conditions.collision.types.exit.description') }
] as const;

/**
 * Phase D: 衝突対象詳細定義（GameScript.ts準拠）
 */
export const getCollisionTargetOptions = () => [
  { value: 'background', label: i18n.t('conditions.collision.targets.background.label'), icon: '🖼️', description: i18n.t('conditions.collision.targets.background.description') },
  { value: 'stage', label: i18n.t('conditions.collision.targets.stage.label'), icon: '🔲', description: i18n.t('conditions.collision.targets.stage.description') },
  { value: 'object', label: i18n.t('conditions.collision.targets.object.label'), icon: '🎯', description: i18n.t('conditions.collision.targets.object.description') }
] as const;

/**
 * Phase D: 衝突判定方式詳細定義（GameScript.ts準拠）
 */
export const getCollisionCheckOptions = () => [
  { value: 'hitbox', label: i18n.t('conditions.collision.checkModes.hitbox.label'), icon: '📦', description: i18n.t('conditions.collision.checkModes.hitbox.description') },
  { value: 'pixel', label: i18n.t('conditions.collision.checkModes.pixel.label'), icon: '🔍', description: i18n.t('conditions.collision.checkModes.pixel.description') }
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
export type CollisionTypeOption = ReturnType<typeof getCollisionTypeOptions>[number];
export type CollisionTargetOption = ReturnType<typeof getCollisionTargetOptions>[number];
export type CollisionCheckOption = ReturnType<typeof getCollisionCheckOptions>[number];
export type CollisionType = CollisionTypeOption['value'];
export type CollisionTarget = CollisionTargetOption['value'];
export type CollisionCheckMode = CollisionCheckOption['value'];
export type CollisionDefaults = typeof COLLISION_DEFAULTS;
