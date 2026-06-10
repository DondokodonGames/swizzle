import { describe, it, expect } from 'vitest';
import { QualityScorer } from '../QualityScorer';
import { GameConcept, GeneratedAssets, QualityScore } from '../types';
import { GameProject } from '../../../types/editor/GameProject';

const scorer = new QualityScorer();

function makeConcept(selfEval: number): GameConcept {
  return {
    title: 'テスト', titleEn: 'Test', description: 'テスト', duration: 7,
    theme: 'テスト', visualStyle: 'シンプル',
    playerGoal: 'goal', playerOperation: 'tap', successCondition: '1', failureCondition: '1',
    selfEvaluation: {
      goalClarity: selfEval, operationClarity: selfEval,
      judgmentClarity: selfEval, acceptance: selfEval, reasoning: 'test'
    }
  };
}

const emptyProject = { script: { rules: [] }, assets: { objects: [] } } as unknown as GameProject;

function makeScore(overrides: Partial<QualityScore> = {}): QualityScore {
  return {
    goalClarity: 10, operationClarity: 10, judgmentClarity: 10, acceptance: 10,
    ruleCount: 0, objectCount: 0, validationPassedFirstTry: true,
    simulationConfidence: 'high', simulationPlayable: true, simulationRequiredTaps: 1,
    generatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('QualityScorer – 配点（50/25/20/5）', () => {
  it('満点ケース: high + 自己評価10 + 画像100 + 初回合格 = 100', () => {
    const score = makeScore({ imageQualityAverage: 100 });
    expect(scorer.calculateOverallScore(score)).toBe(100);
  });

  it('画像未計測時は中立12点（50+25+12+5 = 92）', () => {
    const score = makeScore({ imageQualityAverage: undefined });
    expect(scorer.calculateOverallScore(score)).toBe(92);
  });

  it('画像0点（全プレースホルダー）は20点バケットが0になる', () => {
    const withImages = scorer.calculateOverallScore(makeScore({ imageQualityAverage: 100 }));
    const placeholder = scorer.calculateOverallScore(makeScore({ imageQualityAverage: 0 }));
    expect(withImages - placeholder).toBe(20);
  });

  it('confidence medium は base 30', () => {
    const score = makeScore({ simulationConfidence: 'medium', imageQualityAverage: 0, validationPassedFirstTry: false });
    // 30 + 25 + 0 + 0 = 55
    expect(scorer.calculateOverallScore(score)).toBe(55);
  });

  it('confidence low は base 8', () => {
    const score = makeScore({ simulationConfidence: 'low', imageQualityAverage: 0, validationPassedFirstTry: false });
    expect(scorer.calculateOverallScore(score)).toBe(8 + 25);
  });

  it('100点を超えない', () => {
    expect(scorer.calculateOverallScore(makeScore({ imageQualityAverage: 100 }))).toBeLessThanOrEqual(100);
  });
});

describe('QualityScorer – score() のアセット連携', () => {
  it('assets.imageQuality が QualityScore に転記される', () => {
    const assets: GeneratedAssets = {
      background: null, objects: [], sounds: [],
      imageQuality: { averageScore: 72, checkedCount: 5, placeholderCount: 2, regeneratedCount: 1 }
    };
    const qs = scorer.score(makeConcept(8), emptyProject, true,
      { playable: true, confidence: 'high', requiredTaps: 3 }, assets);
    expect(qs.imageQualityAverage).toBe(72);
    expect(qs.placeholderCount).toBe(2);
  });

  it('assets 省略時は imageQualityAverage が undefined', () => {
    const qs = scorer.score(makeConcept(8), emptyProject, true,
      { playable: true, confidence: 'high', requiredTaps: 3 });
    expect(qs.imageQualityAverage).toBeUndefined();
  });
});

describe('QualityScorer – getLabel 境界値', () => {
  it.each([
    [90, 'excellent'], [89, 'good'], [75, 'good'], [74, 'acceptable'], [60, 'acceptable'], [59, 'poor']
  ] as const)('%i点 → %s', (score, label) => {
    expect(scorer.getLabel(score)).toBe(label);
  });
});
