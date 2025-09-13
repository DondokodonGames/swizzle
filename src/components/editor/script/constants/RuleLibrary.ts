// src/components/editor/script/constants/RuleLibrary.ts
// Phase E Step 0: GameState条件追加版
// 既存ライブラリ保護 + gameState条件追加

/**
 * 条件ライブラリ（発動条件の選択肢）
 */
export const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆' },
  { type: 'time', label: '時間', icon: '⏰' },
  { type: 'collision', label: '衝突', icon: '💥' },
  { type: 'gameState', label: 'ゲーム状態', icon: '🎮' }, // Phase E追加
  { type: 'animation', label: 'アニメ', icon: '🎬' },
  { type: 'flag', label: 'フラグ', icon: '🚩' }
] as const;

/**
 * アクションライブラリ（実行アクションの選択肢）
 */
export const ACTION_LIBRARY = [
  { type: 'success', label: '成功', icon: '🏆' },
  { type: 'failure', label: '失敗', icon: '💥' },
  { type: 'playSound', label: '音再生', icon: '🔊' },
  { type: 'move', label: '移動', icon: '🏃' },
  { type: 'effect', label: 'エフェクト', icon: '✨' },
  { type: 'show', label: '表示', icon: '👁️' },
  { type: 'hide', label: '非表示', icon: '🙈' },
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩' },
  { type: 'toggleFlag', label: 'フラグ切替', icon: '🔄' },
  { type: 'switchAnimation', label: 'アニメ切替', icon: '🎬' }
] as const;

/**
 * ライブラリ型定義
 */
export type ConditionLibraryItem = typeof CONDITION_LIBRARY[number];
export type ActionLibraryItem = typeof ACTION_LIBRARY[number];
export type ConditionType = ConditionLibraryItem['type'];
export type ActionType = ActionLibraryItem['type'];