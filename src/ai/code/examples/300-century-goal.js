// 300-century-goal.js
// 世紀のゴール — 300本記念！完璧なフリーキックをタイミングよく蹴り込め
// 操作: 上スワイプで蹴る（パワーゲージとカーブゲージを見て）
// 成功: 5点入れる  失敗: 3回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1a0a',
    grass:   '#15803d',
    grassHi: '#16a34a',
    grassLo: '#14532d',
    line:    '#fff',
    goal:    '#94a3b8',
    goalHi:  '#cbd5e1',
    net:     '#475569',
    ball:    '#f1f5f9',
    ballMk:  '#1e293b',
    power:   '#22c55e',
    powerHi: '#86efac',
    powerLo: '#ef4444',
    curve:   '#f59e0b',
    curveHi: '#fde68a',
    scored:  '#fbbf24',
    danger:  '#ef4444',
    keeper:  '#dc2626',
    keeperHi:'#fca5a5',
    ui:      '#94a3b8',
    text:    '#f1f5f9'
  };

  var GOAL_Y = H * 0.28;
  var GOAL_W = W * 0.7;
  var GOAL_H = H * 0.18;
  var GOAL_X = (W - GOAL_W) / 2;
  var BALL_START_X = W / 2;
  var BALL_START_Y = H * 0.72;

  var powerGauge = 0;
  var powerDir = 1;
  var curveGauge = 0;
  var curveDirV = 1;
  var phase = 'aim'; // aim, flying, result
  var ballX = BALL_START_X;
  var ballY = BALL_START_Y;
  var ballVX = 0;
  var ballVY = 0;
  var ballR = 30;
  var ballSpin = 0;

  var scored = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var resultMsg = '';
  var resultTimer = 0;
  var particles = [];

  // Keeper
  var keeperX = W / 2;
  var keeperDir = 1;
  var keeperDiveX = 0;
  var keeperDiving = false;

  function kick() {
    if (phase !== 'aim') return;
    var power = powerGauge / 100;
    var curve = (curveGauge - 50) / 50; // -1 to 1
    // Kick toward goal with curve and power
    var targetX = GOAL_X + GOAL_W * 0.5 + curve * GOAL_W * 0.6;
    var dx = targetX - BALL_START_X;
    var dy = GOAL_Y + GOAL_H * 0.3 - BALL_START_Y;
    var dist = Math.hypot(dx, dy);
    var speed = 900 + power * 600;
    ballVX = dx / dist * speed;
    ballVY = dy / dist * speed;
    ballVX += curve * 200; // extra curve drift
    phase = 'flying';
    game.audio.play('se_tap', 0.4);

    // Keeper dives
    keeperDiveX = keeperX;
    keeperDiving = true;
    var diveDir = Math.random() < 0.5 ? -1 : 1;
    keeperDiveX += diveDir * (GOAL_W * 0.3 + Math.random() * GOAL_W * 0.2);
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (dir === 'up' && phase === 'aim') kick();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultTimer > 0) resultTimer -= dt;

    if (phase === 'aim') {
      // Oscillating gauges
      powerGauge += dt * 80 * powerDir;
      if (powerGauge >= 100) { powerGauge = 100; powerDir = -1; }
      if (powerGauge <= 0) { powerGauge = 0; powerDir = 1; }
      curveGauge += dt * 60 * curveDirV;
      if (curveGauge >= 100) { curveGauge = 100; curveDirV = -1; }
      if (curveGauge <= 0) { curveGauge = 0; curveDirV = 1; }

      // Keeper wanders
      keeperX += dt * 200 * keeperDir;
      if (keeperX > GOAL_X + GOAL_W - 40) { keeperX = GOAL_X + GOAL_W - 40; keeperDir = -1; }
      if (keeperX < GOAL_X + 40) { keeperX = GOAL_X + 40; keeperDir = 1; }
    }

    if (phase === 'flying') {
      ballX += ballVX * dt;
      ballY += ballVY * dt;
      ballSpin += dt * 8;

      // Keeper dives toward ball
      if (keeperDiving) {
        var dkDx = keeperDiveX - keeperX;
        keeperX += Math.sign(dkDx) * Math.min(Math.abs(dkDx), 700 * dt);
      }

      // Check if ball reached goal line
      if (ballY <= GOAL_Y + GOAL_H) {
        // Check goal
        var inGoalX = ballX > GOAL_X + ballR && ballX < GOAL_X + GOAL_W - ballR;
        var inGoalY = ballY > GOAL_Y && ballY < GOAL_Y + GOAL_H;
        var keeperBlocks = Math.abs(ballX - keeperX) < 60 && inGoalY;

        if (inGoalX && inGoalY && !keeperBlocks) {
          // GOAL!
          scored++;
          resultMsg = '⚽ GOAL!!';
          resultTimer = 1.2;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 15; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: ballX, y: ballY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 - 100, life: 0.8, col: C.scored });
          }
          if (scored >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(scored * 500 + Math.ceil(timeLeft) * 100); }, 600);
            return;
          }
        } else {
          misses++;
          resultMsg = keeperBlocks ? 'セーブ！' : '外れ！';
          resultTimer = 1.0;
          game.audio.play('se_failure', 0.5);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
        }
        // Reset
        phase = 'result';
        setTimeout(function() {
          if (!done) {
            ballX = BALL_START_X;
            ballY = BALL_START_Y;
            ballVX = 0; ballVY = 0;
            keeperDiving = false;
            phase = 'aim';
          }
        }, 900);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grass with stripes
    game.draw.rect(0, H * 0.22, W, H * 0.78, C.grass, 0.9);
    for (var li = 0; li < 6; li++) {
      var stripeY = H * 0.22 + li * (H * 0.78 / 6);
      game.draw.rect(0, stripeY, W, H * 0.78 / 12, C.grassHi, 0.3);
    }
    // Center spot
    game.draw.circle(BALL_START_X, BALL_START_Y + 20, 60, C.grassLo, 0.4);

    // Goal net
    game.draw.rect(GOAL_X - 12, GOAL_Y - 8, GOAL_W + 24, GOAL_H + 12, C.net, 0.4);
    // Net grid
    for (var nx = 0; nx <= 6; nx++) {
      game.draw.line(GOAL_X + nx * (GOAL_W / 6), GOAL_Y, GOAL_X + nx * (GOAL_W / 6), GOAL_Y + GOAL_H, C.net, 2);
    }
    for (var ny = 0; ny <= 3; ny++) {
      game.draw.line(GOAL_X, GOAL_Y + ny * (GOAL_H / 3), GOAL_X + GOAL_W, GOAL_Y + ny * (GOAL_H / 3), C.net, 2);
    }
    // Goal posts
    game.draw.rect(GOAL_X - 12, GOAL_Y - 8, 12, GOAL_H + 8, C.goalHi, 0.9);
    game.draw.rect(GOAL_X + GOAL_W, GOAL_Y - 8, 12, GOAL_H + 8, C.goalHi, 0.9);
    game.draw.rect(GOAL_X - 12, GOAL_Y - 20, GOAL_W + 24, 20, C.goalHi, 0.9);

    // Keeper
    var kY = GOAL_Y + GOAL_H * 0.5;
    game.draw.circle(keeperX, kY - 50, 30, C.keeper, 0.95);
    game.draw.rect(keeperX - 25, kY - 20, 50, 70, C.keeper, 0.9);
    // Arms (diving)
    if (keeperDiving) {
      game.draw.line(keeperX - 60, kY - 10, keeperX + 60, kY - 10, C.keeperHi, 16);
    } else {
      game.draw.line(keeperX - 30, kY - 10, keeperX - 60, kY, C.keeperHi, 12);
      game.draw.line(keeperX + 30, kY - 10, keeperX + 60, kY, C.keeperHi, 12);
    }

    // White field line
    game.draw.rect(0, BALL_START_Y + 50, W, 6, C.line, 0.5);

    // Ball
    game.draw.circle(ballX, ballY, ballR + 4, '#000', 0.3);
    game.draw.circle(ballX, ballY, ballR, C.ball, 0.95);
    // Spin marks
    var spinX = Math.cos(ballSpin) * ballR * 0.4;
    var spinY = Math.sin(ballSpin) * ballR * 0.4;
    game.draw.circle(ballX + spinX, ballY + spinY, ballR * 0.2, C.ballMk, 0.8);
    game.draw.circle(ballX - spinX * 0.5, ballY - spinY * 0.5, ballR * 0.15, C.ballMk, 0.6);

    // Gauges (only during aim)
    if (phase === 'aim') {
      // Power gauge
      var pgX = 60, pgY = H * 0.84;
      game.draw.rect(pgX - 10, pgY - 10, 180, 50, '#000', 0.5);
      game.draw.rect(pgX, pgY, 160, 30, '#1e293b', 0.9);
      var pcol = powerGauge > 70 ? C.powerHi : (powerGauge > 40 ? C.power : C.powerLo);
      game.draw.rect(pgX, pgY, 160 * powerGauge / 100, 30, pcol, 0.9);
      game.draw.text('パワー', pgX + 80, pgY - 16, { size: 28, color: C.ui });

      // Curve gauge
      var cgX = W / 2 - 80, cgY = H * 0.88;
      game.draw.rect(cgX - 10, cgY - 10, 180, 50, '#000', 0.5);
      game.draw.rect(cgX, cgY, 160, 30, '#1e293b', 0.9);
      game.draw.rect(cgX + 80 - 4, cgY - 4, 8, 38, C.curveHi, 0.6); // center line
      var curveX = cgX + 160 * curveGauge / 100 - 8;
      game.draw.rect(curveX, cgY - 2, 16, 34, C.curve, 0.95);
      game.draw.text('カーブ', cgX + 80, cgY - 16, { size: 28, color: C.ui });

      game.draw.text('↑ スワイプで蹴る！', W / 2, H * 0.94, { size: 38, color: C.ui });
    }

    // Result
    if (resultTimer > 0) {
      game.draw.text(resultMsg, W / 2, H * 0.5, { size: 80, color: resultMsg.includes('GOAL') ? C.scored : C.danger, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life * 1.5, p.col, p.life * 0.8);
    }

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 30 + mi * 60, H * 0.97, 16, mi < misses ? C.danger : C.grassLo);
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.grass : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    powerGauge = 0;
    curveGauge = 50;
  });
})(game);
