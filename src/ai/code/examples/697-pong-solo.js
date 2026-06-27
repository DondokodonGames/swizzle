// 697-pong-solo.js
// ひとりポン — ボールが壁で跳ね返るたびパドルを合わせてラリーを続けろ
// 操作: タップした横座標にパドルが瞬間移動
// 成功: 30回ラリー  失敗: 5回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#02060f',
    paddle:  '#38bdf8',
    paddHi:  '#e0f2fe',
    ball:    '#f1f5f9',
    wall:    '#0f172a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030810',
    trail:   '#1e3a5f'
  };

  var PADDLE_Y = H * 0.85;
  var PADDLE_W = 220;
  var PADDLE_H = 28;
  var BALL_R = 24;
  var WALL_Y = 180;

  var paddleX = W / 2;
  var paddleTargetX = W / 2;

  var ballX = W / 2;
  var ballY = WALL_Y + 200;
  var ballSpeed = 600;
  var ballAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  var ballVX = Math.cos(ballAngle) * ballSpeed;
  var ballVY = Math.sin(ballAngle) * ballSpeed;

  var rally = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var trail = [];
  var hitFlash = 0;

  function launchBall() {
    ballX = W / 2;
    ballY = WALL_Y + 200;
    ballSpeed = 600 + rally * 6;
    var angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
    ballVX = Math.cos(angle) * ballSpeed * (Math.random() > 0.5 ? 1 : -1);
    ballVY = Math.abs(Math.sin(angle) * ballSpeed);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    paddleTargetX = Math.max(PADDLE_W / 2 + 20, Math.min(W - PADDLE_W / 2 - 20, tx));
    game.audio.play('se_tap', 0.06);
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
    if (hitFlash > 0) hitFlash -= dt * 4;

    // Paddle smooth movement
    paddleX += (paddleTargetX - paddleX) * Math.min(1, dt * 22);

    // Ball physics
    ballX += ballVX * dt;
    ballY += ballVY * dt;

    // Wall bounces
    if (ballX < BALL_R + 20) { ballX = BALL_R + 20; ballVX = Math.abs(ballVX); }
    if (ballX > W - BALL_R - 20) { ballX = W - BALL_R - 20; ballVX = -Math.abs(ballVX); }
    if (ballY < WALL_Y + BALL_R) {
      ballY = WALL_Y + BALL_R;
      ballVY = Math.abs(ballVY);
      for (var p = 0; p < 3; p++) {
        var pa = Math.random() * Math.PI;
        particles.push({ x: ballX, y: WALL_Y, vx: Math.cos(pa) * 120, vy: Math.abs(Math.sin(pa)) * 80, life: 0.3, col: '#38bdf833' });
      }
    }

    // Paddle collision
    if (ballVY > 0 && ballY + BALL_R > PADDLE_Y - PADDLE_H / 2 && ballY - BALL_R < PADDLE_Y + PADDLE_H / 2) {
      if (ballX > paddleX - PADDLE_W / 2 - BALL_R && ballX < paddleX + PADDLE_W / 2 + BALL_R) {
        // Hit!
        ballY = PADDLE_Y - PADDLE_H / 2 - BALL_R;
        // Angle based on hit position
        var hitPos = (ballX - paddleX) / (PADDLE_W / 2);
        var bounceAngle = hitPos * 0.9; // -0.9 to 0.9 radians from vertical
        var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.04;
        if (spd > 1200) spd = 1200;
        ballVX = Math.sin(bounceAngle) * spd;
        ballVY = -Math.abs(Math.cos(bounceAngle) * spd);

        rally++;
        hitFlash = 0.25;
        game.audio.play('se_tap', 0.18);
        for (var p2 = 0; p2 < 6; p2++) {
          var pa2 = Math.PI + Math.random() * Math.PI;
          particles.push({ x: ballX, y: PADDLE_Y, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.4, col: C.paddHi });
        }
        if (rally >= NEEDED && !done) {
          done = true;
          flashCol = C.correct;
          flashAnim = 0.4;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(rally * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    // Ball missed (below paddle)
    if (ballY > PADDLE_Y + 100) {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.45;
      resultText = 'ミス！';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.4);
      for (var p3 = 0; p3 < 5; p3++) {
        var pa3 = Math.random() * Math.PI * 2;
        particles.push({ x: ballX, y: PADDLE_Y + 60, vx: Math.cos(pa3) * 180, vy: Math.sin(pa3) * 180, life: 0.5, col: C.wrong });
      }
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        launchBall();
      }
    }

    // Trail
    trail.push({ x: ballX, y: ballY, life: 0.2 });
    for (var tr = trail.length - 1; tr >= 0; tr--) {
      trail[tr].life -= dt * 5;
      if (trail[tr].life <= 0) trail.splice(tr, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Court walls
    game.draw.rect(0, WALL_Y - 16, W, 16, C.wall, 0.9);
    game.draw.line(0, WALL_Y, W, WALL_Y, '#ffffff15', 2);
    game.draw.rect(0, WALL_Y, 20, H - WALL_Y, C.wall, 0.9);
    game.draw.rect(W - 20, WALL_Y, 20, H - WALL_Y, C.wall, 0.9);

    // Ball trail
    for (var tr2 = 0; tr2 < trail.length; tr2++) {
      var t = trail[tr2];
      game.draw.circle(t.x, t.y, BALL_R * t.life * 2, C.trail, t.life * 0.5);
    }

    // Ball
    game.draw.circle(ballX + 3, ballY + 3, BALL_R, '#000', 0.35);
    game.draw.circle(ballX, ballY, BALL_R, C.ball, 0.95);
    game.draw.circle(ballX - BALL_R * 0.3, ballY - BALL_R * 0.3, BALL_R * 0.25, '#fff', 0.6);

    // Paddle
    var pAlpha = hitFlash > 0 ? 0.95 : 0.85;
    game.draw.rect(paddleX - PADDLE_W / 2 + 3, PADDLE_Y - PADDLE_H / 2 + 3, PADDLE_W, PADDLE_H, '#000', 0.3);
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y - PADDLE_H / 2, PADDLE_W, PADDLE_H, hitFlash > 0 ? C.paddHi : C.paddle, pAlpha);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.73, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(rally + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    launchBall();
  });
})(game);
