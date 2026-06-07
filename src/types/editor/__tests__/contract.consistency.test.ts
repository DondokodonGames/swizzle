import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ALL_ACTION_TYPES,
  ALL_CONDITION_TYPES,
  ENGINE_INTERNAL_ACTIONS,
  AI_EXCLUDED_ACTIONS,
  GENERATABLE_ACTIONS,
  GENERATABLE_CONDITIONS,
  MOVEMENT_TYPES,
  EFFECT_TYPES,
  COUNTER_OPERATIONS,
  COUNTER_COMPARISONS,
  TOUCH_TYPES,
} from '../contract';

// 単一の正解(contract.ts)と、ルールエンジン実装 / platform_constraints.json が
// 一致していることを保証する。ドリフトが起きるとここで失敗する。

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

/** 指定 switch 文(最初の default まで)内の case ラベルを抽出する */
function extractSwitchCases(source: string, switchHeader: string): string[] {
  const start = source.indexOf(switchHeader);
  if (start === -1) throw new Error(`switch not found: ${switchHeader}`);
  const end = source.indexOf('default:', start);
  const body = source.slice(start, end === -1 ? undefined : end);
  const labels = new Set<string>();
  const re = /case\s+'([a-zA-Z]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) labels.add(m[1]);
  return [...labels];
}

const sorted = (arr: readonly string[]) => [...arr].sort();

describe('contract ⇔ ルールエンジン 整合性', () => {
  it('ActionExecutor の dispatch switch が ALL_ACTION_TYPES と一致する', () => {
    const src = read('src/services/rule-engine/ActionExecutor.ts');
    const cases = extractSwitchCases(src, 'switch (action.type)');
    expect(sorted(cases)).toEqual(sorted(ALL_ACTION_TYPES));
  });

  it('ConditionEvaluator の switch が ALL_CONDITION_TYPES と一致する', () => {
    const src = read('src/services/rule-engine/ConditionEvaluator.ts');
    const cases = extractSwitchCases(src, 'switch (condition.type)');
    expect(sorted(cases)).toEqual(sorted(ALL_CONDITION_TYPES));
  });

  it('GENERATABLE_ACTIONS = 全アクション − AI除外アクション', () => {
    const expected = ALL_ACTION_TYPES.filter((a) => !AI_EXCLUDED_ACTIONS.includes(a as any));
    expect(sorted(GENERATABLE_ACTIONS)).toEqual(sorted(expected));
  });

  it('削除済みの showMessage はどの正解にも含まれない', () => {
    expect(ALL_ACTION_TYPES).not.toContain('showMessage' as any);
    expect(GENERATABLE_ACTIONS).not.toContain('showMessage' as any);
  });
});

describe('contract ⇔ platform_constraints.json 整合性', () => {
  const constraints = JSON.parse(read('src/ai/batch/platform_constraints.json'));

  it('actionTypes が GENERATABLE_ACTIONS と一致する', () => {
    expect(sorted(constraints.actionTypes)).toEqual(sorted(GENERATABLE_ACTIONS));
  });

  it('triggerTypes が GENERATABLE_CONDITIONS と一致する', () => {
    expect(sorted(constraints.triggerTypes)).toEqual(sorted(GENERATABLE_CONDITIONS));
  });

  it('movementPatterns / effectTypes / counterOperations / counterComparisons / touchTypes が一致する', () => {
    expect(sorted(constraints.movementPatterns)).toEqual(sorted(MOVEMENT_TYPES));
    expect(sorted(constraints.effectTypes)).toEqual(sorted(EFFECT_TYPES));
    expect(sorted(constraints.counterOperations)).toEqual(sorted(COUNTER_OPERATIONS));
    expect(sorted(constraints.counterComparisons)).toEqual(sorted(COUNTER_COMPARISONS));
    expect(sorted(constraints.touchTypes)).toEqual(sorted(TOUCH_TYPES));
  });
});
