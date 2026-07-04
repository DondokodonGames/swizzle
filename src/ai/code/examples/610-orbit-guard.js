// 610-orbit-guard.js
// オービットガード — 惑星を周回するガードから、飛来する隕石をタップで撃ち落とす
// 操作: タップでガードの向いた方向へ弾を発射。隕石が惑星に着弾する前に撃破
// 成功: 10隕石 撃破  失敗: 3個 着弾 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、軌道防衛） ──
  var C = { bg:'#000814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT GUARD';
  var HOW_TO_PLAY = 'TAP TO FIRE FROM THE ORBITING GUARD · SHOOT DOWN INCOMING METEORS';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_HITS = 3;
  var CX = W / 2, CY = snap(H * 0.42), PLANET_R = 96, ORBIT_R = 240, GUARD_R = 30;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var guardAngle, bullets, meteors, killed, hits, timeLeft, done, particles, flash, flashCol, spawnTimer, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1628');
  }

  function background() { game.draw.clear(C.bg); for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, C.g, 0.3 + Math.sin(st.phase) * 0.2); } }

  function spawnMeteor() {
    var ang = Math.random() * Math.PI * 2, sr = 700, mx = CX + Math.cos(ang) * sr, my = CY + Math.sin(ang) * sr;
    var speed = 150 + Math.random() * 90 + (MAX_TIME - timeLeft) * 4, dx = CX - mx, dy = CY - my, dist = Math.sqrt(dx * dx + dy * dy);
    meteors.push({ x: mx, y: my, vx: dx / dist * speed, vy: dy / dist * speed, r: 24 + Math.random() * 16, rot: Math.random() * Math.PI * 2 });
  }

  function initGame() { guardAngle = 0; bullets = []; meteors = []; killed = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnTimer = 0; stars = []; for (var s = 0; s < 70; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 8, phase: Math.random() * Math.PI * 2 }); spawnMeteor(); spawnMeteor(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 400 + Math.ceil(timeLeft) * 100) : killed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(CX, CY, ORBIT_R, C.d, 0.4);
    pc(CX, CY, PLANET_R, C.d, 0.9); pc(CX - 30, CY - 30, PLANET_R * 0.35, C.e, 0.4); pc(CX + 22, CY + 22, PLANET_R * 0.18, C.e, 0.3);
    for (var mi = 0; mi < meteors.length; mi++) { var m = meteors[mi]; pc(m.x, m.y, m.r, C.a, 0.9); pc(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.3, C.g, 0.5); }
    var gx = CX + Math.cos(guardAngle) * ORBIT_R, gy = CY + Math.sin(guardAngle) * ORBIT_R;
    pc(gx, gy, GUARD_R, C.c, 0.95); pc(gx - 8, gy - 8, GUARD_R * 0.3, C.g, 0.6);
    var ax = CX + Math.cos(guardAngle) * (ORBIT_R + 44), ay = CY + Math.sin(guardAngle) * (ORBIT_R + 44);
    pc(ax, ay, 10, C.c, 0.6);
    for (var bi = 0; bi < bullets.length; bi++) { var b = bullets[bi]; pc(b.x, b.y, 12, C.c, b.life); pc(b.x, b.y, 6, C.g, 0.9); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var gx = CX + Math.cos(guardAngle) * ORBIT_R, gy = CY + Math.sin(guardAngle) * ORBIT_R, speed = 850;
    bullets.push({ x: gx, y: gy, vx: Math.cos(guardAngle) * speed, vy: Math.sin(guardAngle) * speed, life: 1.2 });
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PLANET SAVED!' : 'IMPACT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3;
      guardAngle += 1.8 * dt;
      for (var s = 0; s < stars.length; s++) stars[s].phase += dt;
      spawnTimer += dt; var rate = Math.max(0.5, 1.6 - (MAX_TIME - timeLeft) * 0.05);
      if (spawnTimer > rate) { spawnTimer = 0; spawnMeteor(); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.x += m.vx * dt; m.y += m.vy * dt;
        var dx = m.x - CX, dy = m.y - CY;
        if (dx * dx + dy * dy < (PLANET_R + m.r) * (PLANET_R + m.r)) {
          hits++; meteors.splice(mi, 1); flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.a }); }
          if (hits >= MAX_HITS) { finish(false); return; }
        }
      }
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0) { bullets.splice(bi, 1); continue; }
        for (var mi2 = meteors.length - 1; mi2 >= 0; mi2--) {
          var m2 = meteors[mi2], bx = b.x - m2.x, by = b.y - m2.y;
          if (bx * bx + by * by < (m2.r + 12) * (m2.r + 12)) {
            killed++; bullets.splice(bi, 1);
            for (var p2 = 0; p2 < 10; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: m2.x, y: m2.y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.5, col: C.c }); }
            meteors.splice(mi2, 1); flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.5);
            if (killed >= NEEDED) { finish(true); return; } break;
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(killed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1628');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
