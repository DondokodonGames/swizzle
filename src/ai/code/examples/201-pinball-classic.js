// 201-pinball-classic.js
// クラシックピンボール — ボールを上げてターゲットに当て続けるピンボール
// 操作: 左タップで左フリッパー、右タップで右フリッパー
// 成功: 500点獲得  失敗: ボール3個失う or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040408',
    wall:    '#1e3a5f',
    wallHi:  '#2d5a8e',
    flipper: '#22c55e',
    flipHi:  '#86efac',
    ball:    '#e2e8f0',
    ballHi:  '#f8fafc',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    bump:    '#f59e0b',
    bumpHi:  '#fde68a',
    ui:      '#334155'
  };

  var BALL_R = 20;
  var bx = W / 2, by = H * 0.35;
  var bvx = 80, bvy = -300;
  var GRAVITY = 900;
  var balls = 3;

  var FLIP_Y = H * 0.9;
  var FLIP_W = 240;
  var FLIP_H = 18;
  var FLIP_L_X = W * 0.15;
  var FLIP_R_X = W * 0.85 - FLIP_W;
  var leftFlipAngle = 0.3; // resting angle
  var rightFlipAngle = -0.3;
  var leftDown = false, rightDown = false;
  var FLIP_SPEED = 8;
  var FLIP_MAX = 0.45;

  var score = 0;
  var NEEDED = 500;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var feedback = 0;
  var feedbackCol = '#22c55e';

  // Bumpers
  var bumpers = [
    { x: W * 0.3, y: H * 0.28, r: 44, score: 30 },
    { x: W * 0.7, y: H * 0.28, r: 44, score: 30 },
    { x: W / 2, y: H * 0.2, r: 40, score: 50 },
    { x: W * 0.2, y: H * 0.45, r: 36, score: 20 },
    { x: W * 0.8, y: H * 0.45, r: 36, score: 20 }
  ];
  var bumperFlash = bumpers.map(function() { return 0; });

  function resetBall() {
    bx = W / 2;
    by = H * 0.35;
    bvx = (Math.random() - 0.5) * 200;
    bvy = -400;
  }

  game.onTap(function(tx) {
    if (done) return;
    if (tx < W / 2) leftDown = true;
    else rightDown = true;
    setTimeout(function() {
      if (tx < W / 2) leftDown = false;
      else rightDown = false;
    }, 180);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Flipper angles
    var targetLA = leftDown ? -FLIP_MAX : FLIP_MAX * 0.7;
    var targetRA = rightDown ? FLIP_MAX : -FLIP_MAX * 0.7;
    leftFlipAngle += (targetLA - leftFlipAngle) * FLIP_SPEED * dt;
    rightFlipAngle += (targetRA - rightFlipAngle) * FLIP_SPEED * dt;

    for (var bi = 0; bi < bumpers.length; bi++) {
      if (bumperFlash[bi] > 0) bumperFlash[bi] -= dt;
    }

    // Ball physics
    bvy += GRAVITY * dt;
    bx += bvx * dt;
    by += bvy * dt;

    // Wall collisions
    if (bx - BALL_R < 40) { bx = 40 + BALL_R; bvx = Math.abs(bvx) * 0.85; }
    if (bx + BALL_R > W - 40) { bx = W - 40 - BALL_R; bvx = -Math.abs(bvx) * 0.85; }
    if (by - BALL_R < 80) { by = 80 + BALL_R; bvy = Math.abs(bvy) * 0.8; }

    // Bumper collisions
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var bmp = bumpers[bi2];
      var dx = bx - bmp.x, dy = by - bmp.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BALL_R + bmp.r) {
        var nx = dx / dist, ny = dy / dist;
        bx = bmp.x + nx * (BALL_R + bmp.r + 2);
        by = bmp.y + ny * (BALL_R + bmp.r + 2);
        var dot = bvx * nx + bvy * ny;
        bvx = (bvx - 2 * dot * nx) * 1.1;
        bvy = (bvy - 2 * dot * ny) * 1.1;
        score += bmp.score;
        bumperFlash[bi2] = 0.3;
        feedbackCol = C.bump; feedback = 0.2;
        game.audio.play('se_tap', 0.5);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score + Math.ceil(timeLeft) * 30); }, 400);
        }
      }
    }

    // Flipper collisions (simplified)
    // Left flipper
    var lfTipX = FLIP_L_X + FLIP_W + Math.cos(leftFlipAngle) * FLIP_W * 0.4;
    var lfTipY = FLIP_Y + Math.sin(leftFlipAngle) * FLIP_W * 0.4;
    if (by > FLIP_Y - 30 && by < FLIP_Y + 40 && bx > FLIP_L_X - 20 && bx < FLIP_L_X + FLIP_W + 40) {
      if (bvy > 0) {
        bvy = -Math.abs(bvy) * 0.9;
        bvx += leftDown ? 300 : 0;
        by = FLIP_Y - BALL_R;
        feedbackCol = C.flipper; feedback = 0.15;
        game.audio.play('se_tap', 0.4);
      }
    }
    // Right flipper
    if (by > FLIP_Y - 30 && by < FLIP_Y + 40 && bx > FLIP_R_X - 40 && bx < FLIP_R_X + FLIP_W + 20) {
      if (bvy > 0) {
        bvy = -Math.abs(bvy) * 0.9;
        bvx -= rightDown ? 300 : 0;
        by = FLIP_Y - BALL_R;
        feedbackCol = C.flipper; feedback = 0.15;
        game.audio.play('se_tap', 0.4);
      }
    }

    // Ball lost
    if (by > H + 40 && !done) {
      balls--;
      if (balls <= 0) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      } else {
        resetBall();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 80, 40, H - 80, C.wall, 0.8);
    game.draw.rect(W - 40, 80, 40, H - 80, C.wall, 0.8);
    game.draw.rect(0, 80, W, 12, C.wallHi, 0.5);

    // Bumpers
    for (var bi3 = 0; bi3 < bumpers.length; bi3++) {
      var bmp2 = bumpers[bi3];
      var flash = bumperFlash[bi3] > 0;
      game.draw.circle(bmp2.x, bmp2.y, bmp2.r + 10, C.bumpHi, flash ? 0.4 : 0.1);
      game.draw.circle(bmp2.x, bmp2.y, bmp2.r, flash ? C.bumpHi : C.bump, 0.9);
      game.draw.text(bmp2.score + '', bmp2.x, bmp2.y, { size: 36, color: '#fff', bold: true });
    }

    // Flippers
    // Left flipper
    game.draw.rect(FLIP_L_X, FLIP_Y, FLIP_W, FLIP_H, C.flipper, 0.85);
    game.draw.rect(FLIP_L_X, FLIP_Y, FLIP_W, 8, C.flipHi, 0.4);
    // Right flipper
    game.draw.rect(FLIP_R_X, FLIP_Y, FLIP_W, FLIP_H, C.flipper, 0.85);
    game.draw.rect(FLIP_R_X, FLIP_Y, FLIP_W, 8, C.flipHi, 0.4);

    // Ball
    game.draw.circle(bx, by, BALL_R + 6, C.ballHi, 0.3);
    game.draw.circle(bx, by, BALL_R, C.ball, 0.95);
    game.draw.circle(bx - 6, by - 6, 7, '#fff', 0.5);

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackCol, feedback * 0.1);
    }

    // Ball indicators
    for (var li = 0; li < 3; li++) {
      game.draw.circle(W * 0.35 + li * 80, H * 0.95, 20, li < balls ? C.ball : '#1a1a2e');
    }

    game.draw.text(score + '', W / 2, 140, { size: 64, color: '#f1f5f9', bold: true });
    game.draw.text('目標: ' + NEEDED, W / 2, H * 0.93, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.flipper : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); });
})(game);
