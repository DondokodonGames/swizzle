// 630-firefly-jar.js
// ホタルのビン — 明滅するホタルが光っている一瞬をタップで捕まえてビンに集める
// 操作: 光っているホタルをタップで捕獲。暗い時は捕れない。放置すると逃げてしまう
// 成功: 8匹 捕獲  失敗: 3匹 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、夏の夜） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY JAR';
  var HOW_TO_PLAY = 'TAP A FIREFLY WHILE IT GLOWS TO CATCH IT · DO NOT LET THEM ESCAPE';
  var MAX_TIME = 18;
  var NEEDED     = 8;        // 修正2: 20 → 8
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fireflies, caught, escaped, timeLeft, done, particles, flash, flashCol, spawnTimer, jarCaught, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); for (var st = 0; st < stars.length; st++) { var s = stars[st]; game.draw.rect(snap(s.x), snap(s.y), 8, 8, C.g, 0.2 + Math.sin(game.time.elapsed + s.p) * 0.1); } }

  function spawnFirefly() {
    var ang = Math.random() * Math.PI * 2;
    fireflies.push({ x: 60 + Math.random() * (W - 120), y: H * 0.15 + Math.random() * (H * 0.6), vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80, glowPhase: Math.random() * Math.PI * 2, glowSpeed: 1.5 + Math.random() * 2, glowOn: true, glowTimer: 0.5 + Math.random() * 1.5, r: 14 + Math.random() * 6, wanderTimer: 0, life: 5 + Math.random() * 6 });
  }

  function initGame() { fireflies = []; caught = 0; escaped = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnTimer = 0; jarCaught = 0; stars = []; for (var i = 0; i < 30; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.8, p: Math.random() * 6 }); spawnFirefly(); spawnFirefly(); spawnFirefly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var fi = 0; fi < fireflies.length; fi++) {
      var ff = fireflies[fi], glow = ff.glowOn ? (0.6 + Math.sin(ff.glowPhase) * 0.4) : 0;
      if (ff.glowOn) { pc(ff.x, ff.y, ff.r * 2.4, C.b, glow * 0.2); pc(ff.x, ff.y, ff.r * 1.5, C.c, glow * 0.3); }
      pc(ff.x, ff.y, ff.r, ff.glowOn ? C.c : '#224400', 0.9);
      if (ff.life < 2) ring(ff.x, ff.y, ff.r + 10, C.a, (0.4 + Math.sin(game.time.elapsed * 10) * 0.3) * 0.5);
    }
    // jar
    var JW = 150, JH = 120, jx = W / 2, jy = snap(H * 0.90);
    game.draw.rect(jx - JW / 2, jy - JH, JW, JH, '#335566', 0.8); game.draw.rect(jx - JW / 2, jy - JH, JW, 14, C.e, 0.6);
    for (var jfi = 0; jfi < Math.min(jarCaught, 6); jfi++) { var cx = jx - JW * 0.3 + (jfi % 3) * JW * 0.3, cy = jy - JH * 0.4 - Math.floor(jfi / 3) * 22; pc(cx, cy, 8, C.c, 0.4 + Math.sin(game.time.elapsed * 2 + jfi) * 0.2); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitIdx = -1, bestD = 70;
    for (var fi = 0; fi < fireflies.length; fi++) { var ff = fireflies[fi]; if (!ff.glowOn) continue; var dx = tx - ff.x, dy = ty - ff.y, d = Math.sqrt(dx * dx + dy * dy); if (d < bestD) { bestD = d; hitIdx = fi; } }
    if (hitIdx >= 0) {
      var ff2 = fireflies[hitIdx]; caught++; jarCaught++; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ff2.x, y: ff2.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); }
      fireflies.splice(hitIdx, 1); if (caught >= NEEDED) { finish(true); return; }
    } else { flash = 0.1; flashCol = C.a; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fireflies) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.62, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JAR FULL!' : 'THEY FLEW OFF', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
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
      spawnTimer += dt; if (spawnTimer > Math.max(0.8, 1.8 - (MAX_TIME - timeLeft) * 0.03) && fireflies.length < 10) { spawnTimer = 0; spawnFirefly(); }
      for (var fi = fireflies.length - 1; fi >= 0; fi--) {
        var ff = fireflies[fi]; ff.life -= dt; ff.glowPhase += ff.glowSpeed * dt;
        ff.glowTimer -= dt; if (ff.glowTimer <= 0) { ff.glowOn = !ff.glowOn; ff.glowTimer = ff.glowOn ? (0.4 + Math.random() * 0.8) : (0.3 + Math.random() * 0.5); }
        ff.wanderTimer -= dt; if (ff.wanderTimer <= 0) { ff.wanderTimer = 0.5 + Math.random(); var a = Math.random() * Math.PI * 2; ff.vx += Math.cos(a) * 60; ff.vy += Math.sin(a) * 60; var spd = Math.sqrt(ff.vx * ff.vx + ff.vy * ff.vy); if (spd > 120) { ff.vx = ff.vx / spd * 120; ff.vy = ff.vy / spd * 120; } }
        ff.x += ff.vx * dt; ff.y += ff.vy * dt;
        if (ff.x < ff.r) { ff.x = ff.r; ff.vx = Math.abs(ff.vx); } if (ff.x > W - ff.r) { ff.x = W - ff.r; ff.vx = -Math.abs(ff.vx); }
        if (ff.y < H * 0.12) { ff.y = H * 0.12; ff.vy = Math.abs(ff.vy); } if (ff.y > H * 0.78) { ff.y = H * 0.78; ff.vy = -Math.abs(ff.vy); }
        if (ff.life <= 0) { escaped++; fireflies.splice(fi, 1); flash = 0.15; flashCol = C.a; if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
