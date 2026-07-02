// 348-color-flood.js
// カラーフラッド — 左上の角から色を選んで塗り広げ、限られた手数で盤面を一色に染め上げる
// 操作: 下の色パレットをタップして角から洪水を広げる
// 成功: 8手以内に全マス同色  失敗: 8手使い切る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、塗り広げ） ──
  var C = { bg:'#0a0a12', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR FLOOD';
  var HOW_TO_PLAY = 'PICK COLORS TO FLOOD THE BOARD TO ONE COLOR';
  var MAX_TIME = 15;
  var MAX_MOVES = 8;         // 修正2: 20 → 8
  var GN = 5, CELL = snap(W * 0.7 / GN), OX = snap((W - GN * CELL) / 2), OY = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, current, moves, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a26');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() { grid = []; for (var r = 0; r < GN; r++) { grid[r] = []; for (var c = 0; c < GN; c++) grid[r][c] = Math.floor(Math.random() * COLORS.length); } current = grid[0][0]; }

  function flood(nc) {
    if (nc === current) return; var target = current, stack = [[0, 0]], vis = {};
    while (stack.length) { var cell = stack.pop(), cr = cell[0], cc = cell[1]; if (cr < 0 || cr >= GN || cc < 0 || cc >= GN) continue; var k = cr + ',' + cc; if (vis[k] || grid[cr][cc] !== target) continue; vis[k] = 1; grid[cr][cc] = nc; stack.push([cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]); }
    current = nc; moves++; flash = 0.4; game.audio.play('se_tap', 0.3);
  }

  function allSame() { var v = grid[0][0]; for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) if (grid[r][c] !== v) return false; return true; }

  function initGame() { initGrid(); moves = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((MAX_MOVES - moves + 1) * 400 + Math.ceil(timeLeft) * 100) : moves * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) { game.draw.rect(OX + c * CELL + 3, OY + r * CELL + 3, CELL - 6, CELL - 6, COLORS[grid[r][c]], 0.92); if (r === 0 && c === 0) { game.draw.rect(OX + 3, OY + 3, CELL - 6, CELL - 6, C.g, 0.15); txt('*', OX + CELL / 2, OY + CELL / 2 + 14, 40, C.g); } }
    var bw = snap((W - 80) / COLORS.length);
    for (var pi = 0; pi < COLORS.length; pi++) { var bx = 40 + pi * bw, cur = pi === current; game.draw.rect(bx + 6, snap(H * 0.80), bw - 12, 100, COLORS[pi], cur ? 1 : 0.5); if (cur) game.draw.rect(bx + 6, snap(H * 0.80) - 12, bw - 12, 10, C.g, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var bw = snap((W - 80) / COLORS.length);
    if (y >= H * 0.80 && y <= H * 0.80 + 100) { var idx = Math.floor((x - 40) / bw); if (idx >= 0 && idx < COLORS.length && idx !== current) { flood(idx); if (allSame()) { for (var k = 0; k < 14; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GN * CELL / 2, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.8, col: COLORS[grid[0][0]] }); } finish(true); return; } if (moves >= MAX_MOVES) { finish(false); return; } } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.98, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL ONE COLOR!' : 'OUT OF MOVES', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    if (flash > 0) game.draw.rect(OX, OY, GN * CELL, GN * CELL, C.g, flash * 0.15);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, 168, 48, (MAX_MOVES - moves) <= 2 ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
