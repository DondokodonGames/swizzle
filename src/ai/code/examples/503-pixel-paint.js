// 503-pixel-paint.js
// ピクセルペイント — お手本の絵柄を見てスワイプで同じパターンを塗れ
// 操作: スワイプで色を塗る（指の軌跡をセル単位で記録）
// 成功: 3枚の絵を90%以上一致で完成  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080808',
    gridBg:  '#101010',
    gridLine:'#1a1a1a',
    painted: '#f59e0b',
    target:  '#1d4ed8',
    match:   '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var GRID = 8;
  var CELL = 110;
  var OX_T = 20;      // target grid left
  var OX_P = W / 2 + 20;  // player grid left
  var OY = H * 0.25;

  var targetGrid = [];
  var playerGrid = [];
  var rounds = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var lastCell = null;
  var matchPct = 0;
  var flashAnim = 0;

  // Simple pixel art patterns (8x8, 1=filled, 0=empty)
  var patterns = [
    // Heart
    [0,1,1,0,0,1,1,0,
     1,1,1,1,1,1,1,1,
     1,1,1,1,1,1,1,1,
     0,1,1,1,1,1,1,0,
     0,0,1,1,1,1,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0],
    // Star
    [0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     1,1,1,1,1,1,1,1,
     0,1,1,1,1,1,1,0,
     0,0,1,1,1,1,0,0,
     0,1,1,0,0,1,1,0,
     1,1,0,0,0,0,1,1,
     0,0,0,0,0,0,0,0],
    // House
    [0,0,0,1,1,0,0,0,
     0,0,1,1,1,1,0,0,
     0,1,1,1,1,1,1,0,
     1,1,1,1,1,1,1,1,
     1,1,1,0,0,1,1,1,
     1,1,1,0,0,1,1,1,
     1,1,1,1,1,1,1,1,
     0,0,0,0,0,0,0,0],
    // Arrow up
    [0,0,0,1,1,0,0,0,
     0,0,1,1,1,1,0,0,
     0,1,1,1,1,1,1,0,
     1,1,1,1,1,1,1,1,
     0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,0,0,0,0,0],
    // Diamond
    [0,0,0,1,1,0,0,0,
     0,0,1,1,1,1,0,0,
     0,1,1,1,1,1,1,0,
     1,1,1,0,0,1,1,1,
     0,1,1,1,1,1,1,0,
     0,0,1,1,1,1,0,0,
     0,0,0,1,1,0,0,0,
     0,0,0,0,0,0,0,0]
  ];

  function loadPattern() {
    var idx = rounds % patterns.length;
    var pat = patterns[idx];
    targetGrid = [];
    playerGrid = [];
    for (var r = 0; r < GRID; r++) {
      targetGrid.push([]);
      playerGrid.push([]);
      for (var c = 0; c < GRID; c++) {
        targetGrid[r].push(pat[r * GRID + c]);
        playerGrid[r].push(0);
      }
    }
    lastCell = null;
    matchPct = 0;
  }

  function calcMatch() {
    var total = 0, match = 0;
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        total++;
        if (playerGrid[r][c] === targetGrid[r][c]) match++;
      }
    }
    return match / total;
  }

  function paintAt(tx, ty, val) {
    var col = Math.floor((tx - OX_P) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var key = row + ',' + col;
    if (lastCell === key) return;
    lastCell = key;
    playerGrid[row][col] = val;
    matchPct = calcMatch();
    if (matchPct >= 0.90) {
      rounds++;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.match });
      }
      if (rounds >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(rounds * 1000 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        setTimeout(function() { if (!done) loadPattern(); }, 600);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) return;
    lastCell = null;
    var col = Math.floor((tx - OX_P) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    playerGrid[row][col] = playerGrid[row][col] ? 0 : 1;
    matchPct = calcMatch();
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (x1 < W / 2) return;
    lastCell = null;
    var steps = 25;
    for (var s = 0; s <= steps; s++) {
      var fx = x1 + (x2 - x1) * s / steps;
      var fy = y1 + (y2 - y1) * s / steps;
      paintAt(fx, fy, 1);
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

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Target grid (left)
    game.draw.text('見本', OX_T + GRID * CELL / 2, OY - 44, { size: 36, color: C.text });
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var lx = OX_T + c * CELL;
        var ly = OY + r * CELL;
        game.draw.rect(lx + 2, ly + 2, CELL - 4, CELL - 4, C.gridBg, 0.9);
        if (targetGrid[r][c]) {
          game.draw.rect(lx + 4, ly + 4, CELL - 8, CELL - 8, C.target, 0.85);
        }
      }
    }

    // Divider
    game.draw.rect(W / 2 - 2, OY - 60, 4, GRID * CELL + 80, C.ui, 0.5);

    // Player grid (right)
    var pctStr = Math.floor(matchPct * 100) + '%';
    var pctCol = matchPct >= 0.9 ? C.match : matchPct >= 0.6 ? C.painted : C.ui;
    game.draw.text('塗る ' + pctStr, OX_P + GRID * CELL / 2, OY - 44, { size: 36, color: pctCol });
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        var rx = OX_P + c2 * CELL;
        var ry = OY + r2 * CELL;
        var hasPlayer = playerGrid[r2][c2];
        var hasTarget = targetGrid[r2][c2];
        game.draw.rect(rx + 2, ry + 2, CELL - 4, CELL - 4, C.gridBg, 0.9);
        if (hasPlayer) {
          var cellCol = (hasPlayer === hasTarget) ? C.match : C.wrong;
          game.draw.rect(rx + 4, ry + 4, CELL - 8, CELL - 8, cellCol, 0.75);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.match, flashAnim * 0.2);

    // Round dots
    for (var ri = 0; ri < NEEDED; ri++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 60 + ri * 120, H * 0.955, 22, ri < rounds ? C.match : C.ui, 0.9);
    }

    game.draw.text(rounds + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.painted : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    loadPattern();
  });
})(game);
