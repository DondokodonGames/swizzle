// 697-pong-solo.js
// ソロポン — 壁で跳ね返るボールをパドルで打ち返し、ラリーを続ける
// 操作: タップした横位置へパドルが移動。落ちてくるボールを打ち返す
// 成功: 12回 ラリー  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コート） ──
  var C = { bg:'#02060f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SOLO PONG';
  var HOW_TO_PLAY = 'TAP TO MOVE THE PADDLE · KEEP THE RALLY GOING';
  var MAX_TIME = 20;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var PADDLE_Y = snap(H * 0.85), PADDLE_W = 220, PADDLE_H = 28, BALL_R = 24, WALL_Y = 240;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var paddleX, paddleTargetX, ballX, ballY, ballVX, ballVY, rally, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, trail, hitFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030810');
  }

  function background() { game.draw.clear(C.bg); }

  function launchBall() { ballX = W / 2; ballY = WALL_Y + 200; var spd = 560 + rally * 6, angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4; ballVX = Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1); ballVY = Math.abs(Math.sin(angle) * spd); }

  function initGame() { paddleX = W / 2; paddleTargetX = W / 2; rally = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; trail = []; hitFlash = 0; launchBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rally * 400 + Math.ceil(timeLeft) * 100) : rally * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, WALL_Y - 16, W, 16, '#0f172a', 0.9); game.draw.line(0, WALL_Y, W, WALL_Y, '#ffffff15', 2);
    game.draw.rect(0, WALL_Y, 20, H - WALL_Y, '#0f172a', 0.9); game.draw.rect(W - 20, WALL_Y, 20, H - WALL_Y, '#0f172a', 0.9);
    for (var tr2 = 0; tr2 < trail.length; tr2++) { var t = trail[tr2]; pc(t.x, t.y, BALL_R * t.life * 1.8, C.d, t.life * 0.5); }
    pc(ballX, ballY, BALL_R, C.g, 0.95); pc(ballX - BALL_R * 0.3, ballY - BALL_R * 0.3, BALL_R * 0.25, C.g, 0.6);
    game.draw.rect(snap(paddleX - PADDLE_W / 2), PADDLE_Y - PADDLE_H / 2, PADDLE_W, PADDLE_H, hitFlash > 0 ? C.g : C.e, hitFlash > 0 ? 0.95 : 0.85);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    paddleTargetX = Math.max(PADDLE_W / 2 + 20, Math.min(W - PADDLE_W / 2 - 20, tx)); game.audio.play('se_tap', 0.06);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (paddleX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RALLY KING!' : 'MISSED IT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (hitFlash > 0) hitFlash -= dt * 4;
      paddleX += (paddleTargetX - paddleX) * Math.min(1, dt * 22);
      ballX += ballVX * dt; ballY += ballVY * dt;
      if (ballX < BALL_R + 20) { ballX = BALL_R + 20; ballVX = Math.abs(ballVX); }
      if (ballX > W - BALL_R - 20) { ballX = W - BALL_R - 20; ballVX = -Math.abs(ballVX); }
      if (ballY < WALL_Y + BALL_R) { ballY = WALL_Y + BALL_R; ballVY = Math.abs(ballVY); }
      if (ballVY > 0 && ballY + BALL_R > PADDLE_Y - PADDLE_H / 2 && ballY - BALL_R < PADDLE_Y + PADDLE_H / 2) {
        if (ballX > paddleX - PADDLE_W / 2 - BALL_R && ballX < paddleX + PADDLE_W / 2 + BALL_R) {
          ballY = PADDLE_Y - PADDLE_H / 2 - BALL_R;
          var hitPos = (ballX - paddleX) / (PADDLE_W / 2), bounceAngle = hitPos * 0.9, spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.04;
          if (spd > 1200) spd = 1200;
          ballVX = Math.sin(bounceAngle) * spd; ballVY = -Math.abs(Math.cos(bounceAngle) * spd);
          rally++; hitFlash = 0.25; game.audio.play('se_tap', 0.18);
          for (var p2 = 0; p2 < 6; p2++) { var pa2 = Math.PI + Math.random() * Math.PI; particles.push({ x: ballX, y: PADDLE_Y, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.4, col: C.g }); }
          if (rally >= NEEDED) { finish(true); return; }
        }
      }
      if (ballY > PADDLE_Y + 100) {
        misses++; flash = 0.45; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.7; game.audio.play('se_failure', 0.4);
        for (var p3 = 0; p3 < 5; p3++) { var pa3 = Math.random() * Math.PI * 2; particles.push({ x: ballX, y: PADDLE_Y + 60, vx: Math.cos(pa3) * 180, vy: Math.sin(pa3) * 180, life: 0.5, col: C.a }); }
        if (misses >= MAX_MISS) { finish(false); return; }
        launchBall();
      }
      trail.push({ x: ballX, y: ballY, life: 0.2 });
      for (var tr = trail.length - 1; tr >= 0; tr--) { trail[tr].life -= dt * 5; if (trail[tr].life <= 0) trail.splice(tr, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.73), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rally + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#030810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
