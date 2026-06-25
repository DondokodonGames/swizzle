// 107-pixel-paint.js
// ピクセルペイント — シルエットを見て正しい色でドット絵を完成させる塗り絵ゲーム
// 操作: 色をタップして選択、マスをタップして塗る
// 成功: 90%以上正確に塗る  失敗: 10回間違える or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#070809',
    grid:    '#0f1117',
    gridLine:'#1a1d24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    empty:   '#141720',
    ui:      '#334155'
  };

  var PALETTE = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8', '#ffffff'
  ];

  var COLS = 8, ROWS = 8;
  var CELL = 92;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.2;

  // Target pixel art (a simple face)
  var TARGET = [
    [0,0,3,3,3,3,0,0],
    [0,3,7,7,7,7,3,0],
    [3,7,0,7,0,7,7,3],
    [3,7,7,7,7,7,7,3],
    [3,7,0,7,7,0,7,3],
    [3,7,7,0,0,7,7,3],
    [0,3,7,7,7,7,3,0],
    [0,0,3,3,3,3,0,0]
  ];
  // 0=transparent, 3=skin(#f97316), 7=face(#fbbf24), etc.
  var COLOR_MAP = { 0: null, 3: '#f97316', 7: '#fbbf24' };

  // Player grid
  var playerGrid = [];
  for (var r = 0; r < ROWS; r++) {
    playerGrid.push(new Array(COLS).fill(-1)); // -1 = unpainted
  }

  var selectedColor = 0; // palette index
  var misses = 0;
  var maxMisses = 10;
  var painted = 0;
  var totalPaintable = 0;
  var correctPainted = 0;

  // Count paintable cells
  for (var tr = 0; tr < ROWS; tr++) {
    for (var tc = 0; tc < COLS; tc++) {
      if (TARGET[tr][tc] !== 0) totalPaintable++;
    }
  }

  var PICKER_Y = H * 0.82;
  var PICKER_GAP = 88;
  var PICKER_R = 36;
  var PICKER_START = W / 2 - (PALETTE.length - 1) / 2 * PICKER_GAP;

  var timeLeft = 50;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function checkComplete() {
    var correct = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var target = TARGET[r][c];
        if (target === 0) continue;
        var targetColor = COLOR_MAP[target];
        var playerColorIdx = playerGrid[r][c];
        if (playerColorIdx >= 0 && PALETTE[playerColorIdx] === targetColor) correct++;
      }
    }
    return correct;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Check palette
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PICKER_START + i * PICKER_GAP;
      var dx = tx - px, dy = ty - PICKER_Y;
      if (Math.sqrt(dx * dx + dy * dy) < PICKER_R + 12) {
        selectedColor = i;
        game.audio.play('se_tap', 0.3);
        return;
      }
    }

    // Check grid
    var col = Math.floor((tx - GRID_X) / CELL);
    var row = Math.floor((ty - GRID_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    var target = TARGET[row][col];
    if (target === 0) return; // transparent cell

    var targetColor = COLOR_MAP[target];
    var chosenColor = PALETTE[selectedColor];

    if (playerGrid[row][col] >= 0) return; // already painted

    playerGrid[row][col] = selectedColor;
    painted++;

    if (chosenColor === targetColor) {
      feedbackOk = true;
      feedback = 0.2;
      game.audio.play('se_tap', 0.8);
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.25;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    // Check completion
    if (painted >= totalPaintable) {
      var correct2 = checkComplete();
      var pct = correct2 / totalPaintable;
      done = true;
      if (pct >= 0.9) {
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.round(pct * 300) + Math.ceil(timeLeft) * 5); }, 400);
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

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var gx = GRID_X + c2 * CELL;
        var gy = GRID_Y + r2 * CELL;
        var target2 = TARGET[r2][c2];

        if (target2 === 0) {
          // Transparent — dark
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.bg);
        } else {
          var playerCI = playerGrid[r2][c2];
          if (playerCI >= 0) {
            // Painted
            game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, PALETTE[playerCI]);
            // Correct/wrong indicator
            var tgtClr = COLOR_MAP[target2];
            if (PALETTE[playerCI] === tgtClr) {
              game.draw.rect(gx + 2, gy + 2, CELL - 4, 4, '#22c55e', 0.5);
            } else {
              game.draw.line(gx + 2, gy + 2, gx + CELL - 2, gy + CELL - 2, '#ef4444', 4);
            }
          } else {
            // Unpainted — show subtle silhouette
            game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.empty);
            game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, COLOR_MAP[target2], 0.08);
          }
        }

        // Grid line
        game.draw.rect(gx, gy, CELL, 2, C.gridLine);
        game.draw.rect(gx, gy, 2, CELL, C.gridLine);
      }
    }
    // Right/bottom borders
    game.draw.rect(GRID_X + COLS * CELL, GRID_Y, 2, ROWS * CELL, C.gridLine);
    game.draw.rect(GRID_X, GRID_Y + ROWS * CELL, COLS * CELL + 2, 2, C.gridLine);

    // Palette
    for (var pi = 0; pi < PALETTE.length; pi++) {
      var ppx = PICKER_START + pi * PICKER_GAP;
      var isSelected = pi === selectedColor;
      if (isSelected) {
        game.draw.circle(ppx, PICKER_Y, PICKER_R + 10, '#fff', 0.3);
      }
      game.draw.circle(ppx, PICKER_Y, PICKER_R, PALETTE[pi]);
      if (isSelected) {
        game.draw.circle(ppx, PICKER_Y, PICKER_R - 8, '#fff', 0.2);
      }
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '正解！' : '違う色！', W / 2, H * 0.12, {
        size: 56, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Mistakes left
    for (var mi = 0; mi < maxMisses; mi++) {
      var mxi = W / 2 + (mi - (maxMisses - 1) / 2) * 52;
      game.draw.circle(mxi, H * 0.91, 16, mi < misses ? C.wrong : '#1a1d24');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, '#070809');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#8b5cf6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
