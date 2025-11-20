// src/components/editor/script/constants/ShowHideConstants.ts
// Phase D Step 2-A-1: 表示制御アクション統合定数定義
// SoundActionEditor.tsx成功パターン踏襲 - GameScript.ts型定義完全準拠

import i18n from '../../../../i18n';

/**
 * Phase D: 表示制御アクションタイプ定義（GameScript.ts準拠）
 */
export const getShowHideActionOptions = () => [
  { value: 'show', label: i18n.t('actions.showHide.show.label'), icon: '👁️', description: i18n.t('actions.showHide.show.description') },
  { value: 'hide', label: i18n.t('actions.showHide.hide.label'), icon: '🙈', description: i18n.t('actions.showHide.hide.description') }
] as const;

/**
 * Phase D: フェード効果オプション定義
 */
export const getFadeOptions = () => [
  { value: true, label: i18n.t('actions.showHide.fade.enabled.label'), icon: '✨', description: i18n.t('actions.showHide.fade.enabled.description') },
  { value: false, label: i18n.t('actions.showHide.fade.disabled.label'), icon: '⚡', description: i18n.t('actions.showHide.fade.disabled.description') }
] as const;

/**
 * Phase D: 表示制御の持続時間プリセット
 */
export const getDurationPresets = () => [
  { value: 0.1, label: i18n.t('actions.showHide.duration.instant.label'), description: i18n.t('actions.showHide.duration.instant.description') },
  { value: 0.3, label: i18n.t('actions.showHide.duration.fast.label'), description: i18n.t('actions.showHide.duration.fast.description') },
  { value: 0.5, label: i18n.t('actions.showHide.duration.normal.label'), description: i18n.t('actions.showHide.duration.normal.description') },
  { value: 1.0, label: i18n.t('actions.showHide.duration.slow.label'), description: i18n.t('actions.showHide.duration.slow.description') },
  { value: 2.0, label: i18n.t('actions.showHide.duration.verySlow.label'), description: i18n.t('actions.showHide.duration.verySlow.description') }
] as const;

/**
 * 表示制御のデフォルト値
 */
export const SHOW_HIDE_DEFAULTS = {
  action: 'show' as const,
  fade: true,
  duration: 0.5
} as const;

/**
 * 持続時間の範囲設定
 */
export const DURATION_RANGE = {
  min: 0.1,
  max: 5.0,
  step: 0.1
} as const;

/**
 * 表示制御定数の型定義
 */
export type ShowHideActionOption = ReturnType<typeof getShowHideActionOptions>[number];
export type FadeOption = ReturnType<typeof getFadeOptions>[number];
export type DurationPreset = ReturnType<typeof getDurationPresets>[number];
export type ShowHideAction = ShowHideActionOption['value'];
export type ShowHideDefaults = typeof SHOW_HIDE_DEFAULTS;
export type DurationRange = typeof DURATION_RANGE;
