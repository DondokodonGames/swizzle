// 671-pendulum-sort.js
// 振り子仕分け — 揺れる球が正しいバケツの上に来たらタップで落とせ
// 操作: タップで糸を切る（バケツの上にある時だけ有効）
// 成功: 20個正しく仕分け  失敗: 6回外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    rope:    '#94a3b8',
    ballR:   '#ef4444',
    ballB:   '#3b82f6',
    ballY:   '#f59e0b',
    bucketR: '#7f1d1d',
    bucketB: '#1e3a8a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030610'
  };

  var BALL_COLORS = [C.ballR, C.ballB, C.ballY];
  var BUCKET_COLORS = [C.bucketR, C.bucketB, '#78350f'];
  var BUCKET_HL = [C.ballR, C.ballB, C.ballY];

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.18;
  var ROPE_LEN = 420;
  var BALL_R = 64;
  var BUCKET_W = 240;
  var BUCKET_H = 160;
  var BUCKET_Y = H * 0.76;

  var BUCKET_X = [W * 0.2, W * 0.5, W * 0.8];

  var pendAngle = -0.9;
  var pendVel = 0;
  var PENDULUM_G = 4.5;
  var ballColorIdx = 0;
  var releasing = false;
  var releaseX = 0, releaseY = 0;
  var releaseVX = 0, releaseVY = 0;

  var sorted = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 6;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newBall() {
    ballColorIdx = Math.floor(Math.random() * 3);
    pendAngle = (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.3);
    pendVel = 0;
    releasing = false;
  }

  function getBallPos() {
    return {
      x: PIVOT_X + Math.sin(pendAngle) * ROPE_LEN,
      y: PIVOT_Y + Math.cos(pendAngle) * ROPE_LEN
    };
  }

  game.onTap(function(tx, ty) {
    if (done || releasing) return;
    var pos = getBallPos();
    var dx = tx - pos.x, dy = ty - pos.y;
    if (dx * dx + dy * dy > (BALL_R + 30) * (BALL_R + 30)) return;

    // Check which bucket the ball is over
    var overBucket = -1;
    for (var i = 0; i < 3; i++) {
      if (pos.x >= BUCKET_X[i] - BUCKET_W / 2 - 20 && pos.x <= BUCKET_X[i] + BUCKET_W / 2 + 20) {
        overBucket = i;
        break;
      }
    }

    // Release the ball
    releasing = true;
    releaseX = pos.x;
    releaseY = pos.y;
    var spd = pendVel * ROPE_LEN;
    releaseVX = Math.cos(pendAngle) * spd;
    releaseVY = Math.sin(pendAngle) * spd * 0.2 + 200;

    if (overBucket >= 0 && overBucket === ballColorIdx) {
      sorted++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = 'ピッタリ！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: pos.x, y: pos.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: BALL_COLORS[ballColorIdx] });
      }
      if (sorted >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(sorted * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '外れ！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    setTimeout(newBall, 700);
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

    if (!releasing) {
      pendVel += (-PENDULUM_G * Math.sin(pendAngle) - pendVel * 0.3) * dt;
      pendAngle += pendVel * dt;
    } else {
      releaseVY += 900 * dt;
      releaseX += releaseVX * dt;
      releaseY += releaseVY * dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Buckets
    for (var bi = 0; bi < 3; bi++) {
      var bx = BUCKET_X[bi] - BUCKET_W / 2;
      game.draw.rect(bx + 4, BUCKET_Y + 4, BUCKET_W, BUCKET_H, '#000', 0.3);
      game.draw.rect(bx, BUCKET_Y, BUCKET_W, BUCKET_H, BUCKET_COLORS[bi], 0.85);
      game.draw.rect(bx, BUCKET_Y, BUCKET_W, 14, BUCKET_HL[bi], 0.6);
      game.draw.circle(BUCKET_X[bi], BUCKET_Y + BUCKET_H / 2, 36, BUCKET_HL[bi], 0.7);
    }

    // Pivot
    game.draw.circle(PIVOT_X, PIVOT_Y, 16, '#64748b', 0.9);

    if (!releasing) {
      var pos2 = getBallPos();
      // Rope
      game.draw.line(PIVOT_X, PIVOT_Y, pos2.x, pos2.y - BALL_R, C.rope, 3);
      // Ball
      game.draw.circle(pos2.x + 5, pos2.y + 5, BALL_R, '#000', 0.3);
      game.draw.circle(pos2.x, pos2.y, BALL_R, BALL_COLORS[ballColorIdx], 0.9);
      game.draw.circle(pos2.x - BALL_R * 0.3, pos2.y - BALL_R * 0.3, BALL_R * 0.25, '#ffffff', 0.35);

      // TAP hint when over correct bucket
      for (var ci = 0; ci < 3; ci++) {
        if (ci === ballColorIdx && pos2.x >= BUCKET_X[ci] - BUCKET_W / 2 && pos2.x <= BUCKET_X[ci] + BUCKET_W / 2) {
          game.draw.text('TAP!', pos2.x, pos2.y - BALL_R - 40, { size: 44, color: C.correct, bold: true });
        }
      }
    } else {
      // Falling ball
      game.draw.circle(releaseX + 5, releaseY + 5, BALL_R, '#000', 0.3);
      game.draw.circle(releaseX, releaseY, BALL_R, BALL_COLORS[ballColorIdx], 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.65, { size: 64, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(sorted + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newBall();
  });
})(game);
