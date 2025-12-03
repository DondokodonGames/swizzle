// src/components/editor/script/constants/EffectConstants.ts
// Phase H-1: エフェクトタイプ詳細定義（拡張版）
// flash/rotate/particles の完全サポート

import i18n from '../../../../i18n';

/**
 * Phase H-1: エフェクトタイプ詳細定義（拡張版）
 * 新規追加: flash, rotate, particles
 */
export const getEffectTypeOptions = () => [
  // 既存エフェクト
  { value: 'glow', label: i18n.t('effects.glow.label'), icon: '✨', description: i18n.t('effects.glow.description') },
  { value: 'shake', label: i18n.t('effects.shake.label'), icon: '📳', description: i18n.t('effects.shake.description') },
  { value: 'confetti', label: i18n.t('effects.confetti.label'), icon: '🎉', description: i18n.t('effects.confetti.description') },
  { value: 'monochrome', label: i18n.t('effects.monochrome.label'), icon: '⚫⚪', description: i18n.t('effects.monochrome.description') },
  // 🆕 Phase H-1: 新規追加
  { value: 'flash', label: i18n.t('effects.flash.label'), icon: '💡', description: i18n.t('effects.flash.description') },
  { value: 'rotate', label: i18n.t('effects.rotate.label'), icon: '🔄', description: i18n.t('effects.rotate.description') },
  { value: 'particles', label: i18n.t('effects.particles.label'), icon: '✨', description: i18n.t('effects.particles.description') }
] as const;

/**
 * Phase H-1: フラッシュエフェクト設定（新規）
 */
export const getFlashColorOptions = () => [
  { value: '#FFFFFF', label: i18n.t('colors.white'), icon: '⚪', description: i18n.t('effects.flash.colors.white') },
  { value: '#FF0000', label: i18n.t('colors.red'), icon: '🔴', description: i18n.t('effects.flash.colors.red') },
  { value: '#00FF00', label: i18n.t('colors.green'), icon: '🟢', description: i18n.t('effects.flash.colors.green') },
  { value: '#0000FF', label: i18n.t('colors.blue'), icon: '🔵', description: i18n.t('effects.flash.colors.blue') },
  { value: '#FFFF00', label: i18n.t('colors.yellow'), icon: '🟡', description: i18n.t('effects.flash.colors.yellow') },
  { value: '#FF00FF', label: i18n.t('colors.magenta'), icon: '🟣', description: i18n.t('effects.flash.colors.magenta') }
] as const;

/**
 * Phase H-1: 回転方向設定（新規）
 */
export const getRotationDirectionOptions = () => [
  { value: 'clockwise', label: i18n.t('effects.rotate.directions.clockwise.label'), icon: '🔄', description: i18n.t('effects.rotate.directions.clockwise.description') },
  { value: 'counterclockwise', label: i18n.t('effects.rotate.directions.counterclockwise.label'), icon: '🔃', description: i18n.t('effects.rotate.directions.counterclockwise.description') },
  { value: 'alternate', label: i18n.t('effects.rotate.directions.alternate.label'), icon: '↔️', description: i18n.t('effects.rotate.directions.alternate.description') }
] as const;

/**
 * Phase H-1: シェイク方向設定（新規）
 */
export const getShakeDirectionOptions = () => [
  { value: 'horizontal', label: i18n.t('effects.shake.directions.horizontal.label'), icon: '↔️', description: i18n.t('effects.shake.directions.horizontal.description') },
  { value: 'vertical', label: i18n.t('effects.shake.directions.vertical.label'), icon: '↕️', description: i18n.t('effects.shake.directions.vertical.description') },
  { value: 'both', label: i18n.t('effects.shake.directions.both.label'), icon: '🔄', description: i18n.t('effects.shake.directions.both.description') }
] as const;

/**
 * Phase H-1: パーティクルタイプ設定（新規）
 */
export const getParticleTypeOptions = () => [
  { value: 'star', label: i18n.t('effects.particles.types.star.label'), icon: '⭐', description: i18n.t('effects.particles.types.star.description') },
  { value: 'confetti', label: i18n.t('effects.particles.types.confetti.label'), icon: '🎊', description: i18n.t('effects.particles.types.confetti.description') },
  { value: 'explosion', label: i18n.t('effects.particles.types.explosion.label'), icon: '💥', description: i18n.t('effects.particles.types.explosion.description') },
  { value: 'splash', label: i18n.t('effects.particles.types.splash.label'), icon: '💧', description: i18n.t('effects.particles.types.splash.description') },
  { value: 'hearts', label: i18n.t('effects.particles.types.hearts.label'), icon: '💕', description: i18n.t('effects.particles.types.hearts.description') },
  { value: 'sparkle', label: i18n.t('effects.particles.types.sparkle.label'), icon: '✨', description: i18n.t('effects.particles.types.sparkle.description') }
] as const;

/**
 * Phase H-1: エフェクトパラメータのデフォルト値（拡張版）
 */
export const EFFECT_DEFAULTS = {
  // 共通
  duration: 1.0,    // 秒
  intensity: 0.8,   // 0-1の範囲
  // Flash
  flashColor: '#FFFFFF',
  flashIntensity: 0.8,
  flashFrequency: 5,  // Hz
  // Shake
  shakeIntensity: 10,  // ピクセル
  shakeFrequency: 10,  // Hz
  shakeDirection: 'both' as const,
  // Rotate
  rotationAmount: 360,  // 度
  rotationSpeed: 180,   // 度/秒
  rotationDirection: 'clockwise' as const,
  // Particles
  particleType: 'star' as const,
  particleCount: 20,
  particleSize: 16,     // ピクセル
  particleColor: '#FFD700',
  particleSpread: 90,   // 度
  particleSpeed: 200    // ピクセル/秒
} as const;

/**
 * Phase H-1: エフェクト強度・時間の範囲設定（拡張版）
 */
export const EFFECT_RANGES = {
  // 共通
  intensity: { min: 0.1, max: 1, step: 0.1 },
  duration: { min: 0.1, max: 10, step: 0.1 },
  // Flash
  flashIntensity: { min: 0.1, max: 1, step: 0.1 },
  flashFrequency: { min: 1, max: 20, step: 1 },
  // Shake
  shakeIntensity: { min: 1, max: 50, step: 1 },
  shakeFrequency: { min: 1, max: 30, step: 1 },
  // Rotate
  rotationAmount: { min: 0, max: 720, step: 15 },
  rotationSpeed: { min: 10, max: 720, step: 10 },
  // Particles
  particleCount: { min: 5, max: 100, step: 5 },
  particleSize: { min: 4, max: 64, step: 4 },
  particleSpread: { min: 0, max: 360, step: 15 },
  particleSpeed: { min: 50, max: 500, step: 50 }
} as const;

/**
 * 後方互換性のための静的エクスポート
 */
export const EFFECT_TYPE_OPTIONS = getEffectTypeOptions();
export const FLASH_COLOR_OPTIONS = getFlashColorOptions();
export const ROTATION_DIRECTION_OPTIONS = getRotationDirectionOptions();
export const SHAKE_DIRECTION_OPTIONS = getShakeDirectionOptions();
export const PARTICLE_TYPE_OPTIONS = getParticleTypeOptions();

/**
 * エフェクト定数の型定義
 */
export type EffectTypeOption = ReturnType<typeof getEffectTypeOptions>[number];
export type FlashColorOption = ReturnType<typeof getFlashColorOptions>[number];
export type RotationDirectionOption = ReturnType<typeof getRotationDirectionOptions>[number];
export type ShakeDirectionOption = ReturnType<typeof getShakeDirectionOptions>[number];
export type ParticleTypeOption = ReturnType<typeof getParticleTypeOptions>[number];

export type EffectType = EffectTypeOption['value'];
export type FlashColor = FlashColorOption['value'];
export type RotationDirection = RotationDirectionOption['value'];
export type ShakeDirection = ShakeDirectionOption['value'];
export type ParticleType = ParticleTypeOption['value'];

export type EffectDefaults = typeof EFFECT_DEFAULTS;
export type EffectRanges = typeof EFFECT_RANGES;