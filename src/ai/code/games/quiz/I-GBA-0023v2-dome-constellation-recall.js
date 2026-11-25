// I-GBA-0023v2-dome-constellation-recall.js
// ドームコンステレーションリコール — 一瞬ずつ点灯した星の順番を覚え、同じ順に星をたどって星座線を結ぶ
// 操作: 星が順番に一つずつ光って消える。消えたら同じ順番で星に触れていく(なぞって通過してもよい)。触れた星どうしが線で結ばれる
// 終わり: 3つの星座(3→4→5個)を結べばCLEAR。順番違い・3秒放置が2回、または入力時間の合計切れでGAME OVER
// @mechanic: memory_sequence
// @theme: planetarium_constellation_recall
// 世界観: プラネタリウムの操作室で、解説員が投影機に一瞬ずつ点灯した星の順番を覚え、上映に間に合うよう同じ順で星座線を結んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 結んだ星座の数・結んだ星の数
// スタイル: NEO-RETRO
var STYLE = { bg: ['#140c2a', '#2a1c52', '#3d2a6e'], main: ['#e8e0ff', '#5ce1c6'], accent: ['#ff6b35', '#8a7ac8'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TIME_LIMIT = 14;
  var ROUNDS = [3, 4, 5];
  var MISS_MAX = 2;
  var CX = W * 0.5, CY = H * 0.46;
  var BASE = [
    [0.22, 0.24], [0.5, 0.2], [0.8, 0.27], [0.3, 0.42], [0.66, 0.4], [0.18, 0.58], [0.5, 0.56], [0.83, 0.6],
  ];
  var NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
  var ORDERS = [
    [1, 3, 6], [0, 4, 7], [2, 6, 5], [7, 3, 1],
    [5, 3, 1, 4], [0, 1, 2, 7], [6, 4, 0, 5], [3, 7, 2, 0],
    [2, 4, 6, 3, 0], [5, 6, 7, 4, 1], [0, 3, 6, 7, 2], [1, 5, 3, 4, 7],
  ];

  var STAR = ['...s...', '..sSs..', '.sSSSs.', 'sSSWSSs', '.sSSSs.', '..sSs..', '...s...'];
  var STAR_DIM = ['.......', '...d...', '..ddd..', '.ddDdd.', '..ddd..', '...d...', '.......'];
  var GUIDE = [
    '....hhhh....',
    '...hhhhhh...',
    '...hsssshh..',
    '...seseshh..',
    '....ssss....',
    '..vvvvvvvv..',
    '.vvvmmvvvvs.',
    '.svvvvvvvv..',
    '...vvvvvv...',
    '...kk..kk...',
  ];
  var GUIDE_B = [
    '....hhhh....',
    '...hhhhhh...',
    '...hsssshh..',
    '...seseshh..',
    '....ssss....',
    '..vvvvvvvv.s',
    '.vvvmmvvvvs.',
    '.svvvvvvv...',
    '...vvvvvv...',
    '...kk..kk...',
  ];
  var GUIDE_PAL = { h: '#3d2a6e', s: '#f2c8a8', e: '#140c2a', v: STYLE.accent[1], m: STYLE.main[1], k: '#140c2a' };
  var PROJ = ['..pppp..', '.pPPPPp.', 'pPPoPPPp', 'pPPPPPPp', '.pPPPPp.', '...pp...', '..pppp..', '.pppppp.'];

  var view = 'ATTRACT';
  var R = {};

  function starPos(i) {
    var p = BASE[i];
    var x = W * p[0], y = H * p[1] + 60;
    if (R.spin) {
      var a = R.spin, dx = x - CX, dy = y - CY;
      return { x: CX + dx * Math.cos(a) - dy * Math.sin(a) * 0.6, y: CY + dx * Math.sin(a) * 0.6 + dy * Math.cos(a) };
    }
    return { x: x, y: y };
  }

  function beginRun() {
    R.round = 0; R.miss = 0; R.linked = 0; R.clock = TIME_LIMIT; R.set = 0;
    R.spin = 0; R.cue = null; R.finish = false; R.wait = 0; R.win = false; R.score = 0; R.rec = false;
    R.lines = []; R.flash = -1; R.countIn = 0.8;
    loadRound();
  }

  function loadRound() {
    var len = ROUNDS[Math.min(R.round, ROUNDS.length - 1)];
    var bank = ORDERS.filter(function (o) { return o.length === len; });
    R.seq = bank[(R.set + R.round) % bank.length];
    R.set++;
    R.step = 'show'; R.showT = -0.5; R.pos = 0; R.idle = 0; R.lines = []; R.flash = -1;
    R.gap = R.round === 0 ? 0.62 : R.round === 1 ? 0.54 : 0.48;
  }

  function neon(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: '#0a0616', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function paintDome() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var k = 1; k <= 4; k++) {
      var rx = W * 0.12 * k, ry = H * 0.09 * k;
      var prev = null;
      for (var a = 0; a <= 16; a++) {
        var ang = Math.PI + (a / 16) * Math.PI;
        var px = CX + Math.cos(ang) * (W * 0.5 + 20), py = H * 0.7 + Math.sin(ang) * (H * 0.55 - ry * 0.3);
        if (k === 1 && prev) game.draw.line(prev.x, prev.y, px, py, STYLE.bg[2], 6);
        prev = { x: px, y: py };
      }
      game.draw.line(CX - rx, H * 0.7, CX, H * 0.16, STYLE.bg[2], 2);
      game.draw.line(CX + rx, H * 0.7, CX, H * 0.16, STYLE.bg[2], 2);
    }
    for (var i = 0; i < 46; i++) {
      var sx = (i * 233 + 71) % W, sy = 260 + (i * 157) % Math.floor(H * 0.46);
      var tw = 0.3 + 0.3 * Math.sin(t * 2 + i * 1.7);
      game.draw.rect(sx, sy, 6, 6, STYLE.main[0], tw);
    }
    game.draw.rect(0, H * 0.7, W, H * 0.3, '#0e0820');
    for (var s = 0; s < 6; s++) game.draw.rect(60 + s * 170, H * 0.72, 120, 40, STYLE.bg[1]);
    var pulse = 0.25 + 0.15 * Math.sin(t * 3);
    game.draw.circle(CX, H * 0.74, 70, STYLE.main[1], pulse * 0.4);
    game.draw.sprite(PROJ, { p: '#5a4a8a', P: '#8a7ac8', o: STYLE.main[1] }, CX, H * 0.76, 14, { anchor: 'center' });
    var fr = Math.floor(t * 2) % 2 ? GUIDE : GUIDE_B;
    game.draw.sprite(fr, GUIDE_PAL, W * 0.18, H * 0.8 + Math.sin(t * 2.4) * 4, 13, { anchor: 'center' });
    game.draw.rect(W * 0.08, H * 0.845, 240, 50, '#3d2a6e');
    for (var b = 0; b < 5; b++) game.draw.rect(W * 0.08 + 20 + b * 44, H * 0.855, 24, 24, b === Math.floor(t * 3) % 5 ? STYLE.accent[0] : STYLE.main[1], 0.8);
  }

  function paintStars() {
    for (var i = 0; i < BASE.length; i++) {
      var p = starPos(i);
      var lit = R.flash === i;
      var inLine = false;
      for (var q = 0; q < R.pos; q++) if (R.seq[q] === i) inLine = true;
      if (lit) {
        game.draw.circle(p.x, p.y, 90, STYLE.accent[0], 0.35);
        game.draw.sprite(STAR, { s: STYLE.accent[0], S: '#ffd0b0', W: '#ffffff' }, p.x, p.y, 16, { anchor: 'center' });
      } else if (inLine) {
        game.draw.sprite(STAR, { s: STYLE.main[1], S: '#c8fff0', W: '#ffffff' }, p.x, p.y, 11, { anchor: 'center' });
      } else {
        game.draw.circle(p.x, p.y, 48, STYLE.accent[1], 0.12 + 0.05 * Math.sin(game.time.elapsed * 3 + i));
        game.draw.sprite(STAR_DIM, { d: STYLE.accent[1], D: STYLE.main[0] }, p.x, p.y, 11, { anchor: 'center' });
      }
    }
    for (var l = 1; l < R.pos; l++) {
      var a = starPos(R.seq[l - 1]), b = starPos(R.seq[l]);
      game.draw.line(a.x, a.y, b.x, b.y, STYLE.main[1], 8);
    }
  }

  function hitStar(x, y) {
    for (var i = 0; i < BASE.length; i++) {
      var p = starPos(i);
      if (Math.hypot(p.x - x, p.y - y) < 85) return i;
    }
    return -1;
  }

  // ── 入力(実プレイとデモで共通) ────────────────────────────────────────────
  function touchStar(i, real) {
    if (R.step !== 'input' || R.cue || i < 0) return false;
    if (R.pos > 0 && R.seq[R.pos - 1] === i) return false;
    var p = starPos(i);
    if (R.seq[R.pos] === i) {
      R.pos++; R.idle = 0;
      game.audio.tone(NOTES[i], 0.18, { wave: 'square', volume: 0.08 });
      game.fx.burst(p.x, p.y, { color: STYLE.main[1], count: 8, speed: 180 });
      if (real) R.linked++;
      if (R.pos >= R.seq.length) {
        game.feedback.good(CX, H * 0.3, { text: R.round === 2 ? 'PERFECT' : 'GOOD', color: STYLE.main[1], count: 20 });
        R.step = 'done'; R.showT = 0.7;
      }
      return true;
    }
    var want = starPos(R.seq[R.pos]);
    R.cue = { t: 0.45, x: want.x, y: want.y, real: real };
    game.audio.play('se_tap', 0.3);
    return true;
  }

  function roundTick(dt, real) {
    if (R.cue) {
      R.cue.t -= dt;
      if (R.cue.t <= 0) {
        game.feedback.bad(R.cue.x, R.cue.y, { text: 'MISS', shake: 12 });
        if (R.cue.real) {
          R.miss++;
          if (R.miss >= MISS_MAX) { R.cue = null; return endRun(false); }
        }
        R.cue = null;
        loadRound();
      }
      return;
    }
    if (R.round === 2 && R.step === 'input') R.spin += dt * 0.22;
    if (R.step === 'show') {
      R.showT += dt;
      var k = Math.floor(R.showT / R.gap);
      var within = R.showT - k * R.gap;
      var idx = (R.showT >= 0 && k < R.seq.length && within < R.gap * 0.72) ? R.seq[k] : -1;
      if (idx !== R.flash && idx >= 0) game.audio.tone(NOTES[idx], 0.2, { wave: 'triangle', volume: 0.1 });
      R.flash = idx;
      if (k >= R.seq.length) { R.step = 'input'; R.flash = -1; R.idle = 0; game.audio.play('se_tap', 0.2); }
    } else if (R.step === 'input') {
      R.idle += dt;
      if (real && R.idle > 3) {
        var want = starPos(R.seq[R.pos]);
        R.cue = { t: 0.45, x: want.x, y: want.y, real: true };
      }
    } else if (R.step === 'done') {
      R.showT -= dt;
      if (R.showT <= 0) {
        if (real) {
          R.round++;
          if (R.round === 2) {
            game.fx.popup('NICE', CX, H * 0.3, { color: STYLE.accent[0], size: 74 });
            game.audio.play('se_milestone', 0.45);
          }
          if (R.round >= ROUNDS.length) return endRun(true);
        }
        loadRound();
      }
    }
  }

  function endRun(ok) {
    if (R.finish) return;
    R.finish = true; R.win = ok; R.wait = 1.2;
    R.score = R.round * 300 + R.linked * 30 + (ok ? Math.round(R.clock * 20) : 0);
    R.rec = ok && R.score > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  // ── ATTRACT: 3つの順番を見せ→正しくたどる成功、次は順番違いの失敗 ───────────
  var demo = { t: 0, gx: CX, gy: H * 0.8, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) { beginRun(); R.countIn = 0; demo.n = 0; }
    demo.press = Math.max(0, demo.press - dt);
    if (R.step === 'input' && !R.cue) {
      var tgtIdx = R.seq[R.pos];
      if (demo.n >= 3 && R.pos === 1) tgtIdx = R.seq[2];
      var tp = starPos(tgtIdx);
      demo.gx += (tp.x - demo.gx) * Math.min(1, dt * 9);
      demo.gy += (tp.y - demo.gy) * Math.min(1, dt * 9);
      if (Math.hypot(tp.x - demo.gx, tp.y - demo.gy) < 20) {
        touchStar(tgtIdx, false); demo.n++; demo.press = 0.18;
      }
    }
    roundTick(dt, false);
  }

  game.onPress(function (x, y) {
    if (view !== 'PLAYING' || R.finish) return;
    var i = hitStar(x, y);
    if (R.step === 'input' && i >= 0) touchStar(i, true);
    else game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function (x, y) {
    if (view !== 'PLAYING' || R.finish || R.step !== 'input') return;
    var i = hitStar(x, y);
    if (i >= 0 && i === R.seq[R.pos] && touchStar(i, true)) game.fx.burst(x, y, { color: STYLE.main[0], count: 2, speed: 60 });
  });
  game.onTap(function (x, y) {
    if (view === 'ATTRACT') {
      game.audio.play('se_coin', 0.5);
      view = 'PLAYING'; beginRun();
    } else if (view === 'RESULT') {
      game.audio.play('se_tap', 0.3);
      view = 'ATTRACT'; beginRun(); demo.t = 0;
    }
  });

  function paintCue() {
    if (!R.cue) return;
    var k = 0.45 - R.cue.t;
    game.draw.circle(R.cue.x, R.cue.y, 40 + k * 200, '#ffffff', 0.5);
    game.draw.sprite(STAR, { s: '#ffffff', S: '#ffffff', W: STYLE.accent[0] }, R.cue.x, R.cue.y, 18, { anchor: 'center' });
  }

  function paintHud() {
    for (var i = 0; i < ROUNDS.length; i++) {
      var got = i < R.round;
      game.draw.sprite(STAR, got ? { s: STYLE.main[1], S: '#c8fff0', W: '#ffffff' } : { s: '#3d2a6e', S: '#3d2a6e', W: '#5a4a8a' }, 120 + i * 90, 90, 8, { anchor: 'center' });
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.rect(W - 130 - m * 70, 70, 44, 44, m < MISS_MAX - R.miss ? STYLE.accent[0] : '#3d2a6e');
    neon(Math.min(R.round + 1, ROUNDS.length) + ' / ' + ROUNDS.length, CX, 90, 52, STYLE.main[0]);
    var fr = Math.max(0, R.clock / TIME_LIMIT);
    game.draw.rect(80, 160, W - 160, 18, '#0a0616');
    game.draw.rect(80, 160, (W - 160) * fr, 18, R.clock < 5 ? STYLE.accent[0] : STYLE.main[1]);
    if (R.step === 'show') {
      for (var d = 0; d < R.seq.length; d++) game.draw.circle(CX - (R.seq.length - 1) * 30 + d * 60, H * 0.66, 12, d * R.gap <= R.showT ? STYLE.accent[0] : '#3d2a6e');
    } else if (R.step === 'input') {
      for (var e = 0; e < R.seq.length; e++) game.draw.circle(CX - (R.seq.length - 1) * 30 + e * 60, H * 0.66, 12, e < R.pos ? STYLE.main[1] : '#3d2a6e');
    }
  }

  game.onUpdate(function (dt) {
    if (view === 'ATTRACT') {
      if (!R.seq) beginRun();
      stepDemo(dt);
      paintDome();
      paintStars();
      paintCue();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      neon('STAR RECALL', CX, H * 0.07, 80, STYLE.accent[0]);
      neon('HI-SCORE ' + (game.best || 0), CX, H * 0.115, 36, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) neon('► 100円 投入 ◄', CX, H * 0.95, 46, STYLE.accent[0]);
      else neon('INSERT COIN', CX, H * 0.95, 38, STYLE.main[0]);
      return;
    }
    if (view === 'RESULT') {
      paintDome();
      paintStars();
      game.draw.rect(90, H * 0.2, W - 180, 500, '#0a0616', 0.82);
      neon(R.win ? 'CLEAR' : 'GAME OVER', CX, H * 0.26, 100, R.win ? STYLE.main[1] : STYLE.accent[0]);
      neon(R.round + ' / ' + ROUNDS.length, CX, H * 0.33, 64, STYLE.main[0]);
      neon('SCORE ' + R.score, CX, H * 0.38, 46, STYLE.main[0]);
      if (R.rec) neon('NEW RECORD', CX, H * 0.43, 52, STYLE.accent[0]);
      else neon('BEST ' + (game.best || 0), CX, H * 0.43, 40, STYLE.main[0]);
      if (!R.win) neon('あと' + (ROUNDS.length - R.round) + '個!', CX, H * 0.48, 46, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) neon('TAP TO CONTINUE', CX, H * 0.94, 40, STYLE.main[0]);
      return;
    }

    if (R.finish) {
      R.wait -= dt;
      if (R.wait <= 0) {
        view = 'RESULT';
        var st = { constellations: R.round, stars: R.linked, misses: R.miss };
        if (R.win) game.end.success(R.score, st); else game.end.failure(st);
      }
    } else if (R.countIn > 0) {
      R.countIn -= dt;
      if (R.countIn <= 0) game.audio.play('se_tap', 0.3);
    } else {
      roundTick(dt, true);
      if (!R.cue && !R.finish && R.step !== 'show') {
        R.clock -= dt;
        if (R.clock <= 0) {
          R.clock = 0;
          game.fx.popup('TIME UP', CX, H * 0.45, { color: STYLE.accent[0], size: 80 });
          endRun(false);
        }
      }
    }

    paintDome();
    paintStars();
    paintCue();
    paintHud();
    if (R.countIn > 0) neon(R.countIn > 0.35 ? 'READY?' : 'GO!', CX, H * 0.45, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A3', 1], ['E4', 1], ['C4', 1], ['G4', 1],
      ['F3', 1], ['C4', 1], ['E4', 1], ['B3', 1],
    ], { tempo: 84, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    view = 'ATTRACT';
    beginRun();
  });
})(game);
