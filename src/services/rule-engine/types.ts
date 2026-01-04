// src/services/rule-engine/types.ts
// RuleEngine共通型定義

import { GameRule, TriggerCondition, GameAction, PhysicsProperties } from '../../types/editor/GameScript';
import { GameCounter, CounterChangeEvent } from '../../types/counterTypes';

/**
 * ゲームオブジェクトの型定義
 */
export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  animationIndex: number;
  animationPlaying: boolean;
  scale: number;
  rotation: number;
  vx?: number;
  vy?: number;
  frameCount?: number;
  currentFrame?: number;
  animationSpeed?: number;
  animationLoop?: boolean;
  animationReverse?: boolean;
  
  // 物理プロパティ
  physics?: PhysicsProperties;
  
  // エフェクト管理
  baseScale?: number;
  effectScale?: number;
  effectStartTime?: number;
  effectDuration?: number;
  effectType?: string;
  originalScale?: number;
  originalX?: number;
  originalY?: number;
  
  // Flash エフェクト
  baseOpacity?: number;
  flashColor?: string;
  flashIntensity?: number;
  flashFrequency?: number;
  flashValue?: number;
  
  // Shake エフェクト
  shakeIntensity?: number;
  shakeFrequency?: number;
  shakeDirection?: string;
  
  // Rotate エフェクト
  baseRotation?: number;
  rotationAmount?: number;
  rotationDirection?: string;
}

/**
 * ルール実行コンテキスト
 */
export interface RuleExecutionContext {
  gameState: {
    isPlaying: boolean;
    isPaused: boolean;
    score: number;
    timeElapsed: number;
    flags: Map<string, boolean>;
    counters: Map<string, number>;
    pendingEndTime?: number;  // success/failure後の終了予定時刻
    endReason?: 'success' | 'failure';  // 終了理由
  };
  
  objects: Map<string, GameObject>;
  
  events: Array<{
    type: string;
    timestamp: number;
    data: any;
  }>;
  
  canvas: {
    width: number;
    height: number;
    context?: CanvasRenderingContext2D;
  };
  
  audioSystem?: {
    playSound: (soundId: string, volume?: number) => Promise<void>;
    stopSound: (soundId: string) => void;
    setVolume: (soundId: string, volume: number) => void;
  };
  
  particleSystem?: {
    emit: (config: any) => void;
  };
}

/**
 * エフェクト設定
 */
export interface EffectConfig {
  id: string;
  type: 'particle' | 'flash' | 'shake' | 'zoom' | 'rotation' | 'color';
  targetId?: string;
  duration: number;
  intensity?: number;
  color?: string;
  particleCount?: number;
  pattern?: 'burst' | 'stream' | 'explosion';
}

/**
 * ルール評価結果
 */
export interface RuleEvaluationResult {
  ruleId?: string;
  ruleName?: string;
  shouldExecute: boolean;
  conditionResults: boolean[];
  reason: string;
  matchedConditions?: string[];
  executionPriority?: number;
  debugInfo?: string;
}

/**
 * アクション実行結果
 */
export interface ActionExecutionResult {
  success: boolean;
  effectsApplied: string[];
  newGameState: Partial<RuleExecutionContext['gameState']>;
  errors: string[];
  counterChanges: CounterChangeEvent[];
}

/**
 * フラグ定義
 */
export interface FlagDefinition {
  id: string;
  initialValue: boolean;
}

/**
 * 8方向の型定義
 */
export type DirectionType = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

/**
 * 8方向のベクトルマップ
 */
export const DIRECTION_VECTORS: Record<DirectionType, { vx: number; vy: number }> = {
  'up': { vx: 0, vy: -1 },
  'down': { vx: 0, vy: 1 },
  'left': { vx: -1, vy: 0 },
  'right': { vx: 1, vy: 0 },
  'up-left': { vx: -0.7071, vy: -0.7071 },
  'up-right': { vx: 0.7071, vy: -0.7071 },
  'down-left': { vx: -0.7071, vy: 0.7071 },
  'down-right': { vx: 0.7071, vy: 0.7071 }
};

/**
 * アニメーション状態
 */
export interface AnimationState {
  lastFrame: number;
  frameChangeTime: number;
  loopCount: number;
  wasPlaying: boolean;        // 前フレームで再生中だったか
  justStarted: boolean;       // このフレームで開始したか
  justEnded: boolean;         // このフレームで終了したか
}

/**
 * 位置条件の状態（crossing検出用）
 */
export interface PositionState {
  wasInside: boolean;         // 前フレームで領域内だったか
  justCrossed: boolean;       // このフレームで境界を越えたか
}

/**
 * ランダム条件の状態
 */
export interface RandomState {
  lastCheckTime: number;
  eventCount: number;
  seed?: string;
}

export type { GameRule, TriggerCondition, GameAction, GameCounter, CounterChangeEvent };