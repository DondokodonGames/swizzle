// I-DS-0021v3-yarn-peg-draw-hold.js
// 毛糸のピン留め — 押している間だけ毛糸玉から糸が出て、作業板のピンを回り込みながら伸びる。曲がりくねった先の留めピンに糸の先が来たところでぴたりと離す
// 操作: どこかを押し続けると毛糸玉が回って糸が伸び、ピンの角で折れ曲がりながら点線の道を進む(長く押すほど速くなる)。明滅する留めピンに先が来た瞬間に離す。行き過ぎると奥のトゲ針に引っかかる
// 終わり: 糸4本を留めればCLEAR。足りない/引っかけ/構えたまま3秒が2回、または時間切れでGAME OVER
// @mechanic: hold_duration
// @theme: craft_class_yarn_peg
// 世界観: 町の手芸教室で、編み物講師が毛糸玉から糸を引き出し、作業板のピンを回して見本と同じ長さのところでぴたりと止め、生徒の分を一本ずつ切り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 留めた本数・先端のズレ(px)
// スタイル: 8bit HANDHELD
var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f', '#8bac0f'], accent: ['#0f380f', '#9bbc0f'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'YARN PIN';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var MISS_MAX = 2;
  var V0 = 220;
  var BALL_X = W * 0.2, BALL_Y = H * 0.82;
  var C = { l0: '#9bbc0f', l1: '#8bac0f', l2: '#306230', l3: '#0f380f' };
  var ROUTES = [
    { pts: [[240, 1260], [240, 980], [560, 980], [560, 720]], snag: [560, 600], acc: 300, vmax: 600, tol: 60 },
    { pts: [[240, 1260], [240, 700], [520, 700], [520, 1000]], snag: [520, 1120], acc: 360, vmax: 620, tol: 56 },
    { pts: [[240, 1260], [700, 1260], [700, 900], [400, 900], [400, 720]], snag: [400, 600], acc: 420, vmax: 660, tol: 52 },
    { pts: [[240, 1260], [440, 1080], [240, 900], [440, 720], [240, 540]], snag: [240, 450], acc: 480, vmax: 680, tol: 50 },
    { pts: [[240, 1260], [640, 1260], [640, 1020], [300, 1020], [300, 800], [560, 800]], snag: [700, 800], acc: 540, vmax: 720, tol: 48 },
  ];

  var TEACH_A = [
    '....dddd....',
    '...dddddd...',
    '..dddddddd..',
    '..dllllllld.',
    '..lmmlmmll..',
    '..llllllll..',
    '...llddll...',
    '..mmmmmmmm..',
    '.mmmmmmmmmm.',
    '.l.mmmmmm.l.',
    '...mmmmmm...',
    '...mm..mm...',
    '...dd..dd...',
  ];
  var TEACH_B = [
    '....dddd....',
    '...dddddd...',
    '..dddddddd..',
    '..dllllllld.',
    '..lmmlmmll..',
    '..llllllll..',
    '...llllll...',
    '..mmmmmmmm.l',
    '.mmmmmmmmmm.',
    'l..mmmmmm...',
    '...mmmmmm...',
    '..mm....mm..',
    '..dd....dd..',
  ];
  var TEACH_SAD = [
    '............',
    '....dddd....',
    '...dddddd...',
    '..dddddddd..',
    '..dllllllld.',
    '..ldddddll..',
    '...llddll...',
    '..mmmmmmmm..',
    '.mmmmmmmmmm.',
    '.l.mmmmmm.l.',
    '...mmmmmm...',
    '..mm....mm..',
    '.dd......dd.',
  ];
  var TEACH_WIN = [
    'l...dddd...l',
    'l..dddddd..l',
    'm.dddddddd.m',
    'm.dllllllldm',
    'm.lmmlmmll.m',
    '.mllllllllm.',
    '..mllddllm..',
    '..mmmmmmmm..',
    '..mmmmmmmm..',
    '...mmmmmm...',
    '...mmmmmm...',
    '..mm....mm..',
    '..dd....dd..',
  ];
  var TEACH_PAL = { d: C.l3, l: C.l0, m: C.l2 };
  var SCISSORS = ['d...d', '.d.d.', '..d..', '.d.d.', 'dd.dd'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, rIx, pinned, misses, score, perfects, errSum, route, segLen, total, phase, phT, idle, holding, holdT, s, vel, ghostTrail, lastErr;
  var hitStop, hitKind, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, celebT, spinA, cueT;

  function say(t, x, y, size, color) {
    game.draw.text(t, x + 4, y + 4, { size: size, color: C.l1, bold: true, align: 'center' });
    game.draw.text(t, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function setupRoute(i) {
    route = ROUTES[Math.min(i, ROUTES.length - 1)];
    segLen = []; total = 0;
    for (var k = 1; k < route.pts.length; k++) {
      var d = Math.hypot(route.pts[k][0] - route.pts[k - 1][0], route.pts[k][1] - route.pts[k - 1][1]);
      segLen.push(d); total += d;
    }
    var last = route.pts[route.pts.length - 1];
    segLen.push(Math.hypot(route.snag[0] - last[0], route.snag[1] - last[1]));
    phase = 'aim'; phT = 0; idle = 0; holding = false; holdT = 0; s = 0; vel = 0; ghostTrail = []; cueT = 0;
  }

  function pointAt(len) {
    var pts = route.pts.concat([route.snag]);
    var acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var L = segLen[i - 1];
      if (len <= acc + L) {
        var t = L > 0 ? (len - acc) / L : 0;
        return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, seg: i };
      }
      acc += L;
    }
    var e = pts[pts.length - 1];
    return { x: e[0], y: e[1], seg: pts.length - 1 };
  }

  function initGame() {
    clock = TIME_LIMIT; rIx = 0; pinned = 0; misses = 0; score = 0; perfects = 0; errSum = 0; lastErr = 0;
    hitStop = 0; hitKind = ''; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; celebT = 0; spinA = 0;
    setupRoute(0);
  }

  function beginDraw() {
    if (phase !== 'aim') return false;
    holding = true; phase = 'draw'; holdT = 0; s = 0; vel = V0;
    game.audio.play('se_tap', 0.3);
    return true;
  }

  function simulate(dt, real) {
    phT += dt;
    if (phase === 'aim') {
      idle += dt;
      if (idle > 3) fail('idle', real);
    } else if (phase === 'draw' && holding) {
      holdT += dt;
      vel = Math.min(route.vmax, V0 + route.acc * holdT);
      var prev = s;
      s += vel * dt;
      spinA += vel * dt * 0.02;
      var p = pointAt(s);
      ghostTrail.push({ x: p.x, y: p.y });
      if (ghostTrail.length > 6) ghostTrail.shift();
      if (Math.floor(prev / 60) !== Math.floor(s / 60)) game.audio.tone(Math.min(1200, 300 + vel), 0.025, { wave: 'square', volume: 0.03 });
      var prevSeg = pointAt(prev).seg;
      if (p.seg !== prevSeg && s < total) game.audio.tone('E5', 0.04, { wave: 'triangle', volume: 0.05 });
      if (s > total + route.tol) { holding = false; s = Math.min(s, total + segLen[segLen.length - 1]); fail('snag', real); }
    } else if (phase === 'cut') {
      if (phT > 0.6) nextRoute(real);
    } else if (phase === 'gap') {
      if (phT > 0.3) setupRoute(rIx);
    }
  }

  function release(real) {
    if (!holding || phase !== 'draw') return;
    holding = false;
    var err = s - total;
    lastErr = err;
    if (err < -route.tol) { fail('short', real); return; }
    var perfect = Math.abs(err) <= route.tol * 0.35;
    var p = pointAt(total);
    game.feedback.good(p.x, p.y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: C.l3 });
    game.audio.play('se_coin', 0.4);
    if (real) {
      pinned++; errSum += Math.abs(err);
      if (perfect) perfects++;
      score += (perfect ? 300 : 200) + Math.round(Math.max(0, route.tol - Math.abs(err)) * 2);
      if (pinned === 2) { game.fx.popup('NICE', W * 0.5, H * 0.16 + 60, { color: C.l3, size: 80 }); game.audio.play('se_milestone', 0.45); }
    }
    phase = 'cut'; phT = 0;
  }

  function fail(kind, real) {
    hitStop = 0.45; hitKind = kind; badPending = { real: real };
    phase = 'failed';
    game.audio.tone('D3', 0.16, { wave: 'square', volume: 0.12 });
    game.fx.flash(C.l3, 0.1);
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    var p = hitKind === 'snag' ? { x: route.snag[0], y: route.snag[1] } : pointAt(Math.max(0, s));
    game.feedback.bad(p.x, p.y - 40, { text: 'MISS' });
    hitKind = '';
    if (b && b.real) misses++;
    nextRoute(b && b.real);
  }

  function nextRoute(real) {
    if (real) {
      rIx++;
      if (pinned >= NEEDED) { finish(true); return; }
      if (misses >= MISS_MAX || rIx >= ROUTES.length) { finish(false); return; }
    }
    phase = 'gap'; phT = 0;
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 20) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { pinned: pinned, perfect: perfects, misses: misses, avgErrPx: pinned > 0 ? Math.round(errSum / pinned) : 0 };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 1本目はピンでぴたり、2本目は押しすぎてトゲ針に引っかける ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, plan: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.plan = 0; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else if (phase === 'gap') {
      phT += dt;
      if (phT > 0.3 && demo.plan === 0) { demo.plan = 1; setupRoute(1); }
    } else simulate(dt, false);
    if (phase === 'aim' && idle > 0.5) beginDraw();
    if (phase === 'draw' && holding && demo.plan === 0 && s >= total - 6) release(false);
    demo.gx += (W * 0.55 - demo.gx) * Math.min(1, dt * 5);
    demo.gy += ((holding ? H * 0.88 : H * 0.93) - demo.gy) * Math.min(1, dt * 8);
  }

  // ── 描画(携帯モノクロ: 4階調 + 画面枠 + 残像) ─────────────────────────────
  function drawScreen() {
    game.draw.gradient(0, H, [[0, C.l2], [1, C.l3]]);
    game.draw.rect(40, 30, W - 80, H - 60, C.l3);
    game.draw.gradient(60, H - 50, [[0, C.l0], [1, C.l1]]);
    game.draw.rect(60, 50, 16, H - 100, C.l3, 0.5);
    game.draw.rect(W - 76, 50, 16, H - 100, C.l3, 0.5);
    // コルク板(ディザ)
    game.draw.rect(140, 410, 800, 900, C.l1);
    for (var y = 420; y < 1300; y += 20) {
      for (var x = 150 + ((y / 20) % 2) * 10; x < 930; x += 40) game.draw.rect(x, y, 6, 6, C.l0, 0.6);
    }
    game.draw.rect(140, 410, 800, 10, C.l2);
    game.draw.rect(140, 1300, 800, 10, C.l2);
    game.draw.rect(140, 410, 10, 900, C.l2);
    game.draw.rect(930, 410, 10, 900, C.l2);
  }

  function drawRoute(failHit) {
    var t = game.time.elapsed;
    var pts = route.pts;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var L = segLen[i - 1];
      for (var d = 0; d < L; d += 36) {
        var u = d / L;
        game.draw.rect(a[0] + (b[0] - a[0]) * u - 5, a[1] + (b[1] - a[1]) * u - 5, 10, 10, C.l2);
      }
    }
    for (var k = 0; k < pts.length - 1; k++) {
      game.draw.circle(pts[k][0], pts[k][1], 20, C.l3);
      game.draw.circle(pts[k][0] - 5, pts[k][1] - 5, 7, C.l0);
    }
    // 留めピン(明滅 + 白縁)
    var tp = pts[pts.length - 1];
    var blink = Math.floor(t * 4) % 2 === 0;
    game.draw.circle(tp[0], tp[1], 40 + (blink ? 6 : 0), C.l0);
    game.draw.circle(tp[0], tp[1], 30, blink ? C.l3 : C.l2);
    game.draw.circle(tp[0], tp[1], 10, C.l0);
    // トゲ針(危険): 近づくと速く点滅
    var near = phase === 'draw' && s > total - 140;
    var sn = route.snag;
    var on = !near || Math.floor(t * 14) % 2 === 0;
    var big = failHit === 'snag' && hitStop > 0 ? 1.5 : 1;
    if (on) {
      for (var sp = 0; sp < 8; sp++) {
        var ang = sp * Math.PI / 4;
        game.draw.line(sn[0], sn[1], sn[0] + Math.cos(ang) * 34 * big, sn[1] + Math.sin(ang) * 34 * big, failHit === 'snag' && hitStop > 0 && Math.floor(t * 18) % 2 === 0 ? C.l0 : C.l3, 7);
      }
      game.draw.circle(sn[0], sn[1], 12 * big, C.l3);
    }
    var lp = route.pts[route.pts.length - 1];
    for (var dd = 0; dd < segLen[segLen.length - 1]; dd += 36) {
      var uu = dd / segLen[segLen.length - 1];
      game.draw.rect(lp[0] + (sn[0] - lp[0]) * uu - 3, lp[1] + (sn[1] - lp[1]) * uu - 3, 6, 6, C.l2, 0.6);
    }
  }

  function drawYarn(failHit) {
    var t = game.time.elapsed;
    var start = route.pts[0];
    var pull = phase === 'draw' || phase === 'cut' || phase === 'failed';
    game.draw.line(BALL_X, BALL_Y, start[0], start[1], C.l3, 10);
    if (pull && s > 0) {
      var pts = route.pts.concat([route.snag]);
      var acc = 0;
      for (var i = 1; i < pts.length; i++) {
        var L = segLen[i - 1];
        if (s <= acc) break;
        var e = s >= acc + L ? { x: pts[i][0], y: pts[i][1] } : pointAt(s);
        game.draw.line(pts[i - 1][0], pts[i - 1][1], e.x, e.y, C.l3, 12);
        acc += L;
      }
      var tip = pointAt(s);
      for (var g = 0; g < ghostTrail.length; g++) game.draw.circle(ghostTrail[g].x, ghostTrail[g].y, 10 + g * 2, C.l2, 0.12 + g * 0.05);
      var hitTip = (failHit === 'short') && hitStop > 0;
      game.draw.circle(tip.x, tip.y, hitTip ? 30 : 16, hitTip && Math.floor(t * 18) % 2 === 0 ? C.l0 : C.l3);
      if (phase === 'cut') game.draw.sprite(SCISSORS, { d: C.l3 }, tip.x + 40, tip.y - 40, 10, { anchor: 'center' });
    }
    // 毛糸玉(速さで回る)
    game.draw.circle(BALL_X, BALL_Y, 74, C.l3);
    game.draw.circle(BALL_X, BALL_Y, 64, C.l2);
    for (var k = 0; k < 5; k++) {
      var a = spinA + k * 0.63;
      game.draw.line(BALL_X + Math.cos(a) * 60, BALL_Y + Math.sin(a) * 60, BALL_X - Math.cos(a) * 60, BALL_Y + Math.sin(a) * 20, C.l3, 5);
    }
  }

  function drawTeacher(mood) {
    var t = game.time.elapsed;
    var spr = mood === 'win' ? TEACH_WIN : mood === 'sad' ? TEACH_SAD : (holding || Math.floor(t * 2) % 2 === 0 ? TEACH_A : TEACH_B);
    var bob = mood === 'win' ? -Math.abs(Math.sin(t * 7)) * 36 : Math.sin(t * 3) * 3;
    game.draw.sprite(spr, TEACH_PAL, W * 0.72, H * 0.83 + bob, 13, { anchor: 'center' });
    game.draw.rect(W * 0.72 - 90, H * 0.83 + 95, 180, 12, C.l2);
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var x = 120 + i * 80;
      game.draw.rect(x - 30, 70, 60, 60, C.l2);
      if (i < pinned) { game.draw.line(x - 22, 116, x + 22, 84, C.l3, 8); game.draw.circle(x + 22, 84, 8, C.l3); }
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 130 - m * 70, 100, 24, m < MISS_MAX - misses ? C.l3 : C.l1);
    say(pinned + ' / ' + NEEDED, W * 0.5, 96, 60, C.l3);
    say('SCORE ' + score, W * 0.5, 160, 32, C.l2);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(100, 204, W - 200, 18, C.l1);
    game.draw.rect(100, 204, (W - 200) * frac, 18, Math.floor(game.time.elapsed * 6) % 2 === 0 && frac < 0.25 ? C.l1 : C.l3);
    // 速さメーター(押している間だけ伸びる)
    var vf = phase === 'draw' ? (vel - V0) / (route.vmax - V0) : 0;
    game.draw.rect(160, 340, 760, 20, C.l1);
    game.draw.rect(160, 340, 760 * Math.max(0, vf), 20, C.l2);
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (beginDraw()) game.fx.burst(BALL_X, BALL_Y, { color: C.l3, count: 6, speed: 160 });
    else game.audio.tone('A3', 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (holding) {
      game.audio.tone('G4', 0.05, { wave: 'square', volume: 0.06 });
      release(true);
    }
  });
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'gap' || phase === 'cut') game.fx.burst(x, y, { color: C.l2, count: 3, speed: 80 });
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawScreen();
      drawRoute(hitKind);
      drawYarn(hitKind);
      drawTeacher('');
      game.draw.hand(demo.gx, demo.gy, { press: holding, scale: 15 });
      game.draw.rect(60, 50, W - 120, H * 0.12, C.l1, 0.95);
      say(TITLE, W * 0.5, H * 0.06, 92, C.l3);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.11, 36, C.l2);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.955, 44, C.l0);
      else say('TAP TO START', W * 0.5, H * 0.955, 40, C.l1);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawScreen();
      drawRoute('');
      drawTeacher(won ? 'win' : 'sad');
      game.draw.rect(110, H * 0.2, W - 220, 540, C.l3, 0.92);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, C.l0);
      say(pinned + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.l0);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.l1);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.l1);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.l0); }
      else if (!won && lastErr < 0) say('あと' + Math.round(-lastErr) + 'px!', W * 0.5, H * 0.47, 52, C.l0);
      else if (!won) say('あと' + Math.max(1, NEEDED - pinned) + '本!', W * 0.5, H * 0.47, 52, C.l0);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.955, 40, C.l0);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.25, H * 0.65), { color: Math.random() < 0.5 ? C.l3 : C.l0, count: 14, speed: 420 });
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
      if (phase === 'aim' || phase === 'draw') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0; holding = false;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.l3, size: 90 });
        finish(false);
      }
    }

    drawScreen();
    drawRoute(hitKind);
    drawYarn(hitKind);
    drawTeacher(done ? (won ? 'win' : 'sad') : '');
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.5, 100, C.l3);
      game.draw.hand(W * 0.55, H * 0.9, { press: false, scale: 14 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 2],
    ], { tempo: 120, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['G2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
