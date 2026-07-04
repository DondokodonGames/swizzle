// 635-chain-bomb.js
// チェーンボム — 盤上に爆弾を追加配置し、上スワイプで起爆して大連鎖を狙う
// 操作: タップで爆弾を置く/取り除く（持ち弾5個） → 上スワイプで起爆。連鎖数を稼ぐ
// 成功: 連鎖 8以上  失敗: 3回 失敗 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆破解体） ──
  var C = { bg:'#0a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN BOMB';
  var HOW_TO_PLAY = 'TAP TO ADD BOMBS (5 LEFT) · SWIPE UP TO DETONATE · CHAIN THE BLASTS';
  var MAX_TIME = 25;
  var NEEDED_CHAIN = 8;      // 修正2: 10 → 8
  var MAX_ATTEMPTS = 3;      // 修正2: 5 → 3
  var COLS = 7, ROWS = 10, CELL_W = W / COLS, CELL_H = snap(H * 0.56 / 10), GRID_Y = snap(H * 0.26), CHAIN_R = CELL_W * 1.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, playerBombs, bombPhase, explosions, chainCount, maxChain, attempts, timeLeft, done, explodeQueue;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1c0a00');
  }

  function background() { game.draw.clear(C.bg); }

  function resetRound() {
    grid = []; for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c = 0; c < COLS; c++) grid[r].push(null); }
    explosions = []; explodeQueue = []; chainCount = 0; bombPhase = 'place'; playerBombs = 5;
    var placed = 0;
    while (placed < 20) { var r2 = Math.floor(Math.random() * ROWS), c2 = Math.floor(Math.random() * COLS); if (!grid[r2][c2]) { grid[r2][c2] = { exploding: false }; placed++; } }
  }

  function initGame() { attempts = 0; maxChain = 0; timeLeft = MAX_TIME; done = false; resetRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (chainCount * 300 + Math.ceil(timeLeft) * 100) : maxChain * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function triggerExplosion(row, col, depth) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (!grid[row][col] || grid[row][col].exploding) return;
    grid[row][col].exploding = true; chainCount++; if (chainCount > maxChain) maxChain = chainCount;
    var cx = col * CELL_W + CELL_W / 2, cy = GRID_Y + row * CELL_H + CELL_H / 2;
    explosions.push({ x: cx, y: cy, r: 0, maxR: CHAIN_R, life: 1 });
    var delay = 0.12;
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function(d) {
      var nr = row + d[0], nc = col + d[1];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] && !grid[nr][nc].exploding) {
        var nCx = nc * CELL_W + CELL_W / 2, nCy = GRID_Y + nr * CELL_H + CELL_H / 2, dx = nCx - cx, dy = nCy - cy;
        if (Math.sqrt(dx * dx + dy * dy) <= CHAIN_R) { explodeQueue.push({ r: nr, c: nc, delay: delay }); delay += 0.06; }
      }
    });
  }

  function drawScene() {
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      var gx = c2 * CELL_W, gy = GRID_Y + r2 * CELL_H;
      game.draw.rect(gx + 2, gy + 2, CELL_W - 4, CELL_H - 4, '#1a1000', 0.4);
      var cell = grid[r2][c2];
      if (cell && !cell.exploding) { var bx = gx + CELL_W / 2, by = gy + CELL_H / 2; pc(bx, by, CELL_W * 0.3, '#374151', 0.95); game.draw.rect(snap(bx) - 2, snap(by - CELL_H * 0.36), 4, 12, C.c, 0.9); }
    }
    for (var ei = 0; ei < explosions.length; ei++) { var ex = explosions[ei]; pc(ex.x, ex.y, ex.r, C.f, ex.life * 0.5); pc(ex.x, ex.y, ex.r * 0.5, C.c, ex.life * 0.7); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || bombPhase !== 'place') return;
    if (ty < GRID_Y || ty > GRID_Y + ROWS * CELL_H) return;
    var col = Math.floor(tx / CELL_W), row = Math.floor((ty - GRID_Y) / CELL_H);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (grid[row][col]) { grid[row][col] = null; playerBombs++; }
    else if (playerBombs > 0) { grid[row][col] = { exploding: false }; playerBombs--; game.audio.play('se_tap', 0.15); }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || bombPhase !== 'place' || dir !== 'up') return;
    bombPhase = 'exploding'; chainCount = 0;
    var fired = false;
    outer: for (var r = ROWS - 1; r >= 0; r--) for (var c = 0; c < COLS; c++) if (grid[r][c] && !grid[r][c].exploding) { triggerExplosion(r, c, 0); fired = true; break outer; }
    if (!fired) bombPhase = 'place'; else game.audio.play('se_success', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MEGA CHAIN!' : 'FIZZLED OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (bombPhase === 'exploding') {
        for (var qi = explodeQueue.length - 1; qi >= 0; qi--) { var q = explodeQueue[qi]; q.delay -= dt; if (q.delay <= 0) { triggerExplosion(q.r, q.c, 0); explodeQueue.splice(qi, 1); } }
        for (var ei = explosions.length - 1; ei >= 0; ei--) { var ex = explosions[ei]; ex.r += ex.maxR * dt * 4; ex.life -= dt * 2; if (ex.life <= 0) explosions.splice(ei, 1); }
        if (explodeQueue.length === 0 && explosions.length === 0) {
          if (chainCount >= NEEDED_CHAIN) { finish(true); return; }
          attempts++; game.audio.play('se_failure', 0.3);
          if (attempts >= MAX_ATTEMPTS) { finish(false); return; }
          setTimeout(function() { if (!done) resetRound(); }, 700);
        }
      }
    }

    // ---- 描画 ----
    background(); drawScene();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    if (bombPhase === 'place') { txt('BOMBS ' + playerBombs, W / 2, 168, 44, C.c); txt('SWIPE UP TO DETONATE', W / 2, snap(H * 0.86), 34, C.f); }
    else { txt('CHAIN ' + chainCount + ' / ' + NEEDED_CHAIN, W / 2, 168, 48, C.f); }
    for (var ai = 0; ai < MAX_ATTEMPTS; ai++) game.draw.rect(snap(W / 2 + (ai - (MAX_ATTEMPTS - 1) / 2) * 56) - 10, 224, 20, 20, ai < attempts ? C.a : '#1c0a00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
