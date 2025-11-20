// src/components/editor/script/constants/AnimationConstants.ts
// Phase E Step 2: アニメーション条件詳細定義
// CollisionConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

import i18n from '../../../i18n';

/**
 * Phase E: アニメーション条件タイプ詳細定義（GameScript.ts準拠）
 */
export const getAnimationConditions = () => [
  { value: 'start', label: i18n.t('conditions.animation.start.label'), icon: '▶️', description: i18n.t('conditions.animation.start.description') },
  { value: 'end', label: i18n.t('conditions.animation.end.label'), icon: '🏁', description: i18n.t('conditions.animation.end.description') },
  { value: 'frame', label: i18n.t('conditions.animation.frame.label'), icon: '📹', description: i18n.t('conditions.animation.frame.description') },
  { value: 'loop', label: i18n.t('conditions.animation.loop.label'), icon: '🔄', description: i18n.t('conditions.animation.loop.description') }
] as const;

/**
 * Phase E: アニメーション対象選択オプション
 */
export const getAnimationTargetOptions = () => [
  { value: 'background', label: i18n.t('conditions.targets.background.label'), icon: '🖼️', description: i18n.t('conditions.targets.background.description') },
  { value: 'this', label: i18n.t('conditions.targets.this.label'), icon: '🎯', description: i18n.t('conditions.targets.this.description') },
  { value: 'other', label: i18n.t('conditions.targets.other.label'), icon: '👥', description: i18n.t('conditions.targets.other.description') }
] as const;

/**
 * フレーム番号選択範囲（1-8フレーム対応）
 */
export const getFrameNumberOptions = () => [
  { value: 1, label: i18n.t('common.frames.frame1.label'), icon: '1️⃣', description: i18n.t('common.frames.frame1.description') },
  { value: 2, label: i18n.t('common.frames.frame2.label'), icon: '2️⃣', description: i18n.t('common.frames.frame2.description') },
  { value: 3, label: i18n.t('common.frames.frame3.label'), icon: '3️⃣', description: i18n.t('common.frames.frame3.description') },
  { value: 4, label: i18n.t('common.frames.frame4.label'), icon: '4️⃣', description: i18n.t('common.frames.frame4.description') },
  { value: 5, label: i18n.t('common.frames.frame5.label'), icon: '5️⃣', description: i18n.t('common.frames.frame5.description') },
  { value: 6, label: i18n.t('common.frames.frame6.label'), icon: '6️⃣', description: i18n.t('common.frames.frame6.description') },
  { value: 7, label: i18n.t('common.frames.frame7.label'), icon: '7️⃣', description: i18n.t('common.frames.frame7.description') },
  { value: 8, label: i18n.t('common.frames.frame8.label'), icon: '8️⃣', description: i18n.t('common.frames.frame8.description') }
] as const;

/**
 * アニメーションインデックス選択（最大8アニメーション対応）
 */
export const getAnimationIndexOptions = () => [
  { value: 0, label: i18n.t('common.animations.animation1.label'), icon: '🎭', description: i18n.t('common.animations.animation1.description') },
  { value: 1, label: i18n.t('common.animations.animation2.label'), icon: '🎪', description: i18n.t('common.animations.animation2.description') },
  { value: 2, label: i18n.t('common.animations.animation3.label'), icon: '🎨', description: i18n.t('common.animations.animation3.description') },
  { value: 3, label: i18n.t('common.animations.animation4.label'), icon: '🎬', description: i18n.t('common.animations.animation4.description') },
  { value: 4, label: i18n.t('common.animations.animation5.label'), icon: '🎵', description: i18n.t('common.animations.animation5.description') },
  { value: 5, label: i18n.t('common.animations.animation6.label'), icon: '🎭', description: i18n.t('common.animations.animation6.description') },
  { value: 6, label: i18n.t('common.animations.animation7.label'), icon: '🌟', description: i18n.t('common.animations.animation7.description') },
  { value: 7, label: i18n.t('common.animations.animation8.label'), icon: '✨', description: i18n.t('common.animations.animation8.description') }
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
export type AnimationConditionOption = ReturnType<typeof getAnimationConditions>[number];
export type AnimationTargetOption = ReturnType<typeof getAnimationTargetOptions>[number];
export type FrameNumberOption = ReturnType<typeof getFrameNumberOptions>[number];
export type AnimationIndexOption = ReturnType<typeof getAnimationIndexOptions>[number];
export type AnimationConditionType = AnimationConditionOption['value'];
export type AnimationTarget = AnimationTargetOption['value'];
export type FrameNumber = FrameNumberOption['value'];
export type AnimationIndex = AnimationIndexOption['value'];
export type AnimationDefaults = typeof ANIMATION_DEFAULTS;
