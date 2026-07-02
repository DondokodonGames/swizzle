// 409-ramp-jump.js
// スロープジャンプ — 助走して近づき、ランプの先端でタイミングよくタップして遠くまで飛ぶ
// 操作: ランプ端（NOW!表示）でタップしてジャンプ。合計飛距離を稼ぐ
// 成功: 合計1200m 飛ぶ  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、スキージャンプ台） ──
  var C = { bg:'#020c14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RAMP JUMP';
  var HOW_TO_PLAY = 'TAP AT THE RAMP EDGE (NOW!) TO LAUNCH FAR';
  var MAX_TIME = 15;
  var GOAL = 1200;           // 修正2: 5000m → 1200m
  var RAMP_X = snap(W * 0.12), RAMP_Y = snap(H * 0.72), RAMP_W = 280, RAMP_ANG = -Math.PI / 4, APPROACH = 380, GROUND_Y = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var iphase, px, py, pvx, pvy, jumped, totalDist, landingDist, trail, timeLeft, done, particles, landFlash, clouds;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function distBar() {
    var t = Math.ceil(Math.min(1, totalDist / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a24');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, GROUND_Y, '#0c1a2e', 0.6);
    for (var ci = 0; ci < clouds.length; ci++) { var cl = clouds[ci]; pc(cl.x, cl.y, cl.w * 0.3, '#1a3050', 0.4); pc(cl.x + cl.w * 0.2, cl.y + 8, cl.w * 0.24, '#1a3050', 0.3); }
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#123a55', 0.9); game.draw.rect(0, GROUND_Y, W, 12, C.e, 0.4);
  }

  function rampEndX() { return RAMP_X + RAMP_W; }
  function rampEndY() { return RAMP_Y - Math.tan(-RAMP_ANG) * RAMP_W; }

  function initClouds() { clouds = []; for (var i = 0; i < 5; i++) clouds.push({ x: snap(Math.random() * W), y: snap(H * 0.08 + Math.random() * H * 0.15), w: 100 + Math.random() * 140 }); }

  function resetApproach() { iphase = 'approach'; px = -60; py = RAMP_Y; pvx = APPROACH; pvy = 0; jumped = false; trail = []; }

  function initGame() { totalDist = 0; landingDist = 0; timeLeft = MAX_TIME; done = false; particles = []; landFlash = 0; resetApproach(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (totalDist + Math.ceil(timeLeft) * 100) : totalDist;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var rex = rampEndX(), rey = rampEndY();
    pline(RAMP_X, RAMP_Y, rex, rey, C.f, 0.9, 14); pline(RAMP_X, RAMP_Y, RAMP_X, GROUND_Y, C.f, 0.9, 10); pline(rex, RAMP_Y, RAMP_X, RAMP_Y, C.f, 0.9, 10);
    for (var ti = 0; ti < trail.length; ti++) if (trail[ti].life > 0) pc(trail[ti].x, trail[ti].y, 12 * trail[ti].life, C.c, trail[ti].life * 0.5);
    if (px > -40 && px < W + 200) { pc(px, py, 24, C.f, 0.9); pc(px - 6, py - 6, 8, C.g, 0.7); }
    if (iphase === 'approach' && px > RAMP_X - 80) { var prog = Math.max(0, 1 - Math.abs(px - rampEndX()) / 200); pc(rampEndX(), rampEndY(), 24 + prog * 24, prog > 0.6 ? C.c : C.f, prog * 0.5); if (prog > 0.5) txt('NOW!', rampEndX(), rampEndY() - 56, 52, C.c); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'approach' || jumped) return;
    jumped = true; var dist = Math.abs(px - rampEndX()), power = Math.max(0, 1 - dist / 200), ang = RAMP_ANG - Math.PI / 4 * power, sp = 600 + power * 500;
    pvx = Math.cos(ang) * sp; pvy = Math.sin(ang) * sp; iphase = 'airborne'; game.audio.play('se_tap', 0.5);
    for (var k = 0; k < 8; k++) { var a = ang - Math.PI / 4 + Math.random() * Math.PI / 2; particles.push({ x: px, y: py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    for (var ci = 0; ci < (clouds ? clouds.length : 0); ci++) { clouds[ci].x -= 20 * dt; if (clouds[ci].x < -200) clouds[ci].x = W + 200; }
    if (state === S.ATTRACT) {
      if (!clouds) { initClouds(); initGame(); } background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.44, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.50, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BIG AIR!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (landFlash > 0) landFlash -= dt * 2;
      if (iphase === 'approach') {
        px += APPROACH * dt;
        if (px > RAMP_X && px < rampEndX()) py = RAMP_Y - Math.tan(-RAMP_ANG) * (px - RAMP_X); else py = RAMP_Y;
        if (px > rampEndX() + 100 && !jumped) { jumped = true; pvx = APPROACH; pvy = -100; iphase = 'airborne'; }
      } else if (iphase === 'airborne') {
        trail.push({ x: px, y: py, life: 0.8 }); if (trail.length > 24) trail.shift(); for (var ti = trail.length - 1; ti >= 0; ti--) trail[ti].life -= dt * 2;
        pvy += 700 * dt; pvx *= (1 - 0.3 * dt); px += pvx * dt; py += pvy * dt;
        if (py >= GROUND_Y) { py = GROUND_Y; landingDist = Math.round(Math.max(0, px - rampEndX()) * 0.6); totalDist += landingDist; landFlash = 0.6; game.audio.play('se_success', Math.min(0.8, landingDist / 400)); for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: px, y: GROUND_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 200, life: 0.6, col: C.b }); } if (totalDist >= GOAL) { finish(true); return; } iphase = 'landed'; setTimeout(function() { if (!done && state === S.PLAYING) resetApproach(); }, 1000); }
        if (px > W * 2) { iphase = 'landed'; setTimeout(function() { if (!done && state === S.PLAYING) resetApproach(); }, 1000); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (landFlash > 0) { game.draw.rect(0, 0, W, H, C.e, landFlash * 0.1); txt(landingDist + 'm!', W / 2, H * 0.45, 80, C.c); }

    distBar();
    txt(totalDist + 'm', W / 2, 96, 44, C.c);
    txt(totalDist + ' / ' + GOAL + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initClouds();
    initGame();
  });
})(game);
