// 185-slide-puzzle.js
// スライドパズル — 数字タイルを動かして1-8を順番に並べる、シンプルな知的快感
// 操作: タップで空きスペースに向けてタイルをスライド
// 成功: 正しい順番に並べる  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#060a10',
    tile:  '#1e3a5f',
    tileHi:'#2d5a8e',
    text:  '#93c5fd',
    empty: '#0a1420',
    done_c:'#22c55e',
    ui:    '#334155'
  };

  var SIZE = 3;
  var CELL = 280;
  var GAP = 12;
  var GW = SIZE * CELL + (SIZE - 1) * GAP;
  var GX = (W - GW) / 2;
  var GY = H * 0.3;

  var tiles = [];
  var emptyPos = SIZE * SIZE - 1;
  var done = false;
  var timeLeft = 60;
  var moves = 0;
  var animTiles = {};

  function initPuzzle() {
    tiles = [];
    for (var i = 0; i < SIZE * SIZE - 1; i++) tiles.push(i + 1);
    tiles.push(0); // 0 = empty
    emptyPos = SIZE * SIZE - 1;
    // Shuffle with valid moves
    for (var s = 0; s < 200; s++) {
      var er = Math.floor(emptyPos / SIZE);
      var ec = emptyPos % SIZE;
      var neighbors = [];
      if (er > 0) neighbors.push(emptyPos - SIZE);
      if (er < SIZE - 1) neighbors.push(emptyPos + SIZE);
      if (ec > 0) neighbors.push(emptyPos - 1);
      if (ec < SIZE - 1) neighbors.push(emptyPos + 1);
      var pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      tiles[emptyPos] = tiles[pick];
      tiles[pick] = 0;
      emptyPos = pick;
    }
  }

  function isSolved() {
    for (var i = 0; i < SIZE * SIZE - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[SIZE * SIZE - 1] === 0;
  }

  function trySlide(tapIdx) {
    var er = Math.floor(emptyPos / SIZE);
    var ec = emptyPos % SIZE;
    var tr = Math.floor(tapIdx / SIZE);
    var tc = tapIdx % SIZE;
    if ((Math.abs(er - tr) === 1 && ec === tc) || (er === tr && Math.abs(ec - tc) === 1)) {
      tiles[emptyPos] = tiles[tapIdx];
      tiles[tapIdx] = 0;
      emptyPos = tapIdx;
      moves++;
      return true;
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GX) / (CELL + GAP));
    var row = Math.floor((ty - GY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var idx = row * SIZE + col;
    if (tiles[idx] === 0) return;
    if (trySlide(idx)) {
      game.audio.play('se_tap', 0.35);
      if (isSolved()) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 40 + Math.max(0, 80 - moves) * 20 + 400); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var idx = r * SIZE + c;
        var cx = GX + c * (CELL + GAP);
        var cy = GY + r * (CELL + GAP);
        var val = tiles[idx];
        if (val === 0) {
          game.draw.rect(cx, cy, CELL, CELL, C.empty, 0.5);
          continue;
        }
        var isCorrect = val === idx + 1;
        var col = isCorrect ? C.done_c : C.tile;
        var hiCol = isCorrect ? '#86efac' : C.tileHi;
        game.draw.rect(cx, cy, CELL, CELL, col, 0.85);
        game.draw.rect(cx + 10, cy + 10, CELL - 20, 32, hiCol, 0.3);
        game.draw.rect(cx, cy + CELL - 10, CELL, 10, '#000', 0.2);
        game.draw.text(val + '', cx + CELL / 2, cy + CELL / 2, { size: 100, color: '#fff', bold: true });
      }
    }

    // Goal preview (tiny)
    game.draw.text('目標: 1-2-3 / 4-5-6 / 7-8-□', W / 2, GY + GW + 60, { size: 32, color: C.ui });
    game.draw.text(moves + ' 手', W / 2, GY + GW + 108, { size: 44, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tile : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initPuzzle();
  });
})(game);
