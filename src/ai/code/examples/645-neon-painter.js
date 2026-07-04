// 645-neon-painter.js
// ネオンペインター — 左右に動くネオンの的をタップで塗りつぶす。全て塗れば成功
// 操作: 的をタップしてペイントショットを当てる。空振りはミス。動きを読んで狙う
// 成功: 5個 塗る  失敗: 3回 空振り or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電飾街／ネオン色は保持） ──
  var C = { bg:'#060010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var NEON_COLORS = ['#ff2079', '#00cfff', '#00ff9f', '#ffe600', '#ff6600', '#7700ff'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON PAINTER';
  var HOW_TO_PLAY = 'TAP THE MOVING NEON TARGETS TO PAINT THEM · NO WASTED SHOTS';
  var MAX_TIME = 18;
  var NUM_TARGETS = 5;       // 修正2: 10 → 5
  var MAX_MISS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, shots, painted, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0014');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    targets = [];
    for (var i = 0; i < NUM_TARGETS; i++) targets.push({ x: W * 0.15 + Math.random() * (W * 0.7), y: snap(H * 0.24) + (i / (NUM_TARGETS - 1)) * H * 0.48, vx: (Math.random() > 0.5 ? 1 : -1) * (150 + Math.random() * 200), r: 58, color: NEON_COLORS[i % NEON_COLORS.length], painted: false, paintAlpha: 0 });
    shots = []; painted = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (painted * 600 + Math.ceil(timeLeft) * 100) : painted * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      if (t.painted) { pc(t.x, t.y, t.r * 1.2, t.color, t.paintAlpha * 0.5); pc(t.x, t.y, t.r, t.color, t.paintAlpha * 0.9); txt('OK', t.x, t.y + 16, 44, C.g); }
      else { pc(t.x, t.y, t.r, '#1a002a', 0.85); var pu = 0.3 + Math.sin(game.time.elapsed * 5 + ti) * 0.15; ring(t.x, t.y, t.r, t.color, pu + 0.3); }
    }
    for (var si = 0; si < shots.length; si++) { var sh = shots[si]; ring(sh.x, sh.y, sh.r * (1 - sh.life * 2) + 4, C.g, sh.life * 2); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shots.push({ x: tx, y: ty, r: 20, life: 0.3 });
    var hit = false;
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti]; if (t.painted) continue;
      var dx = tx - t.x, dy = ty - t.y;
      if (dx * dx + dy * dy < (t.r + 30) * (t.r + 30)) {
        t.painted = true; painted++; flash = 0.2; flashCol = t.color; game.audio.play('se_success', 0.5);
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.5, col: t.color }); }
        hit = true; if (painted >= NUM_TARGETS) { finish(true); return; } break;
      }
    }
    if (!hit) { misses++; flash = 0.2; flashCol = C.a; game.audio.play('se_failure', 0.25); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL PAINTED!' : 'OUT OF PAINT', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti]; if (t.painted) { t.paintAlpha = Math.min(1, t.paintAlpha + dt * 3); continue; } t.x += t.vx * dt; if (t.x < t.r) { t.x = t.r; t.vx = Math.abs(t.vx); } if (t.x > W - t.r) { t.x = W - t.r; t.vx = -Math.abs(t.vx); } }
      for (var si = shots.length - 1; si >= 0; si--) { shots[si].life -= dt * 4; if (shots[si].life <= 0) shots.splice(si, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(painted + ' / ' + NUM_TARGETS, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0014');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
