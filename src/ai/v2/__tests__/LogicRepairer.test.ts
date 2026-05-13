import { describe, it, expect } from 'vitest';
import { LogicRepairer } from '../LogicRepairer';
import { LogicGeneratorOutput, GameConcept } from '../types';
import { GameSpecification } from '../SpecificationGenerator';

function makeOutput(counterInitialValue: number, threshold: number): LogicGeneratorOutput {
  return {
    script: {
      layout: { objects: [] },
      counters: [{ id: 'hp', name: 'hp', initialValue: counterInitialValue, currentValue: counterInitialValue, min: 0, max: 100 }],
      rules: [
        {
          id: 'fail-rule',
          name: 'fail-rule',
          enabled: true,
          priority: 50,
          targetObjectId: 'stage',
          triggers: {
            operator: 'AND',
            conditions: [{ type: 'counter', counterName: 'hp', comparison: 'greaterOrEqual', value: threshold }]
          },
          actions: [{ type: 'failure' }],
        }
      ],
    },
    assetPlan: { objects: [], background: null as any, sounds: [] },
    selfCheck: {
      hasPlayerActionOnSuccessPath: true,
      counterInitialValuesSafe: false,
      allObjectIdsValid: true,
      allCounterNamesValid: true,
      coordinatesInRange: true,
      onlyVerifiedFeaturesUsed: true,
    },
  };
}

const mockConcept: GameConcept = {
  title: 'Test', titleEn: 'Test', description: 'Test', duration: 5,
  theme: 'test', visualStyle: 'test',
  playerGoal: 'test', playerOperation: 'test',
  successCondition: 'test', failureCondition: 'test',
  selfEvaluation: { goalClarity: 8, operationClarity: 8, judgmentClarity: 8, acceptance: 8, reasoning: '' },
};

const mockSpec: GameSpecification = {
  title: 'Test', description: '', duration: 5,
  objects: [], layout: [], rules: [], successCondition: '', failureCondition: '',
};

describe('LogicRepairer – INSTANT_LOSE 修復', () => {
  it('initialValue が閾値以上の場合、threshold-1 に修正される（修正済みバグ）', async () => {
    const repairer = new LogicRepairer({ dryRun: true });
    const output = makeOutput(5, 3); // initialValue=5, threshold=3 → 即失敗

    const result = await repairer.repair(
      output,
      {
        valid: false,
        errors: [{
          type: 'critical',
          code: 'INSTANT_LOSE',
          message: `即失敗: カウンター "hp" の初期値(5)が失敗閾値(3)以上`,
        }],
      },
      mockConcept,
      mockSpec
    );

    const repairedCounter = result.repairedOutput.script.counters.find(c => c.id === 'hp');
    expect(repairedCounter?.initialValue).toBe(2); // threshold(3) - 1 = 2
  });

  it('threshold=0 のとき initialValue は 0 に修正される（マイナスにならない）', async () => {
    const repairer = new LogicRepairer({ dryRun: true });
    const output = makeOutput(0, 0); // initialValue=0, threshold=0 → 即失敗

    const result = await repairer.repair(
      output,
      {
        valid: false,
        errors: [{
          type: 'critical',
          code: 'INSTANT_LOSE',
          message: `即失敗: カウンター "hp" の初期値(0)が失敗閾値(0)以上`,
        }],
      },
      mockConcept,
      mockSpec
    );

    const repairedCounter = result.repairedOutput.script.counters.find(c => c.id === 'hp');
    expect(repairedCounter?.initialValue).toBe(0); // Math.max(0, 0-1) = 0
  });

  it('閾値に問題がなければ修復しない（valid な場合は repair 対象にならない）', async () => {
    const repairer = new LogicRepairer({ dryRun: true });
    const output = makeOutput(0, 5); // initialValue=0 < threshold=5 → 問題なし

    const result = await repairer.repair(
      output,
      { valid: true, errors: [] },
      mockConcept,
      mockSpec
    );

    const repairedCounter = result.repairedOutput.script.counters.find(c => c.id === 'hp');
    expect(repairedCounter?.initialValue).toBe(0); // 変更なし
    expect(result.repairsApplied).toHaveLength(0);
  });

  it('小数の失敗閾値（5.5）でも INSTANT_LOSE が修復される（修正済みバグ: \\d+ → [\\d.]+）', async () => {
    const repairer = new LogicRepairer({ dryRun: true });
    const output = makeOutput(6, 5); // initialValue=6, threshold=5.5 想定

    // メッセージに小数の閾値を含む
    const result = await repairer.repair(
      output,
      {
        valid: false,
        errors: [{
          type: 'critical',
          code: 'INSTANT_LOSE',
          message: `即失敗: カウンター "hp" の初期値(6)が失敗閾値(5.5)以上`,
        }],
      },
      mockConcept,
      mockSpec
    );

    const repairedCounter = result.repairedOutput.script.counters.find(c => c.id === 'hp');
    // Math.max(0, 5.5 - 1) = 4.5
    expect(repairedCounter?.initialValue).toBe(4.5);
    expect(result.repairsApplied).toHaveLength(1);
  });
});
