// 286-color-flood.js
// カラーフラッド — コーナーから洪水のように色を広げて全マスを塗りつぶす
// 操作: タップで次に使う色を選択して洪水を拡大
// 成功: 20手以内に全マス同色  失敗: 20手使い切る or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#030208',
    c1:    '#ef4444',
    c2:    '#3b82f6',
    c3:    '#22c55e',
    c4:    '#f59e0b',
    c5:    '#a855f7',
    ui:    '#475569',
    text:  '#f1f5f9'
  };

  var PALETTE = [C.c1, C.c2, C.c3, C.c4, C.c5];
  var GRID = 10;
  var CELL = Math.floor((W - 80) / GRID);
  var OX = 40, OY = H * 0.18;

  var grid = [];
  var filledCells = [];
  var currentColor = null;
  var moves = 0;
  var MAX_MOVES = 20;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var fillAnim = [];
  var totalCells = GRID * GRID;

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      grid[r] = [];
      for (var c = 0; c < GRID; c++) {
        grid[r][c] = Math.floor(Math.random() * PALETTE.length);
      }
    }
    // Start from top-left
    currentColor = grid[0][0];
    floodFill(currentColor);
  }

  function floodFill(newColor) {
    if (newColor === currentColor) return;
    var oldColor = currentColor;
    currentColor = newColor;

    // BFS from all currently-flooded cells
    var visited = [];
    for (var r = 0; r < GRID; r++) {
      visited[r] = [];
      for (var c = 0; c < GRID; c++) visited[r][c] = false;
    }
    // Mark flooded cells
    for (var f = 0; f < filledCells.length; f++) {
      grid[filledCells[f].r][filledCells[f].c] = newColor;
      visited[filledCells[f].r][filledCells[f].c] = true;
    }

    var queue = filledCells.slice();
    while (queue.length > 0) {
      var cur = queue.shift();
      var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (var d = 0; d < dirs.length; d++) {
        var nr = cur.r + dirs[d][0], nc = cur.c + dirs[d][1];
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !visited[nr][nc] && grid[nr][nc] === newColor) {
          visited[nr][nc] = true;
          grid[nr][nc] = newColor;
          filledCells.push({ r: nr, c: nc });
          fillAnim.push({ r: nr, c: nc, t: 0 });
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  function initFlood() {
    filledCells = [];
    var queue = [{ r: 0, c: 0 }];
    var visited = [];
    for (var r = 0; r < GRID; r++) {
      visited[r] = [];
      for (var c = 0; c < GRID; c++) visited[r][c] = false;
    }
    visited[0][0] = true;
    while (queue.length > 0) {
      var cur = queue.shift();
      filledCells.push(cur);
      var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (var d = 0; d < dirs.length; d++) {
        var nr = cur.r + dirs[d][0], nc = cur.c + dirs[d][1];
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !visited[nr][nc] && grid[nr][nc] === currentColor) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  function checkWin() {
    return filledCells.length === totalCells;
  }

  game.onTap(function(tx, ty) {
    if (done || moves >= MAX_MOVES) return;

    // Tap on color button
    var btnY = H * 0.86;
    var btnW = (W - 80) / PALETTE.length;
    if (ty >= btnY && ty <= btnY + 80) {
      var idx = Math.floor((tx - 40) / btnW);
      if (idx >= 0 && idx < PALETTE.length) {
        var col = idx; // color index
        if (col === currentColor) return; // same color
        moves++;
        floodFill(col);
        game.audio.play('se_tap', 0.3);
        if (checkWin()) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success((MAX_MOVES - moves) * 300 + Math.ceil(timeLeft) * 100); }, 400);
        } else if (moves >= MAX_MOVES) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
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

    for (var fa = fillAnim.length - 1; fa >= 0; fa--) {
      fillAnim[fa].t += dt * 5;
      if (fillAnim[fa].t >= 1) fillAnim.splice(fa, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var x = OX + c * CELL, y = OY + r * CELL;
        var col2 = PALETTE[grid[r][c]];
        var isFilled = false;
        for (var f = 0; f < filledCells.length; f++) {
          if (filledCells[f].r === r && filledCells[f].c === c) { isFilled = true; break; }
        }
        game.draw.rect(x + 2, y + 2, CELL - 4, CELL - 4, col2, isFilled ? 1.0 : 0.6);
        if (isFilled) {
          game.draw.rect(x + 2, y + 2, CELL - 4, 5, '#fff', 0.15);
        }
      }
    }

    // Fill animation flashes
    for (var fa2 = 0; fa2 < fillAnim.length; fa2++) {
      var fa3 = fillAnim[fa2];
      var x2 = OX + fa3.c * CELL + 2, y2 = OY + fa3.r * CELL + 2;
      game.draw.rect(x2, y2, CELL - 4, CELL - 4, '#fff', (1 - fa3.t) * 0.5);
    }

    // Color buttons
    var btnY2 = H * 0.86;
    var btnW2 = (W - 80) / PALETTE.length;
    for (var pi = 0; pi < PALETTE.length; pi++) {
      var bx = 40 + pi * btnW2;
      var isCurrent = pi === currentColor;
      game.draw.rect(bx + 4, btnY2, btnW2 - 8, 70, PALETTE[pi], isCurrent ? 1.0 : 0.6);
      if (isCurrent) {
        game.draw.rect(bx + 4, btnY2, btnW2 - 8, 8, '#fff', 0.4);
        game.draw.rect(bx + 4, btnY2 - 14, btnW2 - 8, 14, PALETTE[pi], 0.9);
      }
    }

    // Progress & moves
    var filledPct = Math.round(filledCells.length / totalCells * 100);
    game.draw.text(filledPct + '%埋め / 残り' + (MAX_MOVES - moves) + '手', W / 2, H * 0.93, { size: 40, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.c3 : C.c1);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGrid();
    initFlood();
  });
})(game);
