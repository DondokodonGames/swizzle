/**
 * Step 2: ConceptValidator
 *
 * Step 1の自己評価が正しいかダブルチェック
 */

import { GameConcept, ConceptValidationResult } from './types';

export class ConceptValidator {
  /**
   * コンセプトを検証
   */
  validate(concept: GameConcept): ConceptValidationResult {
    const issues: string[] = [];

    // 目標明確性チェック
    if (!concept.playerGoal.match(/[0-9]+/)) {
      issues.push('playerGoalに具体的な数値がありません');
    }
    if (concept.playerGoal.length < 15) {
      issues.push('playerGoalが短すぎます。もっと具体的に記述してください');
    }

    // 操作明確性チェック
    const operationKeywords = ['タップ', 'スワイプ', 'ドラッグ', '長押し', 'tap', 'swipe', 'drag', 'hold'];
    const hasOperationKeyword = operationKeywords.some(kw =>
      concept.playerOperation.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasOperationKeyword) {
      issues.push('playerOperationに操作方法（タップ/スワイプ/ドラッグ/長押し）が明記されていません');
    }

    // 成功条件チェック
    if (!concept.successCondition.match(/[0-9]+/)) {
      issues.push('successConditionに具体的な数値がありません');
    }

    // 失敗条件チェック
    if (!concept.failureCondition.match(/[0-9]+/)) {
      issues.push('failureConditionに具体的な数値がありません');
    }
    const failureOnlyTimeout = /^(時間切れ|タイムアウト|timeout|time\s*out)$/i.test(
      concept.failureCondition.trim()
    );
    if (failureOnlyTimeout) {
      issues.push('失敗条件が「時間切れ」だけでは納得感がありません。プレイヤーの操作ミスによる失敗条件を追加してください');
    }

    // durationチェック
    if (concept.duration < 5 || concept.duration > 15) {
      issues.push(`duration(${concept.duration}秒)が範囲外です。5〜15秒にしてください`);
    }

    // 自己評価の妥当性チェック（極端に高い場合は疑う）
    const { goalClarity, operationClarity, judgmentClarity, acceptance } = concept.selfEvaluation;
    if (goalClarity === 10 && operationClarity === 10 && judgmentClarity === 10 && acceptance === 10) {
      // 全て10点は過大評価の可能性
      if (concept.playerGoal.length < 30) {
        issues.push('自己評価が全て10点ですが、playerGoalの記述が十分に詳細ではありません');
      }
    }

    // 整合性チェック
    // successConditionの数値とplayerGoalの数値が一致しているか
    const successNumbers = concept.successCondition.match(/\d+/g);
    const goalNumbers = concept.playerGoal.match(/\d+/g);
    if (successNumbers && goalNumbers) {
      const hasOverlap = successNumbers.some(sn => goalNumbers.includes(sn));
      if (!hasOverlap) {
        issues.push('successConditionの数値とplayerGoalの数値が一致しません。整合性を確認してください');
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      feedback: issues.map(i => `修正してください: ${i}`)
    };
  }

  /**
   * 問題の深刻度を判定
   */
  getSeverity(result: ConceptValidationResult): 'none' | 'minor' | 'major' | 'critical' {
    if (result.passed) return 'none';
    if (result.issues.length === 1) return 'minor';
    if (result.issues.length <= 3) return 'major';
    return 'critical';
  }
}
