// 343-bubble-pop.js
// バブルポップ — 重なる前に同色バブルを3つ繋げて消す
// 操作: タップでバブルを選択、隣接する同色に繋げて消す
// 成功: 30個消す  失敗: バブルが画面上端に到達 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030015',
    panel:  '#0a0028',
    ui:     '#6366f1',
    text:   '#e0e7ff',
    sel:    '#fff',
    warn:   '#ef4444'
  };

  var COLS = 7;
  var ROWS = 10;
  var CELL = 130;
  var OX = (W - COLS * CELL) / 2 + CELL / 2;
  var OY = 280;

  var COLORS = ['#ef4444','#22c55e','#3b82f6','#f59e0b','#a855f7'];

  var grid = [];
  var selected = [];
  var popped = 0;
  var NEEDED = 30;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var fallTimer = 0;
  var FALL_INTERVAL = 3.0;
  var particles = [];
  var popAnim = [];

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) {
        // Only fill bottom 5 rows initially
        if (r >= ROWS - 5) {
          grid[r].push(Math.floor(Math.random() * COLORS.length));
        } else {
          grid[r].push(-1);
        }
      }
    }
  }

  function addRow() {
    // Shift everything up
    for (var r = 0; r < ROWS - 1; r++) {
      grid[r] = grid[r + 1].slice();
    }
    // New row at bottom
    var newRow = [];
    for (var c2 = 0; c2 < COLS; c2++) {
      newRow.push(Math.floor(Math.random() * COLORS.length));
    }
    grid[ROWS - 1] = newRow;
  }

  function checkTopReached() {
    for (var c = 0; c < COLS; c++) {
      if (grid[0][c] >= 0) return true;
    }
    return false;
  }

  function getNeighbors(r, c) {
    var ns = [];
    var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var d = 0; d < dirs.length; d++) {
      var nr = r + dirs[d][0], nc = c + dirs[d][1];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) ns.push([nr, nc]);
    }
    return ns;
  }

  function tryPop() {
    if (selected.length < 3) {
      selected = [];
      return;
    }
    // All same color
    var col = grid[selected[0][0]][selected[0][1]];
    var cx2 = OX + selected[0][1] * CELL;
    var cy2 = OY + selected[0][0] * CELL;
    for (var i = 0; i < selected.length; i++) {
      grid[selected[i][0]][selected[i][1]] = -1;
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: OX + selected[i][1] * CELL, y: OY + selected[i][0] * CELL, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: COLORS[col] });
      }
    }
    popped += selected.length;
    popAnim.push({ x: W / 2, y: H * 0.5, text: '+' + selected.length, life: 0.8 });
    game.audio.play('se_success', 0.6);
    selected = [];
    if (popped >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(popped * 80 + Math.ceil(timeLeft) * 60); }, 400);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    var col2 = Math.round((tx - OX) / CELL);
    var row2 = Math.round((ty - OY) / CELL);
    if (col2 < 0 || col2 >= COLS || row2 < 0 || row2 >= ROWS) {
      selected = [];
      return;
    }
    if (grid[row2][col2] < 0) {
      selected = [];
      return;
    }

    // If no selection, start
    if (selected.length === 0) {
      selected = [[row2, col2]];
      game.audio.play('se_tap', 0.2);
      return;
    }

    // Must be same color
    var selColor = grid[selected[0][0]][selected[0][1]];
    if (grid[row2][col2] !== selColor) {
      selected = [[row2, col2]];
      game.audio.play('se_tap', 0.2);
      return;
    }

    // Must be adjacent to last selected
    var last = selected[selected.length - 1];
    if (Math.abs(row2 - last[0]) + Math.abs(col2 - last[1]) !== 1) {
      selected = [];
      return;
    }

    // Must not already be selected
    for (var si = 0; si < selected.length; si++) {
      if (selected[si][0] === row2 && selected[si][1] === col2) {
        // Double tap last = pop attempt
        if (si === selected.length - 1) tryPop();
        return;
      }
    }

    selected.push([row2, col2]);
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    fallTimer -= dt;
    if (fallTimer <= 0 && !done) {
      addRow();
      fallTimer = Math.max(0.8, FALL_INTERVAL - elapsed * 0.05);
      if (checkTopReached() && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 300);
        return;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }
    for (var pa = popAnim.length - 1; pa >= 0; pa--) {
      popAnim[pa].y -= 80 * dt;
      popAnim[pa].life -= dt;
      if (popAnim[pa].life <= 0) popAnim.splice(pa, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c3 = 0; c3 < COLS; c3++) {
        var val = grid[r2][c3];
        var bx = OX + c3 * CELL;
        var by = OY + r2 * CELL;
        game.draw.circle(bx, by, 50, '#111', 0.5);
        if (val >= 0) {
          game.draw.circle(bx, by, 50, COLORS[val], 0.85);
          game.draw.circle(bx - 14, by - 14, 16, '#fff', 0.3);
        }
      }
    }

    // Selection highlight
    for (var si2 = 0; si2 < selected.length; si2++) {
      var sr = selected[si2][0], sc = selected[si2][1];
      var sx = OX + sc * CELL, sy = OY + sr * CELL;
      game.draw.circle(sx, sy, 56, C.sel, 0.35);
      if (si2 > 0) {
        var pr = selected[si2 - 1][0], pc = selected[si2 - 1][1];
        game.draw.line(OX + pc * CELL, OY + pr * CELL, sx, sy, C.sel, 5);
      }
    }
    if (selected.length > 0) {
      var selCol = grid[selected[0][0]][selected[0][1]];
      game.draw.text(selected.length + '/3', W / 2, H * 0.84, { size: 44, color: selected.length >= 3 ? COLORS[selCol] : C.ui });
      if (selected.length >= 3) {
        game.draw.text('もう一度タップで消す！', W / 2, H * 0.89, { size: 32, color: COLORS[selCol] });
      }
    }

    // Pop animations
    for (var pa2 = 0; pa2 < popAnim.length; pa2++) {
      var p2 = popAnim[pa2];
      game.draw.text(p2.text, p2.x, p2.y, { size: 64, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 12 * p3.life, p3.col, p3.life * 0.8);
    }

    // Fall timer bar
    var fallRatio = fallTimer / FALL_INTERVAL;
    game.draw.rect(0, H * 0.82, W, 12, '#1a1a2e', 0.8);
    game.draw.rect(0, H * 0.82, W * Math.max(0, fallRatio), 12, C.ui, 0.8);

    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ui : C.warn);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGrid();
    fallTimer = FALL_INTERVAL;
  });
})(game);
