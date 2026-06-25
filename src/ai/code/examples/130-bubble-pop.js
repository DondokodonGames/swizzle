// 130-bubble-pop.js
// バブルポップ — 大きな泡を選んで連鎖させ一気に弾ける爽快な消去ゲーム
// 操作: タップで泡を割る（隣接する同色の泡を連鎖消去）
// 成功: 80%の泡を消す  失敗: 10タップ使い切る or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020610',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var BUBBLE_COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7'];

  var COLS = 8, ROWS = 10;
  var CELL = 110;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.14;

  var grid = []; // [row][col] = colorIdx or -1 (empty)
  var TOTAL_BUBBLES = COLS * ROWS;

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) {
        grid[r].push(Math.floor(Math.random() * BUBBLE_COLORS.length));
      }
    }
  }

  // BFS flood fill for connected same-color bubbles
  function floodFill(startR, startC) {
    var targetColor = grid[startR][startC];
    if (targetColor < 0) return [];
    var visited = [];
    for (var r = 0; r < ROWS; r++) {
      visited.push(new Array(COLS).fill(false));
    }
    var queue = [{r: startR, c: startC}];
    var group = [];
    visited[startR][startC] = true;
    while (queue.length > 0) {
      var curr = queue.shift();
      group.push(curr);
      var neighbors = [
        {r: curr.r-1, c: curr.c}, {r: curr.r+1, c: curr.c},
        {r: curr.r, c: curr.c-1}, {r: curr.r, c: curr.c+1}
      ];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nb = neighbors[ni];
        if (nb.r >= 0 && nb.r < ROWS && nb.c >= 0 && nb.c < COLS
            && !visited[nb.r][nb.c] && grid[nb.r][nb.c] === targetColor) {
          visited[nb.r][nb.c] = true;
          queue.push(nb);
        }
      }
    }
    return group;
  }

  var tapsLeft = 10;
  var popped = 0;
  var timeLeft = 30;
  var done = false;
  var popFlash = 0;
  var lastPopCount = 0;
  var floatingTexts = []; // { x, y, text, life }

  game.onTap(function(tx, ty) {
    if (done || tapsLeft <= 0) return;
    var col = Math.floor((tx - GRID_X) / CELL);
    var row = Math.floor((ty - GRID_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (grid[row][col] < 0) return;

    var group = floodFill(row, col);
    if (group.length < 2) {
      // Single bubble — small pop, costs tap
      grid[row][col] = -1;
      popped++;
      tapsLeft--;
      game.audio.play('se_tap', 0.4);
      return;
    }

    // Pop entire group
    var color = BUBBLE_COLORS[grid[group[0].r][group[0].c]];
    for (var gi = 0; gi < group.length; gi++) {
      grid[group[gi].r][group[gi].c] = -1;
    }
    popped += group.length;
    lastPopCount = group.length;
    tapsLeft--;
    popFlash = 0.3;
    game.audio.play('se_success');
    // Floating text
    var cx = GRID_X + group[0].c * CELL + CELL/2;
    var cy = GRID_Y + group[0].r * CELL + CELL/2;
    floatingTexts.push({ x: cx, y: cy, text: '+' + group.length, life: 0.7, color: color });

    var remaining = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] >= 0) remaining++;

    if (remaining / TOTAL_BUBBLES <= 0.2 && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(popped * 15 + tapsLeft * 30 + Math.ceil(timeLeft) * 8); }, 400);
      return;
    }
    if (tapsLeft <= 0 && !done) {
      done = true;
      var pct = popped / TOTAL_BUBBLES;
      if (pct >= 0.8) {
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(popped * 15); }, 400);
      } else {
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
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

    if (popFlash > 0) popFlash -= dt;
    for (var fi = 0; fi < floatingTexts.length; fi++) {
      floatingTexts[fi].y -= 80 * dt;
      floatingTexts[fi].life -= dt;
    }
    floatingTexts = floatingTexts.filter(function(f) { return f.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (popFlash > 0) {
      game.draw.rect(0, 0, W, H, '#fff', popFlash * 0.15);
    }

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var ci = grid[r][c];
        if (ci < 0) continue;
        var bx = GRID_X + c * CELL + CELL/2;
        var by = GRID_Y + r * CELL + CELL/2;
        var bCol = BUBBLE_COLORS[ci];
        var bPulse = 0.7 + 0.3 * Math.abs(Math.sin(timeLeft * 1.5 + r * 0.4 + c * 0.3));
        // Glow
        game.draw.circle(bx, by, CELL*0.48, bCol, bPulse * 0.15);
        // Bubble
        game.draw.circle(bx, by, CELL*0.42, bCol, 0.85);
        // Highlight
        game.draw.circle(bx - CELL*0.12, by - CELL*0.12, CELL*0.12, '#fff', 0.5);
        // Check connected group size
        var group2 = floodFill(r, c);
        if (group2.length >= 3) {
          game.draw.text('' + group2.length, bx, by, { size: 32, color: '#fff', bold: true });
        }
      }
    }

    // Floating texts
    for (var fi2 = 0; fi2 < floatingTexts.length; fi2++) {
      var ft = floatingTexts[fi2];
      game.draw.text(ft.text, ft.x, ft.y, { size: 56, color: ft.color, bold: true });
    }

    // Remaining %
    var remaining2 = 0;
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) if (grid[r2][c2] >= 0) remaining2++;
    var pct2 = Math.round((1 - remaining2/TOTAL_BUBBLES) * 100);
    game.draw.text('消去: ' + pct2 + '%', W/2, 148, { size: 56, color: '#f1f5f9', bold: true });

    // Taps left
    for (var ti = 0; ti < 10; ti++) {
      var tx2 = W/2 + (ti - 4.5) * 56;
      game.draw.circle(tx2, 220, 18, ti < tapsLeft ? '#facc15' : '#0a1020');
    }

    game.draw.text('大きい固まりを狙え！', W/2, H*0.89, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? '#8b5cf6' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initGrid();
  });
})(game);
