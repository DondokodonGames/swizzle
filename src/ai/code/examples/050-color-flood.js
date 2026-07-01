// 050-color-flood.js
// カラーフラッド — 左上から色を塗り広げて盤面を制覇する洪水パズル
// 操作: スワイプ上下左右で次の色を選択（3色循環）
// 成功: 10手以内に全マス同色  失敗: 10手超過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.b, C.e];   // 修正2: 5色 → 3色

  var GAME_TITLE  = 'COLOR FLOOD';
  var HOW_TO_PLAY = 'SWIPE TO PICK COLOR, FLOOD ALL';
  var COLS = 4, ROWS = 4, CELL = 200, MAX_MOVES = 10;   // 修正2: 8x8/25手 → 4x4/10手
  var GRID_X = (W - COLS * CELL) / 2, GRID_Y = (H - ROWS * CELL) / 2;   // 修正1: 縦中央

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var grid, flooded, currentColor, moves, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function initGrid() {
    grid = []; flooded = [];
    for (var r = 0; r < ROWS; r++) { var row = [], frow = []; for (var c = 0; c < COLS; c++) { row.push(Math.floor(Math.random() * COLORS.length)); frow.push(false); } grid.push(row); flooded.push(frow); }
    flooded[0][0] = true; currentColor = grid[0][0]; expandFlood(currentColor); moves = 0; done = false;
  }

  function expandFlood(newColor) {
    var queue = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (flooded[r][c]) { grid[r][c] = newColor; queue.push([r, c]); }
    var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    while (queue.length > 0) {
      var cur = queue.shift();
      for (var d = 0; d < 4; d++) {
        var nr = cur[0] + dirs[d][0], nc = cur[1] + dirs[d][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !flooded[nr][nc] && grid[nr][nc] === newColor) { flooded[nr][nc] = true; queue.push([nr, nc]); }
      }
    }
    currentColor = newColor;
  }
  function countFlooded() { var n = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (flooded[r][c]) n++; return n; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? Math.max(100, (MAX_MOVES - moves) * 200 + 300) : countFlooded() * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var next = currentColor;
    if (dir === 'up' || dir === 'right') next = (currentColor + 1) % COLORS.length;
    if (dir === 'down' || dir === 'left') next = (currentColor + COLORS.length - 1) % COLORS.length;
    if (next === currentColor) return;
    moves++; game.audio.play('se_tap', 0.4); expandFlood(next);
    if (countFlooded() === ROWS * COLS) finish(true);
    else if (moves >= MAX_MOVES) finish(false);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGrid(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: インクの領土制圧。左上から色を流し込み盤面を一色に染める。
  function background() {
    game.draw.clear('#0a0018');
    var fx = GRID_X - 32, fy = GRID_Y - 32, fw = COLS * CELL + 64, fh = ROWS * CELL + 64;
    game.draw.rect(fx, fy, fw, fh, '#12102a');
    game.draw.rect(fx + 12, fy + 12, fw - 24, fh - 24, '#05000f');
    txt('INK FLOOD', W / 2, fy - 4, 36, C.b);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = GRID_X + c * CELL, gy = GRID_Y + r * CELL, col = COLORS[grid[r][c]], fl = flooded[r][c];
      game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, col, fl ? 1 : 0.45);
      if (fl) game.draw.rect(gx + 12, gy + 12, CELL - 24, 16, C.g, 0.2);
    }
    // 色セレクタ
    for (var ci = 0; ci < COLORS.length; ci++) {
      var sx = W / 2 + (ci - (COLORS.length - 1) / 2) * 160, sel = ci === currentColor;
      game.draw.rect(snap(sx) - (sel ? 56 : 40), snap(GRID_Y + ROWS * CELL + 60), sel ? 112 : 80, sel ? 112 : 80, COLORS[ci], sel ? 1 : 0.5);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGrid();
      background();
      drawGrid();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 36, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#888888');
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
    background();
    drawGrid();
    // 手数バー
    var blocks = MAX_MOVES, left = MAX_MOVES - moves;
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 100, 20, 88, 40, i < left ? C.b : '#330011');
    txt('MOVES LEFT ' + left, W / 2, 96, 44, C.c);
    txt(countFlooded() + ' / ' + (ROWS * COLS), W / 2, H - 100, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGrid();
  });
})(game);
