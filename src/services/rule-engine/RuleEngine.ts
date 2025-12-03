// src/services/rule-engine/RuleEngine.ts
// IF-THENルールエンジン - 全機能拡張版
// 🆕 追加機能:
// - タッチ判定拡張（drag/swipe/flick/hold）
// - 物理演算システム（gravity/friction/restitution）
// - エフェクトシステム（flash/shake/rotate/particles）
// - アニメーション制御強化（フレーム条件/詳細制御）

import { GameRule, TriggerCondition, GameAction, GameFlag, PhysicsProperties } from '../../types/editor/GameScript';
import { 
  GameCounter, 
  CounterOperation, 
  CounterComparison,
  CounterChangeEvent,
  clampCounterValue,
  compareCounterValue
} from '../../types/counterTypes';

// ルール実行コンテキスト
export interface RuleExecutionContext {
  gameState: {
    isPlaying: boolean;
    isPaused: boolean;
    score: number;
    timeElapsed: number;
    flags: Map<string, boolean>;
    counters: Map<string, number>;
  };
  
  objects: Map<string, {
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
    
    // 🆕 物理プロパティ
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
    
    // 🆕 Flash エフェクト
    baseOpacity?: number;
    flashColor?: string;
    flashIntensity?: number;
    flashFrequency?: number;
    flashValue?: number;
    
    // 🆕 Shake エフェクト
    shakeIntensity?: number;
    shakeFrequency?: number;
    shakeDirection?: string;
    
    // 🆕 Rotate エフェクト
    baseRotation?: number;
    rotationAmount?: number;
    rotationDirection?: string;
  }>;
  
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
  
  // 🆕 パーティクルシステム
  particleSystem?: {
    emit: (config: any) => void;
  };
}

// エフェクト設定
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

// ルール評価結果
export interface RuleEvaluationResult {
  shouldExecute: boolean;
  matchedConditions: string[];
  executionPriority: number;
  debugInfo?: string;
}

// ActionExecutionResult
export interface ActionExecutionResult {
  success: boolean;
  effectsApplied: string[];
  newGameState: Partial<RuleExecutionContext['gameState']>;
  errors: string[];
  counterChanges: CounterChangeEvent[];
}

// フラグ定義
export interface FlagDefinition {
  id: string;
  initialValue: boolean;
}

// 8方向の定義
type DirectionType = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

const DIRECTION_VECTORS: Record<DirectionType, { vx: number; vy: number }> = {
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
 * RuleEngine クラス - 全機能拡張版
 */
export class RuleEngine {
  private rules: GameRule[] = [];
  private flags: Map<string, boolean> = new Map();
  private executionCounts: Map<string, number> = new Map();
  
  // カウンター管理
  private counters: Map<string, number> = new Map();
  private counterDefinitions: Map<string, GameCounter> = new Map();
  private counterHistory: CounterChangeEvent[] = [];
  private counterPreviousValues: Map<string, number> = new Map();
  
  // フラグ定義管理
  private flagDefinitions: Map<string, boolean> = new Map();
  
  // 消費済みtouchイベント管理
  private consumedTouchEvents: Set<string> = new Set();
  
  // Random条件用の状態管理
  private randomStates: Map<string, {
    lastCheckTime: number;
    eventCount: number;
    seed?: string;
  }> = new Map();
  
  // 衝突判定用のキャッシュ
  private collisionCache: Map<string, Set<string>> = new Map();
  private lastCollisionCheckTime: number = 0;
  private previousCollisions: Map<string, Set<string>> = new Map();
  
  // アニメーション状態追跡
  private animationStates: Map<string, {
    lastFrame: number;
    frameChangeTime: number;
    loopCount: number;
  }> = new Map();
  
  // GameState条件用の前回状態管理
  private previousGameState?: {
    score: number;
    timeElapsed: number;
  };

  constructor() {
    console.log('🎮 RuleEngine初期化（全機能拡張版）');
  }

  // ルール追加
  addRule(rule: GameRule): void {
    this.rules.push(rule);
    this.executionCounts.set(rule.id, 0);
  }

  // カウンター定義追加
  addCounterDefinition(counter: GameCounter): void {
    this.counterDefinitions.set(counter.name, counter);
    this.counters.set(counter.name, counter.initialValue);
    this.counterPreviousValues.set(counter.name, counter.initialValue);
  }

  // フラグ定義追加
  addFlagDefinition(flagId: string, initialValue: boolean): void {
    this.flagDefinitions.set(flagId, initialValue);
    this.flags.set(flagId, initialValue);
  }

  // フラグ取得/設定
  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) || false;
  }

  setFlag(flagId: string, value: boolean): void {
    this.flags.set(flagId, value);
  }

  // カウンター取得/設定
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  private getCounterPreviousValue(name: string): number {
    return this.counterPreviousValues.get(name) || 0;
  }

  // ルール評価
  evaluateRules(context: RuleExecutionContext): GameRule[] {
    const triggeredRules: GameRule[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) {
        continue;
      }

      if (!this.canExecuteRule(rule)) {
        continue;
      }

      if (!this.isRuleTimeValid(rule, context.gameState.timeElapsed)) {
        continue;
      }

      const evaluation = this.evaluateRule(rule, context);
      
      if (evaluation.shouldExecute) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules.sort((a, b) => b.priority - a.priority);
  }

  // 個別ルール評価
  private evaluateRule(rule: GameRule, context: RuleExecutionContext): RuleEvaluationResult {
    const { triggers } = rule;
    const conditionResults: boolean[] = [];
    const matchedConditions: string[] = [];

    for (const condition of triggers.conditions) {
      const result = this.evaluateCondition(condition, context, rule.targetObjectId);
      conditionResults.push(result);
      
      if (result) {
        matchedConditions.push(condition.type);
      }
    }

    const shouldExecute = triggers.operator === 'AND'
      ? conditionResults.every(result => result)
      : conditionResults.some(result => result);

    return {
      shouldExecute,
      matchedConditions,
      executionPriority: rule.priority,
      debugInfo: `${rule.name}: ${matchedConditions.join(', ')}`
    };
  }

  // 条件評価のディスパッチ
  private evaluateCondition(
    condition: TriggerCondition,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    let result = false;

    switch (condition.type) {
      case 'touch':
        result = this.evaluateTouchCondition(condition, context, targetObjectId);
        break;
      case 'collision':
        result = this.evaluateCollisionCondition(condition, context, targetObjectId);
        break;
      case 'animation':
        result = this.evaluateAnimationCondition(condition, context);
        break;
      case 'time':
        result = this.evaluateTimeCondition(condition, context);
        break;
      case 'flag':
        result = this.evaluateFlagCondition(condition);
        break;
      case 'gameState':
        result = this.evaluateGameStateCondition(condition, context);
        break;
      case 'position':
        result = this.evaluatePositionCondition(condition, context);
        break;
      case 'counter':
        result = this.evaluateCounterCondition(condition, context);
        break;
      case 'random':
        result = this.evaluateRandomCondition(condition, context);
        break;
      default:
        result = false;
    }

    return result;
  }

  // 🆕 タッチ条件評価（拡張版）
  private evaluateTouchCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    const touchEvents = context.events.filter(e => e.type === 'touch');

    if (!touchEvents.length) {
      return false;
    }

    const latestTouch = touchEvents[touchEvents.length - 1];
    const touchTarget = condition.target === 'self' ? targetObjectId : 
                        condition.target === 'stage' ? 'stage' : condition.target;

    // touchTypeによる分岐
    switch (condition.touchType) {
      case 'drag':
        return this.evaluateDragCondition(condition, latestTouch, touchTarget, context);
      case 'swipe':
        return this.evaluateSwipeCondition(condition, latestTouch, context);
      case 'flick':
        return this.evaluateFlickCondition(condition, latestTouch, context);
      case 'hold':
        return this.evaluateHoldCondition(condition, latestTouch, touchTarget, context);
      case 'down':
      case 'up':
        // 既存のdown/up処理
        const touchKey = `${latestTouch.timestamp}-${latestTouch.data.target}`;
        if (this.consumedTouchEvents.has(touchKey)) {
          return false;
        }

        if (touchTarget === 'stage') {
          if (latestTouch.data.target !== 'stage') {
            return false;
          }

          if (condition.region) {
            const { x: touchX, y: touchY } = latestTouch.data;
            const region = condition.region;

            if (region.shape === 'rect') {
              const rectX = region.x * context.canvas.width;
              const rectY = region.y * context.canvas.height;
              const rectWidth = (region.width || 0.4) * context.canvas.width;
              const rectHeight = (region.height || 0.4) * context.canvas.height;

              const result = touchX >= rectX && touchX <= rectX + rectWidth &&
                            touchY >= rectY && touchY <= rectY + rectHeight;

              if (result) {
                this.consumedTouchEvents.add(touchKey);
              }

              return result;
            } else if (region.shape === 'circle') {
              const centerX = region.x * context.canvas.width;
              const centerY = region.y * context.canvas.height;
              const radius = (region.radius || 0.2) * context.canvas.width;

              const distance = Math.sqrt(
                Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2)
              );

              const result = distance <= radius;

              if (result) {
                this.consumedTouchEvents.add(touchKey);
              }

              return result;
            }
          }

          this.consumedTouchEvents.add(touchKey);
          return true;
        }

        const result = latestTouch.data.target === touchTarget;

        if (result) {
          this.consumedTouchEvents.add(touchKey);
        }

        return result;
      default:
        return false;
    }
  }

  // 🆕 Drag条件評価
  private evaluateDragCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    touchEvent: any,
    touchTarget: string,
    context: RuleExecutionContext
  ): boolean {
    if (touchEvent.data.type !== 'drag') {
      return false;
    }

    if (touchEvent.data.target !== touchTarget) {
      return false;
    }

    const dragType = condition.dragType || 'dragging';

    switch (dragType) {
      case 'start':
        return touchEvent.data.dragState === 'start';
      case 'dragging':
        return touchEvent.data.dragState === 'dragging';
      case 'end':
        return touchEvent.data.dragState === 'end';
      default:
        return false;
    }
  }

  // 🆕 Swipe条件評価
  private evaluateSwipeCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    touchEvent: any,
    context: RuleExecutionContext
  ): boolean {
    if (touchEvent.data.type !== 'swipe') {
      return false;
    }

    const swipeData = touchEvent.data;
    const minDistance = condition.minDistance || 100;
    const maxDuration = condition.maxDuration || 500;
    const minVelocity = condition.minVelocity || 500;

    if (swipeData.distance < minDistance) {
      return false;
    }

    if (swipeData.duration > maxDuration) {
      return false;
    }

    if (swipeData.velocity < minVelocity) {
      return false;
    }

    if (condition.direction && condition.direction !== 'any') {
      return swipeData.direction === condition.direction;
    }

    return true;
  }

  // 🆕 Flick条件評価
  private evaluateFlickCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    touchEvent: any,
    context: RuleExecutionContext
  ): boolean {
    if (touchEvent.data.type !== 'flick') {
      return false;
    }

    const flickData = touchEvent.data;
    const minVelocity = condition.minVelocity || 1000;
    const maxDistance = condition.maxDistance || 150;
    const maxDuration = condition.maxDuration || 200;

    if (flickData.velocity < minVelocity) {
      return false;
    }

    if (flickData.distance > maxDistance) {
      return false;
    }

    if (flickData.duration > maxDuration) {
      return false;
    }

    if (condition.direction && condition.direction !== 'any') {
      return flickData.direction === condition.direction;
    }

    return true;
  }

  // 🆕 Hold条件評価
  private evaluateHoldCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    touchEvent: any,
    touchTarget: string,
    context: RuleExecutionContext
  ): boolean {
    if (touchEvent.data.type !== 'hold') {
      return false;
    }

    if (touchEvent.data.target !== touchTarget) {
      return false;
    }

    const holdData = touchEvent.data;
    const requiredDuration = condition.holdDuration || 1000;

    if (condition.checkProgress) {
      const progress = holdData.currentDuration / requiredDuration;
      const threshold = condition.progressThreshold || 1.0;
      return progress >= threshold;
    }

    return holdData.currentDuration >= requiredDuration && holdData.holdState === 'complete';
  }

  // 時間条件評価
  private evaluateTimeCondition(
    condition: Extract<TriggerCondition, { type: 'time' }>,
    context: RuleExecutionContext
  ): boolean {
    const currentTime = context.gameState.timeElapsed;
    
    switch (condition.timeType) {
      case 'exact':
        return condition.seconds !== undefined && 
               Math.abs(currentTime - condition.seconds) < 0.1;
      case 'range':
        return condition.range !== undefined &&
               currentTime >= condition.range.min && 
               currentTime <= condition.range.max;
      case 'interval':
        return condition.interval !== undefined &&
               currentTime > 0 &&
               currentTime % condition.interval < 0.1;
      default:
        return false;
    }
  }

  // フラグ条件評価
  private evaluateFlagCondition(
    condition: Extract<TriggerCondition, { type: 'flag' }>
  ): boolean {
    const currentValue = this.getFlag(condition.flagId);
    
    switch (condition.condition) {
      case 'ON':
        return currentValue === true;
      case 'OFF':
        return currentValue === false;
      case 'CHANGED':
        return false;
      default:
        return false;
    }
  }

  // 位置条件評価
  private evaluatePositionCondition(
    condition: Extract<TriggerCondition, { type: 'position' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const targetObj = context.objects.get(condition.target);
      
      if (!targetObj) {
        return false;
      }
      
      const { region } = condition;
      const objCenterX = targetObj.x + targetObj.width / 2;
      const objCenterY = targetObj.y + targetObj.height / 2;
      
      const regionX = region.x * context.canvas.width;
      const regionY = region.y * context.canvas.height;
      const regionWidth = region.width * context.canvas.width;
      const regionHeight = region.height * context.canvas.height;
      
      const inside = objCenterX >= regionX && 
                     objCenterX <= regionX + regionWidth &&
                     objCenterY >= regionY && 
                     objCenterY <= regionY + regionHeight;
      
      return condition.area === 'inside' ? inside : !inside;
    } catch (error) {
      return false;
    }
  }

  // カウンター条件評価
  private evaluateCounterCondition(
    condition: Extract<TriggerCondition, { type: 'counter' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const currentValue = this.getCounter(condition.counterName);
      const previousValue = this.getCounterPreviousValue(condition.counterName);
      
      if (condition.comparison === 'changed') {
        return currentValue !== previousValue;
      }
      
      const result = compareCounterValue(
        currentValue,
        condition.comparison,
        condition.value,
        condition.rangeMax
      );

      return result;
    } catch (error) {
      return false;
    }
  }

  // ランダム条件評価
  private evaluateRandomCondition(
    condition: Extract<TriggerCondition, { type: 'random' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const conditionKey = `random_${condition.probability}_${condition.interval || 1000}`;
      let state = this.randomStates.get(conditionKey);
      
      if (!state) {
        state = {
          lastCheckTime: 0,
          eventCount: 0,
          seed: condition.seed
        };
        this.randomStates.set(conditionKey, state);
      }
      
      const now = context.gameState.timeElapsed * 1000;
      const interval = condition.interval || 1000;
      
      if (now - state.lastCheckTime < interval) {
        return false;
      }
      
      state.lastCheckTime = now;
      
      const randomValue = condition.seed 
        ? this.seededRandom(condition.seed + state.eventCount) 
        : Math.random();
      
      const success = randomValue < condition.probability;

      if (success) {
        state.eventCount++;
      }

      if (success && condition.conditions?.onSuccess) {
        return condition.conditions.onSuccess.every(cond => 
          this.evaluateCondition(cond, context, '')
        );
      } else if (!success && condition.conditions?.onFailure) {
        return condition.conditions.onFailure.every(cond => 
          this.evaluateCondition(cond, context, '')
        );
      }
      
      return success;
    } catch (error) {
      return false;
    }
  }

  private seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  }

  // ゲーム状態条件評価
  private evaluateGameStateCondition(
    condition: Extract<TriggerCondition, { type: 'gameState' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const currentValue = condition.stateType === 'score' 
        ? context.gameState.score 
        : context.gameState.timeElapsed;

      switch (condition.comparison) {
        case 'greater':
          return currentValue > condition.value;
        case 'less':
          return currentValue < condition.value;
        case 'equal':
          return Math.abs(currentValue - condition.value) < 0.01;
        case 'between':
          return condition.maxValue !== undefined &&
                 currentValue >= condition.value &&
                 currentValue <= condition.maxValue;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  // 衝突条件評価
  private evaluateCollisionCondition(
    condition: Extract<TriggerCondition, { type: 'collision' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    try {
      const sourceId = targetObjectId;
      const targetId = condition.target === 'self' ? targetObjectId : 
                       condition.target === 'background' ? 'background' :
                       condition.target === 'stage' ? 'stage' : condition.target;

      if (sourceId === targetId) {
        return false;
      }

      const sourceObj = context.objects.get(sourceId);
      if (!sourceObj) {
        return false;
      }

      if (targetId === 'background' || targetId === 'stage') {
        return false;
      }

      const targetObj = context.objects.get(targetId);
      if (!targetObj) {
        return false;
      }

      const collisionKey = `${sourceId}-${targetId}`;
      const currentCollisions = this.collisionCache.get(sourceId) || new Set();
      const previousCollisions = this.previousCollisions.get(sourceId) || new Set();

      const isColliding = this.checkCollision(sourceObj, targetObj);

      const collisionType = condition.collisionType || 'enter';

      let result = false;
      if (collisionType === 'enter') {
        result = isColliding && !previousCollisions.has(targetId);
      } else if (collisionType === 'stay') {
        result = isColliding && previousCollisions.has(targetId);
      } else if (collisionType === 'exit') {
        result = !isColliding && previousCollisions.has(targetId);
      }

      if (isColliding) {
        currentCollisions.add(targetId);
      } else {
        currentCollisions.delete(targetId);
      }

      this.collisionCache.set(sourceId, currentCollisions);

      return result;
    } catch (error) {
      return false;
    }
  }

  private checkCollision(obj1: any, obj2: any): boolean {
    if (!obj1.visible || !obj2.visible) {
      return false;
    }

    const scale1 = obj1.scale || 1;
    const scale2 = obj2.scale || 1;

    return obj1.x < obj2.x + obj2.width * scale2 &&
           obj1.x + obj1.width * scale1 > obj2.x &&
           obj1.y < obj2.y + obj2.height * scale2 &&
           obj1.y + obj1.height * scale1 > obj2.y;
  }

  // 🆕 アニメーション条件評価（拡張版）
  private evaluateAnimationCondition(
    condition: Extract<TriggerCondition, { type: 'animation' }>,
    context: RuleExecutionContext
  ): boolean {
    const targetObj = context.objects.get(condition.targetId);
    if (!targetObj) {
      return false;
    }

    switch (condition.condition) {
      case 'playing':
        return targetObj.animationPlaying === true;
      case 'stopped':
        return targetObj.animationPlaying === false;
      case 'frame':
        if (condition.frame === undefined) {
          return false;
        }
        return targetObj.currentFrame === condition.frame;
      case 'frameRange':
        if (!condition.frameRange) {
          return false;
        }
        const [start, end] = condition.frameRange;
        return targetObj.currentFrame! >= start && targetObj.currentFrame! <= end;
      case 'loop':
        const state = this.animationStates.get(condition.targetId);
        if (!state || condition.loopCount === undefined) {
          return false;
        }
        return state.loopCount >= condition.loopCount;
      default:
        return false;
    }
  }

  // アクション実行
  executeActions(
    rule: GameRule,
    context: RuleExecutionContext
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const newGameState: Partial<RuleExecutionContext['gameState']> = {};
    const counterChanges: CounterChangeEvent[] = [];

    const ruleId = rule.id;
    const currentCount = this.executionCounts.get(ruleId) || 0;
    this.executionCounts.set(ruleId, currentCount + 1);

    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'success':
            newGameState.isPlaying = false;
            if (action.score) {
              newGameState.score = (context.gameState.score || 0) + action.score;
            }
            effectsApplied.push(`成功: ${action.message || ''}`);
            break;

          case 'failure':
            newGameState.isPlaying = false;
            effectsApplied.push(`失敗: ${action.message || ''}`);
            break;

          case 'addScore':
            newGameState.score = (context.gameState.score || 0) + action.points;
            effectsApplied.push(`スコア加算: +${action.points}`);
            break;

          case 'setFlag':
            this.setFlag(action.flagId, action.value);
            effectsApplied.push(`フラグ設定: ${action.flagId} = ${action.value}`);
            break;

          case 'toggleFlag':
            this.setFlag(action.flagId, !this.getFlag(action.flagId));
            effectsApplied.push(`フラグ切替: ${action.flagId}`);
            break;

          case 'counter':
            const counterResult = this.executeCounterAction(action, context);
            counterChanges.push(...counterResult);
            effectsApplied.push(`カウンター操作: ${action.counterName}`);
            break;

          case 'show':
            this.executeShowAction(action, context);
            effectsApplied.push(`表示: ${action.targetId}`);
            break;

          case 'hide':
            this.executeHideAction(action, context);
            effectsApplied.push(`非表示: ${action.targetId}`);
            break;

          case 'playSound':
            this.executePlaySoundAction(action, context);
            effectsApplied.push(`音声再生: ${action.soundId}`);
            break;

          case 'move':
            this.executeMoveAction(action, context);
            effectsApplied.push(`移動: ${action.targetId}`);
            break;

          case 'switchAnimation':
            this.executeSwitchAnimationAction(action, context);
            effectsApplied.push(`アニメーション切り替え: ${action.targetId}`);
            break;

          case 'effect':
            this.executeEffectAction(action, context);
            effectsApplied.push(`エフェクト: ${action.effect.type}`);
            break;

          // 🆕 新規アクション
          case 'followDrag':
            this.executeFollowDragAction(action, context);
            effectsApplied.push(`ドラッグ追従: ${action.targetId}`);
            break;

          case 'playAnimation':
            this.executePlayAnimationAction(action, context);
            effectsApplied.push(`アニメーション${action.play ? '再生' : '停止'}: ${action.targetId}`);
            break;

          case 'setAnimationSpeed':
            this.executeSetAnimationSpeedAction(action, context);
            effectsApplied.push(`アニメーション速度変更: ${action.targetId}`);
            break;

          case 'setAnimationFrame':
            this.executeSetAnimationFrameAction(action, context);
            effectsApplied.push(`フレーム設定: ${action.targetId}`);
            break;

          case 'applyForce':
            this.executeApplyForceAction(action, context);
            effectsApplied.push(`力適用: ${action.targetId}`);
            break;

          case 'applyImpulse':
            this.executeApplyImpulseAction(action, context);
            effectsApplied.push(`衝撃適用: ${action.targetId}`);
            break;

          case 'setGravity':
            this.executeSetGravityAction(action, context);
            effectsApplied.push(`重力変更: ${action.targetId}`);
            break;

          case 'setPhysics':
            this.executeSetPhysicsAction(action, context);
            effectsApplied.push(`物理設定変更: ${action.targetId}`);
            break;

          case 'randomAction':
            const randomResult = this.executeRandomAction(action, context, ruleId);
            effectsApplied.push(...randomResult.effectsApplied);
            errors.push(...randomResult.errors);
            counterChanges.push(...randomResult.counterChanges);
            break;

          default:
            break;
        }
      } catch (error) {
        console.error(`❌ アクション実行エラー:`, error);
        errors.push(`アクション実行エラー: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      effectsApplied,
      newGameState,
      errors,
      counterChanges
    };
  }

  // 音声再生
  private executePlaySoundAction(
    action: Extract<GameAction, { type: 'playSound' }>,
    context: RuleExecutionContext
  ): void {
    if (context.audioSystem) {
      const volume = action.volume !== undefined ? action.volume : 1.0;
      context.audioSystem.playSound(action.soundId, volume).catch(() => {});
    }
  }

  // 🆕 SwitchAnimation アクション（拡張版）
  private executeSwitchAnimationAction(
    action: Extract<GameAction, { type: 'switchAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    targetObj.animationIndex = action.animationIndex;
    
    const startFrame = action.startFrame || 0;
    targetObj.currentFrame = startFrame;
    
    if (action.autoPlay !== undefined) {
      targetObj.animationPlaying = action.autoPlay;
    }
    
    if (action.loop !== undefined) {
      targetObj.animationLoop = action.loop;
    }
    
    if (action.speed !== undefined) {
      targetObj.animationSpeed = action.speed;
    }
    
    if (action.reverse !== undefined) {
      targetObj.animationReverse = action.reverse;
    }
    
    const state = this.animationStates.get(action.targetId);
    if (state) {
      state.lastFrame = startFrame;
      state.frameChangeTime = performance.now();
      state.loopCount = 0;
    }
    
    console.log(`🎬 アニメーション切替: ${action.targetId} → index ${action.animationIndex}`);
  }

  // 🆕 新規アクション実装群
  private executeFollowDragAction(
    action: Extract<GameAction, { type: 'followDrag' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    const dragEvents = context.events.filter(e => 
      e.type === 'touch' && e.data.type === 'drag'
    );
    
    if (!dragEvents.length) {
      return;
    }
    
    const latestDrag = dragEvents[dragEvents.length - 1];
    const dragX = latestDrag.data.x;
    const dragY = latestDrag.data.y;
    
    const offset = action.offset || { x: 0, y: 0 };
    let targetX = dragX + offset.x;
    let targetY = dragY + offset.y;
    
    const constraint = action.constraint || 'none';
    if (constraint === 'horizontal') {
      targetY = targetObj.y;
    } else if (constraint === 'vertical') {
      targetX = targetObj.x;
    }
    
    if (action.smooth) {
      const smoothFactor = action.smoothFactor || 0.2;
      targetObj.x += (targetX - targetObj.x) * smoothFactor;
      targetObj.y += (targetY - targetObj.y) * smoothFactor;
    } else {
      targetObj.x = targetX;
      targetObj.y = targetY;
    }
  }

  private executePlayAnimationAction(
    action: Extract<GameAction, { type: 'playAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.animationPlaying = action.play;
  }

  private executeSetAnimationSpeedAction(
    action: Extract<GameAction, { type: 'setAnimationSpeed' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.animationSpeed = action.speed;
  }

  private executeSetAnimationFrameAction(
    action: Extract<GameAction, { type: 'setAnimationFrame' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.currentFrame = action.frame;
  }

  private executeApplyForceAction(
    action: Extract<GameAction, { type: 'applyForce' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj || !targetObj.physics) {
      return;
    }
    
    const mass = targetObj.physics.mass || 1.0;
    const accX = action.force.x / mass;
    const accY = action.force.y / mass;
    
    targetObj.vx = (targetObj.vx || 0) + accX * 0.016;
    targetObj.vy = (targetObj.vy || 0) + accY * 0.016;
    
    console.log(`💪 力適用: ${action.targetId}`);
  }

  private executeApplyImpulseAction(
    action: Extract<GameAction, { type: 'applyImpulse' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj || !targetObj.physics) {
      return;
    }
    
    const mass = targetObj.physics.mass || 1.0;
    const deltaVx = action.impulse.x / mass;
    const deltaVy = action.impulse.y / mass;
    
    targetObj.vx = (targetObj.vx || 0) + deltaVx;
    targetObj.vy = (targetObj.vy || 0) + deltaVy;
    
    console.log(`⚡ 衝撃適用: ${action.targetId}`);
  }

  private executeSetGravityAction(
    action: Extract<GameAction, { type: 'setGravity' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj || !targetObj.physics) {
      return;
    }
    
    targetObj.physics.gravity = action.gravity;
  }

  private executeSetPhysicsAction(
    action: Extract<GameAction, { type: 'setPhysics' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.physics = {
      ...targetObj.physics,
      ...action.physics
    } as any;
  }

  // エフェクト実行（完全実装版）
  private executeEffectAction(
    action: Extract<GameAction, { type: 'effect' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    const effect = action.effect;
    const durationMs = (effect.duration || 0.2) * 1000;

    switch (effect.type) {
      case 'scale':
        this.executeScaleEffect(targetObj, effect, durationMs);
        break;
      case 'flash':
        this.executeFlashEffect(targetObj, effect, durationMs);
        break;
      case 'shake':
        this.executeShakeEffect(targetObj, effect, durationMs);
        break;
      case 'rotate':
        this.executeRotateEffect(targetObj, effect, durationMs);
        break;
      case 'particles':
        this.executeParticlesEffect(targetObj, effect, durationMs, context);
        break;
      default:
        break;
    }
  }

  private executeScaleEffect(targetObj: any, effect: any, durationMs: number): void {
    if (targetObj.baseScale === undefined) {
      targetObj.baseScale = targetObj.scale;
    }

    const scaleAmount = effect.scaleAmount || 0.5;
    targetObj.effectScale = scaleAmount;
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.effectType = 'scale';
  }

  private executeFlashEffect(targetObj: any, effect: any, durationMs: number): void {
    if (targetObj.baseOpacity === undefined) {
      targetObj.baseOpacity = 1.0;
    }
    
    targetObj.effectType = 'flash';
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.flashColor = effect.flashColor || '#FFFFFF';
    targetObj.flashIntensity = effect.flashIntensity || 0.5;
    targetObj.flashFrequency = effect.flashFrequency || 10;
  }

  private executeShakeEffect(targetObj: any, effect: any, durationMs: number): void {
    if (targetObj.originalX === undefined) {
      targetObj.originalX = targetObj.x;
    }
    if (targetObj.originalY === undefined) {
      targetObj.originalY = targetObj.y;
    }
    
    targetObj.effectType = 'shake';
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.shakeIntensity = effect.shakeIntensity || 5;
    targetObj.shakeFrequency = effect.shakeFrequency || 20;
    targetObj.shakeDirection = effect.shakeDirection || 'both';
  }

  private executeRotateEffect(targetObj: any, effect: any, durationMs: number): void {
    if (targetObj.baseRotation === undefined) {
      targetObj.baseRotation = targetObj.rotation || 0;
    }
    
    targetObj.effectType = 'rotate';
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.rotationAmount = effect.rotationAmount || 360;
    targetObj.rotationDirection = effect.rotationDirection || 'clockwise';
  }

  private executeParticlesEffect(targetObj: any, effect: any, durationMs: number, context: RuleExecutionContext): void {
    if (context.particleSystem) {
      const particleType = effect.particleType || 'star';
      const particleCount = effect.particleCount || 20;
      const colors = Array.isArray(effect.particleColor) 
        ? effect.particleColor 
        : effect.particleColor 
          ? [effect.particleColor] 
          : this.getDefaultParticleColors(particleType);
      
      context.particleSystem.emit({
        x: targetObj.x + targetObj.width / 2,
        y: targetObj.y + targetObj.height / 2,
        type: particleType,
        count: particleCount,
        size: effect.particleSize || 10,
        colors: colors,
        spread: effect.particleSpread || 100,
        speed: effect.particleSpeed || 200,
        gravity: effect.particleGravity !== false,
        duration: durationMs / 1000
      });
    }
  }

  private getDefaultParticleColors(type: string): string[] {
    switch (type) {
      case 'star':
        return ['#FFD700', '#FFA500', '#FFFF00'];
      case 'confetti':
        return ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
      case 'explosion':
        return ['#FF4500', '#FF6347', '#FFA500', '#FFD700'];
      case 'splash':
        return ['#1E90FF', '#00BFFF', '#87CEEB'];
      case 'hearts':
        return ['#FF1493', '#FF69B4', '#FFB6C1'];
      case 'sparkle':
        return ['#FFFFFF', '#F0F8FF', '#E6E6FA'];
      default:
        return ['#FFFFFF'];
    }
  }

  // Show/Hide アクション
  private executeShowAction(
    action: Extract<GameAction, { type: 'show' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    if (targetObj.originalScale === undefined) {
      targetObj.originalScale = targetObj.scale;
    }
    if (targetObj.originalX === undefined) {
      targetObj.originalX = targetObj.x;
    }
    if (targetObj.originalY === undefined) {
      targetObj.originalY = targetObj.y;
    }

    targetObj.visible = true;
  }

  private executeHideAction(
    action: Extract<GameAction, { type: 'hide' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    targetObj.visible = false;
  }

  // 移動アクション
  private executeMoveAction(
    action: Extract<GameAction, { type: 'move' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    const { movement } = action;
    const speed = movement.speed || 1.0;

    switch (movement.type) {
      case 'straight':
        if (movement.direction) {
          const direction = movement.direction as DirectionType;
          const dirVector = DIRECTION_VECTORS[direction];
          
          if (dirVector) {
            targetObj.vx = dirVector.vx * speed;
            targetObj.vy = dirVector.vy * speed;
          }
        } else if (movement.target) {
          let targetX: number, targetY: number;
          if (typeof movement.target === 'string') {
            const targetObject = context.objects.get(movement.target);
            if (targetObject) {
              const targetScale = targetObject.scale || 1;
              targetX = targetObject.x + (targetObject.width * targetScale) / 2;
              targetY = targetObject.y + (targetObject.height * targetScale) / 2;
            } else {
              return;
            }
          } else {
            targetX = movement.target.x * context.canvas.width;
            targetY = movement.target.y * context.canvas.height;
          }
          
          const objScale = targetObj.scale || 1;
          const objCenterX = targetObj.x + (targetObj.width * objScale) / 2;
          const objCenterY = targetObj.y + (targetObj.height * objScale) / 2;
          
          const dx = targetX - objCenterX;
          const dy = targetY - objCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            targetObj.vx = (dx / distance) * speed;
            targetObj.vy = (dy / distance) * speed;
          }
        }
        break;

      case 'teleport':
        if (movement.target) {
          if (typeof movement.target === 'string') {
            const targetObject = context.objects.get(movement.target);
            if (targetObject) {
              targetObj.x = targetObject.x;
              targetObj.y = targetObject.y;
            }
          } else {
            targetObj.x = movement.target.x * context.canvas.width;
            targetObj.y = movement.target.y * context.canvas.height;
          }

          targetObj.vx = 0;
          targetObj.vy = 0;
        }
        break;

      case 'wander':
        const randomAngle = Math.random() * Math.PI * 2;
        targetObj.vx = Math.cos(randomAngle) * speed;
        targetObj.vy = Math.sin(randomAngle) * speed;
        break;

      case 'stop':
        targetObj.vx = 0;
        targetObj.vy = 0;
        break;

      case 'swap':
        if (movement.target && typeof movement.target === 'string') {
          const targetObject = context.objects.get(movement.target);
          if (targetObject) {
            const tempX = targetObj.x;
            const tempY = targetObj.y;
            targetObj.x = targetObject.x;
            targetObj.y = targetObject.y;
            targetObject.x = tempX;
            targetObject.y = tempY;
          }
        }
        break;

      case 'approach':
        if (movement.target) {
          let targetX: number, targetY: number;
          
          if (typeof movement.target === 'string') {
            const targetObject = context.objects.get(movement.target);
            if (targetObject) {
              targetX = targetObject.x;
              targetY = targetObject.y;
            } else {
              return;
            }
          } else {
            targetX = movement.target.x;
            targetY = movement.target.y;
          }
          
          const dx = targetX - targetObj.x;
          const dy = targetY - targetObj.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            targetObj.vx = (dx / distance) * speed;
            targetObj.vy = (dy / distance) * speed;
          } else {
            targetObj.vx = 0;
            targetObj.vy = 0;
          }
        }
        break;

      case 'orbit':
        if (movement.target) {
          let centerX: number, centerY: number;
          
          if (typeof movement.target === 'string') {
            const targetObject = context.objects.get(movement.target);
            if (targetObject) {
              centerX = targetObject.x;
              centerY = targetObject.y;
            } else {
              return;
            }
          } else {
            centerX = movement.target.x;
            centerY = movement.target.y;
          }
          
          const dx = targetObj.x - centerX;
          const dy = targetObj.y - centerY;
          const radius = Math.sqrt(dx * dx + dy * dy);
          const currentAngle = Math.atan2(dy, dx);
          
          const angularSpeed = speed * 0.01;
          const newAngle = currentAngle + angularSpeed;
          
          targetObj.x = centerX + Math.cos(newAngle) * radius;
          targetObj.y = centerY + Math.sin(newAngle) * radius;
        }
        break;

      case 'bounce':
        const margin = 10;
        
        if (targetObj.x <= margin || targetObj.x + targetObj.width >= context.canvas.width - margin) {
          targetObj.vx = -(targetObj.vx || 0);
        }
        if (targetObj.y <= margin || targetObj.y + targetObj.height >= context.canvas.height - margin) {
          targetObj.vy = -(targetObj.vy || 0);
        }
        break;

      default:
        break;
    }
  }

  // カウンター操作
  private executeCounterAction(
    action: Extract<GameAction, { type: 'counter' }>,
    context: RuleExecutionContext
  ): CounterChangeEvent[] {
    const counterDef = this.counterDefinitions.get(action.counterName);
    if (!counterDef) {
      return [];
    }

    const oldValue = this.getCounter(action.counterName);
    let newValue = oldValue;

    switch (action.operation) {
      case 'set':
        newValue = action.value;
        break;
      case 'add':
        newValue = oldValue + action.value;
        break;
      case 'subtract':
        newValue = oldValue - action.value;
        break;
      case 'multiply':
        newValue = oldValue * action.value;
        break;
      case 'divide':
        newValue = action.value !== 0 ? oldValue / action.value : oldValue;
        break;
      case 'reset':
        newValue = counterDef.initialValue;
        break;
    }

    const min = action.min !== undefined ? action.min : counterDef.minValue;
    const max = action.max !== undefined ? action.max : counterDef.maxValue;
    newValue = clampCounterValue(newValue, min, max);

    this.counterPreviousValues.set(action.counterName, oldValue);
    this.counters.set(action.counterName, newValue);

    const changeEvent: CounterChangeEvent = {
      counterName: action.counterName,
      oldValue,
      newValue,
      operation: action.operation,
      timestamp: Date.now()
    };

    this.counterHistory.push(changeEvent);

    return [changeEvent];
  }

  // ランダムアクション
  private executeRandomAction(
    action: Extract<GameAction, { type: 'randomAction' }>,
    context: RuleExecutionContext,
    ruleId?: string
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const counterChanges: CounterChangeEvent[] = [];

    try {
      const selectionMode = action.selectionMode || 'weighted';
      let selectedAction: GameAction;

      if (selectionMode === 'uniform') {
        const index = Math.floor(Math.random() * action.actions.length);
        selectedAction = action.actions[index].action;
      } else if (selectionMode === 'probability') {
        const random = Math.random();
        let cumulative = 0;
        selectedAction = action.actions[0].action;
        
        for (const option of action.actions) {
          cumulative += option.probability || (1 / action.actions.length);
          if (random <= cumulative) {
            selectedAction = option.action;
            break;
          }
        }
      } else {
        const weights = action.weights || action.actions.map(opt => opt.weight || 1);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const random = Math.random() * totalWeight;
        let cumulative = 0;
        let selectedIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (random <= cumulative) {
            selectedIndex = i;
            break;
          }
        }
        
        selectedAction = action.actions[selectedIndex].action;
      }

      // 選択されたアクションを実行
      const dummyRule: GameRule = {
        id: ruleId || 'random',
        name: 'Random Action',
        enabled: true,
        priority: 0,
        targetObjectId: '',
        triggers: { operator: 'AND', conditions: [] },
        actions: [selectedAction]
      };

      const result = this.executeActions(dummyRule, context);
      effectsApplied.push(...result.effectsApplied);
      errors.push(...result.errors);
      counterChanges.push(...result.counterChanges);

    } catch (error) {
      errors.push(`ランダムアクション実行エラー: ${error}`);
    }

    return {
      success: errors.length === 0,
      effectsApplied,
      newGameState: {},
      errors,
      counterChanges
    };
  }

  // 🆕 物理演算更新
  updatePhysics(context: RuleExecutionContext, deltaTime: number): void {
    context.objects.forEach((obj, id) => {
      if (!obj.physics || !obj.physics.enabled) {
        return;
      }
      
      if (obj.physics.type === 'static') {
        return;
      }
      
      if (obj.physics.type === 'kinematic') {
        obj.x += (obj.vx || 0) * deltaTime;
        obj.y += (obj.vy || 0) * deltaTime;
        return;
      }
      
      // dynamic
      const gravity = obj.physics.gravity || 980;
      const accY = gravity;
      
      const airResistance = obj.physics.airResistance || 0.01;
      const vx = (obj.vx || 0) * (1 - airResistance);
      const vy = (obj.vy || 0) * (1 - airResistance);
      
      obj.vx = vx;
      obj.vy = vy + accY * deltaTime;
      
      if (obj.physics.maxVelocity) {
        const speed = Math.sqrt(obj.vx ** 2 + obj.vy ** 2);
        if (speed > obj.physics.maxVelocity) {
          const ratio = obj.physics.maxVelocity / speed;
          obj.vx *= ratio;
          obj.vy *= ratio;
        }
      }
      
      obj.x += obj.vx * deltaTime;
      obj.y += obj.vy * deltaTime;
      
      this.checkGroundCollision(obj, context);
      
      if (obj.physics.angularVelocity) {
        obj.rotation = (obj.rotation || 0) + obj.physics.angularVelocity * deltaTime;
      }
    });
  }

  private checkGroundCollision(obj: any, context: RuleExecutionContext): void {
    if (!obj.physics) return;
    
    const groundY = context.canvas.height - obj.height;
    
    if (obj.y >= groundY) {
      obj.y = groundY;
      
      const restitution = obj.physics.restitution || 0.5;
      obj.vy = -(obj.vy || 0) * restitution;
      
      const friction = obj.physics.friction || 0.3;
      obj.vx = (obj.vx || 0) * (1 - friction);
      
      if (Math.abs(obj.vy) < 10) {
        obj.vy = 0;
      }
      if (Math.abs(obj.vx) < 5) {
        obj.vx = 0;
      }
    }
  }

  // 🆕 エフェクト更新
  updateEffects(context: RuleExecutionContext): void {
    const now = performance.now();
    
    context.objects.forEach((obj, id) => {
      if (!obj.effectType || !obj.effectStartTime) {
        return;
      }
      
      const elapsed = now - obj.effectStartTime;
      const progress = Math.min(elapsed / obj.effectDuration!, 1.0);
      
      if (progress >= 1.0) {
        this.endEffect(obj);
        return;
      }
      
      switch (obj.effectType) {
        case 'scale':
          this.updateScaleEffect(obj, progress);
          break;
        case 'flash':
          this.updateFlashEffect(obj, elapsed);
          break;
        case 'shake':
          this.updateShakeEffect(obj, elapsed);
          break;
        case 'rotate':
          this.updateRotateEffect(obj, progress);
          break;
      }
    });
  }

  private updateScaleEffect(obj: any, progress: number): void {
    if (obj.baseScale !== undefined && obj.effectScale !== undefined) {
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      obj.scale = obj.baseScale + (obj.effectScale - obj.baseScale) * easedProgress;
    }
  }

  private updateFlashEffect(obj: any, elapsed: number): void {
    const frequency = obj.flashFrequency || 10;
    const intensity = obj.flashIntensity || 0.5;
    
    const phase = (elapsed / 1000) * frequency * Math.PI * 2;
    const flashAmount = (Math.sin(phase) + 1) / 2;
    
    obj.flashValue = flashAmount * intensity;
  }

  private updateShakeEffect(obj: any, elapsed: number): void {
    const intensity = obj.shakeIntensity || 5;
    const direction = obj.shakeDirection || 'both';
    
    const shakeX = (Math.random() - 0.5) * 2 * intensity;
    const shakeY = (Math.random() - 0.5) * 2 * intensity;
    
    if (direction === 'horizontal' || direction === 'both') {
      obj.x = obj.originalX + shakeX;
    }
    if (direction === 'vertical' || direction === 'both') {
      obj.y = obj.originalY + shakeY;
    }
  }

  private updateRotateEffect(obj: any, progress: number): void {
    const amount = obj.rotationAmount || 360;
    const direction = obj.rotationDirection || 'clockwise';
    const multiplier = direction === 'clockwise' ? 1 : -1;
    
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    obj.rotation = obj.baseRotation + (amount * multiplier * easedProgress * Math.PI / 180);
  }

  private endEffect(obj: any): void {
    switch (obj.effectType) {
      case 'scale':
        if (obj.baseScale !== undefined) {
          obj.scale = obj.baseScale;
        }
        break;
      case 'flash':
        obj.flashValue = 0;
        break;
      case 'shake':
        if (obj.originalX !== undefined) {
          obj.x = obj.originalX;
        }
        if (obj.originalY !== undefined) {
          obj.y = obj.originalY;
        }
        break;
      case 'rotate':
        if (obj.baseRotation !== undefined) {
          obj.rotation = obj.baseRotation;
        }
        break;
    }
    
    obj.effectType = undefined;
    obj.effectStartTime = undefined;
    obj.effectDuration = undefined;
  }

  // 🆕 アニメーション更新
  updateAnimations(context: RuleExecutionContext, deltaTime: number): void {
    const now = performance.now();
    
    context.objects.forEach((obj, id) => {
      if (!obj.animationPlaying) {
        return;
      }
      
      const speed = obj.animationSpeed || 12;
      const frameTime = 1000 / speed;
      const reverse = obj.animationReverse || false;
      const loop = obj.animationLoop !== undefined ? obj.animationLoop : true;
      
      let state = this.animationStates.get(id);
      if (!state) {
        state = {
          lastFrame: obj.currentFrame || 0,
          frameChangeTime: now,
          loopCount: 0
        };
        this.animationStates.set(id, state);
      }
      
      if (now - state.frameChangeTime >= frameTime) {
        const frameCount = obj.frameCount || 1;
        
        if (reverse) {
          obj.currentFrame = obj.currentFrame! - 1;
          if (obj.currentFrame! < 0) {
            if (loop) {
              obj.currentFrame = frameCount - 1;
              state.loopCount++;
            } else {
              obj.currentFrame = 0;
              obj.animationPlaying = false;
            }
          }
        } else {
          obj.currentFrame = obj.currentFrame! + 1;
          if (obj.currentFrame! >= frameCount) {
            if (loop) {
              obj.currentFrame = 0;
              state.loopCount++;
            } else {
              obj.currentFrame = frameCount - 1;
              obj.animationPlaying = false;
            }
          }
        }
        
        state.lastFrame = obj.currentFrame!;
        state.frameChangeTime = now;
      }
    });
  }

  // 衝突キャッシュ更新
  updateCollisionCache(): void {
    this.previousCollisions = new Map(this.collisionCache);
  }

  // ルール実行可能チェック
  private canExecuteRule(rule: GameRule): boolean {
    if (!rule.executionLimit) return true;
    
    const currentCount = this.executionCounts.get(rule.id) || 0;
    return currentCount < rule.executionLimit.maxCount;
  }

  private isRuleTimeValid(rule: GameRule, currentTime: number): boolean {
    if (!rule.timeWindow) return true;
    
    return currentTime >= rule.timeWindow.start && 
           currentTime <= rule.timeWindow.end;
  }

  // デバッグ情報
  getDebugInfo(): any {
    return {
      rulesCount: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      flagsCount: this.flags.size,
      flagDefinitionsCount: this.flagDefinitions.size,
      executionCounts: Object.fromEntries(this.executionCounts),
      flags: Object.fromEntries(this.flags),
      flagDefinitions: Object.fromEntries(this.flagDefinitions),
      countersCount: this.counters.size,
      counterDefinitionsCount: this.counterDefinitions.size,
      counters: Object.fromEntries(this.counters),
      counterHistorySize: this.counterHistory.length,
      recentCounterChanges: this.counterHistory.slice(-10),
      randomStatesCount: this.randomStates.size,
      collisionCacheSize: this.collisionCache.size,
      animationStatesCount: this.animationStates.size,
      consumedTouchEventsCount: this.consumedTouchEvents.size
    };
  }

  // リセット
  reset(): void {
    this.executionCounts.clear();
    this.flags.clear();
    this.counters.clear();
    this.counterHistory = [];
    this.counterPreviousValues.clear();
    this.consumedTouchEvents.clear();
    this.randomStates.clear();
    this.collisionCache.clear();
    this.previousCollisions.clear();
    this.animationStates.clear();

    this.flagDefinitions.forEach((initialValue, flagId) => {
      this.flags.set(flagId, initialValue);
    });

    this.counterDefinitions.forEach((counterDef, name) => {
      this.counters.set(name, counterDef.initialValue);
      this.counterPreviousValues.set(name, counterDef.initialValue);
    });

    console.log('🔄 RuleEngine リセット完了');
  }
}

export default RuleEngine;