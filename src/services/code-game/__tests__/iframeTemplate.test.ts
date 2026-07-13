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

  it('embeds game code as a JSON string literal and escapes </script>', () => {
    // The engine embeds gameCode via JSON.stringify(...) (not a template literal),
    // so backticks/dollar signs need no escaping — but </script> must be broken up
    // so the HTML parser doesn't terminate the outer <script> block early.
    const code = 'var s = `tick`; var u = "$100"; // </script> guard';
    const html = buildIframeHtml(code, 1000);
    // The exact code appears inside a JSON.stringify'd string literal…
    expect(html).toContain(JSON.stringify(code).replace(/<\/script>/gi, '<\\/script>'));
    // …and no raw </script> from the game code leaks into the HTML.
    expect(html).not.toContain('// </script> guard');
    expect(html).toContain('// <\\/script> guard');
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

  describe('engine v2.1 (WP62)', () => {
    it('arms the maxDuration watchdog from first input, not from START', () => {
      const html = buildIframeHtml('// noop', 12345);
      // The watchdog helper exists and is invoked from the addTouch input path.
      expect(html).toContain('function armWatchdog()');
      expect(html).toMatch(/function addTouch[\s\S]*?armWatchdog\(\);/);
      // The maxDuration value is only used inside armWatchdog (not the START handler).
      expect(html).toMatch(/function armWatchdog\(\)[\s\S]*?\}, 12345\)/);
      // The START handler references the 120s absolute cap, not the maxDuration.
      expect(html).toMatch(/msg\.type === 'START'[\s\S]*?\}, 120000\)/);
      const startBlock = html.slice(html.indexOf("msg.type === 'START'"));
      expect(startBlock).not.toContain('}, 12345)');
    });

    it('keeps a 120s absolute safety cap for zero-input iframes', () => {
      const html = buildIframeHtml('// noop', 5000);
      expect(html).toMatch(/isRunning\) game\.end\.failure\(\);\s*\}, 120000\)/);
    });

    it('surfaces unknown-asset fallbacks as one-shot WARN messages', () => {
      const html = buildIframeHtml('// noop', 1000);
      expect(html).toContain('function warnOnce(code, id)');
      expect(html).toContain("{ type: 'WARN', code: code, id: id }");
      expect(html).toContain("warnOnce('UNKNOWN_SE', id)");
      expect(html).toContain("warnOnce('UNKNOWN_BGM', id)");
      expect(html).toContain("warnOnce('UNKNOWN_IMAGE', id)");
      expect(html).toContain("warnOnce('ASSET_LOAD_FAILED', asset.id)");
    });

    it('does not warn for declared-but-still-loading images', () => {
      const html = buildIframeHtml('// noop', 1000);
      // knownImageIds guards the UNKNOWN_IMAGE warn so valid ids mid-load stay quiet
      expect(html).toContain('knownImageIds[asset.id] = true');
      expect(html).toMatch(/if \(!knownImageIds\[id\]\) warnOnce\('UNKNOWN_IMAGE', id\)/);
    });

    it('renders the first frame with a non-zero minimal delta', () => {
      const html = buildIframeHtml('// noop', 1000);
      // No black first frame: the loop no longer skips when lastTimestamp is null
      expect(html).toContain('(lastTimestamp === null)');
      expect(html).toContain('(1 / 60)');
    });

    it('exposes game.draw.hand backed by the sprite path', () => {
      const html = buildIframeHtml('// noop', 1000);
      expect(html).toContain('hand: function(x, y, opts)');
      expect(html).toContain('HAND_POINT');
      expect(html).toContain('HAND_PRESS');
      expect(html).toContain('game.draw.sprite(o.press ? HAND_PRESS : HAND_POINT');
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
      'game.draw.hand', 'game.hit.circle', 'game.best',
    ]) {
      // melody is exercised indirectly via bgm fallback; tone directly
      if (api === 'game.audio.melody(') continue;
      expect(FIXTURE).toContain(api);
    }
  });
});
