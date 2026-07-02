// 203-ice-drift.js
// アイスドリフト — 凍った宇宙ステーションの床を滑る探査機を壁に当てず操る、慣性との格闘
// 操作: タップした方向へ加速
// 成功: 6秒生き残る  失敗: 高速で壁に激突

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷結ステーション） ──
  var C = { bg:'#04121c', a:'#ff4d6d', b:'#5ef0ff', c:'#aef7ff', d:'#1e5a7a', e:'#7fdcff', f:'#ffe600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE DRIFT';
  var HOW_TO_PLAY = 'TAP A DIRECTION TO THRUST';
  var NEEDED   = 6;             // 修正2: 20 → 6（サバイバル短縮）
  var WALL = snap(56), TOP = 220;
  var PX = WALL, PY = TOP, PW = W - WALL * 2, PH = H - TOP - WALL;
  var CAR_R = 36, FRICTION = 0.994, ACCEL = 620, CRASH_SPEED = 560;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var carX, carY, carVX, carVY, survived, timeLeft, done, trail, exhaust, thrustDir;

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
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2432');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(PX, PY, PW, PH, C.d, 0.35);
    for (var ix = 0; ix < PW; ix += 160) for (var iy = 0; iy < PH; iy += 160) game.draw.rect(PX + ix + 40, PY + iy + 40, 24, 24, C.e, 0.15);
    // 壁
    game.draw.rect(0, TOP, WALL, PH, C.a, 0.7); game.draw.rect(W - WALL, TOP, WALL, PH, C.a, 0.7);
    game.draw.rect(0, TOP, W, WALL, C.a, 0.7); game.draw.rect(0, H - WALL, W, WALL, C.a, 0.7);
  }

  function drawCar(x, y, vx, vy) {
    var ang = Math.atan2(vy, vx);
    pc(x, y, CAR_R, C.b, 0.95);
    pc(x - 12, y - 12, 8, C.g, 0.7);
    // 進行方向ノーズ
    game.draw.rect(snap(x + Math.cos(ang) * CAR_R) - 4, snap(y + Math.sin(ang) * CAR_R) - 4, 12, 12, C.f);
  }

  function initGame() {
    carX = snap(W / 2); carY = snap(H / 2); carVX = 120; carVY = -80;
    survived = 0; timeLeft = NEEDED; done = false; trail = []; exhaust = []; thrustDir = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 120) : Math.round(survived * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - carX, dy = y - carY, dist = Math.hypot(dx, dy);
    if (dist > 20) {
      carVX += dx / dist * ACCEL; carVY += dy / dist * ACCEL; thrustDir = Math.atan2(dy, dx);
      for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; exhaust.push({ x: carX, y: carY, vx: Math.cos(a) * 90 - dx / dist * 80, vy: Math.sin(a) * 90 - dy / dist * 80, life: 0.4 }); }
      game.audio.play('se_tap', 0.4);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawCar(W / 2, H / 2, Math.cos(game.time.elapsed), Math.sin(game.time.elapsed));
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#4a7a90');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'CRASHED', W / 2, H * 0.35, 84, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      carVX *= Math.pow(FRICTION, dt * 60); carVY *= Math.pow(FRICTION, dt * 60);
      carX += carVX * dt; carY += carVY * dt;
      var hit = false;
      if (carX - CAR_R < PX) { carX = PX + CAR_R; carVX = Math.abs(carVX) * 0.6; hit = true; }
      if (carX + CAR_R > PX + PW) { carX = PX + PW - CAR_R; carVX = -Math.abs(carVX) * 0.6; hit = true; }
      if (carY - CAR_R < PY) { carY = PY + CAR_R; carVY = Math.abs(carVY) * 0.6; hit = true; }
      if (carY + CAR_R > PY + PH) { carY = PY + PH - CAR_R; carVY = -Math.abs(carVY) * 0.6; hit = true; }
      if (hit && Math.hypot(carVX, carVY) > CRASH_SPEED) { finish(false); return; }
      trail.push({ x: carX, y: carY, life: 0.7 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var ei = exhaust.length - 1; ei >= 0; ei--) { var e = exhaust[ei]; e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt; if (e.life <= 0) exhaust.splice(ei, 1); }
    }

    // ---- 描画 ----
    background();
    for (var t2 = 0; t2 < trail.length; t2++) game.draw.rect(snap(trail[t2].x) - 6, snap(trail[t2].y) - 6, 12, 12, C.e, trail[t2].life * 0.4);
    for (var e2 = 0; e2 < exhaust.length; e2++) game.draw.rect(snap(exhaust[e2].x) - 5, snap(exhaust[e2].y) - 5, 10, 10, C.g, exhaust[e2].life * 2);
    drawCar(carX, carY, carVX, carVY);
    // 壁接近警告
    var wd = Math.min(carX - PX, PX + PW - carX, carY - PY, PY + PH - carY);
    if (wd < 120) game.draw.rect(PX, PY, PW, PH, C.a, (1 - wd / 120) * 0.12);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('TAP TO STEER', W / 2, H - 100, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
