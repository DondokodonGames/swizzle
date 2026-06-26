// 476-ink-spread.js
// インク広がり — タップで落としたインクが広がる前にエリアを塗りつくす
// 操作: タップでインクを落とす
// 成功: 画面の80%を塗る  失敗: 20秒経過

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#f8f5f0',
    ink0:   '#1e1b4b',
    ink1:   '#312e81',
    ink2:   '#4338ca',
    ink3:   '#6d28d9',
    ink4:   '#7c3aed',
    ripple: '#a5b4fc',
    paper:  '#faf9f6',
    border: '#e2e8f0',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#1e293b',
    ui:     '#94a3b8'
  };

  var INK_COLORS = [C.ink0, C.ink1, C.ink2, C.ink3, C.ink4];
  var CELL_SIZE = 60;
  var COLS = Math.floor(W / CELL_SIZE);
  var ROWS = Math.floor((H * 0.78) / CELL_SIZE);
  var OX = (W - COLS * CELL_SIZE) / 2;
  var OY = (H - ROWS * CELL_SIZE) / 2 - 60;

  var grid = [];       // 0 = unpainted, 1..N = ink drop index
  var inkDrops = [];   // { col, row, color, spreadRadius, speed }
  var totalCells = COLS * ROWS;
  var painted = 0;
  var NEEDED_RATIO = 0.80;
  var done = false;
  var timeLeft = 20;
  var elapsed = 0;
  var dropCount = 0;
  var particles = [];

  for (var r = 0; r < ROWS; r++) {
    grid.push([]);
    for (var cc = 0; cc < COLS; cc++) {
      grid[r].push(0);
    }
  }

  function paintCell(col, row, dropIdx) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    if (grid[row][col] !== 0) return false;
    grid[row][col] = dropIdx;
    painted++;
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL_SIZE);
    var row = Math.floor((ty - OY) / CELL_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    dropCount++;
    var dropIdx = dropCount;
    var col2 = INK_COLORS[dropCount % INK_COLORS.length];
    paintCell(col, row, dropIdx);
    inkDrops.push({
      col: col, row: row,
      color: col2,
      dropIdx: dropIdx,
      spreadRadius: 0,
      speed: 3.5 + Math.random() * 2,
      frontier: [{ col: col, row: row }]
    });
    game.audio.play('se_tap', 0.3);

    // Ripple visual
    particles.push({ x: OX + col * CELL_SIZE + CELL_SIZE / 2, y: OY + row * CELL_SIZE + CELL_SIZE / 2, r: 10, maxR: 120, life: 0.5, col: col2 });
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        var ratio = painted / totalCells;
        if (ratio >= NEEDED_RATIO) {
          game.audio.play('se_success', 0.8);
          setTimeout(function() { game.end.success(Math.floor(ratio * 1000) + Math.ceil(painted / 10) * 50); }, 500);
        } else {
          game.audio.play('se_failure', 0.6);
          game.end.failure();
        }
        return;
      }
    }

    // Check win
    if (painted >= Math.floor(totalCells * NEEDED_RATIO) && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 200 + painted * 20); }, 600);
      return;
    }

    // Spread ink
    for (var di = 0; di < inkDrops.length; di++) {
      var drop = inkDrops[di];
      drop.spreadRadius += drop.speed * dt;
      var newRadius = Math.floor(drop.spreadRadius);

      // BFS-like spreading
      if (newRadius > 0 && drop.frontier.length > 0) {
        var newFrontier = [];
        var expandCount = Math.ceil(drop.speed * dt * 4);
        for (var fi = 0; fi < Math.min(expandCount, drop.frontier.length); fi++) {
          var cell = drop.frontier[fi];
          var neighbors = [
            { col: cell.col - 1, row: cell.row },
            { col: cell.col + 1, row: cell.row },
            { col: cell.col, row: cell.row - 1 },
            { col: cell.col, row: cell.row + 1 }
          ];
          for (var ni = 0; ni < neighbors.length; ni++) {
            var nc = neighbors[ni];
            if (paintCell(nc.col, nc.row, drop.dropIdx)) {
              newFrontier.push(nc);
            }
          }
        }
        drop.frontier = drop.frontier.slice(expandCount).concat(newFrontier);
      }
    }

    // Ripple particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].r += (particles[pp].maxR - particles[pp].r) * dt * 6;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(OX - 4, OY - 4, COLS * CELL_SIZE + 8, ROWS * CELL_SIZE + 8, C.border, 0.8);

    // Paint grid cells
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var cellVal = grid[r2][c2];
        var cx3 = OX + c2 * CELL_SIZE;
        var cy3 = OY + r2 * CELL_SIZE;
        if (cellVal === 0) {
          game.draw.rect(cx3, cy3, CELL_SIZE, CELL_SIZE, C.paper, 0.95);
        } else {
          var dropColor = inkDrops[cellVal - 1] ? inkDrops[cellVal - 1].color : C.ink0;
          game.draw.rect(cx3, cy3, CELL_SIZE, CELL_SIZE, dropColor, 0.88);
          // Edge darkening
          game.draw.rect(cx3, cy3, CELL_SIZE, 3, '#000', 0.08);
          game.draw.rect(cx3, cy3, 3, CELL_SIZE, '#000', 0.08);
        }
      }
    }

    // Ripple animations
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r, p.col, p.life * 0.5);
    }

    // Progress
    var ratio = painted / totalCells;
    var ratioBar = ratio / NEEDED_RATIO;
    game.draw.rect(OX, OY + ROWS * CELL_SIZE + 20, COLS * CELL_SIZE * ratioBar, 20, C.ink2, 0.9);
    game.draw.rect(OX, OY + ROWS * CELL_SIZE + 20, COLS * CELL_SIZE, 20, C.border, 0.3);
    game.draw.text(Math.floor(ratio * 100) + '% / ' + Math.floor(NEEDED_RATIO * 100) + '%', W / 2, OY + ROWS * CELL_SIZE + 75, { size: 48, color: C.text, bold: true });

    var timeRatio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, C.text);
    game.draw.rect(0, 0, W * timeRatio, 72, timeRatio > 0.4 ? C.ink2 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
