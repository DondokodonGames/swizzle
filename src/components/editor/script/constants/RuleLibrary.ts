// src/components/editor/script/constants/RuleLibrary.ts
// Phase G完了版: カウンター条件・アクション追加
// 条件・アクションライブラリ統合管理

/**
 * Phase G: 発動条件ライブラリ（カウンター条件追加）
 */
export const CONDITION_LIBRARY = [
  // 基本条件（Phase A・B・C保護）
  { type: 'touch', label: 'タッチ', icon: '👆', description: 'オブジェクトがタッチされた時' },
  { type: 'time', label: '時間', icon: '⏰', description: '指定時間が経過した時' },
  { type: 'collision', label: '衝突', icon: '💥', description: 'オブジェクト同士が衝突した時' },
  { type: 'position', label: '位置', icon: '📍', description: 'オブジェクトが特定位置に到達した時' },
  
  // Phase D・E拡張条件
  { type: 'gameState', label: 'ゲーム状態', icon: '🎮', description: 'ゲームの状態（プレイ中・成功・失敗など）' },
  { type: 'animation', label: 'アニメ', icon: '🎬', description: 'アニメーションの状態（開始・終了・特定フレームなど）' },
  { type: 'flag', label: 'フラグ', icon: '🚩', description: 'カスタムフラグの状態' },
  
  // Phase G追加: カウンター条件
  { type: 'counter', label: 'カウンター', icon: '🔢', description: 'カウンター値の比較（スコア・ライフ・時間・アイテム数等）' }
] as const;

/**
 * Phase G: 実行アクションライブラリ（カウンターアクション追加）
 */
export const ACTION_LIBRARY = [
  // ゲーム制御アクション（Phase A・B・C保護）
  { type: 'success', label: '成功', icon: '🏆', description: 'ゲームクリア' },
  { type: 'failure', label: '失敗', icon: '💥', description: 'ゲームオーバー' },
  
  // 音響制御アクション（Phase D拡張）
  { type: 'playSound', label: '音再生', icon: '🔊', description: '効果音・BGMを再生' },
  
  // オブジェクト制御アクション（Phase D・E拡張）
  { type: 'show', label: '表示', icon: '👁️', description: 'オブジェクトを表示' },
  { type: 'hide', label: '非表示', icon: '🚫', description: 'オブジェクトを非表示' },
  { type: 'switchAnimation', label: 'アニメ切り替え', icon: '🎬', description: 'アニメーションを切り替え' },
  
  // 移動・エフェクトアクション（Phase D拡張）
  { type: 'move', label: '移動', icon: '🏃', description: 'オブジェクトを移動' },
  { type: 'effect', label: 'エフェクト', icon: '✨', description: 'エフェクトを実行' },
  
  // フラグ制御アクション（Phase A・B・C保護）
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', description: 'フラグをON/OFFに設定' },
  { type: 'toggleFlag', label: 'フラグ切替', icon: '🔄', description: 'フラグを切り替え' },
  
  // Phase G追加: カウンターアクション
  { type: 'counter', label: 'カウンター操作', icon: '🔢', description: 'カウンター値の操作（増加・減少・設定等）' }
] as const;

/**
 * 条件タイプの型定義
 */
export type ConditionType = typeof CONDITION_LIBRARY[number]['type'];

/**
 * アクションタイプの型定義
 */
export type ActionType = typeof ACTION_LIBRARY[number]['type'];

/**
 * Phase G: アクション表示優先度（カウンターアクション追加）
 */
export const PRIORITY_ACTIONS = [
  'success',          // 成功 - ゲーム制御最重要
  'failure',          // 失敗 - ゲーム制御最重要
  'counter',          // カウンター操作 - Phase G新機能・よく使われる
  'playSound',        // 音再生 - よく使われる
  'switchAnimation',  // アニメ切り替え - Phase E機能
  'show'              // 表示 - オブジェクト制御基本
] as const;

/**
 * Phase G: 優先表示用アクションライブラリ（上位6個）
 */
export const PRIORITY_ACTION_LIBRARY = PRIORITY_ACTIONS.map(type => 
  ACTION_LIBRARY.find(action => action.type === type)
).filter((action): action is NonNullable<typeof action> => action !== undefined);

/**
 * Phase G: ルールライブラリ統計情報（カウンター追加）
 */
export const RULE_LIBRARY_STATS = {
  conditionCount: CONDITION_LIBRARY.length,    // 8個の条件タイプ（+1: counter）
  actionCount: ACTION_LIBRARY.length,          // 12個のアクションタイプ（+1: counter）
  priorityActionCount: PRIORITY_ACTIONS.length, // 6個の優先アクション
  lastUpdate: '2025-09-16',                    // Phase G完了日
  version: 'G-1.0.0'                           // バージョン（Phase G完了）
} as const;

/**
 * アクション検索ヘルパー関数
 */
export const findActionByType = (type: ActionType) => {
  return ACTION_LIBRARY.find(action => action.type === type);
};

/**
 * 条件検索ヘルパー関数
 */
export const findConditionByType = (type: ConditionType) => {
  return CONDITION_LIBRARY.find(condition => condition.type === type);
};

/**
 * Phase G: アクション使用統計（カウンター追加・使用頻度順）
 */
export const ACTION_USAGE_STATS = [
  { type: 'success', usage: 'high', category: 'game-control' },
  { type: 'failure', usage: 'high', category: 'game-control' },
  { type: 'counter', usage: 'high', category: 'game-logic' },     // Phase G新機能・高使用頻度予想
  { type: 'playSound', usage: 'high', category: 'audio' },
  { type: 'show', usage: 'medium', category: 'object-control' },
  { type: 'hide', usage: 'medium', category: 'object-control' },
  { type: 'switchAnimation', usage: 'medium', category: 'object-control' },
  { type: 'move', usage: 'medium', category: 'movement' },
  { type: 'effect', usage: 'low', category: 'visual' },
  { type: 'setFlag', usage: 'low', category: 'state' },
  { type: 'toggleFlag', usage: 'low', category: 'state' }
] as const;

/**
 * Phase G: 条件使用統計（カウンター追加）
 */
export const CONDITION_USAGE_STATS = [
  { type: 'touch', usage: 'high', category: 'user-input' },
  { type: 'time', usage: 'high', category: 'timing' },
  { type: 'counter', usage: 'high', category: 'game-logic' },      // Phase G新機能・高使用頻度予想
  { type: 'collision', usage: 'medium', category: 'physics' },
  { type: 'gameState', usage: 'medium', category: 'game-control' },
  { type: 'flag', usage: 'medium', category: 'state' },
  { type: 'animation', usage: 'low', category: 'visual' },
  { type: 'position', usage: 'low', category: 'spatial' }
] as const;

/**
 * Phase G: カテゴリ別ライブラリ取得ヘルパー
 */
export const getConditionsByCategory = (category: string) => {
  return CONDITION_LIBRARY.filter(condition => {
    const stat = CONDITION_USAGE_STATS.find(stat => stat.type === condition.type);
    return stat?.category === category;
  });
};

export const getActionsByCategory = (category: string) => {
  return ACTION_LIBRARY.filter(action => {
    const stat = ACTION_USAGE_STATS.find(stat => stat.type === action.type);
    return stat?.category === category;
  });
};

/**
 * Phase G: 新機能フラグ（カウンター機能有効化）
 */
export const FEATURE_FLAGS = {
  counterSystem: true,           // カウンターシステム有効
  animationSystem: true,         // アニメーションシステム有効
  gameStateSystem: true,         // ゲーム状態システム有効
  advancedTiming: true,          // 高度タイミング機能有効
  debugMode: false              // デバッグモード
} as const;