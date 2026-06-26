// 492-gem-match.js
// 宝石マッチ — 同色の宝石を縦横にスワイプで揃えると消える
// 操作: 宝石をスワイプで隣と入れ替え（3つ以上揃えると消滅）
// 成功: 50個消す  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050215',
    board:  '#0a0525',
    gem0:   '#ef4444',
    gem1:   '#3b82f6',
    gem2:   '#22c55e',
    gem3:   '#f59e0b',
    gem4:   '#a855f7',
    gem5:   '#06b6d4',
    glow0:  '#fca5a5',
    glow1:  '#93c5fd',
    glow2:  '#86efac',
    glow3:  '#fde68a',
    glow4:  '#d8b4fe',
    glow5:  '#a5f3fc',
    select: '#fff',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GEM_COLORS = [C.gem0, C.gem1, C.gem2, C.gem3, C.gem4, C.gem5];
  var GLOW_COLORS = [C.glow0, C.glow1, C.glow2, C.glow3, C.glow4, C.glow5];

  var GRID = 7;
  var CELL = 128;
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.12;

  var grid = [];
  var selected = null; // {row, col}
  var animating = false;
  var cleared = 0;
  var NEEDED = 50;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var clearingCells = []; // {row, col, life}

  function randGem() { return Math.floor(Math.random() * GEM_COLORS.length); }

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      grid.push([]);
      for (var c = 0; c < GRID; c++) {
        grid[r].push(randGem());
      }
    }
    // Ensure no initial matches
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        var attempts = 0;
        while (findMatchAt(r2, c2, grid) && attempts < 20) {
          grid[r2][c2] = randGem();
          attempts++;
        }
      }
    }
  }

  function findMatchAt(r, c, g) {
    var v = g[r][c];
    // Check horizontal
    var hCount = 1;
    var cc = c - 1; while (cc >= 0 && g[r][cc] === v) { hCount++; cc--; }
    cc = c + 1; while (cc < GRID && g[r][cc] === v) { hCount++; cc++; }
    if (hCount >= 3) return true;
    // Check vertical
    var vCount = 1;
    var rr = r - 1; while (rr >= 0 && g[rr][c] === v) { vCount++; rr--; }
    rr = r + 1; while (rr < GRID && g[rr][c] === v) { vCount++; rr++; }
    if (vCount >= 3) return true;
    return false;
  }

  function findAllMatches() {
    var matched = {};
    for (var r = 0; r < GRID; r++) {
      // Horizontal
      var c = 0;
      while (c < GRID) {
        var v = grid[r][c];
        var cnt = 1;
        while (c + cnt < GRID && grid[r][c + cnt] === v) cnt++;
        if (cnt >= 3) {
          for (var i = 0; i < cnt; i++) matched[r + ',' + (c + i)] = true;
        }
        c += cnt;
      }
    }
    for (var c2 = 0; c2 < GRID; c2++) {
      // Vertical
      var r3 = 0;
      while (r3 < GRID) {
        var v2 = grid[r3][c2];
        var cnt2 = 1;
        while (r3 + cnt2 < GRID && grid[r3 + cnt2][c2] === v2) cnt2++;
        if (cnt2 >= 3) {
          for (var i2 = 0; i2 < cnt2; i2++) matched[(r3 + i2) + ',' + c2] = true;
        }
        r3 += cnt2;
      }
    }
    return matched;
  }

  function processMatches() {
    var matched = findAllMatches();
    var keys = Object.keys(matched);
    if (keys.length === 0) return false;

    // Clear matched cells
    for (var ki = 0; ki < keys.length; ki++) {
      var parts = keys[ki].split(',');
      var r = parseInt(parts[0]), c = parseInt(parts[1]);
      var gCol = GEM_COLORS[grid[r][c]];
      var gGlow = GLOW_COLORS[grid[r][c]];
      clearingCells.push({ row: r, col: c, life: 0.5, col2: gCol, glow: gGlow });
      for (var pi = 0; pi < 4; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5, col: gGlow });
      }
      grid[r][c] = -1;
      cleared++;
    }

    flashAnim = 0.3;
    game.audio.play('se_tap', 0.5);

    // Drop gems down
    for (var c3 = 0; c3 < GRID; c3++) {
      var writeRow = GRID - 1;
      for (var r4 = GRID - 1; r4 >= 0; r4--) {
        if (grid[r4][c3] >= 0) {
          grid[writeRow][c3] = grid[r4][c3];
          if (writeRow !== r4) grid[r4][c3] = -1;
          writeRow--;
        }
      }
      while (writeRow >= 0) {
        grid[writeRow][c3] = randGem();
        writeRow--;
      }
    }

    return true;
  }

  function trySwap(r1, c1, r2, c2) {
    if (r2 < 0 || r2 >= GRID || c2 < 0 || c2 >= GRID) return;
    // Swap
    var tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
    // Check if valid
    var matched = findAllMatches();
    if (Object.keys(matched).length > 0) {
      processMatches();
      selected = null;
    } else {
      // Swap back
      tmp = grid[r1][c1];
      grid[r1][c1] = grid[r2][c2];
      grid[r2][c2] = tmp;
      selected = null;
      game.audio.play('se_failure', 0.2);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || animating) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) { selected = null; return; }

    if (selected) {
      // Try to swap
      var dr = Math.abs(row - selected.row);
      var dc = Math.abs(col - selected.col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        trySwap(selected.row, selected.col, row, col);
      } else {
        selected = { row: row, col: col };
      }
    } else {
      selected = { row: row, col: col };
    }
  });

  game.onSwipe(function(dir, x1, y1) {
    if (done || animating) return;
    var col = Math.floor((x1 - OX) / CELL);
    var row = Math.floor((y1 - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    var dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    trySwap(row, col, row + dr, col + dc);
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

    if (cleared >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(cleared * 100 + Math.ceil(timeLeft) * 100); }, 700);
      return;
    }

    if (flashAnim > 0) flashAnim -= dt * 4;

    // Clearing animations
    for (var ci = clearingCells.length - 1; ci >= 0; ci--) {
      clearingCells[ci].life -= dt * 3;
      if (clearingCells[ci].life <= 0) clearingCells.splice(ci, 1);
    }

    // Auto-process matches after chain
    if (clearingCells.length === 0) {
      var matched2 = findAllMatches();
      if (Object.keys(matched2).length > 0) processMatches();
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
    game.draw.rect(OX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, C.board, 0.9);

    // Grid
    for (var r5 = 0; r5 < GRID; r5++) {
      for (var c5 = 0; c5 < GRID; c5++) {
        var val = grid[r5][c5];
        if (val < 0) continue;
        var gx = OX + c5 * CELL + CELL / 2;
        var gy = OY + r5 * CELL + CELL / 2;
        var isSel = selected && selected.row === r5 && selected.col === c5;
        var pulse = isSel ? (Math.sin(elapsed * 8) * 8 + 8) : 0;

        game.draw.circle(gx, gy, CELL * 0.38 + pulse, GEM_COLORS[val], 0.15);
        game.draw.circle(gx, gy, CELL * 0.36, GEM_COLORS[val], 0.9);
        game.draw.circle(gx - CELL * 0.1, gy - CELL * 0.1, CELL * 0.12, '#fff', 0.3);
        if (isSel) {
          game.draw.circle(gx, gy, CELL * 0.42 + pulse, C.select, 0.3);
        }
      }
    }

    // Clearing animations
    for (var ci2 = 0; ci2 < clearingCells.length; ci2++) {
      var cc2 = clearingCells[ci2];
      var gx2 = OX + cc2.col * CELL + CELL / 2;
      var gy2 = OY + cc2.row * CELL + CELL / 2;
      game.draw.circle(gx2, gy2, CELL * 0.5 * cc2.life, cc2.glow, cc2.life * 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.glow2, flashAnim * 0.1);

    game.draw.text(cleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gem4 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    initGrid();
  });
})(game);
