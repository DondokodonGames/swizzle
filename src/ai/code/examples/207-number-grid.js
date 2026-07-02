// 207-number-grid.js
// 数字グリッド — 端末のキーパッドを 1 から順に素早くタップして解錠する速度勝負
// 操作: 数字を1から順番にタップ
// 成功: 1-9 を全て順にタップ  失敗: 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、解錠端末） ──
  var C = { bg:'#040608', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER GRID';
  var HOW_TO_PLAY = 'TAP 1 TO 9 IN ORDER';
  var MAX_TIME = 12;
  var COUNT = 9;               // 修正2: 25 → 9（3x3 に縮小）
  var SIZE = 3, CELL = snap(280), GAP = 24;
  var GW = SIZE * CELL + (SIZE - 1) * GAP, GX = snap((W - GW) / 2), GY = snap(H * 0.32);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, current, timeLeft, done, flash, flashTimer, wrongFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(GX - 24, GY - 24, GW + 48, GW + 48, C.d, 0.35);
    game.draw.rect(GX - 24, GY - 24, GW + 48, 8, C.a);
  }

  function initGrid() {
    grid = [];
    for (var i = 1; i <= COUNT; i++) grid.push(i);
    for (var j = grid.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = grid[j]; grid[j] = grid[k]; grid[k] = t; }
  }

  function initGame() { initGrid(); current = 1; timeLeft = MAX_TIME; done = false; flash = -1; flashTimer = 0; wrongFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 100) : (current - 1) * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      var idx = r * SIZE + c, val = grid[idx], cx = GX + c * (CELL + GAP), cy = GY + r * (CELL + GAP);
      var doneCell = val < current, isNext = val === current, isFlash = flash === idx && flashTimer > 0;
      var col = doneCell ? '#1a3a1a' : (isNext ? C.b : '#0f1a28');
      game.draw.rect(cx, cy, CELL, CELL, isFlash ? C.g : col, doneCell ? 0.6 : 0.9);
      game.draw.rect(cx, cy, CELL, 10, doneCell ? C.d : (isNext ? C.g : C.e), 0.5);
      if (isNext && Math.floor(game.time.elapsed * 8) % 2 === 0) game.draw.rect(cx, cy, CELL, CELL, C.c, 0.15);
      txt(val + '', cx + CELL / 2, cy + CELL / 2 + 24, 96, doneCell ? '#1a4a1a' : (isNext ? '#000000' : C.e));
    }
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
    var idx = row * SIZE + col;
    if (grid[idx] === current) {
      flash = idx; flashTimer = 0.25; current++;
      game.audio.play('se_tap', 0.4 + current * 0.04);
      if (current > COUNT) { finish(true); return; }
    } else { wrongFlash = 0.3; game.audio.play('se_failure', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); grid = []; for (var i = 1; i <= COUNT; i++) grid.push(i); current = (Math.floor(game.time.elapsed) % COUNT) + 1; drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#556677');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'UNLOCKED!' : 'TIME OUT', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flashTimer > 0) flashTimer -= dt; else flash = -1;
      if (wrongFlash > 0) wrongFlash -= dt;
    }

    background(); drawGrid();
    if (wrongFlash > 0) game.draw.rect(0, 0, W, H, C.a, wrongFlash * 0.1);

    timeBar();
    txt(timeLeft.toFixed(1) + '', W / 2, 96, 44, C.g);
    txt('NEXT  ' + current, W / 2, 168, 52, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
