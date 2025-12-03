// src/components/editor/script/constants/MovementConstants.ts
// Phase H-1: 移動タイプ詳細定義（拡張版）
// followDrag の完全サポート

import i18n from '../../../../i18n';

/**
 * Phase H-1: 移動タイプ詳細定義（拡張版）
 * 新規追加: followDrag
 */
export const getMovementTypeOptions = () => [
  // 既存移動タイプ
  { value: 'straight', label: i18n.t('actions.move.types.straight.label'), icon: '→', description: i18n.t('actions.move.types.straight.description') },
  { value: 'bounce', label: i18n.t('actions.move.types.bounce.label'), icon: '⚾', description: i18n.t('actions.move.types.bounce.description') },
  { value: 'teleport', label: i18n.t('actions.move.types.teleport.label'), icon: '✨', description: i18n.t('actions.move.types.teleport.description') },
  { value: 'wander', label: i18n.t('actions.move.types.wander.label'), icon: '🎲', description: i18n.t('actions.move.types.wander.description') },
  { value: 'stop', label: i18n.t('actions.move.types.stop.label'), icon: '⏹️', description: i18n.t('actions.move.types.stop.description') },
  { value: 'swap', label: i18n.t('actions.move.types.swap.label'), icon: '🔄', description: i18n.t('actions.move.types.swap.description') },
  { value: 'approach', label: i18n.t('actions.move.types.approach.label'), icon: '🎯', description: i18n.t('actions.move.types.approach.description') },
  { value: 'orbit', label: i18n.t('actions.move.types.orbit.label'), icon: '🌍', description: i18n.t('actions.move.types.orbit.description') },
  // 🆕 Phase H-1: 新規追加
  { value: 'followDrag', label: i18n.t('actions.move.types.followDrag.label'), icon: '🖐️', description: i18n.t('actions.move.types.followDrag.description') }
] as const;

/**
 * Phase H-1: followDrag 設定オプション（新規）
 */
export const getFollowDragOptions = () => ({
  damping: [
    { value: 0.1, label: i18n.t('actions.move.followDrag.damping.high.label'), description: i18n.t('actions.move.followDrag.damping.high.description') },
    { value: 0.3, label: i18n.t('actions.move.followDrag.damping.medium.label'), description: i18n.t('actions.move.followDrag.damping.medium.description') },
    { value: 0.5, label: i18n.t('actions.move.followDrag.damping.low.label'), description: i18n.t('actions.move.followDrag.damping.low.description') },
    { value: 0.8, label: i18n.t('actions.move.followDrag.damping.veryLow.label'), description: i18n.t('actions.move.followDrag.damping.veryLow.description') },
    { value: 1.0, label: i18n.t('actions.move.followDrag.damping.none.label'), description: i18n.t('actions.move.followDrag.damping.none.description') }
  ]
});

/**
 * Phase H-1: 移動パラメータのデフォルト値（拡張版）
 */
export const MOVEMENT_DEFAULTS = {
  // 共通
  speed: 300,       // ピクセル/秒
  duration: 2.0,    // 秒
  // followDrag 関連
  damping: 0.3,           // 減衰係数（0-1）
  constrainToBounds: false,  // 境界制約
  boundingBox: {
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1
  }
} as const;

/**
 * Phase H-1: 移動パラメータの範囲設定（拡張版）
 */
export const MOVEMENT_RANGES = {
  speed: { min: 10, max: 1000, step: 10 },
  duration: { min: 0.1, max: 10, step: 0.1 },
  damping: { min: 0, max: 1, step: 0.05 },
  boundingBoxValue: { min: 0, max: 1, step: 0.05 }
} as const;

/**
 * 後方互換性のための静的エクスポート
 */
export const MOVEMENT_TYPE_OPTIONS = getMovementTypeOptions();
export const FOLLOW_DRAG_OPTIONS = getFollowDragOptions();

/**
 * 移動定数の型定義
 */
export type MovementTypeOption = ReturnType<typeof getMovementTypeOptions>[number];
export type FollowDragOptions = ReturnType<typeof getFollowDragOptions>;

export type MovementType = MovementTypeOption['value'];

export type MovementDefaults = typeof MOVEMENT_DEFAULTS;
export type MovementRanges = typeof MOVEMENT_RANGES;