import { describe, it, expect } from 'vitest';
import { CodeGameValidator } from '../CodeGameValidator';

const v = new CodeGameValidator();

function validCode(): string {
  return [
    'var elapsed = 0;',
    'game.onStart(function() { elapsed = 0; });',
    'game.onUpdate(function(dt) {',
    '  elapsed += dt;',
    '  game.draw.clear("#000");',
    '  if (elapsed > 10) game.end.failure();',
    '});',
    'game.onTap(function(x, y) { game.end.success(1); });',
  ].join('\n');
}

describe('CodeGameValidator – 正常系', () => {
  it('valid なコードは valid=true でエラー・警告なし', () => {
    const r = v.validate(validCode());
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it('report() は throw しない', () => {
    const r = v.validate(validCode());
    expect(() => v.report(r)).not.toThrow();
  });
});

describe('CodeGameValidator – 構文エラー', () => {
  it('パース不能なコードは SYNTAX_ERROR を返す', () => {
    const r = v.validate('{{{');
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'SYNTAX_ERROR')).toBe(true);
  });

  it('構文エラー時は後続チェックをスキップして即 return する', () => {
    const r = v.validate('{{{');
    // NO_SUCCESS / NO_FAILURE エラーは出ない
    expect(r.errors.every(e => e.code === 'SYNTAX_ERROR')).toBe(true);
  });
});

describe('CodeGameValidator – 必須メソッドチェック', () => {
  it('game.end.success がなければ NO_SUCCESS エラー', () => {
    const code = [
      'game.onUpdate(function(dt){});',
      'game.end.failure();',
    ].join('\n');
    const r = v.validate(code);
    expect(r.errors.some(e => e.code === 'NO_SUCCESS')).toBe(true);
    expect(r.valid).toBe(false);
  });

  it('game.end.failure がなければ NO_FAILURE エラー', () => {
    const code = [
      'game.onUpdate(function(dt){});',
      'game.end.success();',
    ].join('\n');
    const r = v.validate(code);
    expect(r.errors.some(e => e.code === 'NO_FAILURE')).toBe(true);
    expect(r.valid).toBe(false);
  });
});

describe('CodeGameValidator – 禁止パターン（warning）', () => {
  function codeWith(snippet: string): string {
    return `${validCode()}\n${snippet}`;
  }

  it('while(true) → INFINITE_LOOP 警告', () => {
    const r = v.validate(codeWith('while(true) {}'));
    expect(r.warnings.some(w => w.code === 'INFINITE_LOOP')).toBe(true);
  });

  it('for(;;) → INFINITE_LOOP 警告', () => {
    const r = v.validate(codeWith('for(;;) {}'));
    expect(r.warnings.some(w => w.code === 'INFINITE_LOOP')).toBe(true);
  });

  it('fetch() → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('fetch("https://example.com")'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });

  it('localStorage → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('localStorage.setItem("k","v")'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });

  it('document.getElementById → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('document.getElementById("id")'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });

  it('window.location → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('var u = window.location'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });

  it('eval() → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('eval("1+1")'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });

  it('import → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('import React from "react"'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });

  it('require() → FORBIDDEN_API 警告', () => {
    const r = v.validate(codeWith('var x = require("module")'));
    expect(r.warnings.some(w => w.code === 'FORBIDDEN_API')).toBe(true);
  });
});

describe('CodeGameValidator – ゲームループ警告', () => {
  it('game.onUpdate がなければ NO_UPDATE_LOOP 警告', () => {
    const code = [
      'game.onStart(function(){});',
      'game.onTap(function(x, y) { game.end.success(1); });',
      'game.end.failure();',
    ].join('\n');
    const r = v.validate(code);
    expect(r.warnings.some(w => w.code === 'NO_UPDATE_LOOP')).toBe(true);
  });

  it('game.onUpdate があれば NO_UPDATE_LOOP 警告なし', () => {
    const r = v.validate(validCode());
    expect(r.warnings.some(w => w.code === 'NO_UPDATE_LOOP')).toBe(false);
  });
});

describe('CodeGameValidator – 未知APIチェック', () => {
  it('game.draw.unknown() → UNKNOWN_API 警告', () => {
    const r = v.validate(codeWithUnknown('game.draw.unknown(1, 2)'));
    expect(r.warnings.some(w => w.code === 'UNKNOWN_API')).toBe(true);
  });

  it('game.foo() → UNKNOWN_API 警告', () => {
    const r = v.validate(codeWithUnknown('game.foo()'));
    expect(r.warnings.some(w => w.code === 'UNKNOWN_API')).toBe(true);
  });

  it('既知の game.draw.rect() → UNKNOWN_API 警告なし', () => {
    const r = v.validate(validCode() + '\ngame.draw.rect(0, 0, 10, 10, "#fff")');
    const unknownWarns = r.warnings.filter(w => w.code === 'UNKNOWN_API');
    expect(unknownWarns).toHaveLength(0);
  });

  it('既知の game.onTap() → UNKNOWN_API 警告なし', () => {
    const r = v.validate(validCode());
    const unknownWarns = r.warnings.filter(w => w.code === 'UNKNOWN_API');
    expect(unknownWarns).toHaveLength(0);
  });
});

function codeWithUnknown(snippet: string): string {
  return `${validCode()}\n${snippet}`;
}
