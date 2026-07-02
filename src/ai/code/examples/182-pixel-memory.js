// 182-pixel-memory.js
// ピクセル記憶 — 4×4グリッドが一瞬光る、消えた後に同じ場所をタップする記憶ゲーム
// 操作: タップでグリッドを選択
// 成功: 1ラウンド正解  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶盤） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL MEMORY';
  var HOW_TO_PLAY = 'MEMORIZE THE LIT CELLS · TAP THEM BACK';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 3;
  var COLS = 4, ROWS = 4, CELL = 200, GAP = 12;
  var GW = COLS * CELL + (COLS - 1) * GAP, GH = ROWS * CELL + (ROWS - 1) * GAP;
  var GX = snap((W - GW) / 2), GY = snap(340), SHOW_TIME = 1.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var round, misses, phase, showTimer, lit, selected, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c, cx = GX + c * (CELL + GAP), cy = GY + r * (CELL + GAP);
      game.draw.rect(cx, cy, CELL, CELL, '#0a0018', 0.9);
      game.draw.rect(cx, cy, CELL, 8, C.d, 0.5);
      if (phase === 'show' && lit.indexOf(idx) >= 0) { game.draw.rect(cx, cy, CELL, CELL, C.c, 0.95); game.draw.rect(cx + 8, cy + 8, CELL - 16, 20, C.g, 0.4); }
      else if (phase === 'input' && selected.indexOf(idx) >= 0) { var ok = lit.indexOf(idx) >= 0; game.draw.rect(cx, cy, CELL, CELL, ok ? C.b : C.a, 0.85); }
    }
  }

  function newRound() {
    round++;
    var count = Math.min(2 + Math.floor(round / 3), 4);
    lit = []; var used = {};
    while (lit.length < count) { var idx = Math.floor(Math.random() * 16); if (!used[idx]) { used[idx] = true; lit.push(idx); } }
    selected = []; phase = 'show'; showTimer = SHOW_TIME;
  }

  function initGame() {
    round = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
    newRound();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 400 + Math.ceil(timeLeft) * 30) : round * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    var col = Math.floor((x - GX) / (CELL + GAP)), row = Math.floor((y - GY) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var idx = row * COLS + col;
    if (selected.indexOf(idx) >= 0) return;
    selected.push(idx);
    if (lit.indexOf(idx) >= 0) {
      feedbackOk = true; feedback = 0.3; game.audio.play('se_tap', 0.4);
      if (selected.length === lit.length) { game.audio.play('se_success', 0.8); if (round >= NEEDED) { finish(true); return; } setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 600); }
    } else {
      misses++; feedbackOk = false; feedback = 0.5; game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 700);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); phase = 'show'; lit = [0, 5, 10, 15];
      drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, GY - 60, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'REMEMBERED!' : 'GAME OVER', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) phase = 'input'; }
    }
    if (feedback > 0) feedback -= dt;

    background();
    txt(phase === 'show' ? 'MEMORIZE!' : 'TAP THEM!', W / 2, GY - 50, 52, phase === 'show' ? C.c : C.b);
    drawGrid();
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);
    if (phase === 'input') txt(selected.length + ' / ' + lit.length, W / 2, GY + GH + 50, 48, C.g);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 168, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
