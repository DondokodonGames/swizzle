// src/ai/v2/__tests__/flagConditionMapping.test.ts
// 回帰テスト（WP33 / §6）:
// AI v2 の flag トリガー条件が「エンジンが評価できる形（condition）」で出力され、
// FlagManager で正しく評価されることを固定する。
//
// 背景: 旧実装は EditorMapper が flag トリガー条件を { flagValue: boolean } 形で出力していた。
// 正典（GameScript.ts）の flag トリガー条件は { condition: 'ON'|'OFF'|... } 形であり、
// FlagManager は condition.condition を switch 評価するため、flagValue 形は常に false になっていた。

import { describe, it, expect, vi } from 'vitest';

// EditorMapper のコンストラクタは LLM プロバイダを生成する（jsdom 環境では Anthropic SDK が例外を投げる）。
// mapTriggerToConditions は純粋関数なのでプロバイダは不要。プロバイダ生成だけスタブ化する。
vi.mock('../llm', () => ({
  createLLMProvider: () => ({ generateText: async () => '' }),
  DEFAULT_MODELS: { anthropic: 'claude-test', openai: 'gpt-test' },
}));

import { EditorMapper } from '../EditorMapper';
import { FlagManager } from '../../../services/rule-engine/FlagManager';
import type { TriggerCondition } from '../../../types/editor/GameScript';

// private メソッドをテストするためのヘルパ
function mapTrigger(mapper: EditorMapper, trigger: unknown): TriggerCondition[] {
  return (mapper as unknown as {
    mapTriggerToConditions: (t: unknown) => TriggerCondition[];
  }).mapTriggerToConditions(trigger);
}

describe('flag トリガー条件マッピング（WP33 §6 回帰）', () => {
  const mapper = new EditorMapper({ dryRun: true });

  it('value:true の flag トリガーは condition:"ON" を出力し flagValue を持たない', () => {
    const conditions = mapTrigger(mapper, {
      type: 'flag',
      parameters: { flagId: 'gate', value: true },
    });

    expect(conditions).toHaveLength(1);
    const c = conditions[0];
    expect(c.type).toBe('flag');
    expect(c).toMatchObject({ type: 'flag', flagId: 'gate', condition: 'ON' });
    // 正典の TriggerCondition に flagValue は存在しない
    expect((c as Record<string, unknown>).flagValue).toBeUndefined();
  });

  it('value:false の flag トリガーは condition:"OFF" を出力する', () => {
    const conditions = mapTrigger(mapper, {
      type: 'flag',
      parameters: { flagId: 'gate', value: false },
    });
    expect(conditions[0]).toMatchObject({ type: 'flag', flagId: 'gate', condition: 'OFF' });
    expect((conditions[0] as Record<string, unknown>).flagValue).toBeUndefined();
  });

  it('明示的な condition（ON/OFF/CHANGED 等）が指定された場合はそれを尊重する', () => {
    const conditions = mapTrigger(mapper, {
      type: 'flag',
      parameters: { flagId: 'gate', condition: 'OFF_TO_ON' },
    });
    expect(conditions[0]).toMatchObject({ type: 'flag', flagId: 'gate', condition: 'OFF_TO_ON' });
  });

  it('出力された flag トリガー条件を FlagManager が正しく評価する（end-to-end）', () => {
    const conditions = mapTrigger(mapper, {
      type: 'flag',
      parameters: { flagId: 'gate', value: true },
    });
    const flagCondition = conditions[0] as Extract<TriggerCondition, { type: 'flag' }>;

    const fm = new FlagManager();
    fm.addFlagDefinition('gate', false);

    // フラグ OFF のうちは条件不成立
    expect(fm.evaluateFlagCondition(flagCondition)).toBe(false);

    // フラグ ON にすると条件成立（旧 flagValue 形では常に false でバグっていた）
    fm.setFlag('gate', true);
    expect(fm.evaluateFlagCondition(flagCondition)).toBe(true);
  });
});
