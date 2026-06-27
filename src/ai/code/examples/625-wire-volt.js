// 625-wire-volt.js
// ワイヤーボルト — 電気を流す回路を素早く完成させろ
// 操作: タップで回路パーツを90度回転
// 成功: 10回路完成  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020610',
    cell:    '#061020',
    cellHi:  '#0a1a30',
    wire:    '#1a3a5a',
    live:    '#00ddff',
    liveHi:  '#aaffff',
    source:  '#f59e0b',
    sourceHi:'#fde68a',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    text:    '#f1f5f9',
    ui:      '#0a0f20',
    miss:    '#ef4444'
  };

  // Tile types (which sides have connections): 0=N,1=E,2=S,3=W
  // L-piece: 2 adjacent sides
  // T-piece: 3 sides
  // I-piece: 2 opposite sides
  var TILE_TYPES = [
    [0, 1],       // L NE
    [0, 2],       // I NS
    [1, 2],       // L ES
    [1, 3],       // I EW
    [0, 1, 2],    // T NES
    [0, 1, 3],    // T NEW
    [0, 2, 3],    // T NSW
    [1, 2, 3],    // T ESW
  ];

  var COLS = 5, ROWS = 5;
  var CELL_SIZE = 160;
  var PAD = 8;
  var GRID_W = COLS * (CELL_SIZE + PAD) - PAD;
  var GRID_OX = (W - GRID_W) / 2;
  var GRID_OY = H * 0.22;

  var tiles = []; // { type, rotation (0-3), live }
  var sourcePos = null;
  var goalPos = null;
  var successes = 0;
  var NEEDED = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.goal;
  var resultText = '';
  var resultTimer = 0;

  function tileSides(typeIdx, rotation) {
    var base = TILE_TYPES[typeIdx];
    return base.map(function(s) { return (s + rotation) % 4; });
  }

  function hasConnection(typeIdx, rotation, side) {
    return tileSides(typeIdx, rotation).indexOf(side) >= 0;
  }

  function opposite(side) { return (side + 2) % 4; }

  function propagate() {
    // BFS from source, mark live tiles
    for (var i = 0; i < tiles.length; i++) tiles[i].live = false;
    if (!sourcePos) return;
    var queue = [{ r: sourcePos.r, c: sourcePos.c }];
    tiles[sourcePos.r * COLS + sourcePos.c].live = true;

    while (queue.length > 0) {
      var cur = queue.shift();
      var t = tiles[cur.r * COLS + cur.c];
      var sides = tileSides(t.type, t.rotation);
      // N=0,E=1,S=2,W=3
      var neighbors = [
        { dr: -1, dc: 0, side: 0 },
        { dr: 0, dc: 1, side: 1 },
        { dr: 1, dc: 0, side: 2 },
        { dr: 0, dc: -1, side: 3 }
      ];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nb = neighbors[ni];
        var nr2 = cur.r + nb.dr, nc2 = cur.c + nb.dc;
        if (nr2 < 0 || nr2 >= ROWS || nc2 < 0 || nc2 >= COLS) continue;
        if (tiles[nr2 * COLS + nc2].live) continue;
        if (sides.indexOf(nb.side) < 0) continue;
        // Neighbor must connect back
        var nt = tiles[nr2 * COLS + nc2];
        if (!hasConnection(nt.type, nt.rotation, opposite(nb.side))) continue;
        tiles[nr2 * COLS + nc2].live = true;
        queue.push({ r: nr2, c: nc2 });
      }
    }
  }

  function checkGoal() {
    if (!goalPos) return false;
    return tiles[goalPos.r * COLS + goalPos.c].live;
  }

  function loadPuzzle() {
    tiles = [];
    for (var i = 0; i < COLS * ROWS; i++) {
      tiles.push({
        type: Math.floor(Math.random() * TILE_TYPES.length),
        rotation: Math.floor(Math.random() * 4),
        live: false
      });
    }
    sourcePos = { r: ROWS - 1, c: Math.floor(Math.random() * COLS) };
    do {
      goalPos = { r: Math.floor(Math.random() * (ROWS - 2)), c: Math.floor(Math.random() * COLS) };
    } while (goalPos.r === sourcePos.r && goalPos.c === sourcePos.c);
    // Give source/goal special tiles
    tiles[sourcePos.r * COLS + sourcePos.c].type = 0;
    tiles[goalPos.r * COLS + goalPos.c].type = 0;
    propagate();
  }

  function cellPos(r, c) {
    return {
      x: GRID_OX + c * (CELL_SIZE + PAD),
      y: GRID_OY + r * (CELL_SIZE + PAD)
    };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find clicked tile
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var pos = cellPos(r, c);
        if (tx >= pos.x && tx <= pos.x + CELL_SIZE && ty >= pos.y && ty <= pos.y + CELL_SIZE) {
          if (r === sourcePos.r && c === sourcePos.c) return;
          if (r === goalPos.r && c === goalPos.c) return;
          tiles[r * COLS + c].rotation = (tiles[r * COLS + c].rotation + 1) % 4;
          game.audio.play('se_tap', 0.2);
          propagate();
          if (checkGoal()) {
            successes++;
            flashCol = C.goal;
            flashAnim = 0.35;
            resultText = '回路完成!';
            resultTimer = 0.8;
            game.audio.play('se_success', 0.7);
            var gPos = cellPos(goalPos.r, goalPos.c);
            for (var p = 0; p < 10; p++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: gPos.x + CELL_SIZE / 2, y: gPos.y + CELL_SIZE / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.goalHi });
            }
            if (successes >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(successes * 500 + Math.ceil(timeLeft) * 100); }, 800);
            } else {
              setTimeout(function() { if (!done) loadPuzzle(); }, 1200);
            }
          }
          return;
        }
      }
    }
  });

  function drawWire(x, y, side, live) {
    var cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;
    var col = live ? C.live : C.wire;
    var ex, ey;
    if (side === 0) { ex = cx; ey = y; }
    else if (side === 1) { ex = x + CELL_SIZE; ey = cy; }
    else if (side === 2) { ex = cx; ey = y + CELL_SIZE; }
    else { ex = x; ey = cy; }
    game.draw.line(cx, cy, ex, ey, col, live ? 8 : 5);
    if (live) game.draw.line(cx, cy, ex, ey, C.liveHi, 3);
  }

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

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var pos = cellPos(r, c);
        var t = tiles[r * COLS + c];
        var isSource = r === sourcePos.r && c === sourcePos.c;
        var isGoal = r === goalPos.r && c === goalPos.c;
        var bgCol = isSource ? C.source : (isGoal ? C.goal : C.cell);
        game.draw.rect(pos.x, pos.y, CELL_SIZE, CELL_SIZE, bgCol, isSource || isGoal ? 0.35 : 0.8);
        game.draw.rect(pos.x + 2, pos.y + 2, CELL_SIZE - 4, CELL_SIZE - 4, C.cellHi, 0.15);

        // Draw wires
        var sides = tileSides(t.type, t.rotation);
        for (var si = 0; si < sides.length; si++) {
          drawWire(pos.x, pos.y, sides[si], t.live);
        }
        // Center dot
        var cc = t.live ? C.liveHi : C.wire;
        game.draw.circle(pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2, t.live ? 16 : 10, cc, t.live ? 0.9 : 0.5);

        if (isSource) {
          game.draw.circle(pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2, 24, C.sourceHi, 0.6);
          game.draw.text('⚡', pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2 + 8, { size: 32 });
        }
        if (isGoal) {
          game.draw.circle(pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2, 24, C.goalHi, 0.6 + Math.sin(elapsed * 4) * 0.1);
        }
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) game.draw.text(resultText, W / 2, H * 0.9, { size: 56, color: flashCol, bold: true });

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.live : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    loadPuzzle();
  });
})(game);
