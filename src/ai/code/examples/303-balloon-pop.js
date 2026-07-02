// 303-balloon-pop.js
// 風船の連鎖 — せり上がる風船で、隣り合う同色2個以上をタップして一気に弾く連鎖パズル
// 操作: 2個以上つながった同色風船をタップして消す
// 成功: 12個消す  失敗: 風船が天井に達する or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、フェスティバル） ──
  var C = { bg:'#070012', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALLOON POP';
  var HOW_TO_PLAY = 'TAP GROUPS OF 2+ SAME-COLOR BALLOONS';
  var MAX_TIME = 15;
  var NEEDED   = 12;         // 修正2: 120 → 12
  var COLN = 6, ROWN = 9, CELL = snap(W * 0.9 / COLN), OX = snap((W - CELL * COLN) / 2), OY = snap(H * 0.18);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, popped, timeLeft, done, spawnTimer, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(OX, OY, COLN * CELL, CELL * 1.5, C.a, 0.06); game.draw.rect(OX - 8, OY + ROWN * CELL, COLN * CELL + 16, 12, C.d, 0.9); }

  function initGrid() { grid = []; for (var r = 0; r < ROWN; r++) { grid[r] = []; for (var c = 0; c < COLN; c++) grid[r][c] = r >= ROWN - 4 ? Math.floor(Math.random() * COLORS.length) : -1; } }

  function spawnRow() { grid.shift(); var row = []; for (var c = 0; c < COLN; c++) row.push(Math.floor(Math.random() * COLORS.length)); grid.push(row); }

  function getGroup(r, c, col, vis) {
    if (r < 0 || r >= ROWN || c < 0 || c >= COLN) return [];
    if (grid[r][c] !== col) return [];
    var key = r + ',' + c; if (vis[key]) return []; vis[key] = 1;
    return [{ r: r, c: c }].concat(getGroup(r - 1, c, col, vis), getGroup(r + 1, c, col, vis), getGroup(r, c - 1, col, vis), getGroup(r, c + 1, col, vis));
  }

  function initGame() { initGrid(); popped = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 2.0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 300 + Math.ceil(timeLeft) * 100) : popped * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < ROWN; r++) for (var c = 0; c < COLN; c++) {
      if (grid[r][c] < 0) continue;
      var cx = OX + c * CELL + CELL / 2, cy = OY + r * CELL + CELL / 2, wob = Math.floor(game.time.elapsed * 4 + r + c) % 2 ? 3 : -3;
      pc(cx, cy + wob, CELL * 0.4, COLORS[grid[r][c]], 0.9); pc(cx - CELL * 0.12, cy + wob - CELL * 0.12, CELL * 0.1, C.g, 0.5);
      game.draw.rect(snap(cx) - 2, snap(cy + wob + CELL * 0.4), 4, 12, COLORS[grid[r][c]], 0.6);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (c < 0 || c >= COLN || r < 0 || r >= ROWN || grid[r][c] < 0) return;
    var group = getGroup(r, c, grid[r][c], {});
    if (group.length < 2) { game.audio.play('se_failure', 0.2); return; }
    var col = grid[r][c];
    game.audio.play('se_success', Math.min(1, 0.2 + group.length * 0.06));
    for (var gi = 0; gi < group.length; gi++) {
      var gr = group[gi], bx = OX + gr.c * CELL + CELL / 2, by = OY + gr.r * CELL + CELL / 2;
      grid[gr.r][gr.c] = -1; popped++;
      for (var pk = 0; pk < 4; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: COLORS[col] }); }
    }
    if (popped >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.10, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POP MASTER!' : 'CEILING HIT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnRow(); spawnTimer = 2.0; for (var c = 0; c < COLN; c++) if (grid[0][c] >= 0) { finish(false); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
