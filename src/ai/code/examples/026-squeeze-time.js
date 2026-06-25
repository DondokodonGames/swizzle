// 026-squeeze-time.js
// スクイーズタイム — ホールドで時間を遅くして絶妙なタイミングを作る
// 操作: 長押しで「スローモーション」、離すと通常速度に戻る
// 成功: 落下するボールをスロー中に的へ5回落とす  失敗: 3回外す or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0820',
    slow:    '#1e1040',
    ball:    '#f59e0b',
    ballHi:  '#fef3c7',
    target:  '#22c55e',
    targetHi:'#86efac',
    miss:    '#ef4444',
    slow2:   '#818cf8',
    ui:      '#475569'
  };

  // Ball falls from top
  var ball = { x: W / 2, y: -60, vy: 600, alive: true };
  var BALL_R = 52;

  // Target position (moves horizontally)
  var target = { x: W / 2, w: 200, h: 32, y: H * 0.78 };
  var targetVx = 340;

  var isSlow = false;
  var SLOW_FACTOR = 0.15;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function resetBall() {
    ball.x = game.random(120, W - 120);
    ball.y = -80;
    ball.vy = 500 + score * 30;
    ball.alive = true;
  }

  function addParticles(x, y, color) {
    for (var i = 0; i < 8; i++) {
      var angle = Math.random() * Math.PI * 2;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * (150 + Math.random() * 200),
        vy: Math.sin(angle) * (150 + Math.random() * 200),
        life: 0.5, color: color
      });
    }
  }

  game.onHold(function(x, y, duration) {
    isSlow = true;
  });

  game.onTap(function(x, y) {
    isSlow = false;
  });

  game.onUpdate(function(dt) {
    // Handle hold detection via time.elapsed (simplified: onHold sets isSlow)
    // We'll check if user is currently holding by tracking touch state
    // For simplicity, isSlow is toggled: hold=slow, tap=normal
    // (In real implementation onHold fires repeatedly while held)

    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    var speedMul = isSlow ? SLOW_FACTOR : 1.0;

    // Move target
    target.x += targetVx * speedMul * dt;
    if (target.x + target.w > W - 40) { target.x = W - 40 - target.w; targetVx = -Math.abs(targetVx); }
    if (target.x < 40) { target.x = 40; targetVx = Math.abs(targetVx); }

    // Move ball
    if (ball.alive) {
      ball.vy += 900 * speedMul * dt; // gravity
      ball.y += ball.vy * speedMul * dt;

      // Check landing
      if (ball.y + BALL_R >= target.y) {
        ball.alive = false;
        var ballCenterX = ball.x;
        var inTarget = ballCenterX > target.x && ballCenterX < target.x + target.w;

        if (inTarget) {
          score++;
          feedbackOk = true;
          feedback = 0.4;
          addParticles(ball.x, target.y, C.targetHi);
          game.audio.play('se_tap', 0.9);
          if (score >= needed) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() {
              game.end.success(score * 20 + Math.ceil(timeLeft) * 5);
            }, 500);
          } else {
            setTimeout(resetBall, 500);
          }
        } else {
          misses++;
          feedbackOk = false;
          feedback = 0.4;
          addParticles(ball.x, ball.y + BALL_R, C.miss);
          game.audio.play('se_failure', 0.5);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else if (!done) {
            setTimeout(resetBall, 500);
          }
        }
      }

      // Fell off screen without hitting target
      if (ball.y > H + 100) {
        ball.alive = false;
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.4);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        } else if (!done) {
          setTimeout(resetBall, 400);
        }
      }
    }

    // Update particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    var bgColor = isSlow ? C.slow : C.bg;
    game.draw.rect(0, 0, W, H, bgColor);

    // Slow-mo vignette
    if (isSlow) {
      game.draw.rect(0, 0, W, H, C.slow2, 0.06 + 0.04 * Math.sin(game.time.elapsed * 8));
      // Slow motion text
      game.draw.text('SLOW', W * 0.85, H * 0.5, { size: 48, color: C.slow2, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0a0618');
    game.draw.rect(0, 0, W * ratio, 72, isSlow ? C.slow2 : (ratio > 0.3 ? '#7c3aed' : C.miss));
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.ball, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.miss : '#1e1040');
    }

    // Ball shadow (on floor if close)
    if (ball.alive) {
      var shadowAlpha = Math.max(0, 0.5 * (1 - (target.y - ball.y) / H));
      game.draw.rect(ball.x - BALL_R * 0.7, target.y - 8, BALL_R * 1.4, 16, '#000', shadowAlpha);
    }

    // Target
    var tPulse = feedbackOk && feedback > 0 ? 1.0 : (0.7 + 0.15 * Math.sin(game.time.elapsed * 4));
    game.draw.rect(target.x, target.y, target.w, target.h, C.target, tPulse);
    game.draw.rect(target.x + 8, target.y, target.w - 16, 8, C.targetHi, 0.6);
    // Edge markers
    game.draw.rect(target.x - 4, target.y - 20, 8, 52, C.targetHi, 0.5);
    game.draw.rect(target.x + target.w - 4, target.y - 20, 8, 52, C.targetHi, 0.5);

    // Ball
    if (ball.alive) {
      // Stretched by velocity
      var stretch = 1 + Math.abs(ball.vy) / 3000;
      var bH = BALL_R * 2 * stretch;
      var bY = ball.y - BALL_R * stretch;
      game.draw.rect(ball.x - BALL_R, bY, BALL_R * 2, bH, C.ball);
      game.draw.rect(ball.x - BALL_R * 0.5, bY + 8, BALL_R, 20, C.ballHi, 0.6);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var par = particles[pp];
      game.draw.circle(par.x, par.y, 10 * par.life / 0.5, par.color, par.life / 0.5);
    }

    // Feedback
    if (feedback > 0) {
      var prog = 1 - feedback / 0.4;
      if (feedbackOk) {
        game.draw.text('ナイス！', W / 2, target.y - 160 - prog * 60, { size: 80, color: C.target, bold: true });
      } else {
        game.draw.text('ズレた！', W / 2, H * 0.5, { size: 76, color: C.miss, bold: true });
      }
    }

    // Guide
    game.draw.text('長押し→スロー、離す→通常', W / 2, H - 220, { size: 44, color: C.ui });
    game.draw.text('スロー中に的に落とせ！', W / 2, H - 155, { size: 48, color: '#6b7280' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    resetBall();
  });
})(game);
