// 576-number-snake.js
// ナンバースネーク — 数字をスワイプでなぞって順番に繋ぐ
// 操作: スワイプで1から始まる数字を順番になぞる
// 成功: 8問クリア  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0a1a',
    cell:    '#12121f',
    num:     '#f1f5f9',
    numHi:   '#ffffff',
    path:    '#3b82f6',
    pathHi:  '#93c5fd',
    correct: '#22c55e',
    wrong:   '#ef4444',
    next:    '#f59e0b',
    text:    '#f1f5f9',
    ui:      '#374151',
    border:  '#1a1a2e'
  };

  var GRID = 5;
  var CELL = Math.floor(W * 0.8 / GRID);
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.2;
  var NUM_CELLS = GRID * GRID;

  var numbers = []; // number placed at each cell (-1 = empty)
  var path = []; // user's drawn path (cell indices)
  var lastCell = -1;
  var expectedNext = 1;
  var totalNums = 0;
  var completions = 0;
  var NEEDED = 8;
  var fails = 0;
  var MAX_FAIL = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0;
  var swiping = false;

  function cellOf(r, c) { return r * GRID + c; }
  function rowOf(idx) { return Math.floor(idx / GRID); }
  function colOf(idx) { return idx % GRID; }
  function cellX(idx) { return OX + colOf(idx) * CELL + CELL / 2; }
  function cellY(idx) { return OY + rowOf(idx) * CELL + CELL / 2; }

  function generatePuzzle() {
    numbers = [];
    for (var i = 0; i < NUM_CELLS; i++) numbers.push(-1);

    // Place a snake path with numbers
    var pathLen = 10 + Math.floor(Math.random() * 5);
    pathLen = Math.min(pathLen, NUM_CELLS);

    var snake = [Math.floor(Math.random() * NUM_CELLS)];
    var used = {};
    used[snake[0]] = true;

    while (snake.length < pathLen) {
      var cur = snake[snake.length - 1];
      var r = rowOf(cur), c = colOf(cur);
      var moves = [];
      if (r > 0 && !used[cellOf(r-1,c)]) moves.push(cellOf(r-1,c));
      if (r < GRID-1 && !used[cellOf(r+1,c)]) moves.push(cellOf(r+1,c));
      if (c > 0 && !used[cellOf(r,c-1)]) moves.push(cellOf(r,c-1));
      if (c < GRID-1 && !used[cellOf(r,c+1)]) moves.push(cellOf(r,c+1));
      if (moves.length === 0) break;
      var next = moves[Math.floor(Math.random() * moves.length)];
      snake.push(next);
      used[next] = true;
    }

    for (var si = 0; si < snake.length; si++) {
      numbers[snake[si]] = si + 1;
    }
    totalNums = snake.length;
    path = [];
    lastCell = -1;
    expectedNext = 1;
    swiping = false;
  }

  function getCellAt(tx, ty) {
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= GRID || r < 0 || r >= GRID) return -1;
    return cellOf(r, c);
  }

  function tryConnect(cellIdx) {
    if (cellIdx < 0 || numbers[cellIdx] < 0) return;
    if (numbers[cellIdx] !== expectedNext) {
      // Wrong order — fail
      fails++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.4);
      path = [];
      lastCell = -1;
      expectedNext = 1;
      if (fails >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
      return;
    }

    // Check adjacency
    if (lastCell >= 0) {
      var dr = Math.abs(rowOf(cellIdx) - rowOf(lastCell));
      var dc = Math.abs(colOf(cellIdx) - colOf(lastCell));
      if (dr + dc !== 1) {
        path = [];
        lastCell = -1;
        expectedNext = 1;
        return;
      }
    }

    path.push(cellIdx);
    lastCell = cellIdx;
    expectedNext++;
    game.audio.play('se_tap', 0.2);

    if (expectedNext > totalNums) {
      // Completed!
      completions++;
      flashCol = C.correct;
      flashAnim = 0.4;
      resultTimer = 0.9;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var cx2 = cellX(cellIdx), cy2 = cellY(cellIdx);
        particles.push({ x: cx2, y: cy2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.correct });
      }
      if (completions >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(completions * 600 + Math.ceil(timeLeft) * 80); }, 800);
      } else {
        setTimeout(function() { if (!done) generatePuzzle(); }, 1000);
      }
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || resultTimer > 0) return;
    // Trace along swipe
    var steps = Math.ceil(Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)) / (CELL * 0.4));
    steps = Math.max(1, Math.min(steps, 20));
    for (var s = 0; s <= steps; s++) {
      var sx = x1 + (x2 - x1) * s / steps;
      var sy = y1 + (y2 - y1) * s / steps;
      var ci = getCellAt(sx, sy);
      if (ci >= 0 && ci !== lastCell && path.indexOf(ci) === -1) {
        tryConnect(ci);
        if (resultTimer > 0) break;
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done || resultTimer > 0) return;
    var ci = getCellAt(tx, ty);
    if (ci >= 0 && ci !== lastCell && path.indexOf(ci) === -1) {
      tryConnect(ci);
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

    // Path lines
    for (var pi2 = 1; pi2 < path.length; pi2++) {
      var pa = path[pi2 - 1], pb = path[pi2];
      game.draw.line(cellX(pa), cellY(pa), cellX(pb), cellY(pb), C.pathHi, 20);
      game.draw.line(cellX(pa), cellY(pa), cellX(pb), cellY(pb), C.path, 12);
    }

    // Cells
    for (var ci2 = 0; ci2 < NUM_CELLS; ci2++) {
      var gx = OX + colOf(ci2) * CELL;
      var gy = OY + rowOf(ci2) * CELL;
      var num = numbers[ci2];

      game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, C.cell, 0.9);

      if (num > 0) {
        var inPath = path.indexOf(ci2) >= 0;
        var isNext = num === expectedNext;
        var cellCol = inPath ? C.correct : (isNext ? C.next : C.path);
        game.draw.rect(gx + 8, gy + 8, CELL - 16, CELL - 16, cellCol, inPath ? 0.3 : (isNext ? 0.2 : 0.12));
        if (isNext && !inPath) {
          game.draw.rect(gx + 8, gy + 8, CELL - 16, CELL - 16, C.next, 0.08 + Math.sin(elapsed * 6) * 0.06);
        }
        game.draw.circle(OX + colOf(ci2) * CELL + CELL / 2, OY + rowOf(ci2) * CELL + CELL / 2, CELL * 0.32, cellCol, inPath ? 0.7 : 0.4);
        game.draw.text('' + num, cellX(ci2), cellY(ci2) + 14, { size: 42, color: inPath ? C.numHi : C.num, bold: true });
      }

      // Grid
      game.draw.line(gx, gy, gx + CELL, gy, C.border, 2);
      game.draw.line(gx, gy, gx, gy + CELL, C.border, 2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Progress
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 50 + fi * 100, H * 0.955, 20, fi < fails ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(completions + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('次: ' + expectedNext, W / 2, 210, { size: 40, color: C.next });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.path : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    generatePuzzle();
  });
})(game);
