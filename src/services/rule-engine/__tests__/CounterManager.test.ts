import { describe, it, expect, beforeEach } from 'vitest';
import { CounterManager } from '../CounterManager';
import { GameCounter } from '../../../types/counterTypes';

function makeCounter(name: string, overrides: Partial<GameCounter> = {}): GameCounter {
  return {
    id: name,
    name,
    initialValue: 0,
    currentValue: 0,
    persistence: 'game',
    createdAt: '',
    lastModified: '',
    ...overrides,
  };
}

describe('CounterManager – 基本操作', () => {
  let cm: CounterManager;

  beforeEach(() => {
    cm = new CounterManager();
  });

  it('getCounter: 未定義カウンターは 0 を返す', () => {
    expect(cm.getCounter('nonexistent')).toBe(0);
  });

  it('setCounter: 値を設定できる', () => {
    cm.addCounterDefinition(makeCounter('score'));
    cm.setCounter('score', 42);
    expect(cm.getCounter('score')).toBe(42);
  });

  it('setCounter: min でクランプされる', () => {
    cm.addCounterDefinition(makeCounter('hp', { min: 0, max: 100, initialValue: 50 }));
    cm.setCounter('hp', -10);
    expect(cm.getCounter('hp')).toBe(0);
  });

  it('setCounter: max でクランプされる', () => {
    cm.addCounterDefinition(makeCounter('hp', { min: 0, max: 100, initialValue: 50 }));
    cm.setCounter('hp', 200);
    expect(cm.getCounter('hp')).toBe(100);
  });

  it('setCounter: previousValue が更新される（changed判定用）', () => {
    cm.addCounterDefinition(makeCounter('score'));
    cm.setCounter('score', 5);
    expect(cm.getCounterPreviousValue('score')).toBe(0);
    cm.setCounter('score', 10);
    expect(cm.getCounterPreviousValue('score')).toBe(5);
  });

  it('incrementCounter: +1 される', () => {
    cm.addCounterDefinition(makeCounter('score'));
    cm.incrementCounter('score');
    expect(cm.getCounter('score')).toBe(1);
    cm.incrementCounter('score');
    expect(cm.getCounter('score')).toBe(2);
  });

  it('decrementCounter: -1 される', () => {
    cm.addCounterDefinition(makeCounter('hp', { initialValue: 3 }));
    cm.decrementCounter('hp');
    expect(cm.getCounter('hp')).toBe(2);
  });

  it('decrementCounter: min でクランプされる', () => {
    cm.addCounterDefinition(makeCounter('hp', { initialValue: 1, min: 0 }));
    cm.decrementCounter('hp');
    cm.decrementCounter('hp');
    expect(cm.getCounter('hp')).toBe(0);
  });

  it('resetCounter: initialValue に戻る', () => {
    cm.addCounterDefinition(makeCounter('score', { initialValue: 10 }));
    cm.setCounter('score', 99);
    cm.resetCounter('score');
    expect(cm.getCounter('score')).toBe(10);
  });

  it('getCounterPreviousValue: 操作前の値を返す', () => {
    cm.addCounterDefinition(makeCounter('score'));
    cm.setCounter('score', 7);
    expect(cm.getCounterPreviousValue('score')).toBe(0);
  });
});

describe('CounterManager – evaluateCounterCondition', () => {
  let cm: CounterManager;

  beforeEach(() => {
    cm = new CounterManager();
    cm.addCounterDefinition(makeCounter('hits', { initialValue: 5 }));
  });

  it('equals: 一致で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'equals', value: 5 })).toBe(true);
  });

  it('equals: 不一致で false', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'equals', value: 4 })).toBe(false);
  });

  it('notEquals: 不一致で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'notEquals', value: 3 })).toBe(true);
  });

  it('greater: 超過で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'greater', value: 4 })).toBe(true);
  });

  it('greater: 等しければ false', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'greater', value: 5 })).toBe(false);
  });

  it('greaterOrEqual: 以上で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'greaterOrEqual', value: 5 })).toBe(true);
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'greaterOrEqual', value: 4 })).toBe(true);
  });

  it('less: 未満で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'less', value: 6 })).toBe(true);
  });

  it('lessOrEqual: 以下で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'lessOrEqual', value: 5 })).toBe(true);
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'lessOrEqual', value: 6 })).toBe(true);
  });

  it('between: 範囲内で true', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'between', value: 3, rangeMax: 7 })).toBe(true);
  });

  it('between: 範囲外で false', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'between', value: 6, rangeMax: 10 })).toBe(false);
  });

  it('changed: setCounter 後に true', () => {
    cm.setCounter('hits', 6);
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'changed', value: 0 })).toBe(true);
  });

  it('changed: 変化なしで false', () => {
    expect(cm.evaluateCounterCondition({ type: 'counter', counterName: 'hits', comparison: 'changed', value: 0 })).toBe(false);
  });
});

describe('CounterManager – executeCounterAction', () => {
  let cm: CounterManager;

  beforeEach(() => {
    cm = new CounterManager();
    cm.addCounterDefinition(makeCounter('score', { initialValue: 10, min: 0, max: 100 }));
  });

  it('set 操作で値を直接設定できる', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'set', value: 50 });
    expect(cm.getCounter('score')).toBe(50);
  });

  it('add 操作で加算される', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'add', value: 5 });
    expect(cm.getCounter('score')).toBe(15);
  });

  it('increment 操作で +1 される', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'increment' });
    expect(cm.getCounter('score')).toBe(11);
  });

  it('subtract 操作で減算される', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'subtract', value: 3 });
    expect(cm.getCounter('score')).toBe(7);
  });

  it('decrement 操作で -1 される', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'decrement' });
    expect(cm.getCounter('score')).toBe(9);
  });

  it('multiply 操作で乗算される', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'multiply', value: 3 });
    expect(cm.getCounter('score')).toBe(30);
  });

  it('divide 操作で除算される', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'divide', value: 2 });
    expect(cm.getCounter('score')).toBe(5);
  });

  it('divide: 0除算は元値を維持する', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'divide', value: 0 });
    expect(cm.getCounter('score')).toBe(10);
  });

  it('reset 操作で initialValue に戻る', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'set', value: 99 });
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'reset' });
    expect(cm.getCounter('score')).toBe(10);
  });

  it('操作後 counterHistory に記録される', () => {
    const events = cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'add', value: 1 });
    expect(events).toHaveLength(1);
    expect(events[0].counterName).toBe('score');
    expect(events[0].oldValue).toBe(10);
    expect(events[0].newValue).toBe(11);
  });

  it('clamp: max を超えない', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'set', value: 200 });
    expect(cm.getCounter('score')).toBe(100);
  });

  it('clamp: min を下回らない', () => {
    cm.executeCounterAction({ type: 'counter', counterName: 'score', operation: 'set', value: -50 });
    expect(cm.getCounter('score')).toBe(0);
  });

  it('存在しない counterName では空配列を返す', () => {
    const events = cm.executeCounterAction({ type: 'counter', counterName: 'ghost', operation: 'add', value: 1 });
    expect(events).toHaveLength(0);
  });
});
