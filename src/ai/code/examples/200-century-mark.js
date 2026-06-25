// 200-century-mark.js
// センチュリーマーク — 記念すべき200本目、エンドレスに跳ねる球をひたすらリズムよく打ち続ける
// 操作: タップでボールを打ち上げ続ける
// 成功: 200回打ち上げる  失敗: ボールが落ちる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08040c',
    ball:    '#f59e0b',
    ballHi:  '#fde68a',
    spark:   '#fbbf24',
    paddle:  '#a855f7',
    paddleHi:'#d8b4fe',
    ground:  '#1a0a2e',
    num:     '#fde68a',
    ui:      '#334155',
    glow:    '#a855f7'
  };

  var BALL_R = 30;
  var ballX = W / 2;
  var ballY = H * 0.5;
  var ballVX = 120;
  var ballVY = -800;
  var GRAVITY = 1400;
  var PADDLE_Y = H * 0.85;
  var PADDLE_W = 320;
  var PADDLE_H = 32;

  var count = 0;
  var NEEDED = 200;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var sparks = [];
  var trail = [];
  var milestone = false;
  var milestoneTimer = 0;

  game.onTap(function(tx) {
    if (done) return;
    // Paddle at tap X if near bottom
    if (ballY > PADDLE_Y - 80 && ballY < PADDLE_Y + 40) {
      var hitPos = (ballX - tx) / PADDLE_W;
      ballVX = hitPos * -400 + (ballVX * 0.3);
      ballVY = -1000 - count * 3;
      count++;
      game.audio.play('se_tap', Math.min(1, 0.4 + count * 0.003));
      // Sparks
      for (var si = 0; si < 8; si++) {
        var ang = Math.random() * Math.PI - Math.PI;
        sparks.push({ x: ballX, y: PADDLE_Y, vx: Math.cos(ang) * (150 + Math.random() * 150), vy: Math.sin(ang) * (150 + Math.random() * 150) - 100, life: 0.5 });
      }
      if (count % 25 === 0) {
        milestone = true;
        milestoneTimer = 1.2;
        game.audio.play('se_success', 0.6);
      }
      if (count >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(count * 30 + Math.ceil(timeLeft) * 50); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (milestoneTimer > 0) milestoneTimer -= dt;
    else milestone = false;

    // Ball physics
    ballVY += GRAVITY * dt;
    ballX += ballVX * dt;
    ballY += ballVY * dt;

    // Wall bounce
    if (ballX - BALL_R < 0) { ballX = BALL_R; ballVX = Math.abs(ballVX); }
    if (ballX + BALL_R > W) { ballX = W - BALL_R; ballVX = -Math.abs(ballVX); }
    if (ballY - BALL_R < 100) { ballY = 100 + BALL_R; ballVY = Math.abs(ballVY); }

    // Ball fell
    if (ballY > H + 50 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Trail
    trail.push({ x: ballX, y: ballY, life: 0.3 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Sparks
    for (var si2 = sparks.length - 1; si2 >= 0; si2--) {
      sparks[si2].x += sparks[si2].vx * dt;
      sparks[si2].y += sparks[si2].vy * dt;
      sparks[si2].vy += 600 * dt;
      sparks[si2].life -= dt;
      if (sparks[si2].life <= 0) sparks.splice(si2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Starfield
    for (var si3 = 0; si3 < 30; si3++) {
      var sx = (si3 * 137 + elapsed * 10) % W;
      var sy = (si3 * 97 + elapsed * 5) % H;
      game.draw.circle(sx, sy, 2, '#fff', 0.2 + 0.1 * Math.sin(elapsed + si3));
    }

    // Ground
    game.draw.rect(0, PADDLE_Y + 100, W, H, C.ground, 0.6);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, BALL_R * t.life * 2.5, C.spark, t.life * 0.3);
    }

    // Ball
    var glowR = BALL_R * (1.5 + 0.3 * Math.sin(elapsed * 5));
    game.draw.circle(ballX, ballY, glowR + 20, C.ballHi, 0.15);
    game.draw.circle(ballX, ballY, BALL_R + 8, C.ballHi, 0.3);
    game.draw.circle(ballX, ballY, BALL_R, C.ball, 0.95);
    game.draw.circle(ballX - BALL_R * 0.3, ballY - BALL_R * 0.35, BALL_R * 0.28, '#fff', 0.5);

    // Sparks
    for (var si4 = 0; si4 < sparks.length; si4++) {
      var sp = sparks[si4];
      game.draw.circle(sp.x, sp.y, 8 * sp.life * 2, C.spark, sp.life);
    }

    // Paddle at tap position (bottom area)
    var padX = ballX;
    game.draw.rect(padX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, C.paddleHi, 0.2);
    game.draw.rect(padX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, C.paddle, 0.7);
    game.draw.rect(padX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, 8, '#d8b4fe', 0.5);

    // Milestone flash
    if (milestone) {
      var mAlpha = (milestoneTimer / 1.2) * 0.3;
      game.draw.rect(0, 0, W, H, C.glow, mAlpha);
      game.draw.text(count + '！', W / 2, H * 0.45, { size: 100, color: C.num, bold: true });
    }

    // Count display
    game.draw.text(count + ' / ' + NEEDED, W / 2, 148, { size: 64, color: C.num, bold: true });

    // Drop zone hint
    var ballNearPaddle = ballY > H * 0.7;
    if (ballNearPaddle) {
      game.draw.circle(ballX, PADDLE_Y - 10, 40, C.paddleHi, 0.25 + 0.1 * Math.sin(elapsed * 10));
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.paddle : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
