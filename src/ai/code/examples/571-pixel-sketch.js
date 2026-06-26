// 571-pixel-sketch.js
// ピクセルスケッチ — お題の輪郭に合わせてドット絵を描く
// 操作: スワイプでドットを置く、タップで色チェンジ
// 成功: 80%のドットが正しい位置  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0f0f1a',
    empty:   '#1a1a2e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    target:  '#334466',
    text:    '#f1f5f9',
    ui:      '#374151',
    win:     '#22c55e',
    border:  '#0a0a18'
  };

  var DRAW_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

  var COLS = 10, ROWS = 12;
  var CELL = Math.floor(W * 0.85 / COLS);
  var OX = (W - COLS * CELL) / 2;
  var OY = H * 0.22;

  // Target patterns (simple pixel art templates)
  var TEMPLATES = [
    // Heart shape
    [
      0,0,1,1,0,0,1,1,0,0,
      0,1,1,1,1,1,1,1,1,0,
      0,1,1,1,1,1,1,1,1,0,
      0,1,1,1,1,1,1,1,1,0,
      0,0,1,1,1,1,1,1,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0
    ],
    // Star shape
    [
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,1,1,1,1,0,0,0,
      1,1,1,1,1,1,1,1,1,1,
      0,1,1,1,1,1,1,1,1,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,0,1,1,0,1,1,0,
      1,1,0,0,1,1,0,0,1,1,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0
    ],
    // Arrow up
    [
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,0,1,1,0,1,1,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0
    ]
  ];

  var currentTemplate = 0;
  var targetGrid = [];
  var userGrid = []; // -1 = empty, 0-4 = color index
  var currentColor = 0;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var completions = 0;
  var NEEDED = 1;
  var accuracy = 0;

  function loadTemplate(idx) {
    var tmpl = TEMPLATES[idx % TEMPLATES.length];
    targetGrid = tmpl.slice(0, COLS * ROWS);
    userGrid = [];
    for (var i = 0; i < COLS * ROWS; i++) userGrid.push(-1);
    accuracy = 0;
  }

  function calcAccuracy() {
    var targetCells = 0, correctCells = 0;
    for (var i = 0; i < targetGrid.length; i++) {
      if (targetGrid[i] === 1) {
        targetCells++;
        if (userGrid[i] >= 0) correctCells++;
      }
    }
    return targetCells > 0 ? correctCells / targetCells : 0;
  }

  function paintCell(tx, ty) {
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var i = r * COLS + c;
    userGrid[i] = currentColor;
    accuracy = calcAccuracy();
    if (accuracy >= 0.8 && !done) {
      completions++;
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(Math.round(accuracy * 2000) + Math.ceil(timeLeft) * 50); }, 700);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Color selector at bottom
    var numColors = DRAW_COLORS.length;
    var btnW = W * 0.8 / numColors;
    var btnX = W * 0.1;
    var btnY = OY + ROWS * CELL + 40;
    if (ty >= btnY && ty <= btnY + 100) {
      var ci = Math.floor((tx - btnX) / btnW);
      if (ci >= 0 && ci < numColors) {
        currentColor = ci;
        game.audio.play('se_tap', 0.2);
        return;
      }
    }
    paintCell(tx, ty);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var steps = Math.ceil(Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)) / (CELL * 0.5));
    steps = Math.max(steps, 1);
    for (var s = 0; s <= steps; s++) {
      var sx = x1 + (x2 - x1) * s / steps;
      var sy = y1 + (y2 - y1) * s / steps;
      paintCell(sx, sy);
    }
    game.audio.play('se_tap', 0.08);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var i = r * COLS + c;
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;
        var isTarget = targetGrid[i] === 1;

        // Cell background
        game.draw.rect(gx + 1, gy + 1, CELL - 2, CELL - 2, C.empty, 0.9);

        // Target hint (subtle)
        if (isTarget) {
          game.draw.rect(gx + 1, gy + 1, CELL - 2, CELL - 2, C.target, 0.4);
        }

        // User paint
        if (userGrid[i] >= 0) {
          var col = DRAW_COLORS[userGrid[i]];
          var isCorrect = (targetGrid[i] === 1);
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col, isCorrect ? 0.9 : 0.6);
          if (!isCorrect) {
            // Wrong placement marker
            game.draw.line(gx + 6, gy + 6, gx + CELL - 6, gy + CELL - 6, '#ffffff', 2);
          }
        }

        // Grid lines
        game.draw.line(gx, gy, gx + CELL, gy, C.border, 1);
        game.draw.line(gx, gy, gx, gy + CELL, C.border, 1);
      }
    }

    // Color buttons
    var numColors = DRAW_COLORS.length;
    var btnW = W * 0.8 / numColors;
    var btnX = W * 0.1;
    var btnY = OY + ROWS * CELL + 40;
    for (var ci = 0; ci < numColors; ci++) {
      var bx = btnX + ci * btnW;
      var isSelected = ci === currentColor;
      game.draw.rect(bx + 6, btnY, btnW - 12, 90, DRAW_COLORS[ci], isSelected ? 0.95 : 0.6);
      if (isSelected) {
        game.draw.rect(bx + 6, btnY, btnW - 12, 8, '#fff', 0.8);
      }
    }

    // Accuracy bar
    var accW = W * 0.7;
    var accX = (W - accW) / 2;
    var accY = btnY + 130;
    game.draw.rect(accX, accY, accW, 24, C.ui, 0.4);
    game.draw.rect(accX, accY, accW * accuracy, 24, accuracy >= 0.8 ? C.win : DRAW_COLORS[currentColor], 0.9);
    game.draw.text(Math.round(accuracy * 100) + '%', W / 2, accY + 60, { size: 44, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? '#a855f7' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('80%で完成!', W / 2, 80, { size: 36, color: accuracy >= 0.8 ? C.win : C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    loadTemplate(Math.floor(Math.random() * TEMPLATES.length));
  });
})(game);
