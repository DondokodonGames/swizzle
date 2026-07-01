// 145-wire-connect.js
// 配線つなぎ — 回路を繋いで電流を流す達成感のあるパズルゲーム
// 操作: タップで電線を90度回転
// 成功: 1面クリア  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、基板） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE CONNECT';
  var HOW_TO_PLAY = 'TAP WIRES TO ROTATE · POWER THE ★';
  var MAX_TIME = 20;             // 修正2: 60 → 20
  var NEEDED   = 1;              // 修正2: 5 → 1
  var COLS = 5, ROWS = 6, CELL = 176;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(280);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pipes, sourceCell, sinkCell, score, timeLeft, done, winFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 0.95);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function rotateBit(bits, times) {
    var b = bits;
    for (var i = 0; i < times; i++) {
      var nb = 0;
      if (b & 1) nb |= 2; if (b & 2) nb |= 4; if (b & 4) nb |= 8; if (b & 8) nb |= 1;
      b = nb;
    }
    return b;
  }

  function makeGrid() {
    sourceCell = { r: 0, c: 2 }; sinkCell = { r: ROWS - 1, c: 2 };
    pipes = [];
    for (var r = 0; r < ROWS; r++) {
      pipes.push([]);
      for (var c = 0; c < COLS; c++) {
        var t;
        if (r === sourceCell.r && c === sourceCell.c) t = 4;
        else if (r === sinkCell.r && c === sinkCell.c) t = 1;
        else { var types = [3, 5, 6, 9, 10, 12]; t = types[Math.floor(Math.random() * types.length)]; }
        pipes[r].push({ t: t, r: Math.floor(Math.random() * 4), lit: false });
      }
    }
    computeEnergy();
  }

  function getConn(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    return rotateBit(pipes[r][c].t, pipes[r][c].r);
  }

  function computeEnergy() {
    var lit = [];
    for (var r = 0; r < ROWS; r++) { lit.push([]); for (var c = 0; c < COLS; c++) { lit[r].push(false); pipes[r][c].lit = false; } }
    var q = [{ r: sourceCell.r, c: sourceCell.c }];
    lit[sourceCell.r][sourceCell.c] = true; pipes[sourceCell.r][sourceCell.c].lit = true;
    while (q.length) {
      var cell = q.shift(), conn = getConn(cell.r, cell.c);
      var nb = [{ nr: cell.r - 1, nc: cell.c, my: 1, th: 4 }, { nr: cell.r, nc: cell.c + 1, my: 2, th: 8 }, { nr: cell.r + 1, nc: cell.c, my: 4, th: 1 }, { nr: cell.r, nc: cell.c - 1, my: 8, th: 2 }];
      for (var i = 0; i < nb.length; i++) {
        var n = nb[i];
        if (n.nr < 0 || n.nr >= ROWS || n.nc < 0 || n.nc >= COLS || lit[n.nr][n.nc]) continue;
        if ((conn & n.my) && (getConn(n.nr, n.nc) & n.th)) { lit[n.nr][n.nc] = true; pipes[n.nr][n.nc].lit = true; q.push({ r: n.nr, c: n.nc }); }
      }
    }
    return lit[sinkCell.r][sinkCell.c];
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(OX - 16, OY - 16, COLS * CELL + 32, ROWS * CELL + 32, C.d, 0.4);
    game.draw.rect(OX - 16, OY - 16, COLS * CELL + 32, 8, C.a);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var x = OX + c * CELL, y = OY + r * CELL;
      game.draw.rect(x + 2, y + 2, CELL - 4, CELL - 4, '#0a0018', 0.8);
      var conn = getConn(r, c), lit = pipes[r][c].lit;
      var col = lit ? C.b : '#6a5a8a', cx = x + CELL / 2, cy = y + CELL / 2;
      if (conn & 1) pl(cx, cy, cx, y + 4, col, 14);
      if (conn & 2) pl(cx, cy, x + CELL - 4, cy, col, 14);
      if (conn & 4) pl(cx, cy, cx, y + CELL - 4, col, 14);
      if (conn & 8) pl(cx, cy, x + 4, cy, col, 14);
      game.draw.rect(cx - 12, cy - 12, 24, 24, col);
      var isSrc = r === sourceCell.r && c === sourceCell.c, isSink = r === sinkCell.r && c === sinkCell.c;
      if (isSrc) { game.draw.rect(cx - 28, cy - 28, 56, 56, C.f); txt('⚡', cx, cy - 8, 40, C.g); }
      if (isSink) { game.draw.rect(cx - 28, cy - 28, 56, 56, lit ? C.c : C.d); txt('★', cx, cy - 8, 40, C.g); }
    }
  }

  function initGame() {
    score = 0; timeLeft = MAX_TIME; done = false; winFlash = 0;
    makeGrid();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 30) : score * 100;
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
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if ((r === sourceCell.r && c === sourceCell.c) || (r === sinkCell.r && c === sinkCell.c)) return;
    pipes[r][c].r = (pipes[r][c].r + 1) % 4;
    game.audio.play('se_tap', 0.4);
    if (computeEnergy()) {
      score++; winFlash = 0.8;
      game.audio.play('se_success');
      if (score >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) makeGrid(); }, 800);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.90, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.95, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CIRCUIT LIVE!' : 'TIME OUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    if (winFlash > 0) winFlash -= dt;

    background(); drawGrid();
    if (winFlash > 0) game.draw.rect(0, 0, W, H, C.b, winFlash * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    txt('TAP WIRES', W / 2, H - 110, 40, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
