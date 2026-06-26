// 462-stack-overflow.js
// スタックオーバーフロー — 積み上がるデータブロックが溢れる前にスワイプで削除
// 操作: スワイプでブロックの列を消去する
// 成功: 100ブロック処理  失敗: スタックが満杯 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000d06',
    col0:   '#22c55e',
    col1:   '#06b6d4',
    col2:   '#8b5cf6',
    col3:   '#f97316',
    col4:   '#ef4444',
    blockDk:'#0a1a0a',
    text2:  '#4ade80',
    textDk: '#0d2010',
    overflow:'#ef4444',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var COLS = 5;
  var ROWS = 12;
  var BLOCK_W = 180;
  var BLOCK_H = 80;
  var OX = (W - COLS * BLOCK_W) / 2;
  var STACK_TOP = 120;
  var OVERFLOW_Y = STACK_TOP + ROWS * BLOCK_H;

  var BLOCK_COLORS = [C.col0, C.col1, C.col2, C.col3, C.col4];
  var BLOCK_LABELS = ['if', 'for', 'fn', '{}', '=>'];

  var grid = [];  // grid[col][row] = { color, label, age }
  var spawnTimer = 0;
  var SPAWN_RATE = 0.6;
  var processed = 0;
  var NEEDED = 100;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var swipeCol = -1;  // which column was last swiped

  function initGrid() {
    grid = [];
    for (var c = 0; c < COLS; c++) {
      grid.push([]);
    }
  }

  function getColHeight(col) {
    return grid[col].length;
  }

  function addBlock(col) {
    var colorIdx = Math.floor(Math.random() * BLOCK_COLORS.length);
    grid[col].push({ color: BLOCK_COLORS[colorIdx], label: BLOCK_LABELS[colorIdx], age: 0 });
  }

  function clearColumn(col) {
    var count = grid[col].length;
    if (count === 0) return 0;
    // Add particles for each block
    for (var ri = 0; ri < count; ri++) {
      var bx = OX + col * BLOCK_W + BLOCK_W/2;
      var by = OVERFLOW_Y - (ri + 0.5) * BLOCK_H;
      for (var pi = 0; pi < 3; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: bx, y: by, vx: Math.cos(ang)*120, vy: Math.sin(ang)*80, life: 0.4, col: grid[col][ri].color });
      }
    }
    grid[col] = [];
    return count;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    // Determine which column based on swipe start (use dir + last touch - simplified)
    // Use vertical swipe to clear column that matches swipe direction: up=clear tallest col
    var targetCol = -1;
    if (dir === 'up' || dir === 'down') {
      // Clear tallest column
      var maxH = 0;
      for (var c = 0; c < COLS; c++) {
        if (grid[c].length > maxH) { maxH = grid[c].length; targetCol = c; }
      }
    } else {
      // Left/right: clear left-most or right-most column
      if (dir === 'left') {
        for (var c2 = 0; c2 < COLS; c2++) {
          if (grid[c2].length > 0) { targetCol = c2; break; }
        }
      } else {
        for (var c3 = COLS - 1; c3 >= 0; c3--) {
          if (grid[c3].length > 0) { targetCol = c3; break; }
        }
      }
    }
    if (targetCol < 0) return;

    swipeCol = targetCol;
    var count = clearColumn(targetCol);
    if (count > 0) {
      processed += count;
      game.audio.play('se_tap', 0.4);
      flashCol = C.correct;
      flashAnim = 0.3;
      if (processed >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(processed * 100 + Math.ceil(timeLeft) * 80); }, 700);
      }
    }
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

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Spawn blocks
    spawnTimer += dt;
    var spawnInterval = Math.max(0.25, SPAWN_RATE - processed * 0.003);
    if (spawnTimer >= spawnInterval && !done) {
      var col = Math.floor(Math.random() * COLS);
      addBlock(col);
      spawnTimer = 0;
      // Check overflow
      if (grid[col].length >= ROWS) {
        done = true;
        game.audio.play('se_failure', 0.7);
        for (var pi2 = 0; pi2 < 16; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          var bx2 = OX + col * BLOCK_W + BLOCK_W/2;
          particles.push({ x: bx2, y: STACK_TOP, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life: 0.6, col: C.overflow });
        }
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    // Age blocks
    for (var c4 = 0; c4 < COLS; c4++) {
      for (var r = 0; r < grid[c4].length; r++) {
        grid[c4][r].age += dt;
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Stack area background
    game.draw.rect(OX - 8, STACK_TOP - 8, COLS * BLOCK_W + 16, ROWS * BLOCK_H + 16, C.blockDk, 0.6);

    // Overflow warning line
    var overflowAlpha = 0.3 + Math.sin(elapsed * 10) * 0.2;
    game.draw.rect(OX - 8, STACK_TOP - 8, COLS * BLOCK_W + 16, 8, C.overflow, overflowAlpha);
    game.draw.text('OVERFLOW', OX - 8, STACK_TOP - 12, { size: 24, color: C.overflow });

    // Column dividers
    for (var c5 = 0; c5 <= COLS; c5++) {
      game.draw.line(OX + c5 * BLOCK_W, STACK_TOP, OX + c5 * BLOCK_W, OVERFLOW_Y, C.blockDk, 3);
    }

    // Blocks
    for (var c6 = 0; c6 < COLS; c6++) {
      var height = grid[c6].length;
      for (var r2 = 0; r2 < height; r2++) {
        var block = grid[c6][r2];
        var bx3 = OX + c6 * BLOCK_W;
        var by2 = OVERFLOW_Y - (r2 + 1) * BLOCK_H;
        game.draw.rect(bx3 + 4, by2 + 4, BLOCK_W - 8, BLOCK_H - 8, block.color, 0.85);
        game.draw.rect(bx3 + 4, by2 + 4, BLOCK_W - 8, 8, '#fff', 0.15);
        game.draw.text(block.label, bx3 + BLOCK_W/2, by2 + BLOCK_H*0.6, { size: 34, color: C.textDk, bold: true });

        // Danger glow if near top
        if (r2 > ROWS - 4) {
          game.draw.rect(bx3 + 4, by2 + 4, BLOCK_W - 8, BLOCK_H - 8, C.overflow, (r2 - (ROWS-4)) * 0.15);
        }
      }

      // Column height indicator
      var hRatio = height / ROWS;
      var indCol = hRatio > 0.7 ? C.overflow : hRatio > 0.4 ? C.col3 : C.col0;
      game.draw.text(height + '', OX + c6 * BLOCK_W + BLOCK_W/2, OVERFLOW_Y + 40, { size: 34, color: indCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Instructions
    game.draw.text('スワイプで列を削除', W/2, OVERFLOW_Y + 80, { size: 36, color: C.ui });
    game.draw.text('処理済: ' + processed + ' / ' + NEEDED, W/2, OVERFLOW_Y + 120, { size: 38, color: C.text2, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.col0 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initGrid();
    // Pre-fill a bit
    for (var i = 0; i < 8; i++) {
      addBlock(Math.floor(Math.random() * COLS));
    }
  });
})(game);
