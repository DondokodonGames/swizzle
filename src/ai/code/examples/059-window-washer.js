// 059-window-washer.js
// ウィンドウウォッシャー — 汚れた窓をタップ/長押しで拭いてピカピカにする清掃ゲーム
// 操作: タップ/長押しで汚れを拭く
// 成功: 30%以上クリーン  失敗: 25秒で制限

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'WINDOW WASHER';
  var HOW_TO_PLAY = 'TAP / HOLD TO WIPE';
  var MAX_TIME = 25;
  var WIN_THRESHOLD = 0.30;   // 修正2: 90% → 30%
  var COLS = 8, ROWS = 12, CELL = 116;
  var WIN_X = (W - COLS * CELL) / 2, WIN_Y = (H - ROWS * CELL) / 2;   // 修正1: 縦中央

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var grid, cleanCount, timeLeft, done, lastWipeCell;

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

  function initGrid() {
    grid = []; cleanCount = 0;
    for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) { var dirty = Math.random() < 0.85; row.push(dirty ? 0 : 1); if (!dirty) cleanCount++; } grid.push(row); }
    timeLeft = MAX_TIME; done = false; lastWipeCell = -1;
  }
  function posToCell(x, y) { var c = Math.floor((x - WIN_X) / CELL), r = Math.floor((y - WIN_Y) / CELL); if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1; return r * COLS + c; }
  function wipeCell(idx) { if (idx < 0) return; var r = Math.floor(idx / COLS), c = idx % COLS; if (grid[r][c] === 0) { grid[r][c] = 1; cleanCount++; game.audio.play('se_tap', 0.2); } lastWipeCell = idx; }
  function cleanRatio() { return cleanCount / (COLS * ROWS); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (Math.floor(cleanRatio() * 400) + Math.ceil(timeLeft) * 30) : Math.floor(cleanRatio() * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onHold(function(x, y) { if (state === S.PLAYING && !done) wipeCell(posToCell(x, y)); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGrid(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    wipeCell(posToCell(x, y));
    if (cleanRatio() >= WIN_THRESHOLD) finish(true);
  });

  // 世界観: 高層ビルの窓拭き。ゴンドラから汚れ窓をスクイジーで磨く。
  function background() {
    game.draw.clear('#0a0018');
    // ビルの外壁
    game.draw.rect(WIN_X - 40, WIN_Y - 40, COLS * CELL + 80, ROWS * CELL + 80, C.f);
    game.draw.rect(WIN_X - 40, WIN_Y - 40, COLS * CELL + 80, 16, C.d, 0.4);
    // 桟
    game.draw.rect(WIN_X, WIN_Y + ROWS * CELL / 2 - 8, COLS * CELL, 16, C.f);
    game.draw.rect(WIN_X + COLS * CELL / 2 - 8, WIN_Y, 16, ROWS * CELL, C.f);
    txt('SKYSCRAPER', W / 2, WIN_Y - 70, 34, C.b);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = WIN_X + c * CELL, gy = WIN_Y + r * CELL;
      if (grid[r][c] === 0) { game.draw.rect(gx, gy, CELL - 2, CELL - 2, '#3a2a10'); if ((r + c) % 3 === 0) game.draw.rect(gx + 40, gy + 30, 24, 24, '#5a4020'); }
      else { game.draw.rect(gx, gy, CELL - 2, CELL - 2, C.e, 0.7); game.draw.rect(gx + 8, gy + 8, 16, CELL * 0.4, C.g, 0.2); }
    }
    if (lastWipeCell >= 0) { var lr = Math.floor(lastWipeCell / COLS), lc = lastWipeCell % COLS; game.draw.rect(WIN_X + lc * CELL, WIN_Y + lr * CELL, CELL, CELL, C.g, 0.3); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGrid();
      background();
      drawGrid();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
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
      if (timeLeft <= 0) { finish(cleanRatio() >= WIN_THRESHOLD); return; }
    }

    // ---- draw ----
    background();
    drawGrid();
    timeBar();
    txt('CLEAN ' + Math.floor(cleanRatio() * 100) + '% / ' + Math.floor(WIN_THRESHOLD * 100) + '%', W / 2, 96, 44, C.b);
    txt('WIPE THE GLASS!', W / 2, H - 100, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGrid();
  });
})(game);
