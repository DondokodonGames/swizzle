// src/services/rule-engine/RuleEngine.ts
// IF-THENルールエンジン - アイコン中心・直感的ゲームロジック設定（修正版）

import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../types/editor/GameScript';

// ルール実行コンテキスト
export interface RuleExecutionContext {
  // ゲーム状態
  gameState: {
    isPlaying: boolean;
    score: number;
    timeElapsed: number;
    flags: Map<string, boolean>;
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

// アクション実行結果
export interface ActionExecutionResult {
  success: boolean;
  effectsApplied: string[];
  newGameState: Partial<RuleExecutionContext['gameState']>;
  errors: string[];
}

/**
 * IF-THENルールエンジン
 * ビジュアル設定→実際のゲーム動作変換
 */
export class RuleEngine {
  private rules: GameRule[] = [];
  private flags: Map<string, boolean> = new Map();
  private executionCounts: Map<string, number> = new Map();
  
  constructor() {
    console.log('🎮 RuleEngine初期化');
  }

  // ルール追加・管理
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

  // フラグ管理
  setFlag(flagId: string, value: boolean): void {
    this.flags.set(flagId, value);
    console.log(`フラグ設定: ${flagId} = ${value}`);
  }

  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) || false;
  }

  // メインルール評価・実行
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
          const result = this.executeActions(rule.actions, context);
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

  // 条件評価（IF部分）
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

  // 個別条件評価
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
      
      default:
        console.warn(`未対応の条件タイプ: ${(condition as any).type}`);
        return false;
    }
  }

  // 🖱️ タッチ条件評価
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

  // ⏰ 時間条件評価
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

  // 🚩 フラグ条件評価
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

  // アクション実行（THEN部分）
  private executeActions(
    actions: GameAction[], 
    context: RuleExecutionContext
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const newGameState: Partial<RuleExecutionContext['gameState']> = {};

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
      errors
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
      flags: Object.fromEntries(this.flags)
    };
  }

  // リセット
  reset(): void {
    this.executionCounts.clear();
    this.flags.clear();
    console.log('🔄 RuleEngine リセット完了');
  }
}

// デフォルトエクスポート
export default RuleEngine;