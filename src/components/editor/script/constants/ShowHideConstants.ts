// src/components/editor/script/constants/ShowHideConstants.ts
// Phase D Step 2-A-1: 表示制御アクション統合定数定義
// SoundActionEditor.tsx成功パターン踏襲 - GameScript.ts型定義完全準拠

/**
 * Phase D: 表示制御アクションタイプ定義（GameScript.ts準拠）
 */
export const SHOW_HIDE_ACTION_OPTIONS = [
  { value: 'show', label: '表示', icon: '👁️', description: 'オブジェクトを表示状態にする' },
  { value: 'hide', label: '非表示', icon: '🙈', description: 'オブジェクトを非表示状態にする' }
] as const;

/**
 * Phase D: フェード効果オプション定義
 */
export const FADE_OPTIONS = [
  { value: true, label: 'フェード有り', icon: '✨', description: '滑らかにフェードイン・アウト' },
  { value: false, label: 'フェード無し', icon: '⚡', description: '即座に表示・非表示切り替え' }
] as const;

/**
 * Phase D: 表示制御の持続時間プリセット
 */
export const DURATION_PRESETS = [
  { value: 0.1, label: '瞬時', description: '0.1秒' },
  { value: 0.3, label: '高速', description: '0.3秒' },
  { value: 0.5, label: '標準', description: '0.5秒' },
  { value: 1.0, label: '遅い', description: '1.0秒' },
  { value: 2.0, label: '非常に遅い', description: '2.0秒' }
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
export type ShowHideActionOption = typeof SHOW_HIDE_ACTION_OPTIONS[number];
export type FadeOption = typeof FADE_OPTIONS[number];
export type DurationPreset = typeof DURATION_PRESETS[number];
export type ShowHideAction = ShowHideActionOption['value'];
export type ShowHideDefaults = typeof SHOW_HIDE_DEFAULTS;
export type DurationRange = typeof DURATION_RANGE;