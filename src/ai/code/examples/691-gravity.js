// 691-gravity.js
// 重力反転 — タップで重力を逆にしてボールを障害物の隙間に通せ
// 操作: タップで重力を上下反転
// 成功: 25個通過  失敗: 5回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050210',
    ball:    '#a78bfa',
    ballHi:  '#ddd6fe',
    obsA:    '#1e3a5f',
    obsB:    '#0f2545',
    gap:     '#22c55e',
    trail:   '#7c3aed',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#07041a'
  };

  var BALL_X = W * 0.25;
  var CEIL_Y = 160;
  var FLOOR_Y = H * 0.88;
  var PLAY_H = FLOOR_Y - CEIL_Y;

  var ballY = (CEIL_Y + FLOOR_Y) / 2;
  var ballVY = 0;
  var ballR = 36;
  var gravDir = 1; // 1=down, -1=up
  var GRAVITY = 1600;

  var obstacles = [];
  var obsSpeed = 280;
  var OBS_W = 60;
  var GAP_H = 320;
  var spawnTimer = 0;
  var SPAWN_RATE = 1.8;

  var passed = 0;
  var NEEDED = 25;
  var hits = 0;
  var MAX_HIT = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var iframes = 0;
  var trail = [];

  function spawnObs() {
    var gapY = CEIL_Y + 60 + Math.random() * (PLAY_H - GAP_H - 120);
    obstacles.push({ x: W + OBS_W, gapY: gapY, gapH: GAP_H, scored: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    gravDir *= -1;
    ballVY = 0;
    game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 3; p++) {
      particles.push({ x: BALL_X, y: ballY, vx: (Math.random()-0.5)*80, vy: (Math.random()-0.5)*80, life: 0.3, col: C.ballHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (iframes > 0) iframes -= dt;

    // Ball physics
    ballVY += GRAVITY * gravDir * dt;
    ballY += ballVY * dt;
    if (ballY < CEIL_Y + ballR) { ballY = CEIL_Y + ballR; ballVY = Math.abs(ballVY) * 0.3; }
    if (ballY > FLOOR_Y - ballR) { ballY = FLOOR_Y - ballR; ballVY = -Math.abs(ballVY) * 0.3; }

    // Trail
    trail.push({ x: BALL_X, y: ballY, life: 0.25 });

    // Obstacles
    obsSpeed = 280 + elapsed * 4;
    spawnTimer += dt;
    var rate = Math.max(0.9, SPAWN_RATE - elapsed * 0.01);
    if (spawnTimer >= rate) { spawnTimer = 0; spawnObs(); }

    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= obsSpeed * dt;

      // Score when ball passes
      if (!o.scored && o.x + OBS_W < BALL_X) {
        o.scored = true;
        passed++;
        game.audio.play('se_tap', 0.08);
        if (passed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(passed * 200 + Math.ceil(timeLeft) * 80); }, 700);
        }
      }

      // Collision
      if (iframes <= 0 && o.x < BALL_X + ballR && o.x + OBS_W > BALL_X - ballR) {
        var inGap = ballY - ballR > o.gapY && ballY + ballR < o.gapY + o.gapH;
        if (!inGap) {
          hits++;
          iframes = 1.2;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: BALL_X, y: ballY, vx: Math.cos(pa)*200, vy: Math.sin(pa)*200, life: 0.4, col: C.wrong });
          }
          if (hits >= MAX_HIT && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }

      if (o.x < -OBS_W * 2) obstacles.splice(i, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }
    for (var tr = trail.length - 1; tr >= 0; tr--) {
      trail[tr].life -= dt * 5;
      if (trail[tr].life <= 0) trail.splice(tr, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, CEIL_Y, '#000000', 0.5);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#000000', 0.5);
    game.draw.line(0, CEIL_Y, W, CEIL_Y, '#ffffff18', 3);
    game.draw.line(0, FLOOR_Y, W, FLOOR_Y, '#ffffff18', 3);

    // Speed lines
    for (var sl = 0; sl < 6; sl++) {
      var slY = CEIL_Y + ((elapsed * obsSpeed + sl * PLAY_H / 6) % PLAY_H);
      game.draw.line(BALL_X + 60, slY, W, slY, '#ffffff06', 2);
    }

    // Obstacles
    for (var oi = 0; oi < obstacles.length; oi++) {
      var obs = obstacles[oi];
      game.draw.rect(obs.x, CEIL_Y, OBS_W, obs.gapY - CEIL_Y, C.obsA, 0.9);
      game.draw.rect(obs.x, obs.gapY + obs.gapH, OBS_W, FLOOR_Y - obs.gapY - obs.gapH, C.obsA, 0.9);
      game.draw.rect(obs.x, obs.gapY - 6, OBS_W, 12, C.gap, 0.4);
      game.draw.rect(obs.x, obs.gapY + obs.gapH - 6, OBS_W, 12, C.gap, 0.4);
    }

    // Ball trail
    for (var tr2 = 0; tr2 < trail.length; tr2++) {
      var t = trail[tr2];
      game.draw.circle(t.x, t.y, ballR * t.life * 1.5, C.trail, t.life * 0.4);
    }

    // Ball
    var ballAlpha = iframes > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 0.9;
    game.draw.circle(BALL_X + 4, ballY + 4, ballR, '#000', 0.3);
    game.draw.circle(BALL_X, ballY, ballR, C.ball, ballAlpha);
    game.draw.circle(BALL_X - ballR * 0.3, ballY - ballR * 0.35, ballR * 0.22, C.ballHi, ballAlpha * 0.5);
    // Gravity indicator arrow
    var arrowDir = gravDir;
    game.draw.line(BALL_X, ballY, BALL_X, ballY + arrowDir * 60, C.ballHi, 4);
    game.draw.line(BALL_X - 12, ballY + arrowDir * 40, BALL_X, ballY + arrowDir * 60, C.ballHi, 4);
    game.draw.line(BALL_X + 12, ballY + arrowDir * 40, BALL_X, ballY + arrowDir * 60, C.ballHi, 4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 7 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.wrong, flashAnim * 0.1);

    // Hit indicators
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 52 + hi * 104, H * 0.955, 20, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnObs();
  });
})(game);
