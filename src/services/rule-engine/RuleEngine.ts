// src/services/rule-engine/RuleEngine.ts
// IF-THENルールエンジン - Phase 1+2 修正完全適用版 + Position条件修正版 + Flag初期化対応版
// 🔧 修正内容（2025-11-25）: Show/Hide アクションでscale/position保持
// 🔧 修正内容（2025-11-26）: Position条件の座標系修正（正規化→ピクセル変換）
// 🔧 修正内容（2025-12-02）: Flag初期化機能追加（addFlagDefinition, reset時の復元）
// 🔧 修正内容（2025-12-02）: 8方向移動タイプ(direction)追加
// 🔍 デバッグ: タッチ条件詳細ログ追加
// 🔍 デバッグ: アクション実行フロー詳細ログ追加

import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../types/editor/GameScript';

// カウンター型インポート
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
  // ゲーム状態
  gameState: {
    isPlaying: boolean;
    isPaused: boolean;
    score: number;
    timeElapsed: number;
    flags: Map<string, boolean>;
    counters: Map<string, number>;
  };
  
  // オブジェクト状態
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
    // エフェクト管理
    baseScale?: number;
    effectScale?: number;
    effectStartTime?: number;
    effectDuration?: number;
    effectType?: string;
    // 🔧 追加: show/hide時の元の値を保存
    originalScale?: number;
    originalX?: number;
    originalY?: number;
  }>;
  
  // イベント履歴
  events: Array<{
    type: string;
    timestamp: number;
    data: any;
  }>;
  
  // キャンバス情報
  canvas: {
    width: number;
    height: number;
    context?: CanvasRenderingContext2D;
  };
  
  // 音声システム
  audioSystem?: {
    playSound: (soundId: string, volume?: number) => Promise<void>;
    stopSound: (soundId: string) => void;
    setVolume: (soundId: string, volume: number) => void;
  };
  
  // エフェクトシステム
  effectSystem?: {
    playEffect: (effect: EffectConfig) => void;
    stopEffect: (effectId: string) => void;
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

// 🔧 追加: フラグ定義インターフェース
export interface FlagDefinition {
  id: string;
  initialValue: boolean;
}

// 🔧 追加: 8方向の定義
type DirectionType = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

const DIRECTION_VECTORS: Record<DirectionType, { vx: number; vy: number }> = {
  'up': { vx: 0, vy: -1 },
  'down': { vx: 0, vy: 1 },
  'left': { vx: -1, vy: 0 },
  'right': { vx: 1, vy: 0 },
  'up-left': { vx: -0.7071, vy: -0.7071 },    // 45度: 1/√2 ≈ 0.7071
  'up-right': { vx: 0.7071, vy: -0.7071 },
  'down-left': { vx: -0.7071, vy: 0.7071 },
  'down-right': { vx: 0.7071, vy: 0.7071 }
};

/**
 * RuleEngine クラス - Phase 1+2 完全実装版 + Show/Hide修正版 + Position条件修正版 + Flag初期化対応版 + 8方向移動対応版
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
  
  // 🔧 追加: フラグ定義管理
  private flagDefinitions: Map<string, boolean> = new Map();
  
  // Random条件用の状態管理
  private randomStates: Map<string, {
    lastCheckTime: number;
    eventCount: number;
    seed?: string;
  }> = new Map();
  
  // 衝突判定用のキャッシュ
  private collisionCache: Map<string, Set<string>> = new Map();
  private lastCollisionCheckTime: number = 0;
  
  // 衝突状態追跡（enter/stay/exit判定用）
  private previousCollisions: Map<string, Set<string>> = new Map();
  
  // アニメーション状態追跡
  private animationStates: Map<string, {
    lastFrame: number;
    frameChangeTime: number;
    loopCount: number;
  }> = new Map();
  
  // GameState条件用の前回状態管理（Phase 2 追加）
  private previousGameState?: { 
    isPlaying: boolean; 
    isPaused: boolean; 
    score: number 
  };
  
  constructor() {
    console.log('🎮 RuleEngine初期化（8方向移動対応版）');
  }

  // ==================== フラグ管理メソッド ====================

  // 🔧 追加: フラグ定義追加メソッド
  addFlagDefinition(flag: FlagDefinition): void {
    this.flagDefinitions.set(flag.id, flag.initialValue);
    this.setFlag(flag.id, flag.initialValue);
    console.log(`🚩 フラグ定義追加: ${flag.id} = ${flag.initialValue}`);
  }

  // 🔧 追加: フラグ定義削除メソッド
  removeFlagDefinition(flagId: string): void {
    this.flagDefinitions.delete(flagId);
    this.flags.delete(flagId);
  }

  // 🔧 追加: 複数フラグ定義を一括追加
  addFlagDefinitions(flags: FlagDefinition[]): void {
    for (const flag of flags) {
      this.addFlagDefinition(flag);
    }
  }

  setFlag(flagId: string, value: boolean): void {
    this.flags.set(flagId, value);
  }

  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) || false;
  }

  // ==================== カウンター管理メソッド ====================

  addCounterDefinition(counter: GameCounter): void {
    this.counterDefinitions.set(counter.name, counter);
    this.setCounter(counter.name, counter.initialValue);
  }

  removeCounterDefinition(counterName: string): void {
    this.counterDefinitions.delete(counterName);
    this.counters.delete(counterName);
    this.counterPreviousValues.delete(counterName);
  }

  setCounter(counterName: string, value: number): void {
    const oldValue = this.counters.get(counterName) || 0;
    const counterDef = this.counterDefinitions.get(counterName);
    
    const clampedValue = counterDef ? clampCounterValue(value, counterDef) : value;
    this.counterPreviousValues.set(counterName, oldValue);
    this.counters.set(counterName, clampedValue);
    
    if (oldValue !== clampedValue) {
      const changeEvent: CounterChangeEvent = {
        counterName,
        oldValue,
        newValue: clampedValue,
        operation: 'set',
        timestamp: Date.now()
      };
      this.counterHistory.push(changeEvent);
      
      if (this.counterHistory.length > 100) {
        this.counterHistory.shift();
      }
    }
  }

  getCounter(counterName: string): number {
    return this.counters.get(counterName) || 0;
  }

  getCounterPreviousValue(counterName: string): number {
    return this.counterPreviousValues.get(counterName) || 0;
  }

  executeCounterOperation(
    counterName: string, 
    operation: CounterOperation, 
    value?: number,
    ruleId?: string
  ): CounterChangeEvent | null {
    const currentValue = this.getCounter(counterName);
    let newValue = currentValue;
    
    switch (operation) {
      case 'increment':
      case 'add':
        newValue = currentValue + (value || 1);
        break;
      case 'decrement':
      case 'subtract':
        newValue = currentValue - (value || 1);
        break;
      case 'set':
        newValue = value || 0;
        break;
      case 'reset':
        const counterDef = this.counterDefinitions.get(counterName);
        newValue = counterDef ? counterDef.initialValue : 0;
        break;
      case 'multiply':
        newValue = currentValue * (value || 1);
        break;
      case 'divide':
        newValue = value && value !== 0 ? currentValue / value : currentValue;
        break;
      default:
        return null;
    }

    this.setCounter(counterName, newValue);

    const changeEvent: CounterChangeEvent = {
      counterName,
      oldValue: currentValue,
      newValue: this.getCounter(counterName),
      operation,
      timestamp: Date.now(),
      triggeredBy: ruleId
    };

    return changeEvent;
  }

  getCounterHistory(counterName?: string): CounterChangeEvent[] {
    if (counterName) {
      return this.counterHistory.filter(event => event.counterName === counterName);
    }
    return [...this.counterHistory];
  }

  // ==================== ルール管理メソッド ====================

  addRule(rule: GameRule): void {
    this.rules.push(rule);
    this.executionCounts.set(rule.id, 0);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    this.executionCounts.delete(ruleId);
  }

  updateRule(updatedRule: GameRule): void {
    const index = this.rules.findIndex(rule => rule.id === updatedRule.id);
    if (index !== -1) {
      this.rules[index] = updatedRule;
    }
  }

  // ==================== メインルール評価・実行 ====================

  evaluateAndExecuteRules(context: RuleExecutionContext): ActionExecutionResult[] {
    const results: ActionExecutionResult[] = [];

    // 衝突判定キャッシュを更新（フレームごとに1回）
    const currentTime = Date.now();
    if (currentTime - this.lastCollisionCheckTime > 16) {
      this.updateCollisionCache(context);
      this.lastCollisionCheckTime = currentTime;
    }

    const sortedRules = [...this.rules]
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        const canExecute = this.canExecuteRule(rule);
        if (!canExecute) {
          continue;
        }

        const timeValid = this.isRuleTimeValid(rule, context.gameState.timeElapsed);
        if (!timeValid) {
          continue;
        }

        const evaluation = this.evaluateRule(rule, context);

        if (evaluation.shouldExecute) {
          const result = this.executeActions(rule.actions, context, rule.id);
          results.push(result);

          const currentCount = this.executionCounts.get(rule.id) || 0;
          this.executionCounts.set(rule.id, currentCount + 1);
        }
      } catch (error) {
        console.error(`❌ ルール実行エラー [${rule.name}]:`, error);
      }
    }

    return results;
  }

  // ==================== 条件評価 ====================

  private evaluateRule(rule: GameRule, context: RuleExecutionContext): RuleEvaluationResult {
    const { triggers } = rule;
    const matchedConditions: string[] = [];
    
    const conditionResults = triggers.conditions.map(condition => {
      const result = this.evaluateCondition(condition, context, rule.targetObjectId);
      if (result) {
        matchedConditions.push(condition.type);
      }
      return result;
    });

    const shouldExecute = triggers.operator === 'AND' 
      ? conditionResults.every(result => result)
      : conditionResults.some(result => result);

    // 🔍 デバッグ: player-jumpルールのみログ出力
    if (rule.id === 'player-jump' && context.events.length > 0) {
      console.log(`🎯 [player-jump] 評価結果: shouldExecute=${shouldExecute}, conditions=`, 
        triggers.conditions.map(c => ({ type: c.type, target: (c as any).target })));
    }

    return {
      shouldExecute,
      matchedConditions,
      executionPriority: rule.priority,
      debugInfo: `${rule.name}: ${matchedConditions.join(', ')}`
    };
  }

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

  // ✅ Phase 2 修正: Collision条件評価（完全実装版）
  private evaluateCollisionCondition(
    condition: Extract<TriggerCondition, { type: 'collision' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    try {
      const sourceId = targetObjectId;
      const targetId = condition.target === 'self' ? targetObjectId : 
                       condition.target === 'background' ? 'background' :
                       condition.target === 'stage' ? null :
                       condition.target;
      
      const sourceObj = context.objects.get(sourceId);
      
      if (!sourceObj || !sourceObj.visible) {
        return false;
      }
      
      if (condition.target === 'stage') {
        let isColliding = false;

        if (condition.region) {
          const region = condition.region;

          if (region.shape === 'rect') {
            const rectX = region.x * context.canvas.width;
            const rectY = region.y * context.canvas.height;
            const rectWidth = (region.width || 0.4) * context.canvas.width;
            const rectHeight = (region.height || 0.4) * context.canvas.height;

            isColliding = sourceObj.x < rectX + rectWidth &&
                         sourceObj.x + sourceObj.width > rectX &&
                         sourceObj.y < rectY + rectHeight &&
                         sourceObj.y + sourceObj.height > rectY;
          } else if (region.shape === 'circle') {
            const centerX = region.x * context.canvas.width;
            const centerY = region.y * context.canvas.height;
            const radius = (region.radius || 0.2) * context.canvas.width;

            const objCenterX = sourceObj.x + sourceObj.width / 2;
            const objCenterY = sourceObj.y + sourceObj.height / 2;

            const distance = Math.sqrt(
              Math.pow(objCenterX - centerX, 2) + Math.pow(objCenterY - centerY, 2)
            );

            const objRadius = (sourceObj.width + sourceObj.height) / 4;

            isColliding = distance < radius + objRadius;
          }
        } else {
          const margin = 5;
          const hitLeft = sourceObj.x <= margin;
          const hitRight = sourceObj.x + sourceObj.width >= context.canvas.width - margin;
          const hitTop = sourceObj.y <= margin;
          const hitBottom = sourceObj.y + sourceObj.height >= context.canvas.height - margin;

          isColliding = hitLeft || hitRight || hitTop || hitBottom;
        }

        const wasColliding = this.previousCollisions.get(sourceId)?.has('stage') || false;

        switch (condition.collisionType) {
          case 'enter':
            return isColliding && !wasColliding;
          case 'stay':
            return isColliding;
          case 'exit':
            return !isColliding && wasColliding;
          default:
            return false;
        }
      }
      
      if (!targetId) {
        return false;
      }
      
      const targetObj = targetId === 'background' 
        ? null
        : context.objects.get(targetId);
      
      if (!targetObj || !targetObj.visible) {
        return false;
      }
      
      let isColliding = false;

      if (condition.checkMode === 'pixel') {
        isColliding = this.checkAABBCollision(sourceObj, targetObj);
      } else {
        isColliding = this.checkAABBCollision(sourceObj, targetObj);
      }
      
      const previousColliding = this.previousCollisions.get(sourceId) || new Set();
      const wasCollidingWithTarget = previousColliding.has(targetId);
      
      switch (condition.collisionType) {
        case 'enter':
          return isColliding && !wasCollidingWithTarget;
        case 'stay':
          return isColliding;
        case 'exit':
          return !isColliding && wasCollidingWithTarget;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  private updateCollisionCache(context: RuleExecutionContext): void {
    this.previousCollisions = new Map(this.collisionCache);
    this.collisionCache.clear();
    
    const objects = Array.from(context.objects.values()).filter(obj => obj.visible);
    
    for (let i = 0; i < objects.length; i++) {
      const objA = objects[i];
      
      for (let j = i + 1; j < objects.length; j++) {
        const objB = objects[j];
        
        if (this.checkAABBCollision(objA, objB)) {
          if (!this.collisionCache.has(objA.id)) {
            this.collisionCache.set(objA.id, new Set());
          }
          if (!this.collisionCache.has(objB.id)) {
            this.collisionCache.set(objB.id, new Set());
          }
          
          this.collisionCache.get(objA.id)!.add(objB.id);
          this.collisionCache.get(objB.id)!.add(objA.id);
        }
      }
    }
  }

  private checkAABBCollision(
    objA: { x: number; y: number; width: number; height: number },
    objB: { x: number; y: number; width: number; height: number }
  ): boolean {
    return objA.x < objB.x + objB.width &&
           objA.x + objA.width > objB.x &&
           objA.y < objB.y + objB.height &&
           objA.y + objA.height > objB.y;
  }

  private evaluateAnimationCondition(
    condition: Extract<TriggerCondition, { type: 'animation' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const targetObj = context.objects.get(condition.target);

      if (!targetObj) {
        return false;
      }
      
      let animState = this.animationStates.get(condition.target);
      if (!animState) {
        animState = {
          lastFrame: targetObj.animationIndex || 0,
          frameChangeTime: Date.now(),
          loopCount: 0
        };
        this.animationStates.set(condition.target, animState);
      }
      
      const currentFrame = targetObj.currentFrame || targetObj.animationIndex || 0;
      const frameCount = targetObj.frameCount || 1;
      
      if (currentFrame !== animState.lastFrame) {
        animState.frameChangeTime = Date.now();
        
        if (animState.lastFrame === frameCount - 1 && currentFrame === 0) {
          animState.loopCount++;
        }
        
        animState.lastFrame = currentFrame;
      }
      
      switch (condition.condition) {
        case 'frame':
          if (condition.frameNumber !== undefined) {
            return currentFrame === condition.frameNumber;
          }
          if (condition.animationIndex !== undefined) {
            return currentFrame === condition.animationIndex;
          }
          return false;
        
        case 'start':
          return targetObj.animationPlaying && currentFrame === 0;
        
        case 'end':
          return currentFrame === frameCount - 1;
        
        case 'loop':
          return animState.loopCount > 0;

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  updateAnimationState(objectId: string, currentFrame: number, loopCount: number): void {
    const state = this.animationStates.get(objectId) || {
      lastFrame: -1,
      frameChangeTime: Date.now(),
      loopCount: 0
    };
    
    if (currentFrame !== state.lastFrame) {
      state.lastFrame = currentFrame;
      state.frameChangeTime = Date.now();
      
      if (currentFrame === 0 && state.lastFrame !== 0) {
        state.loopCount = loopCount;
      }
    }
    
    this.animationStates.set(objectId, state);
  }

  private evaluateGameStateCondition(
    condition: Extract<TriggerCondition, { type: 'gameState' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const { gameState } = context;
      
      let previousState = this.previousGameState || {
        isPlaying: false,
        isPaused: false,
        score: 0
      };
      
      this.previousGameState = {
        isPlaying: gameState.isPlaying,
        isPaused: gameState.isPaused,
        score: gameState.score
      };
      
      const isState = (stateName: string): boolean => {
        switch (stateName) {
          case 'playing':
            return gameState.isPlaying && !gameState.isPaused;
          case 'paused':
            return gameState.isPaused;
          case 'success':
            return !gameState.isPlaying && 
                   gameState.score > 0 && 
                   gameState.timeElapsed > 0;
          case 'failure':
            return !gameState.isPlaying && 
                   gameState.score <= 0 && 
                   gameState.timeElapsed > 0;
          default:
            return false;
        }
      };
      
      const wasState = (stateName: string): boolean => {
        switch (stateName) {
          case 'playing':
            return previousState.isPlaying;
          case 'paused':
            return previousState.isPaused;
          case 'success':
            return false;
          case 'failure':
            return false;
          default:
            return false;
        }
      };
      
      const checkType = (condition as any).checkType || 'is';
      
      switch (checkType) {
        case 'is':
          return isState(condition.state);
        case 'not':
          return !isState(condition.state);
        case 'became':
          return !wasState(condition.state) && isState(condition.state);
        default:
          return isState(condition.state);
      }
    } catch (error) {
      return false;
    }
  }

  private evaluateRandomCondition(
    condition: Extract<TriggerCondition, { type: 'random' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const currentTime = Date.now();
      const conditionId = JSON.stringify(condition);
      
      let state = this.randomStates.get(conditionId);
      if (!state) {
        state = {
          lastCheckTime: currentTime,
          eventCount: 0,
          seed: condition.seed
        };
        this.randomStates.set(conditionId, state);
      }
      
      if (condition.interval) {
        const timeSinceLastCheck = currentTime - state.lastCheckTime;
        if (timeSinceLastCheck < condition.interval) {
          return false;
        }
        state.lastCheckTime = currentTime;
      }
      
      if (condition.maxEventsPerSecond) {
        const eventsPerSecond = state.eventCount / ((currentTime - state.lastCheckTime) / 1000);
        if (eventsPerSecond >= condition.maxEventsPerSecond) {
          return false;
        }
      }
      
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

  // 🔍 デバッグ版: Touch条件評価（最小限ログ）
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
    const touchTarget = condition.target === 'self' ? targetObjectId : condition.target;

    // 🔍 重要ログのみ出力
    if (context.events.length > 0) {
      console.log(`👆 Touch条件: condition.target="${condition.target}", touchTarget="${touchTarget}", latestTouch.data.target="${latestTouch.data.target}", 結果=${touchTarget === 'stage' ? latestTouch.data.target === 'stage' : latestTouch.data.target === touchTarget}`);
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

          return result;
        } else if (region.shape === 'circle') {
          const centerX = region.x * context.canvas.width;
          const centerY = region.y * context.canvas.height;
          const radius = (region.radius || 0.2) * context.canvas.width;

          const distance = Math.sqrt(
            Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2)
          );

          const result = distance <= radius;

          return result;
        }
      }

      return true;
    }

    const result = latestTouch.data.target === touchTarget;

    return result;
  }

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

  // 🔧 修正版: Flag条件評価（デバッグログ追加）
  private evaluateFlagCondition(
    condition: Extract<TriggerCondition, { type: 'flag' }>
  ): boolean {
    const currentValue = this.getFlag(condition.flagId);
    
    // デバッグログ
    console.log(`🚩 Flag条件評価: ${condition.flagId} = ${currentValue}, 期待: ${condition.condition}`);
    
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

  // 🔧 修正版: Position条件評価（座標系修正、ログなし）
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
      
      // 🔧 修正: 矩形の場合、正規化座標（0.0〜1.0）をピクセル座標に変換
      if (region.shape === 'rect' && region.width && region.height) {
        const rectX = region.x * context.canvas.width;
        const rectY = region.y * context.canvas.height;
        const rectWidth = region.width * context.canvas.width;
        const rectHeight = region.height * context.canvas.height;
        
        const inRect = targetObj.x >= rectX && 
                      targetObj.x <= rectX + rectWidth &&
                      targetObj.y >= rectY && 
                      targetObj.y <= rectY + rectHeight;
        
        switch (condition.area) {
          case 'inside':
            return inRect;
          case 'outside':
            return !inRect;
          default:
            return false;
        }
      }
      
      // 🔧 修正: 円形の場合も正規化座標をピクセル座標に変換
      if (region.shape === 'circle' && region.radius) {
        const centerX = region.x * context.canvas.width;
        const centerY = region.y * context.canvas.height;
        const radius = region.radius * context.canvas.width;
        
        const distance = Math.sqrt(
          Math.pow(targetObj.x - centerX, 2) + 
          Math.pow(targetObj.y - centerY, 2)
        );
        
        const inCircle = distance <= radius;
        
        switch (condition.area) {
          case 'inside':
            return inCircle;
          case 'outside':
            return !inCircle;
          default:
            return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Position条件評価エラー:', error);
      return false;
    }
  }

  // ==================== アクション実行 ====================

  private executeActions(
    actions: GameAction[],
    context: RuleExecutionContext,
    ruleId?: string
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const newGameState: Partial<RuleExecutionContext['gameState']> = {};
    const counterChanges: CounterChangeEvent[] = [];

    // 🔍 player-jumpのみログ出力
    if (ruleId === 'player-jump') {
      console.log(`✅ [player-jump] アクション実行: ${actions.length}個`);
    }

    for (const action of actions) {
      try {
        if (ruleId === 'player-jump') {
          console.log(`  → type=${action.type}, targetId=${(action as any).targetId}`);
        }

        switch (action.type) {
          case 'addScore':
            newGameState.score = (context.gameState.score || 0) + action.points;
            effectsApplied.push(`スコア+${action.points}`);
            break;

          case 'success':
            newGameState.score = (context.gameState.score || 0) + (action.score || 0);
            newGameState.isPlaying = false;
            effectsApplied.push('ゲーム成功');
            break;

          case 'failure':
            newGameState.isPlaying = false;
            effectsApplied.push('ゲーム失敗');
            break;

          case 'setFlag':
            this.setFlag(action.flagId, action.value);
            effectsApplied.push(`フラグ${action.flagId}=${action.value}`);
            break;

          case 'toggleFlag':
            const current = this.getFlag(action.flagId);
            this.setFlag(action.flagId, !current);
            effectsApplied.push(`フラグ${action.flagId}切り替え`);
            break;

          case 'playSound':
            this.executePlaySoundAction(action, context);
            effectsApplied.push(`音声再生: ${action.soundId}`);
            break;

          case 'showMessage':
            effectsApplied.push(`メッセージ: ${action.text}`);
            break;

          case 'counter':
            const changeEvent = this.executeCounterOperation(
              action.counterName,
              action.operation,
              action.value,
              ruleId
            );
            
            if (changeEvent) {
              counterChanges.push(changeEvent);
              effectsApplied.push(`カウンター${action.counterName}: ${changeEvent.oldValue}→${changeEvent.newValue}`);
              
              if (action.notification?.enabled) {
                effectsApplied.push(`通知: ${action.notification.message || `${action.counterName}が変更されました`}`);
              }
            } else {
              errors.push(`カウンター操作失敗: ${action.counterName} ${action.operation}`);
            }
            break;

          case 'show':
            this.executeShowAction(action, context);
            effectsApplied.push(`表示: ${action.targetId}`);
            break;

          case 'hide':
            this.executeHideAction(action, context);
            effectsApplied.push(`非表示: ${action.targetId}`);
            break;

          case 'move':
            this.executeMoveAction(action, context);
            effectsApplied.push(`移動: ${action.targetId} (${action.movement.type})`);
            break;

          case 'switchAnimation':
            this.executeSwitchAnimationAction(action, context);
            effectsApplied.push(`アニメーション切り替え: ${action.targetId} → ${action.animationIndex}`);
            break;

          case 'effect':
            this.executeEffectAction(action, context);
            effectsApplied.push(`エフェクト: ${action.effect}`);
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

  private executePlaySoundAction(
    action: Extract<GameAction, { type: 'playSound' }>,
    context: RuleExecutionContext
  ): void {
    if (context.audioSystem) {
      const volume = action.volume !== undefined ? action.volume : 1.0;
      context.audioSystem.playSound(action.soundId, volume).catch(() => {});
    }
  }

  private executeSwitchAnimationAction(
    action: Extract<GameAction, { type: 'switchAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    targetObj.animationIndex = action.animationIndex;
    targetObj.animationPlaying = true;
  }

  private executeEffectAction(
    action: Extract<GameAction, { type: 'effect' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`エフェクト: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    const effect = action.effect;
    const durationMs = (effect.duration || 0.2) * 1000;

    switch (effect.type) {
      case 'scale':
        if (targetObj.baseScale === undefined) {
          targetObj.baseScale = targetObj.scale;
        }

        const scaleAmount = effect.scaleAmount || 0.5;
        targetObj.effectScale = scaleAmount;
        targetObj.effectStartTime = performance.now();
        targetObj.effectDuration = durationMs;
        targetObj.effectType = 'scale';

        console.log(`スケールエフェクト適用: ${action.targetId} (${scaleAmount}x, ${durationMs}ms)`);
        break;

      case 'flash':
      case 'shake':
      case 'rotate':
      case 'particles':
        break;

      default:
        break;
    }
  }

  // 🔧 修正版: Show アクション（scale/position保持）
  private executeShowAction(
    action: Extract<GameAction, { type: 'show' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`Show: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    // 🔧 修正: 元のscale/positionを保存（初回のみ）
    if (targetObj.originalScale === undefined) {
      targetObj.originalScale = targetObj.scale;
    }
    if (targetObj.originalX === undefined) {
      targetObj.originalX = targetObj.x;
    }
    if (targetObj.originalY === undefined) {
      targetObj.originalY = targetObj.y;
    }

    // ✅ visibleフラグのみ変更（scale/positionは変更しない）
    targetObj.visible = true;
    
    console.log(`👁️ オブジェクト表示: ${action.targetId} (scale=${targetObj.scale}, position=(${targetObj.x}, ${targetObj.y}))`);
    
    // fadeIn処理（オプション）
    const fadeIn = (action as any).fadeIn;
    const duration = (action as any).duration || 300;
    
    if (fadeIn && duration > 0) {
      console.log(`🎬 フェードイン（未実装）: ${action.targetId} (${duration}ms)`);
      // TODO: フェードイン実装時に、scaleではなくopacityを使用する
    }
  }

  // 🔧 修正版: Hide アクション（scale/position保持）
  private executeHideAction(
    action: Extract<GameAction, { type: 'hide' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`Hide: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    // ✅ visibleフラグのみ変更（scale/positionは変更しない）
    targetObj.visible = false;
    
    console.log(`🙈 オブジェクト非表示: ${action.targetId} (scale=${targetObj.scale}を保持, position=(${targetObj.x}, ${targetObj.y})を保持)`);
    
    // fadeOut処理（オプション）
    const fadeOut = (action as any).fadeOut;
    const duration = (action as any).duration || 300;
    
    if (fadeOut && duration > 0) {
      console.log(`🎬 フェードアウト（未実装）: ${action.targetId} (${duration}ms)`);
      // TODO: フェードアウト実装時に、scaleではなくopacityを使用する
    }
  }

  // 🔧 修正版: Move アクション（8方向移動対応）
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
        if (movement.target) {
          let targetX: number, targetY: number;
          if (typeof movement.target === 'string') {
            const targetObject = context.objects.get(movement.target);
            if (targetObject) {
              // 🔧 修正: 対象オブジェクトの中心座標を計算
              const targetScale = targetObject.scale || 1;
              targetX = targetObject.x + (targetObject.width * targetScale) / 2;
              targetY = targetObject.y + (targetObject.height * targetScale) / 2;
            } else {
              return;
            }
          } else {
            // 正規化座標をピクセル座標に変換（中心座標として解釈）
            targetX = movement.target.x * context.canvas.width;
            targetY = movement.target.y * context.canvas.height;
          }
          
          // 🔧 修正: オブジェクトの中心座標を計算（左上座標から変換）
          const objScale = targetObj.scale || 1;
          const objCenterX = targetObj.x + (targetObj.width * objScale) / 2;
          const objCenterY = targetObj.y + (targetObj.height * objScale) / 2;
          
          // 中心座標間の差分を計算
          const dx = targetX - objCenterX;
          const dy = targetY - objCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            targetObj.vx = (dx / distance) * speed;
            targetObj.vy = (dy / distance) * speed;
          }
        }
        break;

      // 🔧 追加: 8方向移動タイプ
      case 'direction':
        const direction = (movement as any).direction as DirectionType;
        const dirVector = DIRECTION_VECTORS[direction];
        
        if (dirVector) {
          // 現在の横移動を完全にリセットして、指定方向にのみ移動
          targetObj.vx = dirVector.vx * speed;
          targetObj.vy = dirVector.vy * speed;
          console.log(`🧭 方向移動: ${action.targetId} → ${direction} (vx=${targetObj.vx.toFixed(2)}, vy=${targetObj.vy.toFixed(2)})`);
        } else {
          console.warn(`❌ 不明な方向: ${direction}`);
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

  private executeRandomAction(
    action: Extract<GameAction, { type: 'randomAction' }>,
    context: RuleExecutionContext,
    ruleId?: string
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const counterChanges: CounterChangeEvent[] = [];

    try {
      let selectedAction: GameAction | null = null;
      
      switch (action.selectionMode || 'weighted') {
        case 'weighted':
          const weights = action.weights || action.actions.map(a => a.weight || 1);
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          let random = Math.random() * totalWeight;
          
          for (let i = 0; i < action.actions.length; i++) {
            random -= weights[i];
            if (random <= 0) {
              selectedAction = action.actions[i].action;
              break;
            }
          }
          break;

        case 'probability':
          for (const actionItem of action.actions) {
            const probability = actionItem.probability || (1 / action.actions.length);
            if (Math.random() < probability) {
              selectedAction = actionItem.action;
              break;
            }
          }
          break;

        case 'uniform':
          const randomIndex = Math.floor(Math.random() * action.actions.length);
          selectedAction = action.actions[randomIndex].action;
          break;
      }

      if (selectedAction) {
        const result = this.executeActions([selectedAction], context, ruleId);
        effectsApplied.push(...result.effectsApplied);
        errors.push(...result.errors);
        counterChanges.push(...result.counterChanges);
      }
    } catch (error) {
      errors.push(`RandomAction実行エラー: ${error}`);
    }

    return {
      success: errors.length === 0,
      effectsApplied,
      newGameState: {},
      errors,
      counterChanges
    };
  }

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
      animationStatesCount: this.animationStates.size
    };
  }

  reset(): void {
    this.executionCounts.clear();
    this.flags.clear();
    this.counters.clear();
    this.counterHistory = [];
    this.counterPreviousValues.clear();
    this.randomStates.clear();
    this.collisionCache.clear();
    this.previousCollisions.clear();
    this.animationStates.clear();
    this.previousGameState = undefined;
    
    // カウンターの初期値を復元
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }

    // 🔧 追加: フラグの初期値を復元
    for (const [id, value] of this.flagDefinitions) {
      this.setFlag(id, value);
    }

    console.log('🔄 RuleEngine リセット完了（8方向移動対応版）');
  }

  resetCounters(): void {
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }
    this.counterHistory = [];
  }

  getCounterStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name] of this.counterDefinitions) {
      const history = this.getCounterHistory(name);
      const currentValue = this.getCounter(name);
      
      stats[name] = {
        currentValue,
        totalOperations: history.length,
        incrementCount: history.filter(h => h.operation === 'increment' || h.operation === 'add').length,
        decrementCount: history.filter(h => h.operation === 'decrement' || h.operation === 'subtract').length,
        maxValue: Math.max(currentValue, ...history.map(h => h.newValue)),
        minValue: Math.min(currentValue, ...history.map(h => h.newValue)),
        lastOperationTime: history.length > 0 ? history[history.length - 1].timestamp : 0
      };
    }
    
    return stats;
  }
}

export default RuleEngine;
