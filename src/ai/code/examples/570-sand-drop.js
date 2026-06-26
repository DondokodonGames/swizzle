// 570-sand-drop.js
// サンドドロップ — 砂粒を積み上げてターゲットラインを超えさせる
// 操作: タップで砂を落とす位置を選ぶ
// 成功: 5本のカラムでラインを超える  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0806',
    sand:   '#d97706',
    sandHi: '#fbbf24',
    sandDk: '#92400e',
    target: '#22c55e',
    targetHi:'#86efac',
    column: '#1c1410',
    colBdr: '#3a2810',
    text:   '#f1f5f9',
    ui:     '#374151',
    win:    '#22c55e'
  };

  var NUM_COLS = 5;
  var COL_W = 140;
  var COL_GAP = (W - NUM_COLS * COL_W) / (NUM_COLS + 1);
  var COL_H = H * 0.55;
  var COL_Y = H * 0.28;
  var TARGET_H = COL_H * 0.7; // target line at 70% of column
  var MAX_SAND_PER_COL = Math.floor(COL_H / 8);

  var columns = []; // sand levels per column (0 = empty, max = full)
  var filledCols = 0;
  var NEEDED_COLS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var dropping = []; // {col, x, y, vy} falling sand particles
  var flashAnim = 0;
  var colComplete = [];

  function initCols() {
    columns = [];
    colComplete = [];
    for (var i = 0; i < NUM_COLS; i++) {
      columns.push(0);
      colComplete.push(false);
    }
  }

  function getColX(i) {
    return COL_GAP + i * (COL_W + COL_GAP) + COL_W / 2;
  }

  function dropSand(colIdx) {
    if (colIdx < 0 || colIdx >= NUM_COLS) return;
    if (columns[colIdx] >= MAX_SAND_PER_COL) return;
    // Drop a sand particle visually
    dropping.push({
      col: colIdx,
      x: getColX(colIdx) + (Math.random() - 0.5) * 30,
      y: COL_Y - 40,
      vy: 100,
      r: 10
    });
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which column
    for (var i = 0; i < NUM_COLS; i++) {
      var cx = getColX(i);
      if (Math.abs(tx - cx) < COL_W * 0.6) {
        dropSand(i);
        dropSand(i); // drop a few at once for satisfying feel
        dropSand(i);
        return;
      }
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Swipe spreads sand across tapped area
    var col1 = Math.floor((x1 - COL_GAP * 0.5) / (COL_W + COL_GAP));
    var col2 = Math.floor((x2 - COL_GAP * 0.5) / (COL_W + COL_GAP));
    var minC = Math.max(0, Math.min(col1, col2));
    var maxC = Math.min(NUM_COLS - 1, Math.max(col1, col2));
    for (var ci = minC; ci <= maxC; ci++) {
      dropSand(ci);
      dropSand(ci);
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
    if (flashAnim > 0) flashAnim -= dt * 2.5;

    // Update falling sand
    for (var di = dropping.length - 1; di >= 0; di--) {
      var d = dropping[di];
      d.vy += 800 * dt;
      d.y += d.vy * dt;
      d.x += (Math.random() - 0.5) * 20 * dt;

      var col = d.col;
      var stackH = columns[col] * 8;
      var landY = COL_Y + COL_H - stackH;

      if (d.y >= landY - d.r) {
        // Land
        columns[col] = Math.min(MAX_SAND_PER_COL, columns[col] + 1);

        // Check if this col reached target
        if (!colComplete[col] && columns[col] * 8 >= TARGET_H) {
          colComplete[col] = true;
          filledCols++;
          game.audio.play('se_success', 0.7);
          flashAnim = 0.3;
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: getColX(col), y: COL_Y + COL_H - TARGET_H, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.targetHi });
          }
          if (filledCols >= NEEDED_COLS && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(filledCols * 1000 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
        dropping.splice(di, 1);
        continue;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Columns
    for (var i = 0; i < NUM_COLS; i++) {
      var cx = getColX(i) - COL_W / 2;
      // Column background
      game.draw.rect(cx, COL_Y, COL_W, COL_H, C.column, 0.95);
      game.draw.rect(cx, COL_Y, 8, COL_H, C.colBdr, 0.9);
      game.draw.rect(cx + COL_W - 8, COL_Y, 8, COL_H, C.colBdr, 0.9);

      // Target line
      var targetY = COL_Y + COL_H - TARGET_H;
      game.draw.line(cx, targetY, cx + COL_W, targetY, C.target, 4);
      game.draw.rect(cx, targetY - 8, COL_W, 8, C.target, 0.15);

      // Sand
      var sandH = columns[i] * 8;
      if (sandH > 0) {
        var sandY = COL_Y + COL_H - sandH;
        // Multi-layer sand effect
        game.draw.rect(cx + 4, sandY, COL_W - 8, sandH, C.sandDk, 0.9);
        game.draw.rect(cx + 4, sandY, COL_W - 8, Math.min(16, sandH), C.sand, 0.7);
        // Sand surface shimmer
        if (sandH > 4) {
          game.draw.rect(cx + 4, sandY, COL_W - 8, 6, C.sandHi, 0.5);
          // Grainy texture via small rects
          for (var gi = 0; gi < 6; gi++) {
            var gx = cx + 4 + gi * ((COL_W - 8) / 6);
            var gy = sandY + 8 + (gi % 2) * 8;
            game.draw.rect(gx, gy, 8, 8, C.sandHi, 0.2);
          }
        }
      }

      // Complete indicator
      if (colComplete[i]) {
        game.draw.rect(cx + 4, COL_Y, COL_W - 8, 30, C.win, 0.4);
        game.draw.text('✓', getColX(i), COL_Y + 24, { size: 28, color: C.win, bold: true });
      }

      // Progress text
      var pct = Math.min(100, Math.round(columns[i] * 8 / TARGET_H * 100));
      game.draw.text(pct + '%', getColX(i), COL_Y + COL_H + 40, { size: 32, color: pct >= 100 ? C.win : C.text });
    }

    // Falling sand particles
    for (var di2 = 0; di2 < dropping.length; di2++) {
      var d2 = dropping[di2];
      game.draw.circle(d2.x, d2.y, d2.r, C.sand, 0.85);
      game.draw.circle(d2.x - 3, d2.y - 3, d2.r * 0.3, C.sandHi, 0.5);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.win, flashAnim * 0.08);

    game.draw.text(filledCols + ' / ' + NEEDED_COLS + ' 列クリア', W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.sand : C.win);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initCols();
  });
})(game);
