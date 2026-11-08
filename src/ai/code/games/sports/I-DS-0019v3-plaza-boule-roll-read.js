// I-DS-0019v3-plaza-boule-roll-read.js
// 石畳ブール — 腕の振りに合わせて地面を行き来する着地の目印を見て放つ瞬間を決め、着地後の転がりまで読んで木の目標球の輪に鉄球を止める
// 操作: 老人の腕が前後に振れ続け、地面の白い目印(着地点)も手前と奥を行き来する。タップした瞬間に放る。着地後は地面しだいで転がる(石畳はよく転がる・砂はすぐ止まる・坂は低い側へ流れる)ので、その分手前に落とす
// 終わり: 5投のうち3投を目標球の輪の中に止めればCLEAR。輪の外が2投、または時間切れでGAME OVER
// @mechanic: trajectory
// @theme: summer_plaza_boules
// 世界観: 夏の夕方の石畳の広場で、麦わら帽子の老人が木の目標球めがけて鉄球を放り、石畳と砂地と坂の転がりを読んで目標球のそばにぴたりと止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪に止めた投数・目標球からの平均距離(m)
// スタイル: 2000s BILLBOARD 3D
var STYLE = { bg: ['#4f6fb8', '#f4c27c'], main: ['#968e88', '#e0c68c', '#c8a070'], accent: ['#f2f2f6', '#d8463a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'BOULE ROLL';
  var TIME_LIMIT = 20;
  var NEEDED = 3;
  var MISS_MAX = 2;
  var HZ = H * 0.2, Y0 = H * 0.88, ZC = 4, PXM = 300;
  var PA = (Y0 - HZ) * ZC;
  var HALF = 1.3, ZMAX = 11;
  var THROWS = [
    { jack: [0, 5.6], R: 0.5, w: 2.0, zones: [] },
    { jack: [0, 5.2], R: 0.46, w: 2.2, zones: [{ z0: 4.6, z1: 6.0, type: 'sand' }] },
    { jack: [0.45, 6.6], R: 0.44, w: 2.4, zones: [{ z0: 4.5, z1: 8.0, type: 'slope', ax: 0.7 }] },
    { jack: [-0.15, 7.1], R: 0.42, w: 2.6, zones: [{ z0: 5.4, z1: 5.9, type: 'sand' }] },
    { jack: [0, 4.2], R: 0.4, w: 2.8, zones: [] },
  ];
  var C = {
    sky: STYLE.bg[0], dusk: STYLE.bg[1], cobble: STYLE.main[0], sand: STYLE.main[1], wood: STYLE.main[2],
    white: STYLE.accent[0], red: STYLE.accent[1], ink: '#2a2420', steel: '#b8c0cc', gold: '#ffd24a',
  };

  var OLD_A = [
    '...yyyyyy...',
    '.yyyyyyyyyy.',
    '...ffffff...',
    '...fkffkf...',
    '...fwwwwf...',
    '....ffff....',
    '..wwbwwbww..',
    '.wwwbwwbwww.',
    '.f.wbwwbw...',
    '...pppppp...',
    '...pp..pp...',
    '...pp..pp...',
    '..ss....ss..',
  ];
  var OLD_B = [
    '...yyyyyy...',
    '.yyyyyyyyyy.',
    '...ffffff...',
    '...fkffkf...',
    '...fwwwwf...',
    '....ffff....',
    '..wwbwwbww..',
    '.wwwbwwbwww.',
    '.f.wbwwbw...',
    '...pppppp...',
    '...pp..pp...',
    '..pp....pp..',
    '..ss....ss..',
  ];
  var OLD_SAD = [
    '............',
    '...yyyyyy...',
    '.yyyyyyyyyy.',
    '...ffffff...',
    '...kkffkk...',
    '...fwwwwf...',
    '..wwbwwbww..',
    '.wwwbwwbwww.',
    '.f.wbwwbw.f.',
    '...pppppp...',
    '..pp....pp..',
    '..pp....pp..',
    '.ss......ss.',
  ];
  var OLD_PAL = { y: '#e8c860', f: '#e4b48c', k: C.ink, w: C.white, b: '#6a4a38', p: '#5a6478', s: '#3a2a20' };
  var BALL = ['.hhhh.', 'hssssh', 'hsssdh', 'hssddh', 'hsdddh', '.hhhh.'];
  var BALL_PAL = { h: '#7c8494', s: C.steel, d: '#9aa2b0' };
  var BALL_W = { h: '#ffffff', s: '#ffffff', d: '#ffffff' };
  var JACK = ['.oo.', 'oooo', 'oodo', '.oo.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, throwIx, hits, misses, score, distSum, cfg, phi, phase, phT, idle, ball, relP, relX, relY, lastD;
  var hitStop, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, celebT, perfects;

  function sy(z) { return HZ + PA / (z + ZC); }
  function sc(z) { return ZC / (z + ZC); }
  function sx(x, z) { return W * 0.5 + x * PXM * sc(z); }
  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  function groundEllipse(x, z, r, col, a) {
    var n = 6;
    var cx = sx(x, z), cy = sy(z);
    var rx = r * PXM * sc(z), ry = Math.max(4, (sy(z - r) - sy(z + r)) / 2);
    for (var i = 0; i < n; i++) {
      var yy = -ry + (2 * ry) * (i + 0.5) / n;
      var w = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - w, cy + yy - ry / n, w * 2, (2 * ry) / n + 1, col, a);
    }
  }
  function groundRing(x, z, r, col, wdt) {
    var n = 24;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      var x0 = x + Math.cos(a0) * r, z0 = z + Math.sin(a0) * r, x1 = x + Math.cos(a1) * r, z1 = z + Math.sin(a1) * r;
      game.draw.line(sx(x0, z0), sy(z0), sx(x1, z1), sy(z1), col, wdt);
    }
  }

  function surfaceAt(c, z) {
    var s = { type: 'cobble', decel: 2.2, ax: 0 };
    for (var i = 0; i < c.zones.length; i++) {
      var zn = c.zones[i];
      if (z >= zn.z0 && z <= zn.z1) {
        if (zn.type === 'sand') s = { type: 'sand', decel: 9, ax: 0 };
        else s = { type: 'slope', decel: 1.8, ax: zn.ax };
      }
    }
    return s;
  }
  function landZ(p) { return 2.4 + 5.2 * p; }
  function powerNow() { return 0.5 - 0.5 * Math.cos(phi); }

  // 転がり(実プレイ・デモ・先読み計算で共通)
  function stepRoll(b, c, dt) {
    var s = surfaceAt(c, b.z);
    var sp = Math.hypot(b.vx, b.vz);
    if (sp < 0.03) { b.vx = 0; b.vz = 0; b.moving = false; return; }
    var ns = Math.max(0, sp - s.decel * dt);
    b.vx *= ns / sp; b.vz *= ns / sp;
    b.vx += s.ax * dt;
    b.x += b.vx * dt; b.z += b.vz * dt;
    if (Math.abs(b.x) > HALF) { b.x = Math.max(-HALF, Math.min(HALF, b.x)); b.vx *= -0.3; }
    if (b.z > ZMAX - 0.3) { b.z = ZMAX - 0.3; b.vz *= -0.3; }
    var jd = Math.hypot(b.x - c.jack[0], b.z - c.jack[1]);
    if (jd < 0.12) { b.vx = 0; b.vz = 0; b.moving = false; b.kiss = true; }
  }
  function predictStop(c, p) {
    var b = { x: 0, z: landZ(p), vx: 0, vz: 1.2 + 1.2 * p, moving: true, kiss: false };
    for (var i = 0; i < 300 && b.moving; i++) stepRoll(b, c, 1 / 60);
    return Math.hypot(b.x - c.jack[0], b.z - c.jack[1]);
  }
  function bestP(c) {
    var best = 0.5, bd = 99;
    for (var p = 0; p <= 1.0001; p += 0.01) { var d = predictStop(c, p); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  function initGame() {
    clock = TIME_LIMIT; throwIx = 0; hits = 0; misses = 0; score = 0; distSum = 0; perfects = 0; lastD = 0;
    hitStop = 0; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; celebT = 0;
    setupThrow(0);
  }
  function setupThrow(i) {
    cfg = THROWS[Math.min(i, THROWS.length - 1)];
    phi = game.random(0, Math.PI * 2);
    phase = 'swing'; phT = 0; idle = 0; ball = null;
  }

  function handPos(p) {
    var shX = W * 0.36, shY = H * 0.835;
    var a = 2.1 + (-3.2) * p;
    return { x: shX + Math.cos(a) * 130, y: shY + Math.sin(a) * 130 };
  }

  function doThrow(real) {
    if (phase !== 'swing') return;
    relP = powerNow();
    var hp = handPos(relP);
    relX = hp.x; relY = hp.y;
    ball = { x: 0, z: 0.4, vx: 0, vz: 0, h: 0, fu: 0, flying: true, moving: false, kiss: false, zl: landZ(relP), hmax: 1.3 + relP * 1.0 };
    phase = 'fly'; phT = 0;
    game.audio.play('se_jump', real ? 0.4 : 0.2);
  }

  function simulate(dt, real) {
    phT += dt;
    if (phase === 'swing') {
      phi += cfg.w * dt;
      idle += dt;
      if (idle > 3.5) doThrow(real);
    } else if (phase === 'fly') {
      ball.fu = Math.min(1, phT / 0.62);
      ball.z = 0.4 + (ball.zl - 0.4) * ball.fu;
      ball.h = 4 * ball.hmax * ball.fu * (1 - ball.fu) + (1 - ball.fu) * 1.0;
      if (ball.fu >= 1) {
        ball.flying = false; ball.moving = true; ball.h = 0;
        ball.vz = 1.2 + 1.2 * relP;
        var s = surfaceAt(cfg, ball.z);
        game.audio.play(s.type === 'sand' ? 'se_tap' : 'se_break', real ? 0.3 : 0.15);
        game.fx.burst(sx(ball.x, ball.z), sy(ball.z), { color: s.type === 'sand' ? C.sand : C.white, count: 10, speed: 200 });
        phase = 'roll'; phT = 0;
      }
    } else if (phase === 'roll') {
      stepRoll(ball, cfg, dt);
      if (Math.floor(phT * 8) !== Math.floor((phT - dt) * 8) && ball.moving) game.audio.tone(surfaceAt(cfg, ball.z).type === 'sand' ? 'C3' : 'A3', 0.03, { wave: 'square', volume: 0.025 });
      if (!ball.moving || phT > 3.5) { phase = 'judge'; phT = 0; judge(real); }
    } else if (phase === 'shown') {
      if (phT > 0.7) nextThrow(real);
    }
  }

  function judge(real) {
    var d = Math.hypot(ball.x - cfg.jack[0], ball.z - cfg.jack[1]);
    lastD = d;
    var bx = sx(ball.x, ball.z), by = sy(ball.z);
    if (d <= cfg.R) {
      var perfect = d <= 0.15;
      game.feedback.good(bx, by - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: C.gold });
      game.audio.play('se_coin', 0.4);
      if (real) {
        hits++; distSum += d;
        if (perfect) perfects++;
        score += (perfect ? 300 : 200) + Math.round((cfg.R - d) * 300);
        if (hits === 2) { game.fx.popup('NICE', W * 0.5, H * 0.16 + 60, { color: C.gold, size: 80 }); game.audio.play('se_milestone', 0.45); }
      }
      phase = 'shown'; phT = 0;
    } else {
      hitStop = 0.5; badPending = { real: real, x: bx, y: by };
      game.audio.tone('D3', 0.16, { wave: 'square', volume: 0.12 });
      game.fx.flash('#ffffff', 0.12);
      phase = 'failed';
    }
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    game.feedback.bad(b ? b.x : W / 2, b ? b.y - 60 : H / 2, { text: 'MISS' });
    if (b && b.real) misses++;
    phase = 'shown'; phT = 0.3;
  }

  function nextThrow(real) {
    if (real) {
      throwIx++;
      if (hits >= NEEDED) { finish(true); return; }
      if (misses >= MISS_MAX || throwIx >= THROWS.length) { finish(false); return; }
    }
    setupThrow(throwIx);
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 15) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { inRing: hits, perfect: perfects, misses: misses, avgDistM: hits > 0 ? Math.round((distSum / hits) * 100) / 100 : 0 };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 1投目は転がりまで読んで手前で放ってGOOD、2投目は遅れて放って奥へ転がりすぎ ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: 0, plan: 0, target: 0.5 };
  function aimPhi() { phi = Math.acos(1 - 2 * Math.max(0.02, demo.target - 0.3)); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.plan = 0; demo.target = bestP(cfg); aimPhi(); }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else if (phase === 'shown') {
      phT += dt;
      if (phT > 0.7 && demo.plan === 0) { demo.plan = 1; setupThrow(0); demo.target = Math.min(0.97, bestP(cfg) + 0.3); aimPhi(); }
    } else simulate(dt, false);
    if (phase === 'swing' && idle > 0.25) {
      var p = powerNow(), rising = Math.sin(phi) > 0;
      if (rising && Math.abs(p - demo.target) < 0.03) { demo.press = 0.2; doThrow(false); }
    }
    demo.press = Math.max(0, demo.press - dt);
    demo.gx += (W * 0.62 - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (H * 0.9 - demo.gy) * Math.min(1, dt * 5);
  }

  // ── 描画 ─────────────────────────────────────────────────────
  function drawPlaza(showCfg) {
    var t = game.time.elapsed;
    game.draw.gradient(0, HZ + 4, [[0, C.sky], [0.6, '#b8a8c8'], [1, C.dusk]]);
    // 遠景(彩度を落とした板の街並み)
    var bx = [0, 130, 250, 420, 600, 760, 900];
    for (var i = 0; i < bx.length; i++) {
      var bh = 80 + ((i * 53) % 70);
      game.draw.rect(bx[i], HZ - bh, 150, bh, i % 2 ? '#a89aa4' : '#9a90a0');
      for (var wdw = 0; wdw < 3; wdw++) game.draw.rect(bx[i] + 20 + wdw * 40, HZ - bh + 20, 18, 22, '#f4d8a0', 0.7);
    }
    game.draw.gradient(HZ, H, [[0, '#c4b090'], [1, '#a89070']]);
    // 石畳のコート(奥ほど小さく)
    var row = 0;
    for (var z = 0; z < ZMAX; z += 0.35) {
      var y0 = sy(z + 0.35), y1 = sy(z), zm = z + 0.175, s = sc(zm), half = HALF * PXM * s;
      var type = showCfg ? surfaceAt(cfg, zm).type : 'cobble';
      var col;
      if (type === 'sand') col = row % 2 ? '#e4cc92' : C.sand;
      else if (type === 'slope') col = row % 2 ? '#8a8480' : '#7e7874';
      else col = row % 2 ? '#a29a94' : C.cobble;
      game.draw.rect(W * 0.5 - half, y0, half * 2, y1 - y0 + 1, col);
      if (type !== 'sand') {
        for (var k = -5; k <= 5; k++) {
          var xx = k * 0.26 + (row % 2) * 0.13;
          if (Math.abs(xx) >= HALF) continue;
          var gx = W * 0.5 + xx * PXM * s;
          game.draw.line(gx, y0, gx, y1, '#6e6862', Math.max(1, 3 * s));
        }
        game.draw.line(W * 0.5 - half, y0, W * 0.5 + half, y0, '#6e6862', Math.max(1, 3 * s));
      } else {
        for (var d = 0; d < 4; d++) game.draw.rect(W * 0.5 - half + ((d * 97 + row * 31) % Math.max(1, Math.floor(half * 2))), y0 + (y1 - y0) * 0.4, 6 * s + 2, 4 * s + 2, '#b89c64');
      }
      if (type === 'slope') {
        game.draw.rect(W * 0.5, y0, half, y1 - y0 + 1, '#000000', 0.12);
        if (row % 3 === 0) {
          var cy = (y0 + y1) / 2;
          game.draw.line(W * 0.5 - half * 0.4, cy, W * 0.5 + half * 0.2, cy, '#c8c0b8', Math.max(2, 5 * s));
          game.draw.line(W * 0.5 + half * 0.2, cy, W * 0.5 + half * 0.08, cy - 10 * s, '#c8c0b8', Math.max(2, 5 * s));
          game.draw.line(W * 0.5 + half * 0.2, cy, W * 0.5 + half * 0.08, cy + 10 * s, '#c8c0b8', Math.max(2, 5 * s));
        }
      }
      row++;
    }
    // 木の縁板
    game.draw.line(sx(-HALF, 0), sy(0), sx(-HALF, ZMAX), sy(ZMAX), C.wood, 10);
    game.draw.line(sx(HALF, 0), sy(0), sx(HALF, ZMAX), sy(ZMAX), C.wood, 10);
    game.draw.line(sx(-HALF, ZMAX), sy(ZMAX), sx(HALF, ZMAX), sy(ZMAX), C.wood, 6);
    // 並木(板 + 接地影)
    var trees = [[-2.4, 3], [2.5, 4.5], [-2.6, 8], [2.4, 9.5]];
    for (var tr = 0; tr < trees.length; tr++) {
      var tz = trees[tr][1], ts = sc(tz), tx = sx(trees[tr][0], tz), ty = sy(tz);
      groundEllipse(trees[tr][0], tz, 0.7, '#000000', 0.18);
      game.draw.rect(tx - 14 * ts, ty - 260 * ts, 28 * ts, 260 * ts, '#6a5040');
      var sway = Math.sin(t * 1.2 + tr) * 6 * ts;
      game.draw.circle(tx + sway, ty - 300 * ts, 120 * ts, tr % 2 ? '#5f8a52' : '#6c9658');
      game.draw.circle(tx + sway - 50 * ts, ty - 260 * ts, 80 * ts, '#557a4a');
    }
  }

  function drawJack() {
    var jx = cfg.jack[0], jz = cfg.jack[1];
    groundEllipse(jx, jz, cfg.R, C.white, 0.18 + 0.08 * Math.sin(game.time.elapsed * 5));
    groundRing(jx, jz, cfg.R, Math.floor(game.time.elapsed * 3) % 2 === 0 ? C.white : C.gold, 4);
    groundEllipse(jx, jz, 0.08, '#000000', 0.3);
    game.draw.sprite(JACK, { o: C.wood, d: '#8a6040' }, sx(jx, jz), sy(jz) - 10, Math.max(4, 11 * sc(jz)), { anchor: 'center' });
  }

  function drawMarker() {
    if (phase !== 'swing') return;
    var p = powerNow(), z = landZ(p);
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    groundRing(0, z, 0.22, blink ? C.white : '#d0d0d8', 5);
    var hp = handPos(p);
    for (var i = 1; i < 6; i++) {
      var u = i / 6;
      var zz = 0.4 + (z - 0.4) * u, hh = 4 * (1.3 + p) * u * (1 - u) + (1 - u);
      var px = sx(0, zz), py = sy(zz) - hh * PXM * sc(zz);
      var k = u < 0.2 ? u / 0.2 : 1;
      game.draw.circle(hp.x + (px - hp.x) * k, hp.y + (py - hp.y) * k, 7, C.white, 0.55);
    }
  }

  function drawBall() {
    if (!ball) return;
    var bx = sx(ball.x, ball.z), by = sy(ball.z);
    groundEllipse(ball.x, ball.z, 0.12, '#000000', 0.35);
    var px = Math.max(7, 16 * sc(ball.z));
    var yy = by - ball.h * PXM * sc(ball.z) - 3 * px;
    if (ball.flying && ball.fu < 0.18) {
      var k = ball.fu / 0.18;
      bx = relX + (bx - relX) * k; yy = relY + (yy - relY) * k;
    }
    var hit = phase === 'failed' && hitStop > 0;
    if (hit) {
      game.draw.line(bx, by, sx(cfg.jack[0], cfg.jack[1]), sy(cfg.jack[1]), C.red, 6);
      say(lastD.toFixed(2) + 'm', bx, yy - 70, 44, C.red);
    }
    game.draw.sprite(BALL, hit && Math.floor(game.time.elapsed * 18) % 2 === 0 ? BALL_W : BALL_PAL, bx, yy, hit ? px * 1.5 : px, { anchor: 'center' });
  }

  function drawOldMan(mood) {
    var t = game.time.elapsed;
    var spr = mood === 'sad' ? OLD_SAD : (Math.floor(t * 2) % 2 === 0 ? OLD_A : OLD_B);
    var hop = mood === 'win' ? -Math.abs(Math.sin(t * 7)) * 40 : Math.sin(t * 3) * 3;
    game.draw.circle(W * 0.3, H * 0.95, 90, '#000000', 0.18);
    game.draw.sprite(spr, OLD_PAL, W * 0.3, H * 0.86 + hop, 16, { anchor: 'center' });
    var p = phase === 'swing' ? powerNow() : (mood === 'win' ? 1 : 0.85);
    var hp = handPos(p);
    game.draw.line(W * 0.36, H * 0.835 + hop, hp.x, hp.y + hop, OLD_PAL.f, 22);
    if (phase === 'swing') game.draw.sprite(BALL, BALL_PAL, hp.x, hp.y + hop, 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.82);
    for (var i = 0; i < THROWS.length; i++) {
      var col = i < throwIx ? '#6a6460' : C.steel;
      if (i === throwIx && !done) col = Math.floor(game.time.elapsed * 3) % 2 === 0 ? C.white : C.steel;
      game.draw.circle(70 + i * 62, 84, 22, col);
    }
    for (var h = 0; h < NEEDED; h++) game.draw.circle(W - 240 + h * 70, 84, 24, h < hits ? C.gold : '#4a4440');
    for (var m = 0; m < MISS_MAX; m++) game.draw.rect(W - 230 + m * 70, 120, 40, 12, m < MISS_MAX - misses ? C.red : '#4a4440');
    say(hits + ' / ' + NEEDED, W * 0.5, 76, 60, C.white);
    say('SCORE ' + score, W * 0.5, 138, 32, C.gold);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(70, 186, W - 140, 18, '#4a4440');
    game.draw.rect(70, 186, (W - 140) * frac, 18, frac < 0.25 ? C.red : C.sand);
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0 || phase !== 'swing') { game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    game.fx.burst(handPos(powerNow()).x, handPos(powerNow()).y, { color: C.white, count: 6, speed: 160 });
    doThrow(true);
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawPlaza(true);
      drawJack();
      drawMarker();
      drawBall();
      drawOldMan('');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.ink, 0.8);
      say(TITLE, W * 0.5, H * 0.05, 92, C.gold);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.965, 44, C.gold);
      else say('INSERT COIN', W * 0.5, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawPlaza(true);
      drawJack();
      drawBall();
      drawOldMan(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 540, C.ink, 0.88);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.gold : C.red);
      say(hits + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.white);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.white);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.sand);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.gold); }
      else if (!won) say('あと' + Math.max(0.01, Math.round((lastD - cfg.R) * 100) / 100) + 'm!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.955, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.22, H * 0.6), { color: Math.random() < 0.5 ? C.gold : C.white, count: 14, speed: 420 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.35);
    } else {
      simulate(dt, true);
      if (phase === 'swing' || phase === 'fly' || phase === 'roll') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }

    drawPlaza(true);
    drawJack();
    if (!done && ready <= 0) drawMarker();
    drawBall();
    drawOldMan(done ? (won ? 'win' : 'sad') : '');
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 100, C.gold);
      game.draw.hand(W * 0.62, H * 0.9, { press: ready < 0.4, scale: 14 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['F5', 0.5], ['E5', 0.5], ['D5', 1],
      ['E5', 0.5], ['C5', 0.5], ['A4', 1], ['B4', 0.5], ['D5', 0.5], ['C5', 1],
    ], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F2', 2], ['A2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
