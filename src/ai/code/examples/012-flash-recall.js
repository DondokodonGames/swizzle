// 012-flash-recall.js
// 一瞬の記憶 — チカッと光った場所を覚えて再現する挑戦
// 操作: 光ったマスをタップして再現
// 成功: 1ラウンド完璧に  失敗: 1つ間違える or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'FLASH RECALL';
  var HOW_TO_PLAY = 'REPEAT THE FLASH';
  var MAX_TIME = 20;
  var NEEDED = 1;             // 修正2: 3ラウンド → 1
  var FLASH_COUNT = 2;        // 修正2: 記憶セル 3 → 2
  var COLS = 4, ROWS = 4, CELL = 220, GAP = 16;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2;   // 修正1: 縦中央
  var FLASH_DURATION = 1.2, HIDE_DURATION = 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var round, timeLeft, done, phase, flashTimer, feedbackTimer, feedbackOk, targetCells, tappedCells, wrongCell;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function cellRect(idx) {
    var col = idx % COLS, row = Math.floor(idx / COLS);
    return { x: GRID_X + col * (CELL + GAP), y: GRID_Y + row * (CELL + GAP) };
  }
  function cellAtPos(tx, ty) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = cellRect(i);
      if (tx >= r.x && tx < r.x + CELL && ty >= r.y && ty < r.y + CELL) return i;
    }
    return -1;
  }

  function chooseRound() {
    targetCells = [];
    var pool = [];
    for (var i = 0; i < COLS * ROWS; i++) pool.push(i);
    for (var j = 0; j < FLASH_COUNT; j++) {
      var idx = Math.floor(Math.random() * pool.length);
      targetCells.push(pool[idx]); pool.splice(idx, 1);
    }
    tappedCells = []; wrongCell = -1; phase = 'flash'; flashTimer = FLASH_DURATION;
  }

  function initGame() {
    round = 0; timeLeft = MAX_TIME; done = false; feedbackTimer = 0; feedbackOk = false;
    chooseRound();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (round * 300 + Math.ceil(timeLeft) * 50) : round * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'recall') return;
    var idx = cellAtPos(x, y);
    if (idx === -1 || tappedCells.indexOf(idx) !== -1) return;
    tappedCells.push(idx);
    game.audio.play('se_tap', 0.7);
    var expected = targetCells[tappedCells.length - 1];
    if (idx !== expected) {
      wrongCell = idx; feedbackOk = false; feedbackTimer = 0.8; phase = 'feedback';
      finish(false);
      return;
    }
    if (tappedCells.length >= FLASH_COUNT) {
      round++; feedbackOk = true; feedbackTimer = 0.7; phase = 'feedback';
      if (round >= NEEDED) finish(true);
    }
  });

  // 世界観: ハッキング端末。点灯したメモリセルの並びを記憶して再入力する。
  function background() {
    game.draw.clear('#0a0014');
    // 端末筐体（グリッドを囲む）
    var fx = GRID_X - 40, fy = GRID_Y - 56, fw = GRID_W + 80, fh = GRID_H + 112;
    game.draw.rect(fx, fy, fw, fh, '#1a0a2a');
    game.draw.rect(fx + 12, fy + 12, fw - 24, fh - 24, '#05000f');
    txt('MEMORY BANK', W / 2, fy + 32, 36, C.b);
    // 流れるデータ列（装飾）
    for (var i = 0; i < 8; i++) {
      var yy = (game.time.elapsed * 90 + i * 240) % H;
      game.draw.rect(40, snap(yy), 8, 48, C.b, 0.18);
      game.draw.rect(W - 48, snap((yy + 360) % H), 8, 48, C.a, 0.18);
    }
  }

  function drawGrid() {
    var isFlashing = phase === 'flash' && flashTimer > 0;
    for (var i = 0; i < COLS * ROWS; i++) {
      var cr = cellRect(i);
      var isTarget = targetCells.indexOf(i) !== -1;
      var isTapped = tappedCells.indexOf(i) !== -1;
      var isWrong = i === wrongCell;
      game.draw.rect(cr.x, cr.y, CELL, CELL, C.d, 0.4);
      game.draw.rect(cr.x + 6, cr.y + 6, CELL - 12, CELL - 12, '#0a0018');
      if (isFlashing && isTarget) game.draw.rect(cr.x + 6, cr.y + 6, CELL - 12, CELL - 12, C.e);
      if ((phase === 'recall' || phase === 'feedback') && isTapped)
        game.draw.rect(cr.x + 6, cr.y + 6, CELL - 12, CELL - 12, isWrong ? C.a : C.b);
      if (phase === 'feedback' && !feedbackOk && isTarget)
        game.draw.rect(cr.x + 6, cr.y + 6, CELL - 12, CELL - 12, C.e, 0.5);
    }
    for (var t = 0; t < tappedCells.length; t++) {
      var tcr = cellRect(tappedCells[t]);
      txt('' + (t + 1), tcr.x + CELL / 2, tcr.y + CELL / 2, 72, C.g);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      // デモ: 1セルが点滅
      var demoIdx = Math.floor(game.time.elapsed) % (COLS * ROWS);
      var dcr = cellRect(demoIdx);
      for (var di = 0; di < COLS * ROWS; di++) {
        var cr = cellRect(di);
        game.draw.rect(cr.x, cr.y, CELL, CELL, C.d, 0.4);
        game.draw.rect(cr.x + 6, cr.y + 6, CELL - 12, CELL - 12, '#0a0018');
      }
      if (Math.floor(game.time.elapsed * 4) % 2 === 0) game.draw.rect(dcr.x + 6, dcr.y + 6, CELL - 12, CELL - 12, C.e);
      txt(GAME_TITLE,  W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 44, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'flash') {
        flashTimer -= dt;
        if (flashTimer < -HIDE_DURATION) phase = 'recall';
      } else if (phase === 'feedback') {
        feedbackTimer -= dt;
        if (feedbackTimer <= 0 && !done) chooseRound();
      }
    }

    // ---- draw ----
    background();
    drawGrid();
    timeBar();
    txt('SCORE ' + String(finalScore || round * 100).padStart(6, '0'), W / 2, 96, 40, C.g);
    var label = phase === 'flash' && flashTimer > 0 ? 'MEMORIZE!' : phase === 'recall' ? 'REPEAT!' : '...';
    txt(label, W / 2, H - 100, 56, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
