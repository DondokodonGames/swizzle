// 367-sugar-rush.js
// シュガーラッシュ — キャンディを並べて3つ揃えたらクリア
// 操作: タップで隣接するキャンディを選択・スワップ
// 成功: 20回揃える  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0520',
    panel:  '#2d1044',
    ui:     '#a855f7',
    text:   '#f0abfc',
    match:  '#fbbf24',
    matchHi:'#fef3c7'
  };

  var CANDY_COLORS = ['#ef4444','#22c55e','#3b82f6','#f59e0b','#ec4899'];
  var GRID = 6;
  var CELL = 154;
  var OX = (W - GRID * CELL) / 2;
  var OY = 270;

  var grid = [];
  var selected = null;
  var matches = 0;
  var NEEDED = 20;
  var done = false;
  var elapsed = 0;
  var timeLeft = 45;
  var particles = [];
  var flashCells = [];
  var swapping = false;

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      grid.push([]);
      for (var c = 0; c < GRID; c++) {
        grid[r].push(Math.floor(Math.random() * CANDY_COLORS.length));
      }
    }
  }

  function findMatches() {
    var matched = [];
    // Horizontal
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID - 2; c++) {
        if (grid[r][c] === grid[r][c+1] && grid[r][c] === grid[r][c+2]) {
          matched.push([r,c],[r,c+1],[r,c+2]);
        }
      }
    }
    // Vertical
    for (var r2 = 0; r2 < GRID - 2; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        if (grid[r2][c2] === grid[r2+1][c2] && grid[r2][c2] === grid[r2+2][c2]) {
          matched.push([r2,c2],[r2+1,c2],[r2+2,c2]);
        }
      }
    }
    return matched;
  }

  function removeMatches(matched) {
    var count = 0;
    var removed = {};
    for (var i = 0; i < matched.length; i++) {
      var key = matched[i][0] + ',' + matched[i][1];
      if (!removed[key]) {
        removed[key] = true;
        count++;
        var cx = OX + matched[i][1] * CELL + CELL / 2;
        var cy = OY + matched[i][0] * CELL + CELL / 2;
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cx, y: cy, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160, life:0.5, col: CANDY_COLORS[grid[matched[i][0]][matched[i][1]]] });
        }
        flashCells.push({ r: matched[i][0], c: matched[i][1], life: 0.5 });
        grid[matched[i][0]][matched[i][1]] = -1;
      }
    }
    return count;
  }

  function dropAndFill() {
    // Drop existing candies
    for (var c = 0; c < GRID; c++) {
      var write = GRID - 1;
      for (var r = GRID - 1; r >= 0; r--) {
        if (grid[r][c] >= 0) {
          grid[write][c] = grid[r][c];
          if (write !== r) grid[r][c] = -1;
          write--;
        }
      }
      // Fill top
      for (var r2 = write; r2 >= 0; r2--) {
        grid[r2][c] = Math.floor(Math.random() * CANDY_COLORS.length);
      }
    }
  }

  function processMatches() {
    var matched = findMatches();
    if (matched.length === 0) return;
    var count = removeMatches(matched);
    matches += Math.floor(count / 3);
    game.audio.play('se_success', 0.5);
    if (matches >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(matches * 200 + Math.ceil(timeLeft) * 80); }, 600);
      return;
    }
    setTimeout(function() {
      if (!done) {
        dropAndFill();
        processMatches();
      }
    }, 300);
  }

  function trySwap(r1, c1, r2, c2) {
    if (swapping) return;
    if (r2 < 0 || r2 >= GRID || c2 < 0 || c2 >= GRID) return;
    swapping = true;
    var tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
    game.audio.play('se_tap', 0.3);
    var matched = findMatches();
    if (matched.length === 0) {
      // Swap back
      var tmp2 = grid[r1][c1];
      grid[r1][c1] = grid[r2][c2];
      grid[r2][c2] = tmp2;
    } else {
      processMatches();
    }
    setTimeout(function() { swapping = false; }, 350);
  }

  game.onTap(function(tx, ty) {
    if (done || swapping) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= GRID || r < 0 || r >= GRID) { selected = null; return; }

    if (!selected) {
      selected = { r: r, c: c };
    } else {
      var dr = Math.abs(r - selected.r), dc = Math.abs(c - selected.c);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        trySwap(selected.r, selected.c, r, c);
      }
      selected = null;
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || swapping || !selected) return;
    var dr = 0, dc = 0;
    if (dir === 'up') dr = -1;
    if (dir === 'down') dr = 1;
    if (dir === 'left') dc = -1;
    if (dir === 'right') dc = 1;
    trySwap(selected.r, selected.c, selected.r + dr, selected.c + dc);
    selected = null;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    for (var fc = flashCells.length - 1; fc >= 0; fc--) {
      flashCells[fc].life -= dt * 2;
      if (flashCells[fc].life <= 0) flashCells.splice(fc, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        var cx = OX + c2 * CELL;
        var cy = OY + r2 * CELL;
        game.draw.rect(cx + 3, cy + 3, CELL - 6, CELL - 6, C.panel, 0.5);

        var val = grid[r2][c2];
        if (val < 0) continue;

        var col = CANDY_COLORS[val];
        var isSel = selected && selected.r === r2 && selected.c === c2;
        game.draw.circle(cx + CELL/2, cy + CELL/2, CELL/2 - 8, col, isSel ? 1.0 : 0.85);
        game.draw.circle(cx + CELL/2 - 18, cy + CELL/2 - 18, CELL/6, '#fff', 0.35);
        if (isSel) {
          game.draw.circle(cx + CELL/2, cy + CELL/2, CELL/2 - 2, '#fff', 0.2 + Math.sin(elapsed * 6) * 0.1);
        }
      }
    }

    // Flash cells
    for (var fc2 = 0; fc2 < flashCells.length; fc2++) {
      var f = flashCells[fc2];
      var fx = OX + f.c * CELL + CELL / 2;
      var fy = OY + f.r * CELL + CELL / 2;
      game.draw.circle(fx, fy, CELL/2 * f.life * 2, C.match, f.life * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(matches + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ui : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGrid();
    // Clear initial matches
    var m = findMatches();
    while (m.length > 0) { dropAndFill(); m = findMatches(); }
  });
})(game);
