// 767-pinball-tap.js
// ピンボールタップ — バウンドするボールを落とさないようにタップで打ち返せ
// 操作: タップでフリッパーをそのX位置へワープ、ボールを跳ね返せ
// 成功: 15回 打ち返す  失敗: 3回 落下 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール） ──
  var C = { bg:'#04060c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WALL = '#1e2b45', WALL_HI = '#3a4a6a', BALL = '#e2e8f0', BUMPER = '#c04dff', BUMPER_HI = '#e0b0ff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL TAP';
  var HOW_TO_PLAY = 'TAP TO WARP THE FLIPPER UNDER THE BALL AND BOUNCE IT BACK UP';
  var MAX_TIME = 24;
  var NEEDED   = 15;         // 修正2: 50 → 15
  var MAX_DROP = 3;          // 修正2: 5 → 3
  var WALL_T = 32;
  var FLIPPER_W = 220, FLIPPER_H = 30;
  var BALL_R = 30, BUMPER_R = 54, GRAVITY = 900;

  var FLOOR_Y = snap(H - 200), FLIPPER_Y = FLOOR_Y - 12;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballX, ballY, ballVx, ballVy, flipperX, bumpers, bumperFlash, score, drops, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a0d16');
  }

  function background() { game.draw.clear(C.bg); }

  function resetBall() { ballX = W / 2 + (Math.random() - 0.5) * 200; ballY = H * 0.35; ballVx = (Math.random() - 0.5) * 500; ballVy = 200; }

  function initGame() {
    score = 0; drops = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; flipperX = W / 2;
    bumpers = [{ x: W * 0.28, y: H * 0.34 }, { x: W * 0.72, y: H * 0.34 }, { x: W * 0.5, y: H * 0.24 }, { x: W * 0.18, y: H * 0.52 }, { x: W * 0.82, y: H * 0.52 }];
    bumperFlash = []; for (var i = 0; i < bumpers.length; i++) bumperFlash.push(0);
    resetBall();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 150) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, 0, WALL_T, H, WALL, 0.9); game.draw.rect(W - WALL_T, 0, WALL_T, H, WALL, 0.9); game.draw.rect(0, snap(H * 0.14), W, WALL_T, WALL, 0.9);
    game.draw.rect(WALL_T, snap(H * 0.14), W - WALL_T * 2, 6, WALL_HI, 0.4);
    game.draw.rect(0, FLOOR_Y + 60, W, H - FLOOR_Y - 60, '#1a0510', 0.9); game.draw.rect(0, FLOOR_Y + 60, W, 6, C.a, 0.5);
    for (var bi = 0; bi < bumpers.length; bi++) {
      var bmp = bumpers[bi], glow = bumperFlash[bi];
      if (glow > 0) pc(bmp.x, bmp.y, BUMPER_R + 18, BUMPER_HI, glow * 0.3);
      pc(bmp.x, bmp.y, BUMPER_R, glow > 0 ? BUMPER_HI : BUMPER, 0.9); pc(bmp.x - BUMPER_R * 0.3, bmp.y - BUMPER_R * 0.3, BUMPER_R * 0.2, C.g, 0.35);
    }
    game.draw.rect(snap(flipperX - FLIPPER_W / 2), FLIPPER_Y, FLIPPER_W, FLIPPER_H, C.f, 0.95); game.draw.rect(snap(flipperX - FLIPPER_W / 2), FLIPPER_Y, FLIPPER_W, 8, C.c, 0.5);
    pc(ballX, ballY, BALL_R, BALL, 0.95); pc(ballX - BALL_R * 0.32, ballY - BALL_R * 0.32, BALL_R * 0.22, C.g, 0.75);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    flipperX = Math.max(FLIPPER_W / 2 + WALL_T, Math.min(W - FLIPPER_W / 2 - WALL_T, tx));
    game.audio.play('se_tap', 0.06);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.055, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.095, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, FLOOR_Y - 40, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PINBALL WIZARD!' : 'TILT!', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      ballVy += GRAVITY * dt; ballX += ballVx * dt; ballY += ballVy * dt;
      if (ballX - BALL_R < WALL_T) { ballX = WALL_T + BALL_R; ballVx = Math.abs(ballVx) * 0.9; }
      if (ballX + BALL_R > W - WALL_T) { ballX = W - WALL_T - BALL_R; ballVx = -Math.abs(ballVx) * 0.9; }
      if (ballY - BALL_R < H * 0.14 + WALL_T) { ballY = H * 0.14 + WALL_T + BALL_R; ballVy = Math.abs(ballVy) * 0.85; }
      for (var bi = 0; bi < bumpers.length; bi++) {
        var bmp = bumpers[bi], dx = ballX - bmp.x, dy = ballY - bmp.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BALL_R + BUMPER_R && dist > 0) {
          var nx = dx / dist, ny = dy / dist; ballX = bmp.x + nx * (BALL_R + BUMPER_R + 2); ballY = bmp.y + ny * (BALL_R + BUMPER_R + 2);
          var newSpd = Math.min(1200, Math.sqrt(ballVx * ballVx + ballVy * ballVy) * 1.1 + 200); ballVx = nx * newSpd; ballVy = ny * newSpd; bumperFlash[bi] = 0.3; game.audio.play('se_tap', 0.06);
        }
        if (bumperFlash[bi] > 0) bumperFlash[bi] -= dt * 3;
      }
      if (ballY + BALL_R > FLIPPER_Y && ballY + BALL_R < FLIPPER_Y + FLIPPER_H + 20 && ballX > flipperX - FLIPPER_W / 2 && ballX < flipperX + FLIPPER_W / 2 && ballVy > 0) {
        ballY = FLIPPER_Y - BALL_R; var hitOffset = (ballX - flipperX) / (FLIPPER_W / 2); ballVy = -Math.abs(ballVy) * 0.85 - 200; ballVx = hitOffset * 600 + ballVx * 0.3;
        var spd = Math.sqrt(ballVx * ballVx + ballVy * ballVy); if (spd > 1200) { ballVx = ballVx / spd * 1200; ballVy = ballVy / spd * 1200; }
        score++; flash = 0.14; flashCol = C.b; resultText = 'BOUNCE!'; resultTimer = 0.28; game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 5; p++) { var pa = -Math.PI * 0.6 + Math.random() * Math.PI * 1.2; particles.push({ x: ballX, y: FLIPPER_Y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120 - 80, life: 0.3, col: C.c }); }
        if (score >= NEEDED) { finish(true); return; }
      }
      if (ballY > FLOOR_Y + 100) { drops++; flash = 0.4; flashCol = C.a; resultText = 'DROP!'; resultTimer = 0.5; game.audio.play('se_failure', 0.4); resetBall(); if (drops >= MAX_DROP) { finish(false); return; } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 400 * dt; p2.life -= dt * 3; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, FLOOR_Y + 130, 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < drops ? C.a : '#0a0d16');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
