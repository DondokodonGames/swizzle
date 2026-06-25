// 050-color-flood.js
// カラーフラッド — 左上から色を塗り広げて盤面を制覇する洪水パズル
// 操作: スワイプ上下左右で次の色を選択（5色循環）
// 成功: 25手以内に全マス同色  失敗: 25手超過

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  var COLOR_NAMES = ['赤', 'オレンジ', '黄', '緑', '青'];
  var BG = '#0a0f1a';

  var COLS = 8;
  var ROWS = 8;
  var CELL = 100;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.25;

  var grid = [];
  var flooded = []; // boolean grid: is this cell part of flood?
  var currentColor = 0;
  var moves = 0;
  var maxMoves = 25;
  var done = false;

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * COLORS.length));
      }
      grid.push(row);
    }
    flooded = [];
    for (var r2 = 0; r2 < ROWS; r2++) {
      var frow = [];
      for (var c2 = 0; c2 < COLS; c2++) {
        frow.push(false);
      }
      flooded.push(frow);
    }
    // Flood starts from top-left
    flooded[0][0] = true;
    currentColor = grid[0][0];
    // Expand initial flood region (all connected same-color from top-left)
    expandFlood(currentColor, true);
  }

  function expandFlood(newColor, initial) {
    // BFS flood fill from all currently flooded cells
    var queue = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (flooded[r][c]) {
          grid[r][c] = newColor;
          queue.push([r, c]);
        }
      }
    }
    var visited = [];
    for (var r2 = 0; r2 < ROWS; r2++) {
      visited.push([]);
      for (var c2 = 0; c2 < COLS; c2++) visited[r2].push(false);
    }
    var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    while (queue.length > 0) {
      var cur = queue.shift();
      var cr = cur[0], cc = cur[1];
      for (var d = 0; d < dirs.length; d++) {
        var nr = cr + dirs[d][0];
        var nc = cc + dirs[d][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !flooded[nr][nc] && !visited[nr][nc]) {
          if (grid[nr][nc] === newColor) {
            flooded[nr][nc] = true;
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
    }
    currentColor = newColor;
  }

  function countFlooded() {
    var count = 0;
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        if (flooded[r][c]) count++;
    return count;
  }

  function isComplete() {
    return countFlooded() === ROWS * COLS;
  }

  // Preview: which cells would be newly flooded with this color?
  var previewColor = -1;

  game.onSwipe(function(dir) {
    if (done) return;
    var nextColor = currentColor;
    if (dir === 'up') nextColor = (currentColor + 1) % COLORS.length;
    if (dir === 'down') nextColor = (currentColor + COLORS.length - 1) % COLORS.length;
    if (dir === 'left') nextColor = (currentColor + COLORS.length - 1) % COLORS.length;
    if (dir === 'right') nextColor = (currentColor + 1) % COLORS.length;

    if (nextColor === currentColor) return; // no change

    moves++;
    game.audio.play('se_tap', 0.4);
    expandFlood(nextColor, false);

    if (isComplete()) {
      done = true;
      game.audio.play('se_success');
      var bonus = Math.max(0, maxMoves - moves);
      setTimeout(function() { game.end.success(200 + bonus * 20); }, 400);
    } else if (moves >= maxMoves && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    // ---- draw ----
    game.draw.rect(0, 0, W, H, BG);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = GRID_X + c * CELL;
        var gy = GRID_Y + r * CELL;
        var col = COLORS[grid[r][c]];
        var isFlood = flooded[r][c];
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col, isFlood ? 1.0 : 0.5);
        if (isFlood) {
          game.draw.rect(gx + 6, gy + 6, CELL - 12, 16, '#fff', 0.15);
        }
      }
    }

    // Flood border glow
    game.draw.rect(GRID_X - 6, GRID_Y - 6, COLS * CELL + 12, ROWS * CELL + 12, COLORS[currentColor], 0.15);

    // Moves left
    var movesLeft = maxMoves - moves;
    var ratio = Math.max(0, movesLeft / maxMoves);
    game.draw.rect(0, 0, W, 72, BG);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.4 ? '#3b82f6' : '#ef4444');
    game.draw.text('残り ' + movesLeft + ' 手', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Flood count
    var fc = countFlooded();
    game.draw.text(fc + ' / ' + (ROWS * COLS), W / 2, 140, { size: 52, color: '#94a3b8', bold: true });

    // Color selector
    var selY = GRID_Y + ROWS * CELL + 100;
    for (var ci = 0; ci < COLORS.length; ci++) {
      var cx = W / 2 + (ci - 2) * 140;
      var isCurrent = ci === currentColor;
      game.draw.circle(cx, selY, isCurrent ? 52 : 40, COLORS[ci], isCurrent ? 1.0 : 0.5);
      if (isCurrent) {
        game.draw.circle(cx, selY, 36, '#fff', 0.3);
        game.draw.rect(cx - 28, selY + 56, 56, 10, COLORS[ci]);
      }
    }

    // Guide
    game.draw.text('スワイプで色選択→洪水！', W / 2, H - 200, { size: 48, color: '#475569' });
    game.draw.text('全マスを同じ色に！', W / 2, H - 140, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initGrid();
  });
})(game);
