// 694-pinball.js
// ピンボール — 落ちてくるボールをフリッパーで打ち返し、バンパーに当てて得点する
// 操作: タップでフリッパーを跳ね上げてボールを打つ。ボールを下に落とさない
// 成功: 10点 獲得  失敗: 3回 ボールロスト or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台／バンパー色は保持） ──
  var C = { bg:'#060210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FLIPPER = '#7700ff', FLIP_HI = '#a855f7', TA = '#ff2079', TB = '#ff6600', TC = '#00ff41';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL';
  var HOW_TO_PLAY = 'TAP TO FLIP AND HIT THE BUMPERS · DO NOT LET THE BALL DRAIN';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 20 → 10
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var CXX = W / 2, FLIPPER_Y = snap(H * 0.82), FLIPPER_LEN = 240, FLIPPER_W = 28, FLIPPER_PIVOT_X = CXX;
  var FLOOR_Y = snap(H * 0.9), CEIL_Y = 260, WALL_X = 60, ballR = 28, GRAVITY = 900;
  var FLIP_UP = -0.35, FLIP_DOWN = 0.45;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flipAngle, flipTarget, flipTimer, ballX, ballY, ballVX, ballVY, targets, score, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#070415');
  }

  function background() { game.draw.clear(C.bg); }

  function makeTargets() {
    return [
      { x: CXX - 200, y: snap(H * 0.38), r: 52, col: TA, pts: 3, flash: 0 },
      { x: CXX + 200, y: snap(H * 0.38), r: 52, col: TB, pts: 3, flash: 0 },
      { x: CXX,       y: snap(H * 0.31), r: 52, col: TC, pts: 5, flash: 0 },
      { x: CXX - 280, y: snap(H * 0.52), r: 44, col: TB, pts: 2, flash: 0 },
      { x: CXX + 280, y: snap(H * 0.52), r: 44, col: TA, pts: 2, flash: 0 }
    ];
  }

  function resetBall() { ballX = CXX + (Math.random() - 0.5) * 200; ballY = CEIL_Y + 100; ballVX = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 80); ballVY = 200 + Math.random() * 100; }

  function initGame() { flipAngle = FLIP_DOWN; flipTarget = FLIP_DOWN; flipTimer = 0; targets = makeTargets(); score = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; resetBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 100) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, CEIL_Y, WALL_X, H - CEIL_Y, '#1e1b4b', 0.9); game.draw.rect(W - WALL_X, CEIL_Y, WALL_X, H - CEIL_Y, '#1e1b4b', 0.9);
    game.draw.rect(WALL_X, FLOOR_Y, W - WALL_X * 2, H * 0.1, C.a, 0.08);
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3], bright = t3.flash > 0 ? t3.flash : 0;
      pc(t3.x, t3.y, t3.r, t3.col, 0.75 + bright * 0.25);
      if (bright > 0) pc(t3.x, t3.y, t3.r + 16, t3.col, bright * 0.35);
      txt('+' + t3.pts, t3.x, t3.y + 12, 36, C.g);
    }
    var cos2 = Math.cos(flipAngle), sin2 = Math.sin(flipAngle);
    var fx1 = FLIPPER_PIVOT_X - cos2 * FLIPPER_LEN / 2, fy1 = FLIPPER_Y + sin2 * FLIPPER_LEN / 2, fx2 = FLIPPER_PIVOT_X + cos2 * FLIPPER_LEN / 2, fy2 = FLIPPER_Y - sin2 * FLIPPER_LEN / 2;
    game.draw.line(fx1, fy1, fx2, fy2, FLIPPER, FLIPPER_W); game.draw.line(fx1, fy1, fx2, fy2, FLIP_HI, 8);
    pc(FLIPPER_PIVOT_X, FLIPPER_Y, 18, FLIP_HI, 0.9);
    pc(ballX, ballY, ballR, C.g, 0.95); pc(ballX - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.25, C.g, 0.6);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    flipTarget = FLIP_UP; flipTimer = 0.22; game.audio.play('se_tap', 0.12);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.95, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TILT MASTER!' : 'GAME OVER', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (flipTimer > 0) { flipTimer -= dt; if (flipTimer <= 0) flipTarget = FLIP_DOWN; }
      flipAngle += (flipTarget - flipAngle) * Math.min(1, dt * 18);
      for (var ti = 0; ti < targets.length; ti++) if (targets[ti].flash > 0) targets[ti].flash -= dt * 4;
      ballVY += GRAVITY * dt; ballX += ballVX * dt; ballY += ballVY * dt;
      if (ballX < WALL_X + ballR) { ballX = WALL_X + ballR; ballVX = Math.abs(ballVX); }
      if (ballX > W - WALL_X - ballR) { ballX = W - WALL_X - ballR; ballVX = -Math.abs(ballVX); }
      if (ballY < CEIL_Y + ballR) { ballY = CEIL_Y + ballR; ballVY = Math.abs(ballVY); }
      var cos = Math.cos(flipAngle), sin = Math.sin(flipAngle);
      if (ballY + ballR > FLIPPER_Y - FLIPPER_W && ballY - ballR < FLIPPER_Y + FLIPPER_W) {
        var rx = (ballX - FLIPPER_PIVOT_X) * cos + (ballY - FLIPPER_Y) * sin, ry = -(ballX - FLIPPER_PIVOT_X) * sin + (ballY - FLIPPER_Y) * cos;
        if (Math.abs(rx) < FLIPPER_LEN / 2 + ballR && ry < ballR && ry > -FLIPPER_W - ballR) {
          var nx = -sin, ny = cos, dot = ballVX * nx + ballVY * ny;
          if (dot < 0) {
            var boost = flipTarget === FLIP_UP ? 1.3 : 1.05;
            ballVX = (ballVX - 2 * dot * nx) * boost; ballVY = (ballVY - 2 * dot * ny) * boost;
            var nspeed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
            if (nspeed > 1400) { ballVX = ballVX / nspeed * 1400; ballVY = ballVY / nspeed * 1400; }
            var pushOut = ballR - ry; ballX += nx * pushOut; ballY += ny * pushOut;
          }
        }
      }
      if (ballY > FLOOR_Y + ballR * 2) {
        misses++; game.audio.play('se_failure', 0.35); flash = 0.4; flashCol = C.a; resultText = 'BALL LOST!'; resultTimer = 0.6;
        for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: ballX, y: FLOOR_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.a }); }
        if (misses >= MAX_MISS) { finish(false); return; }
        resetBall();
      }
      for (var ti2 = 0; ti2 < targets.length; ti2++) {
        var t = targets[ti2], dx = ballX - t.x, dy = ballY - t.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < t.r + ballR && dist > 0) {
          var nx2 = dx / dist, ny2 = dy / dist, dot2 = ballVX * nx2 + ballVY * ny2;
          if (dot2 < 0) {
            ballVX -= 2 * dot2 * nx2; ballVY -= 2 * dot2 * ny2;
            var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY); ballVX = ballVX / spd * Math.max(spd, 600); ballVY = ballVY / spd * Math.max(spd, 600);
            var overlap = t.r + ballR - dist; ballX += nx2 * overlap; ballY += ny2 * overlap;
            score += t.pts; t.flash = 1.0; game.audio.play('se_tap', 0.2);
            for (var p2 = 0; p2 < 4; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(pa2) * 160, vy: Math.sin(pa2) * 160, life: 0.35, col: t.col }); }
            if (score >= NEEDED) { finish(true); return; }
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2.5; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.72), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#070415');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
