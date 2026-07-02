// 300-century-goal.js
// 世紀のゴール — 揺れるパワー/カーブゲージを見極め、上スワイプでフリーキックを決めるサッカー
// 操作: 上スワイプで蹴る（パワーとカーブのタイミングで狙う）
// 成功: 3点決める  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイトスタジアム） ──
  var C = { bg:'#04120a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', grass:'#0c4028' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CENTURY GOAL';
  var HOW_TO_PLAY = 'SWIPE UP TO SHOOT · READ POWER AND CURVE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MISS = 3;
  var GOAL_Y = snap(H * 0.26), GOAL_W = snap(W * 0.72), GOAL_H = snap(H * 0.16), GOAL_X = snap((W - GOAL_W) / 2);
  var BX = snap(W / 2), BY = snap(H * 0.74);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var power, powerDir, curve, curveDir, phase, ballX, ballY, ballVX, ballVY, spin, scored, misses, timeLeft, done, keeperX, keeperDir, keeperTarget, keeperDive, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2015');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.20), W, H, C.grass, 0.9); for (var s = 0; s < 6; s++) game.draw.rect(0, snap(H * 0.20 + s * (H * 0.8 / 6)), W, snap(H * 0.8 / 12), C.b, 0.05); }

  function drawGoal() {
    game.draw.rect(GOAL_X - 12, GOAL_Y - 20, GOAL_W + 24, 16, C.g, 0.9);
    game.draw.rect(GOAL_X - 12, GOAL_Y - 20, 12, GOAL_H + 20, C.g, 0.9); game.draw.rect(GOAL_X + GOAL_W, GOAL_Y - 20, 12, GOAL_H + 20, C.g, 0.9);
    for (var nx = 0; nx <= 6; nx++) game.draw.rect(GOAL_X + nx * (GOAL_W / 6) - 1, GOAL_Y, 2, GOAL_H, C.e, 0.3);
    for (var ny = 0; ny <= 3; ny++) game.draw.rect(GOAL_X, GOAL_Y + ny * (GOAL_H / 3) - 1, GOAL_W, 2, C.e, 0.3);
  }

  function drawKeeper() {
    var ky = GOAL_Y + GOAL_H * 0.5;
    pc(keeperX, ky - 44, 22, C.a, 0.95); game.draw.rect(snap(keeperX) - 24, snap(ky - 22), 48, 60, C.a, 0.9);
    if (keeperDive) { game.draw.rect(snap(keeperX) - 70, snap(ky - 16), 140, 14, C.f, 0.9); }
    else { game.draw.rect(snap(keeperX) - 60, snap(ky - 16), 24, 12, C.f, 0.9); game.draw.rect(snap(keeperX) + 36, snap(ky - 16), 24, 12, C.f, 0.9); }
  }

  function drawBall() { pc(ballX, ballY, 30, C.g, 0.95); var sx = Math.cos(spin) * 12, sy = Math.sin(spin) * 12; game.draw.rect(snap(ballX + sx) - 5, snap(ballY + sy) - 5, 10, 10, '#223', 0.8); }

  function drawGauge(x, y, w, val, col, centerMark, label) {
    game.draw.rect(x, y, w, 32, '#04140c', 0.9);
    if (centerMark) { game.draw.rect(x + w / 2 - 3, y - 4, 6, 40, C.g, 0.5); game.draw.rect(snap(x + w * val / 100) - 8, y - 2, 16, 36, col, 0.95); }
    else game.draw.rect(x, y, snap(w * val / 100), 32, col, 0.95);
    txt(label, x + w / 2, y - 14, 28, C.g);
  }

  function initGame() { power = 0; powerDir = 1; curve = 50; curveDir = 1; phase = 'aim'; ballX = BX; ballY = BY; ballVX = 0; ballVY = 0; spin = 0; scored = 0; misses = 0; timeLeft = MAX_TIME; done = false; keeperX = W / 2; keeperDir = 1; keeperDive = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 500 + Math.ceil(timeLeft) * 100) : scored * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function kick() {
    if (phase !== 'aim') return;
    var p = power / 100, cu = (curve - 50) / 50;
    var tx = GOAL_X + GOAL_W * 0.5 + cu * GOAL_W * 0.6, dx = tx - BX, dy = GOAL_Y + GOAL_H * 0.3 - BY, dist = Math.hypot(dx, dy), spd = 900 + p * 600;
    ballVX = dx / dist * spd + cu * 200; ballVY = dy / dist * spd; phase = 'flying'; game.audio.play('se_tap', 0.4);
    keeperDive = true; keeperTarget = keeperX + (Math.random() < 0.5 ? -1 : 1) * (GOAL_W * 0.3 + Math.random() * GOAL_W * 0.2);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) { if (state === S.PLAYING && !done && d === 'up') kick(); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGoal(); keeperX = W / 2 + Math.sin(game.time.elapsed * 2) * GOAL_W * 0.25; keeperDive = false; drawKeeper(); drawBall();
      txt(GAME_TITLE, W / 2, H * 0.50, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.56, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HAT-TRICK!' : 'MISSED', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (phase === 'aim') {
        power += dt * 80 * powerDir; if (power >= 100) { power = 100; powerDir = -1; } if (power <= 0) { power = 0; powerDir = 1; }
        curve += dt * 60 * curveDir; if (curve >= 100) { curve = 100; curveDir = -1; } if (curve <= 0) { curve = 0; curveDir = 1; }
        keeperX += dt * 200 * keeperDir; if (keeperX > GOAL_X + GOAL_W - 40) keeperDir = -1; if (keeperX < GOAL_X + 40) keeperDir = 1;
      } else if (phase === 'flying') {
        ballX += ballVX * dt; ballY += ballVY * dt; spin += dt * 8;
        if (keeperDive) keeperX += Math.sign(keeperTarget - keeperX) * Math.min(Math.abs(keeperTarget - keeperX), 700 * dt);
        if (ballY <= GOAL_Y + GOAL_H) {
          var inX = ballX > GOAL_X + 30 && ballX < GOAL_X + GOAL_W - 30, inY = ballY > GOAL_Y && ballY < GOAL_Y + GOAL_H, blocked = Math.abs(ballX - keeperX) < 60 && inY;
          if (inX && inY && !blocked) { scored++; fbText = 'GOAL!'; fbCol = C.c; fbTimer = 1.0; game.audio.play('se_success', 0.7); for (var k = 0; k < 14; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ballX, y: ballY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 100, life: 0.8, col: C.c }); } if (scored >= NEEDED) { finish(true); return; } }
          else { misses++; fbText = blocked ? 'SAVED!' : 'MISS!'; fbCol = C.a; fbTimer = 1.0; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
          phase = 'result';
          setTimeout(function() { if (!done) { ballX = BX; ballY = BY; ballVX = 0; ballVY = 0; keeperDive = false; power = 0; powerDir = 1; curve = 50; phase = 'aim'; } }, 800);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGoal(); drawKeeper(); drawBall();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life);
    if (phase === 'aim') {
      drawGauge(snap(W * 0.10), snap(H * 0.86), snap(W * 0.35), power, power > 70 ? C.b : power > 40 ? C.c : C.a, false, 'POWER');
      drawGauge(snap(W * 0.55), snap(H * 0.86), snap(W * 0.35), curve, C.f, true, 'CURVE');
      txt('SWIPE UP!', W / 2, snap(H * 0.93), 40, C.c);
    }
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.5), 72, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a2015');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
