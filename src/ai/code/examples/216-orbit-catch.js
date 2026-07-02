// 216-orbit-catch.js
// オービットキャッチ — 惑星の引力で軌道に乗った隕石を、ネットを動かして軌道上で捕まえる
// 操作: タップした方向にネットを移動
// 成功: 3個キャッチ  失敗: 3個取り逃がす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、周回軌道） ──
  var C = { bg:'#020409', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP TO SWING THE NET ALONG THE ORBIT';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 15 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var CX = snap(W / 2), CY = snap(H * 0.48), PLANET_R = 96, ORBIT_R = 320, NET_ARC = 0.28, NET_R = 44;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var netAngle, meteors, caught, missed, timeLeft, done, spawnTimer, particles, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.2 + 0.15 * (Math.floor(game.time.elapsed * 2 + si) % 2));
    for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(CX + Math.cos(a) * ORBIT_R) - 3, snap(CY + Math.sin(a) * ORBIT_R) - 3, 6, 6, C.d, 0.5);
  }

  function drawPlanet() { pc(CX, CY, PLANET_R, C.e, 0.9); pc(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.25, C.g, 0.4); }

  function drawNet() {
    var nx = CX + Math.cos(netAngle) * ORBIT_R, ny = CY + Math.sin(netAngle) * ORBIT_R;
    for (var a = -NET_ARC; a <= NET_ARC; a += 0.08) game.draw.rect(snap(CX + Math.cos(netAngle + a) * ORBIT_R) - 4, snap(CY + Math.sin(netAngle + a) * ORBIT_R) - 4, 8, 8, C.b, 0.6);
    pc(nx, ny, NET_R, C.b, 0.85); pc(nx, ny, NET_R * 0.5, C.bg, 0.9);
  }

  function drawMeteor(m) { pc(m.x, m.y, m.r, C.f, 0.9); game.draw.rect(snap(m.x) - 4, snap(m.y) - 4, 8, 8, C.c, 0.8); }

  function spawnMeteor() {
    var ang = Math.random() * Math.PI * 2, sx = CX + Math.cos(ang) * W * 0.7, sy = CY + Math.sin(ang) * H * 0.6;
    var dx = CX - sx, dy = CY - sy, dist = Math.hypot(dx, dy), speed = 260;
    meteors.push({ x: sx, y: sy, vx: dx / dist * speed, vy: dy / dist * speed, r: 24, orbiting: false, orbitAngle: 0, orbitDir: Math.random() < 0.5 ? 1 : -1, orbitSpeed: 1.3, laps: 0 });
  }

  function initGame() {
    netAngle = -Math.PI / 2; meteors = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = [];
    stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: 4 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 50) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { missed++; game.audio.play('se_failure', 0.3); if (missed >= MAX_MISS) finish(false); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    netAngle = Math.atan2(y - CY, x - CX); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawPlanet(); drawNet();
      drawMeteor({ x: CX + Math.cos(game.time.elapsed) * ORBIT_R, y: CY + Math.sin(game.time.elapsed) * ORBIT_R, r: 24 });
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawPlanet();
      txt(resultSuccess ? 'CAUGHT!' : 'LOST', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnMeteor(); spawnTimer = 1.6 * (0.7 + Math.random() * 0.6); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi];
        if (!m.orbiting) {
          var dx = CX - m.x, dy = CY - m.y, dist = Math.hypot(dx, dy);
          if (dist < PLANET_R + m.r) { meteors.splice(mi, 1); addMiss(); if (done) return; continue; }
          if (dist < ORBIT_R + 30) { m.orbiting = true; m.orbitAngle = Math.atan2(m.y - CY, m.x - CX); m.startAngle = m.orbitAngle; }
          else { var grav = 40000 / (dist * dist); m.vx += dx / dist * grav * dt; m.vy += dy / dist * grav * dt; m.x += m.vx * dt; m.y += m.vy * dt; }
        } else {
          m.orbitAngle += m.orbitDir * m.orbitSpeed * dt;
          m.x = CX + Math.cos(m.orbitAngle) * ORBIT_R; m.y = CY + Math.sin(m.orbitAngle) * ORBIT_R;
          var diff = m.orbitAngle - netAngle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) < NET_ARC) {
            caught++; game.audio.play('se_success', 0.6);
            for (var pi = 0; pi < 6; pi++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.5 }); }
            meteors.splice(mi, 1); if (caught >= NEEDED) { finish(true); return; } continue;
          }
          if (Math.abs(m.orbitAngle - m.startAngle) > Math.PI * 4) { meteors.splice(mi, 1); addMiss(); if (done) return; }
        }
      }
      for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) { var p = particles[pi2]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi2, 1); }
    }

    // ---- 描画 ----
    background(); drawPlanet(); drawNet();
    for (var mi2 = 0; mi2 < meteors.length; mi2++) drawMeteor(meteors[mi2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 208, 20, 20, mm < missed ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
