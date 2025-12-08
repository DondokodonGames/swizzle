// src/services/rule-engine/RuleEngine.ts
// ルールエンジン - 全モジュールを統括、公開API提供

import { GameRule, TriggerCondition, GameAction, GameFlag, PhysicsProperties } from '../../types/editor/GameScript';
import { GameCounter, CounterChangeEvent } from '../../types/counterTypes';
import { 
  RuleExecutionContext, 
  GameObject, 
  RuleEvaluationResult, 
  ActionExecutionResult 
} from './types';

// 外部モジュールで使用するために型をre-export
export type { RuleExecutionContext, ActionExecutionResult } from './types';

// 各マネージャーのインポート
import { FlagManager } from './FlagManager';
import { CounterManager } from './CounterManager';
import { CollisionDetector } from './CollisionDetector';
import { ConditionEvaluator } from './ConditionEvaluator';
import { EffectManager } from './EffectManager';
import { PhysicsManager } from './PhysicsManager';
import { AnimationManager } from './AnimationManager';
import { ActionExecutor } from './ActionExecutor';

/**
 * RuleEngine クラス
 * 
 * 役割:
 * - 全マネージャーの統括・初期化
 * - 公開APIの提供（addRule, evaluateRules, etc.）
 * - ルール評価・実行のオーケストレーション
 * - フレーム更新処理の統括
 */
export class RuleEngine {
  // ルールリスト
  private rules: GameRule[] = [];
  
  // ルール実行回数追跡
  private ruleExecutionCounts: Map<string, number> = new Map();

  // 各種マネージャー
  private flagManager: FlagManager;
  private counterManager: CounterManager;
  private collisionDetector: CollisionDetector;
  private conditionEvaluator: ConditionEvaluator;
  private effectManager: EffectManager;
  private physicsManager: PhysicsManager;
  private animationManager: AnimationManager;
  private actionExecutor: ActionExecutor;

  constructor() {
    console.log('🎮 RuleEngine初期化開始');
    
    // マネージャーを順次初期化
    this.flagManager = new FlagManager();
    this.counterManager = new CounterManager();
    this.collisionDetector = new CollisionDetector();
    
    this.conditionEvaluator = new ConditionEvaluator(
      this.flagManager,
      this.counterManager,
      this.collisionDetector
    );
    
    this.effectManager = new EffectManager();
    this.physicsManager = new PhysicsManager();
    this.animationManager = new AnimationManager();
    
    this.actionExecutor = new ActionExecutor(
      this.effectManager,
      this.counterManager,
      this.flagManager
    );
    
    console.log('✅ RuleEngine初期化完了');
  }

  // ==================== ルール管理 ====================

  /**
   * ルールを追加
   * 
   * @param rule - 追加するルール
   */
  addRule(rule: GameRule): void {
    if (!rule.enabled) {
      return;
    }
    
    this.rules.push(rule);
    this.rules.sort((a, b) => (a.priority || 50) - (b.priority || 50));
    
    console.log(`📝 ルール追加: ${rule.name} (優先度: ${rule.priority || 50})`);
  }

  /**
   * 全ルールをクリア
   */
  clearRules(): void {
    this.rules = [];
    console.log('🗑️ 全ルールクリア');
  }

  /**
   * ルール数を取得
   */
  getRuleCount(): number {
    return this.rules.length;
  }

  // ==================== ルール評価・実行 ====================

  /**
   * 全ルールを評価（実行はしない）
   * 
   * @param context - ゲーム実行コンテキスト
   * @returns ルール評価結果の配列
   */
  evaluateRules(context: RuleExecutionContext): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    
    for (const rule of this.rules) {
      if (!this.canExecuteRule(rule, context)) {
        continue;
      }
      
      const evaluation = this.conditionEvaluator.evaluateConditions(
        rule.triggers,
        context,
        rule.targetObjectId
      );
      
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        shouldExecute: evaluation.shouldExecute,
        conditionResults: evaluation.conditionResults,
        reason: evaluation.reason
      });
    }
    
    return results;
  }

  /**
   * 全ルールを評価して実行
   * 
   * @param context - ゲーム実行コンテキスト
   * @returns アクション実行結果の配列
   */
  evaluateAndExecuteRules(context: RuleExecutionContext): ActionExecutionResult[] {
    const results: ActionExecutionResult[] = [];
    
    for (const rule of this.rules) {
      // ルール実行可否チェック
      if (!this.canExecuteRule(rule, context)) {
        continue;
      }
      
      // 条件評価
      const evaluation = this.conditionEvaluator.evaluateConditions(
        rule.triggers,
        context,
        rule.targetObjectId
      );
      
      // 条件が満たされていればアクション実行
      if (evaluation.shouldExecute) {
        const result = this.actionExecutor.executeActions(
          rule,
          context,
          this.ruleExecutionCounts
        );
        
        // コンテキストの状態を更新
        if (result.newGameState) {
          Object.assign(context.gameState, result.newGameState);
        }
        
        results.push(result);
        
        console.log(
          `✅ ルール実行: ${rule.name} ` +
          `(優先度: ${rule.priority || 50}, ` +
          `エフェクト数: ${result.effectsApplied.length})`
        );
      }
    }
    
    return results;
  }

  /**
   * ルールが実行可能かチェック
   * 
   * @param rule - チェック対象のルール
   * @param context - ゲーム実行コンテキスト
   * @returns 実行可能ならtrue
   */
  private canExecuteRule(rule: GameRule, context: RuleExecutionContext): boolean {
    // 無効化されているルールはスキップ
    if (!rule.enabled) {
      return false;
    }
    
    // 時間条件のチェック
    if (!this.isRuleTimeValid(rule, context)) {
      return false;
    }
    
    return true;
  }

  /**
   * ルールの時間条件が有効かチェック
   * 
   * @param rule - チェック対象のルール
   * @param context - ゲーム実行コンテキスト
   * @returns 時間条件を満たしていればtrue
   */
  private isRuleTimeValid(rule: GameRule, context: RuleExecutionContext): boolean {
    if (rule.timeWindow) {
      const gameTime = context.gameState.timeElapsed || 0;
      
      if (rule.timeWindow.start !== undefined && gameTime < rule.timeWindow.start) {
        return false;
      }
      
      if (rule.timeWindow.end !== undefined && gameTime > rule.timeWindow.end) {
        return false;
      }
    }
    
    return true;
  }

  // ==================== フレーム更新 ====================

  /**
   * フレーム更新 - 全マネージャーの更新処理を呼び出し
   * 
   * @param context - ゲーム実行コンテキスト
   * @param deltaTime - 前フレームからの経過時間（秒）
   */
  update(context: RuleExecutionContext, deltaTime: number): void {
    // 物理演算の更新
    this.physicsManager.updatePhysics(context, deltaTime);
    
    // アニメーションの更新
    this.animationManager.updateAnimations(context, deltaTime);
    
    // エフェクトの更新
    this.effectManager.updateEffects(context);
    
    // 衝突キャッシュの更新
    this.collisionDetector.updateCollisionCache();
    
    // フラグの前回値を更新
    this.flagManager.updatePreviousFlags();
  }

  /**
   * 物理演算の更新（個別呼び出し用）
   */
  updatePhysics(context: RuleExecutionContext, deltaTime: number): void {
    this.physicsManager.updatePhysics(context, deltaTime);
  }

  /**
   * エフェクトの更新（個別呼び出し用）
   */
  updateEffects(context: RuleExecutionContext): void {
    this.effectManager.updateEffects(context);
  }

  /**
   * アニメーションの更新（個別呼び出し用）
   */
  updateAnimations(context: RuleExecutionContext, currentTime: number): void {
    this.animationManager.updateAnimations(context, currentTime);
  }

  // ==================== フラグ管理（デリゲート） ====================

  addFlagDefinition(flag: GameFlag): void {
    this.flagManager.addFlagDefinition(flag.id, flag.initialValue !== undefined ? flag.initialValue : false);
  }

  getFlag(flagId: string): boolean {
    return this.flagManager.getFlag(flagId);
  }

  setFlag(flagId: string, value: boolean): void {
    this.flagManager.setFlag(flagId, value);
  }

  toggleFlag(flagId: string): void {
    this.flagManager.toggleFlag(flagId);
  }

  // ==================== カウンター管理（デリゲート） ====================

  addCounterDefinition(counter: GameCounter): void {
    this.counterManager.addCounterDefinition(counter);
  }

  getCounter(counterName: string): number {
    return this.counterManager.getCounter(counterName);
  }

  setCounter(counterName: string, value: number): void {
    this.counterManager.setCounter(counterName, value);
  }

  incrementCounter(counterName: string): void {
    this.counterManager.incrementCounter(counterName);
  }

  decrementCounter(counterName: string): void {
    this.counterManager.decrementCounter(counterName);
  }

  resetCounter(counterName: string): void {
    this.counterManager.resetCounter(counterName);
  }

  getCounterPreviousValue(counterName: string): number | undefined {
    return this.counterManager.getCounterPreviousValue(counterName);
  }

  // ==================== リセット ====================

  /**
   * 全状態をリセット
   */
  reset(): void {
    console.log('🔄 RuleEngine リセット開始');
    
    // 各マネージャーのリセット
    this.flagManager.reset();
    this.counterManager.reset();
    this.collisionDetector.reset();
    this.conditionEvaluator.reset();
    this.physicsManager.reset();
    this.animationManager.reset();
    this.actionExecutor.reset();
    
    // ルール実行回数のリセット
    this.ruleExecutionCounts.clear();
    
    console.log('✅ RuleEngine リセット完了');
  }

  // ==================== デバッグ ====================

  /**
   * デバッグ情報取得
   * 
   * @returns デバッグ情報オブジェクト
   */
  getDebugInfo(): any {
    return {
      engineType: 'RuleEngine',
      ruleCount: this.rules.length,
      rules: this.rules.map(r => ({
        id: r.id,
        name: r.name,
        priority: r.priority || 50,
        enabled: r.enabled,
        executionCount: this.ruleExecutionCounts.get(r.id) || 0
      })),
      managers: {
        flagManager: this.flagManager.getDebugInfo(),
        counterManager: this.counterManager.getDebugInfo(),
        collisionDetector: this.collisionDetector.getDebugInfo(),
        conditionEvaluator: this.conditionEvaluator.getDebugInfo(),
        physicsManager: this.physicsManager.getDebugInfo(),
        animationManager: this.animationManager.getDebugInfo(),
        actionExecutor: this.actionExecutor.getDebugInfo()
      }
    };
  }

  /**
   * ルール実行統計を取得
   * 
   * @returns ルール実行統計
   */
  getRuleExecutionStats(): Map<string, number> {
    return new Map(this.ruleExecutionCounts);
  }
}