// 134-tile-flip.js
// タイルフリップ — タップするたび隣も反転。全タイルを同色に揃える論理パズル
// 操作: タップでタイルを選択（隣接タイルも同時反転）
// 成功: 全タイルを同色に揃える  失敗: 10手以内に解けない or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、回路パネル） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'TAP TILES · NEIGHBORS FLIP TOO';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var MAX_MOVES = 10;            // 修正2: 20 → 10
  var SCRAMBLE = 3;              // 修正2: 8 → 3（易化）
  var TOP    = 220;
  var BOTTOM = H - 180;

  var COLS = 4, ROWS = 4;
  var CELL = 192, GAP = 16;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = snap((W - GRID_W) / 2);
  var GRID_Y = snap(TOP + (BOTTOM - TOP - GRID_H) / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, moves, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18);
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, GRID_H + 32, C.a, 0.4);
    game.draw.rect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, 8, C.b);
  }

  function flipCell(row, col) {
    var nb = [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
    for (var i = 0; i < nb.length; i++) {
      var r = nb[i][0], c = nb[i][1];
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = 1 - grid[r][c];
    }
  }

  function checkWin() {
    var v = grid[0][0];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] !== v) return false;
    return true;
  }

  function initGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
    for (var i = 0; i < SCRAMBLE; i++) flipCell(Math.floor(Math.random() * ROWS), Math.floor(Math.random() * COLS));
    if (checkWin()) flipCell(0, 0);
    moves = 0;
    timeLeft = MAX_TIME;
    done = false;
    feedback = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 - moves * 20 + Math.ceil(timeLeft) * 20) : moves * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── タイルスプライト（多矩形・ランプ） ──
  function drawTile(x, y, on) {
    game.draw.rect(x, y, CELL, CELL, on ? C.f : '#001a2a');
    game.draw.rect(x, y, CELL, 8, on ? C.c : C.a);
    game.draw.rect(x, y, 8, CELL, on ? C.c : C.a, 0.4);
    if (on) {
      pc(x + CELL / 2, y + CELL / 2, 40, C.c, 0.9);
      pc(x + CELL / 2, y + CELL / 2, 24, C.f, 1);
      game.draw.rect(x + CELL / 2 - 4, y + CELL / 2 - 48, 8, 24, C.c); // 光条
    } else {
      game.draw.rect(x + CELL / 2 - 20, y + CELL / 2 - 4, 40, 8, C.a, 0.6);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((x - GRID_X) / (CELL + GAP));
    var row = Math.floor((y - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var cx = GRID_X + col * (CELL + GAP), cy = GRID_Y + row * (CELL + GAP);
    if (x > cx + CELL || y > cy + CELL) return;
    flipCell(row, col);
    moves++;
    game.audio.play('se_tap', 0.5);
    if (checkWin()) { feedbackOk = true; feedback = 0.6; finish(true); return; }
    if (moves >= MAX_MOVES) { feedbackOk = false; feedback = 0.6; finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        drawTile(GRID_X + c * (CELL + GAP), GRID_Y + r * (CELL + GAP), (r + c + Math.floor(game.time.elapsed)) % 2 === 0);
      }
      txt(GAME_TITLE,  W / 2, H * 0.12, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.83, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.89, 62, C.d);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.c);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SOLVED!' : 'OUT OF MOVES', W / 2, H * 0.35, 72, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    if (feedback > 0) feedback -= dt;

    background();
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      drawTile(GRID_X + c2 * (CELL + GAP), GRID_Y + r2 * (CELL + GAP), grid[r2][c2] === 1);
    }
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.f : C.e, feedback * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, 168, 48, moves > MAX_MOVES * 0.7 ? C.e : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
