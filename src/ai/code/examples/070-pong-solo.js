// 070-pong-solo.js
// ソロポン — 上下に反射するボールをパドルで打ち続ける集中力の壁打ち
// 操作: タップでパドルをボールに向けてスマッシュ、スワイプで左右移動
// 成功: 15回ラリー  失敗: ボールが下を抜ける or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#040810',
    wall:     '#1e3a5f',
    wallHi:   '#3b82f6',
    paddle:   '#f97316',
    paddleHi: '#fed7aa',
    ball:     '#fbbf24',
    ballHi:   '#fef3c7',
    trail:    '#818cf8',
    ui:       '#475569'
  };

  var PADDLE_W = 240;
  var PADDLE_H = 32;
  var PADDLE_Y = H * 0.82;
  var paddleX = W / 2;

  var BALL_R = 28;
  var ball = { x: W / 2, y: H * 0.45, vx: 320, vy: -480 };
  var speed = 550;
  var trail = [];

  var rallies = 0;
  var needed = 15;
  var timeLeft = 25;
  var done = false;
  var hitFlash = 0;
  var WALL_TOP = 200;

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') paddleX = Math.max(PADDLE_W / 2, paddleX - 200);
    else if (dir === 'right') paddleX = Math.min(W - PADDLE_W / 2, paddleX + 200);
  });

  game.onTap(function(x, y) {
    if (done) return;
    // Snap paddle toward tap X
    paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Move ball
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    trail.unshift({ x: ball.x, y: ball.y });
    if (trail.length > 12) trail.pop();

    // Wall bounces
    if (ball.x - BALL_R < 40) { ball.x = 40 + BALL_R; ball.vx = Math.abs(ball.vx); }
    if (ball.x + BALL_R > W - 40) { ball.x = W - 40 - BALL_R; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - BALL_R < WALL_TOP) {
      ball.y = WALL_TOP + BALL_R;
      ball.vy = Math.abs(ball.vy);
      // Small x variation on top wall bounce
      ball.vx += (Math.random() - 0.5) * 80;
    }

    // Paddle hit
    if (ball.y + BALL_R >= PADDLE_Y - PADDLE_H / 2 &&
        ball.y - BALL_R <= PADDLE_Y + PADDLE_H / 2 &&
        ball.vy > 0) {
      if (ball.x + BALL_R > paddleX - PADDLE_W / 2 && ball.x - BALL_R < paddleX + PADDLE_W / 2) {
        ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
        // Angle based on hit position
        var hitPos = (ball.x - paddleX) / (PADDLE_W / 2);
        var angle = hitPos * 0.9; // -0.9 to 0.9 radians from vertical
        var spd = speed + rallies * 15;
        ball.vx = Math.sin(angle) * spd;
        ball.vy = -Math.cos(angle) * spd;
        rallies++;
        hitFlash = 0.12;
        game.audio.play('se_tap', 0.8);
        if (rallies >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(rallies * 15 + Math.ceil(timeLeft) * 8); }, 400);
        }
      }
    }

    // Miss — ball falls below paddle
    if (ball.y > H + 40) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    if (hitFlash > 0) hitFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, WALL_TOP - 16, 40, H - WALL_TOP + 16, C.wall);
    game.draw.rect(W - 40, WALL_TOP - 16, 40, H - WALL_TOP + 16, C.wall);
    game.draw.rect(40, WALL_TOP - 16, W - 80, 16, C.wall);
    // Wall highlights
    game.draw.rect(0, WALL_TOP - 16, 40, 16, C.wallHi, 0.5);
    game.draw.rect(W - 40, WALL_TOP - 16, 40, 16, C.wallHi, 0.5);

    // Trail
    for (var tr = 0; tr < trail.length; tr++) {
      var ta = (1 - tr / trail.length) * 0.6;
      game.draw.circle(trail[tr].x, trail[tr].y, BALL_R * (1 - tr / trail.length * 0.5), C.trail, ta);
    }

    // Ball
    if (hitFlash > 0) {
      game.draw.circle(ball.x, ball.y, BALL_R + 20, '#fff', hitFlash / 0.12 * 0.5);
    }
    game.draw.circle(ball.x, ball.y, BALL_R + 8, C.ballHi, 0.2);
    game.draw.circle(ball.x, ball.y, BALL_R, C.ball);
    game.draw.circle(ball.x - 8, ball.y - 8, BALL_R * 0.3, '#fff', 0.5);

    // Paddle
    game.draw.rect(paddleX - PADDLE_W / 2 - 8, PADDLE_Y - PADDLE_H / 2 - 4, PADDLE_W + 16, PADDLE_H + 8, '#1a0808', 0.5);
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y - PADDLE_H / 2, PADDLE_W, PADDLE_H, C.paddle);
    game.draw.rect(paddleX - PADDLE_W / 2 + 12, PADDLE_Y - PADDLE_H / 2 + 6, PADDLE_W - 24, 8, C.paddleHi, 0.5);

    // Direction line on paddle
    game.draw.line(paddleX, PADDLE_Y - PADDLE_H / 2 - 40, paddleX, PADDLE_Y - PADDLE_H / 2 - 10, C.paddleHi, 3);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#040810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Rally count
    for (var r = 0; r < needed; r++) {
      var rx = W / 2 + (r - (needed - 1) / 2) * 60;
      game.draw.circle(rx, 140, 22, r < rallies ? C.ball : '#0a1428');
    }
    game.draw.text(rallies + ' / ' + needed, W / 2, 212, { size: 52, color: C.ballHi, bold: true });

    // Guide
    game.draw.text('タップ/スワイプでパドル移動！', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);
