// 709-tile-flip.js
// タイルフリップ — タップしたタイルと上下左右が色反転。盤面を全部同じ色に揃える
// 操作: タイルをタップすると自身と隣接4マスが反転。全消灯か全点灯を目指す
// 成功: 3パズル クリア  失敗: 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、タイル盤） ──
  var C = { bg:'#030710', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'TAP A TILE TO FLIP IT AND ITS NEIGHBORS · MAKE THE WHOLE BOARD MATCH';
  var MAX_TIME = 28;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var COLS = 5, ROWS = 5, CELL = 168, GAP = 14;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = snap((W - GRID_W) / 2), GRID_Y = snap((H - GRID_H) / 2 + 80);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, round, timeLeft, done, particles, flash, resultText, resultTimer, waitTimer, tapFlash, tapFlashTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040a14');
  }

  function background() { game.draw.clear(C.bg); }

  function flipAt(idx) {
    var col = idx % COLS, row = Math.floor(idx / COLS);
    tiles[idx] ^= 1;
    if (col > 0) tiles[idx - 1] ^= 1;
    if (col < COLS - 1) tiles[idx + 1] ^= 1;
    if (row > 0) tiles[idx - COLS] ^= 1;
    if (row < ROWS - 1) tiles[idx + COLS] ^= 1;
  }

  function allSame() { var first = tiles[0]; for (var i = 1; i < tiles.length; i++) if (tiles[i] !== first) return false; return true; }

  function newPuzzle() {
    tiles = []; for (var i = 0; i < COLS * ROWS; i++) tiles.push(0);
    var moves = 4 + round;
    for (var m = 0; m < moves; m++) flipAt(Math.floor(Math.random() * COLS * ROWS));
    if (allSame()) flipAt(0);
    waitTimer = 0; tapFlash = -1;
  }

  function initGame() { round = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; resultText = ''; resultTimer = 0; waitTimer = 0; tapFlashTimer = 0; newPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 900 + Math.ceil(timeLeft) * 100) : round * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var row2 = 0; row2 < ROWS; row2++) for (var col2 = 0; col2 < COLS; col2++) {
      var idx2 = row2 * COLS + col2, cx = GRID_X + col2 * (CELL + GAP), cy = GRID_Y + row2 * (CELL + GAP);
      var on = tiles[idx2] === 1, isTap = idx2 === tapFlash && tapFlashTimer > 0;
      var tCol = isTap ? C.g : (on ? C.e : '#1e3a5f'), tAlpha = isTap ? 0.95 : (on ? 0.85 : 0.7);
      game.draw.rect(cx, cy, CELL, CELL, tCol, tAlpha);
      if (on) game.draw.rect(cx, cy, CELL, 10, C.g, 0.3);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if ((tx - GRID_X) - col * (CELL + GAP) > CELL || (ty - GRID_Y) - row * (CELL + GAP) > CELL) return;
    var idx = row * COLS + col; tapFlash = idx; tapFlashTimer = 0.2; flipAt(idx); game.audio.play('se_tap', 0.1);
    if (allSame()) {
      round++; flash = 0.35; resultText = 'CLEAR!'; resultTimer = 0.6; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 240, vy: Math.sin(pa) * 240, life: 0.5, col: C.e }); }
      if (round >= NEEDED) { finish(true); return; }
      waitTimer = 0.8;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL MATCHED!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapFlashTimer > 0) tapFlashTimer -= dt * 5;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newPuzzle(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(GRID_Y + GRID_H + 80), 64, C.b);
    else txt('MATCH ALL TILES', W / 2, snap(GRID_Y - 60), 36, '#ffffff44');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
