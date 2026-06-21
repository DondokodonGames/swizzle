import { GameConcept } from '../v2/types.js';
import { CodeValidationResult } from './CodeGameValidator.js';

export interface CodeQualityScore {
  total: number;
  breakdown: {
    concept: number;       // 0–25
    codeStructure: number; // 0–25
    playability: number;   // 0–25
    apiRichness: number;   // 0–25
  };
  validationErrors: number;
  validationWarnings: number;
}

const DRAW_METHODS = ['game.draw.image', 'game.draw.rect', 'game.draw.circle', 'game.draw.text', 'game.draw.line'];
const INPUT_HANDLERS = ['game.onTap', 'game.onSwipe', 'game.onHold'];
const AUDIO_METHODS = ['game.audio.play', 'game.audio.bgm'];

export class CodeQualityScorer {
  score(code: string, concept: GameConcept, validationResult: CodeValidationResult): CodeQualityScore {
    const se = concept.selfEvaluation;
    const conceptScore = Math.round(
      ((se.goalClarity + se.operationClarity + se.judgmentClarity + se.acceptance) / 4) * 2.5
    );

    const codeStructureScore = Math.max(0, 25 - validationResult.errors.length * 5);

    let playability = 0;
    if (code.includes('game.onUpdate')) playability += 10;
    if (INPUT_HANDLERS.some(h => code.includes(h))) playability += 8;
    if (code.includes('game.end.success') && code.includes('game.end.failure')) playability += 7;

    const uniqueDrawCalls = DRAW_METHODS.filter(m => code.includes(m)).length;
    const hasAudio = AUDIO_METHODS.some(m => code.includes(m));
    const apiRichnessScore = Math.min(25, uniqueDrawCalls * 4 + (hasAudio ? 5 : 0));

    const total = conceptScore + codeStructureScore + playability + apiRichnessScore;

    return {
      total: Math.min(100, total),
      breakdown: {
        concept: conceptScore,
        codeStructure: codeStructureScore,
        playability,
        apiRichness: apiRichnessScore,
      },
      validationErrors: validationResult.errors.length,
      validationWarnings: validationResult.warnings.length,
    };
  }

  report(score: CodeQualityScore): void {
    const { total, breakdown } = score;
    const grade = total >= 80 ? '🟢' : total >= 60 ? '🟡' : '🔴';
    console.log(`   ${grade} 品質スコア: ${total}/100`);
    console.log(`      コンセプト: ${breakdown.concept}/25`);
    console.log(`      コード構造: ${breakdown.codeStructure}/25`);
    console.log(`      遊びやすさ: ${breakdown.playability}/25`);
    console.log(`      API多様性:  ${breakdown.apiRichness}/25`);
    if (score.validationErrors > 0) {
      console.log(`      ⚠️  バリデーションエラー: ${score.validationErrors}件`);
    }
    if (score.validationWarnings > 0) {
      console.log(`      ⚠️  警告: ${score.validationWarnings}件`);
    }
  }
}
