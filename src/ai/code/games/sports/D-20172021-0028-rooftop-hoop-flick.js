// D-20172021-0028-rooftop-hoop-flick.js
// ルーフトップ・フープフリック — 指先でボールを弾き、放物線を描かせてリングへ次々と沈める
// 操作: 画面下のボールに触れて弾きたい方向へ素早く指を払う(フリック)。放たれた勢いでボールが飛ぶ
// 終わり: 3回連続でリングに沈めれば成功。リングを外すと即座に失敗
// @mechanic: flick_launch
// @theme: rooftop_hoop_flick
// 世界観: 屋上の即席コートで、独りきりのフリースタイル挑戦者がボールを指で弾いてリングへ沈め続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 沈めた本数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景 + 単色、柔らかい影の丸い塊、当たり判定が見た目どおり
  var C = {
    bg: '#f5f7fb', bg2: '#e6ebf5', shadow: '#00000022',
    rim: '#ff5a3c', rimDark: '#c8391f', board: '#dfe4ee', boardEdge: '#b8c0d4',
    ball: '#ffb23c', ballLite: '#ffffff',
    good: '#38c98a', bad: '#ff4d5e', gold: '#ff5a3c', ink: '#20263a',
  };

  var GAME_TITLE = 'HOOP FLICK';
  var TIME_LIMIT = 13;
  var NEEDED = 3;
  var G = 2600;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BALL_SPRITE = ['.###.', '#o#o#', '#####', '#####', '.###.'];

  var LAUNCH_X = W * 0.5, LAUNCH_Y = H * 0.80;
  var HOOP_X = W * 0.5, HOOP_Y = H * 0.30, HOOP_R = 90;

  var ballX, ballY, vx, vy, flying, dragging, pressX, pressY, pressT;
  var round, done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#20263a', pulse * 0.3);
  }

  function drawHoop() {
    game.draw.rect(HOOP_X - 140, HOOP_Y - 150, 280, 120, C.boardEdge);
    game.draw.rect(HOOP_X - 130, HOOP_Y - 140, 260, 100, C.board);
    game.draw.circle(HOOP_X, HOOP_Y, HOOP_R, C.rimDark);
    game.draw.circle(HOOP_X, HOOP_Y, HOOP_R - 16, C.bg);
    for (var n = -2; n <= 2; n++) {
      game.draw.line(HOOP_X + n * 30, HOOP_Y + HOOP_R - 20, HOOP_X + n * 14, HOOP_Y + HOOP_R + 90, C.rim, 5);
    }
  }

  function drawBall() {
    game.draw.circle(ballX, ballY + 30, 44, C.shadow);
    game.draw.sprite(BALL_SPRITE, { '#': C.ball, o: C.ballLite }, ballX, ballY, 12, { anchor: 'center' });
  }

  function resetBall() {
    ballX = LAUNCH_X; ballY = LAUNCH_Y; vx = 0; vy = 0; flying = false; dragging = false;
  }

  function initGame() {
    round = 0; halfCalled = false;
    resetBall();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function launch(x, y) {
    var dt2 = Math.max(0.05, game.time.elapsed - pressT);
    var rawVx = (x - pressX) / dt2;
    var rawVy = (y - pressY) / dt2;
    var mag = Math.hypot(rawVx, rawVy);
    var cap = 3400;
    if (mag > cap) { rawVx = rawVx / mag * cap; rawVy = rawVy / mag * cap; }
    if (mag < 250) { rawVx = 0; rawVy = -900; } // weak/ambiguous flick: gentle default upward nudge
    vx = rawVx; vy = rawVy; flying = true;
    game.audio.play('se_jump', 0.3);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || flying) return;
    if (Math.hypot(x - ballX, y - ballY) < 110) {
      dragging = true; pressX = x; pressY = y; pressT = game.time.elapsed;
      game.audio.play('se_tap', 0.1);
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    ballX = x; ballY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    dragging = false;
    launch(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function updateFlight(dt) {
    if (!flying) return;
    vy += G * dt;
    ballX += vx * dt;
    ballY += vy * dt;
    var d = Math.hypot(ballX - HOOP_X, ballY - HOOP_Y);
    if (d < HOOP_R - 20 && vy > 0) {
      round++;
      flying = false;
      game.feedback.good(HOOP_X, HOOP_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(HOOP_X, HOOP_Y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_coin', 0.4);
      if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', HOOP_X, HOOP_Y - 140, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (round >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(HOOP_X, HOOP_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        resetBall();
      }
      return;
    }
    if (ballX < -80 || ballX > W + 80 || ballY > H + 80) {
      finished = true; ok = false; flying = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(Math.max(40, Math.min(W - 40, ballX)), Math.min(H - 40, ballY), { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: LAUNCH_X, gy: LAUNCH_Y, press: false, launched: false };
  function resetDemo() { initGame(); demo.launched = false; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 0.9) {
      var t2 = cyc / 0.9;
      demo.gx = LAUNCH_X; demo.gy = LAUNCH_Y - t2 * 40;
      demo.press = true;
      ballX = LAUNCH_X; ballY = LAUNCH_Y - t2 * 40; flying = false;
    } else {
      if (!demo.launched) {
        demo.launched = true;
        vx = (Math.random() - 0.5) * 120;
        vy = -1650;
        flying = true;
      }
      updateFlight(dt);
      demo.gx = ballX; demo.gy = ballY; demo.press = false;
      if (!flying && round < NEEDED) demo.launched = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballX === undefined) initGame();
      stepDemo(dt);
      bg();
      drawHoop();
      drawBall();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHoop();
      drawBall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(round + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - round) + '本!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { sunk: round, total: NEEDED });
        else game.end.failure({ sunk: round, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      updateFlight(dt);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(ballX, ballY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHoop();
    drawBall();

    txt(round + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.boardEdge, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
