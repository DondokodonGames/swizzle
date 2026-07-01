// 115-maze-runner.js
// 迷宮脱出 — 壁に触れずスワイプでゴールへたどり着く集中力ゲーム
// 操作: スワイプで上下左右に1マス移動
// 成功: ゴールに到達  失敗: 壁に触れる or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'MAZE RUNNER';
  var HOW_TO_PLAY = 'SWIPE TO REACH THE EXIT';
  var MAX_TIME = 30;
  // 修正2: 迷路を簡素化（7x9・明快な一本道）
  var COLS = 7, ROWS = 9;
  var MAZE = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 3, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 2, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ];
  var CELL = Math.floor(Math.min(W / (COLS + 1), (H * 0.6) / ROWS));
  var MAZE_W = COLS * CELL, MAZE_H = ROWS * CELL, MAZE_X = (W - MAZE_W) / 2, MAZE_Y = H * 0.26;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var px, py, trail, timeLeft, done, deathFlash, winFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(cx + xx, cy + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { px = 1; py = 1; trail = [{ x: 1, y: 1 }]; timeLeft = MAX_TIME; done = false; deathFlash = 0; winFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, 700);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryMove(dc, dr) {
    var nx = px + dc, ny = py + dr;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    var cell = MAZE[ny][nx];
    if (cell === 1) { deathFlash = 0.6; finish(false); return; }
    px = nx; py = ny; trail.push({ x: px, y: py }); if (trail.length > 20) trail.shift(); game.audio.play('se_tap', 0.4);
    if (cell === 2) { winFlash = 0.8; finish(true); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') tryMove(0, -1); if (dir === 'down') tryMove(0, 1); if (dir === 'left') tryMove(-1, 0); if (dir === 'right') tryMove(1, 0);
  });

  // 世界観: 電子迷宮。壁に触れずゴール端子までスワイプで脱出する。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(snap(MAZE_X) - 12, snap(MAZE_Y) - 12, MAZE_W + 24, MAZE_H + 24, '#001133');
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.e, deathFlash * 0.35);
    if (winFlash > 0) game.draw.rect(0, 0, W, H, C.f, winFlash * 0.3);
    txt('CYBER MAZE', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var row = 0; row < ROWS; row++) for (var col = 0; col < COLS; col++) {
      var cell = MAZE[row][col], cx = MAZE_X + col * CELL, cy = MAZE_Y + row * CELL;
      if (cell === 1) { game.draw.rect(snap(cx), snap(cy), CELL, CELL, C.a); game.draw.rect(snap(cx), snap(cy), CELL, 4, C.b); }
      else if (cell === 2) { game.draw.rect(snap(cx), snap(cy), CELL, CELL, '#001a00'); drawPixelCircle(cx + CELL / 2, cy + CELL / 2, CELL * 0.3, Math.floor(game.time.elapsed * 6) % 2 ? C.f : '#006600', 1); }
      else game.draw.rect(snap(cx), snap(cy), CELL, CELL, '#000822');
    }
    for (var ti = 0; ti < trail.length; ti++) { var tf = ti / trail.length; drawPixelCircle(MAZE_X + trail[ti].x * CELL + CELL / 2, MAZE_Y + trail[ti].y * CELL + CELL / 2, CELL * 0.14 * tf, C.d, tf * 0.4); }
    drawPixelCircle(MAZE_X + px * CELL + CELL / 2, MAZE_Y + py * CELL + CELL / 2, CELL * 0.3, C.d, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (px === undefined) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'GAME OVER', W / 2, H * 0.35, 84, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (deathFlash > 0) deathFlash -= dt;
      if (winFlash > 0) winFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('FIND THE EXIT', W / 2, 96, 44, C.c);
    txt('SWIPE TO MOVE!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
