// 303-balloon-pop.js
// 風船の連鎖 — 色の揃った風船にタップして連鎖反応で一気に弾けさせる
// 操作: タップで同色グループを消す（隣接する同色がまとめて消える）
// 成功: 120個消す  失敗: 風船が天井に達する or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#070012',
    c1:    '#ef4444', c1Hi: '#fca5a5',
    c2:    '#3b82f6', c2Hi: '#93c5fd',
    c3:    '#22c55e', c3Hi: '#86efac',
    c4:    '#f59e0b', c4Hi: '#fde68a',
    c5:    '#a855f7', c5Hi: '#d8b4fe',
    wall:  '#1e293b', wallHi: '#334155',
    ui:    '#475569', text: '#f1f5f9'
  };

  var COLORS = [
    { col: C.c1, hi: C.c1Hi },
    { col: C.c2, hi: C.c2Hi },
    { col: C.c3, hi: C.c3Hi },
    { col: C.c4, hi: C.c4Hi },
    { col: C.c5, hi: C.c5Hi }
  ];

  var COLS = 7;
  var ROWS = 12;
  var CELL = Math.floor(W * 0.9 / COLS);
  var OX = Math.floor((W - CELL * COLS) / 2);
  var OY = H * 0.15;

  var grid = []; // [row][col] = {colorIdx, y, wobble} or null
  var popped = 0;
  var NEEDED = 120;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var spawnTimer = 1.5;
  var popAnim = []; // {x, y, col, life}

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) {
        if (r >= ROWS - 5) {
          grid[r].push({ colorIdx: Math.floor(Math.random() * COLORS.length), wobble: Math.random() * Math.PI * 2 });
        } else {
          grid[r].push(null);
        }
      }
    }
  }

  function spawnRow() {
    // Shift grid up by one
    grid.shift();
    var newRow = [];
    for (var c = 0; c < COLS; c++) {
      newRow.push({ colorIdx: Math.floor(Math.random() * COLORS.length), wobble: Math.random() * Math.PI * 2 });
    }
    grid.push(newRow);
  }

  function getGroup(r, c, colorIdx, visited) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return [];
    if (!grid[r][c] || grid[r][c].colorIdx !== colorIdx) return [];
    var key = r + ',' + c;
    if (visited[key]) return [];
    visited[key] = true;
    var group = [{ r: r, c: c }];
    var neighbors = getGroup(r - 1, c, colorIdx, visited)
      .concat(getGroup(r + 1, c, colorIdx, visited))
      .concat(getGroup(r, c - 1, colorIdx, visited))
      .concat(getGroup(r, c + 1, colorIdx, visited));
    return group.concat(neighbors);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which cell was tapped
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    if (!grid[r] || !grid[r][c]) return;

    var colorIdx = grid[r][c].colorIdx;
    var group = getGroup(r, c, colorIdx, {});
    if (group.length < 2) {
      game.audio.play('se_failure', 0.2);
      return;
    }

    // Pop group
    var cx2 = OX + c * CELL + CELL / 2;
    var cy2 = OY + r * CELL + CELL / 2;
    game.audio.play('se_success', Math.min(1, 0.2 + group.length * 0.05));

    for (var gi = 0; gi < group.length; gi++) {
      var gr = group[gi];
      var bx = OX + gr.c * CELL + CELL / 2;
      var by = OY + gr.r * CELL + CELL / 2;
      grid[gr.r][gr.c] = null;
      popped++;
      popAnim.push({ x: bx, y: by, col: COLORS[colorIdx].hi, life: 0.6 });
      for (var pi = 0; pi < 4; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: bx, y: by, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: COLORS[colorIdx].hi });
      }
    }

    if (popped >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(popped * 30 + Math.ceil(timeLeft) * 100); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn new row
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnRow();
      spawnTimer = 1.8;
      // Check if top row has anything
      for (var c = 0; c < COLS; c++) {
        if (grid[0] && grid[0][c]) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 300);
          return;
        }
      }
    }

    // Wobble
    for (var r = 0; r < ROWS; r++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        if (grid[r] && grid[r][c2]) {
          grid[r][c2].wobble += dt * 2;
        }
      }
    }

    for (var pa = popAnim.length - 1; pa >= 0; pa--) {
      popAnim[pa].life -= dt * 2;
      if (popAnim[pa].life <= 0) popAnim.splice(pa, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Danger zone (top)
    game.draw.rect(OX, OY, COLS * CELL, CELL * 2, C.c1, 0.05);

    // Grid
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c3 = 0; c3 < COLS; c3++) {
        var cell = grid[r2] && grid[r2][c3];
        var cx3 = OX + c3 * CELL + CELL / 2;
        var cy3 = OY + r2 * CELL + CELL / 2;
        if (cell) {
          var wob = 2 * Math.sin(cell.wobble);
          var col = COLORS[cell.colorIdx];
          game.draw.circle(cx3, cy3 + wob, CELL * 0.4 + 4, col.col, 0.15);
          game.draw.circle(cx3, cy3 + wob, CELL * 0.4, col.col, 0.9);
          game.draw.circle(cx3 - CELL * 0.1, cy3 + wob - CELL * 0.1, CELL * 0.12, col.hi, 0.5);
          // String
          game.draw.line(cx3, cy3 + wob + CELL * 0.4, cx3 + Math.sin(cell.wobble * 0.3) * 5, cy3 + CELL / 2 + 8, col.hi, 2);
        }
      }
    }

    // Pop animations
    for (var pa2 = 0; pa2 < popAnim.length; pa2++) {
      var pa3 = popAnim[pa2];
      game.draw.circle(pa3.x, pa3.y, 30 * pa3.life * 3, pa3.col, pa3.life);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Floor
    game.draw.rect(OX - 8, OY + ROWS * CELL, COLS * CELL + 16, 16, C.wallHi, 0.9);

    game.draw.text('2つ以上同色をタップ', W / 2, H * 0.89, { size: 38, color: C.ui });
    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.c2 : C.c1);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGrid();
  });
})(game);
