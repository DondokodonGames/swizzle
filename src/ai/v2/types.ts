/**
 * AI Game Generation v2 - Type Definitions
 *
 * 設計思想:
 * - ゲームアイデア: 完全自由
 * - エディター仕様: 厳密遵守
 */

import { GameProject } from '../../types/editor/GameProject';

// ==========================================
// Step 1: GameConcept
// ==========================================

/**
 * ゲームコンセプト（Step 1の出力）
 */
export interface GameConcept {
  // 基本情報（自由）
  title: string;
  titleEn: string;
  description: string;
  duration: number;  // 5-15秒
  theme: string;     // 完全自由
  visualStyle: string;  // 完全自由

  // 4つの明確性
  playerGoal: string;       // 何をすべきか
  playerOperation: string;  // どう操作するか
  successCondition: string; // 成功条件（数値必須）
  failureCondition: string; // 失敗条件（数値必須）

  // 自己評価
  selfEvaluation: {
    goalClarity: number;       // 1-10
    operationClarity: number;  // 1-10
    judgmentClarity: number;   // 1-10
    acceptance: number;        // 1-10
    reasoning: string;
  };
}

// ==========================================
// Step 2: ConceptValidation
// ==========================================

export interface ConceptValidationResult {
  passed: boolean;
  issues: string[];
  feedback: string[];
}

// ==========================================
// Step 3: LogicGenerator Output
// ==========================================

/**
 * エディター仕様準拠の条件タイプ（動作確認済みのみ）
 *
 * 注意事項:
 * - position: 'inside'/'outside'/'crossing' 全て対応
 * - animation: 'playing','stopped','frame','frameRange','loop','start','end' 全て対応
 * - random: 完全動作（probability, interval, seed 対応）
 */
export type VerifiedConditionType =
  | 'touch'
  | 'time'
  | 'counter'
  | 'collision'
  | 'flag'
  | 'gameState'
  | 'position'
  | 'animation'
  | 'random';

/**
 * エディター仕様準拠のアクションタイプ（動作確認済みのみ）
 *
 * 注意事項:
 * - playSound: 音声アセットが必要
 * - switchAnimation: 複数フレームアセットが必要
 * - applyForce/applyImpulse: 物理演算設定が必要（physicsプロパティ）
 * - randomAction: アクション配列から確率的に選択実行
 */
export type VerifiedActionType =
  | 'success'
  | 'failure'
  | 'hide'
  | 'show'
  | 'move'
  | 'counter'
  | 'addScore'
  | 'effect'
  | 'setFlag'
  | 'toggleFlag'
  | 'playSound'
  | 'switchAnimation'
  | 'applyForce'
  | 'applyImpulse'
  | 'randomAction';

/**
 * オブジェクト計画
 */
export interface ObjectPlan {
  id: string;
  name: string;
  purpose: string;  // ゲーム内での役割
  visualDescription: string;
  initialPosition: { x: number; y: number };
  size: 'small' | 'medium' | 'large';
}

/**
 * 背景計画
 */
export interface BackgroundPlan {
  description: string;
  mood: string;
}

/**
 * 効果音計画
 */
export interface SoundPlan {
  id: string;
  trigger: string;
  type: 'tap' | 'success' | 'failure' | 'collect' | 'pop' | 'whoosh' | 'bounce' | 'ding' | 'buzz' | 'splash';
}

/**
 * アセット計画
 */
export interface AssetPlan {
  objects: ObjectPlan[];
  background: BackgroundPlan;
  sounds: SoundPlan[];
}

/**
 * レイアウトオブジェクト
 */
export interface LayoutObject {
  objectId: string;
  position: { x: number; y: number };
  scale: { x: number; y: number };
}

/**
 * カウンター定義
 */
export interface CounterDefinition {
  id: string;
  name: string;
  initialValue: number;
}

/**
 * ゲームルール
 */
export interface GameRule {
  id: string;
  name?: string;
  targetObjectId?: string;
  triggers?: {
    operator: 'AND' | 'OR';
    conditions: TriggerCondition[];
  };
  actions?: GameAction[];
}

/**
 * トリガー条件
 */
export interface TriggerCondition {
  type: VerifiedConditionType;
  // touch
  target?: 'self' | 'stage' | string;
  touchType?: 'down' | 'up' | 'hold' | 'drag' | 'swipe' | 'flick';
  // time
  timeType?: 'exact' | 'range' | 'interval';
  seconds?: number;
  interval?: number;
  // counter
  counterName?: string;
  comparison?: 'equals' | 'greaterOrEqual' | 'greater' | 'less' | 'lessOrEqual';
  value?: number;
  // collision
  collisionType?: 'enter' | 'stay' | 'exit';
  checkMode?: 'hitbox' | 'pixel';
  // flag
  flagId?: string;
  // position
  area?: 'inside' | 'outside' | 'crossing';
  region?: { x: number; y: number; width?: number; height?: number };
  // animation
  condition?: 'playing' | 'stopped' | 'frame' | 'frameRange' | 'loop' | 'start' | 'end';
  frameNumber?: number;
  frameRange?: [number, number];
  loopCount?: number;
  // random
  probability?: number;
  seed?: string;
  conditions?: {
    onSuccess?: TriggerCondition[];
    onFailure?: TriggerCondition[];
  };
}

/**
 * ゲームアクション
 */
export interface GameAction {
  type: VerifiedActionType;
  // success/failure
  score?: number;
  message?: string;
  // hide/show
  targetId?: string;
  fadeOut?: boolean;
  duration?: number;
  // move
  movement?: {
    type: 'straight' | 'teleport' | 'wander' | 'stop';
    target?: { x: number; y: number } | string;
    speed?: number;
    duration?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
  };
  // counter
  counterName?: string;
  operation?: 'increment' | 'decrement' | 'set' | 'add' | 'subtract';
  value?: number;  // counter操作の値
  // addScore
  points?: number;
  // effect
  effect?: {
    type: 'flash' | 'shake' | 'scale' | 'rotate' | 'particles';
    duration: number;
    intensity?: number;
    scaleAmount?: number;
  };
  // flag
  flagId?: string;
  // playSound
  soundId?: string;
  volume?: number;
  // switchAnimation
  animationIndex?: number;
  startFrame?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  reverse?: boolean;
  // applyForce
  force?: { x: number; y: number };
  // applyImpulse
  impulse?: { x: number; y: number };
  // randomAction
  actions?: Array<{
    action: GameAction;
    weight?: number;
    probability?: number;
  }>;
  selectionMode?: 'uniform' | 'probability' | 'weighted';
  weights?: number[];
}

/**
 * ゲームスクリプト
 */
export interface GameScript {
  layout: {
    objects: LayoutObject[];
  };
  counters: CounterDefinition[];
  rules: GameRule[];
}

/**
 * LogicGenerator出力
 */
export interface LogicGeneratorOutput {
  script: GameScript;
  assetPlan: AssetPlan;
  selfCheck: {
    hasPlayerActionOnSuccessPath: boolean;
    counterInitialValuesSafe: boolean;
    allObjectIdsValid: boolean;
    allCounterNamesValid: boolean;
    coordinatesInRange: boolean;
    onlyVerifiedFeaturesUsed: boolean;
  };
}

// ==========================================
// Step 4: LogicValidation
// ==========================================

export interface LogicValidationError {
  type: 'critical' | 'warning';
  code: string;
  message: string;
  fix?: string;
}

export interface LogicValidationResult {
  valid: boolean;
  errors: LogicValidationError[];
}

// ==========================================
// Step 5: Generated Assets
// ==========================================

export interface GeneratedObject {
  id: string;
  name: string;
  imageUrl: string;
  frames: Array<{ dataUrl: string }>;
}

export interface GeneratedSound {
  id: string;
  name: string;
  trigger: string;
  data: string;  // base64 WAV
}

export interface GeneratedAssets {
  background: {
    id: string;
    name: string;
    frames: Array<{ dataUrl: string }>;
  } | null;
  objects: GeneratedObject[];
  sounds: GeneratedSound[];
  bgm?: {
    id: string;
    name: string;
    data: string;
  };
}

// ==========================================
// Step 6: Final Assembly
// ==========================================

export interface AssemblyResult {
  project: GameProject;
  valid: boolean;
  issues: string[];
}

// ==========================================
// Step 7: Quality Score
// ==========================================

export interface QualityScore {
  goalClarity: number;
  operationClarity: number;
  judgmentClarity: number;
  acceptance: number;
  ruleCount: number;
  objectCount: number;
  validationPassedFirstTry: boolean;
  generatedAt: string;
}

// ==========================================
// Orchestrator
// ==========================================

export interface GenerationResult {
  id: string;
  concept: GameConcept;
  project: GameProject;
  qualityScore: QualityScore;
  passed: boolean;
  generationTime: number;
  estimatedCost: number;
}

export interface BatchResult {
  totalGenerated: number;
  passed: number;
  failed: number;
  passRate: number;
  totalTime: number;
  totalCost: number;
  games: GenerationResult[];
}

export interface OrchestratorConfig {
  targetGamesPerRun: number;
  maxRetries: number;
  dryRun: boolean;
  imageGeneration: {
    provider: 'openai' | 'mock';
    apiKey?: string;
  };
}
