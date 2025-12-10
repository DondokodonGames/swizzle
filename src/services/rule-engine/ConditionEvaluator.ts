// src/services/rule-engine/ConditionEvaluator.ts
// 条件評価システム

import { TriggerCondition } from '../../types/editor/GameScript';
import { RuleExecutionContext, GameObject, AnimationState, RandomState } from './types';
import { FlagManager } from './FlagManager';
import { CounterManager } from './CounterManager';
import { CollisionDetector } from './CollisionDetector';

/**
 * 条件評価クラス
 * 全ての条件タイプ（touch, collision, time, flag, counter等）を評価
 */
export class ConditionEvaluator {
  private consumedTouchEvents: Set<string> = new Set();
  private randomStates: Map<string, RandomState> = new Map();
  private animationStates: Map<string, AnimationState> = new Map();
  private previousGameState?: string;

  constructor(
    private flagManager: FlagManager,
    private counterManager: CounterManager,
    private collisionDetector: CollisionDetector
  ) {
    console.log('🎯 ConditionEvaluator初期化');
  }

  /**
   * 複数条件を評価（AND/OR論理演算）
   * 
   * @param triggers - トリガー条件群
   * @param context - ゲーム実行コンテキスト
   * @param targetObjectId - ターゲットオブジェクトID
   * @returns 評価結果
   */
  evaluateConditions(
    triggers: { operator: 'AND' | 'OR', conditions: TriggerCondition[] },
    context: RuleExecutionContext,
    targetObjectId: string
  ): { shouldExecute: boolean; conditionResults: boolean[]; reason: string } {
    const conditionResults: boolean[] = [];
    let reason = '';

    // 各条件を個別に評価
    for (const condition of triggers.conditions) {
      const result = this.evaluateCondition(condition, context, targetObjectId);
      conditionResults.push(result);
    }

    // 論理演算
    let shouldExecute: boolean;
    if (triggers.operator === 'AND') {
      shouldExecute = conditionResults.every(r => r === true);
      reason = shouldExecute ? 'All conditions met' : 'Some conditions not met';
    } else {
      shouldExecute = conditionResults.some(r => r === true);
      reason = shouldExecute ? 'At least one condition met' : 'No conditions met';
    }

    return {
      shouldExecute,
      conditionResults,
      reason
    };
  }

  /**
   * 条件評価のディスパッチ（メインメソッド）
   */
  evaluateCondition(
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
        result = this.collisionDetector.evaluateCollisionCondition(condition, context, targetObjectId);
        break;
      case 'animation':
        result = this.evaluateAnimationCondition(condition, context);
        break;
      case 'time':
        result = this.evaluateTimeCondition(condition, context);
        break;
      case 'flag':
        result = this.flagManager.evaluateFlagCondition(condition);
        break;
      case 'gameState':
        result = this.evaluateGameStateCondition(condition, context);
        break;
      case 'position':
        result = this.evaluatePositionCondition(condition, context);
        break;
      case 'counter':
        result = this.counterManager.evaluateCounterCondition(condition);
        break;
      case 'random':
        result = this.evaluateRandomCondition(condition, context);
        break;
      default:
        result = false;
    }

    return result;
  }

  /**
   * タッチ条件評価（拡張版）
   */
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
        // down/up処理
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

  /**
   * Drag条件評価
   */
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

  /**
   * Swipe条件評価
   */
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

  /**
   * Flick条件評価
   */
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

  /**
   * Hold条件評価
   */
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

  /**
   * 時間条件評価
   */
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

  /**
   * ゲーム状態条件評価
   */
  private evaluateGameStateCondition(
    condition: Extract<TriggerCondition, { type: 'gameState' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const currentState = context.gameState.isPlaying 
        ? 'playing' 
        : (context.gameState.isPaused ? 'paused' : 'failure');
      
      switch (condition.checkType) {
        case 'is':
          return currentState === condition.state;
          
        case 'not':
          return currentState !== condition.state;
          
        case 'became':
          const previousState = this.previousGameState;
          const changed = previousState !== undefined && previousState !== currentState;
          
          this.previousGameState = currentState;
          
          return changed && currentState === condition.state;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('evaluateGameStateCondition error:', error);
      return false;
    }
  }

  /**
   * 位置条件評価
   */
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
      
      const regionWidth = (region.width ?? 0) * context.canvas.width;
      const regionHeight = (region.height ?? 0) * context.canvas.height;
      
      const inside = objCenterX >= regionX && 
                     objCenterX <= regionX + regionWidth &&
                     objCenterY >= regionY && 
                     objCenterY <= regionY + regionHeight;
      
      return condition.area === 'inside' ? inside : !inside;
    } catch (error) {
      console.error('evaluatePositionCondition error:', error);
      return false;
    }
  }

  /**
   * アニメーション条件評価
   */
  private evaluateAnimationCondition(
    condition: Extract<TriggerCondition, { type: 'animation' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const targetObj = context.objects.get(condition.target);
      
      if (!targetObj) {
        return false;
      }
      
      switch (condition.condition) {
        case 'playing':
          return targetObj.animationPlaying === true;
          
        case 'stopped':
          return targetObj.animationPlaying === false;
          
        case 'frame':
          if (condition.frameNumber === undefined) {
            return false;
          }
          return targetObj.currentFrame === condition.frameNumber;
          
        case 'frameRange':
          if (!condition.frameRange || condition.frameRange.length !== 2) {
            return false;
          }
          const [start, end] = condition.frameRange;
          return targetObj.currentFrame !== undefined &&
                 targetObj.currentFrame >= start && 
                 targetObj.currentFrame <= end;
                 
        case 'loop':
          const state = this.animationStates.get(condition.target);
          if (!state || condition.loopCount === undefined) {
            return false;
          }
          return state.loopCount >= condition.loopCount;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('evaluateAnimationCondition error:', error);
      return false;
    }
  }

  /**
   * ランダム条件評価
   */
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
      const interval = condition.interval || 0;
      
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
      console.error('evaluateRandomCondition error:', error);
      return false;
    }
  }

  /**
   * シード付きランダム
   */
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

  /**
   * 古い消費済みtouchイベントをクリーンアップ
   */
  cleanupConsumedTouchEvents(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    for (const key of this.consumedTouchEvents) {
      const timestamp = parseInt(key.split('-')[0], 10);
      if (now - timestamp > 500) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.consumedTouchEvents.delete(key);
    }
  }

  /**
   * アニメーション状態を更新
   */
  updateAnimationState(objectId: string, state: AnimationState): void {
    this.animationStates.set(objectId, state);
  }

  /**
   * 全データをリセット
   */
  reset(): void {
    this.consumedTouchEvents.clear();
    this.randomStates.clear();
    this.animationStates.clear();
    this.previousGameState = undefined;
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): any {
    return {
      consumedTouchEventsCount: this.consumedTouchEvents.size,
      randomStatesCount: this.randomStates.size,
      animationStatesCount: this.animationStates.size,
      previousGameState: this.previousGameState,
      randomStates: Array.from(this.randomStates.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
  }
}
