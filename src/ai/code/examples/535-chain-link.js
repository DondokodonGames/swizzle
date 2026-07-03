// 535-chain-link.js
// チェーンリンク — 隣り合う同色の球を、なぞってつなげて消す。3個以上でまとめて消滅
// 操作: 同色の球を連続タップ/スワイプでつなぐ → 空白タップ or 4個目タップで確定して消す
// 成功: 18個 消去  失敗: 20秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、連鎖回路） ──
  var C = { bg:'#050308', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  // 連結する色はゲーム内容そのもの → 判別しやすいネオン5色
  var COLORS = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN LINK';
  var HOW_TO_PLAY = 'CONNECT 3+ SAME-COLOR ORBS · TAP EMPTY SPACE TO CLEAR';
  var MAX_TIME = 20;
  var NEEDED   = 18;         // 修正2: 80 → 18
  var COLS = 5, ROWS = 7, CELL = 176;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.15);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, chain, chainColor, cleared, timeLeft, done, particles, flash, flashCol, isChaining;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0814');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, '#0a0614', 0.9); }

  function initGrid() { grid = []; for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = Math.floor(Math.random() * COLORS.length); } }

  function initGame() { chain = []; chainColor = -1; cleared = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; isChaining = false; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 300 + Math.ceil(timeLeft) * 100) : cleared * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function isInChain(col, row) { for (var i = 0; i < chain.length; i++) if (chain[i].col === col && chain[i].row === row) return true; return false; }

  function touchCell(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS || grid[row][col] === -1) return;
    var color = grid[row][col];
    if (!isChaining) { isChaining = true; chainColor = color; chain = [{ col: col, row: row }]; game.audio.play('se_tap', 0.2); return; }
    if (color !== chainColor || isInChain(col, row)) return;
    var last = chain[chain.length - 1];
    if (Math.abs(col - last.col) + Math.abs(row - last.row) !== 1) return;
    chain.push({ col: col, row: row }); game.audio.play('se_tap', 0.15);
  }

  function commitChain() {
    if (chain.length >= 3) {
      cleared += chain.length; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.6);
      for (var ci = 0; ci < chain.length; ci++) { var cc = chain[ci], cx = OX + cc.col * CELL + CELL / 2, cy = OY + cc.row * CELL + CELL / 2; for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.4, col: COLORS[chainColor] }); } grid[cc.row][cc.col] = -1; }
      for (var col = 0; col < COLS; col++) { var wr = ROWS - 1; for (var row = ROWS - 1; row >= 0; row--) if (grid[row][col] !== -1) { grid[wr][col] = grid[row][col]; if (wr !== row) grid[row][col] = -1; wr--; } for (var r = wr; r >= 0; r--) grid[r][col] = Math.floor(Math.random() * COLORS.length); }
      if (cleared >= NEEDED) { finish(true); return; }
    } else if (chain.length > 0) game.audio.play('se_failure', 0.2);
    chain = []; chainColor = -1; isChaining = false;
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) { if (!isChaining) touchCell(col, row); else { touchCell(col, row); commitChain(); } }
    else commitChain();
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    touchCell(Math.floor((x1 - OX) / CELL), Math.floor((y1 - OY) / CELL));
    touchCell(Math.floor((x2 - OX) / CELL), Math.floor((y2 - OY) / CELL));
    if (chain.length >= 3) commitChain();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background();
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { if (grid[r][c] === -1) continue; pc(OX + c * CELL + CELL / 2, OY + r * CELL + CELL / 2, CELL * 0.36, COLORS[grid[r][c]], 0.9); }
      txt(GAME_TITLE, W / 2, H * 0.09, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.125, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.965, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN CLEAR!' : 'TIME UP', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
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
    background();
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      if (grid[r2][c2] === -1) continue;
      var cx = OX + c2 * CELL + CELL / 2, cy = OY + r2 * CELL + CELL / 2, inC = isInChain(c2, r2), idx = -1;
      for (var ci2 = 0; ci2 < chain.length; ci2++) if (chain[ci2].col === c2 && chain[ci2].row === r2) idx = ci2;
      pc(cx, cy, CELL * 0.36 + (inC ? 8 : 0), COLORS[grid[r2][c2]], 0.9);
      pc(cx - CELL * 0.1, cy - CELL * 0.1, CELL * 0.1, C.g, inC ? 0.5 : 0.25);
      if (inC) { pc(cx, cy, CELL * 0.44, COLORS[grid[r2][c2]], 0.3); txt((idx + 1) + '', cx, cy + 14, 40, C.g); }
    }
    for (var li = 1; li < chain.length; li++) { var p1 = chain[li - 1], p2 = chain[li]; game.draw.line(OX + p1.col * CELL + CELL / 2, OY + p1.row * CELL + CELL / 2, OX + p2.col * CELL + CELL / 2, OY + p2.row * CELL + CELL / 2, COLORS[chainColor], 12); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    if (chain.length > 0) txt(chain.length >= 3 ? 'CLEAR ' + chain.length + '!' : chain.length + ' (NEED 3+)', W / 2, snap(OY + ROWS * CELL + 56), 40, chain.length >= 3 ? C.b : C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
