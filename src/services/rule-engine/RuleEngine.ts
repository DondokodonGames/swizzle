// src/services/rule-engine/RuleEngine.ts
// IF-THENルールエンジン - Phase 1+2 修正完全適用版
// 修正内容: Show/Hide フェード + Collision/Animation/GameState 完全実装

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
 * RuleEngine クラス - Phase 1+2 完全実装版
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
  
  // GameState条件用の前回状態管理（Phase 2 追加）
  private previousGameState?: { 
    isPlaying: boolean; 
    isPaused: boolean; 
    score: number 
  };
  
  constructor() {
    console.log('🎮 RuleEngine初期化（Phase 1+2 完全実装版）');
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

    console.log(`[RuleEngine] ルール評価開始: ルール数=${this.rules.length}, イベント数=${context.events.length}`);

    // 衝突判定キャッシュを更新（フレームごとに1回）
    const currentTime = Date.now();
    if (currentTime - this.lastCollisionCheckTime > 16) {
      this.updateCollisionCache(context);
      this.lastCollisionCheckTime = currentTime;
    }

    const sortedRules = [...this.rules]
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    console.log(`[RuleEngine] 有効なルール数: ${sortedRules.length}`);

    for (const rule of sortedRules) {
      try {
        console.log(`[RuleEngine] ルール評価中: "${rule.name}" (id=${rule.id}, targetObjectId=${rule.targetObjectId})`);
        console.log(`[RuleEngine] ルール条件数: ${rule.triggers.conditions.length}, アクション数: ${rule.actions.length}`);

        if (!this.canExecuteRule(rule)) {
          console.log(`[RuleEngine] ルール実行回数制限により skip: ${rule.name}`);
          continue;
        }

        if (!this.isRuleTimeValid(rule, context.gameState.timeElapsed)) {
          console.log(`[RuleEngine] ルール時間ウィンドウ外により skip: ${rule.name}`);
          continue;
        }

        const evaluation = this.evaluateRule(rule, context);

        console.log(`[RuleEngine] ルール評価結果: "${rule.name}" shouldExecute=${evaluation.shouldExecute}, matchedConditions=[${evaluation.matchedConditions.join(', ')}]`);

        if (evaluation.shouldExecute) {
          const result = this.executeActions(rule.actions, context, rule.id);
          results.push(result);

          const currentCount = this.executionCounts.get(rule.id) || 0;
          this.executionCounts.set(rule.id, currentCount + 1);

          console.log(`✅ ルール実行成功: ${rule.name} (${currentCount + 1}回目), effectsApplied=[${result.effectsApplied.join(', ')}]`);
        }
      } catch (error) {
        console.error(`❌ ルール実行エラー [${rule.name}]:`, error);
      }
    }

    console.log(`[RuleEngine] ルール評価終了: 実行されたルール数=${results.length}`);
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
    console.log(`[RuleEngine] 条件評価開始: type=${condition.type}, targetObjectId=${targetObjectId}`);

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
        console.warn(`未対応の条件タイプ: ${(condition as any).type}`);
        result = false;
    }

    console.log(`[RuleEngine] 条件評価結果: type=${condition.type}, result=${result}`);
    return result;
  }

  // ✅ Phase 2 修正: Collision条件評価（完全実装版）
  private evaluateCollisionCondition(
    condition: Extract<TriggerCondition, { type: 'collision' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    try {
      // ターゲットIDの解決
      const sourceId = targetObjectId;
      const targetId = condition.target === 'self' ? targetObjectId : 
                       condition.target === 'background' ? 'background' :
                       condition.target === 'stage' ? null : // ステージとの衝突は画面端判定
                       condition.target;
      
      const sourceObj = context.objects.get(sourceId);
      
      if (!sourceObj || !sourceObj.visible) {
        return false;
      }
      
      // ステージとの衝突判定
      if (condition.target === 'stage') {
        let isColliding = false;

        // regionが指定されている場合は範囲との衝突判定
        if (condition.region) {
          const region = condition.region;

          if (region.shape === 'rect') {
            // 矩形範囲との衝突判定（正規化座標→ピクセル座標変換）
            const rectX = region.x * context.canvas.width;
            const rectY = region.y * context.canvas.height;
            const rectWidth = (region.width || 0.4) * context.canvas.width;
            const rectHeight = (region.height || 0.4) * context.canvas.height;

            // オブジェクトと矩形範囲の衝突判定（AABB）
            isColliding = sourceObj.x < rectX + rectWidth &&
                         sourceObj.x + sourceObj.width > rectX &&
                         sourceObj.y < rectY + rectHeight &&
                         sourceObj.y + sourceObj.height > rectY;
          } else if (region.shape === 'circle') {
            // 円形範囲との衝突判定（正規化座標→ピクセル座標変換）
            const centerX = region.x * context.canvas.width;
            const centerY = region.y * context.canvas.height;
            const radius = (region.radius || 0.2) * context.canvas.width;

            // オブジェクトの中心座標
            const objCenterX = sourceObj.x + sourceObj.width / 2;
            const objCenterY = sourceObj.y + sourceObj.height / 2;

            // 中心間の距離
            const distance = Math.sqrt(
              Math.pow(objCenterX - centerX, 2) + Math.pow(objCenterY - centerY, 2)
            );

            // オブジェクトの半径（幅と高さの平均を半径とする）
            const objRadius = (sourceObj.width + sourceObj.height) / 4;

            isColliding = distance < radius + objRadius;
          }
        } else {
          // regionなしの場合は画面端判定
          const margin = 5; // 5pxのマージン
          const hitLeft = sourceObj.x <= margin;
          const hitRight = sourceObj.x + sourceObj.width >= context.canvas.width - margin;
          const hitTop = sourceObj.y <= margin;
          const hitBottom = sourceObj.y + sourceObj.height >= context.canvas.height - margin;

          isColliding = hitLeft || hitRight || hitTop || hitBottom;
        }

        // 前回の衝突状態を取得
        const wasColliding = this.previousCollisions.get(sourceId)?.has('stage') || false;

        // collisionTypeに応じて判定
        switch (condition.collisionType) {
          case 'enter':
            const enterResult = isColliding && !wasColliding;
            if (enterResult) {
              console.log(`🎯 ${condition.region ? 'ステージ範囲' : '画面端'}衝突開始: ${sourceId}`);
            }
            return enterResult;
          case 'stay':
            return isColliding;
          case 'exit':
            const exitResult = !isColliding && wasColliding;
            if (exitResult) {
              console.log(`👋 ${condition.region ? 'ステージ範囲' : '画面端'}衝突終了: ${sourceId}`);
            }
            return exitResult;
          default:
            return false;
        }
      }
      
      // オブジェクト間の衝突判定
      if (!targetId) {
        return false;
      }
      
      const targetObj = targetId === 'background' 
        ? null // 背景との衝突は未実装（必要に応じて実装）
        : context.objects.get(targetId);
      
      if (!targetObj || !targetObj.visible) {
        return false;
      }
      
      // 衝突判定実行
      let isColliding = false;
      
      if (condition.checkMode === 'pixel') {
        // ピクセル単位の詳細判定（未実装 - hitboxにフォールバック）
        console.warn('pixel collision は未実装です。hitbox判定を使用します。');
        isColliding = this.checkAABBCollision(sourceObj, targetObj);
      } else {
        // hitbox判定（AABB）
        isColliding = this.checkAABBCollision(sourceObj, targetObj);
      }
      
      // 衝突状態の履歴管理
      const previousColliding = this.previousCollisions.get(sourceId) || new Set();
      const wasCollidingWithTarget = previousColliding.has(targetId);
      
      // collisionTypeに応じて判定
      switch (condition.collisionType) {
        case 'enter':
          // 新しく衝突を開始した
          const enterResult = isColliding && !wasCollidingWithTarget;
          if (enterResult) {
            console.log(`🎯 衝突開始: ${sourceId} → ${targetId}`);
          }
          return enterResult;
        
        case 'stay':
          // 衝突が継続している
          return isColliding;
        
        case 'exit':
          // 衝突が終了した
          const exitResult = !isColliding && wasCollidingWithTarget;
          if (exitResult) {
            console.log(`👋 衝突終了: ${sourceId} ← ${targetId}`);
          }
          return exitResult;
        
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

  // ✅ Phase 2 修正: Animation条件評価（完全実装版）
  private evaluateAnimationCondition(
    condition: Extract<TriggerCondition, { type: 'animation' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const targetObj = context.objects.get(condition.target);
      
      if (!targetObj) {
        console.warn(`Animation: オブジェクトが見つかりません: ${condition.target}`);
        return false;
      }
      
      // アニメーション状態の取得・初期化
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
      
      // フレーム変化の検出
      if (currentFrame !== animState.lastFrame) {
        animState.frameChangeTime = Date.now();
        
        // ループ検出（最後のフレームから最初のフレームへ）
        if (animState.lastFrame === frameCount - 1 && currentFrame === 0) {
          animState.loopCount++;
          console.log(`🔄 アニメーションループ: ${condition.target} (${animState.loopCount}回目)`);
        }
        
        animState.lastFrame = currentFrame;
      }
      
      // condition: 'start' | 'end' | 'frame' | 'loop'
      switch (condition.condition) {
        case 'frame':
          // 特定フレーム到達
          if (condition.frameNumber !== undefined) {
            const result = currentFrame === condition.frameNumber;
            if (result) {
              console.log(`🎞️ フレーム到達: ${condition.target} frame=${currentFrame}`);
            }
            return result;
          }
          // animationIndexを使用する場合
          if (condition.animationIndex !== undefined) {
            return currentFrame === condition.animationIndex;
          }
          return false;
        
        case 'start':
          // アニメーション開始（フレーム0 かつ 再生中）
          const isStarting = targetObj.animationPlaying && currentFrame === 0;
          if (isStarting && animState.lastFrame !== 0) {
            console.log(`▶️ アニメーション開始: ${condition.target}`);
          }
          return isStarting;
        
        case 'end':
          // アニメーション終了（最終フレーム到達）
          const isEnding = currentFrame === frameCount - 1;
          if (isEnding && animState.lastFrame !== frameCount - 1) {
            console.log(`⏹️ アニメーション終了: ${condition.target} (frame ${currentFrame}/${frameCount})`);
          }
          return isEnding;
        
        case 'loop':
          // ループ完了（1回以上のループ）
          const hasLooped = animState.loopCount > 0;
          if (hasLooped && animState.loopCount === 1) {
            console.log(`🔁 アニメーションループ完了: ${condition.target}`);
          }
          return hasLooped;
        
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

  // ✅ Phase 2 修正: GameState条件評価（完全実装版）
  private evaluateGameStateCondition(
    condition: Extract<TriggerCondition, { type: 'gameState' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const { gameState } = context;
      
      // 前回のゲーム状態を記録（became判定用）
      let previousState = this.previousGameState || {
        isPlaying: false,
        isPaused: false,
        score: 0
      };
      
      // 現在の状態を保存
      this.previousGameState = {
        isPlaying: gameState.isPlaying,
        isPaused: gameState.isPaused,
        score: gameState.score
      };
      
      // 状態判定のヘルパー関数
      const isState = (stateName: string): boolean => {
        switch (stateName) {
          case 'playing':
            return gameState.isPlaying && !gameState.isPaused;
          
          case 'paused':
            return gameState.isPaused;
          
          case 'success':
            // 成功状態の定義:
            // - ゲーム終了（isPlaying = false）
            // - スコアが存在する（score > 0）
            // - ゲーム時間が経過している（timeElapsed > 0）
            return !gameState.isPlaying && 
                   gameState.score > 0 && 
                   gameState.timeElapsed > 0;
          
          case 'failure':
            // 失敗状態の定義:
            // - ゲーム終了（isPlaying = false）
            // - スコアが0またはマイナス
            // - ゲーム時間が経過している（timeElapsed > 0）
            return !gameState.isPlaying && 
                   gameState.score <= 0 && 
                   gameState.timeElapsed > 0;
          
          default:
            console.warn(`未知のゲーム状態: ${stateName}`);
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
            return false; // 前回成功は一時的な状態なので常にfalse
          case 'failure':
            return false; // 前回失敗は一時的な状態なので常にfalse
          default:
            return false;
        }
      };
      
      // checkType: 'is' | 'not' | 'became'
      const checkType = (condition as any).checkType || 'is'; // デフォルトは'is'
      
      switch (checkType) {
        case 'is':
          // 現在の状態が指定状態
          const isResult = isState(condition.state);
          if (isResult && condition.state === 'success') {
            console.log('🎉 ゲーム成功状態');
          } else if (isResult && condition.state === 'failure') {
            console.log('😢 ゲーム失敗状態');
          }
          return isResult;
        
        case 'not':
          // 現在の状態が指定状態でない
          return !isState(condition.state);
        
        case 'became':
          // 状態が変化した（前回は違う状態で、今回は指定状態）
          const becameResult = !wasState(condition.state) && isState(condition.state);
          if (becameResult) {
            console.log(`🔄 状態変化: → ${condition.state}`);
          }
          return becameResult;
        
        default:
          console.warn(`未対応のチェックタイプ: ${checkType}`);
          return isState(condition.state);
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

    console.log(`[RuleEngine] タッチ条件評価: targetObjectId=${targetObjectId}, condition.target=${condition.target}, touchEvents=${touchEvents.length}`);
    if (touchEvents.length > 0) {
      console.log(`[RuleEngine] タッチイベント詳細:`, touchEvents.map(e => ({ target: e.data.target, x: e.data.x, y: e.data.y })));
    }

    if (!touchEvents.length) return false;

    const latestTouch = touchEvents[touchEvents.length - 1];
    const touchTarget = condition.target === 'self' ? targetObjectId : condition.target;

    console.log(`[RuleEngine] タッチターゲット判定: touchTarget=${touchTarget}, latestTouch.data.target=${latestTouch.data.target}`);

    // ✅ 修正: イベントのターゲットが条件のターゲットと一致するかチェック
    if (touchTarget === 'stage') {
      // ステージタッチの場合
      if (latestTouch.data.target !== 'stage') {
        console.log(`[RuleEngine] タッチターゲット不一致: ステージではなく ${latestTouch.data.target} がタッチされた`);
        return false;
      }

      // ステージタッチかつregionが指定されている場合、範囲内チェック
      if (condition.region) {
        const { x: touchX, y: touchY } = latestTouch.data;
        const region = condition.region;

        if (region.shape === 'rect') {
          // 矩形範囲チェック（正規化座標→ピクセル座標変換）
          const rectX = region.x * context.canvas.width;
          const rectY = region.y * context.canvas.height;
          const rectWidth = (region.width || 0.4) * context.canvas.width;
          const rectHeight = (region.height || 0.4) * context.canvas.height;

          const inRange = touchX >= rectX && touchX <= rectX + rectWidth &&
                          touchY >= rectY && touchY <= rectY + rectHeight;
          console.log(`[RuleEngine] ステージ範囲判定（矩形）: inRange=${inRange}`);
          return inRange;
        } else if (region.shape === 'circle') {
          // 円形範囲チェック（正規化座標→ピクセル座標変換）
          const centerX = region.x * context.canvas.width;
          const centerY = region.y * context.canvas.height;
          const radius = (region.radius || 0.2) * context.canvas.width;

          const distance = Math.sqrt(
            Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2)
          );

          const inRange = distance <= radius;
          console.log(`[RuleEngine] ステージ範囲判定（円形）: inRange=${inRange}`);
          return inRange;
        }
      }

      // regionなしの場合はステージ全体へのタッチ
      console.log(`[RuleEngine] ステージタッチ成功（範囲指定なし）`);
      return true;
    }

    // ✅ 修正: オブジェクトタッチの場合、ターゲット IDが一致するかチェック
    const isTargetMatch = latestTouch.data.target === touchTarget;
    console.log(`[RuleEngine] オブジェクトタッチ判定: isTargetMatch=${isTargetMatch} (${latestTouch.data.target} === ${touchTarget})`);
    return isTargetMatch;
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

    console.log(`[RuleEngine] アクション実行開始: アクション数=${actions.length}`);

    for (const action of actions) {
      try {
        console.log(`[RuleEngine] アクション実行: type=${action.type}`);

        switch (action.type) {
          case 'addScore':
            newGameState.score = (context.gameState.score || 0) + action.points;
            effectsApplied.push(`スコア+${action.points}`);
            break;

          case 'success':
            newGameState.score = (context.gameState.score || 0) + (action.score || 0);
            newGameState.isPlaying = false; // ✅ ゲーム終了
            effectsApplied.push('ゲーム成功');
            console.log('🎉 ゲームクリア！');
            break;

          case 'failure':
            newGameState.isPlaying = false; // ✅ ゲーム終了
            effectsApplied.push('ゲーム失敗');
            console.log('💀 ゲームオーバー');
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

  // PlaySound
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

  // SwitchAnimation
  private executeSwitchAnimationAction(
    action: Extract<GameAction, { type: 'switchAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`SwitchAnimation: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    targetObj.animationIndex = action.animationIndex;
    targetObj.animationPlaying = true;
    
    if (action.speed !== undefined) {
      console.log(`再生速度: ${action.speed}`);
    }
    
    console.log(`アニメーション切り替え: ${action.targetId} → フレーム${action.animationIndex}`);
  }

  // Effect
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
        // 元のスケールを保存（初回のみ）
        if (targetObj.baseScale === undefined) {
          targetObj.baseScale = targetObj.scale;
        }

        // スケールエフェクトを適用
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
        console.log(`[未実装エフェクト] ${effect.type}を${action.targetId}に適用`);
        break;

      default:
        console.warn(`未知のエフェクトタイプ: ${(effect as any).type}`);
    }
  }

  // ✅ Phase 1 修正: Show アクション（フェードイン対応）
  private executeShowAction(
    action: Extract<GameAction, { type: 'show' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`Show: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    targetObj.visible = true;
    
    // fadeIn アニメーション対応
    const fadeIn = (action as any).fadeIn;
    const duration = (action as any).duration || 300; // デフォルト300ms
    
    if (fadeIn && duration > 0) {
      // フェードイン処理
      const startTime = Date.now();
      const startScale = targetObj.scale || 0;
      const targetScale = 1;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // イージング関数（ease-out）
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // スケールで透明度を表現
        targetObj.scale = startScale + eased * (targetScale - startScale);
        
        if (progress >= 1) {
          targetObj.scale = targetScale;
          console.log(`✨ フェードイン完了: ${action.targetId} (${duration}ms)`);
        } else {
          // 次のフレームで継続
          setTimeout(animate, 16); // 60fps
        }
      };
      
      animate();
      console.log(`🎬 フェードイン開始: ${action.targetId} (${duration}ms)`);
    } else {
      // 即座に表示
      targetObj.scale = 1;
      console.log(`👁️ オブジェクト表示: ${action.targetId}`);
    }
  }

  // ✅ Phase 1 修正: Hide アクション（フェードアウト対応）
  private executeHideAction(
    action: Extract<GameAction, { type: 'hide' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      console.warn(`Hide: オブジェクトが見つかりません: ${action.targetId}`);
      return;
    }

    // fadeOut アニメーション対応
    const fadeOut = (action as any).fadeOut;
    const duration = (action as any).duration || 300; // デフォルト300ms
    
    if (fadeOut && duration > 0) {
      // フェードアウト処理
      const startTime = Date.now();
      const startScale = targetObj.scale || 1;
      const targetScale = 0;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // イージング関数（ease-in）
        const eased = Math.pow(progress, 3);
        
        // スケールで透明度を表現
        targetObj.scale = startScale - eased * (startScale - targetScale);
        
        if (progress >= 1) {
          targetObj.visible = false;
          targetObj.scale = 0;
          console.log(`💨 フェードアウト完了: ${action.targetId} (${duration}ms)`);
        } else {
          // 次のフレームで継続
          setTimeout(animate, 16); // 60fps
        }
      };
      
      animate();
      console.log(`🎬 フェードアウト開始: ${action.targetId} (${duration}ms)`);
    } else {
      // 即座に非表示
      targetObj.visible = false;
      targetObj.scale = 0;
      console.log(`🙈 オブジェクト非表示: ${action.targetId}`);
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
            // ✅ 正規化座標（0-1）→ピクセル座標に変換
            targetX = movement.target.x * context.canvas.width;
            targetY = movement.target.y * context.canvas.height;
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
            // ✅ 正規化座標（0-1）→ピクセル座標に変換
            targetObj.x = movement.target.x * context.canvas.width;
            targetObj.y = movement.target.y * context.canvas.height;
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
    this.previousGameState = undefined;
    
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }
    
    console.log('🔄 RuleEngine リセット完了（Phase 1+2 完全実装版）');
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