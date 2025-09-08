/**
 * ゲームスクリプト・ロジック型定義
 * Phase 6: ゲームエディター実装用 + 初期条件システム追加
 */

// TextStyleをインポート
import { TextStyle } from './ProjectAssets';

// 位置座標（0-1の正規化座標）
export interface Position {
  x: number; // 0.0-1.0
  y: number; // 0.0-1.0
}

// スケール設定
export interface Scale {
  x: number; // 0.1-3.0
  y: number; // 0.1-3.0
}

// 🔧 追加: ゲーム初期条件システム
export interface GameInitialState {
  // レイアウト初期状態
  layout: {
    background: {
      visible: boolean;
      frameIndex: number;               // 初期フレーム番号（0-3）
      animationSpeed: number;           // アニメーション速度（fps）
      autoStart: boolean;               // 自動再生開始
    };
    objects: Array<{
      id: string;                       // アセットID（ProjectAssets.objects[].id）
      position: { x: number; y: number }; // 初期配置座標（0-1正規化）
      visible: boolean;                 // 初期表示状態
      scale: { x: number; y: number };  // 初期スケール
      rotation: number;                 // 初期回転角度（degree）
      zIndex: number;                   // 描画順序
      animationIndex: number;           // 初期アニメーション番号
      animationSpeed: number;           // アニメーション速度（fps）
      autoStart: boolean;               // アニメ自動開始
    }>;
    texts: Array<{
      id: string;                       // テキストアセットID
      position: { x: number; y: number }; // 初期配置座標
      visible: boolean;                 // 初期表示状態
      scale: number;                    // 初期スケール倍率
      rotation: number;                 // 初期回転角度
      zIndex: number;                   // 描画順序
    }>;
  };
  
  // 音声初期設定
  audio: {
    bgm: {
      id: string;                       // BGMアセットID
      volume: number;                   // 初期音量（0.0-1.0）
      autoPlay: boolean;                // 自動再生
    } | null;
    masterVolume: number;               // マスター音量（0.0-1.0）
    seVolume: number;                   // SE音量（0.0-1.0）
  };
  
  // ゲーム状態初期値
  gameState: {
    flags: Record<string, boolean>;     // カスタムフラグの初期値
    score: number;                      // 初期スコア
    timeLimit?: number;                 // 制限時間（秒）。undefinedは無制限
    targetScore?: number;               // 目標スコア
    lives?: number;                     // 残機数
    level?: number;                     // レベル・ステージ
  };
  
  // 開始時自動実行ルール
  autoRules: Array<{
    id: string;                         // ルールID（GameRule.idを参照）
    delay: number;                      // 実行遅延（秒）
    priority: number;                   // 実行優先度
  }>;
  
  // 初期条件メタデータ
  metadata: {
    version: string;                    // 初期条件のバージョン
    createdAt: string;                  // 作成日時
    lastModified: string;               // 最終更新日時
  };
}

// ゲームレイアウト設定
export interface GameLayout {
  // 背景設定
  background: {
    visible: boolean;
    initialAnimation: number;   // 開始フレーム（0-3）
    animationSpeed: number;     // fps
    autoStart: boolean;         // 自動再生開始
  };
  
  // オブジェクト配置
  objects: Array<{
    objectId: string;           // ProjectAssets.objectsのid
    position: Position;         // ステージ座標（0-1正規化）
    scale: Scale;               // スケール倍率
    rotation: number;           // 角度（degree、0-360）
    zIndex: number;             // 描画順序（0-100）
    
    initialState: {
      visible: boolean;
      animation: number;        // 初期アニメーション（0-7）
      animationSpeed: number;   // fps
      autoStart: boolean;       // 自動再生開始
    };
  }>;
  
  // テキスト配置
  texts: Array<{
    textId: string;             // ProjectAssets.textsのid
    position: Position;         // ステージ座標
    scale: number;              // スケール倍率（0.5-3.0）
    rotation: number;           // 角度（degree）
    zIndex: number;             // 描画順序
    visible: boolean;           // 表示/非表示
  }>;
  
  // ステージ設定
  stage: {
    backgroundColor: string;    // hex color
    backgroundImage?: string;   // 追加背景画像URL（オプション）
  };
}

// ゲームフラグ（カスタム変数）
export interface GameFlag {
  id: string;
  name: string;               // ユーザー設定名
  initialValue: boolean;      // 初期値
  description?: string;       // 説明文
  createdAt: string;
}

// 発動条件の詳細定義
export type TriggerCondition = 
  // タッチ条件
  | {
      type: 'touch';
      target: 'self' | 'stage' | string; // オブジェクトID
      touchType: 'down' | 'up' | 'hold'; // タッチの種類
      holdDuration?: number;              // ホールド時間（秒）
    }
  
  // 衝突条件
  | {
      type: 'collision';
      target: 'background' | 'stage' | string; // オブジェクトID
      collisionType: 'enter' | 'stay' | 'exit'; // 衝突の種類
      checkMode: 'hitbox' | 'pixel';           // 判定方式
    }
  
  // アニメーション条件
  | {
      type: 'animation';
      target: string;                     // オブジェクトID
      condition: 'frame' | 'end' | 'start' | 'loop';
      frameNumber?: number;               // 特定フレーム番号
      animationIndex?: number;            // 対象アニメーション
    }
  
  // 時間条件
  | {
      type: 'time';
      timeType: 'exact' | 'range' | 'interval';
      seconds?: number;                   // 正確な秒数
      range?: { min: number; max: number }; // 時間範囲
      interval?: number;                  // 間隔（繰り返し）
    }
  
  // フラグ条件
  | {
      type: 'flag';
      flagId: string;
      condition: 'ON' | 'OFF' | 'CHANGED' | 'ON_TO_OFF' | 'OFF_TO_ON';
    }
  
  // ゲーム状態条件
  | {
      type: 'gameState';
      state: 'success' | 'failure' | 'playing' | 'paused';
      checkType: 'is' | 'not' | 'became';    // 状態チェック方式
    }
  
  // 位置条件
  | {
      type: 'position';
      target: string;                     // オブジェクトID
      area: 'inside' | 'outside' | 'crossing';
      region: {
        shape: 'rect' | 'circle';
        x: number;
        y: number;
        width?: number;                   // 矩形の場合
        height?: number;                  // 矩形の場合
        radius?: number;                  // 円の場合
      };
    };

// 移動パターン
export interface MovementPattern {
  type: 'straight' | 'teleport' | 'wander' | 'stop' | 'swap' | 'approach' | 'orbit' | 'bounce';
  
  // 移動パラメータ
  target?: Position | string;             // 座標またはオブジェクトID
  speed?: number;                         // 移動速度（px/sec）
  duration?: number;                      // 移動時間（秒）
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'bounce'; // イージング
  
  // パターン固有設定
  wanderRadius?: number;                  // wander用の半径
  orbitRadius?: number;                   // orbit用の半径
  bounceStrength?: number;                // bounce用の反発力
  
  // リピート設定
  repeat?: {
    count: number | 'infinite';           // 繰り返し回数
    delay: number;                        // 繰り返し間隔（秒）
  };
}

// エフェクトパターン
export interface EffectPattern {
  type: 'flash' | 'shake' | 'scale' | 'rotate' | 'particles';
  duration: number;                       // エフェクト時間（秒）
  intensity: number;                      // 強度（0.0-1.0）
  
  // エフェクト固有設定
  color?: string;                         // flash用（hex color）
  frequency?: number;                     // shake用（Hz）
  scaleAmount?: number;                   // scale用（倍率）
  rotationAmount?: number;                // rotate用（度数）
  particleCount?: number;                 // particles用（個数）
  
  // 同時実行設定
  overlay?: boolean;                      // 他エフェクトと重複実行
}

// アクションの詳細定義
export type GameAction =
  // ゲーム制御
  | { type: 'success'; score?: number; message?: string }
  | { type: 'failure'; message?: string }
  | { type: 'pause'; duration?: number }
  | { type: 'restart' }
  
  // 音響制御
  | { type: 'playSound'; soundId: string; volume?: number }
  | { type: 'stopSound'; soundId: string }
  | { type: 'playBGM'; volume?: number }
  | { type: 'stopBGM' }
  
  // フラグ制御
  | { type: 'setFlag'; flagId: string; value: boolean }
  | { type: 'toggleFlag'; flagId: string }
  
  // オブジェクト制御
  | { type: 'switchAnimation'; targetId: string; animationIndex: number; speed?: number }
  | { type: 'show'; targetId: string; fadeIn?: boolean; duration?: number }
  | { type: 'hide'; targetId: string; fadeOut?: boolean; duration?: number }
  
  // 移動制御
  | { type: 'move'; targetId: string; movement: MovementPattern }
  
  // エフェクト
  | { type: 'effect'; targetId: string; effect: EffectPattern }
  
  // スコア・UI
  | { type: 'addScore'; points: number }
  | { type: 'showMessage'; text: string; duration: number; style?: TextStyle };

// ゲームルール
export interface GameRule {
  id: string;
  name: string;                           // ユーザー設定名
  enabled: boolean;                       // ON/OFF切り替え
  priority: number;                       // 実行優先度（0-100）
  
  // 対象オブジェクト
  targetObjectId: string;                 // 'stage'の場合は全体対象
  
  // 発動条件（AND/OR組み合わせ）
  triggers: {
    operator: 'AND' | 'OR';
    conditions: TriggerCondition[];
  };
  
  // 実行アクション
  actions: GameAction[];
  
  // 実行回数制限
  executionLimit?: {
    maxCount: number;                     // 最大実行回数
    resetOnRestart: boolean;              // ゲーム再開時にリセット
    currentCount: number;                 // 現在の実行回数
  };
  
  // 有効期間
  timeWindow?: {
    start: number;                        // 開始時間（秒）
    end: number;                          // 終了時間（秒）
  };
  
  // 作成・更新情報
  createdAt: string;
  lastModified: string;
}

// 成功条件
export interface SuccessCondition {
  id: string;
  name: string;                           // ユーザー設定名
  operator: 'AND' | 'OR';                // 条件組み合わせ
  
  conditions: Array<{
    type: 'flag' | 'score' | 'time' | 'objectState';
    
    // flag条件用
    flagId?: string;
    flagValue?: boolean;
    
    // score条件用
    scoreValue?: number;
    scoreComparison?: '>=' | '>' | '==' | '<' | '<=';
    
    // time条件用
    timeValue?: number;                   // 秒
    timeComparison?: '>=' | '>' | '==' | '<' | '<=';
    
    // objectState条件用
    objectId?: string;
    objectCondition?: 'visible' | 'hidden' | 'position' | 'animation';
    objectValue?: any;                    // 条件値
  }>;
  
  // 成功時の設定
  successSettings?: {
    autoEnd: boolean;                     // 自動終了
    delay: number;                        // 遅延時間（秒）
    message?: string;                     // 成功メッセージ
    score?: number;                       // 加算スコア
  };
}

// スクリプト統計
export interface ScriptStatistics {
  totalRules: number;                     // ルール総数
  totalConditions: number;                // 条件総数
  totalActions: number;                   // アクション総数
  complexityScore: number;                // 複雑度スコア（0-100）
  
  // 使用状況
  usedTriggerTypes: string[];             // 使用されている条件タイプ
  usedActionTypes: string[];              // 使用されているアクションタイプ
  flagCount: number;                      // フラグ数
  
  // パフォーマンス予測
  estimatedCPUUsage: 'low' | 'medium' | 'high';
  estimatedMemoryUsage: number;           // MB
  maxConcurrentEffects: number;           // 最大同時エフェクト数
}

// 🔧 修正: ゲームスクリプト全体（初期条件追加）
export interface GameScript {
  // 🔧 追加: 初期条件設定
  initialState: GameInitialState;
  
  // 初期レイアウト設定
  layout: GameLayout;
  
  // カスタム変数（フラグ）
  flags: GameFlag[];
  
  // 条件・アクション設定
  rules: GameRule[];
  
  // 成功条件設定
  successConditions: SuccessCondition[];
  
  // スクリプト統計（自動計算）
  statistics: ScriptStatistics;
  
  // バージョン管理
  version: string;                        // スクリプトバージョン
  lastModified: string;                   // 最終更新日時
}

// スクリプト検証結果
export interface ScriptValidationResult {
  isValid: boolean;
  
  errors: Array<{
    type: 'syntax' | 'logic' | 'reference' | 'performance';
    ruleId?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  
  warnings: Array<{
    type: 'optimization' | 'usability' | 'compatibility';
    message: string;
    suggestion?: string;
  }>;
  
  // パフォーマンス分析
  performance: {
    estimatedFPS: number;
    memoryUsage: number;
    cpuIntensity: 'low' | 'medium' | 'high';
    bottlenecks: string[];
  };
}

// 🔧 追加: デフォルト初期条件作成ヘルパー関数
export const createDefaultInitialState = (): GameInitialState => {
  const now = new Date().toISOString();
  
  return {
    layout: {
      background: {
        visible: false,
        frameIndex: 0,
        animationSpeed: 12,
        autoStart: false
      },
      objects: [],
      texts: []
    },
    audio: {
      bgm: null,
      masterVolume: 0.8,
      seVolume: 0.8
    },
    gameState: {
      flags: {},
      score: 0,
      timeLimit: undefined,  // 無制限
      targetScore: undefined,
      lives: undefined,
      level: 1
    },
    autoRules: [],
    metadata: {
      version: '1.0.0',
      createdAt: now,
      lastModified: now
    }
  };
};

// 🔧 追加: 初期条件とレイアウトの同期ヘルパー関数
export const syncInitialStateWithLayout = (
  initialState: GameInitialState,
  layout: GameLayout
): GameInitialState => {
  return {
    ...initialState,
    layout: {
      background: {
        visible: layout.background.visible,
        frameIndex: layout.background.initialAnimation,
        animationSpeed: layout.background.animationSpeed,
        autoStart: layout.background.autoStart
      },
      objects: layout.objects.map(obj => ({
        id: obj.objectId,
        position: obj.position,
        visible: obj.initialState.visible,
        scale: obj.scale,
        rotation: obj.rotation,
        zIndex: obj.zIndex,
        animationIndex: obj.initialState.animation,
        animationSpeed: obj.initialState.animationSpeed,
        autoStart: obj.initialState.autoStart
      })),
      texts: layout.texts.map(text => ({
        id: text.textId,
        position: text.position,
        visible: text.visible,
        scale: text.scale,
        rotation: text.rotation,
        zIndex: text.zIndex
      }))
    },
    metadata: {
      ...initialState.metadata,
      lastModified: new Date().toISOString()
    }
  };
};