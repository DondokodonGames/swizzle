/**
 * Step 9: QualityScorer
 *
 * スコアの構成（計100点）:
 *   50点: DryRunSimulator の信頼度（実際に遊べるかどうか）
 *   25点: コンセプト自己評価の平均（4指標）
 *   20点: 画像品質（ImageQualityChecker の平均。プレースホルダーは0点扱い）
 *    5点: 初回バリデーション通過ボーナス
 *
 * confidence high   → base 50点
 * confidence medium → base 30点
 * confidence low    → 8点（通常 Orchestrator でゲート済み）
 *
 * 画像品質が未計測（mock / claude-svg / DRY_RUN）の場合は中立の12点を与え、
 * ローカル実行が公開ゲートで不当に落ちないようにする。
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameConcept, GeneratedAssets, QualityScore } from './types';

interface SimulationSummary {
  playable: boolean;
  confidence: 'high' | 'medium' | 'low';
  requiredTaps?: number;
}

/** 画像品質が未計測の場合に与える中立点（20点満点中） */
const IMAGE_SCORE_NEUTRAL = 12;

export class QualityScorer {
  /**
   * 品質スコアを計算
   */
  score(
    concept: GameConcept,
    project: GameProject,
    validationPassedFirstTry: boolean,
    simulation: SimulationSummary,
    assets?: GeneratedAssets
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

      // 画像品質（Vision QA 有効時のみ）
      imageQualityAverage: assets?.imageQuality?.averageScore,
      placeholderCount: assets?.imageQuality?.placeholderCount,

      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 総合スコアを計算
   *
   * DryRunSimulator の信頼度を主軸に、
   * 自己評価と画像品質を副軸として組み合わせる。
   */
  calculateOverallScore(qualityScore: QualityScore): number {
    // ① シミュレーション信頼度 → 0〜50点
    let simBase: number;
    switch (qualityScore.simulationConfidence) {
      case 'high':   simBase = 50; break;
      case 'medium': simBase = 30; break;
      default:       simBase = 8; // low（通常ここには来ない）
    }

    // ② 自己評価平均 → 0〜25点
    const selfAvg = (
      qualityScore.goalClarity +
      qualityScore.operationClarity +
      qualityScore.judgmentClarity +
      qualityScore.acceptance
    ) / 4;
    const selfScore = Math.round((selfAvg / 10) * 25);

    // ③ 画像品質 → 0〜20点（未計測なら中立12点）
    const imageScore = qualityScore.imageQualityAverage !== undefined
      ? Math.round((qualityScore.imageQualityAverage / 100) * 20)
      : IMAGE_SCORE_NEUTRAL;

    // ④ 初回通過ボーナス → 5点
    const firstTryBonus = qualityScore.validationPassedFirstTry ? 5 : 0;

    return Math.min(100, simBase + selfScore + imageScore + firstTryBonus);
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

    const imageLine = qualityScore.imageQualityAverage !== undefined
      ? `  画像品質: ${qualityScore.imageQualityAverage}/100` +
        (qualityScore.placeholderCount ? ` (プレースホルダー ${qualityScore.placeholderCount}件)` : '')
      : '  画像品質: 未計測（中立扱い）';

    return [
      `総合スコア: ${overall}点 (${label})`,
      `  シミュレーション: ${qualityScore.simulationConfidence} / ${qualityScore.simulationRequiredTaps}taps`,
      `  目標明確性: ${qualityScore.goalClarity}/10`,
      `  操作明確性: ${qualityScore.operationClarity}/10`,
      `  判定明確性: ${qualityScore.judgmentClarity}/10`,
      `  納得感: ${qualityScore.acceptance}/10`,
      imageLine,
      `  ルール数: ${qualityScore.ruleCount}`,
      `  オブジェクト数: ${qualityScore.objectCount}`,
      `  一発合格: ${qualityScore.validationPassedFirstTry ? 'Yes' : 'No'}`
    ].join('\n');
  }
}
