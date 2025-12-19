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
  issues: string[];           // 問題点
  recommendations: string[];  // 改善提案
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

    const funScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const passed = funScore >= 50;

    const { issues, recommendations } = this.generateFeedback(breakdown, idea);

    return {
      funScore,
      passed,
      breakdown,
      issues,
      recommendations
    };
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
    idea?: GameIdea
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

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
