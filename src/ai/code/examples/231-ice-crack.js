// 231-ice-crack.js
// アイスクラック — 踏むたびに割れていく氷原を、崩れる前に右端まで渡り切るスリル
// 操作: 隣接する氷マスをタップして移動
// 成功: 右端に到達  失敗: 氷が割れて落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、極寒の湖） ──
  var C = { bg:'#02080f', a:'#ff4d6d', b:'#5ef0ff', c:'#aef7ff', d:'#0c1a3a', e:'#7fdcff', f:'#ffe600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE CRACK';
  var HOW_TO_PLAY = 'STEP ACROSS THE ICE BEFORE IT SHATTERS';
  var MAX_TIME = 15;
  var COLS = 5, ROWS = 8;     // 修正2: 8x10 → 5x8（横断短縮）
  var CELL = snap((W - 40) / COLS), OX = 20, OY = snap(H * 0.26);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, pCol, pRow, timeLeft, done, cracks, splashes;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, OY, W, ROWS * CELL, C.d, 0.8); }

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = c === COLS - 1 ? 3 : (Math.random() < 0.12 ? 0 : 1 + Math.floor(Math.random() * 3)); }
    pRow = Math.floor(ROWS / 2); pCol = 0; grid[pRow][0] = 3;
    for (var c2 = 0; c2 < COLS; c2++) if (grid[pRow][c2] === 0) grid[pRow][c2] = 1;
  }

  function crackAround(col, row) {
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      var nr = row + dr, nc = col + dc; if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (grid[nr][nc] > 0 && grid[nr][nc] < 3) { grid[nr][nc]--; if (grid[nr][nc] === 0) splashes.push({ x: OX + nc * CELL + CELL / 2, y: OY + nr * CELL + CELL / 2, life: 0.6 }); }
    }
    cracks.push({ col: col, row: row, life: 0.4 });
  }

  function initGame() { initGrid(); timeLeft = MAX_TIME; done = false; cracks = []; splashes = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 120) : pCol * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = OX + c * CELL, gy = OY + r * CELL, hp = grid[r][c]; if (hp === 0) continue;
      var goal = c === COLS - 1, col = goal ? C.b : C.e;
      game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col, goal ? 0.8 : hp / 3 * 0.6 + 0.15);
      game.draw.rect(gx + 2, gy + 2, CELL - 4, 6, C.c, 0.4);
      if (hp === 1) game.draw.rect(gx + CELL / 2 - 2, gy + 8, 4, CELL - 16, C.a, 0.6);
      if (goal) txt('OUT', gx + CELL / 2, gy + CELL / 2 + 10, 34, '#000');
    }
    // 隣接ハイライト
    var adj = [[0,1],[0,-1],[1,0],[-1,0]];
    for (var ai = 0; ai < adj.length; ai++) { var nc = pCol + adj[ai][0], nr = pRow + adj[ai][1]; if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue; if (grid[nr][nc] > 0) game.draw.rect(OX + nc * CELL + 2, OY + nr * CELL + 2, CELL - 4, CELL - 4, C.g, 0.1 + 0.1 * (Math.floor(game.time.elapsed * 4) % 2)); }
  }

  function drawPlayer() { var x = OX + pCol * CELL + CELL / 2, y = OY + pRow * CELL + CELL / 2; pc(x, y, CELL / 2 - 8, C.f, 0.95); game.draw.rect(snap(x) - 6, snap(y) - 6, 8, 8, C.g); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tc = Math.floor((x - OX) / CELL), tr = Math.floor((y - OY) / CELL);
    if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return;
    if (Math.abs(tc - pCol) + Math.abs(tr - pRow) !== 1) return;
    if (grid[tr][tc] === 0) return;
    pCol = tc; pRow = tr; game.audio.play('se_tap', 0.4);
    if (pCol === COLS - 1) { finish(true); return; }
    crackAround(pCol, pRow);
    if (grid[pRow][pCol] === 0) { splashes.push({ x: OX + pCol * CELL + CELL / 2, y: OY + pRow * CELL + CELL / 2, life: 0.8, big: true }); finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid(); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CROSSED!' : 'SPLASH!', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (Math.random() < dt * 0.5) { var rc = Math.floor(Math.random() * (COLS - 1)), rr = Math.floor(Math.random() * ROWS); if (grid[rr][rc] > 0 && grid[rr][rc] < 3 && !(rr === pRow && rc === pCol)) grid[rr][rc]--; }
      for (var ci = cracks.length - 1; ci >= 0; ci--) { cracks[ci].life -= dt; if (cracks[ci].life <= 0) cracks.splice(ci, 1); }
      for (var si = splashes.length - 1; si >= 0; si--) { splashes[si].life -= dt; if (splashes[si].life <= 0) splashes.splice(si, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var ce = 0; ce < cracks.length; ce++) pc(OX + cracks[ce].col * CELL + CELL / 2, OY + cracks[ce].row * CELL + CELL / 2, CELL * cracks[ce].life, C.g, cracks[ce].life * 0.4);
    for (var sp = 0; sp < splashes.length; sp++) pc(splashes[sp].x, splashes[sp].y, (splashes[sp].big ? 70 : 36) * (1 - splashes[sp].life), C.b, splashes[sp].life * 0.6);
    drawPlayer();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('REACH THE RIGHT EDGE →', W / 2, H - 100, 38, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
