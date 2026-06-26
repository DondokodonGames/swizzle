// 488-puzzle-slide.js
// スライドパズル — 数字パネルをスライドさせて1~8を正しい順番に並べる
// 操作: パネルをスワイプして空きマスに移動
// 成功: 3回完成  失敗: 120手以内に完成できず or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050820',
    board:  '#0a1030',
    tile:   '#1e3a8a',
    tileHi: '#3b82f6',
    tileTop:'#60a5fa',
    empty:  '#030618',
    num:    '#f1f5f9',
    correct2:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    solved: '#fbbf24'
  };

  var GRID = 3;
  var CELL = 240;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 80;

  var tiles = [];  // 9 elements, 0 = empty, 1-8 = number
  var emptyPos = { row: 2, col: 2 };
  var moves = 0;
  var MAX_MOVES = 120;
  var rounds = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var slideAnim = []; // {from, to, progress}

  function getIdx(row, col) { return row * GRID + col; }
  function isGoal() {
    for (var i = 0; i < GRID * GRID - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[GRID * GRID - 1] === 0;
  }

  function shuffle() {
    tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    emptyPos = { row: 2, col: 2 };
    // Random valid moves to scramble
    for (var s = 0; s < 80; s++) {
      var dirs = [];
      if (emptyPos.row > 0) dirs.push('up');
      if (emptyPos.row < GRID - 1) dirs.push('down');
      if (emptyPos.col > 0) dirs.push('left');
      if (emptyPos.col < GRID - 1) dirs.push('right');
      var dir = dirs[Math.floor(Math.random() * dirs.length)];
      var nr = emptyPos.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
      var nc = emptyPos.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
      // Swap
      var tmp = tiles[getIdx(nr, nc)];
      tiles[getIdx(nr, nc)] = 0;
      tiles[getIdx(emptyPos.row, emptyPos.col)] = tmp;
      emptyPos = { row: nr, col: nc };
    }
    moves = 0;
    slideAnim = [];
  }

  function tryMove(row, col) {
    // Can move if adjacent to empty
    var dr = Math.abs(row - emptyPos.row);
    var dc = Math.abs(col - emptyPos.col);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      var fromIdx = getIdx(row, col);
      var toIdx = getIdx(emptyPos.row, emptyPos.col);
      tiles[toIdx] = tiles[fromIdx];
      tiles[fromIdx] = 0;
      emptyPos = { row: row, col: col };
      moves++;
      game.audio.play('se_tap', 0.3);
      slideAnim.push({ fromRow: row, fromCol: col, toRow: emptyPos.row, toCol: emptyPos.col, progress: 0, val: tiles[toIdx] });
      if (isGoal()) {
        rounds++;
        flashAnim = 0.6;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 16; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H / 2, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.8, col: C.solved });
        }
        if (rounds >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(rounds * 1000 + (MAX_MOVES - moves) * 20 + Math.ceil(timeLeft) * 50); }, 800);
        } else {
          setTimeout(function() { if (!done) shuffle(); }, 900);
        }
      } else if (moves >= MAX_MOVES) {
        game.audio.play('se_failure', 0.5);
        setTimeout(function() { if (!done) { shuffle(); } }, 600);
      }
      return true;
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    tryMove(row, col);
  });

  game.onSwipe(function(dir, x1, y1) {
    if (done) return;
    var col = Math.floor((x1 - OX) / CELL);
    var row = Math.floor((y1 - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    // Move tile in swipe direction
    var targetRow = row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
    var targetCol = col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
    if (targetRow === emptyPos.row && targetCol === emptyPos.col) {
      tryMove(row, col);
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

    if (flashAnim > 0) flashAnim -= dt * 2.5;

    // Slide animations
    for (var sa = slideAnim.length - 1; sa >= 0; sa--) {
      slideAnim[sa].progress += dt * 8;
      if (slideAnim[sa].progress >= 1) slideAnim.splice(sa, 1);
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
    game.draw.rect(OX - 12, OY - 12, GRID * CELL + 24, GRID * CELL + 24, C.board, 0.9);

    // Tiles
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var val = tiles[getIdx(r, c)];
        var cx = OX + c * CELL + CELL / 2;
        var cy = OY + r * CELL + CELL / 2;

        if (val === 0) {
          game.draw.rect(OX + c * CELL + 6, OY + r * CELL + 6, CELL - 12, CELL - 12, C.empty, 0.9);
          continue;
        }

        // Check if in correct position (val should = r*GRID+c+1)
        var isCorrect = (val === r * GRID + c + 1);
        var tCol = isCorrect && flashAnim > 0 ? C.solved : C.tile;
        var tColHi = isCorrect && flashAnim > 0 ? '#fff9c4' : C.tileHi;

        game.draw.rect(OX + c * CELL + 6, OY + r * CELL + 6, CELL - 12, CELL - 12, tCol, 0.9);
        game.draw.rect(OX + c * CELL + 6, OY + r * CELL + 6, CELL - 12, 16, tColHi, 0.4);
        game.draw.text(val + '', cx, cy + 30, { size: 120, color: C.num, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 16 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct2, flashAnim * 0.15);

    // Progress
    game.draw.text('残' + (MAX_MOVES - moves) + '手', W * 0.78, OY - 60, { size: 44, color: moves > MAX_MOVES * 0.7 ? C.wrong : C.ui });

    // Round dots
    for (var ri = 0; ri < NEEDED; ri++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 60 + ri * 120, H * 0.955, 24, ri < rounds ? C.correct2 : C.ui, 0.9);
    }

    game.draw.text(rounds + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tileHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    shuffle();
  });
})(game);
