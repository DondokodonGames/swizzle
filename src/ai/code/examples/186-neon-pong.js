// 186-neon-pong.js
// ネオンポン — 縦画面でシングルプレイヤー、ボールを打ち返し続ける反射神経ゲーム
// 操作: タップでパドル移動
// 成功: 20回打ち返す  失敗: ボールを3回取り逃す

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040408',
    paddle:  '#22c55e',
    paddleHi:'#86efac',
    ball:    '#f59e0b',
    ballHi:  '#fde68a',
    trail:   '#f59e0b',
    wall:    '#1e3a5f',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var PADDLE_W = 280;
  var PADDLE_H = 28;
  var PADDLE_Y = H * 0.88;
  var paddleX = W / 2;
  var PADDLE_SPEED = 900;

  var BALL_R = 22;
  var bx = W / 2;
  var by = H * 0.4;
  var BALL_SPEED = 700;
  var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
  var bvx = Math.cos(angle) * BALL_SPEED;
  var bvy = Math.sin(angle) * BALL_SPEED;

  var score = 0;
  var needed = 20;
  var lives = 3;
  var done = false;
  var trail = [];
  var elapsed = 0;
  var feedback = 0;
  var feedbackOk = false;
  var targetX = W / 2;

  game.onTap(function(tx) {
    if (done) return;
    targetX = tx;
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;
    if (feedback > 0) feedback -= dt;

    // Move paddle toward target
    var diff = targetX - paddleX;
    var maxMove = PADDLE_SPEED * dt;
    if (Math.abs(diff) < maxMove) paddleX = targetX;
    else paddleX += (diff > 0 ? 1 : -1) * maxMove;
    paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, paddleX));

    // Move ball
    bx += bvx * dt;
    by += bvy * dt;

    // Wall bounces
    if (bx - BALL_R < 0) { bx = BALL_R; bvx = Math.abs(bvx); }
    if (bx + BALL_R > W) { bx = W - BALL_R; bvx = -Math.abs(bvx); }
    if (by - BALL_R < 0) { by = BALL_R; bvy = Math.abs(bvy); }

    // Paddle collision
    var px1 = paddleX - PADDLE_W / 2;
    var px2 = paddleX + PADDLE_W / 2;
    if (by + BALL_R > PADDLE_Y && by + BALL_R < PADDLE_Y + PADDLE_H + 10 && bx > px1 && bx < px2 && bvy > 0) {
      bvy = -Math.abs(bvy);
      // Angle based on hit position
      var hitPos = (bx - paddleX) / (PADDLE_W / 2);
      bvx = hitPos * BALL_SPEED * 0.8;
      var speed = Math.sqrt(bvx * bvx + bvy * bvy);
      bvx = bvx / speed * BALL_SPEED;
      bvy = bvy / speed * BALL_SPEED;
      score++;
      feedbackOk = true; feedback = 0.2;
      game.audio.play('se_tap', 0.6);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 80 + lives * 200); }, 400);
      }
    }

    // Ball missed
    if (by > H + 40 && !done) {
      lives--;
      feedbackOk = false; feedback = 0.5;
      game.audio.play('se_failure', 0.5);
      if (lives <= 0) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      } else {
        bx = W / 2; by = H * 0.4;
        var ang2 = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        bvx = Math.cos(ang2) * BALL_SPEED;
        bvy = Math.sin(ang2) * BALL_SPEED;
      }
    }

    // Trail
    trail.push({ x: bx, y: by, life: 0.25 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Side walls glow
    game.draw.rect(0, 0, 12, H, C.wall, 0.8);
    game.draw.rect(W - 12, 0, 12, H, C.wall, 0.8);
    game.draw.rect(0, 0, W, 12, C.wall, 0.8);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, BALL_R * t.life * 3, C.trail, t.life * 0.4);
    }

    // Ball
    game.draw.circle(bx, by, BALL_R + 12, C.ballHi, 0.3);
    game.draw.circle(bx, by, BALL_R, C.ball, 0.95);
    game.draw.circle(bx - 6, by - 6, 7, '#fff', 0.5);

    // Paddle
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, C.paddleHi, 0.25);
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, C.paddle, 0.9);
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, 8, '#a3e635', 0.5);

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.paddle : C.wrong, feedback * 0.08);
    }

    // Lives
    for (var li = 0; li < 3; li++) {
      game.draw.circle(W * 0.85 + (li - 1) * 48, 180, 16, li < lives ? C.ball : '#1a1a1a');
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.rect(0, 0, W, 72, C.bg);
    var ratio = score / needed;
    game.draw.rect(0, 0, W * Math.min(1, ratio), 72, C.paddle);
    game.draw.text(score + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
