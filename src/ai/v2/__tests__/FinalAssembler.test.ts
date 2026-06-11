import { describe, it, expect } from 'vitest';
import { FinalAssembler } from '../FinalAssembler';
import { LogicGeneratorOutput, GameConcept, GeneratedAssets } from '../types';
import { CURRENT_SCHEMA_VERSION } from '../SchemaMigrator';

const mockConcept: GameConcept = {
  title: 'Test Game', titleEn: 'Test Game', description: 'A test', duration: 5,
  theme: 'test', visualStyle: 'test',
  playerGoal: 'tap', playerOperation: 'tap screen', successCondition: 'tap 3 times', failureCondition: 'never',
  selfEvaluation: { goalClarity: 8, operationClarity: 8, judgmentClarity: 8, acceptance: 8, reasoning: '' },
};

const mockAssets: GeneratedAssets = {
  background: null,
  objects: [{ id: 'ball', name: 'ball', imageUrl: 'data:image/png;base64,x', frames: [{ dataUrl: 'data:image/png;base64,x' }] }],
  sounds: [],
};

function makeLogicOutput(overrides: Partial<LogicGeneratorOutput['script']> = {}): LogicGeneratorOutput {
  return {
    script: {
      layout: { objects: [{ objectId: 'ball', position: { x: 0.5, y: 0.5 }, scale: 1 }] },
      counters: [{ id: 'score', name: 'score', initialValue: 0, currentValue: 0, min: 0, max: 10 }],
      rules: [],
      ...overrides,
    },
    assetPlan: { objects: [], background: null as any, sounds: [] },
    selfCheck: {
      hasPlayerActionOnSuccessPath: true,
      counterInitialValuesSafe: true,
      allObjectIdsValid: true,
      allCounterNamesValid: true,
      coordinatesInRange: true,
      onlyVerifiedFeaturesUsed: true,
    },
  };
}

describe('FinalAssembler – カウンター初期化', () => {
  it('counters は c.id をキーに初期化される', () => {
    const assembler = new FinalAssembler();
    const output = makeLogicOutput({
      counters: [{ id: 'my_counter', name: 'My Counter', initialValue: 7, currentValue: 7, min: 0, max: 100 }],
    });
    const result = assembler.assemble(mockConcept, output, mockAssets);
    const counters = result.project.script?.initialState?.gameState?.counters as Record<string, number> | undefined;
    expect(counters?.['my_counter']).toBe(7);
  });

  it('複数カウンターが全て正しく初期化される', () => {
    const assembler = new FinalAssembler();
    const output = makeLogicOutput({
      counters: [
        { id: 'lives', name: 'lives', initialValue: 3, currentValue: 3, min: 0, max: 3 },
        { id: 'score', name: 'score', initialValue: 0, currentValue: 0, min: 0, max: 999 },
      ],
    });
    const result = assembler.assemble(mockConcept, output, mockAssets);
    const counters = result.project.script?.initialState?.gameState?.counters as Record<string, number> | undefined;
    expect(counters?.['lives']).toBe(3);
    expect(counters?.['score']).toBe(0);
  });
});

describe('FinalAssembler – フラグ初期化', () => {
  it('script.flags が未定義のとき gameState.flags は空オブジェクト', () => {
    const assembler = new FinalAssembler();
    const output = makeLogicOutput();
    const result = assembler.assemble(mockConcept, output, mockAssets);
    const flags = result.project.script?.initialState?.gameState?.flags as Record<string, boolean> | undefined;
    expect(flags).toEqual({});
  });

  it('logicOutput.script.flags から gameState.flags が生成される（修正済みバグ）', () => {
    const assembler = new FinalAssembler();
    const output = makeLogicOutput();
    output.script.flags = [
      { id: 'launched', name: 'Launched', initialValue: false },
      { id: 'powered', name: 'Powered', initialValue: true },
    ];
    const result = assembler.assemble(mockConcept, output, mockAssets);
    const flags = result.project.script?.initialState?.gameState?.flags as Record<string, boolean> | undefined;
    expect(flags?.['launched']).toBe(false);
    expect(flags?.['powered']).toBe(true);
  });

  it('initialValue=true のフラグが true で初期化される', () => {
    const assembler = new FinalAssembler();
    const output = makeLogicOutput();
    output.script.flags = [{ id: 'active', name: 'Active', initialValue: true }];
    const result = assembler.assemble(mockConcept, output, mockAssets);
    const flags = result.project.script?.initialState?.gameState?.flags as Record<string, boolean> | undefined;
    expect(flags?.['active']).toBe(true);
  });

  it('script.flags 定義も空でなくなる（修正済みバグ）', () => {
    const assembler = new FinalAssembler();
    const output = makeLogicOutput();
    output.script.flags = [{ id: 'used', name: 'Used', initialValue: false }];
    const result = assembler.assemble(mockConcept, output, mockAssets);
    const scriptFlags = result.project.script?.flags as unknown[] as unknown[];
    expect(scriptFlags?.length).toBeGreaterThan(0);
  });
});

describe('FinalAssembler – schemaVersion', () => {
  it('アセンブル済みプロジェクトに schemaVersion が付与される', () => {
    const assembler = new FinalAssembler();
    const result = assembler.assemble(mockConcept, makeLogicOutput(), mockAssets);
    expect((result.project as Record<string, unknown>)['schemaVersion']).toBe(CURRENT_SCHEMA_VERSION);
  });
});
