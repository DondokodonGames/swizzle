// 467-pipe-dream.js
// パイプドリーム — 与えられるパイプを置いて水路をつなぎ、水を右端まで流す
// 操作: 盤面タップで次のパイプを配置（水が行き止まると溢れて失敗）
// 成功: 10マス 流す  失敗: 水が溢れる or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、配管） ──
  var C = { bg:'#030810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIPE DREAM';
  var HOW_TO_PLAY = 'TAP CELLS TO PLACE PIPES · KEEP THE WATER FLOWING';
  var MAX_TIME = 25;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var GRID = 7, CELL = 128;
  var OX = snap((W - GRID * CELL) / 2), OY = snap((H - GRID * CELL) / 2 - 40);

  var PIPE_CONN = [ [], ['left', 'right'], ['up', 'down'], ['up', 'right'], ['up', 'left'], ['down', 'left'], ['down', 'right'] ];
  var PIPE_SHAPES = [1, 2, 3, 4, 5, 6];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, waterCells, waterTimer, sourceX, sourceY, nextPiece, queue, flowed, timeLeft, done, flash, particles;
  var WATER_SPEED = 0.55;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#081428');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() {
    grid = []; for (var r = 0; r < GRID; r++) { grid.push([]); for (var c = 0; c < GRID; c++) grid[r].push(0); }
    sourceX = 0; sourceY = Math.floor(GRID / 2); grid[sourceY][sourceX] = 1;
    waterCells = [{ x: sourceX, y: sourceY, from: 'left' }]; waterTimer = 0;
    queue = []; for (var qi = 0; qi < 3; qi++) queue.push(PIPE_SHAPES[Math.floor(Math.random() * PIPE_SHAPES.length)]);
    nextPiece = queue.shift();
  }

  function initGame() { flowed = 0; timeLeft = MAX_TIME; done = false; flash = 0; particles = []; initGrid(); }

  function oppositeDir(d) { return d === 'left' ? 'right' : d === 'right' ? 'left' : d === 'up' ? 'down' : 'up'; }
  function canConnect(type, dir) { return PIPE_CONN[type].indexOf(dir) >= 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (flowed * 200 + Math.ceil(timeLeft) * 100) : flowed * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(OX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, '#0a1528', 0.8);
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cx = snap(OX + c * CELL + CELL / 2), cy = snap(OY + r * CELL + CELL / 2);
      game.draw.rect(OX + c * CELL + 4, OY + r * CELL + 4, CELL - 8, CELL - 8, '#0d1e38', 0.7);
      var pt = grid[r][c]; if (pt === 0) continue;
      var isWater = waterCells.some(function(w) { return w.x === c && w.y === r; });
      var col = isWater ? C.e : '#405060', al = isWater ? 0.9 : 0.6, conn = PIPE_CONN[pt];
      if (conn.indexOf('left') >= 0) game.draw.rect(cx - CELL / 2, cy - 10, CELL / 2, 20, col, al);
      if (conn.indexOf('right') >= 0) game.draw.rect(cx, cy - 10, CELL / 2, 20, col, al);
      if (conn.indexOf('up') >= 0) game.draw.rect(cx - 10, cy - CELL / 2, 20, CELL / 2, col, al);
      if (conn.indexOf('down') >= 0) game.draw.rect(cx - 10, cy, 20, CELL / 2, col, al);
      pc(cx, cy, 16, col, al); if (isWater) pc(cx, cy, 8, C.g, 0.8);
    }
    pc(OX + sourceX * CELL + CELL / 2, OY + sourceY * CELL + CELL / 2, 22, C.f, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    if (col === sourceX && row === sourceY) return;
    grid[row][col] = nextPiece; nextPiece = queue.shift() || PIPE_SHAPES[Math.floor(Math.random() * PIPE_SHAPES.length)]; queue.push(PIPE_SHAPES[Math.floor(Math.random() * PIPE_SHAPES.length)]); game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WATER FLOWS!' : 'OVERFLOW!', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      waterTimer += dt;
      if (waterTimer >= WATER_SPEED) {
        waterTimer -= WATER_SPEED;
        var front = waterCells[waterCells.length - 1], dirs = PIPE_CONN[grid[front.y][front.x]] || [], moved = false;
        for (var di = 0; di < dirs.length; di++) {
          var dir = dirs[di]; if (dir === front.from) continue;
          var nx = front.x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0), ny = front.y + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
          if (nx >= GRID) { flowed++; flash = 0.4; if (flowed >= NEEDED) { finish(true); return; } initGrid(); return; }
          if (nx < 0 || ny < 0 || ny >= GRID) { finish(false); return; }
          var opp = oppositeDir(dir);
          if (canConnect(grid[ny][nx], opp)) {
            waterCells.push({ x: nx, y: ny, from: opp }); flowed++; moved = true;
            for (var pi = 0; pi < 3; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + nx * CELL + CELL / 2, y: OY + ny * CELL + CELL / 2, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.3, col: C.g }); }
            if (flowed >= NEEDED) { finish(true); return; }
            break;
          } else { finish(false); return; }
        }
        if (!moved && dirs.length > 0) { finish(false); return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    // NEXTピース
    var px = W - 130, py = snap(H * 0.90), nc = PIPE_CONN[nextPiece] || [];
    game.draw.rect(px - 50, py - 50, 100, 100, '#162a50', 0.6);
    if (nc.indexOf('left') >= 0) game.draw.rect(px - 50, py - 10, 50, 20, C.e, 0.8);
    if (nc.indexOf('right') >= 0) game.draw.rect(px, py - 10, 50, 20, C.e, 0.8);
    if (nc.indexOf('up') >= 0) game.draw.rect(px - 10, py - 50, 20, 50, C.e, 0.8);
    if (nc.indexOf('down') >= 0) game.draw.rect(px - 10, py, 20, 50, C.e, 0.8);
    txt('NEXT', px, py + 78, 30, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.e, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(flowed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
