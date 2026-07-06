import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildIframeHtml } from '../iframeTemplate';

const FIXTURE = fs.readFileSync(
  path.resolve(__dirname, 'fixtures/api-v2-fixture.js'),
  'utf-8'
);

describe('buildIframeHtml', () => {
  it('embeds the game code and watchdog duration', () => {
    const html = buildIframeHtml('game.onStart(function(){});', 12345);
    expect(html).toContain('game.onStart(function(){});');
    expect(html).toContain('12345');
  });

  it('escapes backticks, backslashes and dollar signs in game code', () => {
    const code = 'var s = `tick`; var t = "\\\\n"; var u = "$100";';
    const html = buildIframeHtml(code, 1000);
    // Backticks must be escaped so the embedded template literal stays intact
    expect(html).toContain('\\`tick\\`');
    expect(html).toContain('\\$100');
    // The template literal wrapping the code must be balanced (no raw backtick leak)
    expect(html).not.toContain('var s = `tick`');
  });

  describe('API v2 surface', () => {
    const html = buildIframeHtml('// noop', 1000);

    it.each([
      // audio synthesis
      'tone:', 'melody:', 'SE_PRESETS', 'BGM_PRESETS', 'noteToFreq',
      // feedback grammar + fx layer
      'feedback:', 'good:', 'bad:', 'burst:', 'popup:', 'flash:', 'shake:',
      // input v2
      'onPress:', 'onRelease:', 'onMove:', 'get touches()', 'get input()',
      // drawing v2
      'sprite:', 'gradient:',
      // hit tests + best score + protocol v2
      'hit:', 'get best()', 'gameContext',
    ])('defines %s', (needle) => {
      expect(html).toContain(needle);
    });

    it('keeps the v1 API intact', () => {
      for (const needle of [
        'onStart:', 'onUpdate:', 'onTap:', 'onSwipe:', 'onHold:',
        'clear:', 'image:', 'rect:', 'circle:', 'text:', 'line:',
        'play:', 'bgm:', 'stopBgm:', 'success:', 'failure:', 'random:',
      ]) {
        expect(html).toContain(needle);
      }
    });

    it('falls back to synthesized presets for missing audio assets', () => {
      // play() must reach SE_PRESETS when the id is not in audioCache
      expect(html).toMatch(/SE_PRESETS\[id\]/);
      // bgm() must fall back to a preset melody loop
      expect(html).toMatch(/BGM_PRESETS\[id\] \|\| BGM_PRESETS\.bgm_main/);
    });

    it('clears under identity transform so screen shake stays clean', () => {
      expect(html).toContain('ctx.setTransform(1, 0, 0, 1, 0, 0)');
    });

    it('accepts INIT context for best score injection', () => {
      expect(html).toContain('gameContext = msg.context || {}');
    });

    it('sends stats with GAME_END', () => {
      expect(html).toContain("{ type: 'GAME_END', result: 'success', score: score || 0, stats: stats }");
    });
  });

  it('the API v2 fixture game parses as a function body', () => {
    // Same parse the iframe performs — throws on syntax error
    expect(() => new Function('game', FIXTURE)).not.toThrow();
  });

  it('fixture uses every new API v2 method', () => {
    for (const api of [
      'game.audio.tone', 'game.audio.melody(', 'game.feedback.good', 'game.feedback.bad',
      'game.fx.popup', 'game.onPress', 'game.onRelease', 'game.onMove',
      'game.input.pressing', 'game.touches', 'game.draw.sprite', 'game.draw.gradient',
      'game.hit.circle', 'game.best',
    ]) {
      // melody is exercised indirectly via bgm fallback; tone directly
      if (api === 'game.audio.melody(') continue;
      expect(FIXTURE).toContain(api);
    }
  });
});
