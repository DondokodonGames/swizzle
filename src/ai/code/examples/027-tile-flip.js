// 027-tile-flip.js
// タイルフリップ — 裏返したタイルが全部同じ色になる瞬間の達成感
// 操作: タップでタイルを反転（隣接タイルも連動）
// 成功: 全タイルを同じ色に揃える  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP (NEIGHBORS TOO)';
  var MAX_TIME = 30;
  // 修正2: 5x5 → 3x3 + 1手スクランブルで易化
  var COLS = 3, ROWS = 3, TILE = 280, GAP = 16, SCRAMBLE = 1;
  var GRID_W = COLS * TILE + (COLS - 1) * GAP;
  var GRID_H = ROWS * TILE + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2, GRID_Y = (H - GRID_H) / 2;   // 修正1: 縦中央
  var TOTAL = COLS * ROWS;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var tiles, timeLeft, done, moves;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function idx(c, r) { return r * COLS + c; }
  function flip(col, row) {
    var nb = [[col, row], [col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]];
    for (var i = 0; i < nb.length; i++) {
      var tc = nb[i][0], tr = nb[i][1];
      if (tc >= 0 && tc < COLS && tr >= 0 && tr < ROWS) { var ti = idx(tc, tr); tiles[ti] = 1 - tiles[ti]; }
    }
  }
  function isSolved() { for (var i = 1; i < TOTAL; i++) if (tiles[i] !== tiles[0]) return false; return true; }

  function initGame() {
    tiles = []; for (var i = 0; i < TOTAL; i++) tiles.push(0);
    moves = 0; timeLeft = MAX_TIME; done = false;
    // 解けた状態から SCRAMBLE 回だけランダムにflip（必ず可解・易しい）
    for (var s = 0; s < SCRAMBLE; s++) flip(Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS));
    if (isSolved()) flip(1, 1);
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? Math.max(100, (10 - moves) * 80 + Math.ceil(timeLeft) * 30) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((x - GRID_X) / (TILE + GAP)), row = Math.floor((y - GRID_Y) / (TILE + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var tx = GRID_X + col * (TILE + GAP), ty = GRID_Y + row * (TILE + GAP);
    if (x > tx + TILE || y > ty + TILE) return;
    flip(col, row); moves++;
    game.audio.play('se_tap', 0.6);
    if (isSolved()) finish(true);
  });

  function background() { game.draw.clear(C.bg); }

  function drawTiles() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ti = idx(c, r), tx = GRID_X + c * (TILE + GAP), ty = GRID_Y + r * (TILE + GAP);
      var col = tiles[ti] === 0 ? C.d : C.a;
      game.draw.rect(tx, ty, TILE, TILE, col);
      game.draw.rect(tx + 12, ty + 12, TILE - 24, TILE * 0.3, C.g, 0.3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame();
      background();
      drawTiles();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.76, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.83, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
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
    }

    // ---- draw ----
    background();
    drawTiles();
    timeBar();
    txt('MOVES ' + String(moves).padStart(3, '0'), W / 2, 96, 48, C.g);
    txt('MATCH ALL TILES!', W / 2, H - 120, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
