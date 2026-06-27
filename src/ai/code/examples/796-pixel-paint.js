// 796-pixel-paint.js
// ピクセルペイント — 指定された色でマスを素早く塗りつぶせ
// 操作: タップ — 正しい色のマスだけタップして塗る（間違いはペナルティ）
// 成功: 40マス塗る  失敗: 10回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040408',
    grid:    '#0a0a14',
    painted: '#1a2030',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#04040a'
  };

  var PALETTE = ['#ef4444', '#3b82f6', '#fbbf24', '#a78bfa', '#34d399', '#f97316'];
  var COLS = 5;
  var ROWS = 6;
  var CELL = Math.floor((W - 80) / COLS);
  var START_X = (W - COLS * CELL) / 2;
  var START_Y = H * 0.22;

  var targetColor = 0;
  var cells = []; // { colorIdx, painted, flashTimer, correct }

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newGrid() {
    targetColor = Math.floor(Math.random() * PALETTE.length);
    cells = [];
    var count = COLS * ROWS;
    // Distribute colors — target color appears ~40%
    for (var i = 0; i < count; i++) {
      var col;
      if (Math.random() < 0.38) {
        col = targetColor;
      } else {
        do { col = Math.floor(Math.random() * PALETTE.length); } while (col === targetColor);
      }
      cells.push({ colorIdx: col, painted: false, flashTimer: 0, correct: false });
    }
  }

  function getCellAt(tx, ty) {
    var col = Math.floor((tx - START_X) / CELL);
    var row = Math.floor((ty - START_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
    return row * COLS + col;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var idx = getCellAt(tx, ty);
    if (idx < 0) return;
    var cell = cells[idx];
    if (cell.painted) return;

    cell.painted = true;
    cell.flashTimer = 0.4;

    if (cell.colorIdx === targetColor) {
      score++;
      cell.correct = true;
      flashCol = C.correct;
      flashAnim = 0.14;
      resultText = 'ペイント！';
      resultTimer = 0.25;
      game.audio.play('se_tap', 0.07);
      // Particle burst from cell
      var cx = START_X + (idx % COLS) * CELL + CELL / 2;
      var cy = START_Y + Math.floor(idx / COLS) * CELL + CELL / 2;
      for (var p = 0; p < 4; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: cy, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 100, life: 0.3, col: PALETTE[targetColor] });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 280 + Math.ceil(timeLeft) * 130); }, 700);
        return;
      }
      // Check if all target cells painted — if so, new grid
      var allPainted = true;
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].colorIdx === targetColor && !cells[i].painted) { allPainted = false; break; }
      }
      if (allPainted) {
        setTimeout(function() { if (!done) newGrid(); }, 400);
      }
    } else {
      cell.correct = false;
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = '違う色！';
      resultTimer = 0.35;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    for (var i = 0; i < cells.length; i++) {
      if (cells[i].flashTimer > 0) cells[i].flashTimer -= dt * 3;
    }

    if (flashAnim > 0) flashAnim -= dt * 4;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target color indicator
    game.draw.rect(W * 0.12, H * 0.09, W * 0.76, H * 0.09, C.grid, 0.9);
    game.draw.circle(W * 0.3, H * 0.135, 32, PALETTE[targetColor], 0.95);
    game.draw.text('これを塗れ！', W * 0.6, H * 0.135, { size: 44, color: PALETTE[targetColor], bold: true });

    // Grid
    for (var ci = 0; ci < cells.length; ci++) {
      var cell = cells[ci];
      var col2 = ci % COLS;
      var row2 = Math.floor(ci / COLS);
      var cx2 = START_X + col2 * CELL;
      var cy2 = START_Y + row2 * CELL;

      // Cell background
      var bgCol = C.grid;
      if (cell.painted) {
        bgCol = cell.correct ? PALETTE[targetColor] : C.wrong;
      }
      game.draw.rect(cx2 + 3, cy2 + 3, CELL - 6, CELL - 6, bgCol, cell.painted ? 0.9 : 0.85);

      // Unpainted: show cell color
      if (!cell.painted) {
        game.draw.circle(cx2 + CELL / 2, cy2 + CELL / 2, CELL * 0.3, PALETTE[cell.colorIdx], 0.8);
      }

      // Flash
      if (cell.flashTimer > 0) {
        game.draw.rect(cx2 + 3, cy2 + 3, CELL - 6, CELL - 6, '#fff', cell.flashTimer * 0.3);
      }

      // Wrong painted: X mark
      if (cell.painted && !cell.correct) {
        game.draw.text('×', cx2 + CELL / 2, cy2 + CELL / 2 + 8, { size: Math.floor(CELL * 0.5), color: '#fff', bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('正しい色をタップ', W / 2, H * 0.88, { size: 36, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 48, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 44 + ei * 88, H * 0.955, 18, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newGrid();
  });
})(game);
