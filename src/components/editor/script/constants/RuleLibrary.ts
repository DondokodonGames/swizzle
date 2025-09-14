// src/components/editor/script/constants/RuleLibrary.ts
// Phase E Step 3完了版: switchAnimationアクション追加
// 条件・アクションライブラリ統合管理

/**
 * Phase E Step 3: 発動条件ライブラリ（アニメーション条件追加完了）
 */
export const CONDITION_LIBRARY = [
  // 基本条件（Phase A・B・C保護）
  { type: 'touch', label: 'タッチ', icon: '👆', description: 'オブジェクトがタッチされた時' },
  { type: 'time', label: '時間', icon: '⏰', description: '指定時間が経過した時' },
  { type: 'collision', label: '衝突', icon: '💥', description: 'オブジェクト同士が衝突した時' },
  { type: 'position', label: '位置', icon: '📍', description: 'オブジェクトが特定位置に到達した時' },
  
  // Phase D・E拡張条件
  { type: 'gameState', label: 'ゲーム状態', icon: '🎮', description: 'ゲームの状態（プレイ中・成功・失敗など）' }, // Phase E追加
  { type: 'animation', label: 'アニメ', icon: '🎬', description: 'アニメーションの状態（開始・終了・特定フレームなど）' }, // Phase E Step 2追加
  { type: 'flag', label: 'フラグ', icon: '🚩', description: 'カスタムフラグの状態' }
] as const;

/**
 * Phase E Step 3完了: 実行アクションライブラリ（switchAnimation追加）
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
  { type: 'switchAnimation', label: 'アニメ切り替え', icon: '🎬', description: 'アニメーションを切り替え' }, // Phase E Step 3追加
  
  // 移動・エフェクトアクション（Phase D拡張）
  { type: 'move', label: '移動', icon: '🏃', description: 'オブジェクトを移動' },
  { type: 'effect', label: 'エフェクト', icon: '✨', description: 'エフェクトを実行' },
  
  // フラグ制御アクション（Phase A・B・C保護）
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', description: 'フラグをON/OFFに設定' },
  { type: 'toggleFlag', label: 'フラグ切替', icon: '🔄', description: 'フラグを切り替え' }
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
 * Phase E Step 3: アクション表示優先度（重要アクションを上位6個に配置）
 */
export const PRIORITY_ACTIONS = [
  'success',          // 成功 - ゲーム制御最重要
  'failure',          // 失敗 - ゲーム制御最重要
  'playSound',        // 音再生 - よく使われる
  'switchAnimation',  // アニメ切り替え - Phase E Step 3新機能
  'show',             // 表示 - オブジェクト制御基本
  'hide'              // 非表示 - オブジェクト制御基本
] as const;

/**
 * Phase E Step 3: 優先表示用アクションライブラリ（上位6個）
 */
export const PRIORITY_ACTION_LIBRARY = PRIORITY_ACTIONS.map(type => 
  ACTION_LIBRARY.find(action => action.type === type)
).filter(Boolean);

/**
 * Phase E Step 3: ルールライブラリ統計情報
 */
export const RULE_LIBRARY_STATS = {
  conditionCount: CONDITION_LIBRARY.length,    // 7個の条件タイプ
  actionCount: ACTION_LIBRARY.length,          // 11個のアクションタイプ
  priorityActionCount: PRIORITY_ACTIONS.length, // 6個の優先アクション
  lastUpdate: '2025-09-14',                    // Phase E Step 3完了日
  version: 'E-3.0.0'                           // バージョン
} as const;

/**
 * Phase E Step 3: アクション検索ヘルパー関数
 */
export const findActionByType = (type: ActionType) => {
  return ACTION_LIBRARY.find(action => action.type === type);
};

/**
 * Phase E Step 3: 条件検索ヘルパー関数
 */
export const findConditionByType = (type: ConditionType) => {
  return CONDITION_LIBRARY.find(condition => condition.type === type);
};

/**
 * Phase E Step 3: アクション使用統計（使用頻度順）
 */
export const ACTION_USAGE_STATS = [
  { type: 'success', usage: 'high', category: 'game-control' },
  { type: 'failure', usage: 'high', category: 'game-control' },
  { type: 'playSound', usage: 'high', category: 'audio' },
  { type: 'show', usage: 'medium', category: 'object-control' },
  { type: 'hide', usage: 'medium', category: 'object-control' },
  { type: 'switchAnimation', usage: 'new', category: 'object-control' }, // Phase E Step 3新機能
  { type: 'move', usage: 'medium', category: 'movement' },
  { type: 'effect', usage: 'low', category: 'visual' },
  { type: 'setFlag', usage: 'low', category: 'state' },
  { type: 'toggleFlag', usage: 'low', category: 'state' }
] as const;