// 694-pinball.js
// フリッパー — 落ちてくるボールをフリッパーで跳ね返し、ターゲットに当てろ
// 操作: タップでフリッパーを上げる
// 成功: 20点獲得  失敗: 5回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060210',
    wall:    '#1e1b4b',
    flipper: '#7c3aed',
    flipHi:  '#a78bfa',
    ball:    '#f1f5f9',
    ballHi:  '#ffffff',
    targetA: '#dc2626',
    targetB: '#d97706',
    targetC: '#16a34a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#070415'
  };

  var CX = W / 2;
  var FLIPPER_Y = H * 0.82;
  var FLIPPER_LEN = 240;
  var FLIPPER_W = 28;
  var FLIPPER_PIVOT_X = CX;
  var FLOOR_Y = H * 0.9;
  var CEIL_Y = 160;

  // Flipper angle: 0 = flat, negative = raised left, positive = raised right
  // We have one flipper centered, tapping raises it
  var flipAngle = 0.45; // resting (angled down)
  var flipTarget = 0.45;
  var FLIP_UP = -0.35;
  var FLIP_DOWN = 0.45;
  var flipTimer = 0;

  var ballX = CX;
  var ballY = CEIL_Y + 200;
  var ballVX = 180;
  var ballVY = 0;
  var ballR = 28;
  var GRAVITY = 900;

  // Targets (bumpers)
  var targets = [
    { x: CX - 200, y: H * 0.35, r: 52, col: C.targetA, pts: 3, flash: 0 },
    { x: CX + 200, y: H * 0.35, r: 52, col: C.targetB, pts: 3, flash: 0 },
    { x: CX,       y: H * 0.28, r: 52, col: C.targetC, pts: 5, flash: 0 },
    { x: CX - 280, y: H * 0.5,  r: 44, col: C.targetB, pts: 2, flash: 0 },
    { x: CX + 280, y: H * 0.5,  r: 44, col: C.targetA, pts: 2, flash: 0 }
  ];

  var score = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var WALL_X = 60;

  function resetBall() {
    ballX = CX + (Math.random() - 0.5) * 200;
    ballY = CEIL_Y + 100;
    ballVX = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 80);
    ballVY = 200 + Math.random() * 100;
  }

  function flipperSurface() {
    // Returns the normal vector and a point on the flipper surface
    var cos = Math.cos(flipAngle);
    var sin = Math.sin(flipAngle);
    // Flipper is centered at FLIPPER_PIVOT_X, FLIPPER_Y
    // extends left/right by FLIPPER_LEN/2
    return {
      nx: -sin,
      ny: cos,
      px: FLIPPER_PIVOT_X,
      py: FLIPPER_Y
    };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    flipTarget = FLIP_UP;
    flipTimer = 0.22;
    game.audio.play('se_tap', 0.12);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Flipper animation
    if (flipTimer > 0) {
      flipTimer -= dt;
      if (flipTimer <= 0) flipTarget = FLIP_DOWN;
    }
    flipAngle += (flipTarget - flipAngle) * Math.min(1, dt * 18);

    for (var ti = 0; ti < targets.length; ti++) {
      if (targets[ti].flash > 0) targets[ti].flash -= dt * 4;
    }

    // Ball physics
    ballVY += GRAVITY * dt;
    ballX += ballVX * dt;
    ballY += ballVY * dt;

    // Wall bounces
    if (ballX < WALL_X + ballR) { ballX = WALL_X + ballR; ballVX = Math.abs(ballVX); }
    if (ballX > W - WALL_X - ballR) { ballX = W - WALL_X - ballR; ballVX = -Math.abs(ballVX); }
    if (ballY < CEIL_Y + ballR) { ballY = CEIL_Y + ballR; ballVY = Math.abs(ballVY); }

    // Flipper collision
    var cos = Math.cos(flipAngle);
    var sin = Math.sin(flipAngle);
    // Check if ball is near flipper
    if (ballY + ballR > FLIPPER_Y - FLIPPER_W && ballY - ballR < FLIPPER_Y + FLIPPER_W) {
      // Transform ball position into flipper space
      var rx = (ballX - FLIPPER_PIVOT_X) * cos + (ballY - FLIPPER_Y) * sin;
      var ry = -(ballX - FLIPPER_PIVOT_X) * sin + (ballY - FLIPPER_Y) * cos;
      if (Math.abs(rx) < FLIPPER_LEN / 2 + ballR && ry < ballR && ry > -FLIPPER_W - ballR) {
        // Reflect velocity in flipper normal direction
        var nx = -sin;
        var ny = cos;
        var dot = ballVX * nx + ballVY * ny;
        if (dot < 0) {
          var speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
          var boost = flipTarget === FLIP_UP ? 1.3 : 1.05;
          ballVX = (ballVX - 2 * dot * nx) * boost;
          ballVY = (ballVY - 2 * dot * ny) * boost;
          // Clamp max speed
          var nspeed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
          if (nspeed > 1400) { ballVX = ballVX / nspeed * 1400; ballVY = ballVY / nspeed * 1400; }
          // Push out of flipper
          var pushOut = ballR - ry;
          ballX += nx * pushOut;
          ballY += ny * pushOut;
        }
      }
    }

    // Ball lost (below floor)
    if (ballY > FLOOR_Y + ballR * 2) {
      misses++;
      game.audio.play('se_failure', 0.35);
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = 'ミス！';
      resultTimer = 0.6;
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: ballX, y: FLOOR_Y, vx: Math.cos(pa)*180, vy: Math.sin(pa)*180, life: 0.4, col: C.wrong });
      }
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        resetBall();
      }
    }

    // Target (bumper) collision
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var t = targets[ti2];
      var dx = ballX - t.x;
      var dy = ballY - t.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < t.r + ballR && dist > 0) {
        var nx2 = dx / dist;
        var ny2 = dy / dist;
        var dot2 = ballVX * nx2 + ballVY * ny2;
        if (dot2 < 0) {
          ballVX -= 2 * dot2 * nx2;
          ballVY -= 2 * dot2 * ny2;
          // Boost away from bumper
          var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
          ballVX = ballVX / spd * Math.max(spd, 600);
          ballVY = ballVY / spd * Math.max(spd, 600);
          // Push out
          var overlap = t.r + ballR - dist;
          ballX += nx2 * overlap;
          ballY += ny2 * overlap;

          score += t.pts;
          t.flash = 1.0;
          game.audio.play('se_tap', 0.2);
          for (var p2 = 0; p2 < 4; p2++) {
            var pa2 = Math.random() * Math.PI * 2;
            particles.push({ x: t.x, y: t.y, vx: Math.cos(pa2)*160, vy: Math.sin(pa2)*160, life: 0.35, col: t.col });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 80); }, 700);
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, CEIL_Y, WALL_X, H - CEIL_Y, C.wall, 0.9);
    game.draw.rect(W - WALL_X, CEIL_Y, WALL_X, H - CEIL_Y, C.wall, 0.9);

    // Floor drain area (lower than flipper)
    game.draw.rect(WALL_X, FLOOR_Y, W - WALL_X * 2, H * 0.1, C.wrong, 0.08);

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3];
      var bright = t3.flash > 0 ? t3.flash : 0;
      game.draw.circle(t3.x + 4, t3.y + 4, t3.r, '#000', 0.3);
      game.draw.circle(t3.x, t3.y, t3.r, t3.col, 0.7 + bright * 0.3);
      if (bright > 0) game.draw.circle(t3.x, t3.y, t3.r + 16, t3.col, bright * 0.35);
      game.draw.text('+' + t3.pts, t3.x, t3.y + 14, { size: 36, color: '#fff', bold: true });
    }

    // Flipper
    var cos2 = Math.cos(flipAngle);
    var sin2 = Math.sin(flipAngle);
    var fx1 = FLIPPER_PIVOT_X - cos2 * FLIPPER_LEN / 2;
    var fy1 = FLIPPER_Y + sin2 * FLIPPER_LEN / 2;
    var fx2 = FLIPPER_PIVOT_X + cos2 * FLIPPER_LEN / 2;
    var fy2 = FLIPPER_Y - sin2 * FLIPPER_LEN / 2;
    game.draw.line(fx1, fy1, fx2, fy2, C.flipper, FLIPPER_W);
    game.draw.line(fx1, fy1, fx2, fy2, C.flipHi, 8);
    game.draw.circle(FLIPPER_PIVOT_X, FLIPPER_Y, 20, C.flipHi, 0.9);

    // Ball trail
    game.draw.circle(ballX - ballVX * 0.04, ballY - ballVY * 0.04, ballR * 0.6, C.ball, 0.2);
    // Ball
    game.draw.circle(ballX + 3, ballY + 3, ballR, '#000', 0.35);
    game.draw.circle(ballX, ballY, ballR, C.ball, 0.95);
    game.draw.circle(ballX - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.25, C.ballHi, 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    resetBall();
  });
})(game);
