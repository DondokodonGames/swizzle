// 711-memory-grid.js
// メモリーグリッド — 一瞬光った複数のマスを記憶し、同じマスをすべてタップする
// 操作: 光ったマスを覚え、点灯が消えたら同じマスを全部タップ
// 成功: 5問 クリア  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶盤） ──
  var C = { bg:'#06040e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MEMORY GRID';
  var HOW_TO_PLAY = 'WATCH WHICH CELLS LIGHT UP · THEN TAP ALL OF THEM';
  var MAX_TIME = 28;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_ERR  = 3;          // 修正2: 6 → 3
  var COLS = 4, ROWS = 5, CELL = 220, GAP = 16, SHOW_DUR = 0.45;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = snap((W - GRID_W) / 2), GRID_Y = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var seqPhase, litCells, showIdx, showTimer, inputTapped, round, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, tapFlash, tapFlashTimer, waitTimer, cellGlow;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0818');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    round++; var count = 2 + Math.min(4, Math.floor((round - 1) / 1.5)); litCells = [];
    while (litCells.length < count) { var c = Math.floor(Math.random() * COLS * ROWS); if (litCells.indexOf(c) < 0) litCells.push(c); }
    showIdx = 0; showTimer = 0.4; seqPhase = 'show'; inputTapped = []; tapFlash = -1; waitTimer = 0;
    for (var gi = 0; gi < cellGlow.length; gi++) cellGlow[gi] = 0;
  }

  function initGame() { round = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapFlash = -1; tapFlashTimer = 0; waitTimer = 0; cellGlow = []; for (var ci = 0; ci < COLS * ROWS; ci++) cellGlow.push(0); newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 600 + Math.ceil(timeLeft) * 100) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var phaseStr = seqPhase === 'show' ? 'MEMORIZE!' : (litCells.length - inputTapped.length) + ' LEFT';
    txt(phaseStr, W / 2, GRID_Y - 80, 48, seqPhase === 'input' ? C.b : '#ffffff66');
    for (var row2 = 0; row2 < ROWS; row2++) for (var col2 = 0; col2 < COLS; col2++) {
      var idx2 = row2 * COLS + col2, cx = GRID_X + col2 * (CELL + GAP), cy = GRID_Y + row2 * (CELL + GAP);
      var glow = cellGlow[idx2], isTap = idx2 === tapFlash && tapFlashTimer > 0;
      var isFound = seqPhase === 'input' && inputTapped.indexOf(idx2) >= 0 && litCells.indexOf(idx2) >= 0;
      var isWrong = seqPhase === 'input' && inputTapped.indexOf(idx2) >= 0 && litCells.indexOf(idx2) < 0;
      var bCol, bAlpha;
      if (glow > 0.5) { bCol = C.d; bAlpha = 0.9; } else if (isTap) { bCol = '#a78bfa'; bAlpha = 0.85; }
      else if (isFound) { bCol = C.b; bAlpha = 0.7; } else if (isWrong) { bCol = C.a; bAlpha = 0.7; }
      else { bCol = '#0f0d26'; bAlpha = 0.8; }
      game.draw.rect(cx, cy, CELL, CELL, bCol, bAlpha);
      if (glow > 0.5) game.draw.rect(cx - 6, cy - 6, CELL + 12, CELL + 12, '#a78bfa', glow * 0.25);
    }
    for (var di = 0; di < litCells.length; di++) { var found = inputTapped.indexOf(litCells[di]) >= 0; game.draw.rect(snap(W / 2 - (litCells.length - 1) * 32 + di * 64) - 12, GRID_Y + GRID_H + 60, 24, 24, found ? C.b : '#334155', 0.9); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || seqPhase !== 'input') return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if ((tx - GRID_X) - col * (CELL + GAP) > CELL || (ty - GRID_Y) - row * (CELL + GAP) > CELL) return;
    var idx = row * COLS + col; if (inputTapped.indexOf(idx) >= 0) return;
    inputTapped.push(idx); tapFlash = idx; tapFlashTimer = 0.22; cellGlow[idx] = 0.5;
    if (litCells.indexOf(idx) >= 0) {
      game.audio.play('se_tap', 0.12);
      if (inputTapped.length === litCells.length) {
        flash = 0.35; flashCol = C.b; resultText = 'ALL FOUND!'; resultTimer = 0.6; game.audio.play('se_success', 0.65);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: '#a78bfa' }); }
        if (round >= NEEDED) { finish(true); return; }
        waitTimer = 0.8;
      }
    } else {
      errors++; flash = 0.35; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.6; game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR) { finish(false); return; }
      seqPhase = 'show'; showIdx = litCells.length; waitTimer = 1.0;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!litCells) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.09, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.125, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PHOTOGRAPHIC!' : 'BLANKED OUT', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapFlashTimer > 0) tapFlashTimer -= dt * 4;
      for (var gi = 0; gi < cellGlow.length; gi++) if (cellGlow[gi] > 0) cellGlow[gi] -= dt * 3;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (seqPhase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) { if (showIdx < litCells.length) { cellGlow[litCells[showIdx]] = 1.0; showIdx++; showTimer = SHOW_DUR; } else { seqPhase = 'input'; for (var gi2 = 0; gi2 < cellGlow.length; gi2++) cellGlow[gi2] = 0; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.91), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0818');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
