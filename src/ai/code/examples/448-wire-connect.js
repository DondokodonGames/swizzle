// 448-wire-connect.js
// 配線パズル — 回路の断線を繋いで電流を通す
// 操作: タップで断線した部分を繋ぐ（向きが合っていないと繋がらない）
// 成功: 5回路完成  失敗: 10ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    board:  '#0a1628',
    boardHi:'#0f2040',
    wire:   '#334155',
    wireOn: '#22d3ee',
    wireHi: '#a5f3fc',
    node:   '#475569',
    nodeOn: '#fbbf24',
    nodeHi: '#fef08a',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    power:  '#f97316'
  };

  var GRID = 6;
  var CELL = 140;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 60;

  var tiles = [];
  var broken = [];  // broken connections
  var misses = 0;
  var MAX_MISS = 10;
  var completed = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 60;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var flowAnim = 0;

  // Tile types: 0=empty, 1=straight-H, 2=straight-V, 3=corner-TL, 4=corner-TR, 5=corner-BR, 6=corner-BL, 7=T-junction, 8=cross
  // Connections: {up,down,left,right}
  var CONNS = [
    {},                               // 0: empty
    { left:true, right:true },        // 1: straight H
    { up:true, down:true },           // 2: straight V
    { down:true, right:true },        // 3: corner TL→BR
    { down:true, left:true },         // 4: corner TR→BL
    { up:true, left:true },           // 5: corner BR→TL
    { up:true, right:true },          // 6: corner BL→TR
    { up:true, left:true, right:true },// 7: T-up
    { up:true, down:true, left:true, right:true } // 8: cross
  ];

  function generateCircuit() {
    tiles = [];
    for (var i = 0; i < GRID * GRID; i++) tiles.push(0);

    // Place a simple path from left to right
    var path = [];
    var px = 0;
    var py = Math.floor(GRID / 2);
    path.push({ x: px, y: py });

    while (px < GRID - 1) {
      var dirs = [];
      if (px < GRID - 1) dirs.push({ dx: 1, dy: 0 });
      if (py < GRID - 2 && Math.random() < 0.3) dirs.push({ dx: 0, dy: 1 });
      if (py > 1 && Math.random() < 0.3) dirs.push({ dx: 0, dy: -1 });
      var dir = dirs[Math.floor(Math.random() * dirs.length)];
      px += dir.dx;
      py += dir.dy;
      if (py < 0) py = 0;
      if (py >= GRID) py = GRID - 1;
      path.push({ x: px, y: py });
    }

    // Assign tiles along path
    for (var pi2 = 0; pi2 < path.length; pi2++) {
      var p = path[pi2];
      var prev = pi2 > 0 ? path[pi2-1] : null;
      var next = pi2 < path.length-1 ? path[pi2+1] : null;
      var up = false, down = false, left2 = false, right2 = false;
      if (prev) {
        if (prev.x < p.x) left2 = true;
        if (prev.x > p.x) right2 = true;
        if (prev.y < p.y) up = true;
        if (prev.y > p.y) down = true;
      }
      if (next) {
        if (next.x > p.x) right2 = true;
        if (next.x < p.x) left2 = true;
        if (next.y > p.y) down = true;
        if (next.y < p.y) up = true;
      }
      // Assign type
      var tileType = 1;
      if (left2 && right2 && !up && !down) tileType = 1;
      else if (up && down && !left2 && !right2) tileType = 2;
      else if (down && right2 && !up && !left2) tileType = 3;
      else if (down && left2 && !up && !right2) tileType = 4;
      else if (up && left2 && !down && !right2) tileType = 5;
      else if (up && right2 && !down && !left2) tileType = 6;
      else tileType = 1;
      tiles[p.y * GRID + p.x] = { type: tileType, on: true, pathIdx: pi2 };
    }

    // Pick 3-5 random connections to break
    broken = [];
    var breakCount = 3 + Math.floor(Math.random() * 3);
    var shuffled = path.slice(1, path.length - 1);
    for (var bi = shuffled.length - 1; bi > 0; bi--) {
      var j = Math.floor(Math.random() * (bi + 1));
      var tmp = shuffled[bi]; shuffled[bi] = shuffled[j]; shuffled[j] = tmp;
    }
    for (var br = 0; br < Math.min(breakCount, shuffled.length); br++) {
      var bp = shuffled[br];
      broken.push({ x: bp.x, y: bp.y, fixed: false });
      if (tiles[bp.y * GRID + bp.x]) tiles[bp.y * GRID + bp.x].on = false;
    }
    flowAnim = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;

    // Check if broken tile
    var brokenIdx = -1;
    for (var bi = 0; bi < broken.length; bi++) {
      if (broken[bi].x === col && broken[bi].y === row && !broken[bi].fixed) {
        brokenIdx = bi;
        break;
      }
    }

    if (brokenIdx >= 0) {
      // Fix it!
      broken[brokenIdx].fixed = true;
      if (tiles[row * GRID + col]) tiles[row * GRID + col].on = true;
      var allFixed = broken.every(function(b) { return b.fixed; });
      if (allFixed) {
        completed++;
        flashCol = C.correct;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.7);
        var cx2 = OX + col * CELL + CELL/2;
        var cy2 = OY + row * CELL + CELL/2;
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cx2, y: cy2, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160, life: 0.6, col: C.wireOn });
        }
        if (completed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(completed * 600 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
        setTimeout(function() { generateCircuit(); }, 1000);
      } else {
        game.audio.play('se_tap', 0.4);
      }
    } else {
      // Wrong tap
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;
    flowAnim += dt * 3;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(OX - 10, OY - 10, GRID * CELL + 20, GRID * CELL + 20, C.board, 0.8);

    // Grid
    for (var ri = 0; ri < GRID; ri++) {
      for (var ci = 0; ci < GRID; ci++) {
        var tile = tiles[ri * GRID + ci];
        var cx3 = OX + ci * CELL + CELL/2;
        var cy3 = OY + ri * CELL + CELL/2;
        game.draw.rect(OX + ci * CELL + 3, OY + ri * CELL + 3, CELL - 6, CELL - 6, C.boardHi, 0.4);

        if (!tile || tile.type === 0) continue;
        var conn = CONNS[tile.type];
        var col2 = tile.on ? C.wireOn : C.wire;
        var alpha = tile.on ? 0.9 : 0.4;

        // Draw connections
        if (conn.left) game.draw.rect(cx3 - CELL/2, cy3 - 8, CELL/2, 16, col2, alpha);
        if (conn.right) game.draw.rect(cx3, cy3 - 8, CELL/2, 16, col2, alpha);
        if (conn.up) game.draw.rect(cx3 - 8, cy3 - CELL/2, 16, CELL/2, col2, alpha);
        if (conn.down) game.draw.rect(cx3 - 8, cy3, 16, CELL/2, col2, alpha);

        // Center node
        game.draw.circle(cx3, cy3, 18, tile.on ? C.nodeOn : C.node, 0.9);
        if (tile.on) game.draw.circle(cx3, cy3, 10, C.nodeHi, 0.8);
      }
    }

    // Broken spots highlight
    for (var bi2 = 0; bi2 < broken.length; bi2++) {
      var br2 = broken[bi2];
      if (br2.fixed) continue;
      var bx = OX + br2.x * CELL + CELL/2;
      var by2 = OY + br2.y * CELL + CELL/2;
      var pulse = Math.sin(flowAnim * 2) * 0.3 + 0.7;
      game.draw.circle(bx, by2, 40, C.wrong, 0.15 * pulse);
      game.draw.circle(bx, by2, 28, C.wrong, 0.6 * pulse);
      game.draw.text('!', bx, by2 + 14, { size: 40, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Power source and destination
    game.draw.circle(OX - 30, OY + GRID/2 * CELL, 22, C.power, 0.9);
    game.draw.circle(OX + GRID * CELL + 30, OY + GRID/2 * CELL, 22, C.nodeOn, 0.9);

    // Miss dots
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx = W * 0.1 + (mi % missPerRow) * (W * 0.8 / (missPerRow - 1));
      var my = mi < missPerRow ? H * 0.948 : H * 0.963;
      game.draw.circle(mx, my, 12, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(completed + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireOn : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    generateCircuit();
  });
})(game);
