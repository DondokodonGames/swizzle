/**
 * Step 2: ConceptValidator
 *
 * Step 1の自己評価が正しいかダブルチェック
 * 緩和版: 警告とクリティカルエラーを分離
 */

import { GameConcept, ConceptValidationResult } from './types';

export class ConceptValidator {
  /**
   * コンセプトを検証
   */
  validate(concept: GameConcept): ConceptValidationResult {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    // === クリティカル: これがないとゲームにならない ===

    // 操作明確性チェック（必須）
    const operationKeywords = ['タップ', 'スワイプ', 'ドラッグ', '長押し', 'tap', 'swipe', 'drag', 'hold', 'フリック', 'flick'];
    const hasOperationKeyword = operationKeywords.some(kw =>
      concept.playerOperation.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasOperationKeyword) {
      criticalIssues.push('playerOperationに操作方法（タップ/スワイプ/ドラッグ/長押し）が明記されていません');
    }

    // durationチェック（必須）
    if (concept.duration < 3 || concept.duration > 20) {
      criticalIssues.push(`duration(${concept.duration}秒)が範囲外です。3〜20秒にしてください`);
    }

    // playerGoalが空または極端に短い（必須）
    if (!concept.playerGoal || concept.playerGoal.length < 5) {
      criticalIssues.push('playerGoalが指定されていないか、極端に短いです');
    }

    // successConditionが空（必須）
    if (!concept.successCondition || concept.successCondition.length < 5) {
      criticalIssues.push('successConditionが指定されていないか、極端に短いです');
    }

    // === 警告: あると良いが、なくてもゲームは成立する ===

    // 目標に数値があるとより明確
    if (!concept.playerGoal.match(/[0-9]+/) && !concept.playerGoal.match(/(全て|すべて|全部|all)/i)) {
      warnings.push('playerGoalに数値または「全て」がありません（推奨）');
    }

    // 成功条件に数値があるとより明確
    if (!concept.successCondition.match(/[0-9]+/) && !concept.successCondition.match(/(全て|すべて|全部|all|到達|ゴール)/i)) {
      warnings.push('successConditionに数値がありません（推奨）');
    }

    // 失敗条件チェック
    const failureOnlyTimeout = /^(時間切れ|タイムアウト|timeout|time\s*out)$/i.test(
      concept.failureCondition.trim()
    );
    if (failureOnlyTimeout) {
      warnings.push('失敗条件が「時間切れ」のみ。プレイヤー操作による失敗条件があるとより良い');
    }

    // 自己評価の妥当性チェック（警告のみ）
    const { goalClarity, operationClarity, judgmentClarity, acceptance } = concept.selfEvaluation;
    if (goalClarity === 10 && operationClarity === 10 && judgmentClarity === 10 && acceptance === 10) {
      if (concept.playerGoal.length < 20) {
        warnings.push('自己評価が全て10点ですが、playerGoalの記述が十分に詳細ではないかもしれません');
      }
    }

    // すべてのissuesを結合（クリティカルが優先）
    const allIssues = [...criticalIssues, ...warnings];

    return {
      passed: criticalIssues.length === 0,  // クリティカルがなければ通過
      issues: allIssues,
      feedback: criticalIssues.length > 0
        ? criticalIssues.map(i => `修正必須: ${i}`)
        : warnings.map(i => `推奨: ${i}`)
    };
  }

  /**
   * 問題の深刻度を判定
   */
  getSeverity(result: ConceptValidationResult): 'none' | 'minor' | 'major' | 'critical' {
    if (result.passed) return 'none';
    // passed が false ならクリティカルな問題がある
    return 'critical';
  }
}
