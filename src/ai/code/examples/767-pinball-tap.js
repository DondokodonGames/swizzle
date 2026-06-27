// 767-pinball-tap.js
// ピンボールタップ — バウンドするボールを落とさないようにタップで打ち返せ
// 操作: タップでフリッパーをX位置に瞬時ワープ、ボールを跳ね返せ
// 成功: 50回打ち返す  失敗: 5回落下 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060c',
    wall:    '#1e293b',
    wallHi:  '#334155',
    flipper: '#f97316',
    flipHi:  '#fde68a',
    ball:    '#e2e8f0',
    ballHi:  '#ffffff',
    bumper:  '#a855f7',
    bumperHi:'#d8b4fe',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060810'
  };

  var WALL_T = 32;
  var FLOOR_Y = H - 120;
  var FLIPPER_Y = FLOOR_Y - 12;
  var FLIPPER_W = 200;
  var FLIPPER_H = 28;
  var BALL_R = 28;
  var BUMPER_R = 52;

  var ballX = W / 2;
  var ballY = H * 0.4;
  var ballVx = (Math.random() - 0.5) * 400;
  var ballVy = 300;
  var GRAVITY = 900;

  var flipperX = W / 2;
  var targetFlipperX = W / 2;

  // Bumpers (static obstacles)
  var bumpers = [
    { x: W * 0.28, y: H * 0.35 },
    { x: W * 0.72, y: H * 0.35 },
    { x: W * 0.5,  y: H * 0.25 },
    { x: W * 0.18, y: H * 0.55 },
    { x: W * 0.82, y: H * 0.55 }
  ];
  var bumperFlash = [];
  for (var bi = 0; bi < bumpers.length; bi++) bumperFlash.push(0);

  var score = 0;
  var NEEDED = 50;
  var lives = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function resetBall() {
    ballX = W / 2 + (Math.random() - 0.5) * 200;
    ballY = H * 0.35;
    ballVx = (Math.random() - 0.5) * 500;
    ballVy = 200;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetFlipperX = Math.max(FLIPPER_W / 2 + WALL_T, Math.min(W - FLIPPER_W / 2 - WALL_T, tx));
    flipperX = targetFlipperX;
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

    // Ball physics
    ballVy += GRAVITY * dt;
    ballX += ballVx * dt;
    ballY += ballVy * dt;

    // Wall collisions
    if (ballX - BALL_R < WALL_T) {
      ballX = WALL_T + BALL_R;
      ballVx = Math.abs(ballVx) * 0.9;
    }
    if (ballX + BALL_R > W - WALL_T) {
      ballX = W - WALL_T - BALL_R;
      ballVx = -Math.abs(ballVx) * 0.9;
    }
    if (ballY - BALL_R < WALL_T) {
      ballY = WALL_T + BALL_R;
      ballVy = Math.abs(ballVy) * 0.85;
    }

    // Bumper collisions
    for (var bi = 0; bi < bumpers.length; bi++) {
      var bmp = bumpers[bi];
      var dx = ballX - bmp.x;
      var dy = ballY - bmp.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BALL_R + BUMPER_R) {
        var nx = dx / dist;
        var ny = dy / dist;
        ballX = bmp.x + nx * (BALL_R + BUMPER_R + 2);
        ballY = bmp.y + ny * (BALL_R + BUMPER_R + 2);
        var speed = Math.sqrt(ballVx * ballVx + ballVy * ballVy);
        var newSpd = Math.min(1200, speed * 1.1 + 200);
        ballVx = nx * newSpd;
        ballVy = ny * newSpd;
        bumperFlash[bi] = 0.3;
        game.audio.play('se_tap', 0.06);
      }
      if (bumperFlash[bi] > 0) bumperFlash[bi] -= dt * 3;
    }

    // Flipper collision
    if (ballY + BALL_R > FLIPPER_Y && ballY + BALL_R < FLIPPER_Y + FLIPPER_H + 20 &&
        ballX > flipperX - FLIPPER_W / 2 && ballX < flipperX + FLIPPER_W / 2) {
      ballY = FLIPPER_Y - BALL_R;
      var hitOffset = (ballX - flipperX) / (FLIPPER_W / 2);
      ballVy = -Math.abs(ballVy) * 0.85 - 200;
      ballVx = hitOffset * 600 + ballVx * 0.3;
      // Clamp speed
      var spd = Math.sqrt(ballVx * ballVx + ballVy * ballVy);
      if (spd > 1200) { ballVx = ballVx / spd * 1200; ballVy = ballVy / spd * 1200; }
      score++;
      flashCol = C.correct;
      flashAnim = 0.14;
      resultText = '返し！';
      resultTimer = 0.28;
      game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 4; p++) {
        var pa = -Math.PI * 0.6 + Math.random() * Math.PI * 1.2;
        particles.push({ x: ballX, y: FLIPPER_Y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120 - 80, life: 0.3, col: C.flipHi });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 150); }, 700);
      }
    }

    // Ball fell below floor
    if (ballY > FLOOR_Y + 60) {
      lives--;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '落下！！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.4);
      resetBall();
      if (lives <= 0 && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 0, WALL_T, H, C.wall, 0.9);
    game.draw.rect(W - WALL_T, 0, WALL_T, H, C.wall, 0.9);
    game.draw.rect(0, 0, W, WALL_T, C.wall, 0.9);
    game.draw.rect(WALL_T, 0, W - WALL_T * 2, 6, C.wallHi, 0.4);
    game.draw.rect(0, 0, 6, H, C.wallHi, 0.3);
    game.draw.rect(W - 6, 0, 6, H, C.wallHi, 0.3);

    // Floor (danger zone)
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#1a0505', 0.9);
    game.draw.rect(0, FLOOR_Y, W, 6, C.wrong, 0.5);

    // Bumpers
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var bmp2 = bumpers[bi2];
      var glow = bumperFlash[bi2];
      if (glow > 0) {
        game.draw.circle(bmp2.x, bmp2.y, BUMPER_R + 20, C.bumperHi, glow * 0.3);
      }
      game.draw.circle(bmp2.x + 4, bmp2.y + 4, BUMPER_R, '#000', 0.3);
      game.draw.circle(bmp2.x, bmp2.y, BUMPER_R, glow > 0 ? C.bumperHi : C.bumper, 0.9);
      game.draw.circle(bmp2.x - BUMPER_R * 0.3, bmp2.y - BUMPER_R * 0.3, BUMPER_R * 0.2, '#fff', 0.35);
    }

    // Flipper
    game.draw.rect(flipperX - FLIPPER_W / 2 + 4, FLIPPER_Y + 4, FLIPPER_W, FLIPPER_H, '#000', 0.3);
    game.draw.rect(flipperX - FLIPPER_W / 2, FLIPPER_Y, FLIPPER_W, FLIPPER_H, C.flipper, 0.95);
    game.draw.rect(flipperX - FLIPPER_W / 2, FLIPPER_Y, FLIPPER_W, 8, C.flipHi, 0.5);
    game.draw.circle(flipperX - FLIPPER_W / 2, FLIPPER_Y + FLIPPER_H / 2, FLIPPER_H / 2, C.flipper, 0.95);
    game.draw.circle(flipperX + FLIPPER_W / 2, FLIPPER_Y + FLIPPER_H / 2, FLIPPER_H / 2, C.flipper, 0.95);

    // Ball
    game.draw.circle(ballX + 3, ballY + 3, BALL_R, '#000', 0.3);
    game.draw.circle(ballX, ballY, BALL_R, C.ball, 0.95);
    game.draw.circle(ballX - BALL_R * 0.32, ballY - BALL_R * 0.32, BALL_R * 0.22, C.ballHi, 0.75);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('タップでフリッパー移動', W / 2, FLOOR_Y + 38, { size: 34, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    // Lives
    for (var li = 0; li < 5; li++) {
      game.draw.circle(W / 2 - 4 * 64 + li * 128, H * 0.955, 24, li < lives ? C.flipper : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
