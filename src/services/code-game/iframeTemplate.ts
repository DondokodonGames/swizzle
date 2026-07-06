export interface IframeAsset {
  id: string;
  dataUrl: string;
  type: 'image' | 'audio';
}

/**
 * Game context passed into the iframe via INIT (protocol v2).
 * All fields are optional — old parents that omit `context` still work.
 */
export interface IframeGameContext {
  gameId?: string;
  bestScore?: number;
}

/**
 * Returns an HTML string to be used as `srcdoc` for a sandboxed iframe.
 * The iframe implements SwizzleGameAPI on a Canvas 2D context and executes
 * the user-supplied game code via new Function().
 *
 * Communication protocol (postMessage):
 *   Parent → iframe:  { type: 'INIT', assets: IframeAsset[], context?: IframeGameContext }
 *                     { type: 'START' }
 *
 *   iframe → parent:  { type: 'READY' }
 *                     { type: 'GAME_END', result: 'success'|'failure', score?: number, stats?: object }
 *                     { type: 'ERROR', message: string }
 *
 * API v2 (all additive, backward compatible with v1 games):
 *   - WebAudio chiptune synthesis: game.audio.tone / game.audio.melody, plus
 *     synthesized preset fallbacks for se_* / bgm_* ids with no loaded asset
 *     (fixes the "silent games" problem without touching game code).
 *   - Action-feedback grammar: game.feedback.good / game.feedback.bad.
 *   - Engine-managed FX layer: game.fx.burst / popup / flash / shake
 *     (rendered after onUpdate every frame).
 *   - Continuous & multi-touch input: game.input, game.touches,
 *     game.onPress / onRelease / onMove.
 *   - Pixel sprites: game.draw.sprite (string-bitmap + palette, cached).
 *   - Vertical gradient backgrounds: game.draw.gradient.
 *   - Hit tests: game.hit.circle / game.hit.rect.
 *   - Best score: game.best (injected via INIT context).
 */
export function buildIframeHtml(gameCode: string, maxDurationMs: number): string {
  // JSON-encode the game code so it can be embedded as a safe JS string literal.
  // This avoids new Function() / eval(), which iOS Safari (WKWebView) blocks inside
  // sandboxed srcdoc iframes even when CSP allows 'unsafe-eval'. We inject a <script>
  // element instead — that path is governed by 'unsafe-inline', not 'unsafe-eval'.
  // Also escape </script> to prevent the HTML parser from terminating the outer <script> block.
  const encodedCode = JSON.stringify(gameCode).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
</head>
<body>
<canvas id="c" width="1080" height="1920"></canvas>
<script>
(function() {
  'use strict';

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  // ── Asset caches ──────────────────────────────────────────────────────────
  const imageCache = {};   // id → HTMLImageElement
  const audioCache = {};   // id → HTMLAudioElement

  // ── Game loop state ───────────────────────────────────────────────────────
  let startFn = null;
  let updateFn = null;
  const tapHandlers = [];
  const swipeHandlers = [];
  const holdHandlers = [];
  const pressHandlers = [];
  const releaseHandlers = [];
  const moveHandlers = [];

  let isRunning = false;
  let rafId = null;
  let lastTimestamp = null;
  let elapsed = 0;
  let currentDelta = 0;
  let audioUnlocked = false;
  let gameContext = {};

  // ── Swipe detection state ─────────────────────────────────────────────────
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  let holdTimer = null;
  const SWIPE_MIN_DIST = 30;   // px (canvas coords)
  const SWIPE_MAX_MS   = 500;
  const HOLD_MS        = 400;

  // ── WebAudio chiptune synthesizer ─────────────────────────────────────────
  let synthCtx = null;   // null = not created, false = unavailable
  function getSynthCtx() {
    if (synthCtx === null) {
      try {
        synthCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { synthCtx = false; }
    }
    if (synthCtx && synthCtx.state === 'suspended') {
      try { synthCtx.resume(); } catch (e) {}
    }
    return synthCtx || null;
  }

  const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteToFreq(n) {
    if (typeof n === 'number') return n;
    if (!n) return 0;
    const s = String(n).trim();
    if (s === 'R' || s === 'r' || s === '') return 0;  // rest
    const m = /^([A-Ga-g])([#b]?)(-?[0-8])$/.exec(s);
    if (!m) return 0;
    let idx = NOTE_INDEX[m[1].toUpperCase()];
    if (m[2] === '#') idx += 1;
    if (m[2] === 'b') idx -= 1;
    const midi = (parseInt(m[3], 10) + 1) * 12 + idx;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function synthTone(freq, dur, opts, when) {
    const actx = getSynthCtx();
    const f = noteToFreq(freq);
    if (!actx || !(f > 0)) return null;
    const o = opts || {};
    const t = (when !== undefined) ? when : actx.currentTime;
    const d = Math.max(0.02, dur || 0.1);
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(Math.max(1, f), t);
    if (o.slide) osc.frequency.linearRampToValueAtTime(Math.max(1, f + o.slide), t + d);
    const vol = (o.volume !== undefined) ? o.volume : 0.2;
    gain.gain.setValueAtTime(Math.max(0.0001, vol), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + d);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + d + 0.02);
    return osc;
  }

  let synthBgm = null;  // { stopped, timer, nodes }
  function stopSynthBgm() {
    if (!synthBgm) return;
    synthBgm.stopped = true;
    if (synthBgm.timer) clearTimeout(synthBgm.timer);
    (synthBgm.nodes || []).forEach(function(n) { try { n.stop(); } catch (e) {} });
    synthBgm = null;
  }

  function playSynthMelody(notes, opts) {
    const o = opts || {};
    if (o.loop) stopSynthBgm();
    const actx = getSynthCtx();
    if (!actx || !notes || !notes.length) return;
    const beat = 60 / (o.tempo || 120);
    const state = { stopped: false, timer: null, nodes: [] };

    function scheduleLine(line, wave, vol, start) {
      let t = start;
      for (let i = 0; i < line.length; i++) {
        const entry = line[i];
        const note = Array.isArray(entry) ? entry[0] : entry;
        const beats = (Array.isArray(entry) && entry.length > 1) ? entry[1] : 1;
        const d = beats * beat;
        const node = synthTone(note, d * 0.85, { wave: wave, volume: vol }, t);
        if (node) state.nodes.push(node);
        t += d;
      }
      return t - start;
    }

    function loopOnce() {
      if (state.stopped) return;
      // While the AudioContext is suspended (pre-gesture), scheduled times
      // don't advance — retry instead of piling overlapping iterations.
      if (actx.state === 'suspended') {
        state.timer = setTimeout(loopOnce, 200);
        return;
      }
      state.nodes = [];
      const start = actx.currentTime + 0.06;
      let dur = scheduleLine(notes, o.wave || 'square', (o.volume !== undefined ? o.volume : 0.12), start);
      if (o.bass && o.bass.length) {
        const bassVol = (o.bassVolume !== undefined) ? o.bassVolume : ((o.volume !== undefined ? o.volume : 0.12) + 0.02);
        dur = Math.max(dur, scheduleLine(o.bass, o.bassWave || 'triangle', bassVol, start));
      }
      if (o.loop) state.timer = setTimeout(loopOnce, Math.max(60, dur * 1000));
    }

    loopOnce();
    if (o.loop) synthBgm = state;
  }

  // Synthesized SE presets — fallback when no audio asset was loaded for an id.
  const SE_PRESETS = {
    se_tap: function(v) { synthTone(660, 0.05, { wave: 'square', volume: 0.12 * v }); },
    se_good: function(v) {
      synthTone(523, 0.06, { wave: 'square', volume: 0.16 * v });
      setTimeout(function() { synthTone(784, 0.09, { wave: 'square', volume: 0.16 * v }); }, 45);
    },
    se_bad: function(v) {
      synthTone(196, 0.12, { wave: 'sawtooth', volume: 0.18 * v });
      setTimeout(function() { synthTone(131, 0.16, { wave: 'sawtooth', volume: 0.16 * v }); }, 70);
    },
    se_success: function(v) {
      [523, 659, 784, 1047].forEach(function(f, i) {
        setTimeout(function() { synthTone(f, 0.12, { wave: 'square', volume: 0.18 * v }); }, i * 80);
      });
    },
    se_failure: function(v) {
      [440, 330, 220, 110].forEach(function(f, i) {
        setTimeout(function() { synthTone(f, 0.12, { wave: 'square', volume: 0.16 * v }); }, i * 90);
      });
    },
    se_coin: function(v) {
      synthTone(988, 0.08, { wave: 'square', volume: 0.15 * v });
      setTimeout(function() { synthTone(1319, 0.22, { wave: 'square', volume: 0.15 * v }); }, 75);
    },
    se_jump: function(v) { synthTone(262, 0.12, { wave: 'square', volume: 0.14 * v, slide: 260 }); },
    se_milestone: function(v) {
      [523, 659, 784, 1047].forEach(function(f, i) {
        setTimeout(function() { synthTone(f, 0.09, { wave: 'square', volume: 0.17 * v }); }, i * 60);
      });
    },
    se_powerup: function(v) {
      [262, 330, 392, 523, 659].forEach(function(f, i) {
        setTimeout(function() { synthTone(f, 0.07, { wave: 'square', volume: 0.15 * v }); }, i * 35);
      });
    },
    se_break: function(v) { synthTone(110, 0.12, { wave: 'sawtooth', volume: 0.16 * v }); }
  };
  SE_PRESETS.se_correct = SE_PRESETS.se_good;
  SE_PRESETS.se_wrong = SE_PRESETS.se_bad;
  SE_PRESETS.se_miss = SE_PRESETS.se_bad;

  // Synthesized BGM presets — fallback when no bgm asset was loaded.
  const BGM_PRESETS = {
    bgm_main: {
      tempo: 132, wave: 'square', volume: 0.07, bassWave: 'triangle', bassVolume: 0.09,
      notes: [
        ['E5', 0.75], ['R', 0.25], ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['R', 1],
        ['F5', 0.75], ['R', 0.25], ['C5', 0.5], ['F5', 0.5], ['A5', 1], ['R', 1],
        ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5],
        ['C5', 1], ['G4', 1], ['C5', 1.5], ['R', 0.5]
      ],
      bass: [
        ['C3', 0.75], ['R', 0.25], ['C3', 0.75], ['R', 0.25], ['A2', 0.75], ['R', 0.25], ['A2', 0.75], ['R', 0.25],
        ['F2', 0.75], ['R', 0.25], ['F2', 0.75], ['R', 0.25], ['G2', 0.75], ['R', 0.25], ['G2', 0.75], ['R', 0.25],
        ['C3', 0.75], ['R', 0.25], ['A2', 0.75], ['R', 0.25], ['F2', 0.75], ['R', 0.25], ['G2', 0.75], ['R', 0.25],
        ['C3', 0.75], ['R', 0.25], ['G2', 0.75], ['R', 0.25], ['C3', 1.5], ['R', 0.5]
      ]
    },
    bgm_tense: {
      tempo: 150, wave: 'square', volume: 0.06, bassWave: 'sawtooth', bassVolume: 0.07,
      notes: [
        ['A4', 0.5], ['R', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['R', 0.5], ['E4', 0.5], ['R', 0.5],
        ['A4', 0.5], ['R', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['R', 0.5],
        ['F4', 0.5], ['R', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 0.5], ['R', 0.5], ['E4', 0.5], ['R', 0.5],
        ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1]
      ],
      bass: [
        ['A1', 0.5], ['A2', 0.5], ['A1', 0.5], ['A2', 0.5], ['A1', 0.5], ['A2', 0.5], ['A1', 0.5], ['A2', 0.5],
        ['F1', 0.5], ['F2', 0.5], ['F1', 0.5], ['F2', 0.5], ['G1', 0.5], ['G2', 0.5], ['G1', 0.5], ['G2', 0.5],
        ['F1', 0.5], ['F2', 0.5], ['F1', 0.5], ['F2', 0.5], ['G1', 0.5], ['G2', 0.5], ['G1', 0.5], ['G2', 0.5],
        ['E1', 0.5], ['E2', 0.5], ['E1', 0.5], ['E2', 0.5], ['E1', 0.5], ['E2', 0.5], ['E1', 0.5], ['E2', 0.5]
      ]
    },
    bgm_cute: {
      tempo: 116, wave: 'triangle', volume: 0.11, bassWave: 'triangle', bassVolume: 0.09,
      notes: [
        ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
        ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
        ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1],
        ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 1.5], ['R', 0.5]
      ],
      bass: [
        ['C3', 1], ['G3', 1], ['C3', 1], ['G3', 1],
        ['F2', 1], ['C3', 1], ['F2', 1], ['G2', 1],
        ['C3', 1], ['G3', 1], ['C3', 1], ['G3', 1],
        ['F2', 1], ['G2', 1], ['C3', 1.5], ['R', 0.5]
      ]
    },
    bgm_dark: {
      tempo: 92, wave: 'triangle', volume: 0.1, bassWave: 'sawtooth', bassVolume: 0.05,
      notes: [
        ['D4', 1.5], ['F4', 0.5], ['E4', 1.5], ['C4', 0.5],
        ['D4', 1.5], ['A4', 0.5], ['G4', 1], ['F4', 1],
        ['E4', 1.5], ['G4', 0.5], ['F4', 1.5], ['D4', 0.5],
        ['C4', 1], ['E4', 1], ['D4', 1.5], ['R', 0.5]
      ],
      bass: [
        ['D2', 2], ['A1', 2], ['D2', 2], ['Bb1', 2],
        ['C2', 2], ['A1', 2], ['D2', 2], ['R', 2]
      ]
    }
  };

  // ── Audio unlock ──────────────────────────────────────────────────────────
  function unlockAudio() {
    if (synthCtx && synthCtx.state === 'suspended') {
      try { synthCtx.resume(); } catch (e) {}
    }
    if (audioUnlocked) return;
    audioUnlocked = true;
    Object.values(audioCache).forEach(function(a) {
      const p = a.play();
      if (p) p.then(function() { a.pause(); a.currentTime = 0; }).catch(function(){});
    });
  }

  // ── Input handling ────────────────────────────────────────────────────────
  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  // Multi-touch tracking (API v2) — coexists with the original single-touch
  // tap/swipe/hold detection below.
  const activeTouches = [];  // [{ id, x, y }]
  function findTouchIndex(id) {
    for (let i = 0; i < activeTouches.length; i++) if (activeTouches[i].id === id) return i;
    return -1;
  }
  function addTouch(id, x, y) {
    const i = findTouchIndex(id);
    if (i >= 0) { activeTouches[i].x = x; activeTouches[i].y = y; }
    else activeTouches.push({ id: id, x: x, y: y });
    pressHandlers.forEach(function(fn) { try { fn(x, y, id); } catch (e) {} });
  }
  function moveTouch(id, x, y) {
    const i = findTouchIndex(id);
    if (i >= 0) { activeTouches[i].x = x; activeTouches[i].y = y; }
    moveHandlers.forEach(function(fn) { try { fn(x, y, id); } catch (e) {} });
  }
  function removeTouch(id, x, y) {
    const i = findTouchIndex(id);
    if (i >= 0) activeTouches.splice(i, 1);
    releaseHandlers.forEach(function(fn) { try { fn(x, y, id); } catch (e) {} });
  }

  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    unlockAudio();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const ct = e.changedTouches[i];
      const cp = canvasCoords(ct.clientX, ct.clientY);
      addTouch(ct.identifier, cp.x, cp.y);
    }
    const t = e.touches[0];
    const pos = canvasCoords(t.clientX, t.clientY);
    touchStartX = pos.x; touchStartY = pos.y; touchStartTime = Date.now();

    // Hold detection
    holdTimer = setTimeout(function() {
      holdTimer = null;
      holdHandlers.forEach(function(fn) { fn(pos.x, pos.y, HOLD_MS / 1000); });
    }, HOLD_MS);
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const ct = e.changedTouches[i];
      const cp = canvasCoords(ct.clientX, ct.clientY);
      moveTouch(ct.identifier, cp.x, cp.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const ct = e.changedTouches[i];
      const cp = canvasCoords(ct.clientX, ct.clientY);
      removeTouch(ct.identifier, cp.x, cp.y);
    }

    const t = e.changedTouches[0];
    const pos = canvasCoords(t.clientX, t.clientY);
    const dx = pos.x - touchStartX;
    const dy = pos.y - touchStartY;
    const dt = Date.now() - touchStartTime;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SWIPE_MIN_DIST && dt < SWIPE_MAX_MS) {
      // Tap
      tapHandlers.forEach(function(fn) { fn(pos.x, pos.y); });
    } else if (dist >= SWIPE_MIN_DIST && dt < SWIPE_MAX_MS) {
      // Swipe — determine direction by dominant axis
      var dir;
      if (Math.abs(dx) >= Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      swipeHandlers.forEach(function(fn) { fn(dir); });
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', function(e) {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    for (let i = 0; i < e.changedTouches.length; i++) {
      const ct = e.changedTouches[i];
      const cp = canvasCoords(ct.clientX, ct.clientY);
      removeTouch(ct.identifier, cp.x, cp.y);
    }
  }, { passive: true });

  // Mouse fallback for desktop testing
  let mouseDown = false;
  canvas.addEventListener('mousedown', function(e) {
    unlockAudio();
    mouseDown = true;
    const pos = canvasCoords(e.clientX, e.clientY);
    addTouch('mouse', pos.x, pos.y);
  });
  canvas.addEventListener('mousemove', function(e) {
    if (!mouseDown) return;
    const pos = canvasCoords(e.clientX, e.clientY);
    moveTouch('mouse', pos.x, pos.y);
  });
  window.addEventListener('mouseup', function(e) {
    if (!mouseDown) return;
    mouseDown = false;
    const pos = canvasCoords(e.clientX, e.clientY);
    removeTouch('mouse', pos.x, pos.y);
  });
  canvas.addEventListener('click', function(e) {
    unlockAudio();
    const pos = canvasCoords(e.clientX, e.clientY);
    tapHandlers.forEach(function(fn) { fn(pos.x, pos.y); });
  });

  // ── Engine-managed FX layer ───────────────────────────────────────────────
  const fxParticles = [];
  const fxPopups = [];
  let fxFlash = null;
  let fxShake = null;
  let shakeDx = 0, shakeDy = 0;

  const fxApi = {
    burst: function(x, y, opts) {
      const o = opts || {};
      const n = Math.min(60, o.count || 12);
      const speed = o.speed || 420;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random() * 0.6);
        fxParticles.push({
          x: x, y: y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2,
          life: o.life || 0.6, maxLife: o.life || 0.6,
          col: o.color || '#ffe600', size: o.size || 12,
          gravity: (o.gravity !== undefined) ? o.gravity : 900
        });
      }
      if (fxParticles.length > 400) fxParticles.splice(0, fxParticles.length - 400);
    },
    popup: function(text, x, y, opts) {
      const o = opts || {};
      fxPopups.push({
        text: String(text), x: x, y: y,
        vy: (o.rise !== undefined) ? -o.rise : -140,
        life: o.life || 0.8, maxLife: o.life || 0.8,
        size: o.size || 52, color: o.color || '#ffffff'
      });
      if (fxPopups.length > 40) fxPopups.shift();
    },
    flash: function(color, dur) {
      fxFlash = { color: color || '#ffffff', t: 0, dur: dur || 0.2 };
    },
    shake: function(intensity, dur) {
      fxShake = { i: (intensity !== undefined) ? intensity : 14, t: 0, dur: dur || 0.3 };
    }
  };

  function updateShake(dt) {
    if (fxShake) {
      fxShake.t += dt;
      if (fxShake.t >= fxShake.dur) {
        fxShake = null; shakeDx = 0; shakeDy = 0;
      } else {
        const k = 1 - fxShake.t / fxShake.dur;
        shakeDx = (Math.random() * 2 - 1) * fxShake.i * k;
        shakeDy = (Math.random() * 2 - 1) * fxShake.i * k;
      }
    } else { shakeDx = 0; shakeDy = 0; }
  }

  function drawFxWorld(dt) {
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life -= dt;
      if (p.life <= 0) { fxParticles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
      ctx.restore();
    }
    for (let i = fxPopups.length - 1; i >= 0; i--) {
      const q = fxPopups[i];
      q.y += q.vy * dt; q.life -= dt;
      if (q.life <= 0) { fxPopups.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, (q.life / q.maxLife) * 1.5));
      ctx.font = 'bold ' + q.size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(q.text, q.x + 3, q.y + 3);
      ctx.fillStyle = q.color;
      ctx.fillText(q.text, q.x, q.y);
      ctx.restore();
    }
  }

  function drawFxScreen(dt) {
    if (!fxFlash) return;
    fxFlash.t += dt;
    if (fxFlash.t >= fxFlash.dur) { fxFlash = null; return; }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.35 * (1 - fxFlash.t / fxFlash.dur);
    ctx.fillStyle = fxFlash.color;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.restore();
  }

  // ── Pixel sprite cache ────────────────────────────────────────────────────
  const spriteCache = {};
  const spriteCacheOrder = [];
  function spriteKey(art, palette, flipX, flipY) {
    let pal = '';
    for (const k in palette) pal += k + ':' + palette[k] + ';';
    return art.join('|') + '#' + pal + (flipX ? 'FX' : '') + (flipY ? 'FY' : '');
  }
  function buildSpriteCanvas(art, palette, flipX, flipY) {
    const h = art.length;
    let w = 0;
    for (let i = 0; i < h; i++) w = Math.max(w, art[i].length);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, w);
    cv.height = Math.max(1, h);
    const c = cv.getContext('2d');
    for (let ry = 0; ry < h; ry++) {
      const row = art[ry];
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[rx];
        if (ch === '.' || ch === ' ' || !palette[ch]) continue;
        c.fillStyle = palette[ch];
        c.fillRect(flipX ? w - 1 - rx : rx, flipY ? h - 1 - ry : ry, 1, 1);
      }
    }
    return cv;
  }

  // ── SwizzleGameAPI implementation ─────────────────────────────────────────
  function playSound(id, volume) {
    const a = audioCache[id];
    if (a) {
      a.currentTime = 0;
      a.volume = volume !== undefined ? volume : 1.0;
      a.play().catch(function(){});
      return;
    }
    // Synthesized preset fallback (fixes silent games with no audio assets)
    const v = volume !== undefined ? volume : 1.0;
    const preset = SE_PRESETS[id];
    if (preset) preset(v);
    else if (id && String(id).indexOf('se_') === 0) SE_PRESETS.se_tap(v);
  }

  const game = {
    get canvas() { return { width: 1080, height: 1920 }; },
    get time()   { return { elapsed: elapsed, delta: currentDelta }; },
    get best()   { return gameContext.bestScore || 0; },
    get input()  {
      const primary = activeTouches[0];
      return {
        pressing: activeTouches.length > 0,
        x: primary ? primary.x : 0,
        y: primary ? primary.y : 0
      };
    },
    get touches() {
      return activeTouches.map(function(t) { return { id: t.id, x: t.x, y: t.y }; });
    },

    onStart:   function(fn) { startFn = fn; },
    onUpdate:  function(fn) { updateFn = fn; },
    onTap:     function(fn) { tapHandlers.push(fn); },
    onSwipe:   function(fn) { swipeHandlers.push(fn); },
    onHold:    function(fn) { holdHandlers.push(fn); },
    onPress:   function(fn) { pressHandlers.push(fn); },
    onRelease: function(fn) { releaseHandlers.push(fn); },
    onMove:    function(fn) { moveHandlers.push(fn); },

    draw: {
      clear: function(color) {
        // Fill under identity transform so screen shake never exposes edges
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 1080, 1920);
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1080, 1920);
        }
        ctx.restore();
      },
      image: function(id, x, y, w, h, rotation) {
        const img = imageCache[id];
        if (!img || !img.complete) return;
        ctx.save();
        if (rotation) {
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
        ctx.restore();
      },
      rect: function(x, y, w, h, color, alpha) {
        ctx.save();
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      },
      circle: function(x, y, r, color, alpha) {
        ctx.save();
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      text: function(str, x, y, opts) {
        opts = opts || {};
        ctx.save();
        var size  = opts.size  || 60;
        var color = opts.color || '#ffffff';
        var align = opts.align || 'center';
        var bold  = opts.bold  ? 'bold ' : '';
        var font  = opts.font  || 'sans-serif';
        ctx.font = bold + size + 'px ' + font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(str, x, y);
        ctx.restore();
      },
      line: function(x1, y1, x2, y2, color, lineWidth) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      },
      sprite: function(art, palette, x, y, px, opts) {
        if (!art || !art.length) return;
        const o = opts || {};
        const scale = px || 8;
        const key = spriteKey(art, palette || {}, !!o.flipX, !!o.flipY);
        let cv = spriteCache[key];
        if (!cv) {
          cv = buildSpriteCanvas(art, palette || {}, !!o.flipX, !!o.flipY);
          spriteCache[key] = cv;
          spriteCacheOrder.push(key);
          if (spriteCacheOrder.length > 64) delete spriteCache[spriteCacheOrder.shift()];
        }
        const w = cv.width * scale, h = cv.height * scale;
        let dx = x, dy = y;
        if (o.anchor === 'center') { dx = x - w / 2; dy = y - h / 2; }
        ctx.save();
        if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cv, Math.round(dx), Math.round(dy), w, h);
        ctx.restore();
      },
      gradient: function(y0, y1, stops) {
        if (!stops || !stops.length) return;
        let g;
        try {
          g = ctx.createLinearGradient(0, y0, 0, y1);
          if (Array.isArray(stops[0])) {
            for (let i = 0; i < stops.length; i++) {
              g.addColorStop(Math.min(1, Math.max(0, stops[i][0])), stops[i][1]);
            }
          } else if (stops.length === 1) {
            g.addColorStop(0, stops[0]);
            g.addColorStop(1, stops[0]);
          } else {
            for (let i = 0; i < stops.length; i++) {
              g.addColorStop(i / (stops.length - 1), stops[i]);
            }
          }
        } catch (e) { return; }
        ctx.save();
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.min(y0, y1), 1080, Math.abs(y1 - y0));
        ctx.restore();
      }
    },

    fx: fxApi,

    feedback: {
      good: function(x, y, opts) {
        const o = opts || {};
        playSound(o.sound || 'se_good', o.volume);
        const px = (x !== undefined) ? x : 540;
        const py = (y !== undefined) ? y : 860;
        fxApi.burst(px, py, { color: o.color || '#00ff9f', count: o.count || 12 });
        if (o.text !== null) {
          fxApi.popup((o.text !== undefined) ? o.text : 'GOOD!', px, py - 40, { color: o.color || '#00ff9f', size: o.size || 56 });
        }
      },
      bad: function(x, y, opts) {
        const o = opts || {};
        playSound(o.sound || 'se_bad', o.volume);
        fxApi.flash(o.flashColor || '#ff0044', 0.18);
        fxApi.shake((o.shake !== undefined) ? o.shake : 12, 0.25);
        const px = (x !== undefined) ? x : 540;
        const py = (y !== undefined) ? y : 860;
        if (o.text !== null) {
          fxApi.popup((o.text !== undefined) ? o.text : 'MISS', px, py - 40, { color: o.color || '#ff5577', size: o.size || 56 });
        }
      }
    },

    hit: {
      circle: function(x1, y1, r1, x2, y2, r2) {
        const dx = x1 - x2, dy = y1 - y2, rr = (r1 || 0) + (r2 || 0);
        return dx * dx + dy * dy <= rr * rr;
      },
      rect: function(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x2 < x1 + w1 && y1 < y2 + h2 && y2 < y1 + h1;
      }
    },

    audio: {
      play: playSound,
      tone: function(freq, dur, opts) { synthTone(freq, dur, opts); },
      melody: function(notes, opts) { playSynthMelody(notes, opts); },
      bgm: function(id, volume) {
        if (audioCache['__bgm__']) {
          audioCache['__bgm__'].pause();
          audioCache['__bgm__'].currentTime = 0;
        }
        stopSynthBgm();
        const a = audioCache[id];
        if (a) {
          a.volume = volume !== undefined ? volume : 0.5;
          a.loop = true;
          a.play().catch(function(){});
          audioCache['__bgm__'] = a;
          return;
        }
        // Synthesized preset fallback — unknown ids get the default loop
        const p = BGM_PRESETS[id] || BGM_PRESETS.bgm_main;
        const mult = ((volume !== undefined) ? volume : 0.5) / 0.5;
        playSynthMelody(p.notes, {
          tempo: p.tempo, wave: p.wave, loop: true,
          volume: (p.volume || 0.08) * mult,
          bass: p.bass, bassWave: p.bassWave,
          bassVolume: (p.bassVolume || 0.09) * mult
        });
      },
      stopBgm: function() {
        stopSynthBgm();
        if (audioCache['__bgm__']) {
          audioCache['__bgm__'].pause();
          audioCache['__bgm__'].currentTime = 0;
        }
      }
    },

    end: {
      success: function(score, stats) {
        if (!isRunning) return;
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        parent.postMessage({ type: 'GAME_END', result: 'success', score: score || 0, stats: stats }, '*');
      },
      failure: function(stats) {
        if (!isRunning) return;
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        parent.postMessage({ type: 'GAME_END', result: 'failure', score: 0, stats: stats }, '*');
      }
    },

    random: function(min, max) {
      return min + Math.random() * (max - min);
    }
  };

  // ── Asset loading ─────────────────────────────────────────────────────────
  function loadAssets(assets) {
    var promises = assets.map(function(asset) {
      if (asset.type === 'image') {
        return new Promise(function(resolve) {
          var img = new Image();
          img.onload = function() { imageCache[asset.id] = img; resolve(); };
          img.onerror = function() { resolve(); }; // missing asset → skip silently
          img.src = asset.dataUrl;
        });
      } else {
        // audio: convert data URL to blob URL (CSP-friendly inside sandbox)
        try {
          var parts = asset.dataUrl.split(',');
          var mime  = (parts[0].match(/:(.*?);/) || [])[1] || 'audio/wav';
          var bin   = atob(parts[1]);
          var buf   = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          var blobUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
          var a = new Audio(blobUrl);
          audioCache[asset.id] = a;
        } catch (e) {
          // non-base64 URL — try directly
          audioCache[asset.id] = new Audio(asset.dataUrl);
        }
        return Promise.resolve();
      }
    });
    return Promise.all(promises);
  }

  // ── Message handling ──────────────────────────────────────────────────────
  // Signal parent that iframe is ready to receive INIT
  parent.postMessage({ type: 'READY' }, '*');

  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'INIT') {
      gameContext = msg.context || {};
      loadAssets(msg.assets || []);
    }

    if (msg.type === 'START') {
      isRunning = true;

      // Watchdog: force-end if game runs too long
      setTimeout(function() {
        if (isRunning) game.end.failure();
      }, ${maxDurationMs});

      // Execute game code via dynamic <script> injection (iOS Safari compatible).
      // new Function() is blocked by WebKit in sandboxed srcdoc iframes on iOS;
      // inline <script> element injection is allowed under 'unsafe-inline' instead.
      try {
        window.__sg = game;
        var se = document.createElement('script');
        se.textContent = '(function(game){' + ${encodedCode} + '})(window.__sg)';
        document.body.appendChild(se);
        delete window.__sg;
      } catch (err) {
        parent.postMessage({ type: 'ERROR', message: String(err) }, '*');
        return;
      }

      if (startFn) {
        try { startFn(); } catch (err) {
          parent.postMessage({ type: 'ERROR', message: String(err) }, '*');
          return;
        }
      }

      // Game loop
      function loop(ts) {
        if (!isRunning) return;
        if (lastTimestamp !== null) {
          currentDelta = Math.min((ts - lastTimestamp) / 1000, 0.05);
          elapsed += currentDelta;
          updateShake(currentDelta);
          ctx.save();
          ctx.translate(shakeDx, shakeDy);
          var frameOk = true;
          if (updateFn) {
            try { updateFn(currentDelta); } catch (err) {
              parent.postMessage({ type: 'ERROR', message: String(err) }, '*');
              isRunning = false;
              frameOk = false;
            }
          }
          if (frameOk) drawFxWorld(currentDelta);
          ctx.restore();
          if (!frameOk) return;
          drawFxScreen(currentDelta);
        }
        lastTimestamp = ts;
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
    }
  });
})();
</script>
</body>
</html>`;
}
