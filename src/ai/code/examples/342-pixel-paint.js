// 342-pixel-paint.js
// ピクセルペイント — お題の絵に合わせてドット絵を完成させる
// 操作: タップでピクセルを塗る（指定の色で）
// 成功: 3枚の絵を完成  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a10',
    gridBg: '#111118',
    gridLine:'#1e1e2e',
    ui:     '#475569',
    text:   '#f1f5f9',
    correct:'#22c55e',
    correctHi:'#86efac',
    wrong:  '#ef4444'
  };

  var GRID_SIZE = 8; // 8x8 pixels
  var CELL = 80;
  var GRID_LEFT = (W - GRID_SIZE * CELL) / 2;
  var GRID_TOP = H * 0.28;

  // Simple 8x8 pixel art patterns (0=empty, 1-4=colors)
  var PATTERNS = [
    // Heart
    [
      [0,1,1,0,0,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0]
    ],
    // Star
    [
      [0,0,0,1,1,0,0,0],
      [0,0,0,1,1,0,0,0],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,1,0,0,0,0,1,0],
      [1,0,0,0,0,0,0,1],
      [0,0,0,0,0,0,0,0]
    ],
    // House
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [0,2,2,2,2,2,2,0],
      [0,2,2,3,3,2,2,0],
      [0,2,2,3,3,2,2,0],
      [0,2,2,2,2,2,2,0]
    ]
  ];

  var PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];
  var PALETTE_NAMES = ['赤', '緑', '青', '黄'];

  var currentPattern = 0;
  var grid = [];
  var target = [];
  var selectedColor = 1;
  var picsDone = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var completionAnim = 0;
  var particles = [];

  function initGrid() {
    target = PATTERNS[currentPattern % PATTERNS.length];
    grid = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      grid.push([]);
      for (var c = 0; c < GRID_SIZE; c++) {
        grid[r].push(0);
      }
    }
  }

  function countCorrect() {
    var correct = 0;
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === target[r][c]) correct++;
      }
    }
    return correct;
  }

  function checkComplete() {
    return countCorrect() === GRID_SIZE * GRID_SIZE;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Check palette tap
    var palY = H * 0.84;
    for (var pi = 0; pi < PALETTE.length; pi++) {
      var px = W * 0.15 + pi * W * 0.2;
      if (Math.hypot(tx - px, ty - palY) < 44) {
        selectedColor = pi + 1;
        game.audio.play('se_tap', 0.2);
        return;
      }
    }

    // Check grid tap
    var col = Math.floor((tx - GRID_LEFT) / CELL);
    var row = Math.floor((ty - GRID_TOP) / CELL);
    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      var needed = target[row][col];
      if (needed === 0) {
        // Erase
        grid[row][col] = 0;
      } else {
        grid[row][col] = selectedColor === needed ? selectedColor : selectedColor;
      }
      game.audio.play('se_tap', 0.2);

      if (checkComplete()) {
        picsDone++;
        completionAnim = 1.0;
        game.audio.play('se_success', 0.7);
        for (var p2i = 0; p2i < 12; p2i++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.7, col: PALETTE[Math.floor(Math.random() * 4)] });
        }
        if (picsDone >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(picsDone * 500 + Math.ceil(timeLeft) * 100); }, 600);
          return;
        }
        currentPattern++;
        setTimeout(function() { if (!done) initGrid(); }, 800);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (completionAnim > 0) completionAnim -= dt * 1.5;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid background
    game.draw.rect(GRID_LEFT - 4, GRID_TOP - 4, GRID_SIZE * CELL + 8, GRID_SIZE * CELL + 8, C.gridLine, 0.9);
    game.draw.rect(GRID_LEFT, GRID_TOP, GRID_SIZE * CELL, GRID_SIZE * CELL, C.gridBg, 0.9);

    // Draw grid cells
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cx2 = GRID_LEFT + c * CELL;
        var cy = GRID_TOP + r * CELL;
        var targetVal = target[r][c];
        var gridVal = grid[r][c];
        var isCorrect = gridVal === targetVal;

        // Target hint (faint)
        if (targetVal > 0) {
          game.draw.rect(cx2 + 2, cy + 2, CELL - 4, CELL - 4, PALETTE[targetVal - 1], 0.12);
        }

        // Painted cell
        if (gridVal > 0) {
          var col = PALETTE[gridVal - 1];
          var alpha = isCorrect ? 0.9 : 0.6;
          game.draw.rect(cx2 + 2, cy + 2, CELL - 4, CELL - 4, col, alpha);
          if (!isCorrect) {
            // Wrong color indicator
            game.draw.rect(cx2 + CELL - 20, cy + 2, 18, 18, C.wrong, 0.8);
          }
        }

        // Grid line
        game.draw.line(cx2, GRID_TOP, cx2, GRID_TOP + GRID_SIZE * CELL, C.gridLine, 1);
        game.draw.line(GRID_LEFT, cy, GRID_LEFT + GRID_SIZE * CELL, cy, C.gridLine, 1);
      }
    }

    // Completion flash
    if (completionAnim > 0) {
      game.draw.rect(0, 0, W, H, C.correct, completionAnim * 0.2);
      game.draw.text('完成！', W / 2, H * 0.82, { size: 72, color: C.correctHi, bold: true });
    }

    // Palette
    game.draw.text('色を選ぶ:', W * 0.08, H * 0.84 + 10, { size: 28, color: C.ui });
    for (var pi2 = 0; pi2 < PALETTE.length; pi2++) {
      var px = W * 0.15 + pi2 * W * 0.2;
      var isSelected = selectedColor === pi2 + 1;
      game.draw.circle(px, H * 0.84, isSelected ? 46 : 36, PALETTE[pi2], isSelected ? 0.9 : 0.6);
      if (isSelected) {
        game.draw.circle(px, H * 0.84, 52, PALETTE[pi2], 0.3);
        game.draw.text('▼', px, H * 0.84 + 66, { size: 28, color: PALETTE[pi2] });
      }
    }

    // Progress
    var correctCount = countCorrect();
    var total = GRID_SIZE * GRID_SIZE;
    game.draw.text(correctCount + '/' + total, W * 0.88, H * 0.84, { size: 36, color: C.correctHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(picsDone + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? PALETTE[0] : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initGrid();
  });
})(game);
