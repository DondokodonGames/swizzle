// 576-number-snake.js
// ナンバースネーク — 盤面に散った数字を、1から順に隣接マスをなぞって繋いでいく
// 操作: スワイプ（またはタップ）で 1→2→3… と隣り合う数字を順番になぞる。順番違いはミス
// 成功: 3問 完成  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、数字回路） ──
  var C = { bg:'#0a0a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER SNAKE';
  var HOW_TO_PLAY = 'TRACE 1-2-3... THROUGH ADJACENT NUMBERS IN ORDER';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_FAIL = 3;          // 修正2: 5 → 3
  var GRID = 5, CELL = Math.floor(W * 0.8 / 5), NUM_CELLS = 25;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var numbers, path, lastCell, expectedNext, totalNums, completions, fails, timeLeft, done, particles, flash, flashCol, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#12121f');
  }

  function background() { game.draw.clear(C.bg); }

  function cellOf(r, c) { return r * GRID + c; }
  function rowOf(i) { return Math.floor(i / GRID); }
  function colOf(i) { return i % GRID; }
  function cellX(i) { return OX + colOf(i) * CELL + CELL / 2; }
  function cellY(i) { return OY + rowOf(i) * CELL + CELL / 2; }

  function generatePuzzle() {
    numbers = []; for (var i = 0; i < NUM_CELLS; i++) numbers.push(-1);
    var pathLen = Math.min(8 + Math.floor(Math.random() * 4), NUM_CELLS), snake = [Math.floor(Math.random() * NUM_CELLS)], used = {}; used[snake[0]] = true;
    while (snake.length < pathLen) { var cur = snake[snake.length - 1], r = rowOf(cur), c = colOf(cur), moves = []; if (r > 0 && !used[cellOf(r - 1, c)]) moves.push(cellOf(r - 1, c)); if (r < GRID - 1 && !used[cellOf(r + 1, c)]) moves.push(cellOf(r + 1, c)); if (c > 0 && !used[cellOf(r, c - 1)]) moves.push(cellOf(r, c - 1)); if (c < GRID - 1 && !used[cellOf(r, c + 1)]) moves.push(cellOf(r, c + 1)); if (moves.length === 0) break; var nx = moves[Math.floor(Math.random() * moves.length)]; snake.push(nx); used[nx] = true; }
    for (var si = 0; si < snake.length; si++) numbers[snake[si]] = si + 1;
    totalNums = snake.length; path = []; lastCell = -1; expectedNext = 1;
  }

  function initGame() { completions = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultTimer = 0; generatePuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completions * 1200 + Math.ceil(timeLeft) * 100) : completions * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function getCellAt(tx, ty) { var c = Math.floor((tx - OX) / CELL), r = Math.floor((ty - OY) / CELL); if (c < 0 || c >= GRID || r < 0 || r >= GRID) return -1; return cellOf(r, c); }

  function tryConnect(ci) {
    if (ci < 0 || numbers[ci] < 0) return;
    if (numbers[ci] !== expectedNext) { fails++; flash = 0.35; flashCol = C.a; resultTimer = 0.7; game.audio.play('se_failure', 0.4); path = []; lastCell = -1; expectedNext = 1; if (fails >= MAX_FAIL) { finish(false); } return; }
    if (lastCell >= 0) { if (Math.abs(rowOf(ci) - rowOf(lastCell)) + Math.abs(colOf(ci) - colOf(lastCell)) !== 1) { path = []; lastCell = -1; expectedNext = 1; return; } }
    path.push(ci); lastCell = ci; expectedNext++; game.audio.play('se_tap', 0.2);
    if (expectedNext > totalNums) {
      completions++; flash = 0.4; flashCol = C.b; resultTimer = 0.9; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cellX(ci), y: cellY(ci), vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
      if (completions >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) generatePuzzle(); }, 900);
    }
  }

  function drawScene() {
    for (var pi = 1; pi < path.length; pi++) { var pa = path[pi - 1], pb = path[pi]; game.draw.line(cellX(pa), cellY(pa), cellX(pb), cellY(pb), C.e, 12); }
    for (var ci = 0; ci < NUM_CELLS; ci++) {
      var gx = OX + colOf(ci) * CELL, gy = OY + rowOf(ci) * CELL, num = numbers[ci];
      game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, '#12121f', 0.9);
      if (num > 0) { var inP = path.indexOf(ci) >= 0, isN = num === expectedNext, col = inP ? C.b : (isN ? C.c : C.d); pc(cellX(ci), cellY(ci), CELL * 0.32, col, inP ? 0.7 : (isN ? 0.5 : 0.35)); txt('' + num, cellX(ci), cellY(ci) + 14, 42, inP ? C.g : C.g); }
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || resultTimer > 0) return;
    var steps = Math.max(1, Math.min(20, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (CELL * 0.4))));
    for (var s = 0; s <= steps; s++) { var ci = getCellAt(x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps); if (ci >= 0 && ci !== lastCell && path.indexOf(ci) === -1) { tryConnect(ci); if (resultTimer > 0) break; } }
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || resultTimer > 0) return;
    var ci = getCellAt(tx, ty); if (ci >= 0 && ci !== lastCell && path.indexOf(ci) === -1) tryConnect(ci);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!numbers) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.13, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL LINKED!' : 'WRONG ORDER', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completions + ' / ' + NEEDED + '   NEXT ' + Math.min(expectedNext, totalNums), W / 2, 168, 42, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#12121f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
