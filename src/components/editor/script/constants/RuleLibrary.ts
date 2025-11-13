// src/components/editor/script/constants/RuleLibrary.ts
// Phase G-3完了版: ランダムシステム統合完了
// 条件・アクションライブラリ統合管理

/**
 * Phase G-3: 発動条件ライブラリ（ランダム条件追加）
 */
export const CONDITION_LIBRARY = [
  // 基本条件（Phase A・B・C保護）
  { type: 'touch', label: 'タッチ', icon: '👆', description: 'オブジェクトがタッチされた時' },
  { type: 'time', label: '時間', icon: '⏰', description: '指定時間が経過した時' },
  { type: 'collision', label: '衝突', icon: '💥', description: 'オブジェクト同士が衝突した時' },
  // 位置条件削除: 衝突条件で代用可能

  // Phase D・E拡張条件
  { type: 'gameState', label: 'ゲーム状態', icon: '🎮', description: 'ゲームの状態（プレイ中・成功・失敗など）' },
  { type: 'animation', label: 'アニメ', icon: '🎬', description: 'アニメーションの状態（開始・終了・特定フレームなど）' },
  { type: 'flag', label: 'フラグ', icon: '🚩', description: 'カスタムフラグの状態' },

  // Phase G追加: カウンター条件
  { type: 'counter', label: 'カウンター', icon: '🔢', description: 'カウンター値の比較（スコア・ライフ・時間・アイテム数等）' },

  // Phase G-3追加: ランダム条件
  { type: 'random', label: 'ランダム', icon: '🎲', description: '確率的な条件発動（エンドレス系ゲーム・自動生成に最適）' }
] as const;

/**
 * Phase G-3: 実行アクションライブラリ（ランダムアクション追加）
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
  { type: 'counter', label: 'カウンター操作', icon: '🔢', description: 'カウンター値の操作（増加・減少・設定等）' },
  
  // Phase G-3追加: ランダムアクション
  { type: 'randomAction', label: 'ランダム実行', icon: '🎲', description: '複数アクションから重み付きランダム選択（エンドレス系・バリエーション生成）' }
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
 * Phase G-3: アクション表示優先度（ランダムアクション追加）
 */
export const PRIORITY_ACTIONS = [
  'success',          // 成功 - ゲーム制御最重要
  'failure',          // 失敗 - ゲーム制御最重要
  'randomAction',     // ランダム実行 - Phase G-3新機能・エンドレス系ゲームで高使用頻度
  'counter',          // カウンター操作 - Phase G機能・よく使われる
  'playSound',        // 音再生 - よく使われる
  'switchAnimation'   // アニメ切り替え - Phase E機能
] as const;

/**
 * Phase G-3: 優先表示用アクションライブラリ（上位6個・ランダム含む）
 */
export const PRIORITY_ACTION_LIBRARY = PRIORITY_ACTIONS.map(type => 
  ACTION_LIBRARY.find(action => action.type === type)
).filter((action): action is NonNullable<typeof action> => action !== undefined);

/**
 * Phase G-3: ルールライブラリ統計情報（ランダム追加・位置条件削除）
 */
export const RULE_LIBRARY_STATS = {
  conditionCount: CONDITION_LIBRARY.length,    // 8個の条件タイプ（位置条件削除）
  actionCount: ACTION_LIBRARY.length,          // 13個のアクションタイプ（+1: randomAction）
  priorityActionCount: PRIORITY_ACTIONS.length, // 6個の優先アクション
  lastUpdate: '2025-11-13',                    // 位置条件削除日
  version: 'G-3.1.0'                           // バージョン（位置条件削除）
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
 * Phase G-3: アクション使用統計（ランダム追加・使用頻度順）
 */
export const ACTION_USAGE_STATS = [
  { type: 'success', usage: 'high', category: 'game-control' },
  { type: 'failure', usage: 'high', category: 'game-control' },
  { type: 'randomAction', usage: 'high', category: 'game-logic' },    // Phase G-3新機能・エンドレス系で高使用頻度
  { type: 'counter', usage: 'high', category: 'game-logic' },
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
 * Phase G-3: 条件使用統計（ランダム追加）
 */
export const CONDITION_USAGE_STATS = [
  { type: 'touch', usage: 'high', category: 'user-input' },
  { type: 'time', usage: 'high', category: 'timing' },
  { type: 'random', usage: 'high', category: 'game-logic' },         // Phase G-3新機能・エンドレス系で高使用頻度
  { type: 'counter', usage: 'high', category: 'game-logic' },
  { type: 'collision', usage: 'medium', category: 'physics' },
  { type: 'gameState', usage: 'medium', category: 'game-control' },
  { type: 'flag', usage: 'medium', category: 'state' },
  { type: 'animation', usage: 'low', category: 'visual' }
  // 位置条件削除: 衝突条件で代用可能
] as const;

/**
 * Phase G-3: カテゴリ別ライブラリ取得ヘルパー
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
 * Phase G-3: 新機能フラグ（ランダム機能有効化）
 */
export const FEATURE_FLAGS = {
  counterSystem: true,           // カウンターシステム有効
  randomSystem: true,            // ランダムシステム有効（Phase G-3新機能）
  animationSystem: true,         // アニメーションシステム有効
  gameStateSystem: true,         // ゲーム状態システム有効
  advancedTiming: true,          // 高度タイミング機能有効
  debugMode: false              // デバッグモード
} as const;

/**
 * Phase G-3追加: ランダムシステム専用ライブラリ
 */

// ランダム条件プリセット
export const RANDOM_CONDITION_PRESETS = [
  { probability: 0.1, label: '10%', description: '低確率・レアイベント用', icon: '🟦' },
  { probability: 0.3, label: '30%', description: '中確率・バランス型', icon: '🟨' },
  { probability: 0.5, label: '50%', description: '半々・不確定要素', icon: '🟧' },
  { probability: 0.7, label: '70%', description: '高確率・安定動作', icon: '🟩' },
  { probability: 0.9, label: '90%', description: '超高確率・ほぼ確実', icon: '🟪' }
] as const;

// ランダム間隔プリセット
export const RANDOM_INTERVAL_PRESETS = [
  { interval: 500, label: '0.5秒', description: '高速・リアルタイム' },
  { interval: 1000, label: '1秒', description: '標準・バランス型' },
  { interval: 2000, label: '2秒', description: '中間・適度な間隔' },
  { interval: 5000, label: '5秒', description: '低頻度・スペシャルイベント' },
  { interval: 10000, label: '10秒', description: '超低頻度・ボーナス用' }
] as const;

// エンドレスゲーム向けランダムパターン
export const ENDLESS_GAME_RANDOM_PATTERNS = [
  {
    name: 'Temple Run型',
    description: '障害物・アイテム・パワーアップの自動生成',
    conditions: [
      { probability: 0.3, interval: 1000, description: '30%で1秒間隔の障害物生成' },
      { probability: 0.1, interval: 2000, description: '10%で2秒間隔のパワーアップ' }
    ]
  },
  {
    name: 'Flappy Bird型',
    description: 'パイプ生成・難易度調整・ボーナス要素',
    conditions: [
      { probability: 0.8, interval: 2500, description: '80%で2.5秒間隔のパイプ生成' },
      { probability: 0.05, interval: 10000, description: '5%で10秒間隔のボーナス' }
    ]
  },
  {
    name: 'Subway Surfers型',
    description: 'コイン・障害物・特殊アイテムの配置',
    conditions: [
      { probability: 0.6, interval: 800, description: '60%で0.8秒間隔のコイン生成' },
      { probability: 0.2, interval: 3000, description: '20%で3秒間隔の障害物' }
    ]
  }
] as const;

// ランダムアクション重み付けプリセット
export const RANDOM_ACTION_WEIGHT_PRESETS = [
  {
    name: '均等配分',
    description: 'すべてのアクションが同じ確率',
    weights: [1, 1, 1, 1]
  },
  {
    name: '重点配分',
    description: '1つのアクションを重視',
    weights: [3, 1, 1, 1]
  },
  {
    name: 'レア混在',
    description: '通常アクション + レアアクション',
    weights: [5, 5, 2, 1]
  },
  {
    name: 'ピラミッド',
    description: '段階的な重み付け',
    weights: [4, 3, 2, 1]
  }
] as const;

/**
 * ランダムシステム検証ヘルパー
 */
export const validateRandomCondition = (probability: number, interval?: number): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let isValid = true;

  // 確率値検証
  if (probability < 0 || probability > 1) {
    warnings.push('確率は0.0～1.0の範囲で設定してください');
    isValid = false;
  }

  if (probability < 0.01) {
    suggestions.push('1%未満の確率は発動頻度が極端に低くなる可能性があります');
  }

  if (probability > 0.95) {
    suggestions.push('95%超の確率はほぼ毎回発動するため、時間条件の方が適している可能性があります');
  }

  // 間隔検証
  if (interval !== undefined) {
    if (interval < 100) {
      warnings.push('100ms未満の間隔はパフォーマンスに影響する可能性があります');
    }

    if (interval > 60000) {
      suggestions.push('60秒超の間隔は体感上の変化が少ない可能性があります');
    }
  }

  return { isValid, warnings, suggestions };
};

/**
 * ランダムアクション最適化ヘルパー
 */
export const optimizeRandomActionWeights = (weights: number[]): {
  optimizedWeights: number[];
  totalWeight: number;
  probabilities: number[];
  recommendations: string[];
} => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = weights.map(weight => weight / totalWeight);
  const recommendations: string[] = [];

  // 最適化提案
  if (probabilities.some(p => p < 0.05)) {
    recommendations.push('5%未満の確率のアクションは発動頻度が低くなります');
  }

  if (probabilities.some(p => p > 0.8)) {
    recommendations.push('80%超の確率のアクションが他を圧迫している可能性があります');
  }

  const maxRatio = Math.max(...probabilities) / Math.min(...probabilities);
  if (maxRatio > 10) {
    recommendations.push('重み比率が10倍以上の差があります。バランス調整を検討してください');
  }

  return {
    optimizedWeights: weights,
    totalWeight,
    probabilities,
    recommendations
  };
};

/**
 * エンドレスゲーム最適化提案
 */
export const getEndlessGameOptimizationSuggestions = (
  randomConditions: number,
  randomActions: number,
  averageProbability: number
): string[] => {
  const suggestions: string[] = [];

  if (randomConditions === 0) {
    suggestions.push('エンドレスゲームにはランダム条件の使用を推奨します');
  }

  if (randomConditions > 5) {
    suggestions.push('ランダム条件が多すぎるとパフォーマンスに影響する可能性があります');
  }

  if (averageProbability < 0.1) {
    suggestions.push('平均確率が低すぎると、イベント発生頻度が不足する可能性があります');
  }

  if (averageProbability > 0.8) {
    suggestions.push('平均確率が高すぎると、ランダム性が失われる可能性があります');
  }

  if (randomActions === 0 && randomConditions > 0) {
    suggestions.push('ランダム条件を使用する場合、ランダムアクションの併用を検討してください');
  }

  return suggestions;
};