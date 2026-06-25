import { describe, it, expect } from 'vitest';
import { CodeQualityScorer } from '../CodeQualityScorer';
import type { CodeValidationResult } from '../CodeGameValidator';
import type { GameConcept } from '../../v2/types';

const scorer = new CodeQualityScorer();

function makeConcept(overrides?: Partial<GameConcept['selfEvaluation']>): GameConcept {
  return {
    title: 'テスト',
    titleEn: 'Test',
    description: 'test game',
    duration: 10,
    theme: 'test',
    visualStyle: 'simple',
    playerGoal: 'tap',
    playerOperation: 'tap screen',
    successCondition: '3 taps',
    failureCondition: '10s elapsed',
    selfEvaluation: {
      goalClarity: 10,
      operationClarity: 10,
      judgmentClarity: 10,
      acceptance: 10,
      reasoning: 'test',
      ...overrides,
    },
  } as GameConcept;
}

function noErrors(): CodeValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function withErrors(n: number): CodeValidationResult {
  return {
    valid: n === 0,
    errors: Array(n).fill({ code: 'X', message: 'e', severity: 'error' as const }),
    warnings: [],
  };
}

function withWarnings(n: number): CodeValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: Array(n).fill({ code: 'W', message: 'w', severity: 'warning' as const }),
  };
}

describe('CodeQualityScorer – concept スコア', () => {
  it('selfEval 全10 → breakdown.concept = 25', () => {
    const r = scorer.score('', makeConcept(), noErrors());
    expect(r.breakdown.concept).toBe(25);
  });

  it('selfEval 全8 → breakdown.concept = 20', () => {
    const r = scorer.score('', makeConcept({ goalClarity: 8, operationClarity: 8, judgmentClarity: 8, acceptance: 8 }), noErrors());
    expect(r.breakdown.concept).toBe(20);
  });

  it('selfEval 全5 → breakdown.concept = 13 (Math.round(12.5))', () => {
    const r = scorer.score('', makeConcept({ goalClarity: 5, operationClarity: 5, judgmentClarity: 5, acceptance: 5 }), noErrors());
    expect(r.breakdown.concept).toBe(13);
  });
});

describe('CodeQualityScorer – codeStructure スコア', () => {
  it('エラー0 → breakdown.codeStructure = 25', () => {
    const r = scorer.score('', makeConcept(), withErrors(0));
    expect(r.breakdown.codeStructure).toBe(25);
  });

  it('エラー1 → breakdown.codeStructure = 20', () => {
    const r = scorer.score('', makeConcept(), withErrors(1));
    expect(r.breakdown.codeStructure).toBe(20);
  });

  it('エラー5 → breakdown.codeStructure = 0（下限）', () => {
    const r = scorer.score('', makeConcept(), withErrors(5));
    expect(r.breakdown.codeStructure).toBe(0);
  });

  it('エラー10 → breakdown.codeStructure = 0（下限厳守）', () => {
    const r = scorer.score('', makeConcept(), withErrors(10));
    expect(r.breakdown.codeStructure).toBe(0);
  });
});

describe('CodeQualityScorer – playability スコア', () => {
  const fullCode = [
    'game.onUpdate(function(dt){',
    '  game.draw.clear("#000");',
    '  if (elapsed > 10) game.end.failure();',
    '});',
    'game.onTap(function(x, y) { game.end.success(1); });',
  ].join('\n');

  it('onUpdate + 入力ハンドラ + 成功&失敗 → breakdown.playability = 25', () => {
    const r = scorer.score(fullCode, makeConcept(), noErrors());
    expect(r.breakdown.playability).toBe(25);
  });

  it('onUpdate のみ → breakdown.playability = 10', () => {
    const r = scorer.score('game.onUpdate(function(dt){});', makeConcept(), noErrors());
    expect(r.breakdown.playability).toBe(10);
  });

  it('onTap + 成功&失敗 (onUpdate なし) → breakdown.playability = 15', () => {
    const code = 'game.onTap(function(x,y){ game.end.success(1); });\ngame.end.failure();';
    const r = scorer.score(code, makeConcept(), noErrors());
    expect(r.breakdown.playability).toBe(15);
  });

  it('onSwipe も入力ハンドラとして認識される', () => {
    const code = 'game.onUpdate(function(dt){});\ngame.onSwipe(function(dir){});\ngame.end.success();\ngame.end.failure();';
    const r = scorer.score(code, makeConcept(), noErrors());
    expect(r.breakdown.playability).toBe(25);
  });

  it('成功のみ（失敗なし）は +7 を得ない', () => {
    const code = 'game.onUpdate(function(dt){});\ngame.onTap(function(x,y){});\ngame.end.success();';
    const r = scorer.score(code, makeConcept(), noErrors());
    expect(r.breakdown.playability).toBe(18);
  });
});

describe('CodeQualityScorer – apiRichness スコア', () => {
  it('draw 5種 + audio → breakdown.apiRichness = 25', () => {
    const code = [
      'game.draw.image("bg", 0, 0, 100, 100);',
      'game.draw.rect(0, 0, 100, 100, "#fff");',
      'game.draw.circle(50, 50, 20, "#f00");',
      'game.draw.text("hello", 100, 100, {});',
      'game.draw.line(0, 0, 100, 100, "#0f0");',
      'game.audio.play("se_tap");',
    ].join('\n');
    const r = scorer.score(code, makeConcept(), noErrors());
    expect(r.breakdown.apiRichness).toBe(25);
  });

  it('draw 1種のみ → breakdown.apiRichness = 4', () => {
    const r = scorer.score('game.draw.rect(0, 0, 100, 100, "#fff");', makeConcept(), noErrors());
    expect(r.breakdown.apiRichness).toBe(4);
  });

  it('audio のみ（draw なし）→ breakdown.apiRichness = 5', () => {
    const r = scorer.score('game.audio.play("tap");', makeConcept(), noErrors());
    expect(r.breakdown.apiRichness).toBe(5);
  });

  it('何もなし → breakdown.apiRichness = 0', () => {
    const r = scorer.score('', makeConcept(), noErrors());
    expect(r.breakdown.apiRichness).toBe(0);
  });

  it('apiRichness は 25 を超えない', () => {
    const code = [
      'game.draw.image("bg", 0, 0, 100, 100);',
      'game.draw.rect(0, 0, 100, 100, "#fff");',
      'game.draw.circle(50, 50, 20, "#f00");',
      'game.draw.text("hello", 100, 100, {});',
      'game.draw.line(0, 0, 100, 100, "#0f0");',
      'game.audio.play("se_tap");',
      'game.audio.bgm("bgm_main");',
    ].join('\n');
    const r = scorer.score(code, makeConcept(), noErrors());
    expect(r.breakdown.apiRichness).toBeLessThanOrEqual(25);
  });
});

describe('CodeQualityScorer – total スコア', () => {
  it('全項目満点 → total = 100', () => {
    const perfectCode = [
      'game.onUpdate(function(dt){',
      '  game.draw.image("bg", 0, 0, 1080, 1920);',
      '  game.draw.rect(0, 0, 100, 100, "#fff");',
      '  game.draw.circle(50, 50, 20, "#f00");',
      '  game.draw.text("score", 100, 100, {});',
      '  game.draw.line(0, 0, 100, 100, "#0f0");',
      '  game.audio.play("se_tap");',
      '  if (elapsed > 10) game.end.failure();',
      '});',
      'game.onTap(function(x, y) { game.end.success(1); });',
    ].join('\n');
    const r = scorer.score(perfectCode, makeConcept(), noErrors());
    expect(r.total).toBe(100);
  });

  it('total は 100 を超えない', () => {
    const overloadCode = [
      'game.onUpdate(function(dt){});',
      'game.onTap(function(x,y){});',
      'game.end.success();',
      'game.end.failure();',
      'game.draw.image("i",0,0,1,1);',
      'game.draw.rect(0,0,1,1,"#fff");',
      'game.draw.circle(0,0,1,"#fff");',
      'game.draw.text("t",0,0,{});',
      'game.draw.line(0,0,1,1,"#fff");',
      'game.audio.play("s");',
    ].join('\n');
    const r = scorer.score(overloadCode, makeConcept(), noErrors());
    expect(r.total).toBeLessThanOrEqual(100);
  });
});

describe('CodeQualityScorer – validationErrors / validationWarnings', () => {
  it('エラー数を validationErrors に反映する', () => {
    const r = scorer.score('', makeConcept(), withErrors(3));
    expect(r.validationErrors).toBe(3);
  });

  it('警告数を validationWarnings に反映する', () => {
    const r = scorer.score('', makeConcept(), withWarnings(2));
    expect(r.validationWarnings).toBe(2);
  });
});

describe('CodeQualityScorer – report()', () => {
  it('report() は throw しない', () => {
    const r = scorer.score('', makeConcept(), noErrors());
    expect(() => scorer.report(r)).not.toThrow();
  });
});
