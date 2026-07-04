// 703-reaction-chain.js
// リアクションチェーン — 光ったセルを制限時間内に次々タップしてチェーンをつなぐ
// 操作: 光っているセルをタップ。カウントバーが尽きる前に。間違い・時間切れでミス
// 成功: 12チェーン  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、反応盤） ──
  var C = { bg:'#030410', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'REACTION CHAIN';
  var HOW_TO_PLAY = 'TAP THE GLOWING CELL BEFORE ITS BAR RUNS OUT · KEEP THE CHAIN ALIVE';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_BREAK = 3;         // 修正2: 5 → 3
  var COLS = 5, ROWS = 7, CELL = 170, GAP = 12, WINDOW = 0.7;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = snap((W - GRID_W) / 2), GRID_Y = snap((H - GRID_H) / 2 + 60);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var activeCell, activeLit, chainLen, breaks, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, cells, tapFlash, tapFlashTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#05060f');
  }

  function background() { game.draw.clear(C.bg); }

  function cellCX(idx) { return GRID_X + (idx % COLS) * (CELL + GAP) + CELL / 2; }
  function cellCY(idx) { return GRID_Y + Math.floor(idx / COLS) * (CELL + GAP) + CELL / 2; }

  function lightNext() {
    var candidates = [];
    if (activeCell >= 0) { var col = activeCell % COLS, row = Math.floor(activeCell / COLS); if (col > 0) candidates.push(activeCell - 1); if (col < COLS - 1) candidates.push(activeCell + 1); if (row > 0) candidates.push(activeCell - COLS); if (row < ROWS - 1) candidates.push(activeCell + COLS); }
    if (candidates.length === 0) for (var i = 0; i < COLS * ROWS; i++) candidates.push(i);
    candidates = candidates.filter(function(c) { return c !== activeCell; });
    activeCell = candidates[Math.floor(Math.random() * candidates.length)]; activeLit = WINDOW;
  }

  function initGame() { activeCell = -1; activeLit = 0; chainLen = 0; breaks = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; cells = []; for (var ci = 0; ci < COLS * ROWS; ci++) cells.push(0); tapFlash = -1; tapFlashTimer = 0; lightNext(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (chainLen * 400 + Math.ceil(timeLeft) * 100) : chainLen * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var row2 = 0; row2 < ROWS; row2++) for (var col2 = 0; col2 < COLS; col2++) {
      var idx = row2 * COLS + col2, cx = GRID_X + col2 * (CELL + GAP), cy = GRID_Y + row2 * (CELL + GAP);
      var isActive = idx === activeCell && activeLit > 0, isTap = idx === tapFlash && tapFlashTimer > 0, recentHit = cells[idx] > 0;
      var bgCol, bgAlpha;
      if (isActive) { var urgency = activeLit / WINDOW; bgCol = urgency > 0.4 ? C.f : C.a; bgAlpha = 0.8 + 0.2 * Math.sin(elapsed * 15); }
      else if (isTap) { bgCol = C.c; bgAlpha = 0.7; }
      else if (recentHit) { bgCol = C.b; bgAlpha = cells[idx] * 0.6; }
      else { bgCol = '#0a0c24'; bgAlpha = 0.85; }
      game.draw.rect(cx, cy, CELL, CELL, bgCol, bgAlpha);
      if (isActive) game.draw.rect(cx, cy + CELL - 10, (activeLit / WINDOW) * CELL, 10, C.c, 0.8);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if ((tx - GRID_X) - col * (CELL + GAP) > CELL || (ty - GRID_Y) - row * (CELL + GAP) > CELL) return;
    var tappedCell = row * COLS + col; tapFlash = tappedCell; tapFlashTimer = 0.2;
    if (tappedCell === activeCell && activeLit > 0) {
      chainLen++; flash = 0.2; flashCol = C.b; game.audio.play('se_tap', 0.1 + Math.min(0.2, chainLen * 0.005)); cells[activeCell] = 0.5;
      for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: cellCX(activeCell), y: cellCY(activeCell), vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.35, col: C.c }); }
      activeLit = 0; activeCell = -1;
      if (chainLen >= NEEDED) { finish(true); return; }
      lightNext();
    } else {
      breaks++; flash = 0.35; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (breaks >= MAX_BREAK) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cells) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.07, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.105, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.95, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN COMPLETE!' : 'CHAIN BROKEN', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapFlashTimer > 0) tapFlashTimer -= dt * 5;
      for (var ci2 = 0; ci2 < cells.length; ci2++) if (cells[ci2] > 0) cells[ci2] -= dt * 3;
      if (activeCell >= 0) {
        activeLit -= dt;
        if (activeLit <= 0) {
          breaks++; game.audio.play('se_failure', 0.25); flash = 0.3; flashCol = C.a; resultText = 'TOO SLOW!'; resultTimer = 0.5; activeLit = 0; activeCell = -1;
          if (breaks >= MAX_BREAK) { finish(false); return; }
          lightNext();
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(chainLen + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BREAK; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BREAK - 1) / 2) * 56) - 10, 224, 20, 20, bi < breaks ? C.a : '#05060f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
