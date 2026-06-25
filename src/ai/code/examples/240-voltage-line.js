// 240-voltage-line.js
// ボルテージライン — 導線をつなぎ直して電気を流す回路パズル
// 操作: タップで導線のパーツを回転させる
// 成功: 全回路に電気を通す  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    tile:   '#0f172a',
    tileHi: '#1e293b',
    wire:   '#64748b',
    wireOn: '#22c55e',
    wireHi: '#86efac',
    source: '#f59e0b',
    lamp:   '#fde68a',
    lampOff:'#374151',
    ui:     '#475569'
  };

  var COLS = 5;
  var ROWS = 7;
  var CELL = Math.min(Math.floor((W - 80) / COLS), Math.floor((H * 0.75) / ROWS));
  var OX = Math.floor((W - COLS * CELL) / 2);
  var OY = Math.floor(H * 0.1);

  // Piece types — bitmask: bit0=up, bit1=right, bit2=down, bit3=left
  // 0110 (6) = right+down (corner)
  // 0101 (5) = up+down (straight vertical)
  // 0011 (3) = up+right (corner)
  // 1001 (9) = up+left (corner)
  // 1010 (10) = right+left (straight horizontal)
  // 1100 (12) = left+down (corner)

  var PIECE_TYPES = [3, 5, 6, 9, 10, 12];

  var grid = [];
  var powered = [];
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var SOURCE = { col: 0, row: Math.floor(ROWS / 2) };
  var LAMP = { col: COLS - 1, row: Math.floor(ROWS / 2) };

  function initGrid() {
    grid = [];
    powered = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      powered[r] = [];
      for (var c = 0; c < COLS; c++) {
        powered[r][c] = false;
        if (c === SOURCE.col && r === SOURCE.row) {
          grid[r][c] = { type: 10, rot: 0 }; // horizontal straight (source exits right)
        } else if (c === LAMP.col && r === LAMP.row) {
          grid[r][c] = { type: 10, rot: 0 }; // horizontal straight (enters from left)
        } else {
          var typeIdx = Math.floor(Math.random() * PIECE_TYPES.length);
          var rot = Math.floor(Math.random() * 4);
          grid[r][c] = { type: PIECE_TYPES[typeIdx], rot: rot };
        }
      }
    }
  }

  function getConnections(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    var piece = grid[r][c];
    var t = piece.type;
    // Rotate the bitmask by rot * 90 degrees
    var rot = piece.rot % 4;
    for (var i = 0; i < rot; i++) {
      // Rotate: bit0(up)->bit1(right)->bit2(down)->bit3(left)->bit0
      var newT = 0;
      if (t & 1) newT |= 2;  // up -> right
      if (t & 2) newT |= 4;  // right -> down
      if (t & 4) newT |= 8;  // down -> left
      if (t & 8) newT |= 1;  // left -> up
      t = newT;
    }
    return t;
  }

  function floodPower() {
    for (var r = 0; r < ROWS; r++) {
      powered[r] = [];
      for (var c = 0; c < COLS; c++) powered[r][c] = false;
    }
    var queue = [{ r: SOURCE.row, c: SOURCE.col }];
    powered[SOURCE.row][SOURCE.col] = true;
    var dirs = [[-1,0,1,2],[0,1,2,3],[1,0,4,0],[0,-1,8,1]]; // [dr, dc, myBit, neighborBit]
    // myBit: which side I connect, neighborBit: which side neighbor needs
    var DIRS = [
      { dr: -1, dc: 0, myBit: 1, nbBit: 4 },  // up
      { dr: 0,  dc: 1, myBit: 2, nbBit: 8 },  // right
      { dr: 1,  dc: 0, myBit: 4, nbBit: 1 },  // down
      { dr: 0,  dc: -1, myBit: 8, nbBit: 2 }  // left
    ];
    while (queue.length > 0) {
      var cur = queue.shift();
      var myConn = getConnections(cur.r, cur.c);
      for (var di = 0; di < DIRS.length; di++) {
        var d = DIRS[di];
        var nr = cur.r + d.dr, nc = cur.c + d.dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (powered[nr][nc]) continue;
        if (!(myConn & d.myBit)) continue; // I don't connect that way
        var nbConn = getConnections(nr, nc);
        if (!(nbConn & d.nbBit)) continue; // neighbor doesn't connect back
        powered[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
    return powered[LAMP.row][LAMP.col];
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    // Don't rotate source or lamp
    if ((c === SOURCE.col && r === SOURCE.row) || (c === LAMP.col && r === LAMP.row)) return;
    grid[r][c].rot = (grid[r][c].rot + 1) % 4;
    game.audio.play('se_tap', 0.3);

    if (floodPower() && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 200 + 500); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    floodPower();

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;
        var cx2 = gx + CELL / 2;
        var cy2 = gy + CELL / 2;
        var isPowered = powered[r][c];

        // Background
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.tile, 0.8);

        var conn = getConnections(r, c);
        var wireCol = isPowered ? C.wireOn : C.wire;
        var wireW = 6;

        // Draw wire segments
        if (conn & 1) game.draw.line(cx2, cy2, cx2, gy, wireCol, wireW);          // up
        if (conn & 2) game.draw.line(cx2, cy2, gx + CELL, cy2, wireCol, wireW);  // right
        if (conn & 4) game.draw.line(cx2, cy2, cx2, gy + CELL, wireCol, wireW);  // down
        if (conn & 8) game.draw.line(cx2, cy2, gx, cy2, wireCol, wireW);          // left

        // Center dot
        game.draw.circle(cx2, cy2, wireW / 2, isPowered ? C.wireHi : wireCol, 0.9);

        // Source
        if (c === SOURCE.col && r === SOURCE.row) {
          game.draw.circle(cx2, cy2, 18, C.source, 0.9);
          game.draw.text('⚡', cx2, cy2, { size: 24, color: '#fff' });
        }

        // Lamp
        if (c === LAMP.col && r === LAMP.row) {
          var lampCol = isPowered ? C.lamp : C.lampOff;
          game.draw.circle(cx2, cy2, 18, lampCol, 0.9);
          if (isPowered) {
            var pulse = 0.4 + 0.4 * Math.abs(Math.sin(elapsed * 6));
            game.draw.circle(cx2, cy2, 30, C.lamp, pulse * 0.4);
          }
          game.draw.text('●', cx2, cy2, { size: 24, color: isPowered ? '#fff' : '#666' });
        }
      }
    }

    // Lamp status
    var lampOn = powered[LAMP.row] && powered[LAMP.row][LAMP.col];
    game.draw.text(lampOn ? '回路接続中！' : '回路をつなげ！', W / 2, H * 0.9, { size: 44, color: lampOn ? C.wireOn : C.ui, bold: lampOn });
    game.draw.text('タップで回転', W / 2, H * 0.94, { size: 34, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireOn : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initGrid();
  });
})(game);
