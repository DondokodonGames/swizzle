/**
 * カウンター専用型定義
 * ファイル: src/types/counterTypes.ts
 * 目的: 内部カウンターシステム（スコア・ライフ・時間・アイテム数等）
 * 仕様: フラグと同様のグローバル共有、複数オブジェクトから操作可能
 */

// カウンター基本定義
export interface GameCounter {
  id: string;                           // ユニークID
  name: string;                         // ユーザー設定名（score, lives, time等）
  initialValue: number;                 // 初期値
  currentValue: number;                 // 現在値
  
  // 制限設定
  min?: number;                         // 最小値（undefinedは無制限）
  max?: number;                         // 最大値（undefinedは無制限）
  step?: number;                        // 増減単位（デフォルト1）
  
  // 表示設定
  display?: CounterDisplay;
  
  // 永続化レベル
  persistence: 'session' | 'game' | 'temporary';
  
  // メタデータ
  description?: string;                 // 説明文
  category?: CounterCategory;           // カテゴリ分類
  createdAt: string;
  lastModified: string;
}

// カウンター表示設定
export interface CounterDisplay {
  visible: boolean;                     // 画面表示の有無
  position: { x: number; y: number };   // 表示位置（0-1正規化）
  format: CounterFormat;                // 表示形式
  style?: CounterDisplayStyle;          // スタイル設定
  autoHide?: boolean;                   // 0になった時の自動非表示
}

// 表示形式
export type CounterFormat = 
  | 'number'                            // 123
  | 'percentage'                        // 75%
  | 'time'                              // 2:30
  | 'fraction'                          // 3/10
  | 'custom';                           // カスタム形式

// 表示スタイル
export interface CounterDisplayStyle {
  fontSize?: number;                    // フォントサイズ
  color?: string;                       // テキスト色（hex）
  backgroundColor?: string;             // 背景色（hex）
  border?: boolean;                     // 枠線の有無
  shadow?: boolean;                     // 影の有無
  animation?: CounterAnimation;         // アニメーション設定
}

// カウンターアニメーション
export type CounterAnimation = 
  | 'none'                              // アニメーションなし
  | 'bounce'                            // 値変更時のバウンス
  | 'flash'                             // 値変更時のフラッシュ
  | 'slide'                             // 数値スライド
  | 'pulse';                            // パルス効果

// カウンターカテゴリ
export type CounterCategory = 
  | 'score'                             // スコア系
  | 'status'                            // ステータス系（ライフ・HP等）
  | 'resource'                          // リソース系（アイテム・コイン等）
  | 'progress'                          // 進行度系（レベル・経験値等）
  | 'time'                              // 時間系（残り時間・経過時間等）
  | 'custom';                           // カスタム分類

// カウンター操作タイプ
export type CounterOperation = 
  | 'increment'                         // 増加
  | 'decrement'                         // 減少
  | 'set'                               // 設定
  | 'reset'                             // リセット（初期値に戻す）
  | 'add'                               // 加算（incrementの別名）
  | 'subtract'                          // 減算（decrementの別名）
  | 'multiply'                          // 乗算
  | 'divide';                           // 除算

// カウンター比較演算子
export type CounterComparison = 
  | 'equals'                            // ==（等しい）
  | 'notEquals'                         // !=（等しくない）
  | 'greater'                           // >（より大きい）
  | 'greaterOrEqual'                    // >=（以上）
  | 'less'                              // <（より小さい）
  | 'lessOrEqual'                       // <=（以下）
  | 'between'                           // 範囲内
  | 'notBetween'                        // 範囲外
  | 'changed';                          // 値が変更された

// カウンター変更イベント
export interface CounterChangeEvent {
  counterName: string;                  // カウンター名
  oldValue: number;                     // 変更前の値
  newValue: number;                     // 変更後の値
  operation: CounterOperation;          // 実行された操作
  timestamp: number;                    // タイムスタンプ（ミリ秒）
  triggeredBy?: string;                 // 実行元ルールID（オプション）
}

// 🔧 新規追加: カウンター通知設定
export interface CounterNotification {
  enabled: boolean;                       // 通知の有無
  message?: string;                       // カスタムメッセージ
  duration?: number;                      // 表示時間（秒）
  style?: {
    color?: string;                       // テキスト色
    backgroundColor?: string;             // 背景色
    fontSize?: number;                    // フォントサイズ
    position?: 'top' | 'center' | 'bottom'; // 表示位置
  };
}

// 🔧 新規追加: カウンター条件・アクション型定義
export interface CounterCondition {
  type: 'counter';
  counterName: string;
  comparison: CounterComparison;
  value: number;
  rangeMax?: number;
  tolerance?: number;
}

export interface CounterAction {
  type: 'counter';
  operation: CounterOperation;
  counterName: string;
  value?: number;
  notification?: CounterNotification;
}

// プリセットカウンター定義
export interface PresetCounter {
  id: string;                           // プリセットID
  name: string;                         // 表示名
  description: string;                  // 説明
  icon: string;                         // アイコン（絵文字）
  category: CounterCategory;            // カテゴリ
  defaultConfig: Omit<GameCounter, 'id' | 'createdAt' | 'lastModified'>; // デフォルト設定
}

// プリセットカウンター一覧（5種類）
export const PRESET_COUNTERS: PresetCounter[] = [
  {
    id: 'score',
    name: 'スコア',
    description: 'ゲームの得点を管理',
    icon: '🏆',
    category: 'score',
    defaultConfig: {
      name: 'score',
      initialValue: 0,
      currentValue: 0,
      min: 0,
      step: 1,
      persistence: 'game',
      display: {
        visible: true,
        position: { x: 0.05, y: 0.05 },
        format: 'number',
        style: {
          fontSize: 24,
          color: '#1f2937',
          backgroundColor: '#f3f4f6',
          border: true,
          shadow: true,
          animation: 'bounce'
        }
      }
    }
  },
  {
    id: 'lives',
    name: 'ライフ',
    description: 'プレイヤーの残機数を管理',
    icon: '❤️',
    category: 'status',
    defaultConfig: {
      name: 'lives',
      initialValue: 3,
      currentValue: 3,
      min: 0,
      max: 99,
      step: 1,
      persistence: 'game',
      display: {
        visible: true,
        position: { x: 0.05, y: 0.15 },
        format: 'number',
        style: {
          fontSize: 20,
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          border: true,
          shadow: true,
          animation: 'flash'
        }
      }
    }
  },
  {
    id: 'time',
    name: '時間',
    description: '残り時間・経過時間を管理',
    icon: '⏱️',
    category: 'time',
    defaultConfig: {
      name: 'time',
      initialValue: 60,
      currentValue: 60,
      min: 0,
      step: 1,
      persistence: 'game',
      display: {
        visible: true,
        position: { x: 0.85, y: 0.05 },
        format: 'time',
        style: {
          fontSize: 22,
          color: '#1e40af',
          backgroundColor: '#eff6ff',
          border: true,
          shadow: true,
          animation: 'pulse'
        }
      }
    }
  },
  {
    id: 'items',
    name: 'アイテム',
    description: 'アイテム数・コイン数を管理',
    icon: '💰',
    category: 'resource',
    defaultConfig: {
      name: 'items',
      initialValue: 0,
      currentValue: 0,
      min: 0,
      step: 1,
      persistence: 'game',
      display: {
        visible: true,
        position: { x: 0.05, y: 0.25 },
        format: 'number',
        style: {
          fontSize: 18,
          color: '#d97706',
          backgroundColor: '#fffbeb',
          border: true,
          shadow: true,
          animation: 'bounce'
        }
      }
    }
  },
  {
    id: 'progress',
    name: '進行度',
    description: 'レベル・経験値・達成度を管理',
    icon: '📊',
    category: 'progress',
    defaultConfig: {
      name: 'progress',
      initialValue: 0,
      currentValue: 0,
      min: 0,
      max: 100,
      step: 1,
      persistence: 'game',
      display: {
        visible: true,
        position: { x: 0.85, y: 0.15 },
        format: 'percentage',
        style: {
          fontSize: 16,
          color: '#059669',
          backgroundColor: '#ecfdf5',
          border: true,
          shadow: true,
          animation: 'slide'
        }
      }
    }
  }
];

// カウンター検証ルール
export interface CounterValidationRule {
  counterName: string;                  // カウンター名
  validations: Array<{
    type: 'range' | 'step' | 'type' | 'custom';
    message: string;                    // エラーメッセージ
    condition?: (value: number) => boolean; // カスタム検証関数
  }>;
}

// カウンター操作履歴
export interface CounterOperationHistory {
  id: string;                           // 履歴ID
  counterName: string;                  // カウンター名
  operation: CounterOperation;          // 操作タイプ
  value: number;                        // 操作値
  oldValue: number;                     // 変更前値
  newValue: number;                     // 変更後値
  triggeredBy: string;                  // 実行元（ルールID・ユーザー等）
  timestamp: number;                    // 実行時刻
}

// カウンター統計情報
export interface CounterStatistics {
  counterName: string;                  // カウンター名
  totalOperations: number;              // 総操作回数
  incrementCount: number;               // 増加回数
  decrementCount: number;               // 減少回数
  maxValue: number;                     // 最大到達値
  minValue: number;                     // 最小到達値
  averageValue: number;                 // 平均値
  lastOperationTime: number;            // 最終操作時刻
  usageFrequency: 'high' | 'medium' | 'low'; // 使用頻度
}

// ヘルパー関数：カウンター値のクランプ（範囲制限）
export const clampCounterValue = (value: number, counter: GameCounter): number => {
  let clampedValue = value;
  
  if (counter.min !== undefined) {
    clampedValue = Math.max(clampedValue, counter.min);
  }
  
  if (counter.max !== undefined) {
    clampedValue = Math.min(clampedValue, counter.max);
  }
  
  return clampedValue;
};

// ヘルパー関数：カウンター値のフォーマット
export const formatCounterValue = (value: number, format: CounterFormat): string => {
  switch (format) {
    case 'number':
      return value.toString();
    case 'percentage':
      return `${Math.round(value)}%`;
    case 'time':
      const minutes = Math.floor(value / 60);
      const seconds = Math.floor(value % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    case 'fraction':
      // 分数表示は追加のmax値情報が必要（後で実装）
      return value.toString();
    case 'custom':
      // カスタムフォーマットは後で実装
      return value.toString();
    default:
      return value.toString();
  }
};

// ヘルパー関数：プリセットカウンター取得
export const getPresetCounter = (presetId: string): PresetCounter | undefined => {
  return PRESET_COUNTERS.find(preset => preset.id === presetId);
};

// ヘルパー関数：カウンター作成
export const createCounter = (
  name: string, 
  initialValue: number = 0,
  options: Partial<GameCounter> = {}
): GameCounter => {
  const now = new Date().toISOString();
  
  return {
    id: `counter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    initialValue,
    currentValue: initialValue,
    persistence: 'game',
    createdAt: now,
    lastModified: now,
    ...options
  };
};

// ヘルパー関数：プリセットからカウンター作成
export const createCounterFromPreset = (presetId: string): GameCounter | null => {
  const preset = getPresetCounter(presetId);
  
  if (!preset) {
    console.error(`プリセットカウンター '${presetId}' が見つかりません`);
    return null;
  }
  
  const now = new Date().toISOString();
  
  return {
    ...preset.defaultConfig,
    id: `counter_${presetId}_${Date.now()}`,
    createdAt: now,
    lastModified: now
  };
};

// ヘルパー関数：カウンター比較操作
export const compareCounterValue = (
  value: number,
  comparison: CounterComparison,
  targetValue: number,
  rangeMax?: number
): boolean => {
  switch (comparison) {
    case 'equals':
      return value === targetValue;
    case 'notEquals':
      return value !== targetValue;
    case 'greater':
      return value > targetValue;
    case 'greaterOrEqual':
      return value >= targetValue;
    case 'less':
      return value < targetValue;
    case 'lessOrEqual':
      return value <= targetValue;
    case 'between':
      return rangeMax !== undefined && value >= targetValue && value <= rangeMax;
    case 'notBetween':
      return rangeMax !== undefined && !(value >= targetValue && value <= rangeMax);
    case 'changed':
      // 変更検知は外部で管理される前回値との比較が必要
      return false;
    default:
      return false;
  }
};

// 🔧 新規追加: ヘルパー関数群（型安全版）

// カウンター条件作成ヘルパー
export const createCounterCondition = (
  counterName: string,
  comparison: CounterComparison,
  value: number,
  rangeMax?: number
): CounterCondition => {
  return {
    type: 'counter',
    counterName,
    comparison,
    value,
    rangeMax
  };
};

// カウンターアクション作成ヘルパー
export const createCounterAction = (
  operation: CounterOperation,
  counterName: string,
  value?: number,
  notification?: CounterNotification
): CounterAction => {
  return {
    type: 'counter',
    operation,
    counterName,
    value,
    notification
  };
};

// カウンター条件の表示名取得（型安全版）
export const getCounterConditionDisplayName = (condition: CounterCondition): string => {
  const comparisons: Record<CounterComparison, string> = {
    equals: '等しい',
    notEquals: '等しくない',
    greater: 'より大きい',
    greaterOrEqual: '以上',
    less: 'より小さい',
    lessOrEqual: '以下',
    between: '範囲内',
    notBetween: '範囲外',
    changed: '変更された'
  };
  
  const comparisonText = comparisons[condition.comparison];
  
  if (condition.comparison === 'between' || condition.comparison === 'notBetween') {
    return `${condition.counterName} が ${condition.value}-${condition.rangeMax} ${comparisonText}`;
  }
  
  return `${condition.counterName} が ${condition.value} ${comparisonText}`;
};

// カウンターアクションの表示名取得（型安全版）
export const getCounterActionDisplayName = (action: CounterAction): string => {
  const operations: Record<CounterOperation, string> = {
    increment: '増加',
    decrement: '減少',
    set: '設定',
    reset: 'リセット',
    add: '加算',
    subtract: '減算',
    multiply: '乗算',
    divide: '除算'
  };
  
  const operationText = operations[action.operation];
  
  if (action.value !== undefined) {
    return `${action.counterName} を ${action.value} ${operationText}`;
  }
  
  return `${action.counterName} を ${operationText}`;
};

export default {
  PRESET_COUNTERS,
  clampCounterValue,
  formatCounterValue,
  getPresetCounter,
  createCounter,
  createCounterFromPreset,
  compareCounterValue,
  createCounterCondition,
  createCounterAction,
  getCounterConditionDisplayName,
  getCounterActionDisplayName
};