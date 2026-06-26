// 425-tile-slide.js
// タイルスライド — 8パズルを素早く解く
// 操作: タップでタイルを空白スペースにスライド
// 成功: 3×3パズルを3回完成させる  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0618',
    board:  '#1e1b4b',
    tile:   '#4338ca',
    tileHi: '#818cf8',
    tileSh: '#312e81',
    empty:  '#0f0c2e',
    num:    '#e0e7ff',
    correct:'#22c55e',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444'
  };

  var SIZE = 3;
  var TILE_W = 280;
  var TILE_H = 280;
  var GAP = 12;
  var BOARD_W = SIZE * TILE_W + (SIZE-1) * GAP;
  var BOARD_H = SIZE * TILE_H + (SIZE-1) * GAP;
  var BOARD_X = (W - BOARD_W) / 2;
  var BOARD_Y = (H - BOARD_H) / 2;

  var grid = [];  // 1D array of 9, 0 = empty
  var emptyIdx = 8;
  var solved = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0;
  var moves = 0;
  var slideAnim = [];  // { idx, dx, dy, t }

  function initPuzzle() {
    // Fill 1-8, 0 last
    grid = [1,2,3,4,5,6,7,8,0];
    emptyIdx = 8;
    // Shuffle with valid swaps
    for (var i = 0; i < 80; i++) {
      var neighbors = getNeighbors(emptyIdx);
      var n = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[emptyIdx] = grid[n];
      grid[n] = 0;
      emptyIdx = n;
    }
    slideAnim = [];
  }

  function getNeighbors(idx) {
    var row = Math.floor(idx / SIZE);
    var col = idx % SIZE;
    var nbrs = [];
    if (row > 0) nbrs.push(idx - SIZE);  // up
    if (row < SIZE-1) nbrs.push(idx + SIZE);  // down
    if (col > 0) nbrs.push(idx - 1);  // left
    if (col < SIZE-1) nbrs.push(idx + 1);  // right
    return nbrs;
  }

  function isSolved() {
    for (var i = 0; i < 8; i++) {
      if (grid[i] !== i + 1) return false;
    }
    return grid[8] === 0;
  }

  function slideTile(idx) {
    if (grid[idx] === 0) return;
    var row = Math.floor(idx / SIZE);
    var col = idx % SIZE;
    var eRow = Math.floor(emptyIdx / SIZE);
    var eCol = emptyIdx % SIZE;

    // Check adjacency
    var isAdj = (Math.abs(row - eRow) + Math.abs(col - eCol)) === 1;
    if (!isAdj) return;

    var dx = (eCol - col) * (TILE_W + GAP);
    var dy = (eRow - row) * (TILE_H + GAP);
    slideAnim.push({ idx: idx, dx: dx, dy: dy, t: 0 });

    grid[emptyIdx] = grid[idx];
    grid[idx] = 0;
    emptyIdx = idx;
    moves++;
    game.audio.play('se_tap', 0.25);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - BOARD_X) / (TILE_W + GAP));
    var row = Math.floor((ty - BOARD_Y) / (TILE_H + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var idx = row * SIZE + col;
    slideTile(idx);

    if (isSolved()) {
      solved++;
      flashAnim = 0.8;
      game.audio.play('se_success', 0.7);
      if (solved >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(solved * 1000 + Math.ceil(timeLeft) * 50); }, 700);
        return;
      }
      setTimeout(function() { initPuzzle(); }, 900);
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

    for (var ai = slideAnim.length-1; ai >= 0; ai--) {
      slideAnim[ai].t = Math.min(1, slideAnim[ai].t + dt * 8);
      if (slideAnim[ai].t >= 1) slideAnim.splice(ai, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Board background
    game.draw.rect(BOARD_X - 16, BOARD_Y - 16, BOARD_W + 32, BOARD_H + 32, C.board, 0.6);

    // Tiles
    for (var ti = 0; ti < 9; ti++) {
      var tr = Math.floor(ti / SIZE);
      var tc = ti % SIZE;
      var tx2 = BOARD_X + tc * (TILE_W + GAP);
      var ty2 = BOARD_Y + tr * (TILE_H + GAP);

      // Check slide animation offset
      var offX = 0, offY = 0;
      for (var ai2 = 0; ai2 < slideAnim.length; ai2++) {
        if (slideAnim[ai2].idx === ti) {
          var t = slideAnim[ai2].t;
          var ease = 1 - Math.pow(1-t, 3);
          offX = slideAnim[ai2].dx * (1-ease);
          offY = slideAnim[ai2].dy * (1-ease);
        }
      }

      if (grid[ti] === 0) {
        // Empty space
        game.draw.rect(tx2, ty2, TILE_W, TILE_H, C.empty, 0.7);
        continue;
      }

      // Tile
      game.draw.rect(tx2 + offX + 5, ty2 + offY + 6, TILE_W, TILE_H, C.tileSh, 0.5);
      var isCorrect = grid[ti] === ti + 1;
      var tileBg = isCorrect ? C.correct : C.tile;
      game.draw.rect(tx2 + offX, ty2 + offY, TILE_W, TILE_H, tileBg, 0.85);
      game.draw.rect(tx2 + offX, ty2 + offY, TILE_W, TILE_H/4, '#fff', 0.08);
      game.draw.text(grid[ti] + '', tx2 + offX + TILE_W/2, ty2 + offY + TILE_H/2 + 20, { size: 100, color: C.num, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.1);

    // Progress dots
    for (var si = 0; si < NEEDED; si++) {
      game.draw.circle(W/2 - (NEEDED-1)*44 + si*88, H*0.88, 22, si < solved ? C.correct : C.ui, 0.9);
    }

    game.draw.text(solved + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tileHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initPuzzle();
  });
})(game);
