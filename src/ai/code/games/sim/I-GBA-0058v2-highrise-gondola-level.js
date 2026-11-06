// I-GBA-0058v2-highrise-gondola-level.js
// 窓拭きゴンドラ — 左手と右手でゴンドラの左右のロープを受け持ち、突風で傾く側を押し返して水平のまま窓の高さに留める
// 操作: 画面の左半分を押している間は左ロープ、右半分を押している間は右ロープが巻き上がる(離すとその側はゆっくり下がる)。両手を同時に使って両端を窓の高さに揃え続ける
// 終わり: 22秒以内に窓を5枚拭き終えればCLEAR。傾きすぎるとバケツが落ちて1つ失い、2つ失う/時間切れでGAME OVER
// @mechanic: coop_2zone
// @theme: highrise_gondola_window_wash
// 世界観: 高層ビルの外壁で、窓拭きゴンドラに乗った清掃員が左右のロープを両手で操り、ビル風に煽られる床を水平に保ったまま汚れた窓を一枚ずつ拭き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 拭いた窓の枚数・水平を保てた時間・スコア
// スタイル: 90s LOW POLY

(function (game) {
  var STYLE = { bg: ['#5a7fa8', '#9ab8d0', '#d4e0e6'], main: ['#7d8c9a', '#c8b496', '#3a4a5c'], accent: ['#e85a2a', '#ffd84a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SKY = STYLE.bg[0], HAZE = STYLE.bg[1], FOG = STYLE.bg[2];
  var CONC = STYLE.main[0], SAND = STYLE.main[1], STEEL = STYLE.main[2];
  var ORANGE = STYLE.accent[0], YELLOW = STYLE.accent[1];
  var GLASS = '#3f6585', GRIME = '#7a6844', INK = '#141a22', WHITE = '#f4f8fa', RED = '#e8443a';

  var TITLE = 'GONDOLA';
  var TIME_LIMIT = 22;
  var NEEDED = 5;
  var BUCKETS = 2;
  var TARGETS = [0.42, 0.59, 0.25, 0.76, 0.42];
  var ROWS = [0.25, 0.42, 0.59, 0.76];
  var TOL = 0.06;
  var TILT_MAX = 0.15, TILT_WARN = 0.09;
  var UP = 0.3, DOWN = 0.17;
  var CLEAN_TIME = 1.5;
  var HALF = 300;

  var CLEANER = [
    ['...hhhh...', '..hhhhhhh.', '...ssss...', '...seses..', '...ssss...', '..oooooo..', '.aoooooo.q', '.a.oooo..q', '...oooo.qq', '...o..o...', '...o..o...', '..bb..bb..'],
    ['...hhhh...', '..hhhhhhh.', '...ssss...', '...seses..', '...ssss...', '..oooooo.q', '.aoooooo.q', '.a.oooo.qq', '...oooo...', '...o..o...', '...o..o...', '..bb..bb..'],
    ['...hhhh...', '..hhhhhhh.', '...ssss...', '...sksks..', '...ssss...', 'a.oooooo.a', '.aoooooo.a', '...oooo...', '...oooo...', '...o..o...', '..o....o..', '.bb....bb.'],
  ];
  var CL_PAL = { h: ORANGE, s: '#f0c8a0', e: INK, k: INK, o: '#2a62a8', a: '#f0c8a0', q: '#d0d4d8', b: '#222222' };
  var BUCKET = ['mwwwm', 'mmmmm', '.mmm.'];
  var ARROW = ['..y..', '.yyy.', 'yyyyy', '..y..', '..y..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var hL, hR, holdL, holdR, winI, gusts, clock, timeLeft, cleanP, windowsDone, buckets, levelT, score;
  var halt, over, won, endT, resT, sent, prevBest, ready, bucketX, bucketV, tip, crank, wind, creakT, flick;

  function yOf(h) { return H * 0.72 - h * H * 0.5; }

  function buildGusts(fixed) {
    if (fixed) return fixed;
    var list = [], t = 2.2;
    var sides = [1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1];
    for (var i = 0; i < sides.length; i++) {
      list.push({ at: t, side: sides[i], dur: 1.0 + (i % 3) * 0.2, pow: 0.15 + i * 0.012, up: i >= 5 && i % 3 === 1, warned: false });
      t += Math.max(1.3, 2.4 - i * 0.1);
    }
    return list;
  }

  function initGame() {
    hL = 0.36; hR = 0.36; holdL = false; holdR = false; winI = 0; gusts = buildGusts(); clock = 0;
    timeLeft = TIME_LIMIT; cleanP = 0; windowsDone = 0; buckets = BUCKETS; levelT = 0; score = 0;
    halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
    ready = 0.8; bucketX = 0; bucketV = 0; tip = null; crank = [0, 0]; wind = [0, 0]; creakT = 0; flick = [0, 0];
  }

  // ── ゴンドラの物理(プレイ・デモ共通) ──
  function applyWind(t) {
    wind[0] = 0; wind[1] = 0;
    for (var i = 0; i < gusts.length; i++) {
      var g = gusts[i];
      if (t >= g.at && t < g.at + g.dur) wind[g.side < 0 ? 0 : 1] += g.up ? g.pow : -g.pow;
    }
  }

  function stepGondola(dt, vol) {
    hL += ((holdL ? UP : -DOWN) + wind[0]) * dt;
    hR += ((holdR ? UP : -DOWN) + wind[1]) * dt;
    hL = Math.max(0.05, Math.min(0.95, hL));
    hR = Math.max(0.05, Math.min(0.95, hR));
    if (holdL) crank[0] += dt * 9;
    if (holdR) crank[1] += dt * 9;
    var tilt = hR - hL;
    bucketV += -tilt * 14 * dt;
    bucketV *= Math.max(0, 1 - dt * 2.5);
    bucketX = Math.max(-1, Math.min(1, bucketX + bucketV * dt));
    if (Math.abs(tilt) > TILT_WARN) {
      creakT -= dt;
      if (creakT <= 0) { creakT = 0.25; game.audio.tone(150, 0.08, { wave: 'sawtooth', volume: 0.05 * vol, slide: 40 }); }
    }
    var tgt = TARGETS[Math.min(winI, TARGETS.length - 1)];
    var inBand = Math.abs(hL - tgt) < TOL && Math.abs(hR - tgt) < TOL;
    if (Math.abs(tilt) < 0.03) levelT += dt;
    return inBand;
  }

  function tipped() { return Math.abs(hR - hL) > TILT_MAX; }

  function startTip(vol) {
    var low = hR < hL ? 1 : -1;
    var bx = W / 2 + low * HALF * 0.9;
    tip = { x: bx, y: yOf(low > 0 ? hR : hL) - 40, vx: low * 160, vy: -200, t: 0 };
    game.audio.tone(320, 0.3, { wave: 'square', volume: 0.08 * vol, slide: -260 });
  }

  function windowDone(vol) {
    windowsDone++; cleanP = 0;
    game.feedback.good(W / 2, yOf(TARGETS[winI]) - 140, { text: 'NICE', color: YELLOW, count: 14, volume: 0.5 * vol });
    if (state !== S.PLAYING) return;
    score += 300;
    if (windowsDone === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.3, { color: WHITE, size: 72 }); game.audio.play('se_milestone', 0.4); }
    else game.audio.play('se_coin', 0.3);
    winI++;
    if (windowsDone >= NEEDED) finish(true);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 20) + Math.floor(levelT * 30);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.25 + (i % 2) * 0.1), { color: i % 2 ? YELLOW : WHITE, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { windows: windowsDone, buckets: buckets, levelSec: Math.round(levelT * 10) / 10 };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function readHolds() {
    holdL = false; holdR = false;
    var ts = game.touches;
    for (var i = 0; i < ts.length; i++) {
      if (ts[i].x < W / 2) holdL = true; else holdR = true;
    }
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    var side = x < W / 2 ? 0 : 1;
    flick[side] = 0.15;
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    game.audio.tone(side === 0 ? 392 : 523, 0.06, { wave: 'square', volume: 0.06 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (over || halt) return;
    game.audio.tone(x < W / 2 ? 330 : 440, 0.04, { wave: 'triangle', volume: 0.04 });
  });

  // ── 描画(輪郭は line、面は横ストリップ塗り、頂点ジッター) ──
  function fillPoly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i].y); maxY = Math.max(maxY, pts[i].y); }
    for (var y = Math.floor(minY); y < maxY; y += 3) {
      var x0 = 1e9, x1 = -1e9, yy = y + 1.5;
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a.y <= yy && b.y > yy) || (b.y <= yy && a.y > yy)) {
          var xi = a.x + (yy - a.y) * (b.x - a.x) / (b.y - a.y);
          x0 = Math.min(x0, xi); x1 = Math.max(x1, xi);
        }
      }
      if (x1 > x0) game.draw.rect(x0, y, x1 - x0, 3, col, alpha);
    }
  }
  function jit(i) { return Math.sin(game.time.elapsed * 13 + i * 2.3) * 1.6; }

  function drawCity() {
    game.draw.gradient(0, H, [[0, SKY], [0.45, HAZE], [0.8, FOG], [1, '#b8c4cc']]);
    // 遠景のビル(フォグで潰す)
    for (var b = 0; b < 7; b++) {
      var bx = b * 170 - 40, bh = 300 + (b * 137) % 260, top = H * 0.62 - bh;
      game.draw.rect(bx, top + 30, 120, H * 0.8 - top - 30, '#6f8698');
      game.draw.rect(bx + 120, top + 54, 40, H * 0.8 - top - 54, '#5a6f80');
      fillPoly([{ x: bx, y: top + 31 }, { x: bx + 60, y: top + jit(b) }, { x: bx + 120, y: top + 31 }], '#7d94a6');
      fillPoly([{ x: bx + 120, y: top + 31 }, { x: bx + 160, y: top + 55 }, { x: bx + 120, y: top + 55 }], '#4f6374');
    }
    game.draw.rect(0, H * 0.3, W, H * 0.7, FOG, 0.35);
    // 手前のビル外壁
    var fx0 = W * 0.1, fx1 = W * 0.9;
    game.draw.rect(fx0, H * 0.1, fx1 - fx0, H * 0.7, CONC);
    for (var st = 0; st < 6; st++) game.draw.rect(fx0, H * (0.1 + st * 0.12), fx1 - fx0, 6, '#8a99a6');
    fillPoly([{ x: fx1, y: H * 0.1 }, { x: W, y: H * 0.13 }, { x: W, y: H * 0.8 }, { x: fx1 + 20, y: H * 0.8 }], '#5f6c78');
    game.draw.line(fx0, H * 0.1, fx1, H * 0.1, STEEL, 6);
    game.draw.line(fx0, H * 0.1, fx0 - 20, H * 0.8, STEEL, 4);
    // 屋上のアームと滑車
    for (var s = -1; s <= 1; s += 2) {
      var ax = W / 2 + s * HALF;
      game.draw.line(ax, H * 0.1, ax, H * 0.075, STEEL, 12);
      game.draw.line(ax - s * 80, H * 0.075, ax, H * 0.075, STEEL, 10);
      game.draw.circle(ax, H * 0.08, 14, YELLOW);
    }
  }

  function drawWindows() {
    var tgt = TARGETS[Math.min(winI, TARGETS.length - 1)];
    for (var r = 0; r < ROWS.length; r++) {
      for (var c = 0; c < 3; c++) {
        var cx = W / 2 + (c - 1) * 270, cy = yOf(ROWS[r]) - 130;
        var isTarget = c === 1 && Math.abs(ROWS[r] - tgt) < 0.01 && !over;
        if (isTarget && halt && halt.kind === 'time') game.draw.rect(cx - 130, cy - 90, 260, 180, WHITE, 0.8);
        fillPoly([{ x: cx - 100, y: cy - 60 }, { x: cx + 100, y: cy - 60 + jit(r * 3 + c) }, { x: cx + 100, y: cy + 60 }, { x: cx - 100, y: cy + 60 }], STEEL);
        game.draw.rect(cx - 90, cy - 52, 180, 104, GLASS);
        game.draw.line(cx - 70, cy + 40, cx - 20, cy - 40, '#8fb0c8', 6);
        if (isTarget) {
          var dirt = 1 - cleanP;
          for (var k = 0; k < 104; k += 8) game.draw.rect(cx - 90, cy - 52 + k, 180 * dirt, 8, GRIME, 0.85);
          if (Math.floor(game.time.elapsed * 4) % 2 === 0) {
            game.draw.line(cx - 104, cy - 64, cx + 104, cy - 64, WHITE, 6);
            game.draw.line(cx - 104, cy + 64, cx + 104, cy + 64, WHITE, 6);
            game.draw.line(cx - 104, cy - 64, cx - 104, cy + 64, WHITE, 6);
            game.draw.line(cx + 104, cy - 64, cx + 104, cy + 64, WHITE, 6);
          }
        } else if (c === 1 && windowsDone < NEEDED && ROWS[r] !== tgt) {
          game.draw.rect(cx - 90, cy - 52, 180, 104, GRIME, 0.25);
        }
      }
    }
    // 目標の高さ: 外壁の左右にブラケット
    var y0 = yOf(tgt + TOL), y1 = yOf(tgt - TOL);
    for (var s = -1; s <= 1; s += 2) {
      var bx = W / 2 + s * (HALF + 70);
      game.draw.line(bx, y0, bx, y1, YELLOW, 8);
      game.draw.line(bx, y0, bx - s * 30, y0, YELLOW, 8);
      game.draw.line(bx, y1, bx - s * 30, y1, YELLOW, 8);
    }
  }

  function drawGusts() {
    for (var i = 0; i < gusts.length; i++) {
      var g = gusts[i];
      var lead = g.at - clock;
      var active = clock >= g.at && clock < g.at + g.dur;
      if (lead > 0 && lead < 0.7) {
        // telegraph: 吹いてくる側の端で点滅する警告と矢印
        if (Math.floor(clock * 12) % 2 === 0) {
          var ex = g.side < 0 ? 70 : W - 70;
          fillPoly([{ x: ex, y: H * 0.36 }, { x: ex - 40, y: H * 0.42 }, { x: ex + 40, y: H * 0.42 }], RED);
          game.draw.rect(ex - 6, H * 0.375, 12, 40, WHITE);
          game.draw.sprite(ARROW, { y: g.up ? YELLOW : RED }, ex, H * 0.47, 10, { anchor: 'center', flipY: !g.up });
        }
      }
      if (active) {
        var side = g.side < 0 ? 0 : W / 2;
        for (var k = 0; k < 6; k++) {
          var sx = side + ((k * 140 + clock * 900) % (W / 2));
          var sy = H * 0.3 + k * 90 + (g.up ? -1 : 1) * ((clock * 300) % 80);
          game.draw.line(sx, sy, sx + 90, sy + (g.up ? -30 : 30), WHITE, 4);
        }
      }
    }
  }

  function drawGondola(hlTip) {
    var xl = W / 2 - HALF, xr = W / 2 + HALF, yl = yOf(hL), yr = yOf(hR);
    game.draw.line(xl, H * 0.08, xl, yl - 110, '#2a2a2a', 4);
    game.draw.line(xr, H * 0.08, xr, yr - 110, '#2a2a2a', 4);
    var tilt = hR - hL;
    var warn = Math.abs(tilt) > TILT_WARN;
    var fr = warn ? 2 : Math.floor(game.time.elapsed * 4) % 2;
    var mx = W / 2, my = (yl + yr) / 2;
    game.draw.sprite(CLEANER[fr], CL_PAL, mx + tilt * 90, my - 100, 15, { anchor: 'center' });
    // 床(傾いた四角形)
    fillPoly([{ x: xl, y: yl + jit(1) }, { x: xr, y: yr + jit(2) }, { x: xr, y: yr + 44 }, { x: xl, y: yl + 44 }], warn ? '#c0503a' : ORANGE);
    fillPoly([{ x: xl, y: yl + 44 }, { x: xr, y: yr + 44 }, { x: xr - 20, y: yr + 64 }, { x: xl + 20, y: yl + 64 }], '#9a4020');
    game.draw.line(xl, yl, xr, yr, INK, 4);
    game.draw.line(xl, yl - 110, xr, yr - 110, STEEL, 8);
    for (var p = 0; p <= 4; p++) {
      var px = xl + (xr - xl) * p / 4, py = yl + (yr - yl) * p / 4;
      game.draw.line(px, py, px, py - 110, STEEL, 6);
    }
    if (!tip) {
      var bk = (bucketX + 1) / 2;
      var bx = xl + 60 + (xr - xl - 120) * bk, by = yl + (yr - yl) * bk - 30;
      game.draw.sprite(BUCKET, { m: '#6a7a8a', w: '#8fd0f0' }, bx, by, 14, { anchor: 'center' });
    } else {
      var sc = 14 * (1 + (hlTip || 0) * 0.5);
      if (hlTip) game.draw.circle(tip.x, tip.y, 70, WHITE, hlTip * 0.8);
      game.draw.sprite(BUCKET, { m: hlTip ? WHITE : '#6a7a8a', w: '#8fd0f0' }, tip.x, tip.y, Math.round(sc), { anchor: 'center', flipY: tip.t > 0.2 });
    }
  }

  function drawWinches() {
    for (var i = 0; i < 2; i++) {
      var cx = i === 0 ? W * 0.25 : W * 0.75, cy = H * 0.865;
      var held = i === 0 ? holdL : holdR;
      game.draw.circle(cx, cy, 160, held ? YELLOW : '#4a5866', held ? 0.5 : 0.8);
      game.draw.circle(cx, cy, 130, held ? '#5f6f80' : STEEL);
      if (flick[i] > 0) game.draw.circle(cx, cy, 160, WHITE, flick[i] * 2);
      for (var s = 0; s < 4; s++) {
        var a = crank[i] * (i === 0 ? -1 : 1) + s * Math.PI / 2;
        game.draw.line(cx, cy, cx + Math.cos(a) * 110, cy + Math.sin(a) * 110, CONC, 14);
      }
      game.draw.circle(cx, cy, 30, ORANGE);
      game.draw.sprite(ARROW, { y: held ? WHITE : YELLOW }, cx, cy - 190 + Math.sin(game.time.elapsed * 4 + i) * 8, 12, { anchor: 'center' });
    }
  }

  function drawLevel() {
    // 水準器: 泡が中央なら水平
    var cx = W / 2, cy = H * 0.135;
    game.draw.rect(cx - 260, cy - 30, 520, 60, INK, 0.7);
    game.draw.rect(cx - 250, cy - 22, 500, 44, '#c8e060');
    game.draw.rect(cx - 250, cy - 22, 60, 44, RED, 0.6);
    game.draw.rect(cx + 190, cy - 22, 60, 44, RED, 0.6);
    game.draw.line(cx - 40, cy - 22, cx - 40, cy + 22, INK, 4);
    game.draw.line(cx + 40, cy - 22, cx + 40, cy + 22, INK, 4);
    var k = Math.max(-1, Math.min(1, (hR - hL) / TILT_MAX));
    game.draw.circle(cx + k * 220, cy, 20, WHITE);
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    big(windowsDone + ' / ' + NEEDED, W * 0.2, 88, 58, WHITE);
    big(String(score), W / 2, 88, 54, YELLOW);
    for (var b = 0; b < BUCKETS; b++) game.draw.sprite(BUCKET, { m: b < buckets ? '#6a7a8a' : '#2a2a2a', w: b < buckets ? '#8fd0f0' : '#2a2a2a' }, W - 110 - b * 110, 88, 14, { anchor: 'center' });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 176, W - 120, 22, INK, 0.6);
    game.draw.rect(60, 176, (W - 120) * fr, 22, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : YELLOW);
    // 拭き取りゲージ
    if (!over) {
      var gx = W / 2 - 100, gy = yOf(TARGETS[Math.min(winI, TARGETS.length - 1)]) - 210;
      game.draw.rect(gx, gy, 200, 14, INK, 0.6);
      game.draw.rect(gx, gy, 200 * cleanP, 14, YELLOW);
    }
  }

  // ── ATTRACT デモ: 両手で窓の高さに合わせて拭く → 右から突風、右手が遅れて傾きバケツが落ちる ──
  var demo = { t: 0, tipped: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      hL = 0.33; hR = 0.33; winI = 0; cleanP = 0; windowsDone = 0; bucketX = 0; bucketV = 0; tip = null; demo.tipped = false;
      gusts = buildGusts([{ at: 2.5, side: 1, dur: 1.6, pow: 0.32, up: false, warned: false }]);
    }
    clock = cyc;
    applyWind(cyc);
    var tgt = TARGETS[0];
    holdL = hL < tgt;
    holdR = cyc < 2.4 ? hR < tgt : false; // 右手が遅れる(失敗例)
    if (!demo.tipped) {
      var inBand = stepGondola(dt, 0.3);
      if (inBand && windowsDone === 0) { cleanP += dt / CLEAN_TIME; if (cleanP >= 1) { windowDone(0.3); cleanP = 1; } }
      if (tipped()) { demo.tipped = true; startTip(0.3); game.feedback.bad(W / 2 + HALF, yOf(hR) - 60, { text: 'MISS', volume: 0.25 }); }
    }
    if (tip) { tip.t += dt; tip.x += tip.vx * dt; tip.y += tip.vy * dt; tip.vy += 1300 * dt; }
    for (var i = 0; i < 2; i++) if (flick[i] > 0) flick[i] -= dt;
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawCity();
      drawWindows();
      drawGusts();
      drawGondola(0);
      drawWinches();
      drawLevel();
      game.draw.hand(W * 0.25, H * 0.865 - 30, { press: holdL, scale: 15 });
      game.draw.hand(W * 0.75, H * 0.865 - 30, { press: holdR, scale: 15, alpha: holdR ? 1 : 0.55 });
      big(TITLE, W / 2, H * 0.06, 96, WHITE);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 40, YELLOW);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.97, 44, YELLOW);
      else big('INSERT COIN', W / 2, H * 0.97, 38, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      drawCity();
      drawWindows();
      drawGondola(0);
      game.draw.rect(60, H * 0.12, W - 120, H * 0.24, INK, 0.75);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.165, 104, won ? YELLOW : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(windowsDone + ' / ' + NEEDED + '   ' + (Math.round(levelT * 10) / 10) + '秒', W / 2, H * 0.265, 42, HAZE);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 58, YELLOW);
      else big('BEST ' + Math.max(prevBest, score), W / 2, H * 0.31, 40, SAND);
      if (!won) big('あと' + (NEEDED - windowsDone) + '枚!', W / 2, H * 0.4, 64, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.97, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    readHolds();
    var hlTip = 0;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hlTip = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var kind = halt.kind;
        halt = null;
        if (kind === 'tip') {
          buckets--;
          game.feedback.bad(tip ? tip.x : W / 2, H * 0.5, { text: 'MISS' });
          game.audio.play('se_break', 0.35);
          if (buckets <= 0) finish(false);
          else { var mid = (hL + hR) / 2; hL = mid; hR = mid; bucketX = 0; bucketV = 0; }
        } else {
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
          finish(false);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      clock += dt;
      timeLeft -= dt;
      for (var g = 0; g < gusts.length; g++) {
        if (!gusts[g].warned && clock >= gusts[g].at - 0.7) {
          gusts[g].warned = true;
          game.audio.tone(gusts[g].up ? 300 : 700, 0.5, { wave: 'sawtooth', volume: 0.04, slide: gusts[g].up ? 400 : -400 });
        }
      }
      applyWind(clock);
      var inBand = stepGondola(dt, 1);
      if (inBand) {
        cleanP += dt / CLEAN_TIME;
        if (Math.floor(game.time.elapsed * 8) % 3 === 0) game.audio.tone(1200 + cleanP * 600, 0.02, { wave: 'sine', volume: 0.02 });
        if (cleanP >= 1) windowDone(1);
      }
      if (!over && tipped()) {
        startTip(1);
        halt = { t: 0.5, max: 0.5, kind: 'tip' };
        game.fx.flash(WHITE, 0.15);
      } else if (!over && timeLeft <= 0) {
        timeLeft = 0;
        halt = { t: 0.4, max: 0.4, kind: 'time' };
      }
    }
    if (tip && !halt) { tip.t += dt; tip.x += tip.vx * dt; tip.y += tip.vy * dt; tip.vy += 1300 * dt; if (tip.y > H + 100) tip = null; }
    for (var i = 0; i < 2; i++) if (flick[i] > 0) flick[i] -= dt;

    drawCity();
    drawWindows();
    drawGusts();
    drawGondola(hlTip);
    drawWinches();
    drawLevel();
    drawHud();
    if (ready <= 0 && clock < 0.9 && !over) {
      game.draw.hand(W * 0.25, H * 0.865 - 30, { press: true, scale: 13, alpha: 0.6 });
      game.draw.hand(W * 0.75, H * 0.865 - 30, { press: true, scale: 13, alpha: 0.6 });
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 120, YELLOW);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5],
      ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 1.5], ['R', 0.5],
    ], { tempo: 112, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
