// 556-forest-fire.js
// フォレストファイア — 燃え広がる山火事を、タップで放水して消し止め、森を守り抜く
// 操作: タップした場所（3x3）に放水して延焼を消火。制限時間まで森林を一定以上残せば成功
// 成功: 12秒 経過時に森林 30%以上  失敗: 森林が 20%未満に

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、防災司令室） ──
  var C = { bg:'#0a1a08', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FOREST FIRE';
  var HOW_TO_PLAY = 'TAP TO SPRAY WATER (3x3) · KEEP THE FOREST FROM BURNING DOWN';
  var MAX_TIME = 12;
  var SUCCESS_PCT = 30, FAIL_PCT = 20;
  var COLS = 12, ROWS = 15, CELL = Math.floor(W / 12), OY = snap(H * 0.16), GRID_H = 15 * Math.floor(W / 12);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, treeCount, initialTrees, timeLeft, done, particles, flash, nextSpread, waterAnims;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a08');
  }

  function background() { game.draw.clear('#0a1428'); game.draw.rect(0, OY, W, GRID_H, C.bg, 0.9); }

  function idx(c, r) { return r * COLS + c; }

  function initGrid() {
    grid = []; treeCount = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var isTree = Math.random() < 0.75; grid.push(isTree ? 1 : 0); if (isTree) treeCount++; }
    initialTrees = treeCount;
    for (var fi = 0; fi < 3; fi++) { var i; do { i = Math.floor(Math.random() * grid.length); } while (grid[i] !== 1); grid[i] = 2; treeCount--; }
  }

  function spreadFire() {
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]], nf = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (grid[idx(c, r)] !== 2) continue;
      for (var di = 0; di < dirs.length; di++) { var nc = c + dirs[di][0], nr = r + dirs[di][1]; if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue; var ni = idx(nc, nr); if (grid[ni] === 1 && Math.random() < 0.22) nf.push(ni); }
      if (Math.random() < 0.08) nf.push(-idx(c, r) - 1);
    }
    for (var n = 0; n < nf.length; n++) { if (nf[n] < 0) { var ai = -nf[n] - 1; if (grid[ai] === 2) grid[ai] = 3; } else if (grid[nf[n]] === 1) { grid[nf[n]] = 2; treeCount--; } }
    for (var wi = 0; wi < grid.length; wi++) if (grid[wi] === 4 && Math.random() < 0.05) grid[wi] = 1;
  }

  function initGame() { timeLeft = MAX_TIME; done = false; particles = []; flash = 0; nextSpread = 0.4; waterAnims = []; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var pct = Math.round(treeCount / initialTrees * 100);
    finalScore = success ? (pct * 200 + Math.round(MAX_TIME) * 100) : pct * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var v = grid[idx(c, r)], gx = c * CELL, gy = OY + r * CELL;
      if (v === 1) { game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.d, 0.9); pc(gx + CELL / 2, gy + CELL / 2, CELL * 0.28, C.b, 0.5); }
      else if (v === 2) { game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.a, 0.9); game.draw.rect(gx + 6, gy + 6, CELL - 12, CELL - 12, C.f, 0.7); if (Math.sin(game.time.elapsed * 8 + c * 0.7 + r * 0.9) > 0) pc(gx + CELL / 2, gy + CELL / 2, CELL * 0.32, C.c, 0.5); }
      else if (v === 3) game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, '#222222', 0.8);
      else if (v === 4) { game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.e, 0.4); pc(gx + CELL / 2, gy + CELL / 2, CELL * 0.22, C.e, 0.5); }
    }
    for (var wi = 0; wi < waterAnims.length; wi++) { var wa = waterAnims[wi]; pc(wa.x, wa.y, 90 * wa.t, C.e, wa.t * 0.3); pc(wa.x, wa.y, 54 * wa.t, C.g, wa.t * 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor(tx / CELL), r = Math.floor((ty - OY) / CELL); if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) { var nc = c + dc, nr = r + dr; if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue; var ni = idx(nc, nr); if (grid[ni] === 2) { grid[ni] = 4; treeCount++; } else if (grid[ni] === 1) grid[ni] = 4; }
    game.audio.play('se_tap', 0.4); waterAnims.push({ x: tx, y: ty, t: 0.4 });
    for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 60, life: 0.4, col: C.e }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.075, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FOREST SAVED!' : 'BURNED DOWN', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { var pctT = Math.round(treeCount / initialTrees * 100); finish(pctT >= SUCCESS_PCT); return; }
      if (flash > 0) flash -= dt * 3;
      nextSpread -= dt; if (nextSpread <= 0) { spreadFire(); nextSpread = 0.35; if (Math.round(treeCount / initialTrees * 100) < FAIL_PCT) { flash = 0.8; finish(false); return; } }
      for (var wai = waterAnims.length - 1; wai >= 0; wai--) { waterAnims[wai].t -= dt * 2.5; if (waterAnims[wai].t <= 0) waterAnims.splice(wai, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    var pct = Math.round(treeCount / initialTrees * 100), pctCol = pct >= 50 ? C.b : pct >= SUCCESS_PCT ? C.c : C.a;
    txt('FOREST ' + pct + '%', W / 2, snap(OY + GRID_H + 60), 48, pctCol);
    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
