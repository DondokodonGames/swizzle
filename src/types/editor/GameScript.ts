/**
 * ゲームスクリプト・ロジック型定義
 * Phase 6: ゲームエディター実装用 + 初期条件システム追加 + カウンターシステム追加 + ランダムシステム追加
 * 🔧 修正（2025-12-02）: MovementPatternに8方向移動用directionプロパティ追加
 * 🆕 拡張（2025-12-03）: タッチ拡張、物理演算、エフェクト拡張、アニメーション強化
 * 🆕 拡張（2025-12-04）: objectState条件型追加（Phase H統合）
 * 🔧 修正（2025-12-04）: collision型にtargetObjectId追加（Phase 3-1項目6&7）
 */

// TextStyleをインポート
import { TextStyle } from './ProjectAssets';

// 🔢 新規追加: カウンター型インポート
import { 
  GameCounter, 
  CounterOperation, 
  CounterComparison,
  CounterChangeEvent
} from '../counterTypes';

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

// 🆕 物理演算プロパティ
export interface PhysicsProperties {
  enabled: boolean;                       // 物理演算ON/OFF
  type: 'dynamic' | 'static' | 'kinematic';
  
  // 物理パラメータ
  gravity: number;                        // 重力加速度（px/sec²）デフォルト: 980
  mass: number;                           // 質量（kg）デフォルト: 1.0
  friction: number;                       // 摩擦係数（0.0～1.0）デフォルト: 0.3
  restitution: number;                    // 反発係数（0.0～1.0）デフォルト: 0.5
  
  // オプション
  airResistance?: number;                 // 空気抵抗（0.0～1.0）デフォルト: 0.01
  angularVelocity?: number;               // 角速度（rad/sec）
  maxVelocity?: number;                   // 最大速度制限（px/sec）
}

// 🎲 新規追加: ランダムアクション選択肢
export interface RandomActionOption {
  action: GameAction;                     // 実行するアクション
  weight?: number;                        // 重み（デフォルト: 1）
  condition?: TriggerCondition;           // このアクション実行の追加条件
  probability?: number;                   // このアクションの個別確率（0.0-1.0）
}

// 🎲 新規追加: ランダム実行制限
export interface RandomExecutionLimit {
  maxExecutions?: number;                 // 最大実行回数
  cooldown?: number;                      // クールダウン時間（ミリ秒）
  resetOnGameRestart?: boolean;           // ゲーム再開時にリセット
  currentExecutions?: number;             // 現在の実行回数（内部管理用）
  lastExecutionTime?: number;             // 最後の実行時間（内部管理用）
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
    
    // 🔢 新規追加: カウンター初期値
    counters: Record<string, number>;   // カスタムカウンターの初期値
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
    
    // 🆕 物理プロパティ追加
    physics?: PhysicsProperties;
    
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

// 発動条件の詳細定義（カウンター条件 + ランダム条件 + タッチ拡張 + アニメーション拡張 + objectState統合）
export type TriggerCondition = 
  // タッチ条件（🆕 拡張版）
  | {
      type: 'touch';
      target: 'self' | 'stage' | string; // オブジェクトID
      touchType: 'down' | 'up' | 'hold' | 'drag' | 'swipe' | 'flick'; // 🆕 drag/swipe/flick追加
      holdDuration?: number;              // ホールド時間（秒）
      
      // 🆕 drag専用パラメータ
      dragType?: 'start' | 'dragging' | 'end';
      constraint?: 'horizontal' | 'vertical' | 'none';
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      
      // 🆕 swipe専用パラメータ
      direction?: 'up' | 'down' | 'left' | 'right' | 'any';
      minDistance?: number;             // 最小移動距離（px）
      maxDuration?: number;             // 最大所要時間（ms）
      minVelocity?: number;             // 最小速度（px/sec）
      
      // 🆕 flick専用パラメータ
      maxDistance?: number;             // 最大距離（px）
      
      // 🆕 hold専用パラメータ
      tolerance?: number;               // 許容移動距離（px）
      checkProgress?: boolean;          // 進捗チェック
      progressThreshold?: number;       // 進捗閾値（0.0～1.0）
      
      region?: {                        // ステージ範囲指定（targetが'stage'の場合）
        shape: 'rect' | 'circle';
        x: number;
        y: number;
        width?: number;                 // 矩形の場合
        height?: number;                // 矩形の場合
        radius?: number;                // 円の場合
      };
    }
  
  // 衝突条件（🔧 修正: targetObjectId追加）
  | {
      type: 'collision';
      target: 'stageArea' | 'other' | string; // 'stageArea'=画面端、'other'=他オブジェクト、またはオブジェクトID（後方互換）
      targetObjectId?: string;                // target='other'の場合に使用
      collisionType: 'enter' | 'stay' | 'exit'; // 衝突の種類
      checkMode: 'hitbox' | 'pixel';           // 判定方式
      region?: {                                // ステージ範囲指定（target='stageArea'の場合）
        shape: 'rect' | 'circle';
        x: number;
        y: number;
        width?: number;                         // 矩形の場合
        height?: number;                        // 矩形の場合
        radius?: number;                        // 円の場合
      };
    }
  
  // アニメーション条件（🆕 拡張版）
  | {
      type: 'animation';
      target: string;                     // オブジェクトID
      condition: 'frame' | 'end' | 'start' | 'loop' | 'playing' | 'stopped' | 'frameRange'; // 🆕 追加
      frameNumber?: number;               // 特定フレーム番号
      animationIndex?: number;            // 対象アニメーション
      
      // 🆕 フレーム範囲パラメータ
      frameRange?: [number, number];      // フレーム範囲
      loopCount?: number;                 // ループ回数
    }
  
  // 🆕 オブジェクト状態条件（Phase H統合）
  | {
      type: 'objectState';
      target: string;                           // オブジェクトID
      stateType: 'visible' | 'hidden' | 'animation';
      
      // animation用パラメータ
      animationIndex?: number;
      condition?: 'playing' | 'stopped' | 'frame' | 'frameRange' | 'loop';
      frameNumber?: number;
      frameRange?: [number, number];
      loopCount?: number;
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
    }
  
  // 🔢 カウンター条件（Phase G）
  | {
      type: 'counter';
      counterName: string;                // カウンター名
      comparison: CounterComparison;      // 比較演算子
      value: number;                      // 比較値
      rangeMax?: number;                  // between/notBetween用の最大値
      tolerance?: number;                 // 浮動小数点比較用許容範囲
    }
  
  // 🎲 新規追加: ランダム条件（Phase G-3）
  | {
      type: 'random';
      probability: number;                // 0.0-1.0の確率
      interval?: number;                  // 判定間隔（ミリ秒、デフォルト: 1000）
      seed?: string;                      // シード値（デバッグ・リプレイ用）
      maxEventsPerSecond?: number;        // 秒間最大イベント数（パフォーマンス制御）
      conditions?: {
        onSuccess?: TriggerCondition[];   // 確率成立時の追加条件
        onFailure?: TriggerCondition[];   // 確率不成立時の追加条件
      };
    };

// 🔧 追加: 8方向の型定義
export type MovementDirection = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

// 移動パターン
export interface MovementPattern {
  type: 'straight' | 'teleport' | 'wander' | 'stop' | 'swap' | 'approach' | 'orbit' | 'bounce' | 'arc';

  // 移動パラメータ
  target?: Position | string;             // 座標またはオブジェクトID
  speed?: number;                         // 移動速度（px/sec）
  duration?: number;                      // 移動時間（秒）
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'bounce'; // イージング

  // 🔧 追加: 8方向移動用（type='straight'で使用、targetの代わりに指定可能）
  direction?: MovementDirection;

  // パターン固有設定
  wanderRadius?: number;                  // wander用の半径
  orbitRadius?: number;                   // orbit用の半径
  bounceStrength?: number;                // bounce用の反発力
  arcHeight?: number;                     // arc用：山の高さ（px、正=上方向）デフォルト100
  
  // リピート設定
  repeat?: {
    count: number | 'infinite';           // 繰り返し回数
    delay: number;                        // 繰り返し間隔（秒）
  };
}

// エフェクトパターン（🆕 拡張版）
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
  
  // 🆕 flash用パラメータ拡張
  flashColor?: string;                    // 点滅色
  flashIntensity?: number;                // 点滅強度（0.0～1.0）
  flashFrequency?: number;                // 点滅周波数（Hz）
  
  // 🆕 shake用パラメータ拡張
  shakeIntensity?: number;                // 震え強度（px）
  shakeFrequency?: number;                // 震え周波数（Hz）
  shakeDirection?: 'horizontal' | 'vertical' | 'both';
  
  // 🆕 rotate用パラメータ拡張
  rotationSpeed?: number;                 // 回転速度（度/秒）
  rotationDirection?: 'clockwise' | 'counterclockwise';
  
  // 🆕 particles用パラメータ拡張
  particleType?: 'star' | 'confetti' | 'explosion' | 'splash' | 'hearts' | 'sparkle';
  particleSize?: number;                  // サイズ（px）
  particleColor?: string | string[];      // 色（hex）
  particleSpread?: number;                // 拡散範囲（px）
  particleSpeed?: number;                 // 速度（px/sec）
  particleGravity?: boolean;              // 重力適用
  
  // 同時実行設定
  overlay?: boolean;                      // 他エフェクトと重複実行
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// アクションの詳細定義（カウンターアクション + ランダムアクション + 新規アクション追加）
export type GameAction =
  // ゲーム制御
  | { type: 'success'; score?: number; message?: string }
  | { type: 'failure'; message?: string }
  | { type: 'pause'; duration?: number }
  | { type: 'restart' }
  
  // 音響制御
  | { type: 'playSound'; soundId: string; volume?: number }
  | { type: 'stopSound'; soundId: string }
  | { type: 'playBGM'; soundId?: string; volume?: number }
  | { type: 'stopBGM' }
  
  // フラグ制御
  | { type: 'setFlag'; flagId: string; value: boolean }
  | { type: 'toggleFlag'; flagId: string }
  
  // オブジェクト制御（🆕 拡張版）
  | { type: 'switchAnimation'; targetId: string; animationIndex: number; speed?: number; autoPlay?: boolean; loop?: boolean; startFrame?: number; reverse?: boolean }
  | { type: 'show'; targetId: string; fadeIn?: boolean; duration?: number }
  | { type: 'hide'; targetId: string; fadeOut?: boolean; duration?: number }
  
  // 🆕 アニメーション制御アクション
  | { type: 'playAnimation'; targetId: string; play: boolean }
  | { type: 'setAnimationSpeed'; targetId: string; speed: number }
  | { type: 'setAnimationFrame'; targetId: string; frame: number }
  
  // 移動制御
  | { type: 'move'; targetId: string; movement: MovementPattern }
  
  // 🆕 ドラッグ追従アクション
  | { type: 'followDrag'; targetId: string; offset?: { x: number; y: number }; constraint?: 'horizontal' | 'vertical' | 'none'; smooth?: boolean; smoothFactor?: number }
  
  // エフェクト
  | { type: 'effect'; targetId: string; effect: EffectPattern }
  
  // 🆕 物理演算アクション
  | { type: 'applyForce'; targetId: string; force: { x: number; y: number }; point?: { x: number; y: number }; duration?: number }
  | { type: 'applyImpulse'; targetId: string; impulse: { x: number; y: number } }
  | { type: 'setGravity'; targetId: string; gravity: number }
  | { type: 'setPhysics'; targetId: string; physics: Partial<PhysicsProperties> }
  
  // スコア・UI
  | { type: 'addScore'; points: number }
  | { type: 'showMessage'; text: string; duration: number; style?: TextStyle }
  
  // 🔢 カウンターアクション（Phase G）
  | { type: 'counter'; operation: CounterOperation; counterName: string; value?: number; notification?: CounterNotification }
  
  // 🎲 新規追加: ランダムアクション（Phase G-3）
  | { 
      type: 'randomAction';
      actions: RandomActionOption[];       // 選択肢アクション配列
      weights?: number[];                  // 重み配列（省略時は均等）
      selectionMode?: 'weighted' | 'probability' | 'uniform'; // 選択方式
      executionLimit?: RandomExecutionLimit; // 実行制限
      debugMode?: boolean;                 // デバッグモード（選択結果をログ出力）
    };

// 🔢 カウンター通知設定（Phase G）
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

// ゲームルール（カウンター + ランダム対応）
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

// 成功条件（カウンター対応）
export interface SuccessCondition {
  id: string;
  name: string;                           // ユーザー設定名
  operator: 'AND' | 'OR';                // 条件組み合わせ
  
  conditions: Array<{
    type: 'flag' | 'score' | 'time' | 'objectState' | 'counter'; // 🔢 counter追加
    
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
    
    // 🔢 counter条件用（Phase G）
    counterName?: string;                 // カウンター名
    counterComparison?: CounterComparison; // 比較演算子
    counterValue?: number;                // 比較値
    counterRangeMax?: number;             // 範囲比較用最大値
  }>;
  
  // 成功時の設定
  successSettings?: {
    autoEnd: boolean;                     // 自動終了
    delay: number;                        // 遅延時間（秒）
    message?: string;                     // 成功メッセージ
    score?: number;                       // 加算スコア
  };
}

// スクリプト統計（カウンター + ランダム統計追加）
export interface ScriptStatistics {
  totalRules: number;                     // ルール総数
  totalConditions: number;                // 条件総数
  totalActions: number;                   // アクション総数
  complexityScore: number;                // 複雑度スコア（0-100）
  
  // 使用状況
  usedTriggerTypes: string[];             // 使用されている条件タイプ
  usedActionTypes: string[];              // 使用されているアクションタイプ
  flagCount: number;                      // フラグ数
  
  // 🔢 カウンター統計（Phase G）
  counterCount: number;                   // カウンター数
  usedCounterOperations: CounterOperation[]; // 使用されているカウンター操作
  usedCounterComparisons: CounterComparison[]; // 使用されているカウンター比較
  
  // 🎲 新規追加: ランダム統計（Phase G-3）
  randomConditionCount: number;           // ランダム条件数
  randomActionCount: number;              // ランダムアクション数
  totalRandomChoices: number;             // ランダム選択肢総数
  averageRandomProbability: number;       // 平均確率（0.0-1.0）
  
  // パフォーマンス予測
  estimatedCPUUsage: 'low' | 'medium' | 'high';
  estimatedMemoryUsage: number;           // MB
  maxConcurrentEffects: number;           // 最大同時エフェクト数
  
  // 🎲 ランダム系パフォーマンス予測
  randomEventsPerSecond: number;          // 秒間ランダムイベント数
  randomMemoryUsage: number;              // ランダム系メモリ使用量（KB）
}

// 🔧 修正: ゲームスクリプト全体（カウンター + ランダム対応）
export interface GameScript {
  // 🔧 追加: 初期条件設定
  initialState: GameInitialState;
  
  // 初期レイアウト設定
  layout: GameLayout;
  
  // カスタム変数（フラグ）
  flags: GameFlag[];
  
  // 🔢 カウンター定義（Phase G）
  counters: GameCounter[];
  
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

// スクリプト検証結果（カウンター + ランダム検証追加）
export interface ScriptValidationResult {
  isValid: boolean;
  
  errors: Array<{
    type: 'syntax' | 'logic' | 'reference' | 'performance' | 'counter' | 'random'; // 🎲 random追加
    ruleId?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  
  warnings: Array<{
    type: 'optimization' | 'usability' | 'compatibility' | 'counter' | 'random'; // 🎲 random追加
    message: string;
    suggestion?: string;
  }>;
  
  // パフォーマンス分析
  performance: {
    estimatedFPS: number;
    memoryUsage: number;
    cpuIntensity: 'low' | 'medium' | 'high';
    bottlenecks: string[];
    
    // 🔢 カウンター関連パフォーマンス（Phase G）
    counterOperationsPerSecond: number;   // 秒間カウンター操作数
    counterMemoryUsage: number;           // カウンター用メモリ使用量（KB）
    
    // 🎲 新規追加: ランダム関連パフォーマンス（Phase G-3）
    randomOperationsPerSecond: number;    // 秒間ランダム操作数
    randomMemoryUsage: number;            // ランダム系メモリ使用量（KB）
    randomSeedCount: number;              // 使用中のランダムシード数
  };
}

// 🔧 デフォルト初期条件作成ヘルパー関数（カウンター対応）
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
      level: 1,
      
      // 🔢 カウンター初期値（Phase G）
      counters: {}
    },
    autoRules: [],
    metadata: {
      version: '1.0.0',
      createdAt: now,
      lastModified: now
    }
  };
};

// 🔧 初期条件とレイアウトの同期ヘルパー関数（カウンター対応）
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

// 🆕 デフォルト物理プロパティ作成ヘルパー
export const createDefaultPhysics = (): PhysicsProperties => ({
  enabled: false,
  type: 'dynamic',
  gravity: 980,
  mass: 1.0,
  friction: 0.3,
  restitution: 0.5,
  airResistance: 0.01
});

// 🔢 カウンター関連ヘルパー関数（Phase G）

// カウンター条件作成ヘルパー
export const createCounterCondition = (
  counterName: string,
  comparison: CounterComparison,
  value: number,
  rangeMax?: number
): Extract<TriggerCondition, { type: 'counter' }> => {
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
): Extract<GameAction, { type: 'counter' }> => {
  return {
    type: 'counter',
    operation,
    counterName,
    value,
    notification
  };
};

// カウンター条件の表示名取得
export const getCounterConditionDisplayName = (condition: Extract<TriggerCondition, { type: 'counter' }>): string => {
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
  
  const comparisonText = comparisons[condition.comparison] || condition.comparison;
  
  if (condition.comparison === 'between' || condition.comparison === 'notBetween') {
    return `${condition.counterName} が ${condition.value}-${condition.rangeMax} ${comparisonText}`;
  }
  
  return `${condition.counterName} が ${condition.value} ${comparisonText}`;
};

// カウンターアクションの表示名取得
export const getCounterActionDisplayName = (action: Extract<GameAction, { type: 'counter' }>): string => {
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
  
  const operationText = operations[action.operation] || action.operation;
  
  if (action.value !== undefined) {
    return `${action.counterName} を ${action.value} ${operationText}`;
  }
  
  return `${action.counterName} を ${operationText}`;
};

// 🎲 新規追加: ランダム関連ヘルパー関数（Phase G-3）

// ランダム条件作成ヘルパー
export const createRandomCondition = (
  probability: number,
  interval?: number,
  seed?: string
): Extract<TriggerCondition, { type: 'random' }> => {
  return {
    type: 'random',
    probability: Math.max(0.0, Math.min(1.0, probability)), // 0.0-1.0に制限
    interval: interval || 1000, // デフォルト1秒
    seed,
    maxEventsPerSecond: Math.floor(1000 / (interval || 1000)) // パフォーマンス制御
  };
};

// ランダムアクション作成ヘルパー
export const createRandomAction = (
  actions: RandomActionOption[],
  selectionMode: 'weighted' | 'probability' | 'uniform' = 'weighted'
): Extract<GameAction, { type: 'randomAction' }> => {
  // 重み配列を自動生成
  const weights = actions.map(option => option.weight || 1);
  
  return {
    type: 'randomAction',
    actions,
    weights,
    selectionMode,
    executionLimit: {
      maxExecutions: undefined, // 無制限
      cooldown: 0,
      resetOnGameRestart: true
    }
  };
};

// ランダム条件の表示名取得
export const getRandomConditionDisplayName = (condition: Extract<TriggerCondition, { type: 'random' }>): string => {
  const percentage = Math.round(condition.probability * 100);
  const intervalText = condition.interval ? `${condition.interval}ms間隔で` : '';
  
  return `${intervalText}${percentage}%の確率で条件成立`;
};

// ランダムアクションの表示名取得
export const getRandomActionDisplayName = (action: Extract<GameAction, { type: 'randomAction' }>): string => {
  const choiceCount = action.actions.length;
  const totalWeight = action.weights?.reduce((sum, weight) => sum + weight, 0) || choiceCount;
  
  const probabilities = action.weights?.map(weight => 
    Math.round((weight / totalWeight) * 100)
  ) || Array(choiceCount).fill(Math.round(100 / choiceCount));
  
  return `${choiceCount}択からランダム選択 (${probabilities.join('%, ')}%)`;
};

// ランダムアクション選択肢の確率計算
export const calculateRandomActionProbabilities = (action: Extract<GameAction, { type: 'randomAction' }>): number[] => {
  if (action.selectionMode === 'uniform') {
    // 均等選択
    const probability = 1.0 / action.actions.length;
    return Array(action.actions.length).fill(probability);
  }
  
  if (action.selectionMode === 'probability') {
    // 個別確率指定
    return action.actions.map(option => option.probability || (1.0 / action.actions.length));
  }
  
  // 重み付き選択（デフォルト）
  const weights = action.weights || action.actions.map(option => option.weight || 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  return weights.map(weight => weight / totalWeight);
};

// ランダムシード生成
export const generateRandomSeed = (prefix: string = 'seed'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
};

// ランダム条件のパフォーマンス予測
export const estimateRandomConditionPerformance = (condition: Extract<TriggerCondition, { type: 'random' }>): {
  eventsPerSecond: number;
  memoryUsage: number; // KB
  cpuLoad: 'low' | 'medium' | 'high';
} => {
  const interval = condition.interval || 1000;
  const eventsPerSecond = (1000 / interval) * condition.probability;
  
  // メモリ使用量の概算（シード、履歴など）
  const memoryUsage = 0.1 + (condition.seed ? 0.05 : 0);
  
  // CPU負荷の判定
  let cpuLoad: 'low' | 'medium' | 'high' = 'low';
  if (eventsPerSecond > 10) cpuLoad = 'high';
  else if (eventsPerSecond > 2) cpuLoad = 'medium';
  
  return {
    eventsPerSecond,
    memoryUsage,
    cpuLoad
  };
};

// 🔧 追加: 8方向移動ヘルパー関数
export const MOVEMENT_DIRECTIONS: { value: MovementDirection; label: string }[] = [
  { value: 'up', label: '↑ 上' },
  { value: 'down', label: '↓ 下' },
  { value: 'left', label: '← 左' },
  { value: 'right', label: '→ 右' },
  { value: 'up-left', label: '↖ 左上' },
  { value: 'up-right', label: '↗ 右上' },
  { value: 'down-left', label: '↙ 左下' },
  { value: 'down-right', label: '↘ 右下' },
];

// 方向移動アクション作成ヘルパー
export const createDirectionMoveAction = (
  targetId: string,
  direction: MovementDirection,
  speed: number = 3.0
): Extract<GameAction, { type: 'move' }> => {
  return {
    type: 'move',
    targetId,
    movement: {
      type: 'straight',
      direction,
      speed
    }
  };
};

export type ActionType = 
  // 既存のGameActionタイプ（後方互換性のため全て保持）
  | 'success'
  | 'failure'
  | 'pause'
  | 'restart'
  | 'gameState'      
  | 'objectState'
  | 'playSound'
  | 'stopSound'
  | 'playBGM'
  | 'stopBGM'
  | 'setFlag'
  | 'toggleFlag'
  | 'switchAnimation'
  | 'show'
  | 'hide'
  | 'playAnimation'
  | 'setAnimationSpeed'
  | 'setAnimationFrame'
  | 'move'
  | 'followDrag'
  | 'effect'
  | 'applyForce'
  | 'applyImpulse'
  | 'setGravity'
  | 'setPhysics'
  | 'addScore'
  | 'showMessage'
  | 'counter'
  | 'randomAction';