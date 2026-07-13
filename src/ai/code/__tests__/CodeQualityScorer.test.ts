import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CodeQualityScorer } from '../CodeQualityScorer';
import type { CodeValidationResult } from '../CodeGameValidator';

const scorer = new CodeQualityScorer();

function noErrors(): CodeValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function withErrors(n: number): CodeValidationResult {
  return {
    valid: n === 0,
    errors: Array(n).fill({ code: 'X', message: 'e', severity: 'error' as const }),
    warnings: [],
  };
}

function withWarnings(n: number): CodeValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: Array(n).fill({ code: 'W', message: 'w', severity: 'warning' as const }),
  };
}

describe('CodeQualityScorer v2 – actionFeedback', () => {
  it('全ハンドラがフィードバック+分岐+good/bad → 25', () => {
    const code = [
      'game.onTap(function(x, y) {',
      '  if (hit) { game.feedback.good(x, y); } else { game.feedback.bad(x, y); }',
      '});',
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.actionFeedback).toBe(25);
  });

  it('フィードバックのないハンドラは減点され、ヒントが出る', () => {
    const code = 'game.onTap(function(x, y) { count++; });';
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.actionFeedback).toBe(0);
    expect(r.hints.some((h) => h.includes('フィードバック'))).toBe(true);
  });

  it('2ハンドラ中1つだけフィードバック → 部分点', () => {
    const code = [
      'game.onTap(function(x, y) { if (ok) game.feedback.good(x, y); });',
      'game.onSwipe(function(dir) { moved = dir; });',
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    // 15 * (1/2) = 8 (round) + branch(1/2切上げ=1本以上でOK) 5 = 13, good/badペアなし
    expect(r.breakdown.actionFeedback).toBeGreaterThan(5);
    expect(r.breakdown.actionFeedback).toBeLessThan(20);
  });

  it('名前付きハンドラ関数も解析できる', () => {
    const code = [
      'function handleTap(x, y) {',
      '  if (hit) game.feedback.good(x, y); else game.feedback.bad(x, y);',
      '}',
      'game.onTap(handleTap);',
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.actionFeedback).toBe(25);
  });

  it('入力ハンドラなし → 0 とヒント', () => {
    const r = scorer.score('game.onUpdate(function(dt){});', null, noErrors());
    expect(r.breakdown.actionFeedback).toBe(0);
    expect(r.hints.some((h) => h.includes('入力ハンドラ'))).toBe(true);
  });
});

describe('CodeQualityScorer v2 – audioVisual', () => {
  it('melody + SE4種 + sprite + gradient → 20 (満点)', () => {
    const code = [
      "game.audio.melody([['C4',1]], { loop: true });",
      "game.audio.play('se_tap'); game.audio.play('se_good');",
      "game.audio.play('se_success'); game.audio.play('se_failure');",
      "game.draw.sprite(ART, PAL, 0, 0, 8);",
      "game.draw.gradient(0, 1920, ['#001', '#113']);",
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.audioVisual).toBe(20);
  });

  it('bgm はmelodyより低い加点', () => {
    const melody = scorer.score("game.audio.melody([['C4',1]]);", null, noErrors());
    const bgm = scorer.score("game.audio.bgm('bgm_main');", null, noErrors());
    expect(melody.breakdown.audioVisual).toBeGreaterThan(bgm.breakdown.audioVisual);
  });

  it('音なし・sprite なしはヒントが出る', () => {
    const r = scorer.score('game.draw.rect(0,0,1,1,"#fff");', null, noErrors());
    expect(r.breakdown.audioVisual).toBe(0);
    expect(r.hints.some((h) => h.includes('BGM'))).toBe(true);
    expect(r.hints.some((h) => h.includes('sprite'))).toBe(true);
  });
});

describe('CodeQualityScorer v2 – layout (縦3ゾーン)', () => {
  it('上・中・下すべて使用 → 15', () => {
    const code = [
      'game.draw.text("score", W/2, H * 0.06, {});',
      'game.draw.circle(W/2, H * 0.5, 50, "#f00");',
      'game.draw.rect(0, H * 0.85, W, 100, "#333");',
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.layout).toBe(15);
  });

  it('上半分しか使わない → 減点とヒント', () => {
    const code = [
      'game.draw.text("t", W/2, H * 0.1, {});',
      'game.draw.circle(W/2, H * 0.3, 50, "#f00");',
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.layout).toBeLessThanOrEqual(10);
    expect(r.hints.some((h) => h.includes('下部'))).toBe(true);
  });

  it('H - n 形式も下部使用と判定する', () => {
    const code = 'game.draw.rect(0, H - 100, W, 100, "#333"); game.draw.text("m", 0, H * 0.5, {});';
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.layout).toBeGreaterThanOrEqual(10);
  });
});

describe('CodeQualityScorer v2 – goalEndings', () => {
  it('勝敗演出差+進捗+best+milestone → 15 (満点)', () => {
    const code = [
      "txt(resultSuccess ? 'CLEAR!' : 'GAME OVER', W/2, H*0.4, 54, col);",
      "txt(score + ' / ' + NEEDED, W/2, 40, 30, '#fff');",
      "txt('HI ' + game.best, W/2, 90, 24, '#ff0');",
      "game.fx.popup('1000m!', W/2, H*0.2);",
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.goalEndings).toBe(15);
  });

  it('結果演出・進捗なし → ヒントが出る', () => {
    const r = scorer.score('game.onTap(function(){});', null, noErrors());
    expect(r.breakdown.goalEndings).toBe(0);
    expect(r.hints.some((h) => h.includes('GAME OVER'))).toBe(true);
    expect(r.hints.some((h) => h.includes('game.best'))).toBe(true);
  });
});

describe('CodeQualityScorer v2 – structure', () => {
  it('エラー0 + ATTRACT/RESULT → 15', () => {
    const code = 'var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };';
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.structure).toBe(15);
  });

  it('エラー1件につき-4(状態機械なしは+5なし)', () => {
    const r = scorer.score('', null, withErrors(1));
    expect(r.breakdown.structure).toBe(6);
  });

  it('エラー3件以上で構造点は0', () => {
    const r = scorer.score('', null, withErrors(3));
    expect(r.breakdown.structure).toBe(0);
  });
});

describe('CodeQualityScorer v2 – runtime', () => {
  it('未実行 → 中立5点', () => {
    const r = scorer.score('', null, noErrors());
    expect(r.breakdown.runtime).toBe(5);
  });

  it('スモーク合格 → 10', () => {
    const r = scorer.score('', null, noErrors(), { passed: true });
    expect(r.breakdown.runtime).toBe(10);
  });

  it('スモーク不合格 → 0', () => {
    const r = scorer.score('', null, noErrors(), { passed: false });
    expect(r.breakdown.runtime).toBe(0);
  });
});

describe('CodeQualityScorer v2 – total / メタ情報', () => {
  it('total は 100 を超えない', () => {
    const fixture = fs.readFileSync(
      path.resolve(__dirname, '../../../services/code-game/__tests__/fixtures/api-v2-fixture.js'),
      'utf-8'
    );
    const r = scorer.score(fixture, null, noErrors(), { passed: true });
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.total).toBeGreaterThanOrEqual(80); // フィクスチャは基準v2準拠の見本
  });

  it('エラー/警告数を反映する', () => {
    expect(scorer.score('', null, withErrors(3)).validationErrors).toBe(3);
    expect(scorer.score('', null, withWarnings(2)).validationWarnings).toBe(2);
  });

  it('report() は throw しない', () => {
    const r = scorer.score('', null, noErrors());
    expect(() => scorer.report(r)).not.toThrow();
  });
});

describe('CodeQualityScorer v3 – テキストレス検査(structure)', () => {
  it('draw.text の指導文リテラル(3語以上/14字超)は structure を減点+ヒント', () => {
    const code = "var S={ATTRACT:0,RESULT:2}; game.draw.text('TAP THE RED STAR NOW', 0, 0, {});";
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.structure).toBeLessThan(15);
    expect(r.hints.some((h) => h.includes('指導文'))).toBe(true);
  });

  it('ホワイトリスト語(TAP TO START / カウンタ)は減点しない', () => {
    const code = "var S={ATTRACT:0,RESULT:2}; game.draw.text('TAP TO START', 0,0,{}); game.draw.text(a+' / '+b, 0,0,{});";
    const r = scorer.score(code, null, noErrors());
    expect(r.breakdown.structure).toBe(15);
    expect(r.hints.some((h) => h.includes('指導文'))).toBe(false);
  });

  it('ローカルヘルパー(txt())の第1引数リテラルも検出する', () => {
    const code = "function txt(s,x,y){ game.draw.text(s,x,y,{}); } txt('PRESS AND HOLD TO CHARGE', 0, 0);";
    const r = scorer.score(code, null, noErrors());
    expect(r.hints.some((h) => h.includes('指導文'))).toBe(true);
  });

  it('指導文2件以上でも減点は最大-10', () => {
    const code = [
      'var S={ATTRACT:0,RESULT:2};',
      "game.draw.text('SWIPE LEFT TO SORT', 0,0,{});",
      "game.draw.text('HOLD TO CHARGE UP', 0,0,{});",
      "game.draw.text('DODGE THE RED SPIKES', 0,0,{});",
    ].join('\n');
    const r = scorer.score(code, null, noErrors());
    // 15(満点) - min(10, 3*5)=10 → 5
    expect(r.breakdown.structure).toBe(5);
  });
});

describe('CodeQualityScorer v3 – audioVisual(distinct SE 3種で満点)', () => {
  it('distinct SE 3種はSE配点満点(2種より高い)', () => {
    const s3 = scorer.score("game.audio.play('se_a');game.audio.play('se_b');game.audio.play('se_c');", null, noErrors());
    const s2 = scorer.score("game.audio.play('se_a');game.audio.play('se_b');", null, noErrors());
    expect(s3.breakdown.audioVisual - s2.breakdown.audioVisual).toBe(2);
    expect(s3.hints.some((h) => h.includes('SE'))).toBe(false);
    expect(s2.hints.some((h) => h.includes('SE'))).toBe(true);
  });
});

describe('CodeQualityScorer v3 – 偽HI-SCORE(goalEndings)', () => {
  const base = [
    "if (win) show('CLEAR'); else show('GAME OVER');",
    "var p = s + ' / ' + n;",
    "game.fx.popup('x');",
  ].join('\n');

  it('game.best 不使用+ハードコードHI-SCORE → -3+ヒント', () => {
    const fake = scorer.score(base + "\ngame.draw.text('HI-SCORE 88888', 0,0,{});", null, noErrors());
    const real = scorer.score(base + "\ngame.draw.text('BEST ' + game.best, 0,0,{});", null, noErrors());
    expect(real.breakdown.goalEndings - fake.breakdown.goalEndings).toBe(6); // best +3 と 偽-3 の差
    expect(fake.hints.some((h) => h.includes('偽のHI-SCORE'))).toBe(true);
  });
});

describe('CodeQualityScorer v3 – 尺/NEEDED ヒント(減点なし)', () => {
  it('@mechanic の帯域外 MAX_TIME はヒント', () => {
    const code = ['// @mechanic: aim_shoot', 'var MAX_TIME = 25;'].join('\n'); // aim_shoot=10〜20
    const r = scorer.score(code, null, noErrors());
    expect(r.hints.some((h) => h.includes('帯域'))).toBe(true);
  });

  it('非ワンショット族で NEEDED<=2 かつ MAX_TIME>=10 はヒント', () => {
    const code = ['// @mechanic: dodge', 'var MAX_TIME = 15; var NEEDED = 1;'].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.hints.some((h) => h.includes('NEEDED'))).toBe(true);
  });

  it('ONE_SHOT_OK 族(timing_one_shot)は NEEDED=1 でもヒントを出さない', () => {
    const code = ['// @mechanic: timing_one_shot', 'var MAX_TIME = 12; var NEEDED = 1;'].join('\n');
    const r = scorer.score(code, null, noErrors());
    expect(r.hints.some((h) => h.includes('NEEDED'))).toBe(false);
  });
});
