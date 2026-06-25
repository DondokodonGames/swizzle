// 274-tile-flip.js
// タイルフリップ — 全タイルを同じ色にそろえる反転パズル
// 操作: タップでタイルを反転（隣接タイルも連動）
// 成功: 全タイルを白にする  失敗: 30手 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030610',
    tileW:  '#e2e8f0',
    tileWHi:'#ffffff',
    tileB:  '#1e293b',
    tileBHi:'#334155',
    hint:   '#22c55e',
    hintHi: '#86efac',
    wrong:  '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var COLS = 5, ROWS = 5;
  var TILE_W = 160, TILE_H = 160;
  var GAP = 16;
  var OX = (W - (COLS * TILE_W + (COLS - 1) * GAP)) / 2;
  var OY = H * 0.28;

  var grid = [];
  var moves = 0;
  var MAX_MOVES = 30;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var flipAnim = []; // {col, row, t}
  var solved = false;
  var solvedTimer = 0;

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        grid[r][c] = Math.random() < 0.5 ? 0 : 1;
      }
    }
    // Ensure not already solved
    if (checkSolved()) initGrid();
  }

  function flip(col, row) {
    var dirs = [[0,0],[0,1],[0,-1],[1,0],[-1,0]];
    for (var d = 0; d < dirs.length; d++) {
      var nr = row + dirs[d][1];
      var nc = col + dirs[d][0];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        grid[nr][nc] = 1 - grid[nr][nc];
        flipAnim.push({ col: nc, row: nr, t: 0 });
      }
    }
  }

  function checkSolved() {
    var first = grid[0][0];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] !== first) return false;
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done || moves >= MAX_MOVES) return;

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var tx2 = OX + c * (TILE_W + GAP);
        var ty2 = OY + r * (TILE_H + GAP);
        if (tx >= tx2 && tx <= tx2 + TILE_W && ty >= ty2 && ty <= ty2 + TILE_H) {
          flip(c, r);
          moves++;
          game.audio.play('se_tap', 0.3);
          if (checkSolved()) {
            solved = true;
            solvedTimer = 0.8;
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success((MAX_MOVES - moves) * 200 + Math.ceil(timeLeft) * 80); }, 800);
          }
          return;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (moves >= MAX_MOVES && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    for (var fa = flipAnim.length - 1; fa >= 0; fa--) {
      flipAnim[fa].t += dt * 4;
      if (flipAnim[fa].t >= 1) flipAnim.splice(fa, 1);
    }

    if (solvedTimer > 0) solvedTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var tx3 = OX + c * (TILE_W + GAP);
        var ty3 = OY + r * (TILE_H + GAP);
        var val = grid[r][c];

        // Find flip anim
        var animT = 0;
        for (var fa2 = 0; fa2 < flipAnim.length; fa2++) {
          if (flipAnim[fa2].col === c && flipAnim[fa2].row === r) {
            animT = flipAnim[fa2].t;
            break;
          }
        }

        var scale = animT < 0.5 ? (1 - animT * 2) : ((animT - 0.5) * 2);
        var cx2 = tx3 + TILE_W / 2;
        var drawW = Math.max(4, TILE_W * scale);
        var col = val === 1 ? C.tileW : C.tileB;
        var hiCol = val === 1 ? C.tileWHi : C.tileBHi;

        game.draw.rect(cx2 - drawW / 2, ty3, drawW, TILE_H, col, 0.9);
        if (drawW > 20) {
          game.draw.rect(cx2 - drawW / 2, ty3, drawW, 8, hiCol, 0.6);
        }

        if (solved && solvedTimer > 0) {
          game.draw.rect(tx3, ty3, TILE_W, TILE_H, C.hint, 0.3 * (solvedTimer / 0.8));
        }
      }
    }

    // Goal indicator
    game.draw.text('全部白にそろえる', W / 2, H * 0.2, { size: 42, color: C.ui });

    // Moves counter
    var movesLeft = MAX_MOVES - moves;
    game.draw.text('残り手数: ' + movesLeft, W / 2, H * 0.86, { size: 48, color: movesLeft < 8 ? C.wrong : C.text, bold: movesLeft < 8 });

    // Solved flash
    if (solved) {
      game.draw.text('クリア！', W / 2, H * 0.91, { size: 60, color: C.hintHi, bold: true });
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hint : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGrid();
  });
})(game);
