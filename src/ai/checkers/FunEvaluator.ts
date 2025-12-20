/**
 * FunEvaluator
 *
 * ゲームの「面白さ」を評価するモジュール
 * 既存ゲーム分析から導き出された面白さの要因に基づく評価
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameScript, GameRule } from '../../types/editor/GameScript';
import { GameIdea } from '../generators/GameIdeaGenerator';

// 面白さ評価結果
export interface FunEvaluationResult {
  funScore: number;           // 総合面白さスコア（0-100）
  passed: boolean;            // 合格（50以上）
  breakdown: FunBreakdown;    // 内訳
  playabilityCheck: PlayabilityCheckResult; // プレイアビリティチェック
  issues: string[];           // 問題点
  recommendations: string[];  // 改善提案
}

// プレイアビリティチェック結果
export interface PlayabilityCheckResult {
  isPlayable: boolean;        // プレイ可能か
  hasInstantWin: boolean;     // 即成功（開始時点でクリア条件達成）
  requiresAction: boolean;    // 操作が必要か
  canFail: boolean;           // 失敗可能か
  hasClearGoal: boolean;      // 明確なゴールがあるか
  criticalIssues: string[];   // 致命的問題
}

// 面白さ内訳
export interface FunBreakdown {
  dynamicElements: number;    // 動的要素（0-20）
  interactionQuality: number; // インタラクション品質（0-20）
  feedbackRichness: number;   // フィードバック豊富さ（0-20）
  challengeBalance: number;   // チャレンジバランス（0-20）
  progressionClarity: number; // 進行の明確さ（0-20）
}

/**
 * FunEvaluator
 */
export class FunEvaluator {
  constructor() {
    console.log('🎯 FunEvaluator initialized');
  }

  /**
   * GameProjectの面白さを評価
   */
  evaluate(project: GameProject, idea?: GameIdea): FunEvaluationResult {
    const breakdown: FunBreakdown = {
      dynamicElements: this.evaluateDynamicElements(project.script),
      interactionQuality: this.evaluateInteractionQuality(project.script),
      feedbackRichness: this.evaluateFeedbackRichness(project.script),
      challengeBalance: this.evaluateChallengeBalance(project),
      progressionClarity: this.evaluateProgressionClarity(project.script)
    };

    // プレイアビリティチェック（致命的問題の検出）
    const playabilityCheck = this.checkPlayability(project.script);

    // 致命的問題がある場合はスコアを大幅減点
    let funScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    if (!playabilityCheck.isPlayable) {
      funScore = Math.min(funScore, 30); // 最大30点に制限
    }

    const passed = funScore >= 50 && playabilityCheck.isPlayable;

    const { issues, recommendations } = this.generateFeedback(breakdown, idea, playabilityCheck);

    return {
      funScore,
      passed,
      breakdown,
      playabilityCheck,
      issues,
      recommendations
    };
  }

  /**
   * プレイアビリティチェック
   * 致命的な問題（即成功、操作不要、失敗不可能など）を検出
   */
  private checkPlayability(script: GameScript): PlayabilityCheckResult {
    const criticalIssues: string[] = [];

    // 1. 即成功チェック: 初期状態でクリア条件を満たしていないか
    const hasInstantWin = this.detectInstantWin(script);
    if (hasInstantWin) {
      criticalIssues.push('INSTANT_WIN: ゲーム開始時点でクリア条件を満たしている可能性');
    }

    // 2. 操作必須チェック: タッチ条件がクリアに必要か
    const requiresAction = this.detectRequiresAction(script);
    if (!requiresAction) {
      criticalIssues.push('NO_ACTION_REQUIRED: プレイヤー操作なしでクリアできる可能性');
    }

    // 3. 失敗可能チェック: 失敗条件が存在し発動しうるか
    const canFail = this.detectCanFail(script);
    if (!canFail) {
      criticalIssues.push('CANNOT_FAIL: 失敗条件がない、または発動しない可能性');
    }

    // 4. 明確なゴールチェック
    const hasClearGoal = this.detectClearGoal(script);
    if (!hasClearGoal) {
      criticalIssues.push('NO_CLEAR_GOAL: 成功条件が不明確');
    }

    const isPlayable = criticalIssues.length === 0;

    return {
      isPlayable,
      hasInstantWin,
      requiresAction,
      canFail,
      hasClearGoal,
      criticalIssues
    };
  }

  /**
   * 即成功の検出
   */
  private detectInstantWin(script: GameScript): boolean {
    // 成功条件を持つルールを探す
    const successRules = script.rules.filter(rule =>
      rule.actions?.some(a => a.type === 'success')
    );

    for (const rule of successRules) {
      const conditions = rule.triggers?.conditions || [];

      // counter条件でクリア判定している場合
      const counterCondition = conditions.find(c => c.type === 'counter');
      if (counterCondition) {
        const targetCounter = script.counters?.find(c => c.id === counterCondition.counterName);
        const initialValue = targetCounter?.initialValue ?? 0;
        const targetValue = counterCondition.value ?? 0;
        const comparison = counterCondition.comparison;

        // 初期値が既に条件を満たしているか確認
        if (comparison === 'greaterOrEqual' && initialValue >= targetValue) {
          return true;
        }
        if (comparison === 'equals' && initialValue === targetValue) {
          return true;
        }
        // 目標値が0または1の場合も即成功の可能性
        if (targetValue <= 1 && comparison === 'greaterOrEqual') {
          return true;
        }
      }

      // 条件なしでsuccessがある場合
      if (conditions.length === 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * 操作必須の検出
   */
  private detectRequiresAction(script: GameScript): boolean {
    // 成功に至るパスにタッチ条件が含まれているか確認
    const successRules = script.rules.filter(rule =>
      rule.actions?.some(a => a.type === 'success')
    );

    // 直接successに至るルールにタッチ条件があるか
    for (const rule of successRules) {
      const conditions = rule.triggers?.conditions || [];
      const hasTouchCondition = conditions.some(c => c.type === 'touch');

      if (hasTouchCondition) {
        return true;
      }

      // counter条件の場合、そのカウンターを増やすルールにタッチ条件があるか
      const counterCondition = conditions.find(c => c.type === 'counter');
      if (counterCondition) {
        const counterIncrementRules = script.rules.filter(r =>
          r.actions?.some(a =>
            a.type === 'counter' &&
            a.counterName === counterCondition.counterName &&
            a.operation === 'add'
          )
        );

        for (const incrementRule of counterIncrementRules) {
          const incrementConditions = incrementRule.triggers?.conditions || [];
          if (incrementConditions.some(c => c.type === 'touch')) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 失敗可能性の検出
   */
  private detectCanFail(script: GameScript): boolean {
    // failureアクションを持つルールがあるか
    const hasFailureRule = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'failure')
    );

    if (!hasFailureRule) {
      return false;
    }

    // 失敗ルールの条件が発動しうるか確認
    const failureRules = script.rules.filter(rule =>
      rule.actions?.some(a => a.type === 'failure')
    );

    for (const rule of failureRules) {
      const conditions = rule.triggers?.conditions || [];

      // タッチで失敗（間違いタップ）
      if (conditions.some(c => c.type === 'touch')) {
        return true;
      }

      // 衝突で失敗
      if (conditions.some(c => c.type === 'collision')) {
        return true;
      }

      // カウンター条件で失敗（ミス回数など）
      const counterCondition = conditions.find(c => c.type === 'counter');
      if (counterCondition) {
        // ミスカウンターが増加するルールがあるか
        const missIncrementRules = script.rules.filter(r =>
          r.actions?.some(a =>
            a.type === 'counter' &&
            a.counterName === counterCondition.counterName &&
            a.operation === 'add'
          )
        );
        if (missIncrementRules.length > 0) {
          return true;
        }
      }

      // 時間条件で失敗（タイムアウト）- これは常に発動しうる
      if (conditions.some(c => c.type === 'time' && c.timeType === 'exact')) {
        return true;
      }
    }

    return false;
  }

  /**
   * 明確なゴールの検出
   */
  private detectClearGoal(script: GameScript): boolean {
    // successアクションがあるか
    const hasSuccess = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'success')
    );

    if (!hasSuccess) {
      return false;
    }

    // counter条件での成功判定があれば明確
    const hasCounterWin = script.rules.some(rule =>
      rule.triggers?.conditions?.some(c => c.type === 'counter') &&
      rule.actions?.some(a => a.type === 'success')
    );

    return hasCounterWin;
  }

  /**
   * 動的要素の評価（0-20点）
   * オブジェクトが動く、ランダム性がある、変化がある
   */
  private evaluateDynamicElements(script: GameScript): number {
    let score = 0;
    const issues: string[] = [];

    // 移動アクションの存在（最大8点）
    const hasMoveAction = script.rules.some(rule =>
      rule.actions?.some(action => action.type === 'move')
    );
    if (hasMoveAction) {
      score += 8;
    } else {
      issues.push('No movement - static game');
    }

    // time条件による連続動作（最大6点）
    const hasTimeInterval = script.rules.some(rule =>
      rule.triggers?.conditions?.some(c =>
        c.type === 'time' && c.timeType === 'interval'
      )
    );
    if (hasTimeInterval) {
      score += 6;
    }

    // ランダム要素（最大4点）
    const hasRandom = script.rules.some(rule =>
      rule.triggers?.conditions?.some(c => c.type === 'random') ||
      rule.actions?.some(a => a.type === 'randomAction')
    );
    if (hasRandom) {
      score += 4;
    }

    // show/hide による動的表示（最大2点）
    const hasShowHide = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'show' || a.type === 'hide')
    );
    if (hasShowHide) {
      score += 2;
    }

    return Math.min(20, score);
  }

  /**
   * インタラクション品質の評価（0-20点）
   * タッチ操作の多様性、直感性
   */
  private evaluateInteractionQuality(script: GameScript): number {
    let score = 0;

    // タッチ条件の存在（基本点 8点）
    const touchConditions = script.rules.flatMap(rule =>
      (rule.triggers?.conditions || []).filter(c => c.type === 'touch')
    );

    if (touchConditions.length > 0) {
      score += 8;

      // タッチタイプの多様性（最大4点）
      const touchTypes = new Set(touchConditions.map(c => c.touchType));
      score += Math.min(4, touchTypes.size * 2);

      // ターゲットの多様性（最大4点）
      const targets = new Set(touchConditions.map(c => c.target));
      if (targets.has('self')) {
        score += 2; // オブジェクト直接タップは直感的
      }
      if (targets.size > 1) {
        score += 2; // 複数ターゲット
      }
    }

    // 衝突条件（追加の操作感 最大4点）
    const hasCollision = script.rules.some(rule =>
      rule.triggers?.conditions?.some(c => c.type === 'collision')
    );
    if (hasCollision) {
      score += 4;
    }

    return Math.min(20, score);
  }

  /**
   * フィードバック豊富さの評価（0-20点）
   * 操作に対する反応、演出、音
   */
  private evaluateFeedbackRichness(script: GameScript): number {
    let score = 0;

    // エフェクトアクション（最大8点）
    const effectActions = script.rules.flatMap(rule =>
      (rule.actions || []).filter(a => a.type === 'effect')
    );
    if (effectActions.length > 0) {
      score += Math.min(8, effectActions.length * 2);
    }

    // サウンドアクション（最大6点）
    const soundActions = script.rules.flatMap(rule =>
      (rule.actions || []).filter(a => a.type === 'playSound')
    );
    if (soundActions.length > 0) {
      score += Math.min(6, soundActions.length * 2);
    }

    // スコア/カウンター表示（進捗フィードバック 最大4点）
    const hasScoreAction = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'addScore' || a.type === 'counter')
    );
    if (hasScoreAction) {
      score += 4;
    }

    // 成功/失敗時のフィードバック（最大2点）
    const hasSuccessWithMessage = script.rules.some(rule =>
      rule.actions?.some(a =>
        (a.type === 'success' && a.message) ||
        (a.type === 'failure' && a.message)
      )
    );
    if (hasSuccessWithMessage) {
      score += 2;
    }

    return Math.min(20, score);
  }

  /**
   * チャレンジバランスの評価（0-20点）
   * 難易度の適切さ、失敗の可能性、達成感
   */
  private evaluateChallengeBalance(project: GameProject): number {
    let score = 10; // 中央値からスタート
    const script = project.script;

    // ルール数による複雑度評価
    const ruleCount = script.rules.length;
    if (ruleCount < 2) {
      score -= 5; // 単純すぎる
    } else if (ruleCount >= 3 && ruleCount <= 8) {
      score += 4; // 適切な複雑度
    } else if (ruleCount > 12) {
      score -= 2; // 複雑すぎる可能性
    }

    // 失敗条件の存在（緊張感）
    const hasFailure = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'failure')
    );
    if (hasFailure) {
      score += 4; // 失敗の可能性がゲームを面白くする
    }

    // 時間制限
    const duration = project.settings?.duration?.seconds || 0;
    if (duration >= 5 && duration <= 30) {
      score += 2; // 適切な時間
    } else if (duration < 3 || duration > 60) {
      score -= 2; // 短すぎるor長すぎる
    }

    return Math.max(0, Math.min(20, score));
  }

  /**
   * 進行の明確さの評価（0-20点）
   * ゴールの明確さ、進捗の可視化
   */
  private evaluateProgressionClarity(script: GameScript): number {
    let score = 0;

    // 成功条件の存在（基本点 10点）
    const hasSuccess = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'success')
    );
    if (hasSuccess) {
      score += 10;
    }

    // カウンターによる進捗管理（最大6点）
    const counters = script.counters || [];
    if (counters.length > 0) {
      score += Math.min(6, counters.length * 2);

      // カウンター条件での成功判定（明確なゴール）
      const hasCounterWin = script.rules.some(rule =>
        rule.triggers?.conditions?.some(c => c.type === 'counter') &&
        rule.actions?.some(a => a.type === 'success')
      );
      if (hasCounterWin) {
        score += 4; // 「N個集めたらクリア」のような明確さ
      }
    }

    return Math.min(20, score);
  }

  /**
   * フィードバックと改善提案の生成
   */
  private generateFeedback(
    breakdown: FunBreakdown,
    idea?: GameIdea,
    playabilityCheck?: PlayabilityCheckResult
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // プレイアビリティの致命的問題を最優先で表示
    if (playabilityCheck && !playabilityCheck.isPlayable) {
      issues.push('🚨 CRITICAL: Game is not playable');
      playabilityCheck.criticalIssues.forEach(issue => {
        issues.push(`  - ${issue}`);
      });

      if (playabilityCheck.hasInstantWin) {
        recommendations.push('Increase win condition target value (use score >= 5 instead of score >= 1)');
      }
      if (!playabilityCheck.requiresAction) {
        recommendations.push('Ensure touch conditions are required to increment score');
      }
      if (!playabilityCheck.canFail) {
        recommendations.push('Add failure conditions (e.g., miss counter >= 3, or collision with enemy)');
      }
      if (!playabilityCheck.hasClearGoal) {
        recommendations.push('Add counter-based success conditions for clear goals');
      }
    }

    // 動的要素が低い
    if (breakdown.dynamicElements < 8) {
      issues.push('Static game - lack of movement');
      recommendations.push('Add move actions with time interval conditions');
    }

    // インタラクションが低い
    if (breakdown.interactionQuality < 8) {
      issues.push('Poor interaction design');
      recommendations.push('Add diverse touch interactions (tap, swipe)');
    }

    // フィードバックが低い
    if (breakdown.feedbackRichness < 8) {
      issues.push('Lack of feedback');
      recommendations.push('Add effects and sounds for user actions');
    }

    // チャレンジバランスが低い
    if (breakdown.challengeBalance < 8) {
      issues.push('Unbalanced difficulty');
      if (breakdown.challengeBalance < 5) {
        recommendations.push('Add failure conditions for tension');
      } else {
        recommendations.push('Adjust complexity (aim for 3-8 rules)');
      }
    }

    // 進行が不明確
    if (breakdown.progressionClarity < 8) {
      issues.push('Unclear progression');
      recommendations.push('Add counters and clear win conditions');
    }

    // GameIdeaからの追加情報
    if (idea) {
      if (idea.funScore < 7) {
        issues.push(`Low idea funScore: ${idea.funScore}`);
      }
    }

    return { issues, recommendations };
  }

  /**
   * 簡易評価（スコアのみ）
   */
  quickEvaluate(project: GameProject): number {
    return this.evaluate(project).funScore;
  }

  /**
   * 面白いゲームの条件を満たすかチェック
   */
  meetsFunCriteria(project: GameProject): boolean {
    const result = this.evaluate(project);

    // 全カテゴリで最低6点以上かつ合計50点以上
    const allCategoriesOk = Object.values(result.breakdown).every(v => v >= 6);
    return result.passed && allCategoriesOk;
  }
}

// デフォルトエクスポート
export default FunEvaluator;
