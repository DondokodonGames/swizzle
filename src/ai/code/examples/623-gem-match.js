// 623-gem-match.js
// ジェムマッチ — 3つ並べて消していく宝石パズル
// 操作: スワイプで隣の宝石と入れ替え
// 成功: 500ポイント  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050010',
    g1:     '#ef4444',
    g2:     '#f59e0b',
    g3:     '#22c55e',
    g4:     '#3b82f6',
    g5:     '#a855f7',
    g6:     '#06b6d4',
    shine:  '#ffffff',
    cell:   '#0f0520',
    cellHi: '#1a0a30',
    match:  '#ffd700',
    text:   '#f1f5f9',
    ui:     '#0a0020',
    miss:   '#ef4444'
  };

  var GEM_COLORS = [C.g1, C.g2, C.g3, C.g4, C.g5, C.g6];
  var COLS = 6;
  var ROWS = 7;
  var GEM_SIZE = 150;
  var PAD = 8;
  var GRID_W = COLS * (GEM_SIZE + PAD) - PAD;
  var GRID_OX = (W - GRID_W) / 2;
  var GRID_OY = H * 0.18;

  var grid = [];
  var score = 0;
  var NEEDED = 500;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var animating = false;
  var matchFlash = [];

  function randomGem() {
    return Math.floor(Math.random() * GEM_COLORS.length);
  }

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        row.push(randomGem());
      }
      grid.push(row);
    }
    // Resolve initial matches
    for (var i = 0; i < 20; i++) checkAndClear();
  }

  function gemXY(c, r) {
    return {
      x: GRID_OX + c * (GEM_SIZE + PAD) + GEM_SIZE / 2,
      y: GRID_OY + r * (GEM_SIZE + PAD) + GEM_SIZE / 2
    };
  }

  function checkAndClear() {
    var toRemove = [];
    // Horizontal
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS - 2; c++) {
        if (grid[r][c] === grid[r][c+1] && grid[r][c] === grid[r][c+2]) {
          toRemove.push([r,c],[r,c+1],[r,c+2]);
          if (c + 3 < COLS && grid[r][c] === grid[r][c+3]) toRemove.push([r,c+3]);
        }
      }
    }
    // Vertical
    for (var c2 = 0; c2 < COLS; c2++) {
      for (var r2 = 0; r2 < ROWS - 2; r2++) {
        if (grid[r2][c2] === grid[r2+1][c2] && grid[r2][c2] === grid[r2+2][c2]) {
          toRemove.push([r2,c2],[r2+1,c2],[r2+2,c2]);
          if (r2 + 3 < ROWS && grid[r2][c2] === grid[r2+3][c2]) toRemove.push([r2+3,c2]);
        }
      }
    }
    if (toRemove.length === 0) return false;

    // Remove duplicates and process
    var removed = {};
    for (var i = 0; i < toRemove.length; i++) {
      var key = toRemove[i][0] + ',' + toRemove[i][1];
      if (!removed[key]) {
        removed[key] = true;
        grid[toRemove[i][0]][toRemove[i][1]] = -1;
        score += 10;
        var pos = gemXY(toRemove[i][1], toRemove[i][0]);
        matchFlash.push({ x: pos.x, y: pos.y, life: 0.4 });
      }
    }
    score += Math.floor(toRemove.length * 5);

    // Drop gems
    for (var c3 = 0; c3 < COLS; c3++) {
      var filled = [];
      for (var r3 = ROWS - 1; r3 >= 0; r3--) {
        if (grid[r3][c3] >= 0) filled.push(grid[r3][c3]);
      }
      while (filled.length < ROWS) filled.push(randomGem());
      for (var r4 = ROWS - 1; r4 >= 0; r4--) {
        grid[r4][c3] = filled[ROWS - 1 - r4];
      }
    }
    return true;
  }

  function hitCell(tx, ty) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var pos = gemXY(c, r);
        var dx = tx - pos.x, dy = ty - pos.y;
        if (Math.abs(dx) < GEM_SIZE / 2 + 10 && Math.abs(dy) < GEM_SIZE / 2 + 10) return [r, c];
      }
    }
    return null;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || animating) return;
    var cell = hitCell(x1, y1);
    if (!cell) return;
    var r = cell[0], c = cell[1];
    var nr = r, nc = c;
    if (dir === 'left' && c > 0) nc--;
    else if (dir === 'right' && c < COLS - 1) nc++;
    else if (dir === 'up' && r > 0) nr--;
    else if (dir === 'down' && r < ROWS - 1) nr++;
    else return;

    // Swap
    var tmp = grid[r][c];
    grid[r][c] = grid[nr][nc];
    grid[nr][nc] = tmp;
    game.audio.play('se_tap', 0.2);

    var cleared = checkAndClear();
    if (!cleared) {
      // Swap back
      tmp = grid[r][c];
      grid[r][c] = grid[nr][nc];
      grid[nr][nc] = tmp;
      flashAnim = 0.15;
    } else {
      // Chain
      var chains = 0;
      while (checkAndClear()) { chains++; score += chains * 20; }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score + Math.ceil(timeLeft) * 100); }, 700);
      }
      game.audio.play('se_success', 0.5);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap does nothing useful here, but required
    game.audio.play('se_tap', 0.05);
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    for (var mf = matchFlash.length - 1; mf >= 0; mf--) {
      matchFlash[mf].life -= dt * 3;
      if (matchFlash[mf].life <= 0) matchFlash.splice(mf, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Gems
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var pos = gemXY(c, r);
        var gx = pos.x - GEM_SIZE / 2;
        var gy = pos.y - GEM_SIZE / 2;
        game.draw.rect(gx, gy, GEM_SIZE, GEM_SIZE, C.cell, 0.7);
        if (grid[r][c] >= 0) {
          var col = GEM_COLORS[grid[r][c]];
          game.draw.rect(gx + 6, gy + 6, GEM_SIZE - 12, GEM_SIZE - 12, col, 0.85);
          game.draw.rect(gx + 6, gy + 6, GEM_SIZE - 12, 18, col, 0.4);
          game.draw.circle(pos.x - GEM_SIZE * 0.2, pos.y - GEM_SIZE * 0.2, GEM_SIZE * 0.12, C.shine, 0.5);
          // Diamond shine
          game.draw.line(pos.x - GEM_SIZE * 0.1, gy + 10, pos.x + GEM_SIZE * 0.1, gy + 10, C.shine, 2);
        }
      }
    }

    // Match flash
    for (var mf2 = 0; mf2 < matchFlash.length; mf2++) {
      var mfl = matchFlash[mf2];
      game.draw.circle(mfl.x, mfl.y, GEM_SIZE * 0.5, C.match, mfl.life * 0.6);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.g1, flashAnim * 0.1);

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.g3 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    initGrid();
  });
})(game);
