// 538-tile-slide.js
// タイルスライド — 15パズル（スライドパズル）を素早く解く
// 操作: タップで空白隣のタイルを動かす
// 成功: 2つのパズル完成  失敗: 200手超過 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030510',
    tile:    '#1e3a5f',
    tileHi:  '#2d5a8e',
    tileNum: '#93c5fd',
    empty:   '#050a14',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    border:  '#0ea5e9'
  };

  var SIZE = 4; // 4x4
  var CELL = 220;
  var GAP = 6;
  var OX = (W - SIZE * (CELL + GAP)) / 2;
  var OY = H * 0.2;
  var MAX_MOVES = 200;

  var board = [];
  var moves = 0;
  var puzzlesSolved = 0;
  var NEEDED = 2;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var tileAnims = {}; // index -> {dx, dy, t}
  var moveTimer = 0;

  function initBoard() {
    // Create solved board then shuffle
    board = [];
    for (var i = 0; i < SIZE * SIZE - 1; i++) board.push(i + 1);
    board.push(0); // 0 = empty

    // Fisher-Yates shuffle ensuring solvable
    for (var si = board.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = board[si]; board[si] = board[sj]; board[sj] = tmp;
    }

    // Ensure solvable by checking inversions
    var inv = 0;
    for (var ii = 0; ii < board.length; ii++) {
      for (var jj = ii + 1; jj < board.length; jj++) {
        if (board[ii] > 0 && board[jj] > 0 && board[ii] > board[jj]) inv++;
      }
    }
    var emptyRow = Math.floor(board.indexOf(0) / SIZE);
    var blankFromBottom = SIZE - 1 - emptyRow;
    // Solvability check
    if (SIZE % 2 === 1 && inv % 2 !== 0) {
      // Swap first two non-empty tiles
      var a = board[0] === 0 ? 1 : 0;
      var b = board[1] === 0 ? 2 : 1;
      tmp = board[a]; board[a] = board[b]; board[b] = tmp;
    } else if (SIZE % 2 === 0) {
      if ((inv % 2 === 0) !== (blankFromBottom % 2 === 1)) {
        var a2 = board[0] === 0 ? 1 : 0;
        var b2 = board[1] === 0 ? 2 : 1;
        tmp = board[a2]; board[a2] = board[b2]; board[b2] = tmp;
      }
    }
    tileAnims = {};
    moves = 0;
  }

  function isSolved() {
    for (var i = 0; i < SIZE * SIZE - 1; i++) if (board[i] !== i + 1) return false;
    return board[SIZE * SIZE - 1] === 0;
  }

  function findEmpty() {
    var idx = board.indexOf(0);
    return { col: idx % SIZE, row: Math.floor(idx / SIZE) };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / (CELL + GAP));
    var row = Math.floor((ty - OY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;

    var empty = findEmpty();
    var dCol = Math.abs(col - empty.col), dRow = Math.abs(row - empty.row);
    if (dCol + dRow !== 1) return; // Not adjacent to empty

    // Slide tile into empty
    var tileIdx = row * SIZE + col;
    var emptyIdx = empty.row * SIZE + empty.col;
    var tmp = board[tileIdx];
    board[tileIdx] = board[emptyIdx];
    board[emptyIdx] = tmp;
    moves++;
    game.audio.play('se_tap', 0.2);

    // Animate
    tileAnims[emptyIdx] = { dx: (col - empty.col), dy: (row - empty.row), t: 0.15 };

    if (isSolved()) {
      puzzlesSolved++;
      flashAnim = 0.6;
      game.audio.play('se_success', 0.9);
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: OY + SIZE * (CELL + GAP) / 2, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, life: 0.5, col: C.border });
      }
      if (puzzlesSolved >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(puzzlesSolved * 1000 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        setTimeout(function() { if (!done) initBoard(); }, 1000);
      }
    }

    if (moves >= MAX_MOVES && !done) {
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function() { game.end.failure(); }, 500);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    for (var k in tileAnims) {
      tileAnims[k].t -= dt * 8;
      if (tileAnims[k].t <= 0) delete tileAnims[k];
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Board background
    game.draw.rect(OX - 12, OY - 12, SIZE * (CELL + GAP) + 24, SIZE * (CELL + GAP) + 24, '#0a1530', 0.9);

    // Tiles
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var idx = r * SIZE + c;
        var val = board[idx];
        var tx2 = OX + c * (CELL + GAP);
        var ty2 = OY + r * (CELL + GAP);

        // Apply animation offset
        var anim = tileAnims[idx];
        if (anim && anim.t > 0) {
          var frac = Math.max(0, anim.t) / 0.15;
          tx2 -= anim.dx * CELL * frac;
          ty2 -= anim.dy * CELL * frac;
        }

        if (val === 0) {
          game.draw.rect(tx2, ty2, CELL, CELL, C.empty, 0.8);
          continue;
        }

        var correctPos = val - 1;
        var isInPlace = (correctPos === idx);
        var bgCol = isInPlace ? '#0d2d4a' : C.tile;
        game.draw.rect(tx2 + 4, ty2 + 4, CELL - 8, CELL - 8, bgCol, 0.9);
        game.draw.rect(tx2 + 4, ty2 + 4, CELL - 8, 12, isInPlace ? C.border : C.tileHi, isInPlace ? 0.4 : 0.2);
        game.draw.text(val + '', tx2 + CELL / 2, ty2 + CELL / 2 + 20, { size: 64, color: isInPlace ? C.border : C.tileNum, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.12);

    // Move counter
    var moveRatio = moves / MAX_MOVES;
    var moveCol = moveRatio > 0.8 ? C.wrong : moveRatio > 0.6 ? '#f59e0b' : C.text;
    game.draw.text(moves + ' / ' + MAX_MOVES + '手', W / 2, OY + SIZE * (CELL + GAP) + 60, { size: 48, color: moveCol, bold: true });

    game.draw.text(puzzlesSolved + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.border : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initBoard();
  });
})(game);
