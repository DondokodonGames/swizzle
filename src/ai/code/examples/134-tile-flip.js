// 134-tile-flip.js
// タイルフリップ — タップするたびに隣も反転する。全部同じ色に揃える論理パズル
// 操作: タップでタイルを選択（隣接タイルも同時反転）
// 成功: 全タイルを同色に揃える  失敗: 20手以内に解けない or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030608',
    tileOn:  '#22c55e',
    tileOnHi:'#86efac',
    tileOff: '#0f1a28',
    tileOffHi:'#1e3a5f',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var COLS = 5, ROWS = 5;
  var CELL = 160;
  var GAP = 12;
  var GRID_W = COLS * CELL + (COLS-1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS-1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2;

  var grid = []; // ROWS x COLS, 0=off, 1=on
  var moves = 0;
  var maxMoves = 20;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function initGrid() {
    // Start with all off, then make random moves to ensure solvable
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push(new Array(COLS).fill(0));
    }
    // Random scramble (guaranteed solvable by reverse logic)
    for (var i = 0; i < 8; i++) {
      var rc = Math.floor(Math.random() * ROWS);
      var cc = Math.floor(Math.random() * COLS);
      flipCell(rc, cc);
    }
  }

  function flipCell(row, col) {
    var neighbors = [[row,col],[row-1,col],[row+1,col],[row,col-1],[row,col+1]];
    for (var ni = 0; ni < neighbors.length; ni++) {
      var nr = neighbors[ni][0], nc = neighbors[ni][1];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        grid[nr][nc] = 1 - grid[nr][nc];
      }
    }
  }

  function checkWin() {
    var val = grid[0][0];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] !== val) return false;
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    // Check within cell (not gap)
    var cx = GRID_X + col * (CELL + GAP);
    var cy = GRID_Y + row * (CELL + GAP);
    if (tx > cx + CELL || ty > cy + CELL) return;

    flipCell(row, col);
    moves++;
    game.audio.play('se_tap', 0.5);

    if (checkWin()) {
      done = true;
      feedbackOk = true;
      feedback = 0.8;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(500 - moves*10 + Math.ceil(timeLeft)*10); }, 600);
      return;
    }
    if (moves >= maxMoves && !done) {
      done = true;
      feedbackOk = false;
      feedback = 0.5;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 600);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cx = GRID_X + c * (CELL + GAP);
        var cy = GRID_Y + r * (CELL + GAP);
        var isOn = grid[r][c] === 1;
        var color = isOn ? C.tileOn : C.tileOff;
        var hiColor = isOn ? C.tileOnHi : C.tileOffHi;
        game.draw.rect(cx, cy, CELL, CELL, color);
        game.draw.rect(cx, cy, CELL, 8, hiColor);
        game.draw.rect(cx, cy, 8, CELL, hiColor, 0.4);
        if (isOn) {
          game.draw.circle(cx + CELL/2, cy + CELL/2, CELL*0.22, C.tileOnHi, 0.4);
        }
      }
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.2);
      game.draw.text(feedbackOk ? 'クリア！' : '手数切れ', W/2, H*0.18, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Move counter
    game.draw.text((maxMoves - moves) + '手', W/2, 148, { size: 64, color: moves > maxMoves*0.7 ? '#ef4444' : '#f1f5f9', bold: true });
    game.draw.text('残り', W/2 - 80, 148, { size: 44, color: C.ui });

    game.draw.text('タップで反転（隣も変わる）', W/2, H*0.88, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.tileOn : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    initGrid();
  });
})(game);
