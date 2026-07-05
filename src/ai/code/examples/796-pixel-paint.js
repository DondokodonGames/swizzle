// 796-pixel-paint.js
// ピクセルペイント — 指定された色のマスだけを素早くタップして塗れ
// 操作: タップ — お手本の色に一致するマスだけを塗る（違う色はペナルティ）
// 成功: 12マス 塗る  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、色見本は保持） ──
  var C = { bg:'#040408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GRID_C = '#0a0a14';
  var PALETTE = ['#ff3355', '#00cfff', '#ffe600', '#a066ff', '#00ff41', '#ff6600'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'TAP ONLY THE CELLS THAT MATCH THE TARGET COLOR · WRONG CELLS COST YOU';
  var MAX_TIME = 24;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var COLS = 5, ROWS = 6, CELL = Math.floor((W - 80) / COLS), START_X = snap((W - COLS * CELL) / 2), START_Y = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetColor, cells, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pcross(cx, cy, r, color, alpha) { cx = snap(cx); cy = snap(cy); for (var i = -r; i <= r; i += 8) { game.draw.rect(cx + i - 4, cy + i - 4, 10, 10, color, alpha); game.draw.rect(cx + i - 4, cy - i - 4, 10, 10, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#04040a');
  }

  function background() { game.draw.clear(C.bg); }

  function newGrid() {
    targetColor = Math.floor(Math.random() * PALETTE.length); cells = [];
    for (var i = 0; i < COLS * ROWS; i++) {
      var col;
      if (Math.random() < 0.4) col = targetColor; else { do { col = Math.floor(Math.random() * PALETTE.length); } while (col === targetColor); }
      cells.push({ colorIdx: col, painted: false, flashTimer: 0, correct: false });
    }
  }

  function getCellAt(tx, ty) { var col = Math.floor((tx - START_X) / CELL), row = Math.floor((ty - START_Y) / CELL); if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1; return row * COLS + col; }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 130) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(snap(W * 0.12), snap(H * 0.11), snap(W * 0.76), snap(H * 0.09), GRID_C, 0.9);
    pc(W * 0.3, snap(H * 0.155), 32, PALETTE[targetColor], 0.95); txt('PAINT THIS', W * 0.6, snap(H * 0.155), 40, PALETTE[targetColor]);
    for (var ci = 0; ci < cells.length; ci++) {
      var cell = cells[ci], col2 = ci % COLS, row2 = Math.floor(ci / COLS), cx2 = START_X + col2 * CELL, cy2 = START_Y + row2 * CELL;
      var bgCol = cell.painted ? (cell.correct ? PALETTE[targetColor] : C.a) : GRID_C;
      game.draw.rect(cx2 + 3, cy2 + 3, CELL - 6, CELL - 6, bgCol, cell.painted ? 0.9 : 0.85);
      if (!cell.painted) pc(cx2 + CELL / 2, cy2 + CELL / 2, CELL * 0.3, PALETTE[cell.colorIdx], 0.8);
      if (cell.flashTimer > 0) game.draw.rect(cx2 + 3, cy2 + 3, CELL - 6, CELL - 6, C.g, cell.flashTimer * 0.3);
      if (cell.painted && !cell.correct) pcross(cx2 + CELL / 2, cy2 + CELL / 2, CELL * 0.22, C.g, 0.9);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var idx = getCellAt(tx, ty); if (idx < 0) return;
    var cell = cells[idx]; if (cell.painted) return;
    cell.painted = true; cell.flashTimer = 0.4;
    if (cell.colorIdx === targetColor) {
      score++; cell.correct = true; flash = 0.14; flashCol = C.b; resultText = 'PAINT!'; resultTimer = 0.25; game.audio.play('se_tap', 0.07);
      var cx = START_X + (idx % COLS) * CELL + CELL / 2, cy = START_Y + Math.floor(idx / COLS) * CELL + CELL / 2;
      for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 100, life: 0.3, col: PALETTE[targetColor] }); }
      if (score >= NEEDED) { finish(true); return; }
      var allPainted = true; for (var i = 0; i < cells.length; i++) if (cells[i].colorIdx === targetColor && !cells[i].painted) { allPainted = false; break; }
      if (allPainted) setTimeout(function() { if (!done && state === S.PLAYING) newGrid(); }, 400);
    } else {
      cell.correct = false; errors++; flash = 0.28; flashCol = C.a; resultText = 'WRONG COLOR!'; resultTimer = 0.35; game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cells) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.055, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.09, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PIXEL ARTIST!' : 'OFF PALETTE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < cells.length; i++) if (cells[i].flashTimer > 0) cells[i].flashTimer -= dt * 3;
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 4, snap(p2.y) - 4, 8, 8, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#04040a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
