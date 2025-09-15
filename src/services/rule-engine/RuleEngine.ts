// src/services/rule-engine/RuleEngine.ts
// IF-THENルールエンジン - アイコン中心・直感的ゲームロジック設定（カウンター機能拡張版）

import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../types/editor/GameScript';

// 🔢 新規追加: カウンター型インポート
import { 
  GameCounter, 
  CounterOperation, 
  CounterComparison,
  CounterChangeEvent,
  clampCounterValue,
  compareCounterValue
} from '../../types/counterTypes';

// ルール実行コンテキスト（カウンター対応）
export interface RuleExecutionContext {
  // ゲーム状態
  gameState: {
    isPlaying: boolean;
    score: number;
    timeElapsed: number;
    flags: Map<string, boolean>;
    
    // 🔢 新規追加: カウンター状態
    counters: Map<string, number>;
  };
  
  // オブジェクト状態  
  objects: Map<string, {
    id: string;
    x: number;
    y: number;
    visible: boolean;
    animationIndex: number;
    scale: number;
    rotation: number;
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
}

// ルール評価結果
export interface RuleEvaluationResult {
  shouldExecute: boolean;
  matchedConditions: string[];
  executionPriority: number;
  debugInfo?: string;
}

// 🔧 拡張: ActionExecutionResult にカウンター変更情報を追加
export interface ActionExecutionResult {
  success: boolean;
  effectsApplied: string[];
  newGameState: Partial<RuleExecutionContext['gameState']>;
  errors: string[];
  
  // 🔢 新規追加: カウンター変更イベント
  counterChanges: CounterChangeEvent[];
}

/**
 * 🔧 拡張: RuleEngine クラスにカウンター管理機能を追加
 */
export class RuleEngine {
  private rules: GameRule[] = [];
  private flags: Map<string, boolean> = new Map();
  private executionCounts: Map<string, number> = new Map();
  
  // 🔢 新規追加: カウンター管理
  private counters: Map<string, number> = new Map();
  private counterDefinitions: Map<string, GameCounter> = new Map();
  private counterHistory: CounterChangeEvent[] = [];
  private counterPreviousValues: Map<string, number> = new Map();
  
  constructor() {
    console.log('🎮 RuleEngine初期化（カウンター機能付き）');
  }

  // 🔢 新規追加: カウンター管理メソッド

  /**
   * カウンター定義を追加
   */
  addCounterDefinition(counter: GameCounter): void {
    this.counterDefinitions.set(counter.name, counter);
    this.setCounter(counter.name, counter.initialValue);
    console.log(`カウンター定義追加: ${counter.name} = ${counter.initialValue}`);
  }

  /**
   * カウンター定義を削除
   */
  removeCounterDefinition(counterName: string): void {
    this.counterDefinitions.delete(counterName);
    this.counters.delete(counterName);
    this.counterPreviousValues.delete(counterName);
    console.log(`カウンター定義削除: ${counterName}`);
  }

  /**
   * カウンター値を設定（フラグと同様のグローバル共有）
   */
  setCounter(counterName: string, value: number): void {
    const oldValue = this.counters.get(counterName) || 0;
    const counterDef = this.counterDefinitions.get(counterName);
    
    // 範囲制限適用
    const clampedValue = counterDef ? clampCounterValue(value, counterDef) : value;
    
    // 前回値を記録
    this.counterPreviousValues.set(counterName, oldValue);
    
    // 新しい値を設定
    this.counters.set(counterName, clampedValue);
    
    // 変更イベントを記録
    if (oldValue !== clampedValue) {
      const changeEvent: CounterChangeEvent = {
        counterName,
        oldValue,
        newValue: clampedValue,
        operation: 'set',
        timestamp: Date.now()
      };
      this.counterHistory.push(changeEvent);
      
      // 履歴サイズ制限（最新100件）
      if (this.counterHistory.length > 100) {
        this.counterHistory.shift();
      }
    }
    
    console.log(`カウンター設定: ${counterName} = ${clampedValue} (前回値: ${oldValue})`);
  }

  /**
   * カウンター値を取得
   */
  getCounter(counterName: string): number {
    return this.counters.get(counterName) || 0;
  }

  /**
   * カウンター前回値を取得
   */
  getCounterPreviousValue(counterName: string): number {
    return this.counterPreviousValues.get(counterName) || 0;
  }

  /**
   * カウンター操作を実行
   */
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
    
    // 値を設定
    this.setCounter(counterName, newValue);
    
    // 変更イベントを作成
    const changeEvent: CounterChangeEvent = {
      counterName,
      oldValue: currentValue,
      newValue: this.getCounter(counterName), // 範囲制限適用後の値
      operation,
      timestamp: Date.now(),
      triggeredBy: ruleId
    };
    
    console.log(`カウンター操作実行: ${counterName} ${operation} ${value || ''} (${currentValue} → ${changeEvent.newValue})`);
    
    return changeEvent;
  }

  /**
   * カウンター変更履歴を取得
   */
  getCounterHistory(counterName?: string): CounterChangeEvent[] {
    if (counterName) {
      return this.counterHistory.filter(event => event.counterName === counterName);
    }
    return [...this.counterHistory];
  }

  // ルール追加・管理（既存機能保護）
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

  // フラグ管理（既存機能保護）
  setFlag(flagId: string, value: boolean): void {
    this.flags.set(flagId, value);
    console.log(`フラグ設定: ${flagId} = ${value}`);
  }

  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) || false;
  }

  // 🔧 拡張: メインルール評価・実行（カウンター対応）
  evaluateAndExecuteRules(context: RuleExecutionContext): ActionExecutionResult[] {
    const results: ActionExecutionResult[] = [];
    
    // 優先度順でルールソート
    const sortedRules = [...this.rules]
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        // 実行回数制限チェック
        if (!this.canExecuteRule(rule)) {
          continue;
        }

        // 有効期間チェック
        if (!this.isRuleTimeValid(rule, context.gameState.timeElapsed)) {
          continue;
        }

        // 条件評価
        const evaluation = this.evaluateRule(rule, context);
        
        if (evaluation.shouldExecute) {
          // アクション実行
          const result = this.executeActions(rule.actions, context, rule.id);
          results.push(result);
          
          // 実行回数カウント
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

  // 🔧 拡張: 条件評価（カウンター条件追加）
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

    // AND/OR判定
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

  // 🔧 拡張: 個別条件評価（カウンター条件追加）
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
      
      // 🔢 新規追加: カウンター条件評価
      case 'counter':
        return this.evaluateCounterCondition(condition, context);
      
      default:
        console.warn(`未対応の条件タイプ: ${(condition as any).type}`);
        return false;
    }
  }

  // 🔢 新規追加: カウンター条件評価
  private evaluateCounterCondition(
    condition: Extract<TriggerCondition, { type: 'counter' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const currentValue = this.getCounter(condition.counterName);
      const previousValue = this.getCounterPreviousValue(condition.counterName);
      
      // 変更検知の場合は前回値との比較
      if (condition.comparison === 'changed') {
        return currentValue !== previousValue;
      }
      
      // その他の比較演算
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

  // 🖱️ タッチ条件評価（既存機能保護）
  private evaluateTouchCondition(
    condition: Extract<TriggerCondition, { type: 'touch' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    const touchEvents = context.events.filter(e => e.type === 'touch');
    
    if (!touchEvents.length) return false;
    
    const latestTouch = touchEvents[touchEvents.length - 1];
    const touchTarget = condition.target === 'self' ? targetObjectId : condition.target;
    
    // ターゲットオブジェクト取得
    if (touchTarget === 'stage') {
      return latestTouch.data.target === 'stage';
    }
    
    const targetObj = context.objects.get(touchTarget);
    if (!targetObj) return false;
    
    // タッチ座標とオブジェクト位置の判定
    const { x: touchX, y: touchY } = latestTouch.data;
    const objBounds = {
      left: targetObj.x,
      right: targetObj.x + 100, // デフォルトサイズ
      top: targetObj.y,
      bottom: targetObj.y + 100
    };
    
    return touchX >= objBounds.left && touchX <= objBounds.right &&
           touchY >= objBounds.top && touchY <= objBounds.bottom;
  }

  // ⏰ 時間条件評価（既存機能保護）
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

  // 🚩 フラグ条件評価（既存機能保護）
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
        // 変更検知は別途実装が必要
        return false;
      default:
        return false;
    }
  }

  // 🔧 修正：衝突条件評価（正しい引数シグネチャ）
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
      
      // 基本的な衝突判定（矩形ベース）
      // 実際の実装では、checkModeに応じてhitboxまたはpixel判定を行う
      console.log(`衝突条件評価: ${targetId} - ${condition.collisionType}`);
      
      // 暫定実装：常にfalseを返す（詳細実装は後で）
      return false;
    } catch (error) {
      console.error('衝突条件評価エラー:', error);
      return false;
    }
  }

  // 🔧 修正：アニメーション条件評価（正しい引数シグネチャ）
  private evaluateAnimationCondition(
    condition: Extract<TriggerCondition, { type: 'animation' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const targetObj = context.objects.get(condition.target);
      
      if (!targetObj) {
        return false;
      }
      
      // アニメーション状態チェック
      switch (condition.condition) {
        case 'end':
          // アニメーション終了の判定（暫定実装）
          console.log(`アニメーション終了チェック: ${condition.target}`);
          return false;
          
        case 'start':
          // アニメーション開始の判定
          return false;
          
        case 'frame':
          // 特定フレーム到達の判定
          if (condition.frameNumber !== undefined) {
            return targetObj.animationIndex === condition.frameNumber;
          }
          return false;
          
        case 'loop':
          // ループ完了の判定
          return false;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('アニメーション条件評価エラー:', error);
      return false;
    }
  }

  // 🔧 修正：ゲーム状態条件評価（正しい引数シグネチャ）
  private evaluateGameStateCondition(
    condition: Extract<TriggerCondition, { type: 'gameState' }>,
    context: RuleExecutionContext
  ): boolean {
    try {
      const { gameState } = context;
      
      // ゲーム状態のチェック
      switch (condition.state) {
        case 'playing':
          return condition.checkType === 'is' ? gameState.isPlaying : !gameState.isPlaying;
          
        case 'success':
          // 成功状態の判定（カスタム実装が必要）
          console.log('ゲーム成功状態チェック');
          return false;
          
        case 'failure':
          // 失敗状態の判定（カスタム実装が必要）
          console.log('ゲーム失敗状態チェック');
          return false;
          
        case 'paused':
          // 一時停止状態の判定
          return !gameState.isPlaying;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('ゲーム状態条件評価エラー:', error);
      return false;
    }
  }

  // 🔧 修正：位置条件評価（正しい引数シグネチャ）
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
      
      // 矩形領域での位置判定
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
          case 'crossing':
            // 境界を跨いでいるかの判定（詳細実装が必要）
            return false;
          default:
            return false;
        }
      }
      
      // 円形領域での位置判定
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
          case 'crossing':
            // 境界を跨いでいるかの判定
            return Math.abs(distance - region.radius) < 5; // 5px以内
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

  // 🔧 拡張: アクション実行（カウンターアクション追加）
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
            // ゲーム成功処理
            effectsApplied.push('ゲーム成功');
            break;

          case 'failure':
            // ゲーム失敗処理
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
            // 音声再生（後で実装）
            effectsApplied.push(`音声再生: ${action.soundId}`);
            break;

          case 'showMessage':
            // メッセージ表示（後で実装）
            effectsApplied.push(`メッセージ: ${action.text}`);
            break;

          // 🔢 新規追加: カウンターアクション実行
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
              
              // 通知設定がある場合
              if (action.notification?.enabled) {
                effectsApplied.push(`通知: ${action.notification.message || `${action.counterName}が変更されました`}`);
              }
            } else {
              errors.push(`カウンター操作失敗: ${action.counterName} ${action.operation}`);
            }
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

  // ルール実行制限チェック（既存機能保護）
  private canExecuteRule(rule: GameRule): boolean {
    if (!rule.executionLimit) return true;
    
    const currentCount = this.executionCounts.get(rule.id) || 0;
    return currentCount < rule.executionLimit.maxCount;
  }

  // ルール有効期間チェック（既存機能保護）
  private isRuleTimeValid(rule: GameRule, currentTime: number): boolean {
    if (!rule.timeWindow) return true;
    
    return currentTime >= rule.timeWindow.start && 
           currentTime <= rule.timeWindow.end;
  }

  // 🔧 拡張: デバッグ・統計情報（カウンター情報追加）
  getDebugInfo(): any {
    return {
      rulesCount: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      flagsCount: this.flags.size,
      executionCounts: Object.fromEntries(this.executionCounts),
      flags: Object.fromEntries(this.flags),
      
      // 🔢 新規追加: カウンター情報
      countersCount: this.counters.size,
      counterDefinitionsCount: this.counterDefinitions.size,
      counters: Object.fromEntries(this.counters),
      counterHistorySize: this.counterHistory.length,
      recentCounterChanges: this.counterHistory.slice(-10) // 最新10件
    };
  }

  // 🔧 拡張: リセット（カウンター情報追加）
  reset(): void {
    this.executionCounts.clear();
    this.flags.clear();
    
    // 🔢 新規追加: カウンターリセット
    this.counters.clear();
    this.counterHistory = [];
    this.counterPreviousValues.clear();
    
    // カウンター定義から初期値を復元
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }
    
    console.log('🔄 RuleEngine リセット完了（カウンター情報含む）');
  }

  // 🔢 新規追加: カウンターのみリセット
  resetCounters(): void {
    for (const [name, definition] of this.counterDefinitions) {
      this.setCounter(name, definition.initialValue);
    }
    this.counterHistory = [];
    console.log('🔄 カウンターリセット完了');
  }

  // 🔢 新規追加: カウンター統計取得
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