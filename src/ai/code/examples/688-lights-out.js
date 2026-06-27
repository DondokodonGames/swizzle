// 688-lights-out.js
// ライツアウト — タップでタイルを反転させ全マスを同じ色に揃えろ
// 操作: タップでタイルと隣接マスを反転
// 成功: 10パズル解決  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var N = 5; // 5x5 grid
  var CELL = 180;
  var GAP = 10;
  var GRID_W = N * CELL + (N - 1) * GAP;
  var GRID_H = N * CELL + (N - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2 + 40;

  var C = {
    bg:      '#03060a',
    cellOn:  '#fde68a',
    cellOff: '#0f172a',
    cellOnHi:'#fef9c3',
    correct: '#22c55e',
    text:    '#f1f5f9',
    ui:      '#05090f'
  };

  var grid = [];
  var solved = 0;
  var NEEDED = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var resultTimer = 0, resultText = '';
  var moves = 0;
  var animFlash = [];

  function cellX(c) { return GRID_X + c * (CELL + GAP); }
  function cellY(r) { return GRID_Y + r * (CELL + GAP); }

  function makeGrid(n) {
    var g = [];
    for (var i = 0; i < n * n; i++) g.push(0);
    return g;
  }

  function flipCell(g, r, c) {
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    g[r * N + c] ^= 1;
  }

  function applyMove(g, r, c) {
    flipCell(g, r, c);
    flipCell(g, r - 1, c);
    flipCell(g, r + 1, c);
    flipCell(g, r, c - 1);
    flipCell(g, r, c + 1);
  }

  function isSolved(g) {
    var first = g[0];
    for (var i = 1; i < g.length; i++) {
      if (g[i] !== first) return false;
    }
    return true;
  }

  function newPuzzle() {
    // Start from solved state and apply random moves
    grid = makeGrid(N);
    var state = solved % 2 === 0 ? 0 : 1; // alternate goal state
    for (var i = 0; i < N * N; i++) grid[i] = state;

    var numMoves = 8 + Math.floor(Math.random() * 8);
    for (var m = 0; m < numMoves; m++) {
      var r = Math.floor(Math.random() * N);
      var c = Math.floor(Math.random() * N);
      applyMove(grid, r, c);
    }
    // Ensure not already solved
    if (isSolved(grid)) applyMove(grid, 0, 0);
    moves = 0;
    animFlash = [];
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= N || row < 0 || row >= N) return;
    var localX = (tx - GRID_X) - col * (CELL + GAP);
    var localY = (ty - GRID_Y) - row * (CELL + GAP);
    if (localX > CELL || localY > CELL) return;

    applyMove(grid, row, col);
    moves++;
    game.audio.play('se_tap', 0.1);

    // Flash affected cells
    animFlash = [{ r: row, c: col }, { r: row - 1, c: col }, { r: row + 1, c: col }, { r: row, c: col - 1 }, { r: row, c: col + 1 }];
    setTimeout(function() { animFlash = []; }, 150);

    if (isSolved(grid)) {
      solved++;
      flashAnim = 0.4;
      resultText = '解決！ ' + moves + '手';
      resultTimer = 0.8;
      game.audio.play('se_success', 0.75);
      for (var p = 0; p < 10; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.6, col: C.cellOn });
      }
      if (solved >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(solved * 600 + Math.ceil(timeLeft) * 50); }, 700);
      } else {
        setTimeout(newPuzzle, 900);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var cx = cellX(c);
        var cy = cellY(r);
        var isOn = grid[r * N + c] === 1;

        // Check if this cell is in animFlash
        var isFlash = false;
        for (var fi = 0; fi < animFlash.length; fi++) {
          if (animFlash[fi].r === r && animFlash[fi].c === c) { isFlash = true; break; }
        }

        game.draw.rect(cx + 3, cy + 3, CELL, CELL, '#000', 0.25);
        var col2 = isOn ? C.cellOn : C.cellOff;
        if (isFlash) col2 = '#fff';
        game.draw.rect(cx, cy, CELL, CELL, col2, isOn ? 0.9 : 0.85);
        if (isOn) {
          game.draw.rect(cx, cy, CELL, 10, C.cellOnHi, 0.5);
          game.draw.circle(cx + CELL / 2, cy + CELL / 2, CELL * 0.25, C.cellOnHi, 0.2);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 56, color: C.correct, bold: true });
    }

    // Move counter
    game.draw.text(moves + '手', W * 0.78, H * 0.88, { size: 42, color: '#ffffff55' });
    game.draw.text('全部そろえろ！', W / 2, GRID_Y - 80, { size: 40, color: '#ffffff44' });

    game.draw.text(solved + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newPuzzle();
  });
})(game);
