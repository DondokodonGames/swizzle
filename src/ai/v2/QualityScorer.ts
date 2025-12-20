/**
 * Step 7: QualityScorer
 *
 * 参考情報として記録（合否判定には使用しない）
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameConcept, QualityScore } from './types';

export class QualityScorer {
  /**
   * 品質スコアを計算
   */
  score(concept: GameConcept, project: GameProject, validationPassedFirstTry: boolean): QualityScore {
    return {
      // 4つの明確性（コンセプト時点の自己評価を転記）
      goalClarity: concept.selfEvaluation.goalClarity,
      operationClarity: concept.selfEvaluation.operationClarity,
      judgmentClarity: concept.selfEvaluation.judgmentClarity,
      acceptance: concept.selfEvaluation.acceptance,

      // 技術的指標
      ruleCount: project.script?.rules?.length || 0,
      objectCount: project.assets?.objects?.length || 0,
      validationPassedFirstTry,

      // タイムスタンプ
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 総合スコアを計算（参考値）
   */
  calculateOverallScore(qualityScore: QualityScore): number {
    const clarityAverage = (
      qualityScore.goalClarity +
      qualityScore.operationClarity +
      qualityScore.judgmentClarity +
      qualityScore.acceptance
    ) / 4;

    // 10点満点を100点満点に変換
    return Math.round(clarityAverage * 10);
  }

  /**
   * スコアの評価ラベル
   */
  getLabel(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'acceptable';
    return 'poor';
  }

  /**
   * スコアサマリーを生成
   */
  getSummary(qualityScore: QualityScore): string {
    const overall = this.calculateOverallScore(qualityScore);
    const label = this.getLabel(overall);

    return [
      `総合スコア: ${overall}点 (${label})`,
      `目標明確性: ${qualityScore.goalClarity}/10`,
      `操作明確性: ${qualityScore.operationClarity}/10`,
      `判定明確性: ${qualityScore.judgmentClarity}/10`,
      `納得感: ${qualityScore.acceptance}/10`,
      `ルール数: ${qualityScore.ruleCount}`,
      `オブジェクト数: ${qualityScore.objectCount}`,
      `一発合格: ${qualityScore.validationPassedFirstTry ? 'Yes' : 'No'}`
    ].join('\n');
  }
}
