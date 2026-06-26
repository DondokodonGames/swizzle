// 482-tile-flip.js
// タイル反転 — タップで隣接タイルも一緒に反転させ全タイルを同じ色にする
// 操作: タップでタイルを反転（十字状に隣接タイルも反転）
// 成功: 全タイルを揃える（6回以内）  失敗: 3ラウンドクリアできず or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#080414',
    tile0:  '#1e1b4b',
    tile1:  '#4f46e5',
    tile0Hi:'#312e81',
    tile1Hi:'#818cf8',
    select: '#fbbf24',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GRID = 5;
  var CELL = 168;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 60;

  var grid = [];
  var moves = 0;
  var MAX_MOVES = 8;
  var rounds = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var flipAnims = []; // per-cell flip animation

  function initGrid() {
    // Start with all 0s, then flip random tiles to create solvable puzzle
    grid = [];
    flipAnims = [];
    for (var r = 0; r < GRID; r++) {
      grid.push([]);
      flipAnims.push([]);
      for (var c = 0; c < GRID; c++) {
        grid[r].push(0);
        flipAnims[r].push(0);
      }
    }
    moves = 0;
    // Random flips to scramble
    var scrambleCount = 4 + Math.floor(Math.random() * 4);
    for (var i = 0; i < scrambleCount; i++) {
      var rc = Math.floor(Math.random() * GRID);
      var cc = Math.floor(Math.random() * GRID);
      flipCell(rc, cc, true);
    }
  }

  function flipCell(row, col, silent) {
    // Flip cross pattern
    var coords = [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
    for (var ci = 0; ci < coords.length; ci++) {
      var r = coords[ci][0], c = coords[ci][1];
      if (r >= 0 && r < GRID && c >= 0 && c < GRID) {
        grid[r][c] = 1 - grid[r][c];
        if (!silent) flipAnims[r][c] = 0.3;
      }
    }
  }

  function checkWin() {
    var val = grid[0][0];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        if (grid[r][c] !== val) return false;
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;

    flipCell(row, col, false);
    moves++;
    game.audio.play('se_tap', 0.4);

    if (checkWin()) {
      rounds++;
      flashCol = C.correct;
      flashAnim = 0.6;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.7, col: C.tile1Hi });
      }
      if (rounds >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(rounds * 500 + (MAX_MOVES - moves) * 100 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        setTimeout(function() { if (!done) initGrid(); }, 900);
      }
      return;
    }

    if (moves >= MAX_MOVES) {
      // Too many moves — reset
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      setTimeout(function() { if (!done) initGrid(); }, 700);
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

    // Flip animations
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        if (flipAnims[r2][c2] > 0) flipAnims[r2][c2] -= dt * 5;
      }
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

    // Tiles
    for (var r3 = 0; r3 < GRID; r3++) {
      for (var c3 = 0; c3 < GRID; c3++) {
        var cx3 = OX + c3 * CELL + CELL / 2;
        var cy3 = OY + r3 * CELL + CELL / 2;
        var val = grid[r3][c3];
        var anim = flipAnims[r3][c3];
        var colBase = val === 0 ? C.tile0 : C.tile1;
        var colHi   = val === 0 ? C.tile0Hi : C.tile1Hi;

        var scale = anim > 0 ? Math.abs(Math.cos(anim * Math.PI)) : 1;
        var drawW = (CELL - 12) * scale;
        var drawH = CELL - 12;

        game.draw.rect(cx3 - drawW / 2, cy3 - drawH / 2, drawW, drawH, colBase, 0.9);
        game.draw.rect(cx3 - drawW / 2, cy3 - drawH / 2, drawW, 10, colHi, 0.5);
        // Corner dot
        game.draw.circle(cx3, cy3, 16, colHi, 0.4);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.15);

    // Moves indicator
    var movesLeft = MAX_MOVES - moves;
    game.draw.text('残' + movesLeft + '手', W / 2, OY - 70, { size: 52, color: movesLeft <= 2 ? C.wrong : C.ui, bold: movesLeft <= 2 });

    // Round dots
    for (var ri = 0; ri < NEEDED; ri++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 44 + ri * 88, H * 0.955, 20, ri < rounds ? C.correct : C.ui, 0.9);
    }

    game.draw.text('ラウンド ' + rounds + ' / ' + NEEDED, W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tile1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    initGrid();
  });
})(game);
