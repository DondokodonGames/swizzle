// 500-space-dock.js
// スペースドック — 慣性で漂う宇宙船をスワイプ/タップで推進し、緑のポートへ低速で着岸する
// 操作: スワイプで推進（上下左右）、タップした方向へ微調整。ゆっくり接触でドッキング成功
// 成功: 3回 ドッキング  失敗: 3回 クラッシュ or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、宇宙ステーション） ──
  var C = { bg:'#000008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPACE DOCK';
  var HOW_TO_PLAY = 'SWIPE TO THRUST · DOCK SLOWLY INTO THE GREEN PORT';
  var MAX_TIME = 25;
  var NEEDED     = 3;        // 修正2: 8 → 3
  var MAX_CRASH  = 3;
  var SAFE_SPEED = 140, MAX_SPEED = 400;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ship, port, stars, docked, crashes, timeLeft, done, particles, thrustDir, thrustTimer, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a20');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 1.5 + si) * 0.3); }

  function initStars() { stars = []; for (var i = 0; i < 70; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function resetShip() { ship.x = snap(120 + Math.random() * (W - 240)); ship.y = snap(340 + Math.random() * H * 0.15); ship.vx = (Math.random() - 0.5) * 60; ship.vy = Math.random() * 30; port.x = snap(160 + Math.random() * (W - 320)); port.y = snap(H * 0.66 + Math.random() * H * 0.14); }

  function initGame() { ship = { x: W / 2, y: 360, vx: 0, vy: 0 }; port = { x: W / 2, y: H * 0.75, r: 60 }; docked = 0; crashes = 0; timeLeft = MAX_TIME; done = false; particles = []; thrustDir = null; thrustTimer = 0; flash = 0; flashCol = C.b; resetShip(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (docked * 800 + Math.ceil(timeLeft) * 100) : docked * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(port.x, port.y, port.r + 12 + Math.sin(game.time.elapsed * 3) * 6, C.b, 0.4); ring(port.x, port.y, port.r, C.b, 0.6); pc(port.x, port.y, port.r - 16, C.d, 0.3);
    game.draw.rect(snap(port.x - port.r - 40), snap(port.y) - 4, 40, 8, C.b, 0.8); game.draw.rect(snap(port.x + port.r), snap(port.y) - 4, 40, 8, C.b, 0.8);
    var spd = Math.hypot(ship.vx, ship.vy), sc = spd > SAFE_SPEED ? C.a : C.b;
    pc(ship.x, ship.y, 34, sc, 0.9); pc(ship.x - 12, ship.y - 12, 10, C.g, 0.5);
    if (thrustTimer > 0 && thrustDir) { var nx = thrustDir === 'left' ? 1 : thrustDir === 'right' ? -1 : 0, ny = thrustDir === 'up' ? 1 : thrustDir === 'down' ? -1 : 0; pc(ship.x + nx * 40, ship.y + ny * 40, 16, C.f, 0.7); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = tx - ship.x, dy = ty - ship.y, len = Math.max(1, Math.hypot(dx, dy)); ship.vx += dx / len * 100; ship.vy += dy / len * 100; game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var th = 220;
    if (dir === 'up') ship.vy -= th; else if (dir === 'down') ship.vy += th; else if (dir === 'left') ship.vx -= th; else ship.vx += th;
    thrustDir = dir; thrustTimer = 0.3; game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * 80 - ship.vx * 0.3, vy: Math.sin(a) * 80 - ship.vy * 0.3, life: 0.5, col: C.f }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'ALL DOCKED!' : 'CRASHED', W / 2, H * 0.14, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.20, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.26, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (thrustTimer > 0) { thrustTimer -= dt; if (thrustTimer <= 0) thrustDir = null; }
      ship.vx *= Math.pow(0.98, dt * 60); ship.vy *= Math.pow(0.98, dt * 60);
      var spd = Math.hypot(ship.vx, ship.vy); if (spd > MAX_SPEED) { ship.vx *= MAX_SPEED / spd; ship.vy *= MAX_SPEED / spd; }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      if (ship.x < 0) ship.x = W; if (ship.x > W) ship.x = 0; if (ship.y < 300) ship.y = H; if (ship.y > H) ship.y = 300;
      if (Math.hypot(ship.x - port.x, ship.y - port.y) < port.r + 20) {
        if (Math.hypot(ship.vx, ship.vy) < SAFE_SPEED) {
          docked++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.8); ship.vx = 0; ship.vy = 0;
          for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: port.x, y: port.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.7, col: C.b }); }
          if (docked >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) resetShip(); }, 700);
        } else {
          crashes++; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.6); ship.vx = -ship.vx * 0.5; ship.vy = -ship.vy * 0.5;
          for (var pi2 = 0; pi2 < 10; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: ship.x, y: ship.y, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.6, col: C.a }); }
          if (crashes >= MAX_CRASH) { finish(false); return; } setTimeout(function() { if (!done) resetShip(); }, 700);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    var spd2 = Math.hypot(ship.vx, ship.vy); txt('SPD ' + Math.floor(spd2), W - 130, 300, 40, spd2 > SAFE_SPEED ? C.a : C.b);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(docked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
