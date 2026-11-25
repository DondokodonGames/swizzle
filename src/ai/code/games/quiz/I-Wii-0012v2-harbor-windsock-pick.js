// I-Wii-0012v2-harbor-windsock-pick.js
// 吹き流し見比べ — 漁港の旗揚げ台の左右で揺れる吹き流しを見比べ、揺れ幅の大きい(風の強い)側の旗を瞬時に揚げる
// 操作: 左右の吹き流しのうち、上下の振れ幅(角度)が大きい側の画面半分をタップしてその側の旗を揚げる。細かく速くはためく方や、手前にあって大きく見える方にだまされない。沖の漁船が港口に着く前に決める
// 終わり: 15秒以内に7回正しく揚げればCLEAR。取り違え/船が着くまで揚げないのが3回、または時間切れでGAME OVER
// @mechanic: size_judge
// @theme: harbor_windsock_flag_pick
// 世界観: 漁港の旗揚げ台で、見習い漁師が左右の岸壁に立つ吹き流しの揺れを見比べ、入ってくる漁船に風の強い側を紅白の旗で知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく揚げた回数・平均判断時間・最大連続・スコア
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色。太く単純な形、日焼けした液晶の色味
  var STYLE = { bg: ['#b4c7bb', '#7a9c97'], main: ['#b8574a', '#e6dfca', '#3f5d60'], accent: ['#d3ae4c', '#283232'] };
  var C = {
    red: STYLE.main[0], white: STYLE.main[1], teal: STYLE.main[2], gold: STYLE.accent[0], ink: STYLE.accent[1],
    sea: '#5f8789', seaDk: '#4a6e71', sand: '#c4b48a', stone: '#8d948a', stoneDk: '#6b7269', mute: '#93a39b', wood: '#8a6a4a',
  };

  var GAME_TITLE = 'GUST FLAGS';
  var TIME_LIMIT = 15;
  var NEEDED = 7;
  var MAX_MISS = 3;
  var DROOP = 20;
  var BASE_Y = H * 0.6;
  var MAST_X = [210, 870];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var q, qn, phase, phaseT, swingT, picked, correct, misses, combo, bestCombo, score, finalScore, reactSum;
  var timeLeft, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, warnT, endWhy;

  // 見習い漁師(鉢巻・半纏)
  var LAD_A = ['...hhhhhh...', '..rrrrrrrr..', '..hssssssh..', '..skssssks..', '..ssssssss..', '...ssmmss...', '....ssss....', '..bbbbbbbb..', '.bbwbbbbwbb.', 'sbbwbbbbwbbs', 's.bbbbbbbb.s', '..dddddddd..', '..dd....dd..'];
  var LAD_B = ['...hhhhhh...', '..rrrrrrrr..', '..hssssssh..', '..skssssks..', '..ssssssss..', '...ssssss...', '....ssss....', '..bbbbbbbb..', '.bbwbbbbwbb.', 'sbbwbbbbwbbs', 's.bbbbbbbb.s', '..dddddddd..', '..dd....dd..'];
  var LAD_JOY = ['...hhhhhh...', '..rrrrrrrr..', '..hssssssh..', '..sk.ss.ks..', '..ssssssss..', '...smmmms...', '....ssss....', 's.bbbbbbbb.s', 'sbbwbbbbwbbs', '.bbwbbbbwbb.', '..bbbbbbbb..', '..dddddddd..', '..dd....dd..'];
  var LAD_SAD = ['............', '...hhhhhh...', '..rrrrrrrr..', '..hssssssh..', '..sskssks...', '..ssssssss..', '...smmmms...', '..bbbbbbbb..', '.bbwbbbbwbb.', 'sbbwbbbbwbbs', 's.bbbbbbbb.s', '..dddddddd..', '..dd....dd..'];
  var LAD_PAL = { h: '#283232', r: '#b8574a', s: '#d29a72', k: '#283232', m: '#8a4a3a', b: '#3f5d60', w: '#e6dfca', d: '#5a5048' };
  var GULL_A = ['w.....w', 'ww...ww', '.wwkww.', '..www..'];
  var GULL_B = ['.......', '.......', 'wwwkwww', '..www..'];
  var GULL_PAL = { w: '#e6dfca', k: '#283232' };
  var BOAT_A = ['....m.....', '....mw....', '....mww...', 'rrrrrrrrrr', '.rrrrrrrr.', '..dddddd..'];
  var BOAT_B = ['....m.....', '....mw....', '....mww...', 'rrrrrrrrrr', '.rrrrrrrr.', '...dddd...'];
  var BOAT_PAL = { m: '#5a5048', w: '#e6dfca', r: '#b8574a', d: '#3f5d60' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }

  // ---- 問題(どちらの風が強いか)。強さ=振れ角。速さ・見かけの大きさは惑わし ----
  function makeQuestion(n, forceSide) {
    var strong = forceSide !== undefined ? forceSide : (Math.random() < 0.5 ? 0 : 1);
    var weak = 1 - strong;
    var ratio = n < 2 ? 2.0 : n < 4 ? 1.7 : n < 6 ? 1.5 : 1.38;
    var weakA = 11 + Math.random() * 3;
    var socks = [];
    for (var i = 0; i < 2; i++) socks.push({ A: weakA, f: 1.5, ph: Math.random() * 6.28, s: 1 });
    socks[strong].A = weakA * ratio;
    var fast = n >= 2 && (n < 4 || n >= 6);
    var near = n >= 4;
    if (fast) { socks[weak].f = 2.7; socks[strong].f = 1.2; }
    if (near) { socks[weak].s = 1.22; socks[strong].s = 0.78; }
    return { strong: strong, socks: socks, time: Math.max(1.3, 2.2 - n * 0.12) };
  }

  function mastBase(i) {
    var s = q.socks[i].s;
    return { x: MAST_X[i] + (i === 0 ? -1 : 1) * (s - 1) * 90, y: BASE_Y + (s - 1) * 260 };
  }
  function mastTop(i) {
    var b = mastBase(i);
    return { x: b.x, y: b.y - 560 * q.socks[i].s };
  }
  function sockAngle(i) {
    var k = q.socks[i];
    return DROOP + k.A * Math.sin(k.ph + swingT * k.f * 6.283);
  }
  function sockPts(i, angDeg, mul) {
    var k = q.socks[i], top = mastTop(i), dir = i === 0 ? 1 : -1;
    var a = angDeg * Math.PI / 180, segL = 300 * k.s * mul / 5;
    var pts = [{ x: top.x, y: top.y }], x = top.x, y = top.y;
    for (var j = 1; j <= 5; j++) {
      var aj = a + Math.sin(swingT * 11 + j * 0.9) * 0.02 * j;
      x += Math.cos(aj) * segL * dir; y += Math.sin(aj) * segL;
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function initGame() {
    qn = 0; q = makeQuestion(0); phase = 'ask'; phaseT = 0; swingT = 0; picked = -1;
    correct = 0; misses = 0; combo = 0; bestCombo = 0; score = 0; finalScore = 0; reactSum = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; endWhy = '';
  }

  function nextQuestion() {
    qn++; q = makeQuestion(qn); phase = 'ask'; phaseT = 0; picked = -1;
    game.audio.tone('A4', 0.05, { wave: 'triangle', volume: 0.06 });
  }

  // 旗を揚げる(本番もデモも同じ処理)
  function answer(side) {
    if (phase !== 'ask' || stopT > 0) return;
    picked = side;
    var top = mastTop(side);
    game.audio.tone(side === 0 ? 'E5' : 'G5', 0.06, { wave: 'square', volume: 0.07 });
    if (side === q.strong) {
      correct++; combo++; if (combo > bestCombo) bestCombo = combo;
      var spd = Math.max(0, 1 - phaseT / q.time);
      var pts = 100 + Math.round(spd * 100) + combo * 20;
      score += pts; reactSum += phaseT; joyT = 0.5;
      game.feedback.good(top.x + (side === 0 ? 160 : -160), top.y + 90, { text: spd > 0.5 ? 'PERFECT' : 'GOOD', color: C.gold, size: 64 });
      game.fx.popup('+' + pts, top.x + (side === 0 ? 160 : -160), top.y - 40, { color: C.white, size: 44 });
      if (combo === 4 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE x4', W / 2, H * 0.3, { color: C.gold, size: 80 });
      }
      phase = 'show'; phaseT = 0;
      if (mode === S.PLAYING && correct >= NEEDED) { stopT = 0.4; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
    } else {
      combo = 0; stopT = 0.45; stopKind = 'wrong';
      game.fx.flash('#ffffff', 0.12);
      game.audio.tone('C3', 0.25, { wave: 'square', volume: 0.1, slide: -80 });
    }
  }

  function resolveMiss() {
    misses++; sadT = 0.8;
    var top = mastTop(q.strong);
    game.feedback.bad(top.x + (q.strong === 0 ? 160 : -160), top.y + 90, { text: 'MISS', color: C.red, size: 64 });
    phase = 'show'; phaseT = 0;
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); }
  }

  function stepRound(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else resolveMiss();
      }
      return;
    }
    swingT += dt; phaseT += dt;
    if (phase === 'ask') {
      // 船が港口に近づく音(予告)
      if (phaseT > q.time - 0.6 && phaseT - dt <= q.time - 0.6) game.audio.tone('D5', 0.05, { wave: 'square', volume: 0.06 });
      if (phaseT >= q.time) {
        stopT = 0.45; stopKind = 'late';
        game.fx.flash('#ffffff', 0.12);
        game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.1 });
      }
    } else if (phase === 'show' && phaseT >= 0.55 && !fin) nextQuestion();
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 60) + (MAX_MISS - misses) * 100 : score;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(140 + i * 200, H * 0.4 + (i % 2) * 120, { color: i % 2 ? C.gold : C.white, count: 18, speed: 480 });
      game.fx.flash(C.white, 0.2);
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || readyT > 0 || stopT > 0 || phase !== 'ask') { game.audio.play('se_tap', 0.08); return; }
    answer(x < W / 2 ? 0 : 1);
  });

  // ---- 描画 ----
  function drawBg(t) {
    game.draw.gradient(0, H * 0.4, [[0, STYLE.bg[0]], [1, '#cfd8c6']]);
    // 遠くの山影
    for (var m = 0; m < 6; m++) game.draw.circle(80 + m * 190, H * 0.4 + 40, 120 + (m % 3) * 30, '#9db1a6');
    game.draw.gradient(H * 0.4, H * 0.76, [[0, C.sea], [1, C.seaDk]]);
    for (var p = 0; p < 4; p++) game.draw.rect(350 + p * 110, H * 0.63 + (p % 2) * 30 + Math.sin(t * 2 + p) * 6, 70, 6, C.white, 0.3);
    for (var w = 0; w < 9; w++) {
      var wy = H * 0.42 + w * 42, off = (t * (30 + w * 6) + w * 90) % 220;
      for (var k = -1; k < 6; k++) game.draw.rect(k * 220 + off, wy, 90, 6, C.white, 0.25);
    }
    // 岸壁(左右)と旗揚げ台
    game.draw.rect(0, H * 0.6, 330, H * 0.16, C.stone);
    game.draw.rect(W - 330, H * 0.6, 330, H * 0.16, C.stone);
    for (var b = 0; b < 4; b++) {
      game.draw.rect(0, H * 0.6 + b * 76, 330, 6, C.stoneDk);
      game.draw.rect(W - 330, H * 0.6 + b * 76, 330, 6, C.stoneDk);
    }
    game.draw.rect(0, H * 0.75, W, H * 0.25, C.sand);
    game.draw.rect(330, H * 0.72, W - 660, 44, C.wood);
    game.draw.rect(330, H * 0.72 + 44, W - 660, 10, C.ink, 0.4);
    // かもめ(遠景の動き)
    var gx = (t * 70) % (W + 200) - 100, gf = Math.floor(t * 5) % 2 ? GULL_A : GULL_B;
    game.draw.sprite(gf, GULL_PAL, gx, H * 0.17 + Math.sin(t * 2) * 16, 9, { anchor: 'center' });
  }

  function drawMast(i, t) {
    var base = mastBase(i), top = mastTop(i), s = q.socks[i].s;
    game.draw.line(base.x, base.y, top.x, top.y, C.ink, 16 * s);
    game.draw.line(base.x - 4, base.y, top.x - 4, top.y, C.mute, 6 * s);
    game.draw.circle(top.x, top.y, 14 * s, C.gold);
  }

  function drawSock(i, mul, white) {
    var k = q.socks[i], pts = sockPts(i, sockAngle(i), mul);
    for (var j = 0; j < 5; j++) {
      var w = (64 - j * 7) * k.s * mul;
      game.draw.line(pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y, C.ink, w + 8);
      game.draw.line(pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y, white ? '#ffffff' : (j % 2 ? C.white : C.red), w);
    }
    game.draw.circle(pts[0].x, pts[0].y, 34 * k.s * mul, C.ink);
    game.draw.circle(pts[0].x, pts[0].y, 26 * k.s * mul, white ? '#ffffff' : C.red);
  }

  // 根拠: 振れ幅の扇(強い側は金、弱い側は灰)
  function drawEvidence(i) {
    var k = q.socks[i], strong = i === q.strong, col = strong ? C.gold : C.mute;
    var lo = sockPts(i, DROOP - k.A, 1), hi = sockPts(i, DROOP + k.A, 1);
    game.draw.line(lo[0].x, lo[0].y, lo[5].x, lo[5].y, col, strong ? 8 : 5);
    game.draw.line(hi[0].x, hi[0].y, hi[5].x, hi[5].y, col, strong ? 8 : 5);
    for (var d = 0; d <= 8; d++) {
      var p = sockPts(i, DROOP - k.A + (2 * k.A) * d / 8, 1);
      game.draw.circle(p[5].x, p[5].y, strong ? 9 : 6, col);
    }
  }

  function drawBoat(t) {
    var r = phase === 'ask' ? Math.min(1, phaseT / q.time) : 1;
    var px = 5 + r * 7, y = H * 0.41 + r * H * 0.12 + Math.sin(t * 3) * 4;
    var late = phase === 'ask' && r > 0.72 && Math.floor(t * 10) % 2 === 0;
    game.draw.sprite(Math.floor(t * 3) % 2 ? BOAT_A : BOAT_B, late ? { m: C.ink, w: '#ffffff', r: '#ffffff', d: C.ink } : BOAT_PAL, W / 2, y, px, { anchor: 'center' });
    game.draw.rect(W / 2 - px * 6, y + px * 3.4, px * 12, px * 0.8, C.white, 0.35);
  }

  function drawLad(t) {
    var x = W / 2, y = H * 0.66 + Math.sin(t * 3) * 4;
    var f = sadT > 0 || (fin && !cleared) ? LAD_SAD : joyT > 0 || (fin && cleared) ? LAD_JOY : (Math.floor(t * 2) % 2 ? LAD_A : LAD_B);
    // 紅白の旗: 揚げた側は上へ、反対は下
    for (var side = 0; side < 2; side++) {
      var dir = side === 0 ? -1 : 1, up = picked === side && phase === 'show';
      var hx = x + dir * 80, hy = y + 40;
      var ex = up ? hx + dir * 50 : hx + dir * 110, ey = up ? hy - 250 : hy + 90;
      game.draw.line(hx, hy, ex, ey, C.wood, 10);
      var col = side === 0 ? C.red : C.white;
      if (up) game.draw.rect(dir < 0 ? ex - 110 : ex, ey, 110, 80 + Math.sin(t * 14) * 6, col);
      else game.draw.rect(dir < 0 ? ex - 26 : ex, ey - 10, 26, 70, col);
    }
    game.draw.sprite(f, LAD_PAL, x, y, 14, { anchor: 'center' });
  }

  function drawPads(t) {
    for (var side = 0; side < 2; side++) {
      var cx = side === 0 ? W * 0.25 : W * 0.75, cy = H * 0.86, pulse = 0.5 + Math.sin(t * 4 + side * 3) * 0.2;
      var lit = picked === side && phase === 'show';
      game.draw.rect(cx - 200, cy - 110, 400, 220, lit ? C.gold : C.teal, lit ? 0.9 : pulse);
      game.draw.rect(cx - 6, cy - 80, 12, 170, C.wood);
      game.draw.rect(side === 0 ? cx - 126 : cx + 6, cy - 80, 120, 84, side === 0 ? C.red : C.white);
      game.draw.rect(side === 0 ? cx - 126 : cx + 6, cy - 80, 120, 8, C.ink, 0.3);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 34, W - 120, 22, C.ink, 0.5);
    game.draw.rect(60, 34, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.red : C.white);
    out(correct + ' / ' + NEEDED, W / 2, 130, 64, C.white);
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(90 + m * 64, 130, 22, m < misses ? C.red : C.ink, m < misses ? 1 : 0.4);
    out('' + score, W - 140, 130, 44, C.gold);
    if (combo >= 2) out('x' + combo, W - 140, 190, 36, C.white);
  }

  function drawScene(t) {
    drawBg(t);
    for (var i = 0; i < 2; i++) drawMast(i, t);
    drawBoat(t);
    if (phase === 'show') { drawEvidence(0); drawEvidence(1); }
    for (var k = 0; k < 2; k++) {
      var hit = stopT > 0 && stopKind !== 'win' && k === q.strong;
      drawSock(k, hit ? 1.25 : 1, hit && Math.floor(t * 16) % 2 === 0);
    }
    drawLad(t);
    drawPads(t);
  }

  // ---- ATTRACT: 本物の makeQuestion()/answer() で3問。1・2問目は正解、3問目は速くはためく弱い側を選んでMISS→根拠の扇 ----
  var demo = { t: 0, x: W / 2, y: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; q = makeQuestion(0, 1); }
    stepRound(dt);
    var tx = W / 2, ty = H * 0.86;
    demo.press = false;
    if (phase === 'ask' && stopT <= 0 && qn < 4) {
      var side = qn === 2 ? 1 - q.strong : q.strong;
      tx = side === 0 ? W * 0.25 : W * 0.75;
      demo.press = phaseT > 0.85;
      if (phaseT >= 0.95) answer(side);
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 7);
    demo.y += (ty - demo.y) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 96, C.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C.gold);
      else out('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (mode === S.RESULT) {
      swingT += dt;
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.ink, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? C.gold : C.red);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, cleared ? C.gold : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.white);
      var avg = correct > 0 ? (reactSum / correct).toFixed(2) : '-';
      out(correct + ' / ' + NEEDED + '   ' + avg + 's   x' + bestCombo, W / 2, H * 0.46, 42, C.white);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.gold);
      if (!cleared) out('あと' + (NEEDED - correct) + '回!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt; swingT += dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { correct: correct, misses: misses, bestCombo: bestCombo, avgSec: correct > 0 ? Math.round(reactSum / correct * 100) / 100 : 0 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt; swingT += dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepRound(dt);
      if (!fin && timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash('#ffffff', 0.15);
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C.red, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['F5', 1], ['E5', 0.5], ['C5', 0.5], ['A4', 1],
      ['D5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 2],
    ], { tempo: 132, wave: 'square', volume: 0.06, loop: true, bass: [['D3', 2], ['A2', 2], ['C3', 2], ['A2', 2], ['D3', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
