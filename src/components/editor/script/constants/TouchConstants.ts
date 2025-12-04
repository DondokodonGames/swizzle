// src/components/editor/script/constants/TouchConstants.ts
// Phase H-1: タッチ条件詳細定義（拡張版）
// drag/swipe/flick/hold の完全サポート

import i18n from '../../../../i18n';

/**
 * Phase H-1: タッチタイプ詳細定義（拡張版）
 * 新規追加: drag, swipe, flick
 */
export const getTouchTypeOptions = () => [
  { value: 'down', label: i18n.t('conditions.touch.down.label'), icon: '👇', description: i18n.t('conditions.touch.down.description') },
  { value: 'up', label: i18n.t('conditions.touch.up.label'), icon: '👆', description: i18n.t('conditions.touch.up.description') },
  { value: 'hold', label: i18n.t('conditions.touch.hold.label'), icon: '⏱️', description: i18n.t('conditions.touch.hold.description') },
  // 🆕 Phase H-1: 新規追加(使う機会あれば)
  // { value: 'drag', label: i18n.t('conditions.touch.drag.label'), icon: '🖐️', description: i18n.t('conditions.touch.drag.description') },
  // { value: 'swipe', label: i18n.t('conditions.touch.swipe.label'), icon: '👉', description: i18n.t('conditions.touch.swipe.description') },
  // { value: 'flick', label: i18n.t('conditions.touch.flick.label'), icon: '💨', description: i18n.t('conditions.touch.flick.description') }
] as const;

/**
 * Phase H-1: ドラッグタイプ詳細定義（新規）
 */
export const getDragTypeOptions = () => [
  { value: 'start', label: i18n.t('conditions.touch.drag.types.start.label'), icon: '▶️', description: i18n.t('conditions.touch.drag.types.start.description') },
  { value: 'dragging', label: i18n.t('conditions.touch.drag.types.dragging.label'), icon: '🔄', description: i18n.t('conditions.touch.drag.types.dragging.description') },
  { value: 'end', label: i18n.t('conditions.touch.drag.types.end.label'), icon: '⏹️', description: i18n.t('conditions.touch.drag.types.end.description') }
] as const;

/**
 * Phase H-1: ドラッグ制約タイプ（新規）
 */
export const getDragConstraintOptions = () => [
  { value: 'none', label: i18n.t('conditions.touch.drag.constraints.none.label'), icon: '🆓', description: i18n.t('conditions.touch.drag.constraints.none.description') },
  { value: 'horizontal', label: i18n.t('conditions.touch.drag.constraints.horizontal.label'), icon: '↔️', description: i18n.t('conditions.touch.drag.constraints.horizontal.description') },
  { value: 'vertical', label: i18n.t('conditions.touch.drag.constraints.vertical.label'), icon: '↕️', description: i18n.t('conditions.touch.drag.constraints.vertical.description') }
] as const;

/**
 * Phase H-1: スワイプ方向定義（新規）
 */
export const getSwipeDirectionOptions = () => [
  { value: 'up', label: i18n.t('directions.up'), icon: '⬆️', description: i18n.t('conditions.touch.swipe.directions.up') },
  { value: 'down', label: i18n.t('directions.down'), icon: '⬇️', description: i18n.t('conditions.touch.swipe.directions.down') },
  { value: 'left', label: i18n.t('directions.left'), icon: '⬅️', description: i18n.t('conditions.touch.swipe.directions.left') },
  { value: 'right', label: i18n.t('directions.right'), icon: '➡️', description: i18n.t('conditions.touch.swipe.directions.right') },
  { value: 'up-left', label: i18n.t('directions.upLeft'), icon: '↖️', description: i18n.t('conditions.touch.swipe.directions.upLeft') },
  { value: 'up-right', label: i18n.t('directions.upRight'), icon: '↗️', description: i18n.t('conditions.touch.swipe.directions.upRight') },
  { value: 'down-left', label: i18n.t('directions.downLeft'), icon: '↙️', description: i18n.t('conditions.touch.swipe.directions.downLeft') },
  { value: 'down-right', label: i18n.t('directions.downRight'), icon: '↘️', description: i18n.t('conditions.touch.swipe.directions.downRight') }
] as const;

/**
 * Phase H-1: フリック方向定義（新規）
 * スワイプと同じ方向オプションを使用
 */
export const getFlickDirectionOptions = getSwipeDirectionOptions;

/**
 * タッチターゲット詳細定義（既存）
 */
export const getTouchTargetOptions = () => [
  { value: 'self', label: i18n.t('conditions.touch.targets.self.label'), icon: '🎯', description: i18n.t('conditions.touch.targets.self.description') },
  { value: 'stage', label: i18n.t('conditions.touch.targets.stage.label'), icon: '🖼️', description: i18n.t('conditions.touch.targets.stage.description') },
  { value: 'stageArea', label: i18n.t('conditions.touch.targets.stageArea.label'), icon: '📐', description: i18n.t('conditions.touch.targets.stageArea.description') }
] as const;

/**
 * Phase H-1: タッチパラメータのデフォルト値
 */
export const TOUCH_DEFAULTS = {
  // ドラッグ関連
  dragType: 'dragging' as const,
  constraint: 'none' as const,
  // スワイプ関連
  swipeMinDistance: 50,    // ピクセル
  swipeMaxDuration: 500,   // ミリ秒
  swipeMinVelocity: 0.3,   // px/ms
  // フリック関連
  flickMinVelocity: 1.0,   // px/ms
  flickMaxDistance: 100,   // ピクセル
  flickMaxDuration: 200,   // ミリ秒
  // ホールド関連
  holdDuration: 1.2,       // 秒
  holdTolerance: 10,       // ピクセル
  holdProgressThreshold: 0.8  // 0-1
} as const;

/**
 * Phase H-1: タッチパラメータの範囲設定
 */
export const TOUCH_RANGES = {
  swipeMinDistance: { min: 10, max: 300, step: 10 },
  swipeMaxDuration: { min: 100, max: 2000, step: 100 },
  swipeMinVelocity: { min: 0.1, max: 2.0, step: 0.1 },
  flickMinVelocity: { min: 0.5, max: 3.0, step: 0.1 },
  flickMaxDistance: { min: 20, max: 200, step: 10 },
  flickMaxDuration: { min: 50, max: 500, step: 50 },
  holdDuration: { min: 0.1, max: 10, step: 0.1 },
  holdTolerance: { min: 0, max: 50, step: 5 },
  holdProgressThreshold: { min: 0, max: 1, step: 0.05 }
} as const;

/**
 * 後方互換性のための静的エクスポート
 */
export const TOUCH_TYPE_OPTIONS = getTouchTypeOptions();
export const TOUCH_TARGET_OPTIONS = getTouchTargetOptions();
export const DRAG_TYPE_OPTIONS = getDragTypeOptions();
export const DRAG_CONSTRAINT_OPTIONS = getDragConstraintOptions();
export const SWIPE_DIRECTION_OPTIONS = getSwipeDirectionOptions();
export const FLICK_DIRECTION_OPTIONS = getFlickDirectionOptions();

/**
 * タッチ定数の型定義
 */
export type TouchTypeOption = ReturnType<typeof getTouchTypeOptions>[number];
export type TouchTargetOption = ReturnType<typeof getTouchTargetOptions>[number];
export type DragTypeOption = ReturnType<typeof getDragTypeOptions>[number];
export type DragConstraintOption = ReturnType<typeof getDragConstraintOptions>[number];
export type SwipeDirectionOption = ReturnType<typeof getSwipeDirectionOptions>[number];
export type FlickDirectionOption = ReturnType<typeof getFlickDirectionOptions>[number];

export type TouchType = TouchTypeOption['value'];
export type TouchTarget = TouchTargetOption['value'];
export type DragType = DragTypeOption['value'];
export type DragConstraint = DragConstraintOption['value'];
export type SwipeDirection = SwipeDirectionOption['value'];
export type FlickDirection = FlickDirectionOption['value'];

export type TouchDefaults = typeof TOUCH_DEFAULTS;
export type TouchRanges = typeof TOUCH_RANGES;