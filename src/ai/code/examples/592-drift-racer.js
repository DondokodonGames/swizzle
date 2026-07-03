// 592-drift-racer.js
// ドリフトレーサー — 自動で加速する車をステアリングでコーナリングし、コースを外れずに周回する
// 操作: 左右スワイプ/タップでステアリング、下スワイプでブレーキ。コースアウトでクラッシュ
// 成功: 3ラップ 完走  失敗: 3回 コースアウト or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイトサーキット） ──
  var C = { bg:'#0a0800', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CX = W / 2, CY = snap(H * 0.5), RX = W * 0.36, RY = H * 0.30, TRACK_W = 170, NPTS = 32;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DRIFT RACER';
  var HOW_TO_PLAY = 'SWIPE / TAP TO STEER · SWIPE DOWN TO BRAKE · STAY ON THE TRACK';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_CRASH = 3;
  var MAX_SPEED = 640, STEER_SPEED = 2.5, ACCEL = 300, DRIFT = 0.85;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var track, carAngle, carX, carY, carSpeed, carVX, carVY, steerDir, braking, laps, crashes, timeLeft, done, particles, flash, flashCol, cpTimer, invincible, trail, lapFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#2a2010');
  }

  function makeTrack() { track = []; for (var ti = 0; ti < NPTS; ti++) { var ang = (ti / NPTS) * Math.PI * 2 - Math.PI / 2; track.push({ x: CX + Math.cos(ang) * RX, y: CY + Math.sin(ang) * RY }); } }

  function isOnTrack() { for (var i = 0; i < NPTS; i++) { var dx = carX - track[i].x, dy = carY - track[i].y; if (dx * dx + dy * dy < TRACK_W * TRACK_W * 0.5) return true; } return false; }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, '#0a1800', 0.6);
    for (var i = 0; i < NPTS; i++) { var p1 = track[i], p2 = track[(i + 1) % NPTS]; game.draw.line(p1.x, p1.y, p2.x, p2.y, C.d, TRACK_W + 20); }
    for (var i2 = 0; i2 < NPTS; i2++) { var p3 = track[i2], p4 = track[(i2 + 1) % NPTS]; game.draw.line(p3.x, p3.y, p4.x, p4.y, '#1a1a10', TRACK_W); }
    game.draw.rect(CX - 4, CY - RY - 40, 8, 80, C.g, 0.8);
  }

  function initGame() { makeTrack(); carAngle = -Math.PI / 2; carX = CX; carY = CY - RY; carSpeed = 0; carVX = 0; carVY = 0; steerDir = 0; braking = false; laps = 0; crashes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.a; cpTimer = 0; invincible = 0; trail = []; lapFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (laps * 1500 + Math.ceil(timeLeft) * 100) : laps * 500;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (lapFlash > 0) pc(CX, CY - RY, 60, C.c, lapFlash * 0.3);
    for (var ti = 0; ti < trail.length; ti++) game.draw.rect(snap(trail[ti].x) - 5, snap(trail[ti].y) - 5, 10, 10, C.f, trail[ti].life * 0.4);
    var ca = (invincible > 0 && Math.floor(game.time.elapsed * 8) % 2 === 0) ? 0.4 : 1.0;
    pc(carX, carY, 26, C.f, ca * 0.9); pc(carX - 8, carY - 8, 10, C.c, 0.5);
    game.draw.line(carX, carY, carX + Math.cos(carAngle) * 40, carY + Math.sin(carAngle) * 40, C.g, 5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') steerDir = -1; else if (dir === 'right') steerDir = 1; else if (dir === 'up') braking = false; else if (dir === 'down') braking = true;
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    steerDir = tx < W / 2 ? -1 : 1; game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!track) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.205, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.82, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHECKERED FLAG!' : 'WRECKED', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (lapFlash > 0) lapFlash -= dt * 2; if (invincible > 0) invincible -= dt; if (cpTimer > 0) cpTimer -= dt;
      carAngle += steerDir * STEER_SPEED * dt * (carSpeed / MAX_SPEED + 0.2); steerDir *= 0.85;
      carSpeed = braking ? Math.max(0, carSpeed - ACCEL * 2 * dt) : Math.min(MAX_SPEED, carSpeed + ACCEL * dt);
      var tvx = Math.cos(carAngle) * carSpeed, tvy = Math.sin(carAngle) * carSpeed;
      carVX += (tvx - carVX) * (1 - DRIFT) * (dt * 8); carVY += (tvy - carVY) * (1 - DRIFT) * (dt * 8);
      var velAng = Math.atan2(carVY, carVX), drift = Math.abs(carAngle - velAng) % (Math.PI * 2); if (drift > Math.PI) drift = Math.PI * 2 - drift;
      carX += carVX * dt; carY += carVY * dt;
      if (drift > 0.15) trail.push({ x: carX, y: carY, life: 0.5 }); for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 2; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      if (!isOnTrack() && invincible <= 0) { crashes++; invincible = 1.5; carSpeed *= 0.3; carVX *= 0.3; carVY *= 0.3; flash = 0.5; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: carX, y: carY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); } if (crashes >= MAX_CRASH) { finish(false); return; } }
      var dts = Math.hypot(carX - CX, carY - (CY - RY));
      if (dts < 80 && cpTimer <= 0 && (MAX_TIME - timeLeft) > 1) { laps++; lapFlash = 1.0; cpTimer = 2.0; game.audio.play('se_success', 0.6); if (laps >= NEEDED) { finish(true); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('LAP ' + laps + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#2a2010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
