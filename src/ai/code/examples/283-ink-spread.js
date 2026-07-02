// 283-ink-spread.js
// インクスプレッド — 四隅から広がる黒インクを吸収ブロックでせき止め、白い領域を守り抜く
// 操作: タップで吸収ブロックを置いてインクの前線を止める
// 成功: 8秒間 白を60%以上キープ  失敗: 白が60%を切る or 時間切れ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、白黒防衛） ──
  var C = { bg:'#04060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ink:'#101020' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'INK SPREAD';
  var HOW_TO_PLAY = 'TAP TO BLOCK THE INK · KEEP WHITE OVER 60%';
  var NEEDED   = 8;           // 修正2: 30 → 8（サバイバル短縮）
  var THRESHOLD = 60, GRIDW = 20, TOP = 260;
  var CELL = Math.floor(W / GRIDW), GRIDH = Math.floor((H * 0.5) / CELL), OY = TOP;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, front, absorbs, spreadTimer, whitePct, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101020');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, OY, GRIDW * CELL, GRIDH * CELL, C.g, 0.85); }

  function initGrid() {
    grid = []; front = [];
    for (var r = 0; r < GRIDH; r++) { grid[r] = []; for (var c = 0; c < GRIDW; c++) grid[r][c] = 0; }
    var starts = [[0, 0], [0, GRIDW - 1], [GRIDH - 1, 0], [GRIDH - 1, GRIDW - 1]];
    for (var s = 0; s < starts.length; s++) { grid[starts[s][0]][starts[s][1]] = 1; front.push({ r: starts[s][0], c: starts[s][1] }); }
  }

  function countWhite() { var w = 0; for (var r = 0; r < GRIDH; r++) for (var c = 0; c < GRIDW; c++) if (grid[r][c] === 0) w++; return Math.round(w / (GRIDH * GRIDW) * 100); }

  function spread() {
    var nf = [], dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (var i = front.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = front[i]; front[i] = front[j]; front[j] = t; }
    var n = Math.min(front.length, 3 + Math.floor((NEEDED - timeLeft) / 2));
    for (var fi = 0; fi < n; fi++) { var cell = front[fi]; for (var d = 0; d < dirs.length; d++) { var nr = cell.r + dirs[d][0], nc = cell.c + dirs[d][1]; if (nr >= 0 && nr < GRIDH && nc >= 0 && nc < GRIDW && grid[nr][nc] === 0) { grid[nr][nc] = 1; nf.push({ r: nr, c: nc }); } } }
    front = front.concat(nf); if (front.length > 160) front = front.slice(front.length - 160);
  }

  function initGame() { initGrid(); absorbs = 12; spreadTimer = 0; whitePct = 100; timeLeft = NEEDED; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (whitePct * 60 + Math.ceil(timeLeft) * 100) : whitePct * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < GRIDH; r++) for (var c = 0; c < GRIDW; c++) { var v = grid[r][c]; if (v === 1) game.draw.rect(c * CELL, OY + r * CELL, CELL, CELL, C.ink, 0.95); else if (v === 2) { game.draw.rect(c * CELL, OY + r * CELL, CELL, CELL, C.b, 0.85); } }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || absorbs <= 0) return;
    var c = Math.floor(x / CELL), r = Math.floor((y - OY) / CELL);
    if (r < 0 || r >= GRIDH || c < 0 || c >= GRIDW) return;
    if (grid[r][c] === 1) { for (var fi = front.length - 1; fi >= 0; fi--) if (front[fi].r === r && front[fi].c === c) front.splice(fi, 1); }
    grid[r][c] = 2; absorbs--; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'DEFENDED!' : 'INKED OUT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('WHITE ' + whitePct + '%', W / 2, H * 0.45, 52, C.c);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      spreadTimer -= dt; if (spreadTimer <= 0) { spread(); spreadTimer = 0.25; whitePct = countWhite(); if (whitePct < THRESHOLD) { finish(false); return; } }
      if (timeLeft <= 0) { whitePct = countWhite(); finish(whitePct >= THRESHOLD); return; }
    }

    // ---- 描画 ----
    background(); drawGrid();
    var col = whitePct >= 70 ? C.b : whitePct >= THRESHOLD ? C.c : C.a;
    game.draw.rect(40, H - 90, W - 80, 24, C.ink, 0.4); game.draw.rect(40, H - 90, snap((W - 80) * whitePct / 100), 24, col, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('WHITE ' + whitePct + '%  BLOCKS ' + absorbs, W / 2, 168, 42, col);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
