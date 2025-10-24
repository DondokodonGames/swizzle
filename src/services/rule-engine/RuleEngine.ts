// src/services/rule-engine/RuleEngine.ts
// IF-THENルールエンジン - 完全実装版（型エラー修正済み）
// 修正内容: 既存の型定義に合わせた実装

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

/**
 * RuleEngine クラス - 完全実装版（型エラー修正済み）
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
  
  constructor() {
    console.log('🎮 RuleEngine初期化（完全実装版 - 型修正済み）');
  }

  // ==================== カウンター管理メソッド ====================

  addCounterDefinition(counter: GameCounter): void {
    this.counterDefinitions.set(counter.name, counter);
    this.setCounter(counter.name, counter.initialValue);
    console.log(`カウンター定義追加: ${counter.name} = ${counter.initialValue}`);
  }

  removeCounterDefinition(counterName: string): void {
    this.counterDefinitions.delete(counterName);
    this.counters.delete(counterName);
    this.counterPreviousValues.delete(counterName);
    console.log(`カウンター定義削除: ${counterName}`);
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
    
    console.log(`カウンター設定: ${counterName} = ${clampedValue} (前回値: ${oldValue})`);
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
        console.warn(`未対応のカウンター操作: ${operation}`);
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
    
    console.log(`カウンター操作実行: ${counterName} ${operation} ${value || ''} (${currentValue} → ${changeEvent.newValue})`);
    
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
    console.log(`ルール追加: ${rule.name} (${rule.id})`);
    this.rules.push(rule);
    this.executionCounts.set(rule.id, 0);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    this.executionCounts.delete(ruleId);
    console.log(`ルール削除: ${ruleId}`);
  }

  updateRule(updatedRule: GameRule): void {
    const index = this.rules.findIndex(rule => rule.id === updatedRule.id);
    if (index !== -1) {
      this.rules[index] = updatedRule;
      console.log(`ルール更新: ${updatedRule.name}`);
    }
  }

  setFlag(flagId: string, value: boolean): void {
    this.flags.set(flagId, value);
    console.log(`フラグ設定: ${flagId} = ${value}`);
  }

  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) || false;
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
        if (!this.canExecuteRule(rule)) {
          continue;
        }

        if (!this.isRuleTimeValid(rule, context.gameState.timeElapsed)) {
          continue;
        }

        const evaluation = this.evaluateRule(rule, context);
        
        if (evaluation.shouldExecute) {
          const result = this.executeActions(rule.actions, context, rule.id);
          results.push(result);
          
          const currentCount = this.executionCounts.get(rule.id) || 0;
          this.executionCounts.set(rule.id, currentCount + 1);
          
          console.log(`ルール実行: ${rule.name} (${currentCount + 1}回目)`);
        }
      } catch (error) {
        console.error(`ルール実行エラー [${rule.name}]:`, error);
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
    switch (condition.type) {
      case 'touch':
        return this.evaluateTouchCondition(condition, context, targetObjectId);
      
      case 'collision':
        return this.evaluateCollisionCondition(condition, context, targetObjectId);
      
      case 'animation':
        return this.evaluateAnimationCondition(condition, context);
      
      case 'time':
        return this.evaluateTimeCondition(condition, context);
      
      case 'flag':
        return this.evaluateFlagCondition(condition);
      
      case 'gameState':
        return this.evaluateGameStateCondition(condition, context);
      
      case 'position':
        return this.evaluatePositionCondition(condition, context);
      
      case 'counter':
        return this.evaluateCounterCondition(condition, context);
      
      case 'random':
        return this.evaluateRandomCondition(condition, context);
      
      default:
        console.warn(`未対応の条件タイプ: ${(condition as any).type}`);
        return false;
    }
  }

  // ✅ Collision条件評価（既存型定義に合わせて修正）
  private evaluateCollisionCondition(
    condition: Extract<TriggerCondition, { type: 'collision' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    try {
      const targetId = condition.target === 'self' ? targetObjectId : condition.target;
      const targetObj = context.objects.get(targetId);
      
      if (!targetObj || !targetObj.visible) {
        return false;
      }
      
      const currentColliding = this.collisionCache.get(targetId);
      const previousColliding = this.previousCollisions.get(targetId) || new Set();
      
      // collisionType: 'enter' | 'stay' | 'exit'
      switch (condition.collisionType) {
        case 'enter':
          // 新しく衝突を開始した
          if (currentColliding) {
            for (const collidingId of currentColliding) {
              if (!previousColliding.has(collidingId)) {
                return true;
              }
            }
          }
          return false;
        
        case 'stay':
          // 衝突が継続している
          return currentColliding ? currentColliding.size > 0 : false;
        
        case 'exit':
          // 衝突が終了した
          for (const previousId of previousColliding) {
            if (!currentColliding || !currentColliding.has(previousId)) {
              return true;
            }
          }
          return false;
        
        default:
          console.warn(`未対応の衝突タイプ: ${condition.collisionType}`);
          return false;
      }
    } catch (error) {
      console.error('衝突条件評価エラー:', error);
      return false;
    }
  }

  // 衝突判定キャッシュ更新
  private updateCollisionCache(context: RuleExecutionContext): void {
    // 前回の衝突状態を保存
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

  // AABB衝突判定
  private checkAABBCollision(
    objA: { x: number; y: number; width: number; height: number },
    objB: { x: number; y: number; width: number; height: number }
  ): boolean {
    return objA.x < objB.x + objB.width &&
           objA.x + objA.width > objB.x &&
           objA.y < objB.y + objB.height &&
           objA.y + objA.height > objB.y;
  }

  // ✅ Animation条件評価（既存型定義に合わせて修正）
  private evaluateAnimationCondition(
    condition: Extract<TriggerCondition, { type: 'animation' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const targetObj = context.objects.get(condition.target);
      
      if (!targetObj) {
        return false;
      }
      
      const animState = this.animationStates.get(condition.target);
      
      // condition: 'start' | 'end' | 'frame' | 'loop'
      switch (condition.condition) {
        case 'frame':
          // 特定フレーム到達
          if (condition.frameNumber !== undefined) {
            return targetObj.animationIndex === condition.frameNumber;
          }
          // animationIndexを使用する場合
          if (condition.animationIndex !== undefined) {
            return targetObj.animationIndex === condition.animationIndex;
          }
          return false;
        
        case 'start':
          // アニメーション開始
          return targetObj.animationPlaying && 
                 targetObj.animationIndex === 0;
        
        case 'end':
          // アニメーション終了
          if (targetObj.frameCount) {
            return targetObj.animationIndex === targetObj.frameCount - 1;
          }
          return false;
        
        case 'loop':
          // ループ完了
          if (animState) {
            return animState.loopCount > 0;
          }
          return false;
        
        default:
          console.warn(`未対応のアニメーション条件: ${condition.condition}`);
          return false;
      }
    } catch (error) {
      console.error('アニメーション条件評価エラー:', error);
      return false;
    }
  }

  // アニメーション状態更新
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

  // ✅ GameState条件評価（既存型定義に合わせて修正）
  private evaluateGameStateCondition(
    condition: Extract<TriggerCondition, { type: 'gameState' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const { gameState } = context;
      
      // state: 'playing' | 'paused' | 'success' | 'failure'
      switch (condition.state) {
        case 'playing':
          return gameState.isPlaying;
        
        case 'paused':
          return gameState.isPaused;
        
        case 'success':
          // 成功状態（ゲーム終了 + 高スコア等）
          return !gameState.isPlaying && gameState.score > 0;
        
        case 'failure':
          // 失敗状態（ゲーム終了 + 低スコア等）
          return !gameState.isPlaying && gameState.score <= 0;
        
        default:
          console.warn(`未対応のゲーム状態: ${condition.state}`);
          return false;
      }
    } catch (error) {
      console.error('ゲーム状態条件評価エラー:', error);
      return false;
    }
  }

  // Random条件評価
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
      
      console.log(`Random条件評価: 確率=${condition.probability}, 判定=${randomValue.toFixed(3)}, 結果=${success}`);
      
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
      console.error('Random条件評価エラー:', error);
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
      
      console.log(`カウンター条件評価: ${condition.counterName}(${currentValue}) ${condition.comparison} ${condition.value} = ${result}`);
      
      return result;
    } catch (error) {
      console.error('カウンター条件評価エラー:', error);
      return false;
    }
  }

  // タッチ条件評価
  private evaluateTouchCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    const touchEvents = context.events.filter(e => e.type === 'touch');
    
    if (!touchEvents.length) return false;
    
    const latestTouch = touchEvents[touchEvents.length - 1];
    const touchTarget = condition.target === 'self' ? targetObjectId : condition.target;
    
    if (touchTarget === 'stage') {
      return latestTouch.data.target === 'stage';
    }
    
    const targetObj = context.objects.get(touchTarget);
    if (!targetObj) return false;
    
    const { x: touchX, y: touchY } = latestTouch.data;
    const objBounds = {
      left: targetObj.x,
      right: targetObj.x + (targetObj.width || 100),
      top: targetObj.y,
      bottom: targetObj.y + (targetObj.height || 100)
    };
    
    return touchX >= objBounds.left && touchX <= objBounds.right &&
           touchY >= objBounds.top && touchY <= objBounds.bottom;
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
      
      if (region.shape === 'rect' && region.width && region.height) {
        const inRect = targetObj.x >= region.x && 
                      targetObj.x <= region.x + region.width &&
                      targetObj.y >= region.y && 
                      targetObj.y <= region.y + region.height;
        
        switch (condition.area) {
          case 'inside':
            return inRect;
          case 'outside':
            return !inRect;
          default:
            return false;
        }
      }
      
      if (region.shape === 'circle' && region.radius) {
        const distance = Math.sqrt(
          Math.pow(targetObj.x - region.x, 2) + 
          Math.pow(targetObj.y - region.y, 2)
        );
        
        const inCircle = distance <= region.radius;
        
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
      console.error('位置条件評価エラー:', error);
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

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'addScore':
            newGameState.score = (context.gameState.score || 0) + action.points;
            effectsApplied.push(`スコア+${action.points}`);
            break;

          case 'success':
            newGameState.score = (context.gameState.score || 0) + (action.score || 0);
            effectsApplied.push('ゲーム成功');
            break;

          case 'failure':
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

          // ✅ PlaySound（既存型に合わせて修正）
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

          // ✅ SwitchAnimation（既存型に合わせて修正）
          case 'switchAnimation':
            this.executeSwitchAnimationAction(action, context);
            effectsApplied.push(`アニメーション切り替え: ${action.targetId} → ${action.animationIndex}`);
            break;

          // ✅ Effect（既存型に合わせて修正）
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
            console.warn(`未対応のアクション: ${(action as any).type}`);
        }
      } catch (error) {
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

  // ✅ PlaySound（既存型: loopプロパティなし）
  private executePlaySoundAction(
    action: Extract<GameAction, { type: 'playSound' }>,
    context: RuleExecutionContext
  ): void {
    if (context.audioSystem) {
      const volume = action.volume !== undefined ? action.volume : 1.0;
      
      context.audioSystem.playSound(action.soundId, volume)
        .then(() => {
          console.log(`音声再生成功: ${action.soundId} (volume: ${volume})`);
        })
        .catch((error) => {
          console.error(`音声再生エラー: ${action.soundId}`, error);
        });
    } else {
      console.warn('音声システムが利用できません');
    }
  }

  // ✅ SwitchAnimation（既存型に合わせて修正）
  private executeSwitchAnimationAction(
    action: Extract<GameAction, { type: 'switchAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`SwitchAnimation: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    // 既存型: animationIndex, speed のみ
    targetObj.animationIndex = action.animationIndex;
    targetObj.animationPlaying = true;
    
    if (action.speed !== undefined) {
      // TODO: オブジェクトにspeedプロパティを追加
      console.log(`再生速度: ${action.speed}`);
    }
    
    console.log(`アニメーション切り替え: ${action.targetId} → フレーム${action.animationIndex}`);
  }

  // ✅ Effect（既存型に合わせて修正）
  private executeEffectAction(
    action: Extract<GameAction, { type: 'effect' }>,
    context: RuleExecutionContext
  ): void {
    // 既存型: { type: 'effect'; targetId: string; effect: EffectPattern }
    // EffectPatternの詳細が不明なので、簡易実装
    
    if (context.effectSystem) {
      const effectConfig: EffectConfig = {
        id: `effect_${Date.now()}_${Math.random()}`,
        type: 'particle', // デフォルト
        targetId: action.targetId,
        duration: 1000
      };
      
      context.effectSystem.playEffect(effectConfig);
      console.log(`エフェクト再生: ${action.effect} (target: ${action.targetId})`);
    } else {
      console.log(`[簡易エフェクト] ${action.effect}を${action.targetId}に適用`);
    }
  }

  // Show アクション実装
  private executeShowAction(
    action: Extract<GameAction, { type: 'show' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (targetObj) {
      targetObj.visible = true;
      console.log(`オブジェクト表示: ${action.targetId}`);
    } else {
      console.warn(`Show: オブジェクトが見つかりません: ${action.targetId}`);
    }
  }

  // Hide アクション実装
  private executeHideAction(
    action: Extract<GameAction, { type: 'hide' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (targetObj) {
      targetObj.visible = false;
      console.log(`オブジェクト非表示: ${action.targetId}`);
    } else {
      console.warn(`Hide: オブジェクトが見つかりません: ${action.targetId}`);
    }
  }

  // Move アクション実装（8種類完全実装）
  private executeMoveAction(
    action: Extract<GameAction, { type: 'move' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`Move: オブジェクトが見つかりません: ${action.targetId}`);
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
              targetX = targetObject.x;
              targetY = targetObject.y;
            } else {
              console.warn(`Move: ターゲットオブジェクトが見つかりません: ${movement.target}`);
              return;
            }
          } else {
            targetX = movement.target.x;
            targetY = movement.target.y;
          }
          
          const dx = targetX - targetObj.x;
          const dy = targetY - targetObj.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            targetObj.vx = (dx / distance) * speed;
            targetObj.vy = (dy / distance) * speed;
          }
          
          console.log(`直線移動開始: ${action.targetId} → (${targetX}, ${targetY})`);
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
            targetObj.x = movement.target.x;
            targetObj.y = movement.target.y;
          }
          
          targetObj.vx = 0;
          targetObj.vy = 0;
          
          console.log(`瞬間移動: ${action.targetId} → (${targetObj.x}, ${targetObj.y})`);
        }
        break;

      case 'wander':
        const randomAngle = Math.random() * Math.PI * 2;
        targetObj.vx = Math.cos(randomAngle) * speed;
        targetObj.vy = Math.sin(randomAngle) * speed;
        console.log(`ランダム移動: ${action.targetId}`);
        break;

      case 'stop':
        targetObj.vx = 0;
        targetObj.vy = 0;
        console.log(`停止: ${action.targetId}`);
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
            console.log(`位置交換: ${action.targetId} ↔ ${movement.target}`);
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
          
          console.log(`接近移動: ${action.targetId} → ターゲット`);
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
          
          console.log(`周回移動: ${action.targetId} (角度: ${newAngle.toFixed(2)})`);
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
        
        console.log(`跳ね返り移動: ${action.targetId}`);
        break;

      default:
        console.warn(`未対応の移動タイプ: ${movement.type}`);
    }
  }

  // RandomAction 実装
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
        
        console.log(`RandomAction実行: 選択されたアクション = ${selectedAction.type}`);
      } else {
        console.warn('RandomAction: アクションが選択されませんでした');
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

  // ルール実行制限チェック
  private canExecuteRule(rule: GameRule): boolean {
    if (!rule.executionLimit) return true;
    
    const currentCount = this.executionCounts.get(rule.id) || 0;
    return currentCount < rule.executionLimit.maxCount;
  }

  // ルール有効期間チェック
  private isRuleTimeValid(rule: GameRule, currentTime: number): boolean {
    if (!rule.timeWindow) return true;
    
    return currentTime >= rule.timeWindow.start && 
           currentTime <= rule.timeWindow.end;
  }

  // デバッグ・統計情報
  getDebugInfo(): any {
    return {
      rulesCount: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      flagsCount: this.flags.size,
      executionCounts: Object.fromEntries(this.executionCounts),
      flags: Object.fromEntries(this.flags),
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

  // リセット
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
    
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }
    
    console.log('🔄 RuleEngine リセット完了（型修正版）');
  }

  // カウンターのみリセット
  resetCounters(): void {
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }
    this.counterHistory = [];
    console.log('🔄 カウンターリセット完了');
  }

  // カウンター統計取得
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

// デフォルトエクスポート
export default RuleEngine;