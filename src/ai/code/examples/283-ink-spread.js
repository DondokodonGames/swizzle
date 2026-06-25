// 283-ink-spread.js
// インクスプレッド — 広がるインクをタップで止めて、白い領域を守り抜く
// 操作: タップでインク吸収ブロックを配置して広がりを防ぐ
// 成功: 30秒間に白い領域を60%以上守る  失敗: 白領域が60%を下回る or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#fafafa',
    white:   '#f8fafc',
    ink:     '#0f172a',
    inkMid:  '#1e293b',
    inkEdge: '#334155',
    absorb:  '#22c55e',
    absHi:   '#86efac',
    danger:  '#ef4444',
    ui:      '#475569',
    text:    '#1e293b',
    textHi:  '#f1f5f9'
  };

  var GRID = 30;
  var CELL = Math.floor(W / GRID);
  var ROWS = Math.floor(H * 0.7 / CELL);
  var OY = Math.floor(H * 0.15);
  var grid = []; // 0=white, 1=ink, 2=absorber
  var inkFront = []; // cells to spread next
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var absorbsLeft = 12;
  var spreadTimer = 0;
  var SPREAD_INTERVAL = 0.22;
  var whitePercent = 100;

  function initGrid() {
    grid = [];
    inkFront = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < GRID; c++) {
        grid[r][c] = 0;
      }
    }
    // Start ink at corners
    var starts = [
      [0, 0], [0, GRID - 1], [ROWS - 1, 0], [ROWS - 1, GRID - 1]
    ];
    for (var s = 0; s < starts.length; s++) {
      var r = starts[s][0], c = starts[s][1];
      grid[r][c] = 1;
      inkFront.push({ r: r, c: c });
    }
  }

  function countWhite() {
    var total = ROWS * GRID;
    var white = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < GRID; c++) {
        if (grid[r][c] === 0) white++;
      }
    }
    return Math.round(white / total * 100);
  }

  function spreadInk() {
    var newFront = [];
    var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    // Shuffle front for random spread order
    for (var i = inkFront.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = inkFront[i]; inkFront[i] = inkFront[j]; inkFront[j] = tmp;
    }
    var spread = Math.min(inkFront.length, 3 + Math.floor(elapsed / 5));
    for (var fi = 0; fi < spread; fi++) {
      var cell = inkFront[fi];
      for (var d = 0; d < dirs.length; d++) {
        var nr = cell.r + dirs[d][0], nc = cell.c + dirs[d][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < GRID && grid[nr][nc] === 0) {
          grid[nr][nc] = 1;
          newFront.push({ r: nr, c: nc });
        }
      }
    }
    inkFront = inkFront.concat(newFront);
    // Trim front size
    if (inkFront.length > 200) inkFront = inkFront.slice(inkFront.length - 200);
  }

  game.onTap(function(tx, ty) {
    if (done || absorbsLeft <= 0) return;
    var c = Math.floor(tx / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= GRID) return;
    if (grid[r][c] === 0 || grid[r][c] === 1) {
      if (grid[r][c] === 1) {
        // Place absorber on ink — blocks future spread
        grid[r][c] = 2;
        // Remove from front
        for (var fi = inkFront.length - 1; fi >= 0; fi--) {
          if (inkFront[fi].r === r && inkFront[fi].c === c) inkFront.splice(fi, 1);
        }
      } else {
        grid[r][c] = 2;
      }
      absorbsLeft--;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        whitePercent = countWhite();
        done = true;
        if (whitePercent >= 60) {
          game.audio.play('se_success');
          game.end.success(whitePercent * 30 + Math.ceil(timeLeft) * 50);
        } else {
          game.audio.play('se_failure');
          game.end.failure();
        }
        return;
      }
    }

    spreadTimer -= dt;
    if (spreadTimer <= 0) {
      spreadInk();
      spreadTimer = SPREAD_INTERVAL;
      whitePercent = countWhite();
      if (whitePercent < 60 && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < GRID; c++) {
        var x = c * CELL, y = OY + r * CELL;
        var val = grid[r][c];
        if (val === 1) {
          // Ink cell — gradient from center
          game.draw.rect(x, y, CELL, CELL, C.ink, 0.9);
        } else if (val === 2) {
          game.draw.rect(x, y, CELL, CELL, C.absorb, 0.85);
          game.draw.rect(x + 2, y + 2, CELL - 4, CELL - 4, C.absHi, 0.3);
        }
        // val === 0: white, drawn by background
      }
    }

    // Percentage indicator
    var col = whitePercent >= 70 ? C.absorb : (whitePercent >= 60 ? C.ui : C.danger);
    game.draw.rect(40, H * 0.88, W - 80, 24, C.inkMid, 0.2);
    game.draw.rect(40, H * 0.88, (W - 80) * whitePercent / 100, 24, col, 0.7);
    game.draw.text('白: ' + whitePercent + '% (60%以上守れ)', W / 2, H * 0.9, { size: 36, color: C.ink, bold: whitePercent < 65 });

    game.draw.text('残りブロック: ' + absorbsLeft, W / 2, H * 0.93, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.ink);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.absorb : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: C.textHi, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initGrid();
  });
})(game);
