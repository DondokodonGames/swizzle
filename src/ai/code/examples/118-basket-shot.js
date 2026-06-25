// 118-basket-shot.js
// バスケシュート — 風を読んでアーチを描くシュートをバスケットに決める爽快感
// 操作: スワイプ上で投射、スワイプ左右で風向き補正
// 成功: 8本シュートを決める  失敗: 12本外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a0a',
    floor:   '#0a1a0a',
    hoop:    '#f97316',
    hoopHi:  '#fed7aa',
    net:     '#d4a96a',
    ball:    '#ea580c',
    ballHi:  '#fb923c',
    correct: '#22c55e',
    wrong:   '#ef4444',
    wind:    '#38bdf8',
    ui:      '#334155'
  };

  var HOOP_X = W / 2;
  var HOOP_Y = H * 0.32;
  var HOOP_R_OUTER = 80;
  var HOOP_R_INNER = 62;

  var BALL_R = 40;
  var ballX = W / 2;
  var ballY = H * 0.78;
  var ballVX = 0, ballVY = 0;
  var launched = false;

  var GRAVITY = 1200;
  var wind = (Math.random() - 0.5) * 400; // px/s horizontal drift

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 12;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var trail = [];
  var hoopFlash = 0;

  function resetBall() {
    ballX = W / 2 + (Math.random() - 0.5) * 120;
    ballY = H * 0.78;
    ballVX = 0; ballVY = 0;
    launched = false;
    trail = [];
    wind = (Math.random() - 0.5) * 400;
  }

  game.onSwipe(function(dir) {
    if (done || launched) return;
    if (dir === 'up') {
      var dx = HOOP_X - ballX;
      var dy = HOOP_Y - ballY; // negative (up)
      // Compute launch velocity to arc to hoop (simplified)
      var t = 0.8;
      ballVX = dx / t;
      ballVY = (dy - 0.5 * GRAVITY * t * t) / t;
      launched = true;
      game.audio.play('se_tap', 0.7);
    } else if (dir === 'left') {
      ballX = Math.max(BALL_R + 20, ballX - 80);
    } else if (dir === 'right') {
      ballX = Math.min(W - BALL_R - 20, ballX + 80);
    }
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

    if (launched) {
      ballVY += GRAVITY * dt;
      ballVX += wind * dt; // wind affects trajectory
      ballX += ballVX * dt;
      ballY += ballVY * dt;

      trail.push({ x: ballX, y: ballY, age: 0 });
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
      trail = trail.filter(function(t) { return t.age < 0.3; });

      // Check through hoop (ball passes hoop level going down)
      if (ballVY > 0 && ballY >= HOOP_Y - 12 && ballY <= HOOP_Y + 24) {
        var dx = Math.abs(ballX - HOOP_X);
        if (dx < HOOP_R_INNER - BALL_R * 0.5) {
          // Score!
          score++;
          feedbackOk = true;
          feedback = 0.5;
          hoopFlash = 0.4;
          game.audio.play('se_success');
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 12); }, 600);
            return;
          }
          setTimeout(function() { resetBall(); }, 500);
          launched = false;
          return;
        }
      }

      // Miss: fell below screen or hit wall
      if (ballY > H + 100 || ballX < -100 || ballX > W + 100) {
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.5);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
        resetBall();
      }
    }

    if (feedback > 0) feedback -= dt;
    if (hoopFlash > 0) hoopFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Wind indicator
    var windStr = Math.round(Math.abs(wind) / 50);
    var windDir = wind > 0 ? '→' : '←';
    game.draw.text('風 ' + windDir + windStr, W / 2, H * 0.88, { size: 44, color: C.wind });

    // Hoop backboard
    game.draw.rect(HOOP_X + HOOP_R_OUTER - 16, HOOP_Y - 160, 20, 200, '#1a2a1a');
    game.draw.rect(HOOP_X - HOOP_R_OUTER - 60, HOOP_Y - 100, HOOP_R_OUTER * 2 + 76, 16, '#1a2a1a');

    // Hoop ring
    if (hoopFlash > 0) {
      game.draw.circle(HOOP_X, HOOP_Y, HOOP_R_OUTER + 8, C.correct, hoopFlash * 0.4);
    }
    game.draw.circle(HOOP_X, HOOP_Y, HOOP_R_OUTER, C.hoop, 0.9);
    game.draw.circle(HOOP_X, HOOP_Y, HOOP_R_INNER, C.bg, 0.95);
    // Net lines
    for (var ni = 0; ni < 8; ni++) {
      var na = (ni / 8) * Math.PI * 2;
      var nx = HOOP_X + Math.cos(na) * HOOP_R_INNER;
      var ny = HOOP_Y + Math.sin(na) * HOOP_R_INNER;
      game.draw.line(nx, ny, HOOP_X + Math.cos(na) * 24, HOOP_Y + 100, C.net, 2);
    }

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      var tf = 1 - tr.age / 0.3;
      game.draw.circle(tr.x, tr.y, BALL_R * tf * 0.5, C.ball, tf * 0.2);
    }

    // Ball
    if (!launched || ballY < H) {
      game.draw.circle(ballX, ballY, BALL_R + 6, C.ballHi, 0.2);
      game.draw.circle(ballX, ballY, BALL_R, C.ball);
      game.draw.circle(ballX - BALL_R * 0.3, ballY - BALL_R * 0.3, BALL_R * 0.25, C.ballHi, 0.5);
      // Ball lines
      game.draw.line(ballX - BALL_R, ballY, ballX + BALL_R, ballY, '#000', 2);
      game.draw.line(ballX, ballY - BALL_R, ballX, ballY + BALL_R, '#000', 2);
    }

    // Floor
    game.draw.rect(0, H * 0.92, W, H * 0.08, C.floor);
    game.draw.rect(0, H * 0.92, W, 6, '#14532d');

    // Aim line (when not launched)
    if (!launched) {
      var dx2 = HOOP_X - ballX;
      game.draw.line(ballX, ballY, ballX + dx2 * 0.3, ballY - H * 0.12, '#ffffff', 2);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? 'ナイスシュート！' : 'ミス…', W / 2, H * 0.55, {
        size: 64, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.15);
    }

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    // Miss dots
    for (var mi = 0; mi < maxMisses; mi++) {
      var mx = W / 2 + (mi - (maxMisses - 1) / 2) * 48;
      game.draw.circle(mx, 216, 14, mi < misses ? C.wrong : '#0a1428');
    }

    game.draw.text('↑シュート  ←→位置調整', W / 2, H * 0.91, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hoop : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
