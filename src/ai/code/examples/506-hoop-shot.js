// 506-hoop-shot.js
// フープシュート — 揺れるバスケットゴールにボールを投げ込め
// 操作: スワイプで投げる方向と強さを決定
// 成功: 10本入れる  失敗: 15本外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    court:  '#0a1020',
    board:  '#1e3a5f',
    boardHi:'#2563eb',
    hoop:   '#f97316',
    hoopHi: '#fed7aa',
    ball:   '#f59e0b',
    ballHi: '#fef08a',
    ballSh: '#78350f',
    net:    '#e2e8f0',
    swipe:  '#93c5fd',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var HOOP_R = 65;
  var HOOP_Y = H * 0.32;
  var hoopX = W / 2;
  var hoopVx = 80;
  var ballInPlay = false;
  var ball = { x: W / 2, y: H * 0.78, vx: 0, vy: 0 };
  var BALL_R = 48;
  var scored = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var swipeStart = null;
  var GRAVITY = 1000;
  var resultText = '';
  var resultCol = C.correct;
  var resultLife = 0;
  var netAnim = 0;

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || ballInPlay) return;
    var dx = x2 - x1, dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30) return;
    // Launch in swipe direction, speed proportional to length
    var speed = Math.min(dist * 2.5, 1400);
    ball.x = W / 2;
    ball.y = H * 0.78;
    ball.vx = (dx / dist) * speed;
    ball.vy = (dy / dist) * speed;
    ballInPlay = true;
    game.audio.play('se_tap', 0.4);
  });

  game.onTap(function(tx, ty) {
    if (done || ballInPlay) return;
    // Tap above player to throw
    var dx = tx - W / 2, dy = ty - H * 0.78;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;
    var speed = 900;
    ball.x = W / 2;
    ball.y = H * 0.78;
    ball.vx = (dx / dist) * speed;
    ball.vy = (dy / dist) * speed;
    ballInPlay = true;
    game.audio.play('se_tap', 0.4);
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

    if (resultLife > 0) resultLife -= dt * 2;
    if (netAnim > 0) netAnim -= dt * 3;

    // Move hoop
    hoopX += hoopVx * dt;
    if (hoopX < HOOP_R + 60) { hoopX = HOOP_R + 60; hoopVx = Math.abs(hoopVx); }
    if (hoopX > W - HOOP_R - 60) { hoopX = W - HOOP_R - 60; hoopVx = -Math.abs(hoopVx); }
    // Speed up with score
    var targetSpd = 80 + scored * 15;
    hoopVx = hoopVx > 0 ? Math.min(targetSpd, hoopVx + 2) : Math.max(-targetSpd, hoopVx - 2);

    // Ball physics
    if (ballInPlay) {
      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Check score: ball passes through hoop
      var dx2 = ball.x - hoopX, dy2 = ball.y - HOOP_Y;
      var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < HOOP_R - 10 && ball.vy > 0 && ball.y > HOOP_Y - 20 && ball.y < HOOP_Y + 60) {
        // Score!
        scored++;
        netAnim = 0.6;
        resultText = '入った！';
        resultCol = C.correct;
        resultLife = 0.8;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: hoopX, y: HOOP_Y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.ballHi });
        }
        ballInPlay = false;
        ball.x = W / 2; ball.y = H * 0.78;
        if (scored >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(scored * 500 + Math.ceil(timeLeft) * 100); }, 700);
        }
        return;
      }

      // Ball out of bounds or fallen
      if (ball.y > H + 50 || ball.x < -50 || ball.x > W + 50) {
        misses++;
        resultText = '外れ！';
        resultCol = C.wrong;
        resultLife = 0.7;
        game.audio.play('se_failure', 0.3);
        ballInPlay = false;
        ball.x = W / 2; ball.y = H * 0.78;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }

      // Bounce off backboard
      if (ball.x > W - 50 && ball.vx > 0 && ball.y < HOOP_Y + 100) {
        ball.vx *= -0.6;
        game.audio.play('se_tap', 0.2);
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.85, W, H * 0.15, C.court, 0.9);

    // Backboard
    game.draw.rect(W - 80, HOOP_Y - 120, 60, 200, C.board, 0.9);
    game.draw.rect(W - 80, HOOP_Y - 120, 60, 200, C.boardHi, 0.15);

    // Net
    if (netAnim > 0) {
      for (var ni = 0; ni < 5; ni++) {
        var nx = hoopX - HOOP_R + ni * HOOP_R * 0.5;
        var ny1 = HOOP_Y + 8;
        var ny2 = HOOP_Y + 60 + Math.sin(elapsed * 20 + ni) * 10 * netAnim;
        game.draw.line(nx, ny1, hoopX, ny2, C.net, 3);
      }
    }

    // Hoop
    game.draw.circle(hoopX, HOOP_Y, HOOP_R + 8, C.hoopHi, 0.1);
    game.draw.circle(hoopX, HOOP_Y, HOOP_R, C.hoop, 0.0); // just the rim
    game.draw.line(hoopX - HOOP_R, HOOP_Y, hoopX + HOOP_R, HOOP_Y, C.hoop, 12);

    // Ball
    game.draw.circle(ball.x + 6, ball.y + 6, BALL_R, C.ballSh, 0.3);
    game.draw.circle(ball.x, ball.y, BALL_R, C.ball, 0.9);
    game.draw.circle(ball.x - 14, ball.y - 14, 16, C.ballHi, 0.5);
    // Ball seams
    game.draw.line(ball.x - BALL_R + 10, ball.y, ball.x + BALL_R - 10, ball.y, C.ballSh, 3);
    game.draw.line(ball.x, ball.y - BALL_R + 10, ball.x, ball.y + BALL_R - 10, C.ballSh, 3);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result
    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 64, color: resultCol, bold: true });
    } else if (!ballInPlay) {
      game.draw.text('スワイプして投げる', W / 2, H * 0.87, { size: 40, color: C.ui });
    }

    // Miss dots
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx2 = W * 0.05 + (mi % missPerRow) * (W * 0.9 / (missPerRow - 1));
      var my2 = mi < missPerRow ? H * 0.944 : H * 0.959;
      game.draw.circle(mx2, my2, 14, mi < misses ? C.wrong : C.ui, 0.8);
    }

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hoop : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
