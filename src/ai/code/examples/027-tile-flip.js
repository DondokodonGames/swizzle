// 027-tile-flip.js
// タイルフリップ — 裏返したタイルが全部同じ色になる瞬間の達成感
// 操作: タップでタイルを反転（隣接タイルも連動）
// 成功: 全タイルを同じ色に揃える  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0c10',
    tileA:   '#6366f1',
    tileAHi: '#a5b4fc',
    tileB:   '#ec4899',
    tileBHi: '#f9a8d4',
    edge:    '#1e2030',
    ui:      '#475569',
    win:     '#22c55e'
  };

  var COLS = 5;
  var ROWS = 5;
  var TILE = 180;
  var GAP = 8;
  var GRID_W = COLS * TILE + (COLS - 1) * GAP;
  var GRID_H = ROWS * TILE + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2 - 60;

  var TOTAL = COLS * ROWS;
  var tiles = []; // 0 = A (indigo), 1 = B (pink)
  var flipAnims = []; // per-tile flip animation progress

  var timeLeft = 30;
  var done = false;
  var winFlash = 0;
  var moves = 0;

  function init() {
    tiles = [];
    flipAnims = [];
    for (var i = 0; i < TOTAL; i++) {
      tiles.push(Math.random() < 0.5 ? 0 : 1);
      flipAnims.push(0);
    }
    // Ensure it's not already solved
    var firstVal = tiles[0];
    var allSame = tiles.every(function(t) { return t === firstVal; });
    if (allSame) tiles[0] = 1 - tiles[0];
  }

  function idx(c, r) { return r * COLS + c; }

  function flip(col, row) {
    // Flip this tile and orthogonal neighbors (Lights Out style)
    var toFlip = [[col, row], [col-1, row], [col+1, row], [col, row-1], [col, row+1]];
    for (var i = 0; i < toFlip.length; i++) {
      var tc = toFlip[i][0], tr = toFlip[i][1];
      if (tc >= 0 && tc < COLS && tr >= 0 && tr < ROWS) {
        var ti = idx(tc, tr);
        tiles[ti] = 1 - tiles[ti];
        flipAnims[ti] = 0.25; // trigger flip animation
      }
    }
    moves++;
  }

  function isSolved() {
    var first = tiles[0];
    for (var i = 1; i < TOTAL; i++) {
      if (tiles[i] !== first) return false;
    }
    return true;
  }

  game.onTap(function(x, y) {
    if (done) return;
    var col = Math.floor((x - GRID_X) / (TILE + GAP));
    var row = Math.floor((y - GRID_Y) / (TILE + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    // Verify tap is inside the tile (not in gap)
    var tileX = GRID_X + col * (TILE + GAP);
    var tileY = GRID_Y + row * (TILE + GAP);
    if (x > tileX + TILE || y > tileY + TILE) return;

    flip(col, row);
    game.audio.play('se_tap', 0.6);

    if (isSolved()) {
      done = true;
      winFlash = 1.0;
      game.audio.play('se_success');
      setTimeout(function() {
        game.end.success(Math.max(10, Math.ceil((30 - moves) * 8) + Math.ceil(timeLeft) * 5));
      }, 800);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Update flip animations
    for (var i = 0; i < TOTAL; i++) {
      if (flipAnims[i] > 0) flipAnims[i] -= dt * 2;
    }
    if (winFlash > 0) winFlash -= dt * 2;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Win flash
    if (winFlash > 0) {
      game.draw.rect(0, 0, W, H, C.win, winFlash * 0.3);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#0a0c10');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#4f46e5' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Moves counter
    game.draw.text('手数: ' + moves, W / 2, 128, { size: 52, color: '#a5b4fc', bold: true });

    // Count of each color (progress gauge)
    var countA = 0;
    for (var j = 0; j < TOTAL; j++) { if (tiles[j] === 0) countA++; }
    var countB = TOTAL - countA;
    game.draw.text('■ ' + countA, W * 0.3, 200, { size: 44, color: C.tileA, bold: true });
    game.draw.text('■ ' + countB, W * 0.7, 200, { size: 44, color: C.tileB, bold: true });

    // Tiles
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var ti = idx(c, r);
        var tx = GRID_X + c * (TILE + GAP);
        var ty = GRID_Y + r * (TILE + GAP);
        var anim = flipAnims[ti]; // 0..0.25 remaining
        var flipProg = 1 - Math.max(0, anim) / 0.25; // 0=mid-flip, 1=done

        // squish during flip
        var squish = anim > 0 ? Math.abs(Math.cos(flipProg * Math.PI)) : 1;
        var tw = TILE * squish;
        var offX = (TILE - tw) / 2;

        var col2 = tiles[ti] === 0 ? C.tileA : C.tileB;
        var colHi = tiles[ti] === 0 ? C.tileAHi : C.tileBHi;

        // shadow
        game.draw.rect(tx + offX + 6, ty + 8, tw, TILE, '#000', 0.3);
        // edge
        game.draw.rect(tx + offX - 4, ty - 4, tw + 8, TILE + 8, C.edge);
        // body
        game.draw.rect(tx + offX, ty, tw, TILE, col2);
        // shine
        if (squish > 0.1) {
          game.draw.rect(tx + offX + 12, ty + 12, tw - 24, TILE * 0.3, colHi, 0.4);
        }
      }
    }

    // Guide
    game.draw.text('タップで周囲も反転！', W / 2, H - 220, { size: 52, color: C.ui });
    game.draw.text('全部同じ色に揃えろ', W / 2, H - 155, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    init();
  });
})(game);
