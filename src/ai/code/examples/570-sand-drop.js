// 570-sand-drop.js
// サンドドロップ — 各カラムにタップで砂を落として積み上げ、緑のターゲットラインを越えさせる
// 操作: カラムをタップして砂を投下（スワイプで複数カラムにまとめて撒ける）
// 成功: 3列 でラインを越える  失敗: 18秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砂時計台） ──
  var C = { bg:'#0a0806', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND DROP';
  var HOW_TO_PLAY = 'TAP A COLUMN TO POUR SAND · RAISE 3 COLUMNS OVER THE GREEN LINE';
  var MAX_TIME = 18;
  var NUM_COLS = 5, NEEDED_COLS = 3;   // 修正2: 5 → 3
  var COL_W = 140, COL_GAP = (W - NUM_COLS * COL_W) / (NUM_COLS + 1);
  var COL_H = snap(H * 0.52), COL_Y = snap(H * 0.30), TARGET_H = Math.floor(COL_H * 0.6), MAX_SAND = Math.floor(COL_H / 8);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var columns, colComplete, filledCols, timeLeft, done, particles, dropping, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1c1410');
  }

  function background() { game.draw.clear(C.bg); }

  function colX(i) { return COL_GAP + i * (COL_W + COL_GAP) + COL_W / 2; }

  function dropSand(idx) { if (idx < 0 || idx >= NUM_COLS || columns[idx] >= MAX_SAND) return; dropping.push({ col: idx, x: colX(idx) + (Math.random() - 0.5) * 30, y: COL_Y - 40, vy: 100, r: 10 }); game.audio.play('se_tap', 0.15); }

  function initGame() { columns = []; colComplete = []; for (var i = 0; i < NUM_COLS; i++) { columns.push(0); colComplete.push(false); } filledCols = 0; timeLeft = MAX_TIME; done = false; particles = []; dropping = []; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (filledCols * 1200 + Math.ceil(timeLeft) * 100) : filledCols * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < NUM_COLS; i++) {
      var cx = colX(i) - COL_W / 2;
      game.draw.rect(cx, COL_Y, COL_W, COL_H, '#1c1410', 0.95); game.draw.rect(cx, COL_Y, 8, COL_H, '#3a2810', 0.9); game.draw.rect(cx + COL_W - 8, COL_Y, 8, COL_H, '#3a2810', 0.9);
      var ty = COL_Y + COL_H - TARGET_H; game.draw.rect(cx, ty - 2, COL_W, 4, C.b, 0.9); game.draw.rect(cx, ty - 8, COL_W, 8, C.b, 0.15);
      var sh = columns[i] * 8; if (sh > 0) { var sy = COL_Y + COL_H - sh; game.draw.rect(cx + 4, sy, COL_W - 8, sh, '#92400e', 0.9); game.draw.rect(cx + 4, sy, COL_W - 8, Math.min(16, sh), C.f, 0.7); if (sh > 4) game.draw.rect(cx + 4, sy, COL_W - 8, 6, C.c, 0.5); }
      if (colComplete[i]) { game.draw.rect(cx + 4, COL_Y, COL_W - 8, 28, C.b, 0.4); txt('OK', colX(i), COL_Y + 22, 26, C.b); }
      var pct = Math.min(100, Math.round(columns[i] * 8 / TARGET_H * 100)); txt(pct + '%', colX(i), COL_Y + COL_H + 40, 30, pct >= 100 ? C.b : C.g);
    }
    for (var di = 0; di < dropping.length; di++) { var d = dropping[di]; pc(d.x, d.y, d.r, C.f, 0.9); pc(d.x - 3, d.y - 3, d.r * 0.3, C.c, 0.5); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < NUM_COLS; i++) if (Math.abs(tx - colX(i)) < COL_W * 0.6) { dropSand(i); dropSand(i); dropSand(i); return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var c1 = Math.floor((x1 - COL_GAP * 0.5) / (COL_W + COL_GAP)), c2 = Math.floor((x2 - COL_GAP * 0.5) / (COL_W + COL_GAP));
    for (var ci = Math.max(0, Math.min(c1, c2)); ci <= Math.min(NUM_COLS - 1, Math.max(c1, c2)); ci++) { dropSand(ci); dropSand(ci); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!columns) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.965, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FILLED UP!' : 'TIME UP', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
      for (var di = dropping.length - 1; di >= 0; di--) {
        var d = dropping[di]; d.vy += 800 * dt; d.y += d.vy * dt; d.x += (Math.random() - 0.5) * 20 * dt;
        var landY = COL_Y + COL_H - columns[d.col] * 8;
        if (d.y >= landY - d.r) {
          columns[d.col] = Math.min(MAX_SAND, columns[d.col] + 1);
          if (!colComplete[d.col] && columns[d.col] * 8 >= TARGET_H) { colComplete[d.col] = true; filledCols++; game.audio.play('se_success', 0.7); flash = 0.3; for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: colX(d.col), y: COL_Y + COL_H - TARGET_H, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.b }); } if (filledCols >= NEEDED_COLS) { finish(true); return; } }
          dropping.splice(di, 1);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(filledCols + ' / ' + NEEDED_COLS + ' COLS', W / 2, 168, 46, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
