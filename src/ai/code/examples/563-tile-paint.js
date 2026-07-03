// 563-tile-paint.js
// タイルペイント — 各マスの指定色（薄く表示）に合わせ、ブラシをスワイプ/タップで塗り上げる
// 操作: 上のパレットで色を選び、盤面をスワイプ/タップで塗る。全体の一致率90%で完成
// 成功: 盤面 1面 完成（90%一致）  失敗: 25秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、塗装工房） ──
  var C = { bg:'#1a1a28', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAINT = [C.a, C.e, C.b, C.c, C.d];  // 塗り色は内容そのもの

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE PAINT';
  var HOW_TO_PLAY = 'PICK A COLOR · SWIPE/TAP TO PAINT EACH TILE TO ITS TARGET · 90% WINS';
  var MAX_TIME = 25;
  var COLS = 6, ROWS = 6, CELL = 160, TOTAL = 36;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.30), GRID_H = ROWS * CELL;
  var SEL_Y = snap(H * 0.20), SEL_H = 110;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, target, currentColor, completion, timeLeft, done, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a18');
  }

  function background() { game.draw.clear(C.bg); }

  function initLevel() { grid = []; target = []; for (var i = 0; i < TOTAL; i++) { grid.push(-1); target.push(Math.floor(Math.random() * PAINT.length)); } completion = 0; }

  function getCell(tx, ty) { var c = Math.floor((tx - OX) / CELL), r = Math.floor((ty - OY) / CELL); if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1; return r * COLS + c; }

  function paintCell(idx) { if (idx < 0) return; grid[idx] = currentColor; }

  function calcCompletion() { var n = 0; for (var i = 0; i < grid.length; i++) if (grid[i] === target[i]) n++; return n / TOTAL; }

  function initGame() { currentColor = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; initLevel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (2000 + Math.ceil(timeLeft) * 100) : Math.round(completion * 1000);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ci = 0; ci < PAINT.length; ci++) { var cw = W / PAINT.length, sel = ci === currentColor; game.draw.rect(ci * cw + 4, SEL_Y, cw - 8, SEL_H, PAINT[ci], sel ? 0.95 : 0.5); if (sel) { game.draw.rect(ci * cw + 4, SEL_Y, cw - 8, 8, C.g, 0.8); game.draw.rect(ci * cw + 4, SEL_Y + SEL_H - 8, cw - 8, 8, C.g, 0.8); } }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c, gx = OX + c * CELL, gy = OY + r * CELL;
      game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, PAINT[target[idx]], 0.2);
      if (grid[idx] >= 0) { var ok = grid[idx] === target[idx]; game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, PAINT[grid[idx]], ok ? 0.9 : 0.6); if (ok) game.draw.rect(gx + CELL / 2 - 6, gy + CELL / 2 - 6, 12, 12, C.g, 0.4); }
      else game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#1a1a2e', 0.7);
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (CELL * 0.5)));
    for (var s = 0; s <= steps; s++) paintCell(getCell(x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps));
    game.audio.play('se_tap', 0.1); completion = calcCompletion();
    if (completion >= 0.9) { flash = 0.5; for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID_H / 2, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 0.6, col: PAINT[currentColor] }); } finish(true); }
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (ty >= SEL_Y && ty <= SEL_Y + SEL_H) { var cw = W / PAINT.length, ci = Math.floor(tx / cw); if (ci >= 0 && ci < PAINT.length) { currentColor = ci; game.audio.play('se_tap', 0.3); } return; }
    paintCell(getCell(tx, ty)); completion = calcCompletion(); game.audio.play('se_tap', 0.15);
    if (completion >= 0.9) { flash = 0.5; finish(true); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.09, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.135, 18, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.965, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PAINTED!' : 'TIME UP', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 7, snap(particles[pp2].y) - 7, 14, 14, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    var cw = W * 0.7, cx = (W - cw) / 2, cy = snap(OY + GRID_H + 40);
    game.draw.rect(cx, cy, cw, 24, '#374151', 0.4); game.draw.rect(cx, cy, cw * completion, 24, completion >= 0.9 ? C.b : PAINT[currentColor], 0.9);
    txt(Math.round(completion * 100) + '%', W / 2, cy + 62, 44, C.g);

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
