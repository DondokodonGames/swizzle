// 074-arrow-maze.js
// アローメイズ — 矢印パネルの向きを変え、信号パケットをゴール端子へ導く回路パズル
// 操作: タップで矢印の向きを回転してルートを作る
// 成功: パケットをゴールへ誘導  失敗: 場外落下 or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'ARROW MAZE';
  var HOW_TO_PLAY = 'TAP ARROWS TO ROUTE THE PACKET';
  var MAX_TIME = 30;
  var COLS = 5, ROWS = 6, CELL = 160;                 // 修正2: 7x9 → 5x6（易化）
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = 300;                                    // 修正1: 上部に配置、下部にUI

  var DIRS = ['up', 'right', 'down', 'left'];
  var DIR_VEC = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var grid, playerC, playerR, goalC, goalR, playerX, playerY, targetX, targetY, moveTimer, stepCount, timeLeft, done;
  var MOVE_INTERVAL = 0.4;

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

  function cellCenter(c, r) { return { x: GRID_X + c * CELL + CELL / 2, y: GRID_Y + r * CELL + CELL / 2 }; }

  // ドット絵の矢印パネル（8pxブロック）
  function drawArrow(cx, cy, dir, color) {
    cx = snap(cx); cy = snap(cy);
    var shaft = [[-8, -24, 16, 48]], head;
    if (dir === 'up')    head = [[-24, -24, 48, 8], [-16, -16, 32, 8], [-8, -8, 16, 8]];
    if (dir === 'down')  head = [[-24, 16, 48, 8], [-16, 8, 32, 8], [-8, 0, 16, 8]];
    if (dir === 'left')  { shaft = [[-24, -8, 48, 16]]; head = [[-24, -24, 8, 48], [-16, -16, 8, 32], [-8, -8, 8, 16]]; }
    if (dir === 'right') { shaft = [[-24, -8, 48, 16]]; head = [[16, -24, 8, 48], [8, -16, 8, 32], [0, -8, 8, 16]]; }
    var parts = shaft.concat(head);
    for (var i = 0; i < parts.length; i++) game.draw.rect(cx + parts[i][0], cy + parts[i][1], parts[i][2], parts[i][3], color);
  }

  function initGame() {
    grid = [];
    goalC = COLS - 1; goalR = ROWS - 1;
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        if (c === 0 && r === 0) row.push({ type: 'arrow', dir: 'right' });
        else if (c === goalC && r === goalR) row.push({ type: 'goal' });
        else if (Math.random() < 0.1) row.push({ type: 'wall' });
        else row.push({ type: 'arrow', dir: DIRS[Math.floor(Math.random() * 4)] });
      }
      grid.push(row);
    }
    playerC = 0; playerR = 0;
    var pos = cellCenter(0, 0);
    playerX = pos.x; playerY = pos.y; targetX = pos.x; targetY = pos.y;
    moveTimer = MOVE_INTERVAL; stepCount = 0; timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 20 + stepCount * 10) : stepCount * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - GRID_X) / CELL), r = Math.floor((y - GRID_Y) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var cell = grid[r][c];
    if (cell.type !== 'arrow') return;
    if (c === playerC && r === playerR) return;
    cell.dir = DIRS[(DIRS.indexOf(cell.dir) + 1) % 4];
    game.audio.play('se_tap', 0.4);
  });

  // 世界観: 回路基板。信号パケットを矢印ゲートの向きで誘導し出力端子へ届ける。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < 24; i++) { var lx = snap((i * 173) % W); game.draw.rect(lx, 0, 2, H, C.f, 0.06); }
    game.draw.rect(snap(GRID_X) - 16, snap(GRID_Y) - 16, COLS * CELL + 32, ROWS * CELL + 32, '#001a1a');
    txt('CIRCUIT ROUTER', W / 2, 250, 34, C.f);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = GRID_X + c * CELL, gy = GRID_Y + r * CELL, cell = grid[r][c], isPlayer = c === playerC && r === playerR;
        if (cell.type === 'wall') {
          game.draw.rect(snap(gx) + 8, snap(gy) + 8, CELL - 16, CELL - 16, '#332211');
          game.draw.rect(snap(gx) + 8, snap(gy) + 8, CELL - 16, 8, C.e, 0.5);
        } else if (cell.type === 'goal') {
          var lit = Math.floor(game.time.elapsed * 8) % 2 === 0;
          game.draw.rect(snap(gx) + 8, snap(gy) + 8, CELL - 16, CELL - 16, lit ? C.f : '#004400');
          txt('OUT', gx + CELL / 2, gy + CELL / 2, 40, '#001100');
        } else {
          game.draw.rect(snap(gx) + 8, snap(gy) + 8, CELL - 16, CELL - 16, '#001133');
          if (!isPlayer) drawArrow(gx + CELL / 2, gy + CELL / 2, cell.dir, C.b);
        }
      }
    }
    // パケット
    drawPixelCircle(playerX, playerY, 40, C.d, 1);
    drawPixelCircle(playerX, playerY, 20, C.c, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame();
      background();
      drawGrid();
      txt(GAME_TITLE,  W / 2, H * 0.1, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 68, C.g);
        txt('TAP TO START', W / 2, H * 0.88, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.93, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var dx = targetX - playerX, dy = targetY - playerY;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) { playerX = targetX; playerY = targetY; }
      else {
        var speed = CELL / MOVE_INTERVAL, norm = Math.abs(dx) + Math.abs(dy) + 1;
        playerX += (dx / norm) * speed * dt * 2; playerY += (dy / norm) * speed * dt * 2;
      }
      moveTimer -= dt;
      if (moveTimer <= 0) {
        moveTimer = MOVE_INTERVAL;
        var cell = grid[playerR][playerC];
        if (cell.type === 'goal') { finish(true); return; }
        if (cell.type === 'arrow') {
          var dv = DIR_VEC[cell.dir], nc = playerC + dv[0], nr = playerR + dv[1];
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) { finish(false); return; }
          var nextCell = grid[nr][nc];
          if (nextCell.type === 'wall') { game.audio.play('se_failure', 0.3); }
          else {
            playerC = nc; playerR = nr; stepCount++;
            var pos = cellCenter(nc, nr); targetX = pos.x; targetY = pos.y;
            game.audio.play('se_tap', 0.3);
            if (nextCell.type === 'goal') { finish(true); return; }
          }
        }
      }
    }

    // ---- draw ----
    background();
    drawGrid();
    timeBar();
    txt('STEPS ' + stepCount, W / 2, 96, 44, C.c);
    txt('ROUTE THE PACKET TO OUT!', W / 2, H - 90, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
