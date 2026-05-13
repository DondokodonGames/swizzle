import { describe, it, expect, beforeEach } from 'vitest';
import { FlagManager } from '../FlagManager';

describe('FlagManager – 基本操作', () => {
  let fm: FlagManager;

  beforeEach(() => { fm = new FlagManager(); });

  it('getFlag: 未定義フラグは false を返す', () => {
    expect(fm.getFlag('nonexistent')).toBe(false);
  });

  it('setFlag: 値が更新される', () => {
    fm.setFlag('active', true);
    expect(fm.getFlag('active')).toBe(true);
  });

  it('setFlag: false にできる', () => {
    fm.setFlag('active', true);
    fm.setFlag('active', false);
    expect(fm.getFlag('active')).toBe(false);
  });

  it('toggleFlag: false → true に反転する', () => {
    fm.setFlag('active', false);
    fm.toggleFlag('active');
    expect(fm.getFlag('active')).toBe(true);
  });

  it('toggleFlag: true → false に反転する', () => {
    fm.setFlag('active', true);
    fm.toggleFlag('active');
    expect(fm.getFlag('active')).toBe(false);
  });

  it('reset: addFlagDefinition で登録した initialValue に戻る', () => {
    fm.addFlagDefinition('active', true);
    fm.setFlag('active', false);
    fm.reset();
    expect(fm.getFlag('active')).toBe(true);
  });
});

describe('FlagManager – 状態遷移条件', () => {
  let fm: FlagManager;

  beforeEach(() => { fm = new FlagManager(); });

  it('ON: フラグ=true で true', () => {
    fm.setFlag('f', true);
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'ON' })).toBe(true);
  });

  it('ON: フラグ=false で false', () => {
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'ON' })).toBe(false);
  });

  it('OFF: フラグ=false で true', () => {
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'OFF' })).toBe(true);
  });

  it('OFF: フラグ=true で false', () => {
    fm.setFlag('f', true);
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'OFF' })).toBe(false);
  });

  it('CHANGED: setFlag 直後は true', () => {
    fm.setFlag('f', true);
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'CHANGED' })).toBe(true);
  });

  it('CHANGED: 変化なしで false（同値で setFlag しても変化なし）', () => {
    fm.setFlag('f', false);
    fm.updatePreviousFlags();
    // 同じ false のまま → CHANGED = false
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'CHANGED' })).toBe(false);
  });

  it('CHANGED: updatePreviousFlags 後は false になる', () => {
    fm.setFlag('f', true);
    fm.updatePreviousFlags();
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'CHANGED' })).toBe(false);
  });

  it('OFF_TO_ON: false→true の瞬間だけ true', () => {
    fm.setFlag('f', false);
    fm.updatePreviousFlags();
    fm.setFlag('f', true);
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'OFF_TO_ON' })).toBe(true);
  });

  it('OFF_TO_ON: updatePreviousFlags 後は false', () => {
    fm.setFlag('f', true);
    fm.updatePreviousFlags();
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'OFF_TO_ON' })).toBe(false);
  });

  it('ON_TO_OFF: true→false の瞬間だけ true', () => {
    fm.setFlag('f', true);
    fm.updatePreviousFlags();
    fm.setFlag('f', false);
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'ON_TO_OFF' })).toBe(true);
  });

  it('ON_TO_OFF: updatePreviousFlags 後は false', () => {
    fm.setFlag('f', false);
    fm.updatePreviousFlags();
    expect(fm.evaluateFlagCondition({ type: 'flag', flagId: 'f', condition: 'ON_TO_OFF' })).toBe(false);
  });
});
