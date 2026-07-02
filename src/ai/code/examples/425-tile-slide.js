// 425-tile-slide.js
// タイルスライド — 3×3の数字パズル。空きマスへタイルをずらして1〜8を順番どおりに並べる15パズル
// 操作: 空きマスに隣接するタイルをタップしてスライド
// 成功: パズルを完成させる  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パズル盤） ──
  var C = { bg:'#0a0618', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE SLIDE';
  var HOW_TO_PLAY = 'SLIDE TILES INTO THE GAP · ORDER THEM 1-8';
  var MAX_TIME = 30;
  var SIZE = 3, TW = snap(W * 0.26), GAP = 12;
  var BW = SIZE * TW + (SIZE - 1) * GAP, BX = snap((W - BW) / 2), BY = snap((H - BW) / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, emptyIdx, moves, timeLeft, done, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function neighbors(idx) { var r = Math.floor(idx / SIZE), c = idx % SIZE, nb = []; if (r > 0) nb.push(idx - SIZE); if (r < SIZE - 1) nb.push(idx + SIZE); if (c > 0) nb.push(idx - 1); if (c < SIZE - 1) nb.push(idx + 1); return nb; }

  function initPuzzle() {
    grid = [1, 2, 3, 4, 5, 6, 7, 8, 0]; emptyIdx = 8;
    for (var i = 0; i < 14; i++) { var nb = neighbors(emptyIdx), n = nb[Math.floor(Math.random() * nb.length)]; grid[emptyIdx] = grid[n]; grid[n] = 0; emptyIdx = n; }
  }

  function isSolved() { for (var i = 0; i < 8; i++) if (grid[i] !== i + 1) return false; return grid[8] === 0; }

  function initGame() { moves = 0; timeLeft = MAX_TIME; done = false; flash = 0; initPuzzle(); if (isSolved()) initPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (2000 + Math.ceil(timeLeft) * 100 + Math.max(0, 60 - moves) * 50) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(BX - 12, BY - 12, BW + 24, BW + 24, C.d, 0.4);
    for (var ti = 0; ti < 9; ti++) { var r = Math.floor(ti / SIZE), c = ti % SIZE, x = BX + c * (TW + GAP), y = BY + r * (TW + GAP); if (grid[ti] === 0) { game.draw.rect(x, y, TW, TW, '#0f0c2e', 0.7); continue; } var ok = grid[ti] === ti + 1; game.draw.rect(x, y, TW, TW, ok ? C.b : C.d, 0.85); game.draw.rect(x, y, TW, TW / 4, C.g, 0.1); txt(grid[ti] + '', x + TW / 2, y + TW / 2 + 24, 90, ok ? '#000' : C.g); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - BX) / (TW + GAP)), r = Math.floor((y - BY) / (TW + GAP)); if (c < 0 || c >= SIZE || r < 0 || r >= SIZE) return;
    var idx = r * SIZE + c; if (grid[idx] === 0) return;
    if (neighbors(idx).indexOf(emptyIdx) < 0) return;
    grid[emptyIdx] = grid[idx]; grid[idx] = 0; emptyIdx = idx; moves++; game.audio.play('se_tap', 0.25);
    if (isSolved()) { flash = 0.8; game.audio.play('se_success', 0.7); finish(true); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
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
      txt(resultSuccess ? 'SOLVED!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
    }

    // ---- 描画 ----
    background(); drawBoard();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + moves, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
