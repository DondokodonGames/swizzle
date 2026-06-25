// 278-crystal-match.js
// クリスタルマッチ — 3つ以上同じ色のクリスタルを揃えて消す宝石パズル
// 操作: タップでクリスタルを選択し、隣接するクリスタルと交換
// 成功: 100個消す  失敗: 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030210',
    c1:     '#ef4444',
    c1Hi:   '#fca5a5',
    c2:     '#3b82f6',
    c2Hi:   '#93c5fd',
    c3:     '#22c55e',
    c3Hi:   '#86efac',
    c4:     '#f59e0b',
    c4Hi:   '#fde68a',
    c5:     '#a855f7',
    c5Hi:   '#d8b4fe',
    select: '#fff',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var COLS = 6, ROWS = 8;
  var CW = Math.floor((W - 80) / COLS);
  var CH = Math.floor(H * 0.62 / ROWS);
  var OX = 40, OY = H * 0.2;
  var COLORS = [
    { col: C.c1, hi: C.c1Hi },
    { col: C.c2, hi: C.c2Hi },
    { col: C.c3, hi: C.c3Hi },
    { col: C.c4, hi: C.c4Hi },
    { col: C.c5, hi: C.c5Hi }
  ];

  var grid = [];
  var selected = null;
  var cleared = 0;
  var NEEDED = 100;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var fallingAnim = 0;

  function rndColor() { return Math.floor(Math.random() * COLORS.length); }

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        grid[r][c] = { col: rndColor(), flash: 0 };
      }
    }
  }

  function findMatches() {
    var matched = [];
    var mark = function(r, c) {
      for (var i = 0; i < matched.length; i++) {
        if (matched[i].r === r && matched[i].c === c) return;
      }
      matched.push({ r: r, c: c });
    };
    // Horizontal
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS - 2; c++) {
        var clr = grid[r][c].col;
        if (grid[r][c+1].col === clr && grid[r][c+2].col === clr) {
          mark(r,c); mark(r,c+1); mark(r,c+2);
          var k = 3;
          while (c + k < COLS && grid[r][c+k].col === clr) { mark(r,c+k); k++; }
        }
      }
    }
    // Vertical
    for (var r2 = 0; r2 < ROWS - 2; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var clr2 = grid[r2][c2].col;
        if (grid[r2+1][c2].col === clr2 && grid[r2+2][c2].col === clr2) {
          mark(r2,c2); mark(r2+1,c2); mark(r2+2,c2);
          var k2 = 3;
          while (r2 + k2 < ROWS && grid[r2+k2][c2].col === clr2) { mark(r2+k2,c2); k2++; }
        }
      }
    }
    return matched;
  }

  function clearMatches(matched) {
    for (var i = 0; i < matched.length; i++) {
      var r = matched[i].r, c = matched[i].c;
      var cx3 = OX + c * CW + CW / 2, cy3 = OY + r * CH + CH / 2;
      var col = COLORS[grid[r][c].col];
      for (var pi = 0; pi < 4; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: cx3, y: cy3, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: col.hi });
      }
      grid[r][c] = null;
    }
    cleared += matched.length;
    // Drop tiles down
    for (var c3 = 0; c3 < COLS; c3++) {
      var fill = [];
      for (var r3 = ROWS - 1; r3 >= 0; r3--) {
        if (grid[r3][c3] !== null) fill.push(grid[r3][c3]);
      }
      while (fill.length < ROWS) fill.push({ col: rndColor(), flash: 0 });
      for (var r4 = ROWS - 1; r4 >= 0; r4--) {
        grid[r4][c3] = fill[ROWS - 1 - r4];
      }
    }
    fallingAnim = 0.2;
    game.audio.play('se_success', 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done || fallingAnim > 0) return;
    var col = Math.floor((tx - OX) / CW);
    var row = Math.floor((ty - OY) / CH);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) { selected = null; return; }

    if (!selected) {
      selected = { col: col, row: row };
      game.audio.play('se_tap', 0.2);
    } else {
      var dc = Math.abs(col - selected.col), dr = Math.abs(row - selected.row);
      if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
        // Swap
        var tmp = grid[selected.row][selected.col];
        grid[selected.row][selected.col] = grid[row][col];
        grid[row][col] = tmp;
        var matches = findMatches();
        if (matches.length > 0) {
          clearMatches(matches);
        } else {
          // Swap back (invalid move)
          var tmp2 = grid[selected.row][selected.col];
          grid[selected.row][selected.col] = grid[row][col];
          grid[row][col] = tmp2;
          game.audio.play('se_failure', 0.3);
        }
      }
      selected = null;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (fallingAnim > 0) {
      fallingAnim -= dt;
      if (fallingAnim <= 0) {
        // Check for cascade
        var matches = findMatches();
        if (matches.length > 0) clearMatches(matches);
      }
    }

    if (cleared >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(cleared * 20 + Math.ceil(timeLeft) * 100); }, 400);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cx2 = OX + c * CW, cy2 = OY + r * CH;
        var cell = grid[r][c];
        if (!cell) continue;
        var cinfo = COLORS[cell.col];
        var isSelected = selected && selected.col === c && selected.row === r;
        var offset = fallingAnim > 0 ? (1 - fallingAnim / 0.2) * CH : 0;

        // Diamond shape via rotated rect illusion using two triangles of lines
        var cx3 = cx2 + CW / 2, cy3 = cy2 + CH / 2 - (fallingAnim > 0 ? CH * fallingAnim * 3 : 0);
        var rr = Math.min(CW, CH) * 0.42;

        game.draw.circle(cx3, cy3, rr, cinfo.col, isSelected ? 1.0 : 0.85);
        game.draw.circle(cx3, cy3, rr * 0.55, cinfo.hi, 0.4);
        game.draw.circle(cx3 - rr * 0.25, cy3 - rr * 0.25, rr * 0.18, '#fff', 0.5);

        if (isSelected) {
          game.draw.circle(cx3, cy3, rr + 10 + 5 * Math.sin(elapsed * 8), C.select, 0.4);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.9);
    }

    // Progress bar
    var prog = Math.min(1, cleared / NEEDED);
    game.draw.rect(40, H * 0.87, W - 80, 20, C.ui, 0.3);
    game.draw.rect(40, H * 0.87, (W - 80) * prog, 20, C.c3, 0.9);
    game.draw.text(cleared + ' / ' + NEEDED + ' 個', W / 2, H * 0.9, { size: 42, color: C.text, bold: true });
    game.draw.text('選んで隣と交換', W / 2, H * 0.93, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.c2 : C.c1);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGrid();
    // Ensure no initial matches
    var matches = findMatches();
    while (matches.length > 0) {
      initGrid();
      matches = findMatches();
    }
  });
})(game);
