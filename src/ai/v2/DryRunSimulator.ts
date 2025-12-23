/**
 * Step 8.5: DryRunSimulator
 *
 * 成功パスの自動検証（機械的シミュレーション）
 * 「生成は通るが遊べない」を検出する
 *
 * 入力: GameProject または LogicGeneratorOutput
 * 出力: ReachabilityReport
 */

import { LogicGeneratorOutput, GameRule, TriggerCondition, GameAction } from './types';
import { GameSpecification } from './SpecificationGenerator';
import { GenerationLogger } from './GenerationLogger';

// ==========================================
// Simulation Types
// ==========================================

export interface ReachabilityReport {
  success: {
    reachable: boolean;
    shortestPath?: SimulationPath;
    requiredTaps: number;
    estimatedSeconds: number;
    blockers: string[];
  };
  failure: {
    reachable: boolean;
    commonPaths: SimulationPath[];
    risks: string[];
  };
  conflicts: ConflictReport[];
  issues: SimulationIssue[];
  summary: {
    playable: boolean;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  };
}

export interface SimulationPath {
  steps: SimulationStep[];
  totalTaps: number;
  estimatedTime: number;
}

export interface SimulationStep {
  action: 'tap' | 'wait' | 'drag';
  target?: string;
  duration?: number;
  result: string;
}

export interface ConflictReport {
  type: 'simultaneous_termination' | 'counter_race' | 'hidden_target';
  description: string;
  rules: string[];
  severity: 'error' | 'warning';
}

export interface SimulationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

// ==========================================
// Game State for Simulation
// ==========================================

interface GameState {
  counters: Map<string, number>;
  flags: Map<string, boolean>;
  visibleObjects: Set<string>;
  hiddenObjects: Set<string>;
  elapsedTime: number;
  terminated: 'success' | 'failure' | null;
}

// ==========================================
// DryRunSimulator
// ==========================================

export class DryRunSimulator {
  private logger?: GenerationLogger;
  private maxSimulationSteps = 100;
  private gameTimeLimit = 15; // 秒

  constructor(logger?: GenerationLogger) {
    this.logger = logger;
  }

  /**
   * ゲームの到達可能性をシミュレート
   */
  simulate(
    logicOutput: LogicGeneratorOutput,
    specification?: GameSpecification
  ): ReachabilityReport {
    const issues: SimulationIssue[] = [];
    const conflicts: ConflictReport[] = [];

    // 初期状態を構築
    const initialState = this.createInitialState(logicOutput);

    // 成功パス探索
    const successResult = this.findSuccessPath(logicOutput, initialState, issues);

    // 失敗パス探索
    const failureResult = this.findFailurePaths(logicOutput, initialState);

    // 競合検出
    this.detectConflicts(logicOutput, conflicts);

    // 結果をまとめる
    const playable = successResult.reachable && issues.filter(i => i.severity === 'error').length === 0;

    const report: ReachabilityReport = {
      success: successResult,
      failure: failureResult,
      conflicts,
      issues,
      summary: {
        playable,
        confidence: this.calculateConfidence(successResult, failureResult, issues),
        reasoning: this.generateReasoning(successResult, failureResult, conflicts, issues)
      }
    };

    // ログに記録
    this.logger?.log('DryRunSimulator', 'output', 'Simulation completed', {
      playable: report.summary.playable,
      confidence: report.summary.confidence,
      successReachable: successResult.reachable,
      requiredTaps: successResult.requiredTaps,
      issueCount: issues.length,
      conflictCount: conflicts.length
    });

    return report;
  }

  /**
   * 初期状態を構築
   */
  private createInitialState(output: LogicGeneratorOutput): GameState {
    const counters = new Map<string, number>();
    for (const counter of output.script.counters) {
      counters.set(counter.name, counter.initialValue);
    }

    const visibleObjects = new Set<string>();
    for (const layoutObj of output.script.layout.objects) {
      visibleObjects.add(layoutObj.objectId);
    }

    return {
      counters,
      flags: new Map(),
      visibleObjects,
      hiddenObjects: new Set(),
      elapsedTime: 0,
      terminated: null
    };
  }

  /**
   * 成功パスを探索
   */
  private findSuccessPath(
    output: LogicGeneratorOutput,
    initialState: GameState,
    issues: SimulationIssue[]
  ): ReachabilityReport['success'] {
    // 成功ルールを特定
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );

    if (successRules.length === 0) {
      issues.push({
        code: 'NO_SUCCESS_RULE',
        message: 'No success rule found',
        severity: 'error'
      });
      return {
        reachable: false,
        requiredTaps: -1,
        estimatedSeconds: -1,
        blockers: ['No success rule defined']
      };
    }

    // 各成功ルールについて到達可能性を検証
    for (const successRule of successRules) {
      const pathResult = this.simulateToSuccess(output, initialState, successRule);
      if (pathResult.reachable) {
        return pathResult;
      }
    }

    // 到達不能
    const blockers = this.identifyBlockers(output, successRules, initialState);
    return {
      reachable: false,
      requiredTaps: -1,
      estimatedSeconds: -1,
      blockers
    };
  }

  /**
   * 成功ルールへの到達をシミュレート
   */
  private simulateToSuccess(
    output: LogicGeneratorOutput,
    initialState: GameState,
    successRule: GameRule
  ): ReachabilityReport['success'] {
    const state = this.cloneState(initialState);
    const steps: SimulationStep[] = [];
    let tapCount = 0;

    // 成功条件を分析
    const conditions = successRule.triggers?.conditions || [];

    for (const condition of conditions) {
      if (condition.type === 'counter' && condition.counterName) {
        // カウンター条件の場合、必要なタップ数を計算
        const targetValue = condition.value || 0;
        const currentValue = state.counters.get(condition.counterName) || 0;
        const comparison = condition.comparison || 'equals';

        let requiredIncrement = 0;
        if (comparison === 'equals') {
          requiredIncrement = targetValue - currentValue;
        } else if (comparison === 'greaterOrEqual' || comparison === 'greater') {
          requiredIncrement = Math.max(0, targetValue - currentValue);
          if (comparison === 'greater') requiredIncrement++;
        }

        // カウンターを増やすルールを探す
        const incrementRule = output.script.rules.find(r =>
          r.actions?.some(a =>
            a.type === 'counter' &&
            a.counterName === condition.counterName &&
            (a.operation === 'increment' || a.operation === 'add')
          )
        );

        if (!incrementRule) {
          return {
            reachable: false,
            requiredTaps: -1,
            estimatedSeconds: -1,
            blockers: [`No rule to increment counter "${condition.counterName}"`]
          };
        }

        // タップ対象を特定
        const tapTarget = incrementRule.targetObjectId || this.findTapTarget(incrementRule);
        if (!tapTarget) {
          return {
            reachable: false,
            requiredTaps: -1,
            estimatedSeconds: -1,
            blockers: [`Cannot determine tap target for incrementing "${condition.counterName}"`]
          };
        }

        // 必要なタップ数を積算
        const incrementPerTap = this.getIncrementValue(incrementRule, condition.counterName);
        const requiredTaps = Math.ceil(requiredIncrement / incrementPerTap);

        for (let i = 0; i < requiredTaps; i++) {
          // オブジェクトがhideされていないか確認
          if (state.hiddenObjects.has(tapTarget)) {
            return {
              reachable: false,
              requiredTaps: -1,
              estimatedSeconds: -1,
              blockers: [`Target "${tapTarget}" becomes hidden before reaching goal`]
            };
          }

          steps.push({
            action: 'tap',
            target: tapTarget,
            result: `Counter ${condition.counterName} +${incrementPerTap}`
          });
          tapCount++;

          // 状態を更新
          this.applyRule(state, incrementRule);
        }
      }
    }

    // 成功パスが見つかった
    return {
      reachable: true,
      shortestPath: {
        steps,
        totalTaps: tapCount,
        estimatedTime: tapCount * 0.5 // 0.5秒/タップと仮定
      },
      requiredTaps: tapCount,
      estimatedSeconds: tapCount * 0.5,
      blockers: []
    };
  }

  /**
   * ルールからタップ対象を特定
   */
  private findTapTarget(rule: GameRule): string | null {
    if (rule.targetObjectId) {
      return rule.targetObjectId;
    }

    const touchCondition = rule.triggers?.conditions?.find(c => c.type === 'touch');
    if (touchCondition?.target && touchCondition.target !== 'self' && touchCondition.target !== 'stage') {
      return touchCondition.target;
    }

    return null;
  }

  /**
   * カウンター増分値を取得
   */
  private getIncrementValue(rule: GameRule, counterName: string): number {
    const counterAction = rule.actions?.find(a =>
      a.type === 'counter' && a.counterName === counterName
    );
    if (!counterAction) return 1;

    if (counterAction.operation === 'increment') return 1;
    if (counterAction.operation === 'add') return counterAction.value || 1;
    return 1;
  }

  /**
   * ルールを適用して状態を更新
   */
  private applyRule(state: GameState, rule: GameRule): void {
    if (!rule.actions) return;

    for (const action of rule.actions) {
      if (action.type === 'hide' && action.targetId) {
        state.visibleObjects.delete(action.targetId);
        state.hiddenObjects.add(action.targetId);
      } else if (action.type === 'show' && action.targetId) {
        state.hiddenObjects.delete(action.targetId);
        state.visibleObjects.add(action.targetId);
      } else if (action.type === 'counter' && action.counterName) {
        const current = state.counters.get(action.counterName) || 0;
        let newValue = current;
        if (action.operation === 'increment') newValue++;
        else if (action.operation === 'decrement') newValue--;
        else if (action.operation === 'add') newValue += action.value || 1;
        else if (action.operation === 'subtract') newValue -= action.value || 1;
        else if (action.operation === 'set') newValue = action.value || 0;
        state.counters.set(action.counterName, newValue);
      } else if (action.type === 'setFlag' && action.flagId) {
        state.flags.set(action.flagId, true);
      } else if (action.type === 'success') {
        state.terminated = 'success';
      } else if (action.type === 'failure') {
        state.terminated = 'failure';
      }
    }
  }

  /**
   * 失敗パスを探索
   */
  private findFailurePaths(
    output: LogicGeneratorOutput,
    initialState: GameState
  ): ReachabilityReport['failure'] {
    const failureRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'failure')
    );

    const paths: SimulationPath[] = [];
    const risks: string[] = [];

    // タイムアウトによる失敗
    paths.push({
      steps: [{ action: 'wait', duration: this.gameTimeLimit, result: 'Timeout' }],
      totalTaps: 0,
      estimatedTime: this.gameTimeLimit
    });
    risks.push('Game timeout');

    // 明示的な失敗ルール
    for (const failureRule of failureRules) {
      const conditions = failureRule.triggers?.conditions || [];

      for (const condition of conditions) {
        if (condition.type === 'touch') {
          risks.push(`Tapping wrong object: ${condition.target || 'unknown'}`);
          paths.push({
            steps: [{ action: 'tap', target: condition.target, result: 'Failure triggered' }],
            totalTaps: 1,
            estimatedTime: 0.5
          });
        } else if (condition.type === 'counter') {
          risks.push(`Counter ${condition.counterName} reaching ${condition.value}`);
        } else if (condition.type === 'collision') {
          risks.push(`Collision with ${condition.target}`);
        }
      }
    }

    return {
      reachable: failureRules.length > 0 || true, // タイムアウトは常に到達可能
      commonPaths: paths.slice(0, 3), // 上位3つ
      risks
    };
  }

  /**
   * ブロッカーを特定
   */
  private identifyBlockers(
    output: LogicGeneratorOutput,
    successRules: GameRule[],
    initialState: GameState
  ): string[] {
    const blockers: string[] = [];

    for (const rule of successRules) {
      const conditions = rule.triggers?.conditions || [];

      for (const condition of conditions) {
        if (condition.type === 'counter' && condition.counterName) {
          // カウンターを増やすルールがあるか
          const hasModifier = output.script.rules.some(r =>
            r.actions?.some(a =>
              a.type === 'counter' && a.counterName === condition.counterName
            )
          );
          if (!hasModifier) {
            blockers.push(`Counter "${condition.counterName}" has no modifying rule`);
          }

          // 初期値から到達可能か
          const initialValue = initialState.counters.get(condition.counterName) || 0;
          const targetValue = condition.value || 0;
          if (initialValue > targetValue && condition.comparison === 'lessOrEqual') {
            blockers.push(`Counter "${condition.counterName}" starts too high (${initialValue} > ${targetValue})`);
          }
        }

        if (condition.type === 'touch' && condition.target) {
          // タップ対象が存在するか
          if (!initialState.visibleObjects.has(condition.target) && condition.target !== 'stage') {
            blockers.push(`Touch target "${condition.target}" is not visible`);
          }
        }
      }
    }

    return blockers;
  }

  /**
   * 競合を検出
   */
  private detectConflicts(
    output: LogicGeneratorOutput,
    conflicts: ConflictReport[]
  ): void {
    const rules = output.script.rules;

    // 同一条件でのsuccess/failure同時発火
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const sig1 = this.getConditionSignature(rules[i]);
        const sig2 = this.getConditionSignature(rules[j]);

        if (sig1 === sig2 && sig1 !== '') {
          const hasSuccess1 = rules[i].actions?.some(a => a.type === 'success');
          const hasFailure1 = rules[i].actions?.some(a => a.type === 'failure');
          const hasSuccess2 = rules[j].actions?.some(a => a.type === 'success');
          const hasFailure2 = rules[j].actions?.some(a => a.type === 'failure');

          if ((hasSuccess1 && hasFailure2) || (hasFailure1 && hasSuccess2)) {
            conflicts.push({
              type: 'simultaneous_termination',
              description: 'Success and failure can trigger with same condition',
              rules: [rules[i].id, rules[j].id],
              severity: 'error'
            });
          }
        }
      }
    }

    // hide直後のタップ対象
    for (const rule of rules) {
      if (rule.actions?.some(a => a.type === 'hide')) {
        const hideTargets = rule.actions
          .filter(a => a.type === 'hide' && a.targetId)
          .map(a => a.targetId!);

        for (const target of hideTargets) {
          // このターゲットをタップする他のルールがあるか
          const dependentRules = rules.filter(r =>
            r.targetObjectId === target ||
            r.triggers?.conditions?.some(c => c.target === target)
          );

          if (dependentRules.length > 0) {
            conflicts.push({
              type: 'hidden_target',
              description: `Object "${target}" is hidden but other rules depend on it`,
              rules: [rule.id, ...dependentRules.map(r => r.id)],
              severity: 'warning'
            });
          }
        }
      }
    }
  }

  /**
   * 条件のシグネチャを生成
   */
  private getConditionSignature(rule: GameRule): string {
    if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
      return '';
    }
    return rule.triggers.conditions
      .map(c => `${c.type}:${JSON.stringify(c)}`)
      .sort()
      .join('|');
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    success: ReachabilityReport['success'],
    failure: ReachabilityReport['failure'],
    issues: SimulationIssue[]
  ): 'high' | 'medium' | 'low' {
    const errorCount = issues.filter(i => i.severity === 'error').length;

    if (!success.reachable || errorCount > 0) {
      return 'low';
    }

    if (success.requiredTaps > 20 || issues.length > 2) {
      return 'medium';
    }

    return 'high';
  }

  /**
   * 推論結果を生成
   */
  private generateReasoning(
    success: ReachabilityReport['success'],
    failure: ReachabilityReport['failure'],
    conflicts: ConflictReport[],
    issues: SimulationIssue[]
  ): string {
    const parts: string[] = [];

    if (success.reachable) {
      parts.push(`Success reachable in ${success.requiredTaps} taps (~${success.estimatedSeconds.toFixed(1)}s)`);
    } else {
      parts.push(`Success NOT reachable: ${success.blockers.join(', ')}`);
    }

    if (conflicts.length > 0) {
      parts.push(`${conflicts.length} potential conflicts detected`);
    }

    if (issues.length > 0) {
      const errors = issues.filter(i => i.severity === 'error').length;
      const warnings = issues.filter(i => i.severity === 'warning').length;
      parts.push(`Issues: ${errors} errors, ${warnings} warnings`);
    }

    return parts.join('. ');
  }

  /**
   * 状態をクローン
   */
  private cloneState(state: GameState): GameState {
    return {
      counters: new Map(state.counters),
      flags: new Map(state.flags),
      visibleObjects: new Set(state.visibleObjects),
      hiddenObjects: new Set(state.hiddenObjects),
      elapsedTime: state.elapsedTime,
      terminated: state.terminated
    };
  }
}

export default DryRunSimulator;
