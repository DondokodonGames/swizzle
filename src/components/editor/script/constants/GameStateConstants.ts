// src/components/editor/script/constants/GameStateConstants.ts
// Phase E Step 0: ゲーム状態条件詳細定義
// TouchConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

import i18n from '../../../i18n';

/**
 * Phase E: ゲーム状態タイプ詳細定義（GameScript.ts準拠）
 */
export const getGameStateOptions = () => [
  { value: 'success', label: i18n.t('conditions.gameState.success.label'), icon: '🏆', description: i18n.t('conditions.gameState.success.description') },
  { value: 'failure', label: i18n.t('conditions.gameState.failure.label'), icon: '💥', description: i18n.t('conditions.gameState.failure.description') },
  { value: 'playing', label: i18n.t('conditions.gameState.playing.label'), icon: '🎮', description: i18n.t('conditions.gameState.playing.description') },
  { value: 'paused', label: i18n.t('conditions.gameState.paused.label'), icon: '⏸️', description: i18n.t('conditions.gameState.paused.description') }
] as const;

/**
 * Phase E: 状態チェック方式詳細定義（GameScript.ts準拠）
 */
export const getStateCheckOptions = () => [
  { value: 'is', label: i18n.t('conditions.gameState.checkTypes.is.label'), icon: '🔍', description: i18n.t('conditions.gameState.checkTypes.is.description') },
  { value: 'not', label: i18n.t('conditions.gameState.checkTypes.not.label'), icon: '🚫', description: i18n.t('conditions.gameState.checkTypes.not.description') },
  { value: 'became', label: i18n.t('conditions.gameState.checkTypes.became.label'), icon: '⚡', description: i18n.t('conditions.gameState.checkTypes.became.description') }
] as const;

/**
 * Phase E: ゲーム状態の詳細説明
 */
export const getGameStateDescriptions = () => ({
  success: {
    detail: i18n.t('conditions.gameState.success.detail'),
    examples: i18n.t('conditions.gameState.success.examples', { returnObjects: true }) as string[]
  },
  failure: {
    detail: i18n.t('conditions.gameState.failure.detail'),
    examples: i18n.t('conditions.gameState.failure.examples', { returnObjects: true }) as string[]
  },
  playing: {
    detail: i18n.t('conditions.gameState.playing.detail'),
    examples: i18n.t('conditions.gameState.playing.examples', { returnObjects: true }) as string[]
  },
  paused: {
    detail: i18n.t('conditions.gameState.paused.detail'),
    examples: i18n.t('conditions.gameState.paused.examples', { returnObjects: true }) as string[]
  }
} as const);

/**
 * ゲーム状態条件のデフォルト値
 */
export const GAME_STATE_DEFAULTS = {
  state: 'playing' as const,
  checkType: 'is' as const
} as const;

/**
 * ゲーム状態定数の型定義（TouchConstants.tsパターン踏襲）
 */
export type GameStateOption = ReturnType<typeof getGameStateOptions>[number];
export type StateCheckOption = ReturnType<typeof getStateCheckOptions>[number];
export type GameStateType = GameStateOption['value'];
export type StateCheckType = StateCheckOption['value'];
export type GameStateDefaults = typeof GAME_STATE_DEFAULTS;
export type GameStateDescriptions = ReturnType<typeof getGameStateDescriptions>;
