// 184-color-flood.js
// カラーフラッド — 左上から色を広げて全マスを同色に染める、少ない手数が勝ち
// 操作: 下の色ボタンをタップして左上から塗り広げる
// 成功: 手数以内に全マスを染める  失敗: 手数切れ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TILES = [C.e, C.c, C.b, C.a, C.f];   // 5色（判別しやすく）

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR FLOOD';
  var HOW_TO_PLAY = 'TAP A COLOR TO FLOOD FROM TOP-LEFT';
  var MAX_TIME = 20;
  var MAX_MOVES = 15;            // 修正2: 盤を6x6に縮小＋手数15で易化
  var COLS = 6, ROWS = 6, CELL = 152, GAP = 6;
  var GW = COLS * CELL + (COLS - 1) * GAP, GH = ROWS * CELL + (ROWS - 1) * GAP;
  var GX = snap((W - GW) / 2), GY = snap(300);
  var BTN_W = 160, BTN_H = 120, BTN_GAP = 24;
  var BTN_TOTAL = TILES.length * BTN_W + (TILES.length - 1) * BTN_GAP;
  var BTN_X = snap((W - BTN_TOTAL) / 2), BTN_Y = snap(GY + GH + 60);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, moves, floodColor, timeLeft, done;

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

  function initGrid() {
    grid = [];
    for (var i = 0; i < COLS * ROWS; i++) grid.push(Math.floor(Math.random() * TILES.length));
    floodColor = grid[0];
  }

  function flood(nc) {
    if (nc === floodColor) return;
    var oc = floodColor; floodColor = nc;
    var seen = new Array(COLS * ROWS).fill(false), q = [0]; seen[0] = true; grid[0] = nc;
    while (q.length) {
      var idx = q.shift(), r = Math.floor(idx / COLS), c = idx % COLS, nb = [];
      if (r > 0) nb.push((r - 1) * COLS + c); if (r < ROWS - 1) nb.push((r + 1) * COLS + c);
      if (c > 0) nb.push(r * COLS + c - 1); if (c < COLS - 1) nb.push(r * COLS + c + 1);
      for (var ni = 0; ni < nb.length; ni++) if (!seen[nb[ni]] && grid[nb[ni]] === oc) { seen[nb[ni]] = true; grid[nb[ni]] = nc; q.push(nb[ni]); }
    }
  }

  function checkWin() { for (var i = 0; i < grid.length; i++) if (grid[i] !== floodColor) return false; return true; }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c, cx = GX + c * (CELL + GAP), cy = GY + r * (CELL + GAP);
      game.draw.rect(cx, cy, CELL, CELL, TILES[grid[idx]], 0.92);
      game.draw.rect(cx, cy, CELL, 8, C.g, 0.2);
    }
  }

  function drawButtons() {
    for (var ci = 0; ci < TILES.length; ci++) {
      var bx = BTN_X + ci * (BTN_W + BTN_GAP), active = ci === floodColor;
      game.draw.rect(bx - 4, BTN_Y - 4, BTN_W + 8, BTN_H + 8, active ? C.g : '#2a0a3a', 0.9);
      game.draw.rect(bx, BTN_Y, BTN_W, BTN_H, TILES[ci], 0.95);
      if (active) game.draw.rect(bx + BTN_W / 2 - 8, BTN_Y - 24, 16, 16, C.g);
    }
  }

  function initGame() {
    initGrid(); moves = 0; timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((MAX_MOVES - moves + 1) * 200 + Math.ceil(timeLeft) * 20) : moves * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ci = 0; ci < TILES.length; ci++) {
      var bx = BTN_X + ci * (BTN_W + BTN_GAP);
      if (x >= bx && x <= bx + BTN_W && y >= BTN_Y && y <= BTN_Y + BTN_H) {
        if (ci === floodColor) return;
        moves++; flood(ci); game.audio.play('se_tap', 0.4);
        if (checkWin()) { finish(true); return; }
        if (moves >= MAX_MOVES) { finish(false); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      grid = grid || []; for (var i = 0; i < COLS * ROWS; i++) grid[i] = (i + Math.floor(game.time.elapsed)) % TILES.length;
      drawGrid(); floodColor = 0; drawButtons();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLOODED!' : 'OUT OF MOVES', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }

    background();
    drawGrid();
    drawButtons();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, 168, 44, (MAX_MOVES - moves) <= 4 ? C.a : C.b);
    txt(HOW_TO_PLAY, W / 2, BTN_Y + BTN_H + 60, 32, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
