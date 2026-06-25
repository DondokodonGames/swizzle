// 029-pixel-paint.js
// ピクセルペイント — お題のシルエットを素早くなぞり塗る爽快感
// 操作: スワイプで色を塗り広げる（上下左右に一マスずつ）
// 成功: 目標の80%以上を塗る  失敗: 20秒 or 間違いセル5個

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0c14',
    gridBg:   '#0f1320',
    target:   '#1e293b',
    targetHi: '#334155',
    painted:  '#6366f1',
    paintedHi:'#a5b4fc',
    wrong:    '#ef4444',
    ui:       '#475569',
    good:     '#22c55e'
  };

  var COLS = 8;
  var ROWS = 10;
  var CELL = 110;
  var GAP = 4;
  var GRID_W = COLS * (CELL + GAP) - GAP;
  var GRID_H = ROWS * (CELL + GAP) - GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = 220;

  // Target shape (heart-ish silhouette in 8×10 grid)
  var TARGET_SHAPES = [
    // Heart
    [0,1,1,0,0,1,1,0,
     1,1,1,1,1,1,1,1,
     1,1,1,1,1,1,1,1,
     1,1,1,1,1,1,1,1,
     0,1,1,1,1,1,1,0,
     0,0,1,1,1,1,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0],
    // Arrow
    [0,0,0,1,0,0,0,0,
     0,0,1,1,1,0,0,0,
     0,1,1,1,1,1,0,0,
     1,1,1,1,1,1,1,0,
     0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,0,0,0,0,0],
    // Star-ish
    [0,0,0,1,1,0,0,0,
     0,0,1,1,1,1,0,0,
     1,1,1,1,1,1,1,1,
     0,1,1,1,1,1,1,0,
     0,0,1,1,1,1,0,0,
     0,1,1,0,0,1,1,0,
     1,1,0,0,0,0,1,1,
     0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0]
  ];

  var targetShape = TARGET_SHAPES[Math.floor(Math.random() * TARGET_SHAPES.length)];
  var totalTarget = 0;
  for (var i = 0; i < targetShape.length; i++) { if (targetShape[i]) totalTarget++; }

  var painted = new Array(COLS * ROWS).fill(0); // 0=empty, 1=correct, -1=wrong
  var curCol = 0, curRow = 3; // start position (cursor)
  var paintedCorrect = 0;
  var paintedWrong = 0;
  var timeLeft = 20;
  var done = false;

  function cellIdx(c, r) { return r * COLS + c; }

  function paint(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var i = cellIdx(c, r);
    if (painted[i] !== 0) return; // already painted

    if (targetShape[i] === 1) {
      painted[i] = 1;
      paintedCorrect++;
    } else {
      painted[i] = -1;
      paintedWrong++;
      game.audio.play('se_failure', 0.3);
      if (paintedWrong >= 5) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    if (paintedCorrect >= Math.ceil(totalTarget * 0.8)) {
      done = true;
      game.audio.play('se_success');
      var pct = Math.floor(paintedCorrect / totalTarget * 100);
      setTimeout(function() {
        game.end.success(pct * 2 + Math.ceil(timeLeft) * 5);
      }, 400);
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'right') curCol = Math.min(COLS - 1, curCol + 1);
    if (dir === 'left')  curCol = Math.max(0, curCol - 1);
    if (dir === 'down')  curRow = Math.min(ROWS - 1, curRow + 1);
    if (dir === 'up')    curRow = Math.max(0, curRow - 1);
    paint(curCol, curRow);
    game.audio.play('se_tap', 0.4);
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

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0a0c14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#4f46e5' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Progress
    var pct = Math.floor(paintedCorrect / totalTarget * 100);
    game.draw.text(pct + '%', W / 2, 128, { size: 56, color: C.paintedHi, bold: true });
    game.draw.rect(W * 0.1, 170, W * 0.8 * pct / 100, 20, C.painted);
    game.draw.rect(W * 0.1, 170, W * 0.8, 20, '#1e293b', 0.5);

    // Wrong count
    for (var ww = 0; ww < 5; ww++) {
      var wx = W / 2 + (ww - 2) * 56;
      game.draw.circle(wx, 218, 16, ww < paintedWrong ? C.wrong : '#1e293b');
    }

    // Grid cells
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var ci = cellIdx(c, r);
        var cx2 = GRID_X + c * (CELL + GAP);
        var cy2 = GRID_Y + r * (CELL + GAP);
        var isTarget = targetShape[ci] === 1;
        var paintState = painted[ci];

        // background (hint as slight highlight for target cells)
        var bgC = isTarget ? C.target : C.gridBg;
        game.draw.rect(cx2, cy2, CELL, CELL, bgC);
        if (isTarget) {
          game.draw.rect(cx2 + 4, cy2 + 4, CELL - 8, CELL - 8, C.targetHi, 0.15);
        }

        // Painted state
        if (paintState === 1) {
          game.draw.rect(cx2, cy2, CELL, CELL, C.painted);
          game.draw.rect(cx2 + 8, cy2 + 8, CELL - 16, CELL / 3, C.paintedHi, 0.4);
        } else if (paintState === -1) {
          game.draw.rect(cx2, cy2, CELL, CELL, C.wrong, 0.7);
        }

        // Cursor
        if (c === curCol && r === curRow) {
          var pulse = 0.6 + 0.4 * Math.sin(game.time.elapsed * 10);
          game.draw.rect(cx2 - 4, cy2 - 4, CELL + 8, CELL + 8, '#fff', pulse);
          game.draw.rect(cx2, cy2, CELL, CELL, '#fff', 0.2);
        }
      }
    }

    // Guide
    game.draw.text('スワイプで塗れ！', W / 2, H - 220, { size: 52, color: C.ui });
    game.draw.text('80%以上でクリア', W / 2, H - 155, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    // Paint starting position
    paint(curCol, curRow);
  });
})(game);
