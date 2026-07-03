// 446-space-gravity.js
// 宇宙重力 — 惑星の重力で探査機の軌道が曲がる。それを見越して発射し、光る目標にヒットさせる
// 操作: 目標のいる方向をタップして探査機を発射（惑星に落ちると失敗）
// 成功: 目標3個 捕捉  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、宇宙） ──
  var C = { bg:'#000814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPACE GRAVITY';
  var HOW_TO_PLAY = 'TAP TO LAUNCH · GRAVITY CURVES THE PROBE · HIT THE STAR';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var PX = snap(W / 2), PY = snap(H / 2), PLANET_R = 96, MASS = 80000, LAUNCH_Y = snap(H * 0.88);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var probe, probeTrail, target, stars, caught, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#081428');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 2 + si) * 0.3); }

  function initStars() { stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function spawnTarget() { var ang = Math.random() * Math.PI * 2, dist = 280 + Math.random() * 160; target = { x: snap(PX + Math.cos(ang) * dist), y: snap(PY + Math.sin(ang) * dist), pulse: 0 }; }

  function initGame() { probe = null; probeTrail = []; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 700 + Math.ceil(timeLeft) * 100) : caught * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function fail() { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4); probe = null; probeTrail = []; if (misses >= MAX_MISS) { finish(false); return true; } return false; }

  function drawScene() {
    pc(PX, PY, PLANET_R, C.d, 0.9); pc(PX - PLANET_R * 0.3, PY - PLANET_R * 0.3, PLANET_R * 0.25, C.e, 0.3); ring(PX, PY, PLANET_R + 20, C.d, 0.2);
    if (target) { ring(target.x, target.y, 40 + Math.sin(target.pulse) * 10, C.c, 0.4); pc(target.x, target.y, 24, C.c, 0.8); pc(target.x, target.y, 12, C.g, 0.9); }
    for (var ti = 0; ti < probeTrail.length; ti++) pc(probeTrail[ti].x, probeTrail[ti].y, 8 * (ti / probeTrail.length), C.e, ti / probeTrail.length * 0.5);
    if (probe) { pc(probe.x, probe.y, 14, C.b, 0.9); pc(probe.x, probe.y, 7, C.g, 0.8); }
    else { pc(W / 2, LAUNCH_Y, 20, C.e, 0.6); pc(W / 2, LAUNCH_Y, 12, C.g, 0.8); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || probe) return;
    var fx = W / 2, fy = LAUNCH_Y, dx = x - fx, dy = y - fy, len = Math.max(1, Math.hypot(dx, dy)), sp = Math.min(len * 1.5, 600);
    probe = { x: fx, y: fy, vx: dx / len * sp, vy: dy / len * sp, life: 4.0 }; probeTrail = []; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); if (target) target.pulse += dt * 3; drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'CAPTURED!' : 'LOST IN SPACE', W / 2, H * 0.14, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.20, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.26, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (target) target.pulse += dt * 3;
      if (probe) {
        probe.life -= dt;
        var gdx = PX - probe.x, gdy = PY - probe.y, gd = Math.hypot(gdx, gdy); if (gd > 0) { var grav = Math.min(MASS / (gd * gd), 1200); probe.vx += gdx / gd * grav * dt; probe.vy += gdy / gd * grav * dt; }
        probeTrail.push({ x: probe.x, y: probe.y }); if (probeTrail.length > 26) probeTrail.shift();
        probe.x += probe.vx * dt; probe.y += probe.vy * dt;
        if (gd < PLANET_R + 10) { for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: probe.x, y: probe.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.a }); } if (fail()) return; }
        else if (probe && (probe.x < -100 || probe.x > W + 100 || probe.y < -100 || probe.y > H + 100 || probe.life <= 0)) { if (fail()) return; }
        else if (probe && target && Math.hypot(target.x - probe.x, target.y - probe.y) < 46) { caught++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7); for (var k2 = 0; k2 < 12; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: target.x, y: target.y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.6, col: C.c }); } probe = null; probeTrail = []; target = null; if (caught >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done && state === S.PLAYING) spawnTarget(); }, 700); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (!probe) txt('TAP TO LAUNCH', W / 2, snap(H * 0.94), 36, C.e);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#081428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
