// 240-voltage-line.js
// ボルテージライン — 導線パーツをタップで回転させ、電源からランプまで電気を通す回路パズル
// 操作: タップで導線を90度回転
// 成功: ランプまで通電  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、配電盤） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE LINE';
  var HOW_TO_PLAY = 'TAP WIRES TO ROTATE · POWER THE LAMP';
  var MAX_TIME = 20;
  var COLS = 4, ROWS = 5;     // 修正2: 5x7 → 4x5（易化）
  var CELL = Math.min(snap((W - 80) / COLS), snap((H * 0.55) / ROWS));
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.3);
  var PIECE_TYPES = [3, 5, 6, 9, 10, 12];
  var SOURCE = { col: 0, row: 2 }, LAMP = { col: COLS - 1, row: 2 };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, powered, timeLeft, done;

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

  function background() { game.draw.clear(C.bg); game.draw.rect(OX - 16, OY - 16, COLS * CELL + 32, ROWS * CELL + 32, C.d, 0.3); }

  function initGrid() {
    grid = []; powered = [];
    for (var r = 0; r < ROWS; r++) { grid[r] = []; powered[r] = []; for (var c = 0; c < COLS; c++) { powered[r][c] = false; if (c === SOURCE.col && r === SOURCE.row) grid[r][c] = { type: 10, rot: 0 }; else if (c === LAMP.col && r === LAMP.row) grid[r][c] = { type: 10, rot: 0 }; else grid[r][c] = { type: PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)], rot: Math.floor(Math.random() * 4) }; } }
  }

  function connections(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    var t = grid[r][c].type, rot = grid[r][c].rot % 4;
    for (var i = 0; i < rot; i++) { var n = 0; if (t & 1) n |= 2; if (t & 2) n |= 4; if (t & 4) n |= 8; if (t & 8) n |= 1; t = n; }
    return t;
  }

  function flood() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) powered[r][c] = false;
    var q = [{ r: SOURCE.row, c: SOURCE.col }]; powered[SOURCE.row][SOURCE.col] = true;
    var D = [{ dr: -1, dc: 0, my: 1, nb: 4 }, { dr: 0, dc: 1, my: 2, nb: 8 }, { dr: 1, dc: 0, my: 4, nb: 1 }, { dr: 0, dc: -1, my: 8, nb: 2 }];
    while (q.length) { var cur = q.shift(), mc = connections(cur.r, cur.c); for (var di = 0; di < D.length; di++) { var d = D[di], nr = cur.r + d.dr, nc = cur.c + d.dc; if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || powered[nr][nc]) continue; if (!(mc & d.my)) continue; if (!(connections(nr, nc) & d.nb)) continue; powered[nr][nc] = true; q.push({ r: nr, c: nc }); } }
    return powered[LAMP.row][LAMP.col];
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = OX + c * CELL, gy = OY + r * CELL, cx = gx + CELL / 2, cy = gy + CELL / 2, on = powered[r][c], conn = connections(r, c), col = on ? C.b : '#455';
      game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#0f1a28', 0.8);
      if (conn & 1) for (var y = cy; y > gy; y -= 8) game.draw.rect(snap(cx) - 4, snap(y) - 4, 8, 8, col, 0.9);
      if (conn & 4) for (var y2 = cy; y2 < gy + CELL; y2 += 8) game.draw.rect(snap(cx) - 4, snap(y2) - 4, 8, 8, col, 0.9);
      if (conn & 2) for (var x = cx; x < gx + CELL; x += 8) game.draw.rect(snap(x) - 4, snap(cy) - 4, 8, 8, col, 0.9);
      if (conn & 8) for (var x2 = cx; x2 > gx; x2 -= 8) game.draw.rect(snap(x2) - 4, snap(cy) - 4, 8, 8, col, 0.9);
      game.draw.rect(snap(cx) - 6, snap(cy) - 6, 12, 12, on ? C.c : col, 0.9);
      if (c === SOURCE.col && r === SOURCE.row) { game.draw.rect(snap(cx) - 16, snap(cy) - 16, 32, 32, C.f, 0.9); txt('PWR', cx, cy + 10, 22, '#000'); }
      if (c === LAMP.col && r === LAMP.row) { game.draw.rect(snap(cx) - 16, snap(cy) - 16, 32, 32, on ? C.c : '#333', 0.9); txt(on ? 'ON' : 'OFF', cx, cy + 10, 20, on ? '#000' : '#666'); }
    }
  }

  function initGame() { initGrid(); timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    if ((c === SOURCE.col && r === SOURCE.row) || (c === LAMP.col && r === LAMP.row)) return;
    grid[r][c].rot = (grid[r][c].rot + 1) % 4; game.audio.play('se_tap', 0.3);
    if (flood()) finish(true);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); flood(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CIRCUIT LIVE!' : 'NO POWER', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } flood(); }

    background(); drawGrid();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('CONNECT PWR → LAMP', W / 2, H - 120, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
