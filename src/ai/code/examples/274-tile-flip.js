// 274-tile-flip.js
// タイルフリップ — タップで自身と隣接タイルが反転する。全マスを同じ色に揃える反転パズル
// 操作: タイルをタップ（十字に反転する）
// 成功: 全マスを同色に  失敗: 8手使い切る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、配電盤パズル） ──
  var C = { bg:'#030610', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'TAP A TILE · IT AND NEIGHBORS FLIP · MATCH ALL';
  var MAX_TIME = 15;
  var MAX_MOVES = 8;         // 修正2: 30 → 8
  var SHUFFLE = 3;           // 易化
  var COLS = 5, ROWS = 5, TILE = snap(160), GAP = 14;
  var GW = COLS * TILE + (COLS - 1) * GAP, OX = snap((W - GW) / 2), OY = snap(H * 0.3);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, moves, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(OX - 16, OY - 16, GW + 32, GW + 32, C.d, 0.3); }

  function flip(c, r) { var d = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]; for (var i = 0; i < d.length; i++) { var nc = c + d[i][0], nr = r + d[i][1]; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) grid[nr][nc] = 1 - grid[nr][nc]; } }

  function checkWin() { var first = grid[0][0]; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] !== first) return false; return true; }

  function initGrid() { grid = []; for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = 0; } for (var s = 0; s < SHUFFLE; s++) flip(Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)); if (checkWin()) flip(2, 2); }

  function initGame() { initGrid(); moves = 0; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((MAX_MOVES - moves + 1) * 300 + Math.ceil(timeLeft) * 60) : moves * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var on = grid[r][c] === 1, cx = OX + c * (TILE + GAP), cy = OY + r * (TILE + GAP);
      game.draw.rect(cx, cy, TILE, TILE, on ? C.c : '#12203a', 0.9);
      game.draw.rect(cx, cy, TILE, 8, on ? C.g : C.d, 0.5);
      if (on) game.draw.rect(cx + TILE / 2 - 12, cy + TILE / 2 - 12, 24, 24, C.g, 0.6);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / (TILE + GAP)), r = Math.floor((y - OY) / (TILE + GAP));
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var cx = OX + c * (TILE + GAP), cy = OY + r * (TILE + GAP); if (x > cx + TILE || y > cy + TILE) return;
    flip(c, r); moves++; game.audio.play('se_tap', 0.4);
    if (checkWin()) { finish(true); return; }
    if (moves >= MAX_MOVES) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); grid = []; for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = (c + r + Math.floor(game.time.elapsed)) % 2; } drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MATCHED!' : 'OUT OF MOVES', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }

    background(); drawGrid();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, 168, 46, (MAX_MOVES - moves) <= 2 ? C.a : C.b);
    txt('MATCH ALL TILES', W / 2, OY + GW + 60, 34, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
