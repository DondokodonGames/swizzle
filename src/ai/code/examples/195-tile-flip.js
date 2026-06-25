// 195-tile-flip.js
// タイルフリップ — 全タイルを白に揃える、タップすると周囲も反転するパズル
// 操作: タップでタイルと隣接タイルをフリップ
// 成功: 全タイルを白にする  失敗: 30手使い切る

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040608',
    white:  '#e2e8f0',
    black:  '#0f172a',
    whiteHi:'#f8fafc',
    blackHi:'#1e293b',
    btn:    '#334155',
    win:    '#22c55e',
    ui:     '#475569'
  };

  var SIZE = 5;
  var CELL = 168;
  var GAP = 12;
  var GW = SIZE * CELL + (SIZE - 1) * GAP;
  var GX = (W - GW) / 2;
  var GY = H * 0.28;

  var grid = [];
  var moves = 0;
  var MAX_MOVES = 30;
  var done = false;
  var elapsed = 0;

  function flip(r, c) {
    var dirs = [[0,0],[-1,0],[1,0],[0,-1],[0,1]];
    for (var di = 0; di < dirs.length; di++) {
      var nr = r + dirs[di][0], nc = c + dirs[di][1];
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        grid[nr * SIZE + nc] = 1 - grid[nr * SIZE + nc];
      }
    }
  }

  function initGrid() {
    grid = [];
    for (var i = 0; i < SIZE * SIZE; i++) grid.push(0);
    // Apply random flips to create solvable puzzle
    for (var s = 0; s < 8; s++) {
      var r = Math.floor(Math.random() * SIZE);
      var c = Math.floor(Math.random() * SIZE);
      flip(r, c);
    }
  }

  function checkWin() {
    for (var i = 0; i < grid.length; i++) if (grid[i] !== 1) return false;
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GX) / (CELL + GAP));
    var row = Math.floor((ty - GY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var cx = GX + col * (CELL + GAP);
    var cy = GY + row * (CELL + GAP);
    if (tx < cx || tx > cx + CELL || ty < cy || ty > cy + CELL) return;
    flip(row, col);
    moves++;
    game.audio.play('se_tap', 0.4);
    if (checkWin()) {
      done = true;
      game.audio.play('se_success');
      var bonus = (MAX_MOVES - moves + 1) * 100 + 400;
      setTimeout(function() { game.end.success(bonus); }, 400);
    } else if (moves >= MAX_MOVES) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    elapsed += dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var idx = r * SIZE + c;
        var cx2 = GX + c * (CELL + GAP);
        var cy2 = GY + r * (CELL + GAP);
        var isWhite = grid[idx] === 1;
        var col2 = isWhite ? C.white : C.black;
        var hiCol = isWhite ? C.whiteHi : C.blackHi;
        game.draw.rect(cx2, cy2, CELL, CELL, col2, 0.9);
        game.draw.rect(cx2 + 8, cy2 + 8, CELL - 16, 24, hiCol, isWhite ? 0.4 : 0.2);
        if (!isWhite) {
          // Dark sparkle
          game.draw.circle(cx2 + CELL / 2, cy2 + CELL / 2, 20, '#1e40af', 0.2);
        }
      }
    }

    var movesLeft = MAX_MOVES - moves;
    var mc = movesLeft <= 5 ? '#ef4444' : '#f1f5f9';
    game.draw.text('残り ' + movesLeft + ' 手', W / 2, GY + GW + 70, { size: 52, color: mc, bold: true });
    game.draw.text('全部を白にしろ！', W / 2, H * 0.93, { size: 40, color: C.ui });

    var ratio = (MAX_MOVES - moves) / MAX_MOVES;
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.win : '#ef4444');
    game.draw.text(moves + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initGrid();
  });
})(game);
