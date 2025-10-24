// src/components/editor/script/constants/GameStateConstants.ts
// Phase E Step 0: ゲーム状態条件詳細定義
// TouchConstants.ts成功パターン踏襲 - GameScript.ts型定義完全準拠

/**
 * Phase E: ゲーム状態タイプ詳細定義（GameScript.ts準拠）
 */
export const GAME_STATE_OPTIONS = [
  { value: 'success', label: 'ゲーム成功', icon: '🏆', description: 'ゲームクリア・成功状態' },
  { value: 'failure', label: 'ゲーム失敗', icon: '💥', description: 'ゲームオーバー・失敗状態' },
  { value: 'playing', label: 'プレイ中', icon: '🎮', description: 'ゲーム進行中・プレイ状態' },
  { value: 'paused', label: '一時停止', icon: '⏸️', description: 'ゲーム一時停止状態' }
] as const;

/**
 * Phase E: 状態チェック方式詳細定義（GameScript.ts準拠）
 */
export const STATE_CHECK_OPTIONS = [
  { value: 'is', label: '〜の状態', icon: '🔍', description: '指定状態である間' },
  { value: 'not', label: '〜でない状態', icon: '🚫', description: '指定状態でない間' },
  { value: 'became', label: '〜になった瞬間', icon: '⚡', description: '指定状態に変化した瞬間' }
] as const;

/**
 * Phase E: ゲーム状態の詳細説明
 */
export const GAME_STATE_DESCRIPTIONS = {
  success: {
    detail: 'ゲームクリア・勝利・目標達成時の状態',
    examples: ['スコア目標達成時', 'すべてのタスク完了時', 'ボス撃破時']
  },
  failure: {
    detail: 'ゲームオーバー・敗北・失敗時の状態', 
    examples: ['時間切れ時', '残機0時', 'HP0時']
  },
  playing: {
    detail: 'ゲーム進行中・プレイヤー操作可能状態',
    examples: ['ゲーム開始後', '通常プレイ時', '操作受付中']
  },
  paused: {
    detail: 'ゲーム一時停止・操作無効状態',
    examples: ['ポーズメニュー表示時', '設定画面表示時', '中断時']
  }
} as const;

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
export type GameStateOption = typeof GAME_STATE_OPTIONS[number];
export type StateCheckOption = typeof STATE_CHECK_OPTIONS[number];
export type GameStateType = GameStateOption['value'];
export type StateCheckType = StateCheckOption['value'];
export type GameStateDefaults = typeof GAME_STATE_DEFAULTS;
export type GameStateDescriptions = typeof GAME_STATE_DESCRIPTIONS;