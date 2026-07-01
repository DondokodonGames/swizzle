// 065-escape-maze.js
// エスケープメイズ — シンプルな迷路を最短ルートで脱出する
// 操作: スワイプで移動
// 成功: ゴールに到達  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'ESCAPE MAZE';
  var HOW_TO_PLAY = 'SWIPE TO REACH THE EXIT';
  var MAX_TIME = 25;
  var COLS = 7, ROWS = 9, CELL = 140;   // 修正2: 9x12 → 7x9 で短縮
  var MAZE_X = (W - COLS * CELL) / 2, MAZE_Y = (H - ROWS * CELL) / 2 + 40;   // 修正1: 縦中央

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var maze, playerCol, playerRow, trail, timeLeft, done, bumpFlash;
  var goalCol = COLS - 1, goalRow = ROWS - 1;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
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

  function buildMaze() {
    maze = []; for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(1); maze.push(row); }
    var visited = []; for (var r2 = 0; r2 < ROWS; r2++) { var vr = []; for (var c2 = 0; c2 < COLS; c2++) vr.push(false); visited.push(vr); }
    function carve(r, c) {
      visited[r][c] = true; maze[r][c] = 0;
      var dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
      for (var s = dirs.length - 1; s > 0; s--) { var ri = Math.floor(Math.random() * (s + 1)); var t = dirs[s]; dirs[s] = dirs[ri]; dirs[ri] = t; }
      for (var d = 0; d < dirs.length; d++) { var nr = r + dirs[d][0], nc = c + dirs[d][1]; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) { maze[r + dirs[d][0] / 2][c + dirs[d][1] / 2] = 0; carve(nr, nc); } }
    }
    carve(0, 0); maze[0][0] = 0; maze[ROWS - 1][COLS - 1] = 0;
  }
  function initGame() { buildMaze(); playerCol = 0; playerRow = 0; trail = []; timeLeft = MAX_TIME; done = false; bumpFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 30) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryMove(dr, dc) {
    var nr = playerRow + dr, nc = playerCol + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || maze[nr][nc] === 1) { bumpFlash = 0.1; game.audio.play('se_failure', 0.2); return; }
    trail.push({ r: playerRow, c: playerCol }); if (trail.length > 20) trail.shift();
    playerRow = nr; playerCol = nc; game.audio.play('se_tap', 0.3);
    if (playerRow === goalRow && playerCol === goalCol) finish(true);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') tryMove(-1, 0); else if (dir === 'down') tryMove(1, 0);
    else if (dir === 'left') tryMove(0, -1); else if (dir === 'right') tryMove(0, 1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: 地下迷宮からの脱出。壁を避けてGOAL(出口)へ最短で辿り着く。
  function background() {
    game.draw.clear('#0a0018');
    txt('LABYRINTH', W / 2, MAZE_Y - 60, 34, C.b);
  }

  function drawMaze() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = MAZE_X + c * CELL, gy = MAZE_Y + r * CELL;
      if (maze[r][c] === 1) { game.draw.rect(gx, gy, CELL, CELL, C.d); game.draw.rect(gx + 4, gy + 4, CELL - 8, 8, C.a, 0.3); }
      else game.draw.rect(gx, gy, CELL, CELL, '#05000f');
    }
    for (var t = 0; t < trail.length; t++) { var tc = trail[t]; game.draw.rect(MAZE_X + tc.c * CELL + CELL / 2 - 12, MAZE_Y + tc.r * CELL + CELL / 2 - 12, 24, 24, C.d, (t / trail.length) * 0.5); }
    var gx2 = MAZE_X + goalCol * CELL, gy2 = MAZE_Y + goalRow * CELL;
    game.draw.rect(gx2 + 12, gy2 + 12, CELL - 24, CELL - 24, C.b, 0.5 + 0.3 * Math.sin(game.time.elapsed * 5)); txt('G', gx2 + CELL / 2, gy2 + CELL / 2, 56, C.g);
    var px = MAZE_X + playerCol * CELL + CELL / 2, py = MAZE_Y + playerRow * CELL + CELL / 2;
    if (bumpFlash > 0) drawPixelCircle(px, py, CELL * 0.4, C.a, bumpFlash / 0.1 * 0.5);
    drawPixelCircle(px, py, CELL * 0.32, C.f, 1); game.draw.rect(snap(px) - 12, snap(py) - 12, 12, 12, C.g);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!maze) initGame();
      background();
      drawMaze();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (bumpFlash > 0) bumpFlash -= dt;
    }

    // ---- draw ----
    background();
    drawMaze();
    timeBar();
    txt('REACH THE EXIT!', W / 2, 96, 44, C.b);
    txt('SWIPE TO MOVE!', W / 2, H - 100, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
