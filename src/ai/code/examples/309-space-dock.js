// 309-space-dock.js
// 宇宙ドッキング — 慣性で漂う宇宙船をスワイプで推進し、ポートへ低速で静かに着岸させる
// 操作: 4方向スワイプで推進（慣性あり・速すぎると衝突）
// 成功: 3回ドッキング  失敗: 3回衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、深宇宙） ──
  var C = { bg:'#020410', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPACE DOCK';
  var HOW_TO_PLAY = 'SWIPE TO THRUST · DOCK SLOWLY · WATCH SPEED';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_CRASH = 3;
  var THRUST = 120, DRAG = 0.6, MAX_SPEED = 300, SAFE_SPEED = 90, PORT_R = 54;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sx, sy, vx, vy, portX, portY, docked, crashes, timeLeft, done, particles, bgStars, asteroids, thrustDir, thrustTimer, dockFlash, crashFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1024');
  }

  function background() { game.draw.clear(C.bg); for (var i = 0; i < bgStars.length; i++) game.draw.rect(bgStars[i].x, bgStars[i].y, bgStars[i].s, bgStars[i].s, C.g, Math.floor(game.time.elapsed * 3 + i) % 3 === 0 ? 0.7 : 0.25); }

  function placePort() {
    var m = 120; portX = snap(m + Math.random() * (W - m * 2)); portY = snap(H * 0.2 + Math.random() * (H * 0.55));
    while (Math.hypot(portX - sx, portY - sy) < 240) { portX = snap(m + Math.random() * (W - m * 2)); portY = snap(H * 0.2 + Math.random() * (H * 0.55)); }
    asteroids = []; if (docked >= 1) asteroids.push({ x: snap((portX + sx) / 2 + (Math.random() - 0.5) * 160), y: snap((portY + sy) / 2 + (Math.random() - 0.5) * 160), r: 40 + Math.random() * 20 });
  }

  function initGame() { sx = W / 2; sy = H * 0.62; vx = 0; vy = 0; docked = 0; crashes = 0; timeLeft = MAX_TIME; done = false; particles = []; asteroids = []; thrustDir = null; thrustTimer = 0; dockFlash = 0; crashFlash = 0; bgStars = []; for (var i = 0; i < 60; i++) bgStars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 }); placePort(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (docked * 500 + Math.ceil(timeLeft) * 100) : docked * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function crash(bvx, bvy) { crashes++; crashFlash = 0.5; game.audio.play('se_failure', 0.6); vx = bvx; vy = bvy; for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: sx, y: sy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.a }); } if (crashes >= MAX_CRASH) finish(false); }

  function drawShip() {
    var spd = Math.hypot(vx, vy), dir = spd > 5 ? Math.atan2(vy, vx) : 0;
    pc(sx, sy, 26, crashFlash > 0 ? C.a : C.e, 0.9); pc(sx + Math.cos(dir) * 14, sy + Math.sin(dir) * 14, 10, C.g, 0.8);
    if (thrustTimer > 0) pc(sx - Math.cos(dir) * 30, sy - Math.sin(dir) * 30, 12 * thrustTimer / 0.3, C.f, thrustTimer * 2);
  }

  function drawPort(safe) {
    var p = 4 * (Math.floor(game.time.elapsed * 4) % 2);
    ring(portX, portY, PORT_R + p, C.b, 0.6); ring(portX, portY, PORT_R * 0.6, C.b, 0.4); pc(portX, portY, 14, C.b, 0.7);
    if (Math.hypot(sx - portX, sy - portY) < 200) ring(portX, portY, PORT_R + 36, safe ? C.b : C.a, 0.4);
    if (dockFlash > 0) ring(portX, portY, PORT_R + 56, C.b, dockFlash);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    var tx = d === 'left' ? -1 : d === 'right' ? 1 : 0, ty = d === 'up' ? -1 : d === 'down' ? 1 : 0;
    vx += tx * THRUST; vy += ty * THRUST;
    var spd = Math.hypot(vx, vy); if (spd > MAX_SPEED) { vx = vx / spd * MAX_SPEED; vy = vy / spd * MAX_SPEED; }
    thrustDir = d; thrustTimer = 0.3; game.audio.play('se_tap', 0.2);
    for (var k = 0; k < 5; k++) particles.push({ x: sx - tx * 30, y: sy - ty * 30, vx: -tx * 80 + (Math.random() - 0.5) * 60, vy: -ty * 80 + (Math.random() - 0.5) * 60, life: 0.4, col: C.f });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bgStars) initGame(); background(); drawPort(true); drawShip();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DOCKED!' : 'COLLISION', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var spd = Math.hypot(vx, vy);
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (thrustTimer > 0) thrustTimer -= dt; if (dockFlash > 0) dockFlash -= dt; if (crashFlash > 0) crashFlash -= dt;
      vx *= (1 - DRAG * dt); vy *= (1 - DRAG * dt); sx += vx * dt; sy += vy * dt;
      if (sx < 30) { sx = 30; vx = Math.abs(vx) * 0.5; } if (sx > W - 30) { sx = W - 30; vx = -Math.abs(vx) * 0.5; }
      if (sy < 80) { sy = 80; vy = Math.abs(vy) * 0.5; } if (sy > H - 80) { sy = H - 80; vy = -Math.abs(vy) * 0.5; }
      for (var ai = 0; ai < asteroids.length; ai++) { var adx = sx - asteroids[ai].x, ady = sy - asteroids[ai].y; if (Math.hypot(adx, ady) < asteroids[ai].r + 26) { crash(adx * 3, ady * 3); if (done) return; } }
      var dist = Math.hypot(sx - portX, sy - portY);
      if (dist < PORT_R + 20) {
        if (spd < SAFE_SPEED) { docked++; dockFlash = 0.8; vx = 0; vy = 0; game.audio.play('se_success', 0.6); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: portX, y: portY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.7, col: C.b }); } if (docked >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) { sx = W / 2 + (Math.random() - 0.5) * 200; sy = H * 0.62; placePort(); } }, 600); }
        else { crash(-vx * 0.6, -vy * 0.6); if (done) return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ai2 = 0; ai2 < asteroids.length; ai2++) { pc(asteroids[ai2].x, asteroids[ai2].y, asteroids[ai2].r, '#334466', 0.85); pc(asteroids[ai2].x + asteroids[ai2].r * 0.3, asteroids[ai2].y - asteroids[ai2].r * 0.2, asteroids[ai2].r * 0.2, '#556', 0.6); }
    drawPort(spd < SAFE_SPEED); drawShip();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (crashFlash > 0) game.draw.rect(0, 0, W, H, C.a, crashFlash * 0.2);

    // 速度バー（安全は緑）
    var sr = Math.min(1, spd / MAX_SPEED);
    game.draw.rect(40, snap(H * 0.80), snap((W - 80) * sr), 24, spd < SAFE_SPEED ? C.b : C.a, 0.9);
    game.draw.rect(40 + snap((W - 80) * SAFE_SPEED / MAX_SPEED), snap(H * 0.80) - 4, 6, 32, C.g, 0.6);
    txt('SPEED', W / 2, snap(H * 0.78), 30, spd < SAFE_SPEED ? C.b : C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(docked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#0a1024');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
