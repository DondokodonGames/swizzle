// 145-wire-connect.js
// 配線つなぎ — 回路を繋いで電流を流す達成感のあるパズルゲーム
// 操作: タップで電線セグメントを回転させる
// 成功: 5面クリア  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    cell:    '#0a1020',
    wire:    '#94a3b8',
    wireOn:  '#22d3ee',
    wireGlow:'#67e8f9',
    source:  '#f59e0b',
    sourceOn:'#fef08a',
    sink:    '#a855f7',
    sinkOn:  '#d8b4fe',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var CELL = 180;
  var COLS = 5;
  var ROWS = 7;
  var OX = (W - COLS * CELL) / 2;
  var OY = H * 0.15;

  // Pipe segment types (bitmask: 1=up, 2=right, 4=down, 8=left)
  // Types: straight-H (2+8=10), straight-V (1+4=5),
  //        corner (1+2, 2+4, 4+8, 1+8 = 3,6,12,9), T (7,11,13,14), cross (15), end (1,2,4,8)
  // Each cell: { type, rot } where connections = rotate type by rot*90 degrees
  function rotateBit(bits, times) {
    var b = bits;
    for (var i = 0; i < times; i++) {
      // rotate connections 90 deg clockwise: up->right, right->down, down->left, left->up
      var newb = 0;
      if (b & 1) newb |= 2;  // up -> right
      if (b & 2) newb |= 4;  // right -> down
      if (b & 4) newb |= 8;  // down -> left
      if (b & 8) newb |= 1;  // left -> up
      b = newb;
    }
    return b;
  }

  var LEVELS = [
    // Simple 3-col, 4-row subset
    {
      grid: [
        [{t:2,r:0},{t:5,r:0},{t:2,r:0},{t:8,r:0},{t:0,r:0}],
        [{t:0,r:0},{t:1,r:0},{t:4,r:0},{t:5,r:0},{t:0,r:0}],
        [{t:0,r:0},{t:2,r:1},{t:4,r:0},{t:1,r:0},{t:0,r:0}],
        [{t:0,r:0},{t:0,r:0},{t:14,r:0},{t:0,r:0},{t:0,r:0}],
        [{t:0,r:0},{t:0,r:0},{t:1,r:0},{t:0,r:0},{t:0,r:0}],
        [{t:0,r:0},{t:0,r:0},{t:1,r:0},{t:0,r:0},{t:0,r:0}],
        [{t:0,r:0},{t:0,r:0},{t:4,r:0},{t:0,r:0},{t:0,r:0}]
      ],
      source: {r:0,c:0}, sink: {r:6,c:2}
    }
  ];

  // Use a simpler approach: generate random pipe grids
  var pipes = [];
  var sourceCell = {r:0, c:2};
  var sinkCell = {r:ROWS-1, c:2};
  var energized = [];
  var score = 0;
  var needed = 5;
  var timeLeft = 60;
  var done = false;
  var winFlash = 0;

  function makeGrid() {
    pipes = [];
    for (var r = 0; r < ROWS; r++) {
      pipes.push([]);
      for (var c = 0; c < COLS; c++) {
        // Assign pipe type
        var t = 0;
        if (r === sourceCell.r && c === sourceCell.c) t = 4; // source: connects down
        else if (r === sinkCell.r && c === sinkCell.c) t = 1; // sink: connects up
        else {
          // Random: corner or straight
          var types = [3, 5, 6, 9, 10, 12];
          t = types[Math.floor(Math.random() * types.length)];
        }
        pipes[r].push({ t: t, r: Math.floor(Math.random() * 4), lit: false });
      }
    }
    computeEnergy();
  }

  function getConnections(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    return rotateBit(pipes[r][c].t, pipes[r][c].r);
  }

  function computeEnergy() {
    // BFS from source
    var lit = [];
    for (var r = 0; r < ROWS; r++) {
      lit.push([]);
      for (var c = 0; c < COLS; c++) { lit[r].push(false); pipes[r][c].lit = false; }
    }
    var queue = [{r: sourceCell.r, c: sourceCell.c}];
    lit[sourceCell.r][sourceCell.c] = true;
    pipes[sourceCell.r][sourceCell.c].lit = true;

    while (queue.length > 0) {
      var cell = queue.shift();
      var conn = getConnections(cell.r, cell.c);
      var neighbors = [
        {nr: cell.r-1, nc: cell.c, myBit: 1, theirBit: 4},  // up
        {nr: cell.r, nc: cell.c+1, myBit: 2, theirBit: 8},  // right
        {nr: cell.r+1, nc: cell.c, myBit: 4, theirBit: 1},  // down
        {nr: cell.r, nc: cell.c-1, myBit: 8, theirBit: 2},  // left
      ];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var n = neighbors[ni];
        if (n.nr < 0 || n.nr >= ROWS || n.nc < 0 || n.nc >= COLS) continue;
        if (lit[n.nr][n.nc]) continue;
        if ((conn & n.myBit) && (getConnections(n.nr, n.nc) & n.theirBit)) {
          lit[n.nr][n.nc] = true;
          pipes[n.nr][n.nc].lit = true;
          queue.push({r: n.nr, c: n.nc});
        }
      }
    }
    return lit[sinkCell.r][sinkCell.c];
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if ((r === sourceCell.r && c === sourceCell.c) || (r === sinkCell.r && c === sinkCell.c)) return;
    pipes[r][c].r = (pipes[r][c].r + 1) % 4;
    game.audio.play('se_tap', 0.4);
    var connected = computeEnergy();
    if (connected) {
      score++;
      winFlash = 0.8;
      game.audio.play('se_success');
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score*100 + Math.ceil(timeLeft)*20); }, 800);
        return;
      }
      setTimeout(function() { makeGrid(); }, 900);
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
    if (winFlash > 0) winFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = OX + c * CELL;
        var y = OY + r * CELL;
        game.draw.rect(x+2, y+2, CELL-4, CELL-4, C.cell, 0.8);

        var conn = getConnections(r, c);
        var isLit = pipes[r][c].lit;
        var isSource = r === sourceCell.r && c === sourceCell.c;
        var isSink = r === sinkCell.r && c === sinkCell.c;
        var wireCol = isLit ? C.wireOn : C.wire;
        var wireW = 14;
        var cx = x + CELL/2, cy = y + CELL/2;

        // Draw pipe segments
        if (conn & 1) game.draw.line(cx, cy, cx, y+2, wireCol, wireW); // up
        if (conn & 2) game.draw.line(cx, cy, x+CELL-2, cy, wireCol, wireW); // right
        if (conn & 4) game.draw.line(cx, cy, cx, y+CELL-2, wireCol, wireW); // down
        if (conn & 8) game.draw.line(cx, cy, x+2, cy, wireCol, wireW); // left

        // Center node
        game.draw.circle(cx, cy, 16, wireCol, 0.8);

        if (isSource) {
          game.draw.circle(cx, cy, 28, C.source, 0.9);
          game.draw.text('⚡', cx, cy, { size: 32, color: '#fff' });
        }
        if (isSink) {
          game.draw.circle(cx, cy, 28, isLit ? C.sinkOn : C.sink, 0.9);
          game.draw.text('★', cx, cy, { size: 28, color: '#fff' });
        }
        if (isLit && !isSource && !isSink) {
          game.draw.circle(cx, cy, 10, C.wireGlow, 0.8);
        }
      }
    }

    if (winFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wireOn, winFlash * 0.2);
      game.draw.text('回路完成！', W/2, H * 0.06, { size: 72, color: C.wireGlow, bold: true });
    }

    game.draw.text('面: ' + score + ' / ' + needed, W/2, 148, { size: 56, color: '#f1f5f9', bold: true });
    game.draw.text('タップで配線を回転', W/2, H * 0.92, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.wireOn : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    makeGrid();
  });
})(game);
