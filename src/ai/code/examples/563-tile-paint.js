// 563-tile-paint.js
// タイルペイント — スワイプでブラシを走らせてタイルを指定色に塗る
// 操作: スワイプで塗る、タップで色変更
// 成功: 90%塗装完了を3回  失敗: 120秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#1a1a28',
    grid:    '#0a0a18',
    color0:  '#ef4444',
    color1:  '#3b82f6',
    color2:  '#22c55e',
    color3:  '#f59e0b',
    color4:  '#a855f7',
    unpainted:'#1a1a2e',
    brush:   '#ffffff',
    text:    '#f1f5f9',
    ui:      '#374151',
    win:     '#22c55e'
  };

  var PAINT_COLORS = [C.color0, C.color1, C.color2, C.color3, C.color4];
  var COLS = 8, ROWS = 10;
  var CELL = Math.floor(W / COLS);
  var OY = H * 0.24;
  var GRID_H = ROWS * CELL;

  var grid = []; // -1 = unpainted, 0-4 = color index
  var targetPattern = []; // which color each cell should be
  var currentColor = 0;
  var painted = 0;
  var totalCells = COLS * ROWS;
  var completions = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 120;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var lastBrushX = -1, lastBrushY = -1;
  var completion = 0;

  function initLevel() {
    grid = [];
    targetPattern = [];
    painted = 0;
    // Assign random target colors per cell in blocks
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        grid.push(-1);
        // Target: simple stripes or blocks
        var colorIdx = Math.floor(Math.random() * PAINT_COLORS.length);
        targetPattern.push(colorIdx);
      }
    }
  }

  function getCell(tx, ty) {
    var c = Math.floor(tx / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  function paintCell(idx) {
    if (idx < 0) return;
    if (grid[idx] !== currentColor) {
      if (grid[idx] === targetPattern[idx]) painted--; // undo correct paint
      grid[idx] = currentColor;
      if (currentColor === targetPattern[idx]) painted++;
    }
  }

  function calcCompletion() {
    var correct = 0;
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] === targetPattern[i]) correct++;
    }
    return correct / totalCells;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Paint cells along swipe path
    var steps = Math.ceil(Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)) / (CELL * 0.5));
    steps = Math.max(steps, 1);
    for (var s = 0; s <= steps; s++) {
      var sx = x1 + (x2 - x1) * s / steps;
      var sy = y1 + (y2 - y1) * s / steps;
      paintCell(getCell(sx, sy));
    }
    game.audio.play('se_tap', 0.1);
    completion = calcCompletion();
    if (completion >= 0.9) {
      completions++;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.9);
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: OY + GRID_H / 2, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, life: 0.6, col: PAINT_COLORS[currentColor] });
      }
      if (completions >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(completions * 1000 + Math.ceil(timeLeft) * 50); }, 700);
      } else {
        setTimeout(function() { if (!done) initLevel(); }, 900);
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty < OY) {
      // Color selector area
      var colorW = W / PAINT_COLORS.length;
      var ci = Math.floor(tx / colorW);
      if (ci >= 0 && ci < PAINT_COLORS.length) {
        currentColor = ci;
        game.audio.play('se_tap', 0.3);
      }
      return;
    }
    paintCell(getCell(tx, ty));
    completion = calcCompletion();
    game.audio.play('se_tap', 0.15);
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
    if (flashAnim > 0) flashAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 1.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Color selector
    for (var ci = 0; ci < PAINT_COLORS.length; ci++) {
      var cw = W / PAINT_COLORS.length;
      var isSelected = ci === currentColor;
      game.draw.rect(ci * cw + 4, 80, cw - 8, 100, PAINT_COLORS[ci], isSelected ? 0.95 : 0.5);
      if (isSelected) {
        game.draw.rect(ci * cw + 4, 80, cw - 8, 8, '#fff', 0.8);
        game.draw.text('▼', ci * cw + cw / 2, 192, { size: 28, color: PAINT_COLORS[ci] });
      }
    }

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var idx = r * COLS + c;
        var gx = c * CELL, gy = OY + r * CELL;
        var cellColor = grid[idx];
        var targetColor = PAINT_COLORS[targetPattern[idx]];

        // Target color (small dot)
        game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, targetColor, 0.2);

        // Painted color
        if (cellColor >= 0) {
          var isCorrect = cellColor === targetPattern[idx];
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, PAINT_COLORS[cellColor], isCorrect ? 0.9 : 0.7);
          if (isCorrect) {
            game.draw.circle(gx + CELL / 2, gy + CELL / 2, 10, '#fff', 0.3);
          }
        } else {
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.unpainted, 0.8);
        }

        // Grid lines
        game.draw.line(gx, gy, gx + CELL, gy, C.grid, 1);
        game.draw.line(gx, gy, gx, gy + CELL, C.grid, 1);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.win, flashAnim * 0.1);

    // Completion bar
    var compW = W * 0.7;
    var compX = (W - compW) / 2;
    var compY = OY + GRID_H + 40;
    game.draw.rect(compX, compY, compW, 24, C.ui, 0.4);
    game.draw.rect(compX, compY, compW * completion, 24, completion >= 0.9 ? C.win : PAINT_COLORS[currentColor], 0.9);
    game.draw.text(Math.round(completion * 100) + '%', W / 2, compY + 60, { size: 44, color: C.text, bold: true });

    game.draw.text(completions + ' / ' + NEEDED, W / 2, 44, { size: 44, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 120);
    game.draw.rect(0, 0, W, 12, '#001');
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.color2 : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W - 60, 44, { size: 36, color: ratio > 0.3 ? C.text : '#ef4444' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initLevel();
  });
})(game);
