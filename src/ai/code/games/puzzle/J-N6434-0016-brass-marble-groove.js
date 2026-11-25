// J-N6434-0016-brass-marble-groove.js
// 真鍮玉の溝わたり — 指を置いた方へ木の盤が傾き、真鍮の玉を溝の道なりに転がして鈴の受け口まで導く
// 操作: 盤の上を押すと、押した位置の方向へ盤が傾いて玉が転がり出す。離すと水平に戻る。溝からはみ出すと玉が穴へ落ちる
// 終わり: 受け口に玉を落とせばCLEAR。玉を3個落とすかTIME UPでGAME OVER
// @mechanic: guide_path
// @theme: clockshop_tilt_groove_board
// 世界観: 古時計店で修理を習う見習いヤマネが、師匠の木製からくり盤を傾けて真鍮の玉を細くなる溝に沿って運び、閉店の鐘までに鈴の受け口へ落として仕掛けを鳴らす
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離の割合と拾った歯車の数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢の真鍮。gradient で厚みを作る
  var STYLE = { bg: ['#3a2418', '#6a4028', '#8a5a34'], main: ['#2f5a3a', '#c8a050'], accent: ['#f0d080', '#c84030'] };
  var C = {
    wall1: '#2a1a10', wall2: '#4a2e1c', wood1: '#8a5a34', wood2: '#a8743e', grain: '#6a4028',
    felt: '#2f5a3a', feltDark: '#234630', brass: '#d8b060', brassHi: '#fff0b0', brassDark: '#8a6a28',
    red: '#c84030', gold: '#f0d080', cream: '#f4e8d0', ink: '#1a100a', hole: '#0e0906'
  };

  var TITLE = 'BRASS GROOVE';
  var TIME_LIMIT = 16;
  var LIVES = 3;
  var BX = 70, BY = H * 0.15, BW = W - 140, BH = H * 0.57;
  var BALL_R = 30;
  var ACC = 1800, VMAX = 560, RETAIN = 0.45;

  var PTS = [
    { x: 190, y: H * 0.66 }, { x: 190, y: H * 0.48 }, { x: 640, y: H * 0.48 }, { x: 640, y: H * 0.34 },
    { x: 880, y: H * 0.34 }, { x: 880, y: H * 0.21 }, { x: 420, y: H * 0.21 }
  ];
  var HALF = [84, 80, 74, 68, 64, 60];
  var SEG = [], TOTAL = 0;
  for (var q = 1; q < PTS.length; q++) { var L = Math.hypot(PTS[q].x - PTS[q - 1].x, PTS[q].y - PTS[q - 1].y); SEG.push(L); TOTAL += L; }
  var CHECKS = [2, 4];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var DORMOUSE = [
    '.bb....bb.',
    'bppb..bppb',
    '.bbbbbbbb.',
    'bbwkbbkwbb',
    'bbbbnnbbbb',
    '.bbbbbbbb.',
    '..bccccb..',
    '.bb.bb.bb.'
  ];
  var DORMOUSE_B = [
    '.bb....bb.',
    'bppb..bppb',
    '.bbbbbbbb.',
    'bbkkbbkkbb',
    'bbbbnnbbbb',
    'bbbbbbbbbb',
    'b.bccccb.b',
    '..b....b..'
  ];
  var MOUSE_PAL = { b: '#b8905a', p: '#e8a0a0', w: '#ffffff', k: '#1a100a', n: '#5a3a28', c: '#f4e8d0' };
  var GEAR = ['.y.y.', 'yyyyy', '.y.y.', 'yyyyy', '.y.y.'];
  var BELL = ['..gg..', '.gggg.', '.gggg.', 'gggggg', '..rr..'];

  var ball, lives, timeLeft, best, checkS, phase, phaseT, endOk, fallT, gears, gearsGot, tiltX, tiltY, edgeWarn, holding, focusX, focusY;
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function project(px, py) {
    var bestD = 1e9, bestS = 0, bestSeg = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var ax = PTS[i - 1].x, ay = PTS[i - 1].y, vx = PTS[i].x - ax, vy = PTS[i].y - ay;
      var l2 = vx * vx + vy * vy;
      var t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
      var d = Math.hypot(px - ax - vx * t, py - ay - vy * t);
      if (d < bestD) { bestD = d; bestS = acc + t * SEG[i - 1]; bestSeg = i - 1; }
      acc += SEG[i - 1];
    }
    return { d: bestD, s: bestS, seg: bestSeg };
  }

  function pointAt(s) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (s <= acc + SEG[i - 1]) {
        var t = (s - acc) / SEG[i - 1];
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG[i - 1];
    }
    return { x: PTS[PTS.length - 1].x, y: PTS[PTS.length - 1].y };
  }

  function sOfPoint(idx) { var a = 0; for (var i = 0; i < idx; i++) a += SEG[i]; return a; }

  function initGame() {
    ball = { x: PTS[0].x, y: PTS[0].y, vx: 0, vy: 0 };
    lives = LIVES; timeLeft = TIME_LIMIT; best = 0; checkS = 0;
    phase = 'ready'; phaseT = 0.8; endOk = false; fallT = 0; tiltX = 0; tiltY = 0; edgeWarn = 0; holding = false;
    gears = [pointAt(TOTAL * 0.28), pointAt(TOTAL * 0.55), pointAt(TOTAL * 0.80)];
    for (var g = 0; g < gears.length; g++) gears[g].got = false;
    gearsGot = 0; focusX = W / 2; focusY = H / 2;
  }

  // 盤の傾き → 玉の転がり(実プレイ・デモ共通)
  function stepBall(dt, press, fx, fy, live) {
    if (fallT > 0) {
      fallT -= dt;
      if (fallT <= 0) {
        var sp = pointAt(checkS);
        ball.x = sp.x; ball.y = sp.y; ball.vx = 0; ball.vy = 0;
      }
      return 'falling';
    }
    var tx = 0, ty = 0;
    if (press) {
      var dx = fx - ball.x, dy = fy - ball.y, dl = Math.hypot(dx, dy);
      if (dl > 1) { var k = Math.min(1, dl / 260); tx = dx / dl * k; ty = dy / dl * k; }
    }
    tiltX += (tx - tiltX) * Math.min(1, dt * 10);
    tiltY += (ty - tiltY) * Math.min(1, dt * 10);
    ball.vx += tiltX * ACC * dt; ball.vy += tiltY * ACC * dt;
    var r = Math.pow(RETAIN, dt);
    ball.vx *= r; ball.vy *= r;
    var sp2 = Math.hypot(ball.vx, ball.vy);
    if (sp2 > VMAX) { ball.vx *= VMAX / sp2; ball.vy *= VMAX / sp2; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    var pr = project(ball.x, ball.y);
    var half = HALF[pr.seg];
    if (pr.s > best) best = pr.s;
    for (var c = 0; c < CHECKS.length; c++) {
      var cs = sOfPoint(CHECKS[c]);
      if (pr.s >= cs - 10 && checkS < cs) {
        checkS = cs;
        if (live) { game.fx.popup(Math.round(cs / TOTAL * 100) + '%', ball.x, ball.y - 80, { color: C.gold, size: 50 }); game.audio.play('se_milestone', 0.5); }
      }
    }
    for (var g = 0; g < gears.length; g++) {
      if (!gears[g].got && Math.hypot(gears[g].x - ball.x, gears[g].y - ball.y) < 50) {
        gears[g].got = true; gearsGot++;
        if (live) game.feedback.good(gears[g].x, gears[g].y - 50, { text: 'NICE', color: C.gold, sound: 'se_coin' });
      }
    }
    edgeWarn = Math.max(0, (pr.d - (half - BALL_R - 18)) / 18);
    if (live && edgeWarn > 0.3 && Math.random() < 0.15) game.audio.tone(1200, 0.03, { wave: 'square', volume: 0.03 });
    if (pr.d > half) {
      fallT = 0.55; lives--;
      focusX = ball.x; focusY = ball.y;
      return 'fall';
    }
    var end = PTS[PTS.length - 1];
    if (Math.hypot(ball.x - end.x, ball.y - end.y) < 40) return 'goal';
    return 'roll';
  }

  function drawBoard() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall1], [0.5, C.wall2], [1, C.wall1]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.02 + 0.02 * Math.sin(el * 1.5));
    // 背景の柱時計と棚
    for (var s = 0; s < 3; s++) game.draw.rect(0, H * (0.76 + s * 0.07), W, 10, C.grain);
    var sw = Math.sin(el * 2.4) * 30;
    game.draw.line(W * 0.85, H * 0.78, W * 0.85 + sw, H * 0.88, C.brass, 6);
    game.draw.circle(W * 0.85 + sw, H * 0.88, 22, C.brass);
    // 盤の厚み(傾いた側が暗く沈む)
    var ox = tiltX * 14, oy = tiltY * 14;
    game.draw.rect(BX + 10 + ox, BY + 16 + oy, BW, BH, '#000000', 0.45);
    game.draw.gradient(BY, BY + BH, [[0, C.wood2], [1, C.wood1]]);
    game.draw.rect(0, BY, BX, BH, C.wall2);
    game.draw.rect(BX + BW, BY, W - BX - BW, BH, C.wall2);
    game.draw.rect(0, BY - 4, W, 4, C.wall1);
    for (var gline = 0; gline < 14; gline++) {
      var gy = BY + 20 + gline * (BH / 14);
      game.draw.line(BX, gy + Math.sin(gline) * 6, BX + BW, gy + Math.cos(gline) * 8, C.grain, 3);
    }
    game.draw.rect(BX, BY, BW, 10, C.brassHi, 0.25 - tiltY * 0.2);
    game.draw.rect(BX, BY + BH - 10, BW, 10, '#000000', 0.2 + tiltY * 0.2);
    game.draw.rect(BX, BY, 10, BH, C.brassHi, 0.2 - tiltX * 0.2);
    game.draw.rect(BX + BW - 10, BY, 10, BH, '#000000', 0.2 + tiltX * 0.2);
    // 穴(溝の外側に点在)
    for (var h = 0; h < 10; h++) game.draw.circle(BX + 60 + (h * 331) % (BW - 120), BY + 60 + (h * 227) % (BH - 120), 26, C.hole, 0.55);
    // 溝(フェルト)
    for (var i = 1; i < PTS.length; i++) {
      var hw = HALF[i - 1];
      var warnCol = edgeWarn > 0.3 && project(ball.x, ball.y).seg === i - 1;
      game.draw.line(PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y, warnCol ? C.red : C.feltDark, hw * 2 + 10);
      game.draw.circle(PTS[i - 1].x, PTS[i - 1].y, hw + 5, warnCol ? C.red : C.feltDark);
    }
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.felt, HALF[j - 1] * 2 - 6);
      game.draw.circle(PTS[j - 1].x, PTS[j - 1].y, HALF[j - 1] - 3, C.felt);
    }
    // 到達済みの道
    var done = pointAt(best), acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      if (best <= acc) break;
      var e = best >= acc + SEG[k - 1] ? PTS[k] : done;
      game.draw.line(PTS[k - 1].x, PTS[k - 1].y, e.x, e.y, C.brassDark, 8);
      acc += SEG[k - 1];
    }
    for (var c = 0; c < CHECKS.length; c++) {
      var cp = PTS[CHECKS[c]];
      game.draw.circle(cp.x, cp.y, 16, checkS >= sOfPoint(CHECKS[c]) ? C.gold : C.brassDark);
    }
    for (var g = 0; g < gears.length; g++) if (!gears[g].got) game.draw.sprite(GEAR, { y: C.gold }, gears[g].x, gears[g].y + Math.sin(el * 4 + g) * 4, 9, { anchor: 'center' });
    var end = PTS[PTS.length - 1];
    game.draw.circle(end.x, end.y, 50, C.hole);
    game.draw.sprite(BELL, { g: C.gold, r: C.red }, end.x, end.y - 90 + Math.sin(el * 5) * 5, 10, { anchor: 'center' });
  }

  function drawBall() {
    var sc = fallT > 0 ? Math.max(0.1, fallT / 0.55) : 1;
    game.draw.circle(ball.x + 8, ball.y + 10, BALL_R * sc, '#000000', 0.35);
    game.draw.circle(ball.x, ball.y, BALL_R * sc, C.brassDark);
    game.draw.circle(ball.x - 3, ball.y - 3, BALL_R * sc * 0.85, C.brass);
    game.draw.circle(ball.x - 10 * sc, ball.y - 10 * sc, BALL_R * sc * 0.3, C.brassHi);
  }

  function drawMouse() {
    var el = game.time.elapsed;
    var worried = edgeWarn > 0.3 || fallT > 0;
    game.draw.sprite(worried ? DORMOUSE_B : DORMOUSE, MOUSE_PAL, W * 0.2, H * 0.82 + Math.sin(el * 3) * 6, 14, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.12, C.wall1, 0.8);
    txt(Math.round(best / TOTAL * 100) + '%', W * 0.5, H * 0.04, 60, C.cream);
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(80 + i * 70, H * 0.04, 24, i < lives ? C.brass : '#3a2a1a');
      if (i < lives) game.draw.circle(72 + i * 70, H * 0.033, 8, C.brassHi);
    }
    txt(gearsGot + ' / ' + gears.length, W * 0.86, H * 0.04, 44, C.gold);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, H * 0.085, W - 120, 18, '#1a100a');
    game.draw.rect(60, H * 0.085, (W - 120) * frac, 18, frac < 0.25 ? C.red : C.gold);
  }

  function scoreOf() { return 1000 + gearsGot * 150 + lives * 100 + Math.round(timeLeft * 30); }

  function drawResult() {
    game.draw.rect(0, H * 0.30, W, H * 0.24, C.ink, 0.8);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 100, endOk ? C.gold : C.red);
    txt(Math.round(best / TOTAL * 100) + '%   ' + gearsGot + ' / ' + gears.length, W / 2, H * 0.42, 46, C.cream);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.49, 54, C.gold);
    else if (!endOk) txt('あと' + Math.max(1, 100 - Math.round(best / TOTAL * 100)) + '%!', W / 2, H * 0.49, 54, C.gold);
    else txt('BEST ' + game.best, W / 2, H * 0.49, 42, C.cream);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; }
    var pr = project(ball.x, ball.y);
    // 次の角までの距離で目標速度を決め、溝の中心へ寄せる(速すぎたら逆へ傾けてブレーキ)
    var seg = pr.seg, toCorner = sOfPoint(seg + 1) - pr.s;
    if (toCorner < 30 && seg < SEG.length - 1) { seg++; toCorner = SEG[seg]; }
    var a = PTS[seg], b = PTS[seg + 1];
    var tx = (b.x - a.x) / SEG[seg], ty = (b.y - a.y) / SEG[seg];
    var want = Math.min(380, 90 + toCorner * 1.1);
    var mid = pointAt(pr.s);
    var vdx = tx * want + (mid.x - ball.x) * 4 - ball.vx, vdy = ty * want + (mid.y - ball.y) * 4 - ball.vy;
    var vl = Math.hypot(vdx, vdy), gain = Math.min(1, vl / 220);
    var fx = ball.x + (vl > 0 ? vdx / vl : 0) * gain * 260, fy = ball.y + (vl > 0 ? vdy / vl : 0) * gain * 260;
    demo.gx += (fx - demo.gx) * Math.min(1, dt * 14);
    demo.gy += (fy - demo.gy) * Math.min(1, dt * 14);
    demo.press = true;
    var r = stepBall(dt, true, demo.gx, demo.gy, false);
    if (r === 'fall') lives = LIVES;
    if (r === 'goal') { game.fx.burst(ball.x, ball.y, { color: C.gold, count: 16 }); initGame(); phase = 'play'; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play') game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.04 });
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    holding = true;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, y, { color: C.gold, count: 4, speed: 100 });
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    holding = false;
    if (phase === 'play') game.audio.tone('D4', 0.04, { wave: 'triangle', volume: 0.03 });
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!ball) initGame();
      stepDemo(dt);
      drawBoard(); drawBall(); drawMouse();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(TITLE, W / 2, H * 0.05, 84, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.10, 40, C.cream);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.93, 46, C.cream);
      return;
    }
    if (state === S.RESULT) {
      drawBoard(); drawBall(); drawMouse(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.cream);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      var pressing = game.input.pressing;
      var r = stepBall(dt, pressing, game.input.x, game.input.y, true);
      if (r === 'fall') {
        game.feedback.bad(ball.x, ball.y - 60, { text: 'MISS', shake: 8 });
        if (lives <= 0) { endOk = false; phase = 'stop'; phaseT = 0.5; }
      } else if (r === 'goal') {
        endOk = true; phase = 'stop'; phaseT = 0.45; best = TOTAL; focusX = ball.x; focusY = ball.y;
        game.audio.tone('E6', 0.3, { wave: 'triangle', volume: 0.1 });
      } else if (timeLeft <= 0) {
        timeLeft = 0; endOk = false; phase = 'stop'; phaseT = 0.45; focusX = ball.x; focusY = ball.y;
      }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.gold, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#fff0b0', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        var pct = Math.round(best / TOTAL * 100);
        if (endOk) game.end.success(scoreOf(), { progress: pct, gears: gearsGot, lives: lives });
        else game.end.failure({ progress: pct, gears: gearsGot });
        return;
      }
    }

    drawBoard(); drawBall(); drawMouse(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY, 70 + (0.5 - phaseT) * 140, '#ffffff', 0.45);
      game.draw.circle(focusX, focusY, BALL_R * 1.6, endOk ? C.gold : C.red, 0.8);
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 110, C.gold);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 1], ['D5', 1],
      ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 1], ['C5', 1]
    ], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
