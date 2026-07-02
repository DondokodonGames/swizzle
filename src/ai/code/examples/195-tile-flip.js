// 195-tile-flip.js
// タイルフリップ — 全タイルを白に揃える、タップすると周囲も反転するパズル
// 操作: タップでタイルと隣接タイルをフリップ
// 成功: 全タイルを白にする  失敗: 10手使い切る or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、配電盤） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'TAP A TILE · IT AND NEIGHBORS FLIP';
  var MAX_TIME = 20;
  var MAX_MOVES = 10;            // 修正2: 30 → 10
  var SHUFFLE = 3;               // 修正2: 8 → 3（易化）
  var SIZE = 5, CELL = 168, GAP = 12;
  var GW = SIZE * CELL + (SIZE - 1) * GAP, GX = snap((W - GW) / 2), GY = snap(360);

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(GX - 16, GY - 16, GW + 32, GW + 32, C.d, 0.4);
    game.draw.rect(GX - 16, GY - 16, GW + 32, 8, C.a);
  }

  function flip(r, c) {
    var d = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var di = 0; di < d.length; di++) { var nr = r + d[di][0], nc = c + d[di][1]; if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) grid[nr * SIZE + nc] = 1 - grid[nr * SIZE + nc]; }
  }

  function drawGrid() {
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      var on = grid[r * SIZE + c] === 1, cx = GX + c * (CELL + GAP), cy = GY + r * (CELL + GAP);
      game.draw.rect(cx, cy, CELL, CELL, on ? C.c : '#2a0a3a', 0.9);
      game.draw.rect(cx, cy, CELL, 8, on ? C.g : C.d, on ? 0.5 : 0.3);
      if (on) game.draw.rect(cx + CELL / 2 - 12, cy + CELL / 2 - 12, 24, 24, C.g, 0.7);
    }
  }

  function checkWin() { for (var i = 0; i < grid.length; i++) if (grid[i] !== 1) return false; return true; }

  function initGrid() {
    grid = [];
    for (var i = 0; i < SIZE * SIZE; i++) grid.push(1);
    for (var s = 0; s < SHUFFLE; s++) flip(Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE));
    if (checkWin()) flip(2, 2);
  }

  function initGame() { initGrid(); moves = 0; timeLeft = MAX_TIME; done = false; }

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
    var col = Math.floor((x - GX) / (CELL + GAP)), row = Math.floor((y - GY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var cx = GX + col * (CELL + GAP), cy = GY + row * (CELL + GAP);
    if (x > cx + CELL || y > cy + CELL) return;
    flip(row, col); moves++;
    game.audio.play('se_tap', 0.4);
    if (checkWin()) { finish(true); return; }
    if (moves >= MAX_MOVES) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); grid = []; for (var i = 0; i < SIZE * SIZE; i++) grid.push((i + Math.floor(game.time.elapsed)) % 2); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.89, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL WHITE!' : 'OUT OF MOVES', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, 168, 44, (MAX_MOVES - moves) <= 3 ? C.a : C.b);
    txt('MAKE ALL TILES LIT', W / 2, GY + GW + 60, 34, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
