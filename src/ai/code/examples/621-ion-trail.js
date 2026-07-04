// 621-ion-trail.js
// イオントレイル — スワイプでイオンの通り道を描き、タップで発射して全ゴールを通す
// 操作: 発生源からスワイプで格子上に経路を描く → タップでイオン発射。全ゴール通過で成功
// 成功: 4ステージ クリア  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、粒子回路） ──
  var C = { bg:'#010208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ION TRAIL';
  var HOW_TO_PLAY = 'SWIPE FROM THE SOURCE TO DRAW A PATH · TAP TO FIRE THE ION THROUGH ALL GOALS';
  var MAX_TIME = 25;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var PLAY_OX = 40, PLAY_OY = snap(H * 0.22), CELL = 128;
  var PLAY_W = W - 80, PLAY_H = snap(H * 0.52);
  var COLS = Math.floor(PLAY_W / CELL), ROWS = Math.floor(PLAY_H / CELL);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stage, trailPath, ion, goals, source, ionProgress, done, timeLeft, particles, flash, flashCol, successes, ionRunning, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05050f');
  }

  function background() { game.draw.clear(C.bg); }

  function cellXY(c, r) { return { x: PLAY_OX + c * CELL + CELL / 2, y: PLAY_OY + r * CELL + CELL / 2 }; }

  function loadStage() {
    trailPath = []; ionRunning = false; ionProgress = 0; ion = null;
    source = { c: Math.floor(Math.random() * COLS), r: ROWS - 1 }; var sp = cellXY(source.c, source.r); source.x = sp.x; source.y = sp.y;
    var goalCount = 1 + Math.min(2, Math.floor(stage / 2)); goals = [];
    for (var i = 0; i < goalCount; i++) {
      var gc, gr;
      do { gc = Math.floor(Math.random() * COLS); gr = Math.floor(Math.random() * (ROWS - 1)); } while (goals.some(function(g) { return g.c === gc && g.r === gr; }) || (gc === source.c && gr === source.r));
      var gp = cellXY(gc, gr); goals.push({ c: gc, r: gr, x: gp.x, y: gp.y, reached: false, phase: Math.random() * Math.PI * 2 });
    }
  }

  function initGame() { stage = 0; successes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; loadStage(); }

  function launchIon() { if (trailPath.length < 2) return; ionRunning = true; ionProgress = 0; ion = { x: trailPath[0].x, y: trailPath[0].y }; game.audio.play('se_tap', 0.25); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 900 + Math.ceil(timeLeft) * 120) : successes * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r <= ROWS; r++) game.draw.rect(PLAY_OX, snap(PLAY_OY + r * CELL) - 1, COLS * CELL, 2, '#1a2a3a', 0.9);
    for (var c = 0; c <= COLS; c++) game.draw.rect(snap(PLAY_OX + c * CELL) - 1, PLAY_OY, 2, ROWS * CELL, '#1a2a3a', 0.9);
    for (var ti = 0; ti < trailPath.length - 1; ti++) { var a = trailPath[ti], b = trailPath[ti + 1], drawn = ionRunning ? ti < Math.floor(ionProgress) : true; game.draw.line(a.x, a.y, b.x, b.y, C.e, drawn ? 8 : 4); }
    for (var gi = 0; gi < goals.length; gi++) { var g = goals[gi], pu = 1 + Math.sin(g.phase) * 0.15, col = g.reached ? C.b : C.b; ring(g.x, g.y, CELL * 0.28 * pu, col, g.reached ? 0.9 : 0.5); if (g.reached) pc(g.x, g.y, CELL * 0.12, C.g, 0.7); }
    pc(source.x, source.y, CELL * 0.2, C.d, 0.9); pc(source.x, source.y, CELL * 0.1, C.g, 0.5);
    if (ion) { pc(ion.x, ion.y, 16, C.f, 0.9); pc(ion.x, ion.y, 24, C.c, 0.3); }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || ionRunning) return;
    var steps = 15;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
      var gc = Math.max(0, Math.min(COLS - 1, Math.round((px - PLAY_OX - CELL / 2) / CELL))), gr = Math.max(0, Math.min(ROWS - 1, Math.round((py - PLAY_OY - CELL / 2) / CELL)));
      var cp = cellXY(gc, gr), last = trailPath[trailPath.length - 1];
      if (!last || last.c !== gc || last.r !== gr) {
        if (trailPath.length === 0 && (Math.abs(gc - source.c) + Math.abs(gr - source.r)) > 1) continue;
        trailPath.push({ x: cp.x, y: cp.y, c: gc, r: gr });
      }
    }
    game.audio.play('se_tap', 0.05);
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!ionRunning && trailPath.length >= 2) launchIon(); else if (!ionRunning) trailPath = [];
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!trailPath) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CIRCUIT DONE!' : 'TIME UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var gi = 0; gi < goals.length; gi++) goals[gi].phase += dt * 2;
      if (ionRunning && trailPath.length >= 2) {
        ionProgress += (4.5 + stage * 0.3) * dt;
        var segIdx = Math.floor(ionProgress);
        if (segIdx >= trailPath.length - 1) {
          ionRunning = false; ion = null;
          if (goals.every(function(g) { return g.reached; })) {
            successes++; flash = 0.35; flashCol = C.b; resultText = 'CLEAR!'; resultTimer = 0.8; game.audio.play('se_success', 0.7);
            for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); }
            if (successes >= NEEDED) { finish(true); return; }
            stage++; setTimeout(function() { if (!done) loadStage(); }, 1000);
          } else { resultText = 'RETRY!'; resultTimer = 0.6; flash = 0.2; flashCol = C.a; trailPath = []; }
        } else {
          var frac = ionProgress - segIdx, a = trailPath[segIdx], b = trailPath[segIdx + 1]; ion = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
          for (var gi2 = 0; gi2 < goals.length; gi2++) { if (goals[gi2].reached) continue; var dx = ion.x - goals[gi2].x, dy = ion.y - goals[gi2].y; if (dx * dx + dy * dy < (CELL * 0.5) * (CELL * 0.5)) { goals[gi2].reached = true; game.audio.play('se_success', 0.5); for (var p2 = 0; p2 < 6; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: goals[gi2].x, y: goals[gi2].y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.4, col: C.b }); } } }
          if (Math.random() < 0.4) particles.push({ x: ion.x, y: ion.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, col: C.e });
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 3; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, flashCol);
    else if (!ionRunning) txt(trailPath.length > 1 ? 'TAP TO FIRE' : 'SWIPE TO DRAW A PATH', W / 2, snap(H * 0.90), 34, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
