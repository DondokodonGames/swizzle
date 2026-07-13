// 221-neon-snake.js
// ネオンスネーク — 整備ボットが回路を這い、エネルギーセルを集めて伸びる
// 操作: スワイプで方向転換
// 成功: 制限時間内に 5 個集める  失敗: 壁か自分に当たる or 時間切れ
// @mechanic: guide_path
// @theme: robot
// 世界観: ロボット工房の整備ボットが、配線を辿ってエネルギーセルを回収する
// variation: 物量型(集めるほど加速する)
// spice: フィーバータイム(2個集めると数秒だけ得点2倍)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO(限定パレット・高コントラスト)
  var C = {
    void: '#0b0f1a', grid: '#17324a', bot: '#ff6a3d', botDk: '#c93c1a',
    cell: '#ffe14d', spark: '#4df0ff', wall: '#2a5a7a', white: '#eaf6ff', red: '#ff3b5c', purple: '#b06bff',
  };

  var GAME_TITLE = 'NEON SNAKE';
  var MAX_TIME = 18;
  var NEEDED = 5;
  var COLS = 15, ROWS = 21;
  var CELL = Math.floor(W / COLS);
  var OX = Math.floor((W - COLS * CELL) / 2);
  var OY = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var snake, dir, nextDir, food, moveTimer, moveInt;
  var score, eaten, timeLeft, done, ready, fever, feedback, feedbackOk, hitStop;

  // ボットヘッド(顔つき)
  var HEAD = ['.OOOO.', 'OOOOOO', 'OEOOEO', 'OOOOOO', 'OKKKKO', '.OOOO.'];
  var HEAD_COL = { O: C.bot, E: C.spark, K: C.botDk };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#01040c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }
  function cx(col) { return OX + col * CELL + CELL / 2; }
  function cy(row) { return OY + row * CELL + CELL / 2; }

  function botBg() {
    game.draw.gradient(0, H, [[0, '#0c1424'], [1, '#05080f']]);
    // 盤の枠
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, C.wall);
    game.draw.rect(OX, OY, COLS * CELL, ROWS * CELL, C.void);
    for (var c = 0; c <= COLS; c++) game.draw.line(OX + c * CELL, OY, OX + c * CELL, OY + ROWS * CELL, C.grid, 1);
    for (var r = 0; r <= ROWS; r++) game.draw.line(OX, OY + r * CELL, OX + COLS * CELL, OY + r * CELL, C.grid, 1);
  }

  function placeFood() {
    var ok, tries = 0;
    do {
      ok = true; food = { col: Math.floor(Math.random() * COLS), row: Math.floor(Math.random() * ROWS) };
      for (var i = 0; i < snake.length; i++) if (snake[i].col === food.col && snake[i].row === food.row) ok = false;
    } while (!ok && tries++ < 60);
  }
  function initGame() {
    snake = [{ col: 3, row: 10 }, { col: 2, row: 10 }, { col: 1, row: 10 }];
    dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
    score = 0; eaten = 0; timeLeft = MAX_TIME; done = false; moveInt = 0.16; moveTimer = moveInt;
    ready = 0.8; fever = 0; feedback = 0; feedbackOk = false; hitStop = 0;
    placeFood();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function step() {
    dir = nextDir;
    var nh = { col: snake[0].col + dir.x, row: snake[0].row + dir.y };
    // telegraph: 壁/自分に当たる直前は onUpdate 側で赤枠予告
    if (nh.col < 0 || nh.col >= COLS || nh.row < 0 || nh.row >= ROWS) { hitCrash(nh); return; }
    for (var i = 0; i < snake.length - 1; i++) if (snake[i].col === nh.col && snake[i].row === nh.row) { hitCrash(nh); return; }
    snake.unshift(nh);
    if (nh.col === food.col && nh.row === food.row) {
      eaten++;
      var gain = fever > 0 ? 200 : 100; score += gain;
      feedback = 0.3; feedbackOk = true;
      game.feedback.good(cx(nh.col), cy(nh.row), { text: '+' + gain, color: C.cell });
      if (eaten === 2) { fever = 3.5; game.audio.play('se_milestone'); }
      moveInt = Math.max(0.08, moveInt - 0.012); // 物量型: 加速
      if (eaten >= NEEDED) { finish(true); return; }
      placeFood();
    } else {
      snake.pop();
    }
  }
  function hitCrash(nh) {
    hitStop = 0.45;
    game.feedback.bad(cx(Math.max(0, Math.min(COLS - 1, nh.col))), cy(Math.max(0, Math.min(ROWS - 1, nh.row))), { text: 'CRASH' });
    finish(false);
  }

  function turn(sd) {
    if (sd === 'up' && dir.y === 0) nextDir = { x: 0, y: -1 };
    else if (sd === 'down' && dir.y === 0) nextDir = { x: 0, y: 1 };
    else if (sd === 'left' && dir.x === 0) nextDir = { x: -1, y: 0 };
    else if (sd === 'right' && dir.x === 0) nextDir = { x: 1, y: 0 };
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(sd) { if (state === S.PLAYING && !done && ready <= 0) turn(sd); });

  function drawSnake(body, foodCell) {
    game.draw.circle(cx(foodCell.col), cy(foodCell.row), CELL * 0.42, C.cell, Math.floor(game.time.elapsed * 8) % 2 ? 1 : 0.6);
    game.draw.circle(cx(foodCell.col), cy(foodCell.row), CELL * 0.6, C.cell, 0.2);
    for (var i = body.length - 1; i >= 1; i--) {
      game.draw.rect(cx(body[i].col) - CELL * 0.4, cy(body[i].row) - CELL * 0.4, CELL * 0.8, CELL * 0.8, i % 2 ? C.spark : C.bot, 0.85);
    }
    game.draw.sprite(HEAD, HEAD_COL, cx(body[0].col), cy(body[0].row), Math.max(4, CELL / 6), { anchor: 'center' });
  }

  // ATTRACT ゴースト実演: ボットが自動でセルへ向かう
  var dbody = null, dfood = null, dtimer = 0, ddir = { x: 1, y: 0 };
  function stepDemo(dt) {
    if (!dbody) { dbody = [{ col: 3, row: 10 }, { col: 2, row: 10 }, { col: 1, row: 10 }]; dfood = { col: 9, row: 6 }; }
    dtimer += dt;
    if (dtimer < 0.16) return;
    dtimer = 0;
    var h = dbody[0], nd = ddir;
    if (h.col !== dfood.col && ddir.x === 0) nd = { x: h.col < dfood.col ? 1 : -1, y: 0 };
    else if (h.row !== dfood.row && ddir.y === 0) nd = { x: 0, y: h.row < dfood.row ? 1 : -1 };
    ddir = nd;
    var nh = { col: Math.max(0, Math.min(COLS - 1, h.col + ddir.x)), row: Math.max(0, Math.min(ROWS - 1, h.row + ddir.y)) };
    dbody.unshift(nh);
    if (nh.col === dfood.col && nh.row === dfood.row) {
      game.feedback.good(cx(nh.col), cy(nh.row), { text: '+100', color: C.cell });
      dfood = { col: Math.floor(Math.random() * COLS), row: Math.floor(Math.random() * ROWS) };
    } else dbody.pop();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      botBg(); stepDemo(dt); drawSnake(dbody, dfood);
      txt(GAME_TITLE, W / 2, H * 0.1, 82, C.cell);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.16, 40, C.spark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.bot);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      botBg();
      if (hitStop > 0) hitStop -= dt;
      drawSnake(snake, food);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 84, resultSuccess ? C.cell : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.2, 54, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.25, 40, C.spark);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 46, C.spark);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (fever > 0) fever -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        moveTimer -= dt;
        if (moveTimer <= 0) { moveTimer = moveInt; step(); if (done) return; }
      }
      if (feedback > 0) feedback -= dt;
    }

    botBg();
    drawSnake(snake, food);

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.purple : C.spark);
    game.draw.rect(60, 40, W - 120, 26, C.wall, 0.5);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.white);
    txt(eaten + ' / ' + NEEDED, W / 2, 168, 44, C.cell);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, OY - 40, 48, C.purple);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 92, C.cell);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['B4', 0.5], ['A4', 0.5], ['E4', 1],
       ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['E4', 1]],
      { tempo: 144, wave: 'square', volume: 0.08, loop: true,
        bass: [['E2', 1], ['E2', 1], ['C2', 1], ['D2', 1], ['G2', 1], ['E2', 1]], bassWave: 'sawtooth', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
