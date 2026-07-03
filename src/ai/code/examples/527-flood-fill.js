// 527-flood-fill.js
// フラッドフィル — 左上から広がる洪水を、パレットの色で塗り替えて全マス同色にする
// 操作: 下のカラーパレットをタップ、左上マスからその色が連結領域に広がる
// 成功: 6マス盤を規定手数以内に全マス同色  失敗: 手数超過 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、塗り絵回路） ──
  var C = { bg:'#05050a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  // 塗り分けは色そのものがゲーム内容 → 判別しやすい6色を維持
  var PALETTE = ['#ff2079', '#00cfff', '#00ff9f', '#ffe600', '#7700ff', '#ff6600'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FLOOD FILL';
  var HOW_TO_PLAY = 'TAP A COLOR · FLOOD FROM TOP-LEFT · FILL THE WHOLE BOARD';
  var MAX_TIME  = 25;
  var GRID_SIZE = 6;         // 修正2: 8 → 6
  var MAX_MOVES = 14;        // 修正2: 25 → 14（6x6は約12手で解ける）
  var CELL = 144;
  var OX = snap((W - GRID_SIZE * CELL) / 2), OY = snap(H * 0.22);

  var PAL_SIZE = 140, PAL_GAP = 24;
  var PAL_OX = snap((W - (PALETTE.length * (PAL_SIZE + PAL_GAP) - PAL_GAP)) / 2), PALETTE_Y = snap(H * 0.80);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, moves, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0c0c1a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID_SIZE; r++) { grid[r] = []; for (var c = 0; c < GRID_SIZE; c++) grid[r][c] = Math.floor(Math.random() * PALETTE.length); }
  }

  function floodFill(newColor) {
    var oldColor = grid[0][0]; if (oldColor === newColor) return;
    var queue = [{ r: 0, c: 0 }], visited = { '0,0': true };
    while (queue.length > 0) {
      var cell = queue.shift(); grid[cell.r][cell.c] = newColor;
      var nb = [{ r: cell.r - 1, c: cell.c }, { r: cell.r + 1, c: cell.c }, { r: cell.r, c: cell.c - 1 }, { r: cell.r, c: cell.c + 1 }];
      for (var ni = 0; ni < nb.length; ni++) { var n = nb[ni], key = n.r + ',' + n.c; if (n.r >= 0 && n.r < GRID_SIZE && n.c >= 0 && n.c < GRID_SIZE && !visited[key] && grid[n.r][n.c] === oldColor) { visited[key] = true; queue.push(n); } }
    }
  }

  function isAllSame() { var first = grid[0][0]; for (var r = 0; r < GRID_SIZE; r++) for (var c = 0; c < GRID_SIZE; c++) if (grid[r][c] !== first) return false; return true; }

  function initGame() { moves = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.max(0, MAX_MOVES - moves) * 500 + Math.ceil(timeLeft) * 100) : moves * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GRID_SIZE; r++) for (var c = 0; c < GRID_SIZE; c++) {
      var cx = OX + c * CELL + 4, cy = OY + r * CELL + 4;
      game.draw.rect(cx, cy, CELL - 8, CELL - 8, PALETTE[grid[r][c]], 0.92);
      if (r === 0 && c === 0) { game.draw.rect(cx, cy, CELL - 8, 8, C.g, 0.5); game.draw.rect(cx, cy, 8, CELL - 8, C.g, 0.5); }
    }
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PAL_OX + i * (PAL_SIZE + PAL_GAP), isCur = (i === grid[0][0]);
      game.draw.rect(px + 4, PALETTE_Y + 4, PAL_SIZE - 8, PAL_SIZE - 8, PALETTE[i], 0.92);
      if (isCur) { game.draw.rect(px, PALETTE_Y, PAL_SIZE, 8, C.g, 0.7); game.draw.rect(px, PALETTE_Y, 8, PAL_SIZE, C.g, 0.7); game.draw.rect(px + PAL_SIZE - 8, PALETTE_Y, 8, PAL_SIZE, C.g, 0.7); game.draw.rect(px, PALETTE_Y + PAL_SIZE - 8, PAL_SIZE, 8, C.g, 0.7); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PAL_OX + i * (PAL_SIZE + PAL_GAP);
      if (tx >= px && tx <= px + PAL_SIZE && ty >= PALETTE_Y && ty <= PALETTE_Y + PAL_SIZE) {
        if (i === grid[0][0]) { game.audio.play('se_tap', 0.15); return; }
        moves++; floodFill(i); game.audio.play('se_tap', 0.35);
        for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px + PAL_SIZE / 2, y: PALETTE_Y + PAL_SIZE / 2, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.4, col: PALETTE[i] }); }
        if (isAllSame()) { flash = 0.5; flashCol = C.b; finish(true); return; }
        if (moves >= MAX_MOVES) { flash = 0.5; flashCol = C.a; finish(false); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.975, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLOODED!' : 'OUT OF MOVES', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    var movesLeft = MAX_MOVES - moves;
    var moveCol = movesLeft <= 3 ? C.a : movesLeft <= 6 ? C.f : C.b;
    txt('MOVES ' + movesLeft, W / 2, snap(OY + GRID_SIZE * CELL + 64), 54, moveCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(moves + ' / ' + MAX_MOVES, W / 2, 168, 48, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
