// 479-crystal-growth.js
// 結晶成長 — スワイプした向きへ結晶を一斉に伸ばし、盤上の宝石を取り込んでいく
// 操作: 上下左右スワイプで結晶を成長（岩ブロックは通れない・手数に限りあり）
// 成功: 6個 の宝石を取り込む  失敗: 15手 使い切る or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鉱脈） ──
  var C = { bg:'#010614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEM_COLS = [C.a, C.f, C.b, C.e, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL GROWTH';
  var HOW_TO_PLAY = 'SWIPE TO GROW THE CRYSTAL · ABSORB THE GEMS';
  var MAX_TIME = 25;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MOVES = 15;        // 修正2: 30 → 15
  var COLS = 7, ROWS = 10, CELL = 132;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.16);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, gems, crystalCells, collected, moves, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0c1a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() {
    grid = []; for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c = 0; c < COLS; c++) grid[r].push(0); }
    var sc = Math.floor(COLS / 2), sr = Math.floor(ROWS / 2); grid[sr][sc] = 1; crystalCells = [{ col: sc, row: sr }];
    for (var bi = 0; bi < 8; bi++) { var bc = Math.floor(Math.random() * COLS), br = Math.floor(Math.random() * ROWS); if (grid[br][bc] === 0) grid[br][bc] = 3; }
    gems = [];
    for (var gi = 0; gi < 12; gi++) { var gc = Math.floor(Math.random() * COLS), gr = Math.floor(Math.random() * ROWS); if (grid[gr][gc] === 0) { grid[gr][gc] = 2; gems.push({ col: gc, row: gr, col2: GEM_COLS[Math.floor(Math.random() * GEM_COLS.length)] }); } }
  }

  function initGame() { collected = 0; moves = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 500 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function grow(dir) {
    if (done) return;
    moves++;
    var dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    var newCells = [], got = 0;
    for (var ci = 0; ci < crystalCells.length; ci++) {
      var cell = crystalCells[ci], nc = cell.col + dc, nr = cell.row + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (grid[nr][nc] === 0 || grid[nr][nc] === 2) {
        if (grid[nr][nc] === 2) {
          for (var gi = gems.length - 1; gi >= 0; gi--) if (gems[gi].col === nc && gems[gi].row === nr) { var gx = OX + nc * CELL + CELL / 2, gy = OY + nr * CELL + CELL / 2; for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: gx, y: gy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.6, col: gems[gi].col2 }); } gems.splice(gi, 1); got++; break; }
        }
        grid[nr][nc] = 1; newCells.push({ col: nc, row: nr });
      }
    }
    collected += got; crystalCells = crystalCells.concat(newCells);
    if (got > 0) { game.audio.play('se_tap', 0.5 + got * 0.1); flash = 0.4; } else game.audio.play('se_tap', 0.2);
    if (collected >= NEEDED) { finish(true); return; }
    if (moves >= MAX_MOVES) { finish(false); return; }
  }

  function drawBoard() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var cx = OX + c * CELL + CELL / 2, cy = OY + r * CELL + CELL / 2, v = grid[r][c];
      if (v === 1) { game.draw.rect(OX + c * CELL + 6, OY + r * CELL + 6, CELL - 12, CELL - 12, C.d, 0.7); game.draw.rect(OX + c * CELL + 16, OY + r * CELL + 16, CELL - 32, CELL - 32, C.e, 0.3); }
      else if (v === 2) { var gm = null; for (var gi = 0; gi < gems.length; gi++) if (gems[gi].col === c && gems[gi].row === r) { gm = gems[gi]; break; } if (gm) { pc(cx, cy, 24, gm.col2, 0.9); pc(cx - 6, cy - 6, 8, C.g, 0.5); } }
      else if (v === 3) game.draw.rect(OX + c * CELL + 10, OY + r * CELL + 10, CELL - 20, CELL - 20, '#374151', 0.7);
      else game.draw.rect(OX + c * CELL + 3, OY + r * CELL + 3, CELL - 6, CELL - 6, '#0a0c1a', 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) { if (state === S.PLAYING && !done) grow(dir); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.09, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.135, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GEODE COMPLETE!' : 'STALLED OUT', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, snap(H * 0.90), 44, moves > MAX_MOVES * 0.7 ? C.a : C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.e, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
