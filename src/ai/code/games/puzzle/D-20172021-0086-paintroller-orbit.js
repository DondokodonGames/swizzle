// D-20172021-0086-paintroller-orbit.js
// ペイントローラー・オービット — 指に追従する塗装ボールを転がし、床の全マスを塗りつぶす
// 操作: 塗装ボールを指でドラッグして誘導し、通った床マスを塗っていく。全マス塗り終えるまで指を離さない
// 終わり: 制限時間内に全マスを塗りきれば成功。時間切れで未塗装マスが残れば失敗
// @mechanic: drag_follow
// @theme: workshop_paint_ball_coverage
// 世界観: 工房の床塗り職人見習いが、転がる塗装ボールを指先で誘導し、制限時間内に作業床の全マスを一色に塗り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 塗り終えたマス数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: くっきりした中彩度カラー、細い黒縁、ディザ無し
  var C = {
    bg: '#3a2a1e', bg2: '#241a12', floor: '#5a4230', floorDone: '#ff8a3d',
    grid: '#2a1c12', ball: '#ffd23d', ballDark: '#c98a10',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffd23d', ink: '#1a1108', white: '#fff4e0',
  };

  var GAME_TITLE = 'PAINT ORBIT';
  var COLS = 4, ROWS = 5;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.44, CELL = 170;
  var TIME_LIMIT = 18;
  var BALL_R = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff8a3d', pulse * 0.4);
    game.draw.sprite(WORKER_SPRITE, { '#': C.gold }, W * 0.14, H * 0.84, 12, { anchor: 'center' });
  }

  function cellPos(cx, cy) {
    return { x: BOARD_X + (cx - (COLS - 1) / 2) * CELL, y: BOARD_Y + (cy - (ROWS - 1) / 2) * CELL };
  }

  var painted, ballX, ballY, targetX, targetY, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, paintedCount, halfCalled;

  function initGame() {
    painted = new Array(COLS * ROWS).fill(false);
    var start = cellPos(0, 0);
    ballX = start.x; ballY = start.y; targetX = ballX; targetY = ballY;
    paintCell(0, 0);
    timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; paintedCount = 1; halfCalled = false;
  }

  function cellAt(px, py) {
    var cx = Math.round((px - BOARD_X) / CELL + (COLS - 1) / 2);
    var cy = Math.round((py - BOARD_Y) / CELL + (ROWS - 1) / 2);
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return -1;
    return cy * COLS + cx;
  }

  function paintCell(cx, cy) {
    var i = cy * COLS + cx;
    if (i >= 0 && i < painted.length && !painted[i]) painted[i] = true;
  }

  function drawBoard() {
    for (var cy = 0; cy < ROWS; cy++) {
      for (var cx = 0; cx < COLS; cx++) {
        var p = cellPos(cx, cy);
        var i = cy * COLS + cx;
        game.draw.rect(p.x - CELL / 2 + 5, p.y - CELL / 2 + 5, CELL - 10, CELL - 10, painted[i] ? C.floorDone : C.floor);
        game.draw.rect(p.x - CELL / 2 + 5, p.y - CELL / 2 + 5, CELL - 10, 5, C.grid, 0.4);
      }
    }
  }

  function drawBall(x, y) {
    game.draw.circle(x, y + 10, BALL_R * 0.7, '#000000', 0.2);
    game.draw.circle(x, y, BALL_R, C.ball);
    game.draw.circle(x, y, BALL_R, C.ballDark, 0.25);
  }

  function tryPaint(x, y) {
    var cx = Math.round((x - BOARD_X) / CELL + (COLS - 1) / 2);
    var cy = Math.round((y - BOARD_Y) / CELL + (ROWS - 1) / 2);
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return;
    var i = cy * COLS + cx;
    if (!painted[i]) {
      painted[i] = true;
      paintedCount++;
      game.feedback.good(x, y, { text: '', color: C.good, count: 6 });
      game.audio.play('se_tap', 0.12);
      if (!halfCalled && paintedCount >= Math.ceil(COLS * ROWS * 0.5)) {
        halfCalled = true;
        game.fx.popup('HALFWAY!', BOARD_X, BOARD_Y - 260, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (paintedCount >= COLS * ROWS) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(x, y, { color: C.gold, count: 24, speed: 400 });
        finish();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    targetX = x; targetY = y;
    game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    targetX = x; targetY = y;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: true, path: [], idx: 0 };
  function buildDemoPath() {
    var path = [];
    for (var cy = 0; cy < ROWS; cy++) {
      if (cy % 2 === 0) { for (var cx = 0; cx < COLS; cx++) path.push([cx, cy]); }
      else { for (var cx2 = COLS - 1; cx2 >= 0; cx2--) path.push([cx2, cy]); }
    }
    demo.path = path;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); buildDemoPath(); demo.idx = 0; }
    var segDur = 4.0 / demo.path.length;
    var idx = Math.min(demo.path.length - 1, Math.floor(cyc / segDur));
    var cell = demo.path[idx];
    var p = cellPos(cell[0], cell[1]);
    ballX += (p.x - ballX) * Math.min(1, dt * 9);
    ballY += (p.y - ballY) * Math.min(1, dt * 9);
    demo.gx = ballX; demo.gy = ballY; demo.press = true;
    if (idx !== demo.idx) { demo.idx = idx; }
    var ci = cell[1] * COLS + cell[0];
    if (!painted[ci] && Math.hypot(ballX - p.x, ballY - p.y) < 20) {
      painted[ci] = true; paintedCount++;
      game.audio.play('se_tap', 0.06);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (painted === undefined) { initGame(); buildDemoPath(); }
      bg();
      stepDemo(dt);
      drawBoard();
      drawBall(ballX, ballY);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      drawBall(ballX, ballY);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(paintedCount + ' / ' + (COLS * ROWS), W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (COLS * ROWS - paintedCount) + 'マス!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(paintedCount, { cells: paintedCount, total: COLS * ROWS });
        else game.end.failure({ cells: paintedCount, total: COLS * ROWS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ballX += (targetX - ballX) * Math.min(1, dt * 7);
      ballY += (targetY - ballY) * Math.min(1, dt * 7);
      ballX = Math.max(BOARD_X - COLS * CELL / 2 + 20, Math.min(BOARD_X + COLS * CELL / 2 - 20, ballX));
      ballY = Math.max(BOARD_Y - ROWS * CELL / 2 + 20, Math.min(BOARD_Y + ROWS * CELL / 2 - 20, ballY));
      tryPaint(ballX, ballY);
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(ballX, ballY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();
    if (!finished) drawBall(ballX, ballY);

    txt(paintedCount + ' / ' + (COLS * ROWS), W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#241a12', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
    buildDemoPath();
  });
})(game);
