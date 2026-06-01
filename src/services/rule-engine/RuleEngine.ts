// src/services/rule-engine/RuleEngine.ts
// ルールエンジン - 全モジュールを統括、公開API提供

import { GameRule, GameFlag, SuccessCondition } from '../../types/editor/GameScript';
import { GameCounter } from '../../types/counterTypes';
import {
  RuleExecutionContext,
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

    // success/failure後（pendingEndTime設定済み）はルール評価を止める
    if (context.gameState.pendingEndTime !== undefined) {
      return results;
    }

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
   * 成功条件(successConditions)を評価する。
   *
   * これまで successConditions は型・UI には存在したが実行時に一切評価されておらず、
   * 「success アクション」を明示的に書かない限りゲームがクリアできなかった。
   * 本メソッドで flag/score/time/counter/objectState の各条件を評価し、
   * 成立した SuccessCondition があれば true を返す（呼び出し側が終了予約を行う）。
   *
   * @param successConditions 評価対象の成功条件配列
   * @param context ゲーム実行コンテキスト
   * @returns 成立した SuccessCondition。なければ null
   */
  evaluateSuccessConditions(
    successConditions: SuccessCondition[] | undefined,
    context: RuleExecutionContext
  ): SuccessCondition | null {
    if (!successConditions || successConditions.length === 0) {
      return null;
    }

    for (const sc of successConditions) {
      if (!sc.conditions || sc.conditions.length === 0) {
        continue;
      }

      const operator = sc.operator || 'AND';
      const results = sc.conditions.map((c) => this.evaluateSingleSuccessCondition(c, context));
      const satisfied = operator === 'OR' ? results.some(Boolean) : results.every(Boolean);

      if (satisfied) {
        return sc;
      }
    }

    return null;
  }

  /**
   * 個々の成功条件を評価する。
   */
  private evaluateSingleSuccessCondition(
    condition: SuccessCondition['conditions'][number],
    context: RuleExecutionContext
  ): boolean {
    const gs = context.gameState;

    switch (condition.type) {
      case 'flag': {
        if (!condition.flagId) return false;
        // フラグの実体は FlagManager が保持（context.gameState.flags は同期されない）
        const current = this.flagManager.getFlag(condition.flagId);
        return current === (condition.flagValue ?? true);
      }

      case 'score': {
        if (condition.scoreValue === undefined) return false;
        return this.compareWithSymbol(gs.score || 0, condition.scoreComparison || '>=', condition.scoreValue);
      }

      case 'time': {
        if (condition.timeValue === undefined) return false;
        return this.compareWithSymbol(gs.timeElapsed || 0, condition.timeComparison || '>=', condition.timeValue);
      }

      case 'counter': {
        if (!condition.counterName || condition.counterValue === undefined) return false;
        // カウンターの実体は CounterManager が保持（context.gameState.counters は同期されない）
        const current = this.counterManager.getCounter(condition.counterName);
        return this.compareCounter(
          current,
          condition.counterComparison || 'greaterOrEqual',
          condition.counterValue,
          condition.counterRangeMax
        );
      }

      case 'objectState': {
        if (!condition.objectId) return false;
        const obj = context.objects.get(condition.objectId);
        if (!obj) return false;
        switch (condition.objectCondition) {
          case 'visible': return obj.visible === true;
          case 'hidden': return obj.visible === false;
          default: return false; // position/animation は現状未対応
        }
      }

      default:
        return false;
    }
  }

  /** 記号比較(>=, >, ==, <, <=) */
  private compareWithSymbol(actual: number, op: string, expected: number): boolean {
    switch (op) {
      case '>=': return actual >= expected;
      case '>': return actual > expected;
      case '==': return actual === expected;
      case '<': return actual < expected;
      case '<=': return actual <= expected;
      default: return false;
    }
  }

  /** カウンター比較(CounterComparison) */
  private compareCounter(actual: number, op: string, expected: number, rangeMax?: number): boolean {
    switch (op) {
      case 'equals': return actual === expected;
      case 'notEquals': return actual !== expected;
      case 'greater': return actual > expected;
      case 'greaterOrEqual': return actual >= expected;
      case 'less': return actual < expected;
      case 'lessOrEqual': return actual <= expected;
      case 'between': return rangeMax !== undefined && actual >= expected && actual <= rangeMax;
      case 'notBetween': return rangeMax !== undefined && (actual < expected || actual > rangeMax);
      default: return false;
    }
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

  /**
   * フレーム状態の更新（衝突キャッシュ + フラグ前回値）
   * ルール評価の直前に毎フレーム呼び出す必要がある
   */
  updateFrameState(): void {
    this.collisionDetector.updateCollisionCache();
    this.flagManager.updatePreviousFlags();
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
  reset(context?: RuleExecutionContext): void {
    console.log('🔄 RuleEngine リセット開始');

    // 各マネージャーのリセット
    this.flagManager.reset();
    this.counterManager.reset();
    this.collisionDetector.reset();
    this.conditionEvaluator.reset();
    this.physicsManager.reset();
    this.animationManager.reset();
    this.actionExecutor.reset();
    if (context) {
      this.effectManager.reset(context);
    }

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