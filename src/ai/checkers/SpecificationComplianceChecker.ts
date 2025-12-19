/**
 * SpecificationComplianceChecker
 *
 * GameIdea（仕様）とGameProject（実装）の整合性を検証
 * 「面白いと判断された仕様と適合しているか」をチェック
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameScript, GameRule } from '../../types/editor/GameScript';
import { GameIdea, GameMechanic } from '../generators/GameIdeaGenerator';

// 検証結果
export interface ComplianceResult {
  passed: boolean;
  score: number;              // 0-100 適合度スコア
  breakdown: ComplianceBreakdown;
  violations: ComplianceViolation[];
  recommendations: string[];
}

// 内訳
export interface ComplianceBreakdown {
  mechanicCompliance: number;    // メカニクス適合（0-30）
  winConditionMatch: number;     // 勝利条件一致（0-25）
  loseConditionMatch: number;    // 敗北条件一致（0-15）
  durationMatch: number;         // 時間設定一致（0-10）
  objectCountMatch: number;      // オブジェクト数一致（0-10）
  ruleCountMatch: number;        // ルール数一致（0-10）
}

// 違反項目
export interface ComplianceViolation {
  category: 'critical' | 'major' | 'minor';
  field: string;
  expected: string;
  actual: string;
  message: string;
}

// メカニクスから期待される条件/アクションのマッピング
const MECHANIC_EXPECTATIONS: Record<GameMechanic, {
  requiredConditions: string[];
  requiredActions: string[];
  description: string;
}> = {
  'tap-target': {
    requiredConditions: ['touch'],
    requiredActions: ['hide', 'success'],
    description: 'タップで対象を消す'
  },
  'tap-avoid': {
    requiredConditions: ['touch'],
    requiredActions: ['failure'],
    description: 'タップで不正解を判定'
  },
  'tap-sequence': {
    requiredConditions: ['touch', 'counter'],
    requiredActions: ['counter', 'success'],
    description: '順番にタップ'
  },
  'tap-rhythm': {
    requiredConditions: ['touch', 'time'],
    requiredActions: ['success', 'failure'],
    description: 'リズムに合わせてタップ'
  },
  'swipe-direction': {
    requiredConditions: ['touch'],
    requiredActions: ['move'],
    description: 'スワイプで方向操作'
  },
  'drag-drop': {
    requiredConditions: ['touch'],
    requiredActions: ['move'],
    description: 'ドラッグ&ドロップ'
  },
  'hold-release': {
    requiredConditions: ['touch'],
    requiredActions: ['success'],
    description: '長押し操作'
  },
  'catch-falling': {
    requiredConditions: ['time', 'collision'],
    requiredActions: ['move', 'hide'],
    description: '落下物をキャッチ'
  },
  'dodge-moving': {
    requiredConditions: ['time', 'collision'],
    requiredActions: ['move', 'failure'],
    description: '障害物を避ける'
  },
  'match-pattern': {
    requiredConditions: ['touch'],
    requiredActions: ['success', 'failure'],
    description: 'パターンマッチング'
  },
  'count-objects': {
    requiredConditions: ['touch'],
    requiredActions: ['success', 'failure'],
    description: 'オブジェクトを数える'
  },
  'find-different': {
    requiredConditions: ['touch'],
    requiredActions: ['success', 'failure'],
    description: '仲間はずれを探す'
  },
  'memory-match': {
    requiredConditions: ['touch', 'flag'],
    requiredActions: ['show', 'hide', 'success'],
    description: '記憶マッチング'
  },
  'timing-action': {
    requiredConditions: ['touch', 'time'],
    requiredActions: ['success', 'failure'],
    description: 'タイミングアクション'
  },
  'chase-target': {
    requiredConditions: ['time', 'collision'],
    requiredActions: ['move', 'success'],
    description: '追いかける'
  },
  'collect-items': {
    requiredConditions: ['touch', 'counter'],
    requiredActions: ['hide', 'counter', 'success'],
    description: 'アイテム収集'
  },
  'protect-target': {
    requiredConditions: ['collision'],
    requiredActions: ['failure', 'success'],
    description: 'ターゲットを守る'
  },
  'balance-game': {
    requiredConditions: ['touch', 'time'],
    requiredActions: ['move', 'success', 'failure'],
    description: 'バランスゲーム'
  },
  'reaction-test': {
    requiredConditions: ['touch', 'time'],
    requiredActions: ['success', 'failure'],
    description: '反射神経テスト'
  }
};

/**
 * SpecificationComplianceChecker
 */
export class SpecificationComplianceChecker {
  constructor() {
    console.log('📋 SpecificationComplianceChecker initialized');
  }

  /**
   * 仕様適合性を検証
   */
  check(idea: GameIdea, project: GameProject): ComplianceResult {
    const violations: ComplianceViolation[] = [];

    // 各項目の適合度を計算
    const mechanicCompliance = this.checkMechanicCompliance(idea, project, violations);
    const winConditionMatch = this.checkWinConditionMatch(idea, project, violations);
    const loseConditionMatch = this.checkLoseConditionMatch(idea, project, violations);
    const durationMatch = this.checkDurationMatch(idea, project, violations);
    const objectCountMatch = this.checkObjectCountMatch(idea, project, violations);
    const ruleCountMatch = this.checkRuleCountMatch(idea, project, violations);

    const breakdown: ComplianceBreakdown = {
      mechanicCompliance,
      winConditionMatch,
      loseConditionMatch,
      durationMatch,
      objectCountMatch,
      ruleCountMatch
    };

    const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

    // Critical違反があれば不合格
    const hasCritical = violations.some(v => v.category === 'critical');
    const passed = !hasCritical && score >= 60;

    const recommendations = this.generateRecommendations(violations, breakdown);

    return {
      passed,
      score,
      breakdown,
      violations,
      recommendations
    };
  }

  /**
   * メカニクス適合チェック（0-30点）
   */
  private checkMechanicCompliance(
    idea: GameIdea,
    project: GameProject,
    violations: ComplianceViolation[]
  ): number {
    const script = project.script;
    if (!script?.rules) {
      violations.push({
        category: 'critical',
        field: 'mechanics',
        expected: idea.mainMechanic,
        actual: 'no rules',
        message: 'ルールが存在しません'
      });
      return 0;
    }

    const expectation = MECHANIC_EXPECTATIONS[idea.mainMechanic];
    if (!expectation) {
      return 20; // 未知のメカニクスは中間点
    }

    // 使用されている条件とアクションを収集
    const usedConditions = new Set<string>();
    const usedActions = new Set<string>();

    script.rules.forEach(rule => {
      rule.triggers?.conditions?.forEach(c => usedConditions.add(c.type));
      rule.actions?.forEach(a => usedActions.add(a.type));
    });

    let score = 30;

    // 必須条件のチェック
    for (const required of expectation.requiredConditions) {
      if (!usedConditions.has(required)) {
        score -= 5;
        violations.push({
          category: 'major',
          field: 'conditions',
          expected: required,
          actual: Array.from(usedConditions).join(', '),
          message: `${idea.mainMechanic}に必要な条件「${required}」がありません`
        });
      }
    }

    // 必須アクションのチェック
    for (const required of expectation.requiredActions) {
      if (!usedActions.has(required)) {
        score -= 5;
        violations.push({
          category: 'major',
          field: 'actions',
          expected: required,
          actual: Array.from(usedActions).join(', '),
          message: `${idea.mainMechanic}に必要なアクション「${required}」がありません`
        });
      }
    }

    return Math.max(0, score);
  }

  /**
   * 勝利条件一致チェック（0-25点）
   */
  private checkWinConditionMatch(
    idea: GameIdea,
    project: GameProject,
    violations: ComplianceViolation[]
  ): number {
    const script = project.script;
    if (!script?.rules) return 0;

    // successアクションを持つルールを探す
    const successRules = script.rules.filter(rule =>
      rule.actions?.some(a => a.type === 'success')
    );

    if (successRules.length === 0) {
      violations.push({
        category: 'critical',
        field: 'winCondition',
        expected: idea.winCondition,
        actual: 'なし',
        message: '勝利条件（successアクション）が存在しません'
      });
      return 0;
    }

    // 勝利条件のトリガーを分析
    let score = 25;

    // カウンター系の勝利条件か
    const hasCounterWin = idea.winCondition.includes('個') ||
                          idea.winCondition.includes('回') ||
                          idea.winCondition.includes('全部');

    if (hasCounterWin) {
      const hasCounterCondition = successRules.some(rule =>
        rule.triggers?.conditions?.some(c => c.type === 'counter')
      );

      if (!hasCounterCondition) {
        score -= 10;
        violations.push({
          category: 'minor',
          field: 'winCondition',
          expected: 'counter条件',
          actual: '他の条件',
          message: '仕様の勝利条件はカウンター系ですが、counter条件が使われていません'
        });
      }
    }

    return score;
  }

  /**
   * 敗北条件一致チェック（0-15点）
   */
  private checkLoseConditionMatch(
    idea: GameIdea,
    project: GameProject,
    violations: ComplianceViolation[]
  ): number {
    const script = project.script;
    if (!script?.rules) return 0;

    // 時間切れ以外の敗北条件があるか
    const hasExplicitLose = idea.loseCondition &&
                            !idea.loseCondition.includes('時間切れ') &&
                            !idea.loseCondition.includes('タイムアウト');

    if (hasExplicitLose) {
      // failureアクションが必要
      const hasFailure = script.rules.some(rule =>
        rule.actions?.some(a => a.type === 'failure')
      );

      if (!hasFailure) {
        violations.push({
          category: 'major',
          field: 'loseCondition',
          expected: idea.loseCondition,
          actual: 'なし',
          message: '仕様に敗北条件がありますが、failureアクションがありません'
        });
        return 5;
      }
    }

    return 15;
  }

  /**
   * 時間設定一致チェック（0-10点）
   */
  private checkDurationMatch(
    idea: GameIdea,
    project: GameProject,
    violations: ComplianceViolation[]
  ): number {
    const expectedDuration = idea.duration;
    const actualDuration = project.settings?.duration?.seconds;

    if (!actualDuration) {
      violations.push({
        category: 'minor',
        field: 'duration',
        expected: `${expectedDuration}秒`,
        actual: '未設定',
        message: 'ゲーム時間が設定されていません'
      });
      return 5;
    }

    // ±50%以内なら許容
    const ratio = actualDuration / expectedDuration;
    if (ratio >= 0.5 && ratio <= 1.5) {
      return 10;
    } else {
      violations.push({
        category: 'minor',
        field: 'duration',
        expected: `${expectedDuration}秒`,
        actual: `${actualDuration}秒`,
        message: `ゲーム時間が仕様と大きく異なります（期待: ${expectedDuration}秒, 実際: ${actualDuration}秒）`
      });
      return 5;
    }
  }

  /**
   * オブジェクト数一致チェック（0-10点）
   */
  private checkObjectCountMatch(
    idea: GameIdea,
    project: GameProject,
    violations: ComplianceViolation[]
  ): number {
    const expectedCount = idea.objectCount;
    const actualCount = project.assets?.objects?.length || 0;

    // ±3個以内なら許容
    const diff = Math.abs(actualCount - expectedCount);
    if (diff <= 3) {
      return 10;
    } else if (diff <= 5) {
      return 7;
    } else {
      violations.push({
        category: 'minor',
        field: 'objectCount',
        expected: `${expectedCount}個`,
        actual: `${actualCount}個`,
        message: `オブジェクト数が仕様と異なります`
      });
      return 3;
    }
  }

  /**
   * ルール数一致チェック（0-10点）
   */
  private checkRuleCountMatch(
    idea: GameIdea,
    project: GameProject,
    violations: ComplianceViolation[]
  ): number {
    const expectedCount = idea.estimatedRuleCount;
    const actualCount = project.script?.rules?.length || 0;

    // ±5個以内なら許容
    const diff = Math.abs(actualCount - expectedCount);
    if (diff <= 5) {
      return 10;
    } else if (diff <= 8) {
      return 7;
    } else {
      violations.push({
        category: 'minor',
        field: 'ruleCount',
        expected: `${expectedCount}個`,
        actual: `${actualCount}個`,
        message: `ルール数が仕様の見積もりと大きく異なります`
      });
      return 3;
    }
  }

  /**
   * 改善提案の生成
   */
  private generateRecommendations(
    violations: ComplianceViolation[],
    breakdown: ComplianceBreakdown
  ): string[] {
    const recs: string[] = [];

    // Critical違反への対応
    const criticals = violations.filter(v => v.category === 'critical');
    if (criticals.length > 0) {
      recs.push(`致命的な問題: ${criticals.map(v => v.message).join(', ')}`);
    }

    // Major違反への対応
    const majors = violations.filter(v => v.category === 'major');
    if (majors.length > 0) {
      recs.push(`重要な問題: ${majors.map(v => v.message).join(', ')}`);
    }

    // スコアが低い項目への提案
    if (breakdown.mechanicCompliance < 20) {
      recs.push('メカニクスに必要な条件/アクションを追加してください');
    }
    if (breakdown.winConditionMatch < 15) {
      recs.push('勝利条件の実装を確認してください');
    }

    return recs;
  }

  /**
   * 簡易チェック（合格/不合格のみ）
   */
  quickCheck(idea: GameIdea, project: GameProject): boolean {
    return this.check(idea, project).passed;
  }
}

// デフォルトエクスポート
export default SpecificationComplianceChecker;
