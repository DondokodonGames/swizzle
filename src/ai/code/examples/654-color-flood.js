// 654-color-flood.js
// カラーフラッド — 左上から広がる塗り色を選び、盤面すべてを1色に染め上げる
// 操作: 下のパレットの色をタップすると左上と繋がった同色領域がその色に変わる
// 成功: 20手以内に 全マス単色  失敗: 手数超過 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、染色盤／絵の具色は保持） ──
  var C = { bg:'#0a0c0a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PALETTE = ['#ff2079', '#ff6600', '#ffe600', '#00ff9f', '#00cfff', '#7700ff'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR FLOOD';
  var HOW_TO_PLAY = 'TAP A PALETTE COLOR TO FLOOD FROM THE TOP-LEFT · FILL THE BOARD IN ONE COLOR';
  var MAX_TIME = 25;
  var ROWS = 6, COLS = 6, MAX_MOVES = 20;
  var CELL = Math.floor(Math.min(W * 0.9, snap(H * 0.5)) / COLS), GRID_X = snap((W - COLS * CELL) / 2), GRID_Y = snap(H * 0.22);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, currentColor, moves, timeLeft, done, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0d100d');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(Math.floor(Math.random() * PALETTE.length)); grid.push(row); }
    currentColor = grid[0][0]; moves = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b;
  }

  function floodFill(target, newColor) {
    if (target === newColor) return;
    var stack = [{ r: 0, c: 0 }], visited = [];
    for (var r = 0; r < ROWS; r++) visited.push(new Array(COLS).fill(false));
    while (stack.length > 0) {
      var cell = stack.pop(), cr = cell.r, cc = cell.c;
      if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
      if (visited[cr][cc]) continue; if (grid[cr][cc] !== target) continue;
      visited[cr][cc] = true; grid[cr][cc] = newColor;
      stack.push({ r: cr - 1, c: cc }, { r: cr + 1, c: cc }, { r: cr, c: cc - 1 }, { r: cr, c: cc + 1 });
    }
  }

  function checkWin() { var c0 = grid[0][0]; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] !== c0) return false; return true; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((MAX_MOVES - moves + 1) * 400 + Math.ceil(timeLeft) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) game.draw.rect(GRID_X + c * CELL + 2, GRID_Y + r * CELL + 2, CELL - 4, CELL - 4, PALETTE[grid[r][c]], 0.9);
    var palY = GRID_Y + ROWS * CELL + 50, palW = PALETTE.length * 100, palX = W / 2 - palW / 2;
    for (var pi = 0; pi < PALETTE.length; pi++) { var px = palX + pi * 100 + 50, sel = pi === currentColor; pc(px, palY + 40, sel ? 40 : 30, PALETTE[pi], 0.9); if (sel) pc(px, palY + 40, 48, C.g, 0.25); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var palY = GRID_Y + ROWS * CELL + 50, palW = PALETTE.length * 100, palX = W / 2 - palW / 2;
    if (ty >= palY && ty <= palY + 80) {
      var idx = Math.floor((tx - palX) / 100);
      if (idx >= 0 && idx < PALETTE.length && idx !== currentColor) {
        var old = currentColor; currentColor = idx; floodFill(old, idx); moves++; game.audio.play('se_tap', 0.12);
        if (checkWin()) { finish(true); return; }
        if (moves >= MAX_MOVES) { finish(false); return; }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ONE COLOR!' : 'OUT OF MOVES', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES  ' + (MAX_MOVES - moves), W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
