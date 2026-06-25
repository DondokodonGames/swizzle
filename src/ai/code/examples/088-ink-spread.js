// 088-ink-spread.js
// インクスプレッド — タップした場所からインクが広がる前に全てのマスを塗りつぶす
// 操作: タップで色を選んでインクを広げる（隣接する同色マスに伝播）
// 成功: 全マスを塗る（25手以内）  失敗: 手数オーバー or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#07090f',
    ui: '#475569'
  };

  var PALETTE = ['#ef4444','#3b82f6','#22c55e','#eab308','#8b5cf6'];
  var COLS = 7;
  var ROWS = 9;
  var CELL = 112;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.18;
  var MAX_MOVES = 25;

  var grid = [];
  var playerColor = 0;
  var moves = 0;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) {
        grid[r].push(Math.floor(Math.random() * PALETTE.length));
      }
    }
    // Player starts at top-left (0,0)
    playerColor = grid[0][0];
  }

  function flood(newColor) {
    if (newColor === playerColor) return; // same color, no change
    var old = playerColor;
    playerColor = newColor;
    // BFS from (0,0): all connected cells matching old color become newColor
    var queue = [[0, 0]];
    var visited = {};
    visited['0,0'] = true;
    // First, mark all cells currently owned by player (same as old playerColor starting from (0,0))
    // Actually we need to flood from (0,0) — cells currently == old color that are reachable
    while (queue.length > 0) {
      var cur = queue.shift();
      var r = cur[0], cc2 = cur[1];
      if (grid[r][cc2] !== old) continue;
      grid[r][cc2] = newColor;
      var neighbors = [[r-1,cc2],[r+1,cc2],[r,cc2-1],[r,cc2+1]];
      for (var n = 0; n < neighbors.length; n++) {
        var nr = neighbors[n][0], nc = neighbors[n][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr+','+nc] && grid[nr][nc] === old) {
          visited[nr+','+nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
    moves++;
  }

  function isComplete() {
    var target = grid[0][0];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] !== target) return false;
      }
    }
    return true;
  }

  // Color picker at bottom
  var PICKER_Y = H * 0.84;
  var PICKER_R = 52;
  var PICKER_GAP = 140;
  var PICKER_START_X = W / 2 - (PALETTE.length - 1) / 2 * PICKER_GAP;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check color picker
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PICKER_START_X + i * PICKER_GAP;
      var dx = tx - px, dy = ty - PICKER_Y;
      if (Math.sqrt(dx * dx + dy * dy) < PICKER_R + 20) {
        flood(i);
        game.audio.play('se_tap', 0.6);

        if (isComplete()) {
          var bonus = Math.max(0, MAX_MOVES - moves);
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(500 + bonus * 30 + Math.ceil(timeLeft) * 8); }, 400);
          return;
        }

        if (moves >= MAX_MOVES) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
        return;
      }
    }
  });

  // Count cells owned (== playerColor starting from 0,0 contiguous region)
  function countOwned() {
    var target = grid[0][0]; // After flood, all owned cells have same color
    var visited = {};
    var queue = [[0, 0]];
    var count = 0;
    while (queue.length > 0) {
      var cur = queue.shift();
      var r = cur[0], c2 = cur[1];
      var key = r + ',' + c2;
      if (visited[key]) continue;
      visited[key] = true;
      if (grid[r][c2] !== target) continue;
      count++;
      var nb = [[r-1,c2],[r+1,c2],[r,c2-1],[r,c2+1]];
      for (var n = 0; n < nb.length; n++) {
        var nr = nb[n][0], nc = nb[n][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) queue.push([nr, nc]);
      }
    }
    return count;
  }

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

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = GRID_X + c * CELL;
        var gy = GRID_Y + r * CELL;
        var col = PALETTE[grid[r][c]];
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col);
        // Highlight player-owned region (top-left cluster)
        if (r === 0 && c === 0) {
          game.draw.rect(gx, gy, CELL, CELL, '#fff', 0.15);
        }
      }
    }

    // Color picker
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PICKER_START_X + i * PICKER_GAP;
      var isSelected = (i === playerColor);
      game.draw.circle(px, PICKER_Y, PICKER_R + (isSelected ? 8 : 0), PALETTE[i]);
      if (isSelected) {
        game.draw.circle(px, PICKER_Y, PICKER_R + 14, '#fff', 0.4);
        game.draw.text('✓', px, PICKER_Y, { size: 36, color: '#fff', bold: true });
      }
    }

    // Moves counter
    var movesLeft = MAX_MOVES - moves;
    var movesColor = movesLeft > 8 ? '#94a3b8' : movesLeft > 4 ? '#f59e0b' : '#ef4444';
    game.draw.text('残り ' + movesLeft + '手', W / 2, H * 0.92, { size: 48, color: movesColor, bold: true });

    // Progress (owned cells)
    var owned = countOwned();
    var total = COLS * ROWS;
    var progFrac = owned / total;
    var progW = 600;
    game.draw.rect(W / 2 - progW / 2, H * 0.14, progW, 20, '#0f172a');
    game.draw.rect(W / 2 - progW / 2, H * 0.14, progW * progFrac, 20, PALETTE[playerColor]);
    game.draw.text(Math.round(progFrac * 100) + '%', W / 2, H * 0.10, { size: 44, color: '#94a3b8' });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, '#07090f');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6d28d9' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initGrid();
  });
})(game);
