// GH-PS-0019-pin-drop-curve.js
// ピンドロップカーブ — 指を弾いてボールを投げ、風を読んでピンを崩す
// 操作: レーン奥のピンめがけ、下から上へフリック。横のブレでボールにカーブをかける
// 終わり: 3投の合計倒本数が目標以上ならクリア。届かなければゲームオーバー
// @mechanic: flick_launch
// @theme: night_lane_bowl
// 世界観: 深夜営業のボウリングレーン。ピン精たちが並ぶ奥まで、風が吹く中で球を投げ切る一投勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 3投合計の倒本数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s BILLBOARD 3D: 奥行きはスプライトのpxスケールで表現、接地影で位置を示す
  var STYLE = {
    bg: ['#0c2036', '#030810'],
    main: ['#ffe066', '#3fa9ff', '#ffffff'],
    accent: ['#ff4d6a', '#39ff9e'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1], lane: '#3a2418', laneEdge: '#1c1208',
    pin: '#f4efe4', pinDark: '#c9c0ac', ball: STYLE.main[1], ballDark: '#1f5fa8',
    gold: STYLE.main[0], good: STYLE.accent[1], bad: STYLE.accent[0], white: '#ffffff', ink: '#08060a',
  };

  var GAME_TITLE = 'PIN DROP CURVE';
  var THROWS_TOTAL = 3;
  var TOTAL_TARGET = 16;   // 30本中の目標
  var CX = W * 0.5;
  var LAUNCH_Y = H * 0.80;
  var LANE_HALF = 250;
  var CURVE_SCALE = 300;
  var HIT_RADIUS = 130;
  var MIN_POWER = 0.32;

  var ROWS = [
    { y: H * 0.345, dxs: [0], scale: 15 },
    { y: H * 0.308, dxs: [-72, 72], scale: 13.5 },
    { y: H * 0.270, dxs: [-144, 0, 144], scale: 12 },
    { y: H * 0.232, dxs: [-216, -72, 72, 216], scale: 10.5 },
  ];
  var PIN_DEFS = [];
  for (var ri = 0; ri < ROWS.length; ri++) {
    for (var pi = 0; pi < ROWS[ri].dxs.length; pi++) {
      PIN_DEFS.push({ x: CX + ROWS[ri].dxs[pi], y: ROWS[ri].y, scale: ROWS[ri].scale });
    }
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var throwIdx, pinsAlive, totalScore, wind, phase, charge, ball, resultText, resultTextT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PIN_SPRITE = ['.#.', '###', '#.#', '###'];
  var PIN_PAL = { '#': C.pin };
  var BALL_F = [
    ['.###.', '#####', '#.#.#', '#####', '.###.'],
    ['.###.', '#####', '#.#.#', '#####', '.###.'],
  ];
  var BALL_PAL = { '#': C.ball };

  function resetPins() {
    pinsAlive = [];
    for (var i = 0; i < PIN_DEFS.length; i++) pinsAlive.push(true);
  }

  function aliveCount() {
    var n = 0;
    for (var i = 0; i < pinsAlive.length; i++) if (pinsAlive[i]) n++;
    return n;
  }

  function startThrow() {
    phase = 'idle'; ball = null; resetPins();
    wind = throwIdx === 0 ? 0 : game.random(-0.55, 0.55);
    resultText = ''; resultTextT = 0;
  }

  function initGame() {
    throwIdx = 0; totalScore = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    startThrow();
  }

  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function beginCharge(x, y) {
    if (phase !== 'idle') return;
    charge = { x0: x, y0: y, x: x, y: y };
    phase = 'charging';
    game.audio.play('se_tap', 0.15);
  }
  function moveCharge(x, y) {
    if (phase !== 'charging' || !charge) return;
    charge.x = x; charge.y = y;
  }
  function releaseCharge(x, y) {
    if (phase !== 'charging' || !charge) return;
    var dx = x - charge.x0;
    var dy = charge.y0 - y;
    var power = Math.max(0.15, Math.min(1.6, dy / 340));
    var curveAmt = Math.max(-1.6, Math.min(1.6, dx / 150));
    launchBall(power, curveAmt);
    charge = null;
  }
  function launchBall(power, curveAmt) {
    var foul = power < MIN_POWER;
    var dur = foul ? 0.5 : Math.max(0.65, 1.1 - power * 0.3);
    var finalX = CX + curveAmt * CURVE_SCALE + wind * CURVE_SCALE * 0.5;
    ball = { t: 0, dur: dur, foul: foul, finalX: finalX, x: CX, y: LAUNCH_Y, warned: false };
    phase = 'flight';
    game.audio.play('se_jump', 0.5);
  }
  function updateBall(dt) {
    if (!ball) return;
    ball.t += dt;
    var frac = Math.min(1, ball.t / ball.dur);
    if (ball.foul) {
      ball.x = CX;
      ball.y = LAUNCH_Y - (LAUNCH_Y - ROWS[0].y) * 0.32 * frac;
    } else {
      ball.x = CX + (ball.finalX - CX) * (frac * frac);
      ball.y = LAUNCH_Y + (ROWS[0].y - LAUNCH_Y) * frac;
      var remaining = ball.dur - ball.t;
      if (!ball.warned && remaining <= 0.55 && Math.abs(ball.finalX - CX) > LANE_HALF) {
        ball.warned = true;
        game.audio.tone(180, 0.12, { wave: 'square', volume: 0.18, slide: -60 });
      }
    }
    if (ball.t >= ball.dur) resolveThrow();
  }
  function resolveThrow() {
    var knocked = 0;
    var strike = false;
    if (ball.foul) {
      resultText = 'FOUL'; resultTextT = 1.0;
      game.feedback.bad(CX, LAUNCH_Y - 200, { text: 'FOUL' });
      shake = 0.18; hitStop = 0.12;
    } else if (Math.abs(ball.finalX - CX) > LANE_HALF) {
      resultText = 'GUTTER'; resultTextT = 1.0;
      game.feedback.bad(ball.finalX, ROWS[0].y, { text: 'GUTTER' });
      shake = 0.2; hitStop = 0.15;
    } else if (Math.abs(ball.finalX - CX) < 42) {
      for (var i = 0; i < PIN_DEFS.length; i++) { pinsAlive[i] = false; }
      knocked = PIN_DEFS.length; strike = true;
      resultText = 'STRIKE'; resultTextT = 1.0;
      game.fx.burst(CX, ROWS[2].y, { color: C.gold, count: 26, speed: 420 });
      game.feedback.good(CX, ROWS[2].y, { text: 'STRIKE', color: C.gold });
      shake = 0.22; hitStop = 0.2;
      game.fx.popup('STRIKE!', CX, ROWS[2].y - 80, { color: C.gold, size: 56 });
      game.audio.play('se_milestone', 0.6);
    } else {
      for (var j = 0; j < PIN_DEFS.length; j++) {
        if (Math.abs(PIN_DEFS[j].x - ball.finalX) <= HIT_RADIUS) { pinsAlive[j] = false; knocked++; }
      }
      resultText = knocked + ' PINS'; resultTextT = 1.0;
      if (knocked > 0) {
        game.feedback.good(ball.finalX, ROWS[1].y, { text: knocked + ' PINS', color: C.good });
        game.fx.burst(ball.finalX, ROWS[1].y, { color: C.white, count: 12, speed: 320 });
        hitStop = 0.12;
      } else {
        game.feedback.bad(ball.finalX, ROWS[1].y, { text: 'MISS' });
        hitStop = 0.1;
      }
    }
    totalScore += knocked;
    ball = null; phase = 'settle';
    if (throwIdx === 1 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('SUBTOTAL ' + totalScore, CX, H * 0.16, { color: C.white, size: 40 });
      game.audio.play('se_milestone', 0.35);
    }
  }
  function afterSettle() {
    throwIdx++;
    if (throwIdx >= THROWS_TOTAL) {
      ok = totalScore >= TOTAL_TARGET;
      finish();
    } else {
      startThrow();
    }
  }

  function tapInput(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; throwIdx = 0; startThrow(); demo.t = 0; demo.press = false; return; }
  }
  game.onTap(function(x, y) { game.audio.play('se_tap', 0.1); tapInput(x, y); });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    game.audio.play('se_tap', 0.15);
    beginCharge(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    moveCharge(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_jump', 0.4);
    releaseCharge(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: 本編と同じ beginCharge/moveCharge/releaseCharge/updateBall を使う ──
  var demo = { t: 0, gx: CX, gy: LAUNCH_Y, press: false, sub: 'wait', subT: 0.6, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.subT -= dt;
    if (phase === undefined) { throwIdx = 0; startThrow(); }
    if (demo.sub === 'wait' && demo.subT <= 0) {
      startThrow();
      demo.sub = 'approach'; demo.subT = 0.35; demo.gx = CX; demo.gy = LAUNCH_Y + 120;
    } else if (demo.sub === 'approach') {
      demo.gy = LAUNCH_Y + 120 * (demo.subT / 0.35);
      demo.press = false;
      if (demo.subT <= 0) { beginCharge(CX, LAUNCH_Y); demo.sub = 'drag'; demo.subT = 0.5; demo.gx = CX; demo.gy = LAUNCH_Y; }
    } else if (demo.sub === 'drag') {
      var goodShot = demo.cycle % 2 === 0;
      var tx = goodShot ? CX + 6 : CX - 320;
      var ty = LAUNCH_Y - 260;
      var f = 1 - Math.max(0, demo.subT / 0.5);
      demo.gx = CX + (tx - CX) * f; demo.gy = LAUNCH_Y + (ty - LAUNCH_Y) * f;
      demo.press = true;
      moveCharge(demo.gx, demo.gy);
      if (demo.subT <= 0) { releaseCharge(demo.gx, demo.gy); demo.sub = 'flight'; demo.subT = 1.3; demo.press = false; }
    } else if (demo.sub === 'flight') {
      updateBall(dt);
      if (phase === 'settle') { demo.sub = 'hold'; demo.subT = 0.9; }
      if (demo.subT <= 0) { demo.sub = 'hold'; demo.subT = 0.1; }
    } else if (demo.sub === 'hold') {
      if (demo.subT <= 0) { demo.cycle++; demo.sub = 'wait'; demo.subT = 0.7; }
    }
  }

  function laneBg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [0.55, '#0a1626'], [1, C.bgBot]]);
    game.draw.rect(CX - LANE_HALF - 40, H * 0.18, (LANE_HALF + 40) * 2, H * 0.62, C.laneEdge);
    game.draw.rect(CX - LANE_HALF, H * 0.18, LANE_HALF * 2, H * 0.62, C.lane);
    for (var i = 0; i < 6; i++) {
      var yy = H * 0.18 + (H * 0.62) * (i / 6);
      var wscale = 1 - i / 9;
      game.draw.rect(CX - LANE_HALF * wscale, yy, LANE_HALF * 2 * wscale, 3, '#00000022');
    }
  }

  function drawWindFlag() {
    var wx = CX + 340;
    var wy = H * 0.20;
    game.draw.circle(wx, wy, 34, '#00000055');
    var ang = wind * 60;
    var ex = wx + Math.sin(ang * Math.PI / 180) * 26;
    var ey = wy - Math.cos(ang * Math.PI / 180) * 26 * (wind === 0 ? 0 : 1) - (wind === 0 ? 26 : 0);
    game.draw.line(wx, wy, wind === 0 ? wx : ex, wind === 0 ? wy - 26 : ey, C.white, 5);
    txt('WIND', wx, wy + 54, 20, C.white);
  }

  function drawPins() {
    for (var i = 0; i < PIN_DEFS.length; i++) {
      if (!pinsAlive[i]) continue;
      var p = PIN_DEFS[i];
      var bob = Math.sin(game.time.elapsed * 3 + i) * 2;
      game.draw.circle(p.x, p.y + p.scale * 3.6, p.scale * 1.3, '#00000040');
      game.draw.sprite(PIN_SPRITE, PIN_PAL, p.x, p.y + bob, p.scale, { anchor: 'center' });
    }
  }

  function drawBall(bx, by, depthScale) {
    game.draw.circle(bx, by + 10, 30 * depthScale, '#00000050');
    var f = Math.floor(game.time.elapsed * 10) % 2;
    game.draw.sprite(BALL_F[f], BALL_PAL, bx, by, 9 * depthScale, { anchor: 'center' });
  }

  function drawCharge() {
    if (phase !== 'charging' || !charge) return;
    var dx = charge.x - charge.x0;
    var dy = charge.y0 - charge.y;
    var previewCurve = Math.max(-1.6, Math.min(1.6, dx / 150));
    var previewPower = Math.max(0.15, Math.min(1.6, dy / 340));
    var previewX = CX + previewCurve * CURVE_SCALE + wind * CURVE_SCALE * 0.5;
    game.draw.line(charge.x0, charge.y0, charge.x, charge.y, C.gold, 6);
    game.draw.line(CX, LAUNCH_Y, previewX, ROWS[0].y, previewPower < MIN_POWER ? C.bad : '#ffffff55', 3);
    game.draw.circle(previewX, ROWS[0].y, 20, Math.abs(previewX - CX) > LANE_HALF ? C.bad : C.good, 0.6);
  }

  function drawFlightWarn() {
    if (phase !== 'flight' || !ball || ball.foul) return;
    if (ball.warned) {
      var side = ball.finalX > CX ? 1 : -1;
      var flash = Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (flash) game.draw.rect(side > 0 ? W - 36 : 0, H * 0.18, 36, H * 0.62, C.bad, 0.6);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      laneBg();
      stepDemo(dt);
      drawPins();
      if (phase === 'flight' && ball) drawFlightWarn();
      drawWindFlag();
      if (phase === 'flight' && ball) drawBall(ball.x, ball.y, 0.5 + 0.5 * (ball.y - ROWS[0].y) / (LAUNCH_Y - ROWS[0].y));
      else drawBall(CX, LAUNCH_Y, 1);
      if (demo.sub === 'drag') drawCharge();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      if (resultTextT > 0) { txt(resultText, CX, H * 0.44, 46, resultText.indexOf('GUTTER') >= 0 || resultText === 'FOUL' ? C.bad : C.gold); }
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.94, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      laneBg(); drawPins(); drawBall(CX, LAUNCH_Y, 1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 52, ok ? C.good : C.bad);
      txt('SCORE ' + totalScore + ' / ' + TOTAL_TARGET, W / 2, H * 0.13, 32, C.white);
      txt('BEST ' + Math.max(game.best, totalScore), W / 2, H * 0.17, 26, C.gold);
      if (!ok && totalScore >= TOTAL_TARGET - 3) txt('あと' + (TOTAL_TARGET - totalScore) + '本!', W / 2, H * 0.21, 26, C.white);
      if (totalScore > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.24, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pins: totalScore, target: TOTAL_TARGET };
        if (ok) game.end.success(totalScore, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      if (phase === 'flight') updateBall(dt);
      else if (phase === 'settle') {
        resultTextT -= dt;
        if (resultTextT <= 0.15) { afterSettle(); }
      }
    }
    if (shake > 0) shake -= dt;

    laneBg();
    drawPins();
    if (phase === 'flight' && ball) {
      drawFlightWarn();
      drawBall(ball.x, ball.y, 0.5 + 0.5 * (ball.y - ROWS[0].y) / (LAUNCH_Y - ROWS[0].y));
    } else {
      drawBall(CX, LAUNCH_Y, 1);
    }
    drawWindFlag();
    if (phase === 'charging') drawCharge();
    if (resultTextT > 0 && phase === 'settle') {
      txt(resultText, CX, H * 0.44, 48, resultText.indexOf('GUTTER') >= 0 || resultText === 'FOUL' ? C.bad : (resultText === 'STRIKE' ? C.gold : C.good));
    }

    txt('THROW ' + (throwIdx + 1) + ' / ' + THROWS_TOTAL, W / 2, H * 0.06, 30, C.white);
    txt(totalScore + ' PINS', W / 2, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['R', 0.5],
      ['C4', 0.5], ['E4', 0.5], ['A4', 1],
    ], { tempo: 118, wave: 'triangle', volume: 0.07, loop: true, bass: [['C3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    throwIdx = 0;
    startThrow();
  });
})(game);
