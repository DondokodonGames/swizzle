// 533-planet-orbit.js
// プラネットオービット — 軌道を回る宇宙船を、タップで接線方向へ射出し次の惑星にキャッチさせる
// 操作: タップで宇宙船を今の惑星から射出。別の惑星に触れると乗り換え成功、画面外に出るとミス
// 成功: 惑星 5個 到達  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、深宇宙） ──
  var C = { bg:'#01010a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PLANET_COLS = [C.d, C.a, C.b, C.c, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PLANET ORBIT';
  var HOW_TO_PLAY = 'TAP TO LAUNCH THE SHIP · LAND ON THE NEXT PLANET';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 8 → 5
  var MAX_MISS = 3;
  var CX = W / 2, CY = snap(H * 0.46);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var planets, ship, reached, misses, timeLeft, done, particles, stars, flash, flashCol, trail;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1030');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, C.g, 0.25 + Math.sin(st.t) * 0.2); }
  }

  function updateShipOnOrbit() { var p = planets[ship.orbitIdx]; if (!p) return; ship.x = p.x + Math.cos(ship.angle) * (p.r + 18); ship.y = p.y + Math.sin(ship.angle) * (p.r + 18); }

  function genPlanets() {
    planets = [];
    for (var i = 0; i < 5; i++) { var ang = (i / 5) * Math.PI * 2 + Math.random() * 0.5, dist = 180 + Math.random() * 240; planets.push({ x: CX + Math.cos(ang) * dist, y: CY + Math.sin(ang) * dist, r: 40 + Math.random() * 18, col: PLANET_COLS[i % PLANET_COLS.length], orbitAngle: ang, orbitDist: dist, orbitSpeed: (Math.random() - 0.5) * 0.4 }); }
    ship.orbitIdx = 0; ship.angle = 0; ship.launching = false; updateShipOnOrbit();
  }

  function initGame() {
    ship = { orbitIdx: 0, angle: 0, orbitSpeed: 2.5, launching: false, x: 0, y: 0, vx: 0, vy: 0 };
    stars = []; for (var s = 0; s < 60; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 8, t: Math.random() * Math.PI * 2 });
    reached = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; trail = []; genPlanets();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (reached * 800 + Math.ceil(timeLeft) * 100) : reached * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var pi = 0; pi < planets.length; pi++) { var p = planets[pi], isCur = pi === ship.orbitIdx; pc(p.x, p.y, p.r + 8, p.col, 0.15); pc(p.x, p.y, p.r, p.col, 0.9); pc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.2, C.g, 0.4); if (isCur && !ship.launching) pc(p.x, p.y, p.r + 16 + Math.sin(game.time.elapsed * 4) * 6, p.col, 0.25); }
    for (var ti = 0; ti < trail.length; ti++) game.draw.rect(snap(trail[ti].x) - 5, snap(trail[ti].y) - 5, 10, 10, C.e, trail[ti].life * 0.6);
    pc(ship.x, ship.y, 16, C.g, 0.3); pc(ship.x, ship.y, 10, C.g, 0.95);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ship.launching) return;
    var tangX = -Math.sin(ship.angle), tangY = Math.cos(ship.angle), speed = 700;
    ship.launching = true; ship.vx = tangX * speed; ship.vy = tangY * speed; game.audio.play('se_tap', 0.4); trail = [];
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ship) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEEP SPACE!' : 'LOST IN SPACE', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      for (var s = 0; s < stars.length; s++) stars[s].t += dt;
      for (var pi = 0; pi < planets.length; pi++) { var p = planets[pi]; p.orbitAngle += p.orbitSpeed * dt; p.x = CX + Math.cos(p.orbitAngle) * p.orbitDist; p.y = CY + Math.sin(p.orbitAngle) * p.orbitDist; }
      if (ship.launching) {
        ship.x += ship.vx * dt; ship.y += ship.vy * dt; trail.push({ x: ship.x, y: ship.y, life: 0.5 });
        if (ship.x < -100 || ship.x > W + 100 || ship.y < -100 || ship.y > H + 100) { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.5); ship.launching = false; updateShipOnOrbit(); if (misses >= MAX_MISS) { finish(false); return; } }
        else for (var pi2 = 0; pi2 < planets.length; pi2++) {
          if (pi2 === ship.orbitIdx) continue; var p2 = planets[pi2], d = Math.hypot(ship.x - p2.x, ship.y - p2.y);
          if (d < p2.r + 24) {
            ship.launching = false; ship.orbitIdx = pi2; ship.angle = Math.atan2(ship.y - p2.y, ship.x - p2.x); reached++; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.7);
            for (var ppi = 0; ppi < 10; ppi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: p2.col }); }
            if (reached >= NEEDED) { finish(true); return; }
            break;
          }
        }
      } else { ship.angle += ship.orbitSpeed * dt; updateShipOnOrbit(); }
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 2; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(reached + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
