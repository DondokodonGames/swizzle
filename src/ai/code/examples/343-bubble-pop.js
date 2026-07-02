// 343-bubble-pop.js
// バブルポップ — 隣り合う同色バブルを3つ以上つなぎ、もう一度タップでまとめて消す連結パズル
// 操作: 同色バブルを順にタップでつなぎ、末尾を再タップで消す
// 成功: 10個 消す  失敗: バブルが上端に達する or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、バブルフィールド） ──
  var C = { bg:'#030015', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.b, C.e, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'LINK 3+ SAME-COLOR BUBBLES · TAP AGAIN TO POP';
  var MAX_TIME = 15;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var COLS = 6, ROWS = 8, CELL = snap(W * 0.9 / COLS), OX = snap((W - COLS * CELL) / 2 + CELL / 2), OY = snap(H * 0.26);
  var FALL = 3.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, selected, popped, timeLeft, done, fallTimer, particles, fbText, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100828');
  }

  function background() { game.draw.clear(C.bg); }

  function cellX(c) { return OX + c * CELL; }
  function cellY(r) { return OY + r * CELL; }

  function initGrid() { grid = []; for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = r >= ROWS - 4 ? Math.floor(Math.random() * COLORS.length) : -1; } }

  function addRow() { for (var r = 0; r < ROWS - 1; r++) grid[r] = grid[r + 1].slice(); var row = []; for (var c = 0; c < COLS; c++) row.push(Math.floor(Math.random() * COLORS.length)); grid[ROWS - 1] = row; }

  function topReached() { for (var c = 0; c < COLS; c++) if (grid[0][c] >= 0) return true; return false; }

  function initGame() { initGrid(); selected = []; popped = 0; timeLeft = MAX_TIME; done = false; fallTimer = FALL; particles = []; fbText = ''; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 300 + Math.ceil(timeLeft) * 100) : popped * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryPop() {
    if (selected.length < 3) { selected = []; return; }
    var col = grid[selected[0][0]][selected[0][1]];
    for (var i = 0; i < selected.length; i++) { grid[selected[i][0]][selected[i][1]] = -1; for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cellX(selected[i][1]), y: cellY(selected[i][0]), vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: COLORS[col] }); } }
    popped += selected.length; fbText = '+' + selected.length; fbTimer = 0.6; game.audio.play('se_success', 0.6); selected = [];
    if (popped >= NEEDED) { finish(true); return; }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.round((x - OX) / CELL), r = Math.round((y - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS || grid[r][c] < 0) { selected = []; return; }
    if (selected.length === 0) { selected = [[r, c]]; game.audio.play('se_tap', 0.2); return; }
    var selCol = grid[selected[0][0]][selected[0][1]];
    if (grid[r][c] !== selCol) { selected = [[r, c]]; game.audio.play('se_tap', 0.2); return; }
    var last = selected[selected.length - 1];
    for (var si = 0; si < selected.length; si++) if (selected[si][0] === r && selected[si][1] === c) { if (si === selected.length - 1) tryPop(); return; }
    if (Math.abs(r - last[0]) + Math.abs(c - last[1]) !== 1) { selected = []; return; }
    selected.push([r, c]); game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var v = grid[r][c], bx = cellX(c), by = cellY(r); pc(bx, by, CELL * 0.36, '#0a0028', 0.5); if (v >= 0) { pc(bx, by, CELL * 0.36, COLORS[v], 0.9); pc(bx - CELL * 0.12, by - CELL * 0.12, CELL * 0.08, C.g, 0.4); } }
    for (var si = 0; si < selected.length; si++) { var sr = selected[si][0], sc = selected[si][1], sx = cellX(sc), sy = cellY(sr); ring(sx, sy, CELL * 0.42, C.g, 0.6); if (si > 0) pline(cellX(selected[si - 1][1]), cellY(selected[si - 1][0]), sx, sy, C.g, 0.7, 6); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POP MASTER!' : 'OVERFLOW', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      fallTimer -= dt; if (fallTimer <= 0) { addRow(); fallTimer = Math.max(1.2, FALL - (MAX_TIME - timeLeft) * 0.1); if (topReached()) { finish(false); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (selected.length > 0) { var col = grid[selected[0][0]][selected[0][1]]; txt(selected.length + ' / 3' + (selected.length >= 3 ? '  TAP END TO POP' : ''), W / 2, snap(H * 0.84), 40, selected.length >= 3 ? COLORS[col] : '#8888aa'); }
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.78), 56, C.c);
    // せり上がりバー
    var fr = fallTimer / FALL; game.draw.rect(40, snap(H * 0.80), snap((W - 80) * Math.max(0, fr)), 12, C.d, 0.7);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
