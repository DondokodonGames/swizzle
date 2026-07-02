// 374-rocket-throttle.js
// ロケットスロットル — 連打でエンジンを噴かして高度を稼ぎ、燃料が尽きる前に目標高度へ到達する
// 操作: 連打（タップ）でエンジン噴射、離すと重力で落下
// 成功: 目標高度1000mに到達  失敗: 燃料切れで墜落 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、宇宙へ） ──
  var C = { bg:'#02040f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROCKET THROTTLE';
  var HOW_TO_PLAY = 'TAP FAST TO THRUST · REACH 1000m BEFORE FUEL RUNS OUT';
  var MAX_TIME = 15;
  var GOAL = 1000;           // 修正2: 5000m → 1000m
  var GRAVITY = -90, IMPULSE = 130, FUEL_BURN = 0.05;
  var ROCKET_Y = snap(H * 0.68);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var altitude, velocity, fuel, timeLeft, done, particles, stars, flame, thrustTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() {
    game.draw.clear(C.bg);
    var frac = Math.min(1, altitude / 600);
    game.draw.rect(0, 0, W, H, C.d, Math.max(0, 0.5 - frac * 0.5));
    for (var si = 0; si < stars.length; si++) { var sy = (stars[si].y + altitude * 0.3) % H; game.draw.rect(stars[si].x, snap(sy), stars[si].r, stars[si].r, C.g, (0.3 + frac * 0.5) * (0.5 + Math.sin(game.time.elapsed * 2 + si) * 0.3)); }
  }

  function initStars() { stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function initGame() { altitude = 0; velocity = 0; fuel = 1.0; timeLeft = MAX_TIME; done = false; particles = []; flame = 0; thrustTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(fuel * 3000) + Math.ceil(timeLeft) * 100) : Math.round(altitude);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawRocket() {
    var y = ROCKET_Y;
    game.draw.rect(snap(W / 2 - 28), snap(y - 90), 56, 120, C.g, 0.95);
    pc(W / 2, y - 96, 28, C.e, 0.9);
    game.draw.rect(snap(W / 2 - 52), snap(y - 6), 24, 44, C.e, 0.85); game.draw.rect(snap(W / 2 + 28), snap(y - 6), 24, 44, C.e, 0.85);
    pc(W / 2, y - 52, 16, C.d, 0.9);
    if (flame > 0) { pc(W / 2, y + 44, 16 + flame * 30, C.f, 0.7); pc(W / 2, y + 52, 8 + flame * 16, C.c, 0.85); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || fuel <= 0) return;
    velocity += IMPULSE; fuel -= FUEL_BURN; if (fuel < 0) fuel = 0; thrustTimer = 0.15; flame = 1; game.audio.play('se_tap', 0.3);
    for (var k = 0; k < 4; k++) { var a = Math.PI / 2 + (Math.random() - 0.5) * 0.5; particles.push({ x: W / 2, y: ROCKET_Y + 60, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.3, col: Math.random() < 0.5 ? C.f : C.c }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (altitude === undefined) initGame(); background(); drawRocket();
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORBIT!' : 'CRASH', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (thrustTimer > 0) thrustTimer -= dt; if (flame > 0) flame -= dt * 4;
      velocity += GRAVITY * dt; altitude += velocity * dt;
      if (altitude < 0) { altitude = 0; if (velocity < -180) { for (var k = 0; k < 16; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: ROCKET_Y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.7, col: C.f }); } finish(false); return; } velocity = 0; }
      if (altitude >= GOAL) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawRocket();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    // 燃料ゲージ
    var fh = 360, fy = snap(H * 0.34);
    game.draw.rect(48, fy, 32, fh, '#122', 0.6); game.draw.rect(50, snap(fy + fh * (1 - fuel)), 28, snap(fh * fuel), fuel > 0.25 ? C.b : C.a, 0.9);
    txt('FUEL', 64, fy + fh + 30, 24, C.e);
    // 高度ゲージ
    var af = Math.min(1, altitude / GOAL);
    game.draw.rect(W - 80, fy, 32, fh, '#122', 0.6); game.draw.rect(W - 78, snap(fy + fh * (1 - af)), 28, snap(fh * af), C.e, 0.9);
    txt('ALT', W - 64, fy + fh + 30, 24, C.e);

    timeBar();
    txt(Math.round(altitude) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(altitude) + ' / ' + GOAL + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
