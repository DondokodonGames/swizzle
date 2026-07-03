// 488-puzzle-slide.js
// スライドパズル — 3x3の数字パネルを空きマスへずらし、1〜8を正しい順に並べる
// 操作: 空きマスに隣接したパネルをタップ（またはスワイプ）して移動
// 成功: 2面 完成  失敗: 30秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電光パズル） ──
  var C = { bg:'#050820', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PUZZLE SLIDE';
  var HOW_TO_PLAY = 'TAP A TILE NEXT TO THE GAP · ARRANGE 1 TO 8';
  var MAX_TIME = 30;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var GRID = 3, CELL = 260;
  var OX = snap((W - GRID * CELL) / 2), OY = snap((H - GRID * CELL) / 2 - 40);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, emptyPos, moves, rounds, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function idx(r, c) { return r * GRID + c; }
  function isGoal() { for (var i = 0; i < GRID * GRID - 1; i++) if (tiles[i] !== i + 1) return false; return tiles[GRID * GRID - 1] === 0; }

  function shuffle() {
    tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0]; emptyPos = { row: 2, col: 2 };
    for (var s = 0; s < 14; s++) {
      var dirs = [];
      if (emptyPos.row > 0) dirs.push('up'); if (emptyPos.row < GRID - 1) dirs.push('down'); if (emptyPos.col > 0) dirs.push('left'); if (emptyPos.col < GRID - 1) dirs.push('right');
      var dir = dirs[Math.floor(Math.random() * dirs.length)];
      var nr = emptyPos.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0), nc = emptyPos.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
      tiles[idx(emptyPos.row, emptyPos.col)] = tiles[idx(nr, nc)]; tiles[idx(nr, nc)] = 0; emptyPos = { row: nr, col: nc };
    }
    if (isGoal()) shuffle();
    moves = 0;
  }

  function initGame() { rounds = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; shuffle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 900 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryMove(row, col) {
    var dr = Math.abs(row - emptyPos.row), dc = Math.abs(col - emptyPos.col);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      tiles[idx(emptyPos.row, emptyPos.col)] = tiles[idx(row, col)]; tiles[idx(row, col)] = 0; emptyPos = { row: row, col: col }; moves++; game.audio.play('se_tap', 0.3);
      if (isGoal()) {
        rounds++; flash = 0.6; flashCol = C.b; game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.8, col: C.c }); }
        if (rounds >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) shuffle(); }, 900);
      }
    }
  }

  function drawBoard() {
    game.draw.rect(OX - 12, OY - 12, GRID * CELL + 24, GRID * CELL + 24, '#0a1030', 0.9);
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var v = tiles[idx(r, c)], cx = OX + c * CELL + CELL / 2, cy = OY + r * CELL + CELL / 2;
      if (v === 0) { game.draw.rect(OX + c * CELL + 8, OY + r * CELL + 8, CELL - 16, CELL - 16, '#030618', 0.9); continue; }
      var correct = v === r * GRID + c + 1;
      game.draw.rect(OX + c * CELL + 8, OY + r * CELL + 8, CELL - 16, CELL - 16, correct ? C.b : C.d, 0.9);
      game.draw.rect(OX + c * CELL + 8, OY + r * CELL + 8, CELL - 16, 12, C.g, 0.25);
      txt(v + '', cx, cy + 36, 120, correct ? C.bg : C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    tryMove(row, col);
  });

  game.onSwipe(function(dir, x1, y1) {
    if (state !== S.PLAYING || done) return;
    var col = Math.floor((x1 - OX) / CELL), row = Math.floor((y1 - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var tr = row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0), tc = col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
    if (tr === emptyPos.row && tc === emptyPos.col) tryMove(row, col);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SOLVED!' : 'JUMBLED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    txt('MOVES ' + moves, W / 2, snap(OY - 40), 44, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
