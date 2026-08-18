// 様式（時代別スタイルパック）は見た目の多様性を担保する層。
// 宣言が機械可読であることと、商標名を持ち込んでいないことを固定する。
import { describe, it, expect } from 'vitest';
import { STYLE_PACKS, STYLE_PACK_BY_LABEL, extractStyleLabel, isKnownStylePack } from '../stylePacks';
import { checkIpSafety } from '../IpSafetyChecker';

describe('STYLE_PACKS', () => {
  it('id と label が重複しない', () => {
    expect(new Set(STYLE_PACKS.map((p) => p.id)).size).toBe(STYLE_PACKS.length);
    expect(new Set(STYLE_PACKS.map((p) => p.label)).size).toBe(STYLE_PACKS.length);
  });

  it('各時代が最低1つずつある（黎明期からスマホ時代まで）', () => {
    const labels = STYLE_PACKS.map((p) => p.label);
    for (const era of ['70s', '80s', '8bit', '90s', '2000s', '2010s']) {
      expect(labels.some((l) => l.includes(era))).toBe(true);
    }
  });

  it('パック名に商標を持ち込んでいない（IP_SAFETY_RULES）', () => {
    for (const p of STYLE_PACKS) {
      const r = checkIpSafety(`${p.label} ${p.era} ${p.note}`);
      expect(r.violations.filter((v) => v.severity === 'error')).toHaveLength(0);
    }
  });

  it('既存ゲームが宣言しているラベルは全て有効', () => {
    for (const label of ['80s NEON', 'NEO-RETRO', '90s 16bit', '2000s ARCADE POP', '70s MONO']) {
      expect(isKnownStylePack(label)).toBe(true);
      expect(STYLE_PACK_BY_LABEL.get(label)).toBeDefined();
    }
  });
});

describe('extractStyleLabel', () => {
  it('宣言行から取り出す', () => {
    expect(extractStyleLabel('// スタイル: 80s NEON\n(function(game){})(game);')).toBe('80s NEON');
  });

  it('全角コロンでも取り出す', () => {
    expect(extractStyleLabel('// スタイル：1BIT INK')).toBe('1BIT INK');
  });

  it('宣言が無ければ null', () => {
    expect(extractStyleLabel('(function(game){})(game);')).toBeNull();
  });
});
