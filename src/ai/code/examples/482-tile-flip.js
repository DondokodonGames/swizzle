// 482-tile-flip.js
// タイル反転 — タップで十字状（上下左右）のタイルも一緒に反転させ、全タイルを同色に揃える
// 操作: タイルをタップ（自分＋隣接4マスが反転）。手数内に全面を揃える
// 成功: 2面 クリア  失敗: 3回 手数切れ or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、光パネル） ──
  var C = { bg:'#080414', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP A TILE AND ITS 4 NEIGHBORS · MAKE ONE COLOR';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MOVES = 8;
  var MAX_FAIL = 3;
  var GRID = 4, CELL = 200;
  var OX = snap((W - GRID * CELL) / 2), OY = snap((H - GRID * CELL) / 2 - 20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, moves, rounds, fails, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#140828');
  }

  function background() { game.draw.clear(C.bg); }

  function flipCell(row, col) {
    var coords = [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
    for (var ci = 0; ci < coords.length; ci++) { var r = coords[ci][0], c = coords[ci][1]; if (r >= 0 && r < GRID && c >= 0 && c < GRID) grid[r][c] = 1 - grid[r][c]; }
  }

  function initGrid() {
    grid = []; for (var r = 0; r < GRID; r++) { grid.push([]); for (var c = 0; c < GRID; c++) grid[r].push(0); }
    moves = 0;
    var scramble = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < scramble; i++) flipCell(Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID));
    if (checkWin()) flipCell(0, 0);
  }

  function checkWin() { var v = grid[0][0]; for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) if (grid[r][c] !== v) return false; return true; }

  function initGame() { rounds = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 800 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cx = OX + c * CELL + CELL / 2, cy = OY + r * CELL + CELL / 2, v = grid[r][c];
      var col = v === 0 ? C.d : C.e;
      game.draw.rect(OX + c * CELL + 8, OY + r * CELL + 8, CELL - 16, CELL - 16, col, 0.9);
      game.draw.rect(OX + c * CELL + 8, OY + r * CELL + 8, CELL - 16, 10, C.g, 0.2);
      pc(cx, cy, 20, C.g, 0.15);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    flipCell(row, col); moves++; game.audio.play('se_tap', 0.4);
    if (checkWin()) {
      rounds++; flash = 0.6; flashCol = C.b; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.7, col: C.e }); }
      if (rounds >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) initGrid(); }, 900);
    } else if (moves >= MAX_MOVES) {
      fails++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
      if (fails >= MAX_FAIL) { finish(false); return; }
      setTimeout(function() { if (!done) initGrid(); }, 700);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL LIT!' : 'SCRAMBLED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
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
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, snap(OY - 40), 48, MAX_MOVES - moves <= 2 ? C.a : C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_FAIL; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, mi < fails ? C.a : '#140828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
