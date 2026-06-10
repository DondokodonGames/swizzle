import { describe, it, expect } from 'vitest';
import { shouldAutoPublish } from '../publishGate';

describe('shouldAutoPublish – 公開ゲート判定', () => {
  it('閾値未満は審査キュー行き', () => {
    expect(shouldAutoPublish(69, 70)).toBe(false);
    expect(shouldAutoPublish(0, 70)).toBe(false);
  });

  it('閾値ちょうど・以上は自動公開', () => {
    expect(shouldAutoPublish(70, 70)).toBe(true);
    expect(shouldAutoPublish(100, 70)).toBe(true);
  });

  it('閾値0なら全て公開（ゲート実質無効）', () => {
    expect(shouldAutoPublish(0, 0)).toBe(true);
  });

  it('閾値100超なら全て審査キュー行き', () => {
    expect(shouldAutoPublish(100, 101)).toBe(false);
  });
});
