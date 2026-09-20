// I-GBA-0053-tilt-tray-hole.js
// ティルトトレイホール — 指でトレイを傾けてボールを転がし、時間内に穴へ落とす
// 操作: 指で押さえたままドラッグしてトレイを傾け、ボールを穴まで転がす
// 終わり: 時間内にボールを穴へ入れれば成功。トレイの縁から落ちる/時間切れで失敗
// @mechanic: balance
// @theme: pseudo3d_tilt_tray
// 世界観: 奥行きを感じさせる疑似3Dの木製トレイ。指でトレイの傾きを操り、転がる小さな球を縁から落とさず穴へ導く職人芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 穴までの到達度%
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 収束する水平ラインで疑似3D床、楕円圧縮でパース感
  var C = {
    bg: '#1a2438', bg2: '#0c121e', tray: '#c89050', trayDark: '#8a5c2c', trayLine: '#e0b070',
    ball: '#f4f4f4', ballShade: '#c0c0c0', hole: '#0a0a0a', holeRim: '#2a1a10',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd23f', white: '#f0e8d8', ink: '#0a0806',
  };

  var GAME_TITLE = 'TILT TRAY';
  var CX = W * 0.5, CY = H * 0.46;
  var RX = 400, RY = 270;
  var HOLE_X = CX + 140, HOLE_Y = CY + 90, HOLE_R = 46;
  var TIME_LIMIT = 20.0;
  var TILT_RANGE = 240;
  var ACC = 1400;
  var FRICTION = 0.988;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BALL_SPR = ['.##.', '####', '####', '.##.'];

  var ballX, ballY, velX, velY, tiltX, tiltY, holding, anchorX, anchorY, timeLeft;
  var bestDist, startDist;
  var done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  function initGame() {
    ballX = CX - 220; ballY = CY - 120; velX = 0; velY = 0; tiltX = 0; tiltY = 0;
    holding = false; anchorX = 0; anchorY = 0; timeLeft = TIME_LIMIT;
    startDist = Math.hypot(ballX - HOLE_X, ballY - HOLE_Y);
    bestDist = startDist;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 12; i++) {
      var p = i / 12;
      game.draw.line(W * 0.5 * (1 - p), H * 0.9, W * (0.5 + 0.5 * p), H * 0.9, '#ffffff05', 2);
    }
  }

  function edgeDist(x, y) {
    var dx = (x - CX) / RX, dy = (y - CY) / RY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function drawTray(warnEdge) {
    for (var i = 10; i >= 0; i--) {
      var s = i / 10;
      game.draw.circle(CX + tiltX * 10, CY + tiltY * 8, RX * s, i % 2 === 0 ? C.tray : C.trayDark, 0.06);
    }
    game.draw.circle(CX + tiltX * 10, CY + tiltY * 8, RX, C.trayLine, 0.5);
    // 穴
    game.draw.circle(HOLE_X + tiltX * 10, HOLE_Y + tiltY * 8, HOLE_R + 10, C.holeRim);
    game.draw.circle(HOLE_X + tiltX * 10, HOLE_Y + tiltY * 8, HOLE_R, C.hole);
    if (warnEdge) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX + tiltX * 10, CY + tiltY * 8, RX, C.bad, 0.25);
    }
  }

  function drawBall(x, y) {
    game.draw.circle(x, y + 10, 22, C.ink, 0.25);
    game.draw.sprite(BALL_SPR, { '#': C.ball }, x, y, 8, { anchor: 'center' });
  }

  function physicsStep(dt) {
    velX += tiltX * ACC * dt;
    velY += tiltY * ACC * dt;
    velX *= FRICTION; velY *= FRICTION;
    ballX += velX * dt; ballY += velY * dt;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holding = true; anchorX = x; anchorY = y;
    game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (!holding || state !== S.PLAYING) return;
    var dx = x - anchorX, dy = y - anchorY;
    tiltX = Math.max(-1, Math.min(1, dx / TILT_RANGE));
    tiltY = Math.max(-1, Math.min(1, dy / TILT_RANGE));
  });
  game.onRelease(function(x, y) {
    if (holding) {
      holding = false;
      game.fx.burst(x, y, { color: C.trayLine, count: 4, speed: 60 });
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var p = Math.min(1, cyc / 3.6);
    tiltX = Math.sin(p * Math.PI) * 0.7;
    tiltY = Math.sin(p * Math.PI * 0.6) * 0.5;
    demo.gx = CX - 220 + tiltX * TILT_RANGE;
    demo.gy = CY - 120 + tiltY * TILT_RANGE;
    demo.press = true;
    physicsStep(dt);
    var d = Math.hypot(ballX - HOLE_X, ballY - HOLE_Y);
    if (d < HOLE_R) { ballX = HOLE_X; ballY = HOLE_Y; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballX === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTray(false);
      drawBall(ballX, ballY);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTray(false);
      drawBall(ballX, ballY);
      var pct = Math.round((1 - Math.min(1, bestDist / startDist)) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.round((1 - Math.min(1, bestDist / startDist)) * 100);
        if (ok) game.end.success(pctF, { pct: pctF }); else game.end.failure({ pct: pctF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      physicsStep(dt);
      var dHole = Math.hypot(ballX - HOLE_X, ballY - HOLE_Y);
      if (dHole < bestDist) {
        bestDist = dHole;
        var pctNow = 1 - bestDist / startDist;
        if (!halfShown && pctNow >= 0.5) {
          halfShown = true;
          game.fx.popup('HALFWAY!', CX, CY - RY - 20, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.4);
        }
      }
      if (dHole < HOLE_R) {
        ok = true; finished = true; hitStop = 0.12; bestDist = 0;
        game.feedback.good(HOLE_X, HOLE_Y, { text: 'IN!', color: C.good });
        game.audio.play('se_success', 0.4);
        finish();
      } else if (edgeDist(ballX, ballY) > 1.0) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(ballX, ballY, { text: 'FELL' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          ok = false; finished = true; hitStop = 0.3; shake = 0.2;
          game.feedback.bad(ballX, ballY, { text: 'TIME UP' });
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var warnEdge = !finished && edgeDist(ballX, ballY) > 0.82;
    drawTray(warnEdge);
    if (!finished) drawBall(ballX, ballY);

    var pctH = Math.round((1 - Math.min(1, Math.hypot(ballX - HOLE_X, ballY - HOLE_Y) / startDist)) * 100);
    txt(Math.max(0, pctH) + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.4], ['A3', 0.4], ['C4', 0.4], ['A3', 0.4]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
