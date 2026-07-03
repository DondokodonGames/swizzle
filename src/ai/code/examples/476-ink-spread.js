// 476-ink-spread.js
// インク広がり — タップで落としたネオンインクが四方へ滲み広がる。制限時間内に盤面を塗る
// 操作: 未塗りのマスをタップしてインクを落とす（複数落として素早く塗り広げる）
// 成功: 盤面の60%を塗る  失敗: 15秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、暗室の滲み） ──
  var C = { bg:'#0a0016', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var INK_COLS = [C.d, C.e, C.a, C.b, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'INK SPREAD';
  var HOW_TO_PLAY = 'TAP TO DROP INK · SPREAD IT ACROSS THE BOARD';
  var MAX_TIME = 15;
  var NEEDED_RATIO = 0.6;    // 修正2: 80% → 60%
  var CELL = 72;
  var COLS = Math.floor(W / CELL), ROWS = Math.floor((H * 0.7) / CELL);
  var OX = snap((W - COLS * CELL) / 2), OY = snap((H - ROWS * CELL) / 2 - 20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, drops, painted, totalCells, dropCount, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1a0a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    grid = []; for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c = 0; c < COLS; c++) grid[r].push(0); }
    drops = []; painted = 0; totalCells = COLS * ROWS; dropCount = 0; timeLeft = MAX_TIME; done = false; particles = [];
  }

  function paintCell(col, row, idx) { if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false; if (grid[row][col] !== 0) return false; grid[row][col] = idx; painted++; return true; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var ratio = painted / totalCells;
    finalScore = success ? (Math.floor(ratio * 1000) + Math.ceil(timeLeft) * 100) : Math.floor(ratio * 500);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12, '#1a0a2a', 0.8);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var v = grid[r][c], cx = OX + c * CELL, cy = OY + r * CELL;
      if (v === 0) game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, '#140820', 0.9);
      else { var col = drops[v - 1] ? drops[v - 1].color : C.d; game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, col, 0.85); game.draw.rect(cx + 2, cy + 2, CELL - 4, 4, C.g, 0.15); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    dropCount++; var color = INK_COLS[dropCount % INK_COLS.length];
    paintCell(col, row, dropCount);
    drops.push({ color: color, dropIdx: dropCount, spread: 0, speed: 3.5 + Math.random() * 2, frontier: [{ col: col, row: row }] });
    game.audio.play('se_tap', 0.3);
    particles.push({ x: OX + col * CELL + CELL / 2, y: OY + row * CELL + CELL / 2, r: 10, maxR: 100, life: 0.5, col: color });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLOODED!' : 'TOO DRY', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (painted >= Math.floor(totalCells * NEEDED_RATIO)) { finish(true); return; }
      if (timeLeft <= 0) { finish(painted / totalCells >= NEEDED_RATIO); return; }
      for (var di = 0; di < drops.length; di++) {
        var d = drops[di]; d.spread += d.speed * dt;
        if (d.frontier.length > 0) {
          var expand = Math.ceil(d.speed * dt * 4), newFront = [];
          for (var fi = 0; fi < Math.min(expand, d.frontier.length); fi++) {
            var cell = d.frontier[fi], nb = [{ col: cell.col - 1, row: cell.row }, { col: cell.col + 1, row: cell.row }, { col: cell.col, row: cell.row - 1 }, { col: cell.col, row: cell.row + 1 }];
            for (var ni = 0; ni < nb.length; ni++) if (paintCell(nb[ni].col, nb[ni].row, d.dropIdx)) newFront.push(nb[ni]);
          }
          d.frontier = d.frontier.slice(expand).concat(newFront);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.r += (p.maxR - p.r) * dt * 6; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var pt = particles[pp2]; for (var a = 0; a < Math.PI * 2; a += 0.4) game.draw.rect(snap(pt.x + Math.cos(a) * pt.r) - 4, snap(pt.y + Math.sin(a) * pt.r) - 4, 8, 8, pt.col, pt.life * 0.5); }
    var ratio = painted / totalCells;
    txt(Math.floor(ratio * 100) + '% / ' + Math.floor(NEEDED_RATIO * 100) + '%', W / 2, OY + ROWS * CELL + 70, 48, ratio >= NEEDED_RATIO ? C.b : C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
