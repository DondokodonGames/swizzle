// 255-neon-pinball.js
// ネオンピンボール — シンプルなピンボール台で高得点を狙う
// 操作: 左右のフリッパーをタップで操作
// 成功: 500点獲得  失敗: ボール3個失う or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020109',
    wall:   '#1e3a5f',
    wallHi: '#3b82f6',
    flip:   '#a855f7',
    flipHi: '#d8b4fe',
    ball:   '#fde68a',
    ballHi: '#fff',
    bumper: '#ef4444',
    bumHi:  '#fca5a5',
    score:  '#22c55e',
    ui:     '#475569'
  };

  var FLIPPER_Y = H * 0.88;
  var FLIPPER_LEN = 160;
  var FLIPPER_W = 18;
  var LEFT_BASE_X = W * 0.2;
  var RIGHT_BASE_X = W * 0.8;
  var FLIPPER_ANGLE_REST = 0.5;  // radians down
  var FLIPPER_ANGLE_UP = -0.5;   // radians up
  var leftAngle = FLIPPER_ANGLE_REST;
  var rightAngle = Math.PI - FLIPPER_ANGLE_REST;
  var leftTarget = FLIPPER_ANGLE_REST;
  var rightTarget = Math.PI - FLIPPER_ANGLE_REST;

  var GRAVITY = 900;
  var ball = { x: W / 2, y: H * 0.4, vx: 80, vy: -400, r: 18 };
  var lives = 3;
  var score = 0;
  var NEEDED = 500;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];

  // Bumpers
  var bumpers = [
    { x: W * 0.3, y: H * 0.3, r: 36, score: 20 },
    { x: W * 0.7, y: H * 0.3, r: 36, score: 20 },
    { x: W * 0.5, y: H * 0.2, r: 36, score: 30 },
    { x: W * 0.25, y: H * 0.45, r: 28, score: 15 },
    { x: W * 0.75, y: H * 0.45, r: 28, score: 15 }
  ];
  var bumperHit = new Array(bumpers.length).fill(0);

  function resetBall() {
    ball.x = W * 0.85;
    ball.y = H * 0.5;
    ball.vx = -100;
    ball.vy = -500;
  }

  function flipperCollide(bx, by, bvx, bvy, baseX, angle, flip) {
    // Flipper is a line from base toward angle direction
    var endX = baseX + Math.cos(angle) * FLIPPER_LEN;
    var endY = FLIPPER_Y + Math.sin(angle) * FLIPPER_LEN;

    var dx = endX - baseX, dy = endY - FLIPPER_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / len, ny = dx / len; // normal to flipper

    // Project ball onto flipper line
    var tbx = bx - baseX, tby = by - FLIPPER_Y;
    var proj = (tbx * dx + tby * dy) / (len * len);
    if (proj < 0 || proj > 1) return false;
    var cx2 = baseX + proj * dx, cy2 = FLIPPER_Y + proj * dy;
    var dist = Math.sqrt((bx - cx2) * (bx - cx2) + (by - cy2) * (by - cy2));

    if (dist < ball.r + FLIPPER_W / 2) {
      // Push ball out
      var overlap = ball.r + FLIPPER_W / 2 - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      // Reflect velocity + add flipper boost
      var dot = bvx * nx + bvy * ny;
      var boostV = flip ? 600 : 0;
      ball.vx = bvx - 2 * dot * nx + nx * boostV;
      ball.vy = bvy - 2 * dot * ny + ny * boostV;
      return true;
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      leftTarget = FLIPPER_ANGLE_UP;
      setTimeout(function() { leftTarget = FLIPPER_ANGLE_REST; }, 200);
    } else {
      rightTarget = Math.PI - FLIPPER_ANGLE_UP;
      setTimeout(function() { rightTarget = Math.PI - FLIPPER_ANGLE_REST; }, 200);
    }
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Animate flippers
    var flipSpeed = 15;
    leftAngle += (leftTarget - leftAngle) * flipSpeed * dt;
    rightAngle += (rightTarget - rightAngle) * flipSpeed * dt;

    // Physics
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall collisions
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }
    if (ball.y - ball.r < 80) { ball.y = 80 + ball.r; ball.vy = Math.abs(ball.vy) * 0.85; }

    // Ball lost
    if (ball.y > H + 50 && !done) {
      lives--;
      game.audio.play('se_failure', 0.4);
      if (lives <= 0) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      resetBall();
    }

    // Flipper collisions
    var leftFlipping = leftTarget < leftAngle;
    var rightFlipping = rightTarget > rightAngle;
    flipperCollide(ball.x, ball.y, ball.vx, ball.vy, LEFT_BASE_X, leftAngle, leftFlipping);
    flipperCollide(ball.x, ball.y, ball.vx, ball.vy, RIGHT_BASE_X, rightAngle, rightFlipping);

    // Bumper collisions
    for (var bi = 0; bi < bumpers.length; bi++) {
      var bmp = bumpers[bi];
      var dx = ball.x - bmp.x, dy = ball.y - bmp.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ball.r + bmp.r) {
        var overlap = ball.r + bmp.r - dist;
        var nx = dx / dist, ny = dy / dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = nx * Math.max(speed, 500);
        ball.vy = ny * Math.max(speed, 500);
        score += bmp.score;
        bumperHit[bi] = 0.3;
        game.audio.play('se_success', 0.3);
        for (var pi = 0; pi < 4; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: bmp.x, y: bmp.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.4 });
        }
        if (score >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(score + Math.ceil(timeLeft) * 20); }, 400);
          return;
        }
      }
      if (bumperHit[bi] > 0) bumperHit[bi] -= dt;
    }

    // Velocity cap
    var spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (spd > 1400) { ball.vx = ball.vx / spd * 1400; ball.vy = ball.vy / spd * 1400; }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 80, 12, H, C.wall, 0.8);
    game.draw.rect(W - 12, 80, 12, H, C.wall, 0.8);
    game.draw.rect(0, 80, W, 12, C.wall, 0.8);

    // Guide lines (V shape at bottom)
    game.draw.line(0, H * 0.75, LEFT_BASE_X, FLIPPER_Y, C.wall, 4);
    game.draw.line(W, H * 0.75, RIGHT_BASE_X, FLIPPER_Y, C.wall, 4);

    // Bumpers
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var bmp2 = bumpers[bi2];
      var lit = bumperHit[bi2] > 0;
      game.draw.circle(bmp2.x, bmp2.y, bmp2.r + (lit ? 8 : 0), lit ? C.bumHi : C.bumper, 0.4);
      game.draw.circle(bmp2.x, bmp2.y, bmp2.r, lit ? C.bumHi : C.bumper, 0.9);
      game.draw.text(bmp2.score + '', bmp2.x, bmp2.y + 10, { size: 28, color: '#fff', bold: true });
    }

    // Flippers
    var lEndX = LEFT_BASE_X + Math.cos(leftAngle) * FLIPPER_LEN;
    var lEndY = FLIPPER_Y + Math.sin(leftAngle) * FLIPPER_LEN;
    game.draw.line(LEFT_BASE_X, FLIPPER_Y, lEndX, lEndY, C.flip, FLIPPER_W);
    game.draw.circle(LEFT_BASE_X, FLIPPER_Y, 14, C.flipHi, 0.8);

    var rEndX = RIGHT_BASE_X + Math.cos(rightAngle) * FLIPPER_LEN;
    var rEndY = FLIPPER_Y + Math.sin(rightAngle) * FLIPPER_LEN;
    game.draw.line(RIGHT_BASE_X, FLIPPER_Y, rEndX, rEndY, C.flip, FLIPPER_W);
    game.draw.circle(RIGHT_BASE_X, FLIPPER_Y, 14, C.flipHi, 0.8);

    // Ball
    game.draw.circle(ball.x, ball.y, ball.r + 6, C.ballHi, 0.2);
    game.draw.circle(ball.x, ball.y, ball.r, C.ball, 0.95);
    game.draw.circle(ball.x - 6, ball.y - 6, 6, '#fff', 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 6 * (p.life / 0.4), C.bumHi, p.life);
    }

    // Lives
    for (var li = 0; li < 3; li++) {
      game.draw.circle(W * 0.12 + li * 44, H * 0.94, 15, li < lives ? C.ball : C.ui, 0.8);
    }
    game.draw.text('L.タップ / R.タップ', W / 2, H * 0.94, { size: 34, color: C.ui });

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.score, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.score : C.bumper);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    resetBall();
  });
})(game);
