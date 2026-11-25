// I-GBA-0024v3-gallery-frame-order.js
// ギャラリーフレームオーダー — 傾いた額縁を、水平のお手本に近い順に左のフックからドラッグで掛け並べる
// 操作: 台車の額縁を指でつかんで壁のフックまで運んで離す。左のフックほど傾きの小さい額縁を掛ける(左右どちらに傾いていても傾きの大きさで比べる)
// 終わり: 3つの壁(3→4→5枚)を並べ終えればCLEAR。順番違いの掛け間違いが3回、または時間切れでGAME OVER
// @mechanic: drag_sort
// @theme: museum_frame_tilt_sort
// 世界観: 美術館の展示準備室で、学芸員が搬入されたばかりの傾いた額縁を見比べ、水準器のお手本にまっすぐ近いものから順に壁のフックへ掛け並べていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 並べ終えた壁の数・掛け間違い回数
// スタイル: HD POST 3D
var STYLE = { bg: ['#2a241e', '#4a4036', '#6a5c4c'], main: ['#b8a88a', '#7a6a52'], accent: ['#e8c878', '#c85a3a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TIME_LIMIT = 25;
  var MISS_MAX = 3;
  var SETS = [
    [-28, 4, 16],
    [12, -3, 30, -20],
    [-9, 22, 2, -15, 29],
  ];
  var WALL_Y = H * 0.4;
  var CART_Y = H * 0.8;
  var PAINT = [
    ['#6a8aa8', '#c8a868', '#4a6a3a'],
    ['#a86a4a', '#e8d8a8', '#5a4a3a'],
    ['#4a5a7a', '#d8c8e8', '#3a3a4a'],
    ['#7a9a6a', '#f0e0a0', '#5a6a3a'],
    ['#9a7aa8', '#e8b878', '#4a3a5a'],
  ];

  var CURATOR = [
    '...hhhh...',
    '..hhhhhh..',
    '..hsssss..',
    '..sesess..',
    '...ssss...',
    '..jjjjjj..',
    '.jjjwjjjj.',
    '.sjjwjjjs.',
    '..jjjjjj..',
    '..kk..kk..',
    '..kk..kk..',
  ];
  var CURATOR_B = [
    '...hhhh...',
    '..hhhhhh..',
    '..hsssss..',
    '..sesess..',
    '...ssss...',
    '..jjjjjj.s',
    '.jjjwjjjj.',
    '.sjjwjjj..',
    '..jjjjjj..',
    '..kk..kk..',
    '.kk....kk.',
  ];
  var CUR_PAL = { h: '#3a2a22', s: '#d8b898', e: '#1a1410', j: '#5a6a7a', w: '#e8e0d0', k: '#2a2622' };
  var LEVEL = ['gggggggggggggg', 'gyyyyybbyyyyyg', 'gyyyyybbyyyyyg', 'gggggggggggggg'];
  var HOOK = ['.mm.', 'm..m', '...m', '..m.'];

  var phase = 'ATTRACT';
  var frames = [], hooks = [];
  var held, setIx, faults, placed, secs, cue, final, finalT, won, score, rec, lead, shiftT;

  function loadSet() {
    var arr = SETS[setIx];
    var sorted = arr.slice().sort(function (a, b) { return Math.abs(a) - Math.abs(b); });
    var n = arr.length;
    var span = Math.min(0.2, 0.84 / n);
    hooks = [];
    for (var h = 0; h < n; h++) hooks.push({ x: W * (0.5 + (h - (n - 1) / 2) * span), y: WALL_Y, filled: null });
    frames = [];
    var fw = Math.min(170, span * W - 30);
    for (var i = 0; i < n; i++) {
      var cx = W * (0.5 + (i - (n - 1) / 2) * Math.min(0.2, 0.84 / n));
      frames.push({ deg: arr[i], rank: sorted.indexOf(arr[i]), x: cx, y: CART_Y, homeX: cx, homeY: CART_Y, w: fw, h: fw * 1.25, hung: -1, pal: PAINT[(i + setIx) % PAINT.length], glow: 0 });
    }
    placed = 0;
  }

  function startRun() {
    setIx = 0; faults = 0; secs = TIME_LIMIT; held = null; cue = null;
    final = false; finalT = 0; won = false; score = 0; rec = false; lead = 0.8; shiftT = 0;
    loadSet();
  }

  function caption(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: '#120e0a', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function rot(px, py, deg) {
    var a = deg * Math.PI / 180;
    return { x: px * Math.cos(a) - py * Math.sin(a), y: px * Math.sin(a) + py * Math.cos(a) };
  }

  // 回転した四角形を横ストリップで塗る(凸四角形の走査線)
  function fillQuad(pts, color, alpha) {
    var minY = 1e9, maxY = -1e9;
    for (var i = 0; i < 4; i++) { minY = Math.min(minY, pts[i].y); maxY = Math.max(maxY, pts[i].y); }
    for (var y = minY; y <= maxY; y += 4) {
      var lo = 1e9, hi = -1e9;
      for (var e = 0; e < 4; e++) {
        var a = pts[e], b = pts[(e + 1) % 4];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          var x = a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y);
          lo = Math.min(lo, x); hi = Math.max(hi, x);
        }
      }
      if (hi > lo) game.draw.rect(lo, y, hi - lo, 4, color, alpha);
    }
  }

  function quad(cx, cy, w, h, deg) {
    var c = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    var out = [];
    for (var i = 0; i < 4; i++) { var r = rot(c[i][0], c[i][1], deg); out.push({ x: cx + r.x, y: cy + r.y }); }
    return out;
  }

  function drawFrame(f, scale, white) {
    var w = f.w * scale, h = f.h * scale;
    var outer = quad(f.x + 10, f.y + 16, w, h, f.deg);
    fillQuad(outer, '#000000', 0.3);
    fillQuad(quad(f.x, f.y, w, h, f.deg), white ? '#ffffff' : '#6a4a2a');
    fillQuad(quad(f.x, f.y, w - 30 * scale, h - 30 * scale, f.deg), white ? '#ffffff' : f.pal[0]);
    if (!white) {
      var off = rot(0, h * 0.15, f.deg);
      fillQuad(quad(f.x + off.x, f.y + off.y, w - 30 * scale, h * 0.35 - 15 * scale, f.deg), f.pal[2]);
      var sun = rot(w * 0.15, -h * 0.2, f.deg);
      game.draw.circle(f.x + sun.x, f.y + sun.y, 16 * scale, f.pal[1]);
    }
    var q = quad(f.x, f.y, w, h, f.deg);
    for (var e = 0; e < 4; e++) game.draw.line(q[e].x, q[e].y, q[(e + 1) % 4].x, q[(e + 1) % 4].y, STYLE.accent[0], 5);
    if (f.glow > 0) game.draw.circle(f.x, f.y, w * 0.8, STYLE.accent[0], f.glow * 0.4);
  }

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[2]], [0.7, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    game.draw.rect(0, H * 0.66, W, 12, '#3a3028');
    for (var p = 0; p < 9; p++) game.draw.rect(0, H * 0.68 + p * 60, W, 3, '#2a221c', 0.6);
    for (var s = 0; s < 3; s++) {
      var sx = W * (0.2 + s * 0.3);
      var b = 0.1 + 0.03 * Math.sin(t * 1.3 + s);
      game.draw.circle(sx, H * 0.2, 200, '#fff0c8', b);
      game.draw.circle(sx, H * 0.2, 110, '#fff0c8', b * 1.4);
      game.draw.circle(sx, H * 0.2, 40, '#fff8e0', 0.6);
    }
    game.draw.line(W * 0.08, WALL_Y - 150, W * 0.92, WALL_Y - 150, '#8a7a62', 6);
    for (var h = 0; h < hooks.length; h++) {
      var hk = hooks[h];
      game.draw.line(hk.x, WALL_Y - 150, hk.x, hk.y - 110, '#a89878', 3);
      game.draw.sprite(HOOK, { m: '#d8c8a0' }, hk.x, hk.y - 110, 7, { anchor: 'center' });
      if (!hk.filled && held) game.draw.circle(hk.x, hk.y, 60, STYLE.accent[0], 0.15 + 0.1 * Math.sin(t * 6));
    }
    game.draw.rect(W * 0.06, CART_Y + 110, W * 0.88, 26, '#5a4636');
    game.draw.circle(W * 0.12, CART_Y + 160, 26, '#2a221c');
    game.draw.circle(W * 0.88, CART_Y + 160, 26, '#2a221c');
    var fr = Math.floor(t * 2) % 2 ? CURATOR : CURATOR_B;
    game.draw.sprite(fr, CUR_PAL, W * 0.08, H * 0.62 + Math.sin(t * 2) * 4, 9, { anchor: 'center' });
  }

  function vignette() {
    for (var i = 0; i < 6; i++) {
      game.draw.rect(0, 0, 30 + i * 18, H, '#000000', 0.08);
      game.draw.rect(W - 30 - i * 18, 0, 30 + i * 18, H, '#000000', 0.08);
    }
    game.draw.rect(0, H - 80, W, 80, '#000000', 0.3);
  }

  // ── つかむ/運ぶ/掛ける(実プレイとデモで共通) ──────────────────────────────
  function grab(x, y) {
    for (var i = frames.length - 1; i >= 0; i--) {
      var f = frames[i];
      if (f.hung < 0 && Math.abs(f.x - x) < f.w * 0.6 && Math.abs(f.y - y) < f.h * 0.6) {
        held = f;
        game.audio.play('se_tap', 0.3);
        return true;
      }
    }
    return false;
  }

  function carry(x, y) {
    if (!held) return;
    held.x = x; held.y = y;
  }

  function hang(real) {
    if (!held) return;
    var f = held; held = null;
    var best = -1, bd = 1e9;
    for (var h = 0; h < hooks.length; h++) {
      var d = Math.hypot(hooks[h].x - f.x, hooks[h].y - f.y);
      if (!hooks[h].filled && d < bd) { bd = d; best = h; }
    }
    if (best < 0 || bd > 170) {
      f.x = f.homeX; f.y = f.homeY;
      game.audio.tone('E3', 0.06, { wave: 'triangle', volume: 0.06 });
      return;
    }
    if (f.rank === best) {
      hooks[best].filled = f; f.hung = best; f.x = hooks[best].x; f.y = hooks[best].y; f.glow = 1;
      placed++;
      game.feedback.good(f.x, f.y - f.h * 0.7, { text: Math.abs(f.deg) <= 4 ? 'PERFECT' : 'GOOD', color: STYLE.accent[0] });
      game.audio.play('se_coin', 0.3);
      if (placed >= frames.length) shiftT = 0.8;
    } else {
      f.x = hooks[best].x; f.y = hooks[best].y;
      cue = { t: 0.45, f: f, real: real };
      game.audio.play('se_break', 0.3);
    }
  }

  function resolveCue() {
    var f = cue.f;
    game.feedback.bad(f.x, f.y, { text: 'MISS', shake: 12 });
    f.x = f.homeX; f.y = f.homeY;
    if (cue.real) {
      faults++;
      if (faults >= MISS_MAX) { cue = null; return closeRun(false); }
    }
    cue = null;
  }

  function simulate(dt, real) {
    for (var i = 0; i < frames.length; i++) if (frames[i].glow > 0) frames[i].glow = Math.max(0, frames[i].glow - dt * 1.5);
    if (cue) {
      cue.t -= dt;
      if (cue.t <= 0) resolveCue();
      return;
    }
    if (shiftT > 0) {
      shiftT -= dt;
      if (shiftT <= 0) {
        if (!real) { loadSet(); return; }
        setIx++;
        if (setIx === 1) {
          game.fx.popup('NICE', W * 0.5, H * 0.26, { color: STYLE.accent[0], size: 70 });
          game.audio.play('se_milestone', 0.45);
        }
        if (setIx >= SETS.length) return closeRun(true);
        loadSet();
      }
    }
  }

  function closeRun(ok) {
    if (final) return;
    final = true; won = ok; finalT = 1.2;
    score = setIx * 300 + placed * 40 - faults * 50 + (ok ? Math.round(secs * 20) : 0);
    score = Math.max(0, score);
    rec = ok && score > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  // ── ATTRACT: 一番まっすぐな額を左端へ掛ける成功 + 違う額を次のフックへ掛ける失敗 ─
  var demo = { t: 0, gx: W * 0.5, gy: CART_Y, press: false, step: 0, pick: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { startRun(); lead = 0; demo.step = 0; demo.pick = null; }
    function pickRank(r) { for (var i = 0; i < frames.length; i++) if (frames[i].rank === r && frames[i].hung < 0) return frames[i]; return null; }
    var tgt;
    if (demo.step === 0) {
      demo.pick = pickRank(0);
      if (demo.pick) {
        demo.gx += (demo.pick.x - demo.gx) * Math.min(1, dt * 8); demo.gy += (demo.pick.y - demo.gy) * Math.min(1, dt * 8);
        if (Math.hypot(demo.pick.x - demo.gx, demo.pick.y - demo.gy) < 12 && cyc > 0.5) { grab(demo.gx, demo.gy); demo.step = 1; }
      }
    } else if (demo.step === 1 || demo.step === 4) {
      tgt = hooks[demo.step === 1 ? 0 : 1];
      demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 5); demo.gy += (tgt.y - demo.gy) * Math.min(1, dt * 5);
      carry(demo.gx, demo.gy);
      if (Math.hypot(tgt.x - demo.gx, tgt.y - demo.gy) < 10) { hang(false); demo.step++; }
    } else if (demo.step === 2 && cyc > 2.3) {
      demo.step = 3;
    } else if (demo.step === 3) {
      demo.pick = pickRank(2);
      if (demo.pick) {
        demo.gx += (demo.pick.x - demo.gx) * Math.min(1, dt * 8); demo.gy += (demo.pick.y - demo.gy) * Math.min(1, dt * 8);
        if (Math.hypot(demo.pick.x - demo.gx, demo.pick.y - demo.gy) < 12) { grab(demo.gx, demo.gy); demo.step = 4; }
      }
    }
    demo.press = !!held;
    simulate(dt, false);
  }

  game.onPress(function (x, y) {
    if (phase !== 'PLAYING' || final) return;
    if (lead > 0 || cue || shiftT > 0) { game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.04 }); return; }
    if (!grab(x, y)) game.fx.burst(x, y, { color: STYLE.main[0], count: 3, speed: 70 });
  });
  game.onMove(function (x, y) {
    if (phase !== 'PLAYING' || !held) return;
    carry(x, y);
    if (Math.random() < 0.04) game.audio.tone('G2', 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function (x, y) {
    if (phase !== 'PLAYING') return;
    if (held) hang(true);
    else game.audio.play('se_tap', 0.04);
  });
  game.onTap(function (x, y) {
    if (phase === 'ATTRACT') {
      game.audio.play('se_coin', 0.5);
      phase = 'PLAYING'; startRun();
    } else if (phase === 'RESULT') {
      game.audio.play('se_tap', 0.3);
      phase = 'ATTRACT'; startRun(); demo.t = 0;
    }
  });

  function drawBoard() {
    drawRoom();
    for (var i = 0; i < frames.length; i++) if (frames[i] !== held) drawFrame(frames[i], frames[i].hung >= 0 ? 1 : 0.8, false);
    if (held) drawFrame(held, 1.08, false);
    if (cue) drawFrame(cue.f, 1 + (0.45 - cue.t) * 0.6, true);
    vignette();
  }

  function drawHud() {
    game.draw.sprite(LEVEL, { g: '#8a7a62', y: '#c8d878', b: '#ffffff' }, W * 0.5, 190, 10, { anchor: 'center' });
    caption((setIx + 1 > SETS.length ? SETS.length : setIx + 1) + ' / ' + SETS.length, W * 0.5, 80, 54, STYLE.main[0]);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 56, 80, 18, m < MISS_MAX - faults ? STYLE.accent[0] : '#3a3028');
    for (var p = 0; p < frames.length; p++) game.draw.rect(90 + p * 40, 66, 28, 28, p < placed ? STYLE.accent[0] : '#3a3028');
    var fr = Math.max(0, secs / TIME_LIMIT);
    game.draw.rect(80, 126, W - 160, 14, '#1a1410');
    game.draw.rect(80, 126, (W - 160) * fr, 14, secs < 5 ? STYLE.accent[1] : STYLE.main[0]);
  }

  game.onUpdate(function (dt) {
    if (phase === 'ATTRACT') {
      if (!frames.length) startRun();
      stepDemo(dt);
      drawBoard();
      game.draw.sprite(LEVEL, { g: '#8a7a62', y: '#c8d878', b: '#ffffff' }, W * 0.5, H * 0.14, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      caption('FRAME ORDER', W * 0.5, H * 0.06, 78, STYLE.accent[0]);
      caption('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 34, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) caption('► 100円 投入 ◄', W * 0.5, H * 0.955, 46, STYLE.accent[0]);
      else caption('INSERT COIN', W * 0.5, H * 0.955, 38, STYLE.main[0]);
      return;
    }
    if (phase === 'RESULT') {
      drawBoard();
      game.draw.rect(90, H * 0.2, W - 180, 500, '#120e0a', 0.82);
      caption(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.26, 100, won ? STYLE.accent[0] : STYLE.accent[1]);
      caption(setIx + ' / ' + SETS.length, W * 0.5, H * 0.33, 64, STYLE.main[0]);
      caption('SCORE ' + score, W * 0.5, H * 0.38, 46, STYLE.main[0]);
      if (rec) caption('NEW RECORD', W * 0.5, H * 0.43, 52, STYLE.accent[0]);
      else caption('BEST ' + (game.best || 0), W * 0.5, H * 0.43, 40, STYLE.main[0]);
      if (!won) caption('あと' + Math.max(1, frames.length - placed) + '枚!', W * 0.5, H * 0.48, 46, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) caption('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, STYLE.main[0]);
      return;
    }

    if (final) {
      finalT -= dt;
      if (finalT <= 0) {
        phase = 'RESULT';
        var st = { walls: setIx, faults: faults, hung: placed };
        if (won) game.end.success(score, st); else game.end.failure(st);
      }
    } else if (lead > 0) {
      lead -= dt;
      if (lead <= 0) game.audio.play('se_tap', 0.3);
    } else {
      simulate(dt, true);
      if (!cue && !final) {
        secs -= dt;
        if (secs <= 0) {
          secs = 0; held = null;
          game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: STYLE.accent[1], size: 80 });
          closeRun(false);
        }
      }
    }

    drawBoard();
    drawHud();
    if (lead > 0) caption(lead > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.5, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C4', 1], ['G4', 1], ['E4', 1], ['F4', 1],
      ['D4', 1], ['A4', 1], ['G4', 2],
    ], { tempo: 90, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    phase = 'ATTRACT';
    startRun();
  });
})(game);
