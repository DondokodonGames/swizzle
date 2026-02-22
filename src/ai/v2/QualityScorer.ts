/**
 * Step 9: QualityScorer
 *
 * スコアの構成:
 *   65%: DryRunSimulator の信頼度（実際に遊べるかどうか）
 *   30%: コンセプト自己評価の平均（4指標）
 *    5%: 初回バリデーション通過ボーナス
 *
 * confidence high   → base 65点
 * confidence medium → base 40点
 * confidence low    → ここには来ない（Orchestratorでゲート済み）
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameConcept, QualityScore } from './types';

interface SimulationSummary {
  playable: boolean;
  confidence: 'high' | 'medium' | 'low';
  requiredTaps?: number;
}

export class QualityScorer {
  /**
   * 品質スコアを計算
   */
  score(
    concept: GameConcept,
    project: GameProject,
    validationPassedFirstTry: boolean,
    simulation: SimulationSummary
  ): QualityScore {
    return {
      // コンセプト自己評価（LLMによる自己採点）
      goalClarity: concept.selfEvaluation.goalClarity,
      operationClarity: concept.selfEvaluation.operationClarity,
      judgmentClarity: concept.selfEvaluation.judgmentClarity,
      acceptance: concept.selfEvaluation.acceptance,

      // 技術的指標
      ruleCount: project.script?.rules?.length || 0,
      objectCount: project.assets?.objects?.length || 0,
      validationPassedFirstTry,

      // DryRunSimulator 結果（スコアリングの主軸）
      simulationConfidence: simulation.confidence,
      simulationPlayable: simulation.playable,
      simulationRequiredTaps: simulation.requiredTaps ?? 0,

      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 総合スコアを計算
   *
   * DryRunSimulator の信頼度を主軸に、
   * 自己評価を副軸として組み合わせる。
   */
  calculateOverallScore(qualityScore: QualityScore): number {
    // ① シミュレーション信頼度 → 0〜65点
    let simBase: number;
    switch (qualityScore.simulationConfidence) {
      case 'high':   simBase = 65; break;
      case 'medium': simBase = 40; break;
      default:       simBase = 10; // low（通常ここには来ない）
    }

    // ② 自己評価平均 → 0〜30点
    const selfAvg = (
      qualityScore.goalClarity +
      qualityScore.operationClarity +
      qualityScore.judgmentClarity +
      qualityScore.acceptance
    ) / 4;
    const selfScore = Math.round((selfAvg / 10) * 30);

    // ③ 初回通過ボーナス → 5点
    const firstTryBonus = qualityScore.validationPassedFirstTry ? 5 : 0;

    return Math.min(100, simBase + selfScore + firstTryBonus);
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
      `  シミュレーション: ${qualityScore.simulationConfidence} / ${qualityScore.simulationRequiredTaps}taps`,
      `  目標明確性: ${qualityScore.goalClarity}/10`,
      `  操作明確性: ${qualityScore.operationClarity}/10`,
      `  判定明確性: ${qualityScore.judgmentClarity}/10`,
      `  納得感: ${qualityScore.acceptance}/10`,
      `  ルール数: ${qualityScore.ruleCount}`,
      `  オブジェクト数: ${qualityScore.objectCount}`,
      `  一発合格: ${qualityScore.validationPassedFirstTry ? 'Yes' : 'No'}`
    ].join('\n');
  }
}
