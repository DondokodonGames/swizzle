// src/components/editor/script/constants/RuleLibrary.ts
// Phase 1: アクションライブラリ定義（PRIORITY_ACTIONS統合版）

import { ActionType} from '../../../../types/editor/GameScript';

// アクションの詳細情報
export interface ActionInfo {
  type: ActionType;
  label: string;
  icon: string;
  description: string;
  category?: 'game' | 'object' | 'audio' | 'data' | 'physics' | 'random';
}

// 条件の詳細情報
export interface ConditionInfo {
  type: string;  // ConditionType → string
  label: string;
  icon: string;
  description: string;
  category?: string;
}

// ===== アクションライブラリ =====
export const ACTION_LIBRARY: ActionInfo[] = [
  // ゲーム制御アクション
  { 
    type: 'gameState', 
    label: 'ゲーム状態', 
    icon: '🎮', 
    description: 'ゲームの状態を変更（成功/失敗/ポーズ/再開）',
    category: 'game'
  },
  { 
    type: 'success', 
    label: 'ゲーム成功', 
    icon: '🏆', 
    description: 'ゲームクリア（スコア・メッセージ設定可能）',
    category: 'game'
  },
  { 
    type: 'failure', 
    label: 'ゲーム失敗', 
    icon: '💥', 
    description: 'ゲームオーバー（メッセージ設定可能）',
    category: 'game'
  },
  { 
    type: 'pause', 
    label: 'ポーズ', 
    icon: '⏸️', 
    description: 'ゲームを一時停止',
    category: 'game'
  },
  { 
    type: 'restart', 
    label: 'リスタート', 
    icon: '🔄', 
    description: 'ゲームを再開',
    category: 'game'
  },

  // オブジェクト制御アクション
  { 
    type: 'objectState', 
    label: 'オブジェクト状態', 
    icon: '👁️', 
    description: 'オブジェクトの状態を変更（アニメーション/表示/非表示）',
    category: 'object'
  },
  { 
    type: 'show', 
    label: '表示', 
    icon: '👁️', 
    description: 'オブジェクトを表示',
    category: 'object'
  },
  { 
    type: 'hide', 
    label: '非表示', 
    icon: '🙈', 
    description: 'オブジェクトを非表示',
    category: 'object'
  },
  { 
    type: 'switchAnimation', 
    label: 'アニメーション切替', 
    icon: '🎬', 
    description: 'アニメーションフレームを切り替え',
    category: 'object'
  },
  { 
    type: 'playAnimation', 
    label: 'アニメーション再生', 
    icon: '▶️', 
    description: 'アニメーションを再生',
    category: 'object'
  },
  { 
    type: 'setAnimationSpeed', 
    label: 'アニメーション速度', 
    icon: '⚡', 
    description: 'アニメーション再生速度を設定',
    category: 'object'
  },
  { 
    type: 'setAnimationFrame', 
    label: 'フレーム設定', 
    icon: '🎞️', 
    description: '特定のフレームに移動',
    category: 'object'
  },
  { 
    type: 'move', 
    label: '移動', 
    icon: '🏃', 
    description: 'オブジェクトを移動',
    category: 'object'
  },
  { 
    type: 'followDrag', 
    label: 'ドラッグ追従', 
    icon: '👆', 
    description: 'ドラッグ位置に追従',
    category: 'object'
  },
  { 
    type: 'effect', 
    label: 'エフェクト', 
    icon: '✨', 
    description: 'エフェクトを実行',
    category: 'object'
  },

  // 物理制御アクション
  { 
    type: 'applyForce', 
    label: '力を加える', 
    icon: '💨', 
    description: '物理的な力を加える',
    category: 'physics'
  },
  { 
    type: 'applyImpulse', 
    label: '瞬間力', 
    icon: '💥', 
    description: '瞬間的な力を加える',
    category: 'physics'
  },
  { 
    type: 'setGravity', 
    label: '重力設定', 
    icon: '🌍', 
    description: '重力を設定',
    category: 'physics'
  },
  { 
    type: 'setPhysics', 
    label: '物理設定', 
    icon: '⚙️', 
    description: '物理プロパティを設定',
    category: 'physics'
  },

  // 音響制御アクション
  { 
    type: 'playSound', 
    label: '音再生', 
    icon: '🔊', 
    description: '効果音・BGMを再生',
    category: 'audio'
  },
  { 
    type: 'stopSound', 
    label: '音停止', 
    icon: '🔇', 
    description: '効果音を停止',
    category: 'audio'
  },
  { 
    type: 'playBGM', 
    label: 'BGM再生', 
    icon: '🎵', 
    description: 'BGMを再生',
    category: 'audio'
  },
  { 
    type: 'stopBGM', 
    label: 'BGM停止', 
    icon: '🔇', 
    description: 'BGMを停止',
    category: 'audio'
  },

  // データ制御アクション
  { 
    type: 'setFlag', 
    label: 'フラグ操作', 
    icon: '🚩', 
    description: 'フラグをON/OFFに設定または切り替え',
    category: 'data'
  },
  { 
    type: 'toggleFlag', 
    label: 'フラグ切替', 
    icon: '🔄', 
    description: 'フラグのON/OFFを切り替え',
    category: 'data'
  },
  { 
    type: 'counter', 
    label: 'カウンター操作', 
    icon: '🔢', 
    description: 'カウンター値の操作',
    category: 'data'
  },
  { 
    type: 'addScore', 
    label: 'スコア加算', 
    icon: '➕', 
    description: 'スコアを加算',
    category: 'data'
  },
  { 
    type: 'showMessage', 
    label: 'メッセージ表示', 
    icon: '💬', 
    description: 'メッセージを表示',
    category: 'data'
  },

  // ランダムアクション
  { 
    type: 'randomAction', 
    label: 'ランダム実行', 
    icon: '🎲', 
    description: '複数アクションから重み付きランダム選択',
    category: 'random'
  }
];

// ===== 優先表示アクション（8個） =====
// Phase 1: ボタン統合版
export const PRIORITY_ACTIONS: ActionType[] = [
  'gameState',        // 🎮 ゲーム状態（success/failure/pause/restartを統合表示）
  'counter',          // 🔢 カウンター操作
  'randomAction',     // 🎲 ランダム実行
  'playSound',        // 🔊 音再生
  'objectState',      // 👁️ オブジェクト状態（switchAnimation/show/hideを統合表示）
  'move',             // 🏃 移動
  'effect',           // ✨ エフェクト
  'setFlag'           // 🚩 フラグ操作（setFlag/toggleFlagを統合表示）
];

// 優先表示アクションの詳細情報を取得
export const PRIORITY_ACTION_LIBRARY = PRIORITY_ACTIONS.map(type => 
  ACTION_LIBRARY.find(action => action.type === type)
).filter((action): action is ActionInfo => action !== undefined);

// ===== 条件ライブラリ =====
export const CONDITION_LIBRARY: ConditionInfo[] = [
  // 時間条件
  { 
    type: 'time', 
    label: '時間', 
    icon: '⏰', 
    description: '特定の時間や間隔で実行',
    category: 'time'
  },

  // 入力条件
  { 
    type: 'touch', 
    label: 'タッチ', 
    icon: '👆', 
    description: 'タップ・クリックで実行',
    category: 'input'
  },
  { 
    type: 'drag', 
    label: 'ドラッグ', 
    icon: '✋', 
    description: 'ドラッグ操作で実行',
    category: 'input'
  },
  { 
    type: 'key', 
    label: 'キー入力', 
    icon: '⌨️', 
    description: 'キーボード入力で実行',
    category: 'input'
  },

  // 状態条件
  { 
    type: 'objectState', 
    label: 'オブジェクト状態', 
    icon: '📦', 
    description: 'オブジェクトの表示状態・アニメーションで実行',
    category: 'state'
  },
  { 
    type: 'animation', 
    label: 'アニメーション', 
    icon: '🎬', 
    description: 'アニメーション状態で実行',
    category: 'state'
  },
  { 
    type: 'collision', 
    label: '衝突', 
    icon: '💥', 
    description: 'オブジェクト同士の衝突で実行',
    category: 'state'
  },
  { 
    type: 'position', 
    label: '位置', 
    icon: '📍', 
    description: '特定の位置に到達で実行',
    category: 'state'
  },

  // データ条件
  { 
    type: 'counter', 
    label: 'カウンター', 
    icon: '🔢', 
    description: 'カウンター値の条件で実行',
    category: 'data'
  },
  { 
    type: 'flag', 
    label: 'フラグ', 
    icon: '🚩', 
    description: 'フラグの状態で実行',
    category: 'data'
  },
  { 
    type: 'score', 
    label: 'スコア', 
    icon: '🏆', 
    description: 'スコアの条件で実行',
    category: 'data'
  },

  // 物理条件
  { 
    type: 'velocity', 
    label: '速度', 
    icon: '⚡', 
    description: '速度の条件で実行',
    category: 'physics'
  },

  // ランダム条件
  { 
    type: 'random', 
    label: 'ランダム', 
    icon: '🎲', 
    description: '確率で実行',
    category: 'random'
  }
];

// ===== 優先表示条件（9個） =====
export const PRIORITY_CONDITIONS: string[] = [  // ConditionType[] → string[]
  'time',           // ⏰ 時間
  'touch',          // 👆 タッチ
  'collision',      // 💥 衝突
  'counter',        // 🔢 カウンター
  'flag',           // 🚩 フラグ
  'objectState',    // 📦 オブジェクト状態
  'random',         // 🎲 ランダム
];

// 優先表示条件の詳細情報を取得
export const PRIORITY_CONDITION_LIBRARY = PRIORITY_CONDITIONS.map(type => 
  CONDITION_LIBRARY.find(condition => condition.type === type)
).filter((condition): condition is ConditionInfo => condition !== undefined);

// カテゴリ別アクション取得
export const getActionsByCategory = (category: ActionInfo['category']) => {
  return ACTION_LIBRARY.filter(action => action.category === category);
};

// カテゴリ別条件取得
export const getConditionsByCategory = (category: ConditionInfo['category']) => {
  return CONDITION_LIBRARY.filter(condition => condition.category === category);
};

// アクション情報取得
export const getActionInfo = (type: ActionType): ActionInfo | undefined => {
  return ACTION_LIBRARY.find(action => action.type === type);
};

// 条件情報取得
export const getConditionInfo = (type: string): ConditionInfo | undefined => {
  return CONDITION_LIBRARY.find(condition => condition.type === type);
};